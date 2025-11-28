# FunkHaus - Quick Start Guide

## 🚨 IMPORTANT: Deploy WebSocket Server First!

The app currently runs in demo mode because no WebSocket server is deployed.

For **REAL connections, chat, and voice**, you must deploy the server:

---

## Step 1: Deploy to Railway (5 minutes)

### Go to Railway
1. Visit: **https://railway.app/**
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose: **`antirom-design/funkhaus`**
6. Railway auto-detects the configuration ✅

### Get Your Server URL
1. In Railway dashboard → **Settings**
2. Click **"Generate Domain"**
3. Copy the domain (e.g., `funkhaus-production.up.railway.app`)

---

## Step 2: Update FunkHaus Code

### Edit: `src/hooks/useWebSocket.js` (line 52)

**Change this:**
```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://YOUR-RAILWAY-URL.up.railway.app'  // ← CHANGE THIS!
  : 'ws://localhost:3001'
```

**To this (with your Railway domain):**
```javascript
const wsUrl = import.meta.env.PROD
  ? 'wss://funkhaus-production.up.railway.app'  // ← Your Railway URL
  : 'ws://localhost:3001'
```

---

## Step 3: Deploy to Vercel

```bash
cd /Users/antirom/workspace_vibe/funkhaus
git add .
git commit -m "Connect to Railway WebSocket server"
git push
vercel --prod
```

---

## Step 4: Test Real Connections!

1. **Open**: https://funkhaus.vercel.app
2. **Join** a house (e.g., "TEST123") as "Room 1"
3. **Open another tab/device**
4. **Join** same house as "Room 2"
5. **Chat between rooms!** ✅
6. **Use voice!** (hold talk button) ✅

---

## What Works After Deployment

✅ **Real multi-user connections**
✅ **Chat between all rooms**
✅ **Voice communication (WebRTC)**
✅ **Three communication modes**
✅ **Room-specific URLs with QR codes**
✅ **Housemaster controls**

❌ **No more demo mode!**

---

## New Features Added

### 1. Room-Specific URLs
Each room gets a unique URL with QR code:
```
https://funkhaus.vercel.app?house=SCHOOL123&room=MusicRoom
```

Share this URL → people join directly to that room!

### 2. QR Code Display
- Visible in right panel after joining
- Click "Copy URL" to share
- Scan QR code on mobile devices

### 3. Direct Room Joining
- URL parameters auto-fill join form
- Perfect for sharing via SMS, email, QR codes

---

## Troubleshooting

### "Demo Mode" message appears
- WebSocket server not deployed yet
- Or wrong URL in `useWebSocket.js`
- Check Railway logs: `railway logs`

### Can't connect
```bash
# Test if server is running
curl https://YOUR-DOMAIN.up.railway.app
# Should return: "FunkHaus WebSocket Server"
```

### Check browser console
- Open DevTools (F12)
- Look for "WebSocket connected" ✅
- Or "WebSocket error" ❌

### Railway Logs
```bash
railway logs
```

---

## Cost

Railway offers:
- **$5 free credit/month**
- WebSocket server costs **~$2-3/month**
- First month often free

---

## Summary

| Step | Time | Status |
|------|------|--------|
| Deploy to Railway | 5 min | ⏳ Required |
| Update WebSocket URL | 1 min | ⏳ Required |
| Redeploy to Vercel | 2 min | ⏳ Required |
| **Total** | **8 min** | for real connections! |

After deployment, you'll have a fully functional push-to-talk intercom system!
