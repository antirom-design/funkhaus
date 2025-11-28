import { useState } from 'react'
import RoomList from './RoomList'
import ChatArea from './ChatArea'
import Controls from './Controls'
import RoomQRCode from './RoomQRCode'

function MainScreen({
  houseCode,
  roomName,
  isHousemaster,
  isAdmin,
  mode,
  rooms,
  messages,
  selectedRoom,
  talkingRoom,
  isTalking,
  canTalkToAll,
  isDemoMode,
  audioLevel,
  roomAudioLevels,
  viewMode,
  onModeChange,
  onSelectRoom,
  onTalkToAll,
  onTalkToRoom,
  onStopTalking,
  onSendChat,
  onAdminLogin,
  onAdminLogout,
  onKillAllAudio
}) {
  const getModeDisplay = () => {
    switch(mode) {
      case 'announcement': return 'ANNOUNCEMENT MODE'
      case 'returnChannel': return 'RETURN CHANNEL MODE'
      case 'free': return 'FREE MODE'
      default: return mode.toUpperCase()
    }
  }

  const getModeDescription = () => {
    switch(mode) {
      case 'announcement':
        return isHousemaster
          ? 'You can talk to ALL. Rooms can only reply 1:1'
          : 'Only Housemaster can talk to ALL. You can reply 1:1'
      case 'returnChannel':
        return isHousemaster
          ? 'You and rooms can talk to ALL'
          : 'You can talk to ALL or reply 1:1'
      case 'free':
        return 'Everyone can talk to ALL'
      default:
        return ''
    }
  }

  return (
    <div className="main-screen">
      <div className="header">
        <div>
          <h2>FUNKHAUS: {houseCode} {isDemoMode && '🎭'}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Room: {roomName} {isHousemaster && '(HOUSEMASTER)'} {isDemoMode && '• DEMO MODE'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mode-indicator">{getModeDisplay()}</div>
          <p className="info-text">{getModeDescription()}</p>
        </div>
      </div>

      <div className="content">
        <RoomList
          rooms={rooms}
          currentRoom={roomName}
          selectedRoom={selectedRoom}
          talkingRoom={talkingRoom}
          audioLevel={audioLevel}
          roomAudioLevels={roomAudioLevels}
          onSelectRoom={onSelectRoom}
        />

        <div className="main-area">
          <ChatArea messages={messages} onSendChat={onSendChat} canTalkToAll={canTalkToAll} />
        </div>

        <div style={{
          width: '280px',
          padding: '20px',
          background: 'var(--bg-panel)',
          borderLeft: '2px solid var(--border)',
          overflowY: 'auto'
        }}>
          <RoomQRCode houseCode={houseCode} roomName={roomName} />
        </div>
      </div>

      <Controls
        isHousemaster={isHousemaster}
        isAdmin={isAdmin}
        mode={mode}
        selectedRoom={selectedRoom}
        isTalking={isTalking}
        canTalkToAll={canTalkToAll}
        viewMode={viewMode}
        onModeChange={onModeChange}
        onTalkToAll={onTalkToAll}
        onTalkToRoom={onTalkToRoom}
        onStopTalking={onStopTalking}
        onAdminLogin={onAdminLogin}
        onAdminLogout={onAdminLogout}
        onKillAllAudio={onKillAllAudio}
      />
    </div>
  )
}

export default MainScreen
