import React, { useState, useEffect } from 'react'
import { MSG } from '../transport/messages'
import { createSessionRequest, createSessionAck, computeSessionId, verifyCommitmentSignature } from '../crypto/commitment'

function Chat({ user, socket }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [chatting, setChatting] = useState(false)
  const [handshaking, setHandshaking] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [sessionRequest, setSessionRequest] = useState(null)

  useEffect(() => {
    if (socket) {
      socket.onMessage = async (data) => {
        const msgType = data[16]
        const payloadWithSig = data.slice(17)
        
        if (msgType === MSG.COMMIT_REQ) {
          console.log("Received COMMIT_REQ")
          const payload = payloadWithSig.slice(0, 40)
          const signature = payloadWithSig.slice(40)
          // In a real app, we'd verify the signature with their public key here.
          // For now, we'll just ACK it.
          const ack = await createSessionAck(user.mockKeyPair, { payload })
          
          const envelope = new Uint8Array(16 + 1 + ack.payload.length + ack.signature.length)
          const recipientBytes = new Uint8Array(recipientId.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
          envelope.set(recipientBytes, 0)
          envelope.set([MSG.COMMIT_ACK], 16)
          envelope.set(ack.payload, 17)
          envelope.set(ack.signature, 17 + ack.payload.length)
          
          socket.send(envelope)
          
          const sid = await computeSessionId(payload, ack.payload)
          setSessionId(sid)
          setChatting(true)
          console.log("Session Established (Responder):", sid)
        } else if (msgType === MSG.COMMIT_ACK) {
          console.log("Received COMMIT_ACK")
          const payload = payloadWithSig.slice(0, 96)
          const sid = await computeSessionId(sessionRequest.payload, payload)
          setSessionId(sid)
          setChatting(true)
          setHandshaking(false)
          console.log("Session Established (Initiator):", sid)
        } else if (msgType === MSG.MESSAGE) {
          const payload = new TextDecoder().decode(payloadWithSig)
          setMessages(prev => [...prev, { from: 'them', text: payload }])
        }
      }
    }
  }, [socket, sessionRequest, recipientId])

  const startHandshake = async () => {
    if (!recipientId) return
    setHandshaking(true)
    
    // Create Request
    const req = await createSessionRequest(user.mockKeyPair)
    setSessionRequest(req)
    
    const recipientBytes = new Uint8Array(recipientId.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    const envelope = new Uint8Array(16 + 1 + req.payload.length + req.signature.length)
    envelope.set(recipientBytes, 0)
    envelope.set([MSG.COMMIT_REQ], 16)
    envelope.set(req.payload, 17)
    envelope.set(req.signature, 17 + req.payload.length)
    
    socket.send(envelope)
    console.log("Sent COMMIT_REQ to", recipientId)
  }

  const handleSendMessage = () => {
    if (!sessionId || !input) return
    
    const recipientBytes = new Uint8Array(recipientId.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    const payloadBytes = new TextEncoder().encode(input)
    
    const envelope = new Uint8Array(16 + 1 + payloadBytes.length)
    envelope.set(recipientBytes, 0)
    envelope.set([MSG.MESSAGE], 16)
    envelope.set(payloadBytes, 17)
    
    socket.send(envelope)
    setMessages([...messages, { from: 'me', text: input }])
    setInput('')
  }

  return (
    <div className="chat-container">
      {!chatting ? (
        <div style={{ marginBottom: '20px' }}>
          <h3>Start Chat</h3>
          <input 
            type="text" 
            placeholder="Enter Recipient User ID" 
            value={recipientId} 
            onChange={(e) => setRecipientId(e.target.value)} 
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <button onClick={startHandshake} disabled={!recipientId || handshaking}>
            {handshaking ? 'Handshaking...' : 'Perform Handshake'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#dff0d8', padding: '5px', marginBottom: '10px', fontSize: '10px' }}>
            <strong>Session ID:</strong> {Array.from(sessionId).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)}...
          </div>
          <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', padding: '10px', marginBottom: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === 'me' ? 'right' : 'left', marginBottom: '5px' }}>
                <span style={{ background: m.from === 'me' ? '#dcf8c6' : '#eee', padding: '5px', borderRadius: '5px', display: 'inline-block' }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <div className="chat-input" style={{ display: 'flex' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, marginRight: '10px' }}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  )
}

export default Chat
