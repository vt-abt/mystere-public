import pytest
from fastapi.testclient import TestClient
from relay.app.main import app
import uuid
import os

client = TestClient(app)

def test_identity_registration_and_prekey_consumption():
    # 1. Register initiator and responder
    initiator_data = {
        "identity_pubkey": os.urandom(32).hex(),
        "webauthn_pubkey": os.urandom(32).hex(),
        "signed_prekey": os.urandom(32).hex(),
        "signed_prekey_sig": os.urandom(64).hex(),
        "one_time_prekeys": [os.urandom(32).hex() for _ in range(5)]
    }
    resp_init = client.post("/keys/identity", json=initiator_data)
    initiator_id = resp_init.json()["user_id"]

    responder_data = {
        "identity_pubkey": os.urandom(32).hex(),
        "webauthn_pubkey": os.urandom(32).hex(),
        "signed_prekey": os.urandom(32).hex(),
        "signed_prekey_sig": os.urandom(64).hex(),
        "one_time_prekeys": ["f1f2f3f4", "e1e2e3e4"]
    }
    resp_resp = client.post("/keys/identity", json=responder_data)
    responder_id = resp_resp.json()["user_id"]

    # 2. Create session commitment
    req_payload = os.urandom(32).hex()
    req_res = client.post("/session/request", json={
        "initiator_id": initiator_id,
        "responder_id": responder_id,
        "payload": req_payload,
        "signature": os.urandom(64).hex()
    })
    temp_id = req_res.json()["temp_id"]

    ack_payload = os.urandom(32).hex()
    client.post("/session/ack", json={
        "temp_id": temp_id,
        "payload": ack_payload,
        "signature": os.urandom(64).hex()
    })

    # 3. Fetch prekeys (first time)
    response = client.get(f"/keys/prekeys/{responder_id}", params={"initiator_id": initiator_id})
    assert response.status_code == 200
    data = response.json()
    assert data["one_time_prekey"] in ["f1f2f3f4", "e1e2e3e4"]
    consumed_first = data["one_time_prekey"]

    # 4. Fetch prekeys (second time)
    response = client.get(f"/keys/prekeys/{responder_id}", params={"initiator_id": initiator_id})
    assert response.status_code == 200
    data = response.json()
    assert data["one_time_prekey"] in ["f1f2f3f4", "e1e2e3e4"]
    assert data["one_time_prekey"] != consumed_first

    # 5. Fetch prekeys (third time - exhausted)
    response = client.get(f"/keys/prekeys/{responder_id}", params={"initiator_id": initiator_id})
    assert response.status_code == 200
    data = response.json()
    assert data["one_time_prekey"] is None
