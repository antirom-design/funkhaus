import { useState, useEffect, useRef } from 'react'

function Controls({
  isHousemaster,
  isAdmin,
  mode,
  selectedRoom,
  isTalking,
  canTalkToAll,
  viewMode,
  onModeChange,
  onTalkToAll,
  onTalkToRoom,
  onStopTalking,
  onAdminLogin,
  onAdminLogout,
  onKillAllAudio
}) {
  const [tapMode, setTapMode] = useState(viewMode === 'mobile')
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef(null)
  const buttonRefs = useRef({})

  useEffect(() => {
    // Update tap mode when view mode changes
    setTapMode(viewMode === 'mobile')
  }, [viewMode])

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

  // Slider handlers for mobile
  const handleSliderStart = (e) => {
    setIsDragging(true)
  }

  const handleSliderMove = (e) => {
    if (!isDragging) return

    const slider = sliderRef.current
    if (!slider) return

    const rect = slider.getBoundingClientRect()
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
    const position = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))

    setSliderPosition(position)

    // Activate talk when slider > 80%
    if (position > 80 && !isTalking) {
      onTalkToAll()
    } else if (position <= 80 && isTalking) {
      onStopTalking()
    }
  }

  const handleSliderEnd = () => {
    setIsDragging(false)
    // Reset slider and stop talking
    setSliderPosition(0)
    if (isTalking) {
      onStopTalking()
    }
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e) => handleSliderMove(e)
      const handleGlobalEnd = () => handleSliderEnd()

      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalEnd)
      window.addEventListener('touchmove', handleGlobalMove)
      window.addEventListener('touchend', handleGlobalEnd)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMove)
        window.removeEventListener('mouseup', handleGlobalEnd)
        window.removeEventListener('touchmove', handleGlobalMove)
        window.removeEventListener('touchend', handleGlobalEnd)
      }
    }
  }, [isDragging, isTalking])

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

      {viewMode === 'mobile' ? (
        /* Mobile Slider Control */
        <div style={{ width: '100%', padding: '20px 0' }}>
          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            <p style={{
              color: 'var(--text-primary)',
              fontSize: '14px',
              marginBottom: '5px'
            }}>
              {isTalking ? '🔴 TALKING' : 'Slide right to talk →'}
            </p>
          </div>

          <div
            ref={sliderRef}
            onMouseDown={handleSliderStart}
            onTouchStart={handleSliderStart}
            style={{
              position: 'relative',
              height: '60px',
              background: 'var(--bg-panel)',
              border: '2px solid var(--border-color)',
              borderRadius: '30px',
              cursor: 'pointer',
              touchAction: 'none',
              userSelect: 'none'
            }}
          >
            {/* Track fill */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${sliderPosition}%`,
              background: sliderPosition > 80 ? 'var(--button-active)' : 'rgba(0, 255, 0, 0.2)',
              borderRadius: '28px',
              transition: isDragging ? 'none' : 'width 0.2s ease-out'
            }} />

            {/* Slider handle */}
            <div style={{
              position: 'absolute',
              left: `${sliderPosition}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '56px',
              height: '56px',
              background: sliderPosition > 80 ? 'var(--button-active)' : 'var(--text-primary)',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              transition: isDragging ? 'none' : 'left 0.2s ease-out'
            }}>
              {sliderPosition > 80 ? '🔴' : '🎤'}
            </div>

            {/* Text hint */}
            <div style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              pointerEvents: 'none'
            }}>
              HOLD →
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Button Control */
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
      )}

      {viewMode === 'desktop' && (
        <p className="info-text">
          Hold button to talk • Release to stop
        </p>
      )}
    </div>
  )
}

export default Controls
