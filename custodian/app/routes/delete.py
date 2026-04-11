from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db
from ..models.blobs import Blob

router = APIRouter()

@router.post("/cleanup")
def cleanup(db: Session = Depends(get_db)):
    db.query(Blob).filter(Blob.expires_at < func.now()).delete()
    db.commit()
    return {"status": "ok"}
