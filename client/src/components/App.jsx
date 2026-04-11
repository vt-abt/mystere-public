import React, { useState, useEffect } from 'react'
import Session from './Session.jsx'
import Chat from './Chat.jsx'
import { MystereSocket } from '../transport/socket.js'

function App() {
  const [user, setUser] = useState(null)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (user && !socket) {
      const s = new MystereSocket('ws://localhost:8000/ws', user.userId, (data) => {
        console.log("Received data:", data)
      })
      s.connect().then(() => {
        console.log("WebSocket connected for", user.userId)
        setSocket(s)
      })
    }
  }, [user])

  return (
    <div className="mystere-app" style={{ maxWidth: '600px', margin: 'auto', padding: '20px', fontFamily: 'monospace' }}>
      <h1>MYSTERE v1.0</h1>
      {user && (
        <div style={{ background: '#eee', padding: '10px', marginBottom: '20px' }}>
          <strong>YOUR ID:</strong> <code style={{ wordBreak: 'break-all' }}>{user.userId}</code>
        </div>
      )}
      {!user ? (
        <Session onEstablished={(u) => setUser(u)} />
      ) : (
        <Chat user={user} socket={socket} />
      )}
    </div>
  )
}

export default App
