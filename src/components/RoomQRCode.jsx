import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

function RoomQRCode({ houseCode, roomName }) {
  const canvasRef = useRef(null)
  const [roomUrl, setRoomUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate room-specific URL
    const baseUrl = window.location.origin
    const url = `${baseUrl}?house=${encodeURIComponent(houseCode)}&room=${encodeURIComponent(roomName)}`
    setRoomUrl(url)

    // Generate QR code
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#00ff00',
          light: '#1a1a1a'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error)
      })
    }
  }, [houseCode, roomName])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      padding: '20px',
      background: 'var(--bg-panel)',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Room URL & QR Code</h3>

      <canvas ref={canvasRef} style={{
        border: '4px solid var(--text-primary)',
        borderRadius: '8px',
        marginBottom: '15px'
      }} />

      <div style={{
        marginBottom: '10px',
        fontSize: '12px',
        wordBreak: 'break-all',
        color: 'var(--text-secondary)',
        padding: '10px',
        background: 'var(--bg-dark)',
        borderRadius: '4px'
      }}>
        {roomUrl}
      </div>

      <button
        onClick={copyToClipboard}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          background: copied ? 'var(--success)' : 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {copied ? '✓ Copied!' : 'Copy URL'}
      </button>

      <p style={{
        marginTop: '10px',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        Share this URL or QR code to invite others directly to this room
      </p>
    </div>
  )
}

export default RoomQRCode
