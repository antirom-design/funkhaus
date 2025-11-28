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
    </div>
  )
}

export default JoinScreen
