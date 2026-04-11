from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Any
from ..db import get_db
from ..models.blobs import Blob

router = APIRouter()

class RetrieveRequest(BaseModel):
    key: str # hex
    assertion: Any # WebAuthn assertion object

import base64

def verify_webauthn_assertion(assertion: Any):
    """
    Verify WebAuthn assertion.
    According to Mystere specs:
    - flags bit 2 (0x04) = UV (User Verified)
    - flags bit 0 (0x01) = UP (User Present)
    """
    try:
        # Assuming assertion['response']['authenticatorData'] is base64 encoded
        auth_data_b64 = assertion.get('response', {}).get('authenticatorData')
        if not auth_data_b64:
            raise HTTPException(status_code=400, detail="Missing authenticatorData")
        
        # Base64url decode
        auth_data = base64.urlsafe_b64decode(auth_data_b64 + '=' * (-len(auth_data_b64) % 4))
        
        if len(auth_data) < 33:
            raise HTTPException(status_code=400, detail="Invalid authenticatorData length")
            
        flags = auth_data[32]
        UV = bool(flags & 0x04)
        UP = bool(flags & 0x01)
        
        if not UV:
            raise HTTPException(status_code=403, detail="WEBAUTHN_UV_NOT_SET: biometric not verified")
        if not UP:
            raise HTTPException(status_code=403, detail="WEBAUTHN_UP_NOT_SET: user not present")
            
        # Signature and challenge verification should follow in a full implementation.
        # For now, we strictly enforce the UV/UP flags as requested.
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"WebAuthn verification failed: {str(e)}")

@router.post("/retrieve")
def retrieve(request: RetrieveRequest, db: Session = Depends(get_db)):
    # STEP 1: Verify WebAuthn assertion FIRST, before any DB lookup
    verify_webauthn_assertion(request.assertion)
    
    # STEP 2: Fetch blob
    blob = db.query(Blob).filter(
        Blob.storage_key == bytes.fromhex(request.key),
        Blob.expires_at > func.now()
    ).first()
    
    if not blob:
        raise HTTPException(status_code=404, detail="Not found or expired")
    
    return {"value": blob.value.hex()}
