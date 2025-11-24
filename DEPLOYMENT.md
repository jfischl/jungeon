# Deployment Guide

## Overview
This guide covers deploying The Jungeon with the server on Render and the client on Vercel.

## Server Deployment (Render)

### Setup
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Environment Variables
No environment variables required for basic setup. Render automatically provides the `PORT` variable.

### Important Notes
- Render will automatically set the PORT environment variable
- The server uses CommonJS modules (`"type": "commonjs"`)
- Server listens on `process.env.PORT || 3000`

## Client Deployment (Vercel)

### Setup
1. Create a new project on Vercel
2. Connect your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (project root)
   - **Build Command**: `npm run build` (or leave as default if using vercel.json)
   - **Output Directory**: `dist/client` (or leave as default if using vercel.json)
   - **Install Command**: `npm install` (or leave as default)

Note: A `vercel.json` file is provided in the root that configures these settings automatically.

### Environment Variables
**CRITICAL**: Add this environment variable in Vercel dashboard:
```
VITE_SERVER_URL=https://your-app-name.onrender.com
```

Replace `your-app-name` with your actual Render service name.

### Steps to Set Environment Variable
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: `https://jungeon.onrender.com` (or your Render URL)
   - **Environment**: Production, Preview, Development (check all)
4. Click "Save"
5. Redeploy your project

## Socket.IO Configuration

### Server Configuration (server/index.ts:10-18)
```typescript
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});
```

### Client Configuration (client/src/main.ts:5-12)
```typescript
const socket: Socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3000', {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 20000,
    forceNew: true
});
```

## Troubleshooting

### Client Can't Connect to Server
1. **Check Vercel Environment Variable**: Ensure `VITE_SERVER_URL` is set in Vercel dashboard
2. **Check Render Server**: Visit `https://your-app.onrender.com` - you should see the game interface
3. **Check Browser Console**: Look for Socket.IO connection errors
4. **Verify CORS**: Ensure server CORS is set to `origin: "*"` or includes Vercel domain

### Common Issues

**Issue**: "401 Unauthorized" or "Deployment not found"
- **Solution**:
  - Check Vercel deployment status in dashboard
  - Ensure GitHub integration is working and latest commit deployed
  - Check if deployment protection is enabled (disable for public access)
  - Try redeploying from Vercel dashboard

**Issue**: "WebSocket connection failed"
- **Solution**: The Socket.IO config now includes fallback to polling transport

**Issue**: "CORS policy error"
- **Solution**: Server is configured with `origin: "*"` which allows all origins

**Issue**: "Connection timeout"
- **Solution**: Client timeout increased to 20 seconds to handle Render cold starts

**Issue**: Environment variable not working
- **Solution**:
  - Ensure variable is named `VITE_SERVER_URL` (must start with `VITE_`)
  - Redeploy after adding environment variable
  - Clear browser cache

### Testing the Connection
1. Open browser console on your Vercel site
2. Look for: `"Connecting to server at: https://your-app.onrender.com"`
3. Should see: `"Connected to server."` message
4. If connection fails, check Network tab for Socket.IO requests

### Render Cold Starts
Render free tier instances sleep after inactivity:
- First connection may take 30-60 seconds
- Client is configured with 20-second timeout and auto-reconnect
- Users will see "Connected to server" once Render wakes up

## Local Development

To test the production setup locally:

1. Update `client/.env.local`:
```
VITE_SERVER_URL=http://localhost:3000
```

2. Build and run server:
```bash
npm run build:server
npm start
```

3. In a separate terminal, run client dev server:
```bash
npm run dev
```

4. Visit `http://localhost:5173` (Vite dev server)

## Deployment Checklist

### Before Deploying
- [ ] Server code built successfully with `npm run build:server`
- [ ] Client code built successfully with `npm run build`
- [ ] All tests passing with `npm test`

### Render Setup
- [ ] Web Service created
- [ ] GitHub repo connected
- [ ] Build command: `npm install && npm run build:server`
- [ ] Start command: `npm start`
- [ ] Service deployed and accessible

### Vercel Setup
- [ ] Project created with Vite preset
- [ ] Environment variable `VITE_SERVER_URL` set to Render URL
- [ ] Project deployed successfully
- [ ] Client can connect to Render server

### Post-Deployment
- [ ] Visit Vercel URL and check browser console
- [ ] Verify Socket.IO connection established
- [ ] Test character selection and login
- [ ] Test basic commands (look, move, etc.)
- [ ] Test with multiple users

## URLs

After deployment, you should have:
- **Server (Render)**: `https://your-app-name.onrender.com`
- **Client (Vercel)**: `https://your-project-name.vercel.app`

Users should visit the Vercel URL to play the game.
