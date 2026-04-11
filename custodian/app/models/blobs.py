from sqlalchemy import Column, LargeBinary, DateTime, func
from ..db import Base

class Blob(Base):
    __tablename__ = "blobs"
    storage_key = Column(LargeBinary, primary_key=True) # SHA-256(capability_token || message_id)
    value = Column(LargeBinary, nullable=False)        # encrypted custodian_blob, opaque
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
