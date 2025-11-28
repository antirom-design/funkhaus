# Deploy WebSocket Server to Railway

## Critical: This app REQUIRES a WebSocket server for real connections!

The demo mode is just a simulation. For real chat and voice, follow these steps:

## Step 1: Deploy to Railway (5 minutes)

### Option A: Web Interface (Easiest)

1. **Go to**: https://railway.app/
2. **Sign in** with your GitHub account
3. **Click**: "New Project"
4. **Select**: "Deploy from GitHub repo"
5. **Choose**: `antirom-design/funkhaus` repository
6. **Railway will auto-detect** the configuration from:
   - `Procfile`
   - `railway.json`
   - `server/package.json`

### Option B: CLI (if you have Node 18+)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Step 2: Get Your WebSocket URL

1. In Railway dashboard, go to your project
2. Click **Settings** → **Generate Domain**
3. Copy the domain (e.g., `funkhaus-production.up.railway.app`)
4. Your WebSocket URL is: `wss://YOUR-DOMAIN.up.railway.app`

## Step 3: Update FunkHaus Code

Edit `src/hooks/useWebSocket.js` line 50:

```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://YOUR-RAILWAY-DOMAIN.up.railway.app'  // ← Replace this!
  : 'ws://localhost:3001'
```

Example:
```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://funkhaus-production.up.railway.app'
  : 'ws://localhost:3001'
```

## Step 4: Redeploy to Vercel

```bash
cd /Users/antirom/workspace_vibe/funkhaus
git add src/hooks/useWebSocket.js
git commit -m "Connect to Railway WebSocket server"
git push
vercel --prod
```

## Step 5: Test

1. Open https://funkhaus.vercel.app
2. You should see it connect (no demo mode message)
3. Open in 2 browser tabs/windows
4. Join same house code
5. Chat should work between tabs!

## Troubleshooting

### Server logs
```bash
railway logs
```

### Check if server is running
```bash
curl https://YOUR-DOMAIN.up.railway.app
# Should return: "FunkHaus WebSocket Server"
```

### Test WebSocket connection
Open browser console at https://funkhaus.vercel.app and check for:
- "WebSocket connected" (good!)
- "WebSocket error" (bad - check Railway logs)

## Cost

Railway offers:
- **$5 free credit per month**
- WebSocket server should cost ~$2-3/month
- First month often free with trial

## Next Steps

After deploying, the app will have:
- ✅ Real multi-user connections
- ✅ Working chat between rooms
- ✅ WebRTC voice support
- ✅ All three communication modes
- ❌ No more demo mode!
