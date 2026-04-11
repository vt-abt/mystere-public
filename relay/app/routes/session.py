from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import hashlib
from ..db import get_db
from ..models.sessions import SessionCommitment, MessageQueue

router = APIRouter()

class SessionRequestData(BaseModel):
    initiator_id: str # UUID
    responder_id: str # UUID
    payload: str      # hex
    signature: str    # hex

@router.post("/request")
def session_request(data: SessionRequestData, db: Session = Depends(get_db)):
    # Compute session_id candidate or wait for ACK?
    # Brief says session_id = SHA-512(session_request || session_ack)
    # We'll store it by a temporary ID or wait.
    # Actually, we can use a temporary identifier or just store by initiator/responder.
    # But session_id is computed AFTER Phase 2.
    
    # For now, we'll store it as "pending" with a random key or using the payload hash.
    temp_id = hashlib.sha256(bytes.fromhex(data.payload)).digest()
    
    commitment = SessionCommitment(
        session_id=temp_id, # Temporary
        initiator_id=data.initiator_id,
        responder_id=data.responder_id,
        session_request=bytes.fromhex(data.payload),
        status="pending"
    )
    db.add(commitment)
    db.commit()
    
    # Queue COMMIT_REQ for recipient
    # Re-using WebSocket logic or just storing in MessageQueue
    mq = MessageQueue(
        session_id=temp_id,
        recipient_id=data.responder_id,
        message_type=0x07, # COMMIT_REQ
        payload=bytes.fromhex(data.payload) + bytes.fromhex(data.signature), # Simple concat for now
        sequence_num=0
    )
    db.add(mq)
    db.commit()
    
    return {"temp_id": temp_id.hex()}

class SessionAckData(BaseModel):
    temp_id: str # hex
    payload: str # hex
    signature: str # hex

@router.post("/ack")
def session_ack(data: SessionAckData, db: Session = Depends(get_db)):
    commitment = db.query(SessionCommitment).filter(
        SessionCommitment.session_id == bytes.fromhex(data.temp_id),
        SessionCommitment.status == "pending"
    ).first()
    
    if not commitment:
        raise HTTPException(status_code=404, detail="Session request not found")
    
    commitment.session_ack = bytes.fromhex(data.payload)
    commitment.status = "committed"
    
    # Final session_id
    final_id = hashlib.sha512(commitment.session_request + commitment.session_ack).digest()
    
    # Create new commitment with final_id
    new_commitment = SessionCommitment(
        session_id=final_id,
        initiator_id=commitment.initiator_id,
        responder_id=commitment.responder_id,
        session_request=commitment.session_request,
        session_ack=commitment.session_ack,
        status="committed"
    )
    db.add(new_commitment)
    db.flush() # Ensure it exists for FK
    
    # Update any messages in queue that used the temp_id
    db.query(MessageQueue).filter(MessageQueue.session_id == commitment.session_id).update({MessageQueue.session_id: final_id})
    
    # Delete old commitment
    db.delete(commitment)
    db.commit()
    
    # Queue COMMIT_ACK for initiator
    mq = MessageQueue(
        session_id=final_id,
        recipient_id=commitment.initiator_id,
        message_type=0x08, # COMMIT_ACK
        payload=bytes.fromhex(data.payload) + bytes.fromhex(data.signature),
        sequence_num=0
    )
    db.add(mq)
    db.commit()
    
    return {"session_id": final_id.hex()}
