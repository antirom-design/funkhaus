// Vercel Serverless WebSocket handler
// Note: Vercel doesn't support traditional WebSocket servers
// For production, you'll need to use a separate WebSocket service
// or deploy the server elsewhere (e.g., Railway, Render, Fly.io)

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: 'FunkHaus WebSocket Server',
      note: 'For full functionality, run the WebSocket server separately using npm run server',
      instructions: 'Deploy server/index.js to Railway, Render, or another Node.js hosting service that supports WebSockets'
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
