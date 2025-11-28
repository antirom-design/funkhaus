function RoomList({ rooms, currentRoom, selectedRoom, talkingRoom, onSelectRoom }) {
  return (
    <div className="room-list">
      <h3>ROOMS ({rooms.length})</h3>
      {rooms.map((room) => (
        <div
          key={room.id}
          className={`room-item ${room.name === selectedRoom ? 'selected' : ''} ${
            room.isHousemaster ? 'housemaster' : ''
          } ${room.name === talkingRoom ? 'talking' : ''}`}
          onClick={() => onSelectRoom(room.name === selectedRoom ? null : room.name)}
        >
          <div>
            <div>{room.name}</div>
            {room.name === currentRoom && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>(You)</div>
            )}
          </div>
          <div className="status-indicator" />
        </div>
      ))}
      {rooms.length === 0 && (
        <p className="info-text">No rooms connected</p>
      )}
    </div>
  )
}

export default RoomList
