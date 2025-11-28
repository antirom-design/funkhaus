# FUNKHAUS - Push-to-Talk Intercom System

A retro-styled web application that recreates an old-school push-to-talk room intercom system with voice (WebRTC) and chat capabilities.

## Features

- **Multi-Room Communication**: Each browser session becomes a "room" in a shared "house"
- **Push-to-Talk Voice**: Half-duplex WebRTC voice communication
- **Chat System**: Text messaging to ALL or specific rooms
- **Three Communication Modes**:
  - **Announcement Mode**: Only Housemaster can broadcast to ALL
  - **Return Channel Mode**: Housemaster + optional room broadcasts
  - **Free Mode**: Everyone can talk to everyone
- **Housemaster Controls**: First user becomes admin with mode control
- **Retro UI**: Classic terminal-style interface with green text

## Technology Stack

- **Frontend**: React + Vite
- **Real-time**: WebSockets for signaling and state
- **Voice**: WebRTC for peer-to-peer audio
- **Backend**: Node.js WebSocket server
- **Deployment**: Vercel (frontend) + separate WebSocket server

## Project Structure

```
funkhaus/
├── src/
│   ├── components/
│   │   ├── JoinScreen.jsx
│   │   ├── MainScreen.jsx
│   │   ├── RoomList.jsx
│   │   ├── ChatArea.jsx
│   │   └── Controls.jsx
│   ├── hooks/
│   │   ├── useWebSocket.js
│   │   └── useWebRTC.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   └── index.js
├── api/
│   └── websocket.js
├── package.json
├── vite.config.js
└── vercel.json
```

## Installation

### Prerequisites

- Node.js 18+ (for local development and server)
- Modern browser with WebRTC support

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the WebSocket server** (in one terminal):
   ```bash
   npm run server
   ```
   Server runs on `http://localhost:3001`

3. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

4. **Open multiple browser tabs** to test multi-room communication

## Usage

1. **Join a House:**
   - Enter a house code (e.g., "SCHOOL123")
   - Enter your room name (e.g., "Music Room")
   - First user becomes Housemaster

2. **Communication Modes** (Housemaster only):
   - Click mode buttons to change global communication rules
   - Mode affects who can broadcast to ALL rooms

3. **Voice Communication:**
   - Select a room from the list OR use ALL button
   - **Press and hold** talk button to transmit
   - Release to stop

4. **Chat:**
   - Type message in input field
   - Select target (ALL or Selected Room)
   - Press SEND

## Deployment

### Frontend (Vercel)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   Or connect your GitHub repo in Vercel dashboard

### WebSocket Server

**Important:** Vercel doesn't support WebSocket servers. Deploy the server separately:

#### Option 1: Railway.app
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Option 2: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm run server`
5. Copy the WebSocket URL

#### Option 3: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

### Update WebSocket URL

After deploying the server, update `src/hooks/useWebSocket.js`:

```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://your-server-url.railway.app'  // Your deployed server URL
  : 'ws://localhost:3001'
```

## How It Works

### Communication Modes

**Announcement Mode:**
- Housemaster: Can send to ALL, can send 1:1
- Rooms: Can only send 1:1

**Return Channel Mode:**
- Housemaster: Can send to ALL, can send 1:1
- Rooms: Can send to ALL (if enabled), can send 1:1

**Free Mode:**
- Everyone: Can send to ALL, can send 1:1

### WebRTC Flow

1. User presses talk button
2. Browser requests microphone access
3. WebSocket notifies other rooms
4. WebRTC peer connections established
5. Audio streams transmitted
6. User releases button, connections close

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- WebRTC support
- WebSocket support
- Microphone access

## Development Notes

- The app uses **half-duplex** communication (one speaker at a time)
- WebRTC uses STUN servers for NAT traversal
- For production, consider adding TURN servers for firewall traversal
- State management is intentionally simple (no Redux needed)
- No database - all state is in-memory (sessions only)

## Future Enhancements

- [ ] Persistent chat history
- [ ] Room status indicators (online/offline)
- [ ] Recording functionality
- [ ] Multiple houses per server
- [ ] User authentication
- [ ] Mobile app version
- [ ] TURN server integration
- [ ] End-to-end encryption

## License

MIT

## Credits

Built with React, Vite, and WebRTC
