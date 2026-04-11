// client/src/transport/custodian.js

export class CustodianClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async deposit(storageKey, encryptedShare, ttl) {
    const response = await fetch(`${this.baseUrl}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: this.encodeHex(storageKey),
        value: this.encodeHex(encryptedShare),
        ttl: ttl
      })
    });
    if (!response.ok) {
      throw new Error(`Deposit failed: ${response.statusText}`);
    }
    return response.json();
  }

  async retrieve(storageKey, assertion) {
    const response = await fetch(`${this.baseUrl}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: this.encodeHex(storageKey),
        assertion: assertion
      })
    });
    if (!response.ok) {
      throw new Error(`Retrieve failed: ${response.statusText}`);
    }
    const data = await response.json();
    return this.decodeHex(data.value);
  }

  encodeHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  decodeHex(hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  }
}
