// client/src/state/idb.js

export class MystereIDB {
  constructor() {
    this.db = null;
    this.ready = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('mystere_idb', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('shares', { keyPath: 'storageKey' });
        db.createObjectStore('messages', { keyPath: 'id' });
        db.createObjectStore('config', { keyPath: 'key' });
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async putShare(shareData) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['shares'], 'readwrite');
      const store = transaction.objectStore('shares');
      const request = store.put(shareData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEverything() {
    await this.ready;
    const stores = ['shares', 'messages', 'config'];
    const transaction = this.db.transaction(stores, 'readwrite');
    for (const storeName of stores) {
      transaction.objectStore(storeName).clear();
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
