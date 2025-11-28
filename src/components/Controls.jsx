function Controls({
  isHousemaster,
  mode,
  selectedRoom,
  isTalking,
  canTalkToAll,
  onModeChange,
  onTalkToAll,
  onTalkToRoom,
  onStopTalking
}) {
  const handleMouseDown = (action) => {
    if (!isTalking) {
      action()
    }
  }

  const handleMouseUp = () => {
    if (isTalking) {
      onStopTalking()
    }
  }

  const getTalkToAllLabel = () => {
    if (isTalking === 'ALL') return '🔴 TALKING TO ALL'
    return 'TALK TO ALL'
  }

  const getTalkToRoomLabel = () => {
    if (!selectedRoom) return 'SELECT A ROOM'
    if (isTalking === selectedRoom) return `🔴 TALKING TO ${selectedRoom}`
    return `TALK TO ${selectedRoom}`
  }

  return (
    <div className="controls">
      {isHousemaster && (
        <div className="mode-controls">
          <button
            onClick={() => onModeChange('announcement')}
            style={{
              background: mode === 'announcement' ? 'var(--button-active)' : ''
            }}
          >
            Announcement
          </button>
          <button
            onClick={() => onModeChange('returnChannel')}
            style={{
              background: mode === 'returnChannel' ? 'var(--button-active)' : ''
            }}
          >
            Return Channel
          </button>
          <button
            onClick={() => onModeChange('free')}
            style={{
              background: mode === 'free' ? 'var(--button-active)' : ''
            }}
          >
            Free Mode
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          className={`talk-button all ${isTalking === 'ALL' ? 'active' : ''}`}
          disabled={!canTalkToAll}
          onMouseDown={() => handleMouseDown(onTalkToAll)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={() => handleMouseDown(onTalkToAll)}
          onTouchEnd={handleMouseUp}
        >
          {getTalkToAllLabel()}
        </button>

        <button
          className={`talk-button ${isTalking === selectedRoom ? 'active' : ''}`}
          disabled={!selectedRoom}
          onMouseDown={() => handleMouseDown(() => onTalkToRoom(selectedRoom))}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={() => handleMouseDown(() => onTalkToRoom(selectedRoom))}
          onTouchEnd={handleMouseUp}
        >
          {getTalkToRoomLabel()}
        </button>
      </div>

      <p className="info-text">Hold button to talk • Release to stop</p>
    </div>
  )
}

export default Controls
