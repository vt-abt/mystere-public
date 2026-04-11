from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
import uuid
import datetime
from ..db import get_db
from ..models.prekeys import IdentityKey, SignedPrekey, OneTimePrekey
from ..models.sessions import SessionCommitment

router = APIRouter()

class IdentityCreate(BaseModel):
    identity_pubkey: str  # hex
    webauthn_pubkey: str  # hex
    signed_prekey: str    # hex
    signed_prekey_sig: str # hex
    one_time_prekeys: List[str] # [hex, ...]

@router.post("/identity")
def create_identity(data: IdentityCreate, db: Session = Depends(get_db)):
    identity = IdentityKey(
        identity_pubkey=bytes.fromhex(data.identity_pubkey),
        webauthn_pubkey=bytes.fromhex(data.webauthn_pubkey)
    )
    db.add(identity)
    db.flush()
    
    signed_prekey = SignedPrekey(
        user_id=identity.user_id,
        pubkey=bytes.fromhex(data.signed_prekey),
        signature=bytes.fromhex(data.signed_prekey_sig)
    )
    db.add(signed_prekey)
    
    for pk in data.one_time_prekeys:
        otp = OneTimePrekey(
            user_id=identity.user_id,
            pubkey=bytes.fromhex(pk)
        )
        db.add(otp)
    
    db.commit()
    return {"user_id": str(identity.user_id)}

@router.get("/prekeys/{user_id}")
def get_prekeys(user_id: uuid.UUID, initiator_id: uuid.UUID, db: Session = Depends(get_db)):
    identity = db.query(IdentityKey).filter(IdentityKey.user_id == user_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if session is committed AND within 24 hours
    twenty_four_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
    commitment = db.query(SessionCommitment).filter(
        SessionCommitment.initiator_id == initiator_id,
        SessionCommitment.responder_id == user_id,
        SessionCommitment.status == "committed",
        SessionCommitment.created_at >= twenty_four_hours_ago
    ).first()
    
    if not commitment:
        raise HTTPException(status_code=403, detail="No active, committed session within 24 hours. Phase 2 must complete.")
    
    signed_prekey = db.query(SignedPrekey).filter(SignedPrekey.user_id == user_id).order_by(SignedPrekey.created_at.desc()).first()
    
    # Atomic consumption of one-time prekey
    one_time_prekey = db.query(OneTimePrekey).filter(
        OneTimePrekey.user_id == user_id,
        OneTimePrekey.consumed == False
    ).with_for_update(skip_locked=True).first()
    
    otp_pubkey = None
    if one_time_prekey:
        otp_pubkey = one_time_prekey.pubkey.hex()
        one_time_prekey.consumed = True
        one_time_prekey.consumed_at = func.now()
        db.commit()
    else:
        # Fallback to signed prekey only
        pass

    # Count remaining prekeys for replenishment hint
    remaining_count = db.query(OneTimePrekey).filter(
        OneTimePrekey.user_id == user_id,
        OneTimePrekey.consumed == False
    ).count()

    return {
        "identity_pubkey": identity.identity_pubkey.hex(),
        "signed_prekey": signed_prekey.pubkey.hex(),
        "signed_prekey_sig": signed_prekey.signature.hex(),
        "one_time_prekey": otp_pubkey,
        "needs_replenishment": remaining_count < 20
    }

class ReplenishPrekeys(BaseModel):
    user_id: uuid.UUID
    one_time_prekeys: List[str]

@router.post("/prekeys/replenish")
def replenish_prekeys(data: ReplenishPrekeys, db: Session = Depends(get_db)):
    for pk in data.one_time_prekeys:
        otp = OneTimePrekey(
            user_id=data.user_id,
            pubkey=bytes.fromhex(pk)
        )
        db.add(otp)
    db.commit()
    return {"status": "ok"}
