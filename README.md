# MYSTERE — Browser-first End-to-End Encrypted Messaging

Mystere is a messaging protocol with a 3-of-3 threshold at-rest decryption scheme.

## Key Features
- **3-of-3 Threshold**: share_x (Sender) XOR share_y (Receiver) XOR share_custodian (Server).
- **WebAuthn Hardware Binding**: All fragment operations are biometric-gated.
- **Signal Protocol**: X3DH + Double Ratchet for transit security.
- **Active Defence**: Dummy traffic, message-count-based rotation, panic wipe, and tombstones.

## Architecture
- `client/`: React/Vite/WebCrypto implementation.
- `relay/`: FastAPI/PostgreSQL/Redis message router.
- `custodian/`: FastAPI/PostgreSQL opaque blob storage.

## Building and Running
1. `docker compose -f docker-compose.dev.yml up -d`
2. `cd relay && pip install -r requirements.txt && PYTHONPATH=. python3 -m relay.app.init_db`
3. `cd custodian && pip install -r requirements.txt && PYTHONPATH=. python3 -m custodian.app.init_db`
4. `cd client && npm install && npm run dev`

## Testing
- `pytest tests/relay/`
- `cd client && npm run test`
