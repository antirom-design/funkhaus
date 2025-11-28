import { useState, useEffect, useRef } from 'react'

function Controls({
  isHousemaster,
  isAdmin,
  mode,
  selectedRoom,
  isTalking,
  canTalkToAll,
  onModeChange,
  onTalkToAll,
  onTalkToRoom,
  onStopTalking,
  onAdminLogin,
  onAdminLogout,
  onKillAllAudio
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
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

  const handleAdminPrompt = () => {
    setShowAdminPrompt(true)
  }

  const handleAdminSubmit = (e) => {
    e.preventDefault()
    const success = onAdminLogin(adminPassword)
    if (success) {
      setShowAdminPrompt(false)
      setAdminPassword('')
    } else {
      alert('Incorrect password')
      setAdminPassword('')
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
      {/* Admin Login Prompt */}
      {showAdminPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={handleAdminSubmit} style={{
            background: 'var(--bg-panel)',
            padding: '30px',
            border: '2px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            minWidth: '300px'
          }}>
            <h3>ADMIN LOGIN</h3>
            <input
              type="password"
              placeholder="Enter password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">Login</button>
              <button type="button" onClick={() => {
                setShowAdminPrompt(false)
                setAdminPassword('')
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Panel */}
      {isAdmin && isHousemaster && (
        <div style={{
          padding: '15px',
          background: 'var(--bg-dark)',
          border: '2px solid var(--housemaster)',
          marginBottom: '15px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: 'var(--housemaster)' }}>ADMIN PANEL</h4>
            <button onClick={onAdminLogout} style={{ fontSize: '12px', padding: '6px 12px' }}>
              Hide Admin
            </button>
          </div>

          <div className="mode-controls" style={{ marginBottom: '15px' }}>
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

          <button
            onClick={onKillAllAudio}
            style={{
              background: 'var(--warning)',
              borderColor: 'var(--warning)',
              color: '#000',
              width: '100%',
              fontWeight: 'bold'
            }}
          >
            ⚠️ KILL ALL AUDIO
          </button>
        </div>
      )}

      {/* Admin Login Button (only for housemaster) */}
      {!isAdmin && isHousemaster && (
        <button
          onClick={handleAdminPrompt}
          style={{
            fontSize: '12px',
            padding: '8px 16px',
            marginBottom: '15px'
          }}
        >
          Admin
        </button>
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
