from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import deposit, retrieve, delete

app = FastAPI(title="Mystere Custodian")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(deposit.router)
app.include_router(retrieve.router)
app.include_router(delete.router)
