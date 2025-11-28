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
          : 'Connecting to server... (Auto-switching to demo mode if unavailable)'}
      </p>

      <div style={{
        maxWidth: '600px',
        padding: '15px',
        border: '2px solid var(--secondary)',
        borderRadius: '8px',
        marginTop: '20px',
        textAlign: 'left',
        fontSize: '14px',
        background: 'rgba(6, 182, 212, 0.1)'
      }}>
        <h3 style={{ color: 'var(--secondary)', marginBottom: '10px' }}>ℹ️ Demo Mode Available</h3>
        <p style={{ marginBottom: '10px' }}>App works in demo mode without server deployment. Demo includes simulated rooms and chat responses.</p>
        <p style={{ marginBottom: '10px' }}><strong>For production use:</strong></p>
        <ol style={{ marginLeft: '20px', marginBottom: '10px', fontSize: '13px' }}>
          <li>Deploy WebSocket server to <a href="https://railway.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>Railway.app</a></li>
          <li>Update server URL in code</li>
          <li>Enables real multi-user WebRTC voice</li>
        </ol>
        <p style={{ fontSize: '12px' }}>See <a href="https://github.com/antirom-design/funkhaus#readme" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>README</a> for setup guide</p>
      </div>
    </div>
  )
}

export default JoinScreen
