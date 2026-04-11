from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import time
from datetime import datetime
from ..db import get_db
from ..models.blobs import Blob

router = APIRouter()

class DepositRequest(BaseModel):
    key: str   # hex
    value: str # hex
    ttl: int   # Unix timestamp

@router.post("/deposit")
def deposit(request: DepositRequest, db: Session = Depends(get_db)):
    key_bytes = bytes.fromhex(request.key)
    if len(key_bytes) != 32:
        raise HTTPException(status_code=400, detail="Invalid key length")
    
    now = time.time()
    if request.ttl < now or request.ttl > now + 7200:
        raise HTTPException(status_code=400, detail="Invalid TTL")
    
    blob = Blob(
        storage_key=key_bytes,
        value=bytes.fromhex(request.value),
        expires_at=datetime.fromtimestamp(request.ttl)
    )
    db.merge(blob) # ON CONFLICT (storage_key) DO UPDATE equivalent
    db.commit()
    return {"status": "ok"}
