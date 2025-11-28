import { useState } from 'react'

function JoinScreen({ onJoin, connected }) {
  const [houseCode, setHouseCode] = useState('')
  const [roomName, setRoomName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (houseCode.trim() && roomName.trim()) {
      onJoin(houseCode.trim().toUpperCase(), roomName.trim())
    }
  }

  return (
    <div className="join-screen">
      <h1>FUNKHAUS</h1>
      <p className="info-text">Push-to-Talk Intercom System</p>

      <form className="join-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="House Code (e.g., SCHOOL123)"
          value={houseCode}
          onChange={(e) => setHouseCode(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Room Name (e.g., Music Room)"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />
        <button type="submit" disabled={!connected}>
          {connected ? 'JOIN HOUSE' : 'CONNECTING...'}
        </button>
      </form>

      <p className="info-text">
        {connected
          ? 'First to join becomes Housemaster'
          : 'Connecting to server...'}
      </p>

      {!connected && (
        <div style={{
          maxWidth: '500px',
          padding: '20px',
          border: '2px solid var(--warning)',
          borderRadius: '8px',
          marginTop: '20px',
          textAlign: 'left',
          fontSize: '14px'
        }}>
          <h3 style={{ color: 'var(--warning)', marginBottom: '10px' }}>⚠️ Server Not Running</h3>
          <p style={{ marginBottom: '10px' }}>The WebSocket server needs to be deployed separately.</p>
          <p style={{ marginBottom: '10px' }}><strong>Quick Setup:</strong></p>
          <ol style={{ marginLeft: '20px', marginBottom: '10px' }}>
            <li>Go to <a href="https://railway.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>railway.app</a></li>
            <li>Deploy the funkhaus GitHub repository</li>
            <li>Get the WebSocket URL</li>
            <li>Update src/hooks/useWebSocket.js</li>
          </ol>
          <p>See <a href="https://github.com/antirom-design/funkhaus#websocket-server" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>README</a> for detailed instructions.</p>
        </div>
      )}
    </div>
  )
}

export default JoinScreen
