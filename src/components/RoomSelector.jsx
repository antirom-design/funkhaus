import { useState } from 'react'

function RoomSelector({ houseCode, userName, rooms, onSelectRoom, onCreateRoom }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

  const handleCreateRoom = (e) => {
    e.preventDefault()
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim())
      setNewRoomName('')
      setShowCreateForm(false)
    }
  }

  return (
    <div className="join-screen">
      <h1>HOUSE: {houseCode}</h1>
      <p className="info-text">Welcome, {userName}!</p>

      <div style={{
        maxWidth: '600px',
        width: '90%',
        margin: '20px auto'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>SELECT OR CREATE A ROOM</h2>

        {/* Existing Rooms */}
        {rooms.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textTransform: 'uppercase'
            }}>
              Available Rooms
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rooms.map((room) => (
                <button
                  key={room.name}
                  onClick={() => onSelectRoom(room.name)}
                  style={{
                    padding: '20px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-panel)',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '16px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{room.name}</div>
                    {room.permanent && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--housemaster)',
                        marginTop: '4px'
                      }}>
                        Permanent Room
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      padding: '4px 12px',
                      background: room.occupancy > 0 ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {room.occupancy} {room.occupancy === 1 ? 'person' : 'people'}
                    </div>
                    <div style={{ fontSize: '20px' }}>→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create New Room */}
        <div>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                width: '100%',
                padding: '20px',
                border: '2px dashed var(--text-primary)',
                background: 'transparent',
                fontSize: '16px'
              }}
            >
              + CREATE NEW ROOM
            </button>
          ) : (
            <form onSubmit={handleCreateRoom} style={{
              padding: '20px',
              border: '2px solid var(--text-primary)',
              background: 'var(--bg-panel)'
            }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Create New Room</h3>
              <input
                type="text"
                placeholder="Room Name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
                autoFocus
                style={{ width: '100%', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1 }}>
                  CREATE & JOIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewRoomName('')
                  }}
                  style={{ flex: 1, background: 'var(--button-bg)' }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="info-text" style={{ marginTop: '30px' }}>
        Rooms are shared spaces. You'll see who else is in each room.
      </p>
    </div>
  )
}

export default RoomSelector
