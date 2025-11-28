function RoomList({ rooms, currentRoom, selectedRoom, talkingRoom, audioLevel, roomAudioLevels, onSelectRoom }) {
  const getAudioLevelForRoom = (roomName) => {
    if (roomName === currentRoom) {
      return audioLevel || 0
    }
    return roomAudioLevels?.[roomName] || 0
  }

  return (
    <div className="room-list">
      <h3>ROOMS ({rooms.length})</h3>
      {rooms.map((room) => {
        const level = getAudioLevelForRoom(room.name)
        const isActive = level > 5

        return (
          <div
            key={room.id}
            className={`room-item ${room.name === selectedRoom ? 'selected' : ''} ${
              room.isHousemaster ? 'housemaster' : ''
            } ${room.name === talkingRoom ? 'talking' : ''}`}
            onClick={() => onSelectRoom(room.name === selectedRoom ? null : room.name)}
            style={{
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Audio level background */}
            {isActive && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${level}%`,
                background: 'linear-gradient(90deg, rgba(0,255,0,0.2) 0%, rgba(0,255,0,0.05) 100%)',
                transition: 'width 0.1s ease-out',
                pointerEvents: 'none'
              }} />
            )}

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <div>{room.name}</div>
                {room.name === currentRoom && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>(You)</div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Audio level indicator */}
                {isActive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          height: `${4 + i * 2}px`,
                          background: level > (i * 20) ? 'var(--text-primary)' : 'var(--border)',
                          borderRadius: '1px',
                          transition: 'background 0.1s'
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="status-indicator" style={{
                  background: isActive ? 'var(--warning)' : 'var(--text-primary)'
                }} />
              </div>
            </div>
          </div>
        )
      })}
      {rooms.length === 0 && (
        <p className="info-text">No rooms connected</p>
      )}
    </div>
  )
}

export default RoomList
