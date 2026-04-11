from .db import engine, Base
from .models.prekeys import IdentityKey, SignedPrekey, OneTimePrekey
from .models.sessions import SessionCommitment, MessageQueue

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
