// client/src/state/session.js

export class SessionState {
  constructor() {
    this.rootKey = null;
    this.sessionId = null;
    this.theirCustodianUrl = null;
    this.identityKeyPair = null;
    this.theirIdentityPublicKey = null;
    this.messageCount = 0;
  }

  clearAll() {
    this.rootKey = null;
    this.sessionId = null;
    this.theirCustodianUrl = null;
    this.identityKeyPair = null;
    this.theirIdentityPublicKey = null;
    this.messageCount = 0;
  }
}
