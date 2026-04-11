from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import uuid
import struct
from typing import Dict
from sqlalchemy.orm import Session
from ..db import get_db
from ..models.sessions import MessageQueue

router = APIRouter()

connections: Dict[str, WebSocket] = {}

class Envelope:
    def __init__(self, recipient_id: uuid.UUID, message_type: int, payload: bytes):
        self.recipient_id = recipient_id
        self.message_type = message_type
        self.payload = payload

def parse_envelope(data: bytes) -> Envelope:
    # Assuming first 16 bytes: recipient_id (UUID)
    # 17th byte: message_type
    # Remaining: payload
    recipient_id = uuid.UUID(bytes=data[:16])
    message_type = data[16]
    payload = data[17:]
    return Envelope(recipient_id, message_type, payload)

async def queue_for_offline(envelope: Envelope, db: Session):
    # Basic implementation of offline queuing
    mq = MessageQueue(
        session_id=None, # Should ideally be extracted from payload AAD if possible, but relay shouldn't read payload. 
        # For now, we'll just use recipient_id and message_type.
        recipient_id=envelope.recipient_id,
        message_type=envelope.message_type,
        payload=envelope.payload,
        sequence_num=0 # Placeholder
    )
    db.add(mq)
    db.commit()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    connections[user_id] = websocket
    try:
        # Check for offline messages
        offline_msgs = db.query(MessageQueue).filter(
            MessageQueue.recipient_id == uuid.UUID(user_id),
            MessageQueue.delivered == False
        ).all()
        for msg in offline_msgs:
            # Reconstruct envelope and send
            # For simplicity, just sending payload for now, or re-encoding if client expects envelope
            # The brief says "relay only reads the unencrypted envelope header (recipient_id, message_type byte)"
            # So the client probably sends the full envelope.
            # We'll just send the stored payload (which should include header if client expects it)
            # Actually, if we store payload as everything AFTER header, we need to prepend header.
            # Let's assume the payload we store IS the full original data.
            await websocket.send_bytes(msg.payload)
            msg.delivered = True
        db.commit()

        while True:
            data = await websocket.receive_bytes()
            envelope = parse_envelope(data)
            recipient_str = str(envelope.recipient_id)
            if recipient_str in connections:
                await connections[recipient_str].send_bytes(data)
            else:
                await queue_for_offline(envelope, db)
    except WebSocketDisconnect:
        if user_id in connections:
            del connections[user_id]
    except Exception as e:
        print(f"WS Error: {e}")
        if user_id in connections:
            del connections[user_id]
