# FUNKHAUS - Push-to-Talk Intercom System

A retro-styled web application that recreates an old-school push-to-talk room intercom system with voice (WebRTC) and chat capabilities.

## 🎭 Demo Mode - Works Immediately!

**The app now includes a built-in demo mode** that works without any server deployment!

- **Auto-activates** when WebSocket server is unavailable
- **Simulated rooms** join automatically for realistic testing
- **Mock chat responses** for interactive demo
- **All features** work except real multi-user WebRTC voice

**Try it now**: https://funkhaus-5hxqd6xaw-antiroms-projects.vercel.app

For production use with real multi-user voice, deploy the WebSocket server (see Deployment section).

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

## Quick Start

### Try Demo Mode (No Setup Required)

1. **Just visit**: https://funkhaus-5hxqd6xaw-antiroms-projects.vercel.app
2. **Enter** a house code and room name
3. **Explore** all features in demo mode!

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```
   Frontend runs on `http://localhost:3000` (demo mode auto-activates)

3. **Optional - Start WebSocket server** (for real multi-user):
   ```bash
   npm run server
   ```
   Server runs on `http://localhost:3001`

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

#### Option 1: Railway.app (Recommended - Easy Web Deploy)

**Quick Deploy via Railway Web Interface:**

1. **Sign up at Railway:**
   - Go to https://railway.app/
   - Sign in with GitHub

2. **Deploy from GitHub:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the `funkhaus` repository
   - Railway will auto-detect the configuration

3. **Configure (if needed):**
   - Railway should automatically use the `Procfile` and `railway.json`
   - Start command: `cd server && npm install && node index.js`

4. **Get your WebSocket URL:**
   - Once deployed, go to Settings → Generate Domain
   - Copy the domain (e.g., `funkhaus-production.up.railway.app`)
   - Your WebSocket URL will be: `wss://funkhaus-production.up.railway.app`

5. **Update FunkHaus app:**
   - See "Update WebSocket URL" section below

**Alternative: Railway CLI**
```bash
# Install Railway CLI (requires Node 18+)
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

#### Option 2: Render.com
1. Go to https://render.com/
2. New → Web Service
3. Connect GitHub repo: `funkhaus`
4. Build command: `cd server && npm install`
5. Start command: `cd server && node index.js`
6. Copy the URL and use it as WebSocket URL (change https to wss)

#### Option 3: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

### Update WebSocket URL

After deploying the server, update `src/hooks/useWebSocket.js` line 23:

```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://your-deployed-server.railway.app'  // Replace with your actual Railway/Render URL
  : 'ws://localhost:3001'
```

Then redeploy to Vercel:
```bash
git add src/hooks/useWebSocket.js
git commit -m "Update WebSocket server URL"
git push
vercel --prod
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
