// client/src/transport/socket.js

export class MystereSocket {
  constructor(url, userId, onMessage) {
    this.url = `${url}/${userId}`;
    this.socket = null;
    this.onMessage = onMessage;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.socket.onerror = (err) => {
        reject(err);
      };

      this.socket.onmessage = (event) => {
        if (this.onMessage) {
          this.onMessage(new Uint8Array(event.data));
        }
      };

      this.socket.onclose = () => {
        this.connected = false;
      };
    });
  }

  send(data) {
    if (this.socket && this.connected) {
      this.socket.send(data);
    } else {
      throw new Error("Socket not connected");
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
