// client/src/defence/panic.js
import { sendTombstone } from './tombstone.js'

export async function panicWipe(store, socket) {
  // Step 1: Delete all IndexedDB entries
  // In a real app, we'd clear all object stores
  const databases = await indexedDB.databases()
  for (const db of databases) {
    indexedDB.deleteDatabase(db.name)
  }
  
  // Step 2: Delete all in-memory session state
  if (store && typeof store.clearAll === 'function') {
    store.clearAll()
  }
  
  // Step 3: Send tombstone if possible (requires sessionId and identityKeyPair)
  // await sendTombstone(socket, ...)
  
  // Step 4: Close WebSocket
  if (socket) socket.close()
  
  // Step 5: Reload to empty state
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
