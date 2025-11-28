import { useState, useEffect, useRef } from 'react'

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
  const [isMobile, setIsMobile] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const buttonRefs = useRef({})

  useEffect(() => {
    // Detect mobile device
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    setIsMobile(mobile)
    setTapMode(mobile)
  }, [])

  const handleMouseDown = (action) => {
    if (!isTalking && !tapMode) {
      action()
    }
  }

  const handleMouseUp = () => {
    if (isTalking && !tapMode) {
      onStopTalking()
    }
  }

  const handleTouchStart = (e, action) => {
    e.preventDefault()
    if (tapMode) {
      // Tap mode: toggle on/off
      if (isTalking) {
        onStopTalking()
      } else {
        action()
      }
    } else {
      // Hold mode
      if (!isTalking) {
        action()
      }
    }
  }

  const handleTouchEnd = (e) => {
    if (!tapMode && isTalking) {
      onStopTalking()
    }
  }

  const handleTouchCancel = (e) => {
    // Always stop when touch is cancelled (finger left button)
    if (isTalking && !tapMode) {
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

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        <button
          className={`talk-button all ${isTalking === 'ALL' ? 'active' : ''}`}
          disabled={!canTalkToAll}
          onMouseDown={() => handleMouseDown(onTalkToAll)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => handleTouchStart(e, onTalkToAll)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {getTalkToAllLabel()}
        </button>

        <button
          className={`talk-button ${isTalking === selectedRoom ? 'active' : ''}`}
          disabled={!selectedRoom}
          onMouseDown={() => handleMouseDown(() => onTalkToRoom(selectedRoom))}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => handleTouchStart(e, () => onTalkToRoom(selectedRoom))}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {getTalkToRoomLabel()}
        </button>
      </div>

      {tapMode && (
        <button
          onClick={() => setTapMode(false)}
          style={{ fontSize: '12px', padding: '8px 16px' }}
        >
          Switch to Hold Mode
        </button>
      )}

      <p className="info-text">
        {tapMode ? 'Tap to start • Tap again to stop' : 'Hold button to talk • Release to stop'}
      </p>
    </div>
  )
}

export default Controls
