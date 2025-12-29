import { useState, useEffect } from 'react'

function DiagnosticPanel({
  sessionId,
  connected,
  rooms,
  isTalking,
  selectedRoom,
  onTestMicrophone,
  onTestWebRTC
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [events, setEvents] = useState([])
  const [micPermission, setMicPermission] = useState('unknown')
  const [micStream, setMicStream] = useState(null)

  useEffect(() => {
    // Listen for WebRTC events for debugging
    const handleWebRTCSignal = (event) => {
      const { from, signal, target } = event.detail
      addEvent(`WebRTC: ${signal.type || 'candidate'} from ${from?.substring(0, 8)} to ${target}`)
    }

    const handleTalkState = () => {
      addEvent(`Talk state changed: ${isTalking}`)
    }

    window.addEventListener('webrtc-signal', handleWebRTCSignal)

    return () => {
      window.removeEventListener('webrtc-signal', handleWebRTCSignal)
    }
  }, [isTalking])

  const addEvent = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setEvents(prev => [{ time: timestamp, message }, ...prev].slice(0, 20))
  }

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      setMicPermission('granted')
      setMicStream(stream)
      addEvent('✓ Microphone access granted')

      // Stop the test stream after 2 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop())
        setMicStream(null)
        addEvent('✓ Test microphone stopped')
      }, 2000)
    } catch (error) {
      setMicPermission('denied')
      addEvent(`✗ Microphone error: ${error.message}`)
    }
  }

  const testWebSocket = () => {
    addEvent(`WebSocket: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`)
    addEvent(`Session ID: ${sessionId?.substring(0, 8)}...`)
  }

  const clearEvents = () => {
    setEvents([])
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          borderRadius: '4px',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}
      >
        🔧 Diagnostics
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      background: 'var(--bg-panel)',
      border: '2px solid var(--border)',
      borderRadius: '4px',
      padding: '15px',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '12px',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🔧 Diagnostics</h3>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Status */}
      <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(0,255,0,0.1)', borderRadius: '4px' }}>
        <div style={{ color: connected ? '#0f0' : '#f00' }}>
          WebSocket: {connected ? '● CONNECTED' : '○ DISCONNECTED'}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
          Session: {sessionId ? sessionId.substring(0, 12) + '...' : 'N/A'}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Rooms: {rooms.length}
        </div>
        <div style={{ color: isTalking ? '#0f0' : 'var(--text-secondary)' }}>
          Talking: {isTalking ? `YES (${isTalking})` : 'NO'}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Mic: {micPermission === 'granted' ? '✓ Granted' :
                micPermission === 'denied' ? '✗ Denied' : '? Unknown'}
        </div>
      </div>

      {/* Test Buttons */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button onClick={testMicrophone} style={buttonStyle}>
          Test Mic
        </button>
        <button onClick={testWebSocket} style={buttonStyle}>
          Test WS
        </button>
        <button onClick={clearEvents} style={buttonStyle}>
          Clear Log
        </button>
      </div>

      {/* Events Log */}
      <div style={{
        background: '#000',
        padding: '10px',
        borderRadius: '4px',
        maxHeight: '250px',
        overflowY: 'auto'
      }}>
        <div style={{
          color: 'var(--text-secondary)',
          marginBottom: '5px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '5px'
        }}>
          Event Log ({events.length})
        </div>
        {events.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No events yet...
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={idx} style={{
              color: event.message.includes('✗') ? '#f00' :
                     event.message.includes('✓') ? '#0f0' :
                     'var(--text-primary)',
              marginBottom: '3px',
              fontSize: '11px'
            }}>
              [{event.time}] {event.message}
            </div>
          ))
        )}
      </div>

      {/* Room List */}
      <div style={{ marginTop: '15px' }}>
        <div style={{
          color: 'var(--text-secondary)',
          marginBottom: '5px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '5px'
        }}>
          Rooms in House
        </div>
        {rooms.map(room => (
          <div key={room.id} style={{
            padding: '5px',
            background: room.id === sessionId ? 'rgba(0,255,0,0.1)' : 'transparent',
            borderLeft: room.id === selectedRoom ? '3px solid #0f0' : 'none',
            paddingLeft: room.id === selectedRoom ? '7px' : '5px',
            marginBottom: '2px'
          }}>
            {room.name} [{room.id.substring(0, 4)}]
            {room.id === sessionId && ' (YOU)'}
            {room.isHousemaster && ' ★'}
          </div>
        ))}
      </div>
    </div>
  )
}

const buttonStyle = {
  padding: '5px 10px',
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: '3px',
  fontSize: '11px',
  fontFamily: 'monospace'
}

export default DiagnosticPanel
