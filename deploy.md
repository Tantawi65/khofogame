# Mummy Card Game - Deployment Guide

This guide covers multiple ways to deploy your Mummy Card Game for use outside localhost.

---

## Table of Contents
1. [Quick Deploy with Render (Recommended)](#option-1-render-recommended---free)
2. [Deploy with Railway](#option-2-railway)
3. [Deploy with Fly.io](#option-3-flyio)
4. [Deploy with VPS (DigitalOcean/AWS)](#option-4-vps-digitalocean-aws-etc)
5. [Local Network (LAN Party)](#option-5-local-network-lan-party)

---

## Prerequisites

Before deploying, you need to prepare your project:

### Step 1: Update Server to Serve Static Files

First, modify your server to serve the built client files in production.

Edit `server/src/index.ts`:

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './socket/handlers.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from client build
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // Allow all origins in production
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  setupSocketHandlers(io, socket, roomManager);
  
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id, io);
  });
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🎮 Mummy Card Game Server running on port ${PORT}`);
});
```

### Step 2: Update Vite Build Config

Edit `client/vite.config.ts` to set the correct output directory:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../Assests'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

### Step 3: Create Root package.json

Create a `package.json` in the root `Web` folder:

```json
{
  "name": "mummy-card-game",
  "version": "1.0.0",
  "scripts": {
    "install:all": "cd client && npm install && cd ../server && npm install",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm run build",
    "build": "npm run build:client && npm run build:server",
    "start": "cd server && npm start",
    "dev": "cd server && npm run dev"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Option 1: Render (Recommended - Free)

Render offers free hosting for web services with WebSocket support.

### Step 1: Push to GitHub

```bash
# In the Web folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mummy-card-game.git
git push -u origin main
```

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 3: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mummy-card-game`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or `Web` if repo has parent folder)
   - **Runtime**: `Node`
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Instance Type**: Free

4. Click **"Create Web Service"**

### Step 4: Wait for Build
- Build takes 2-5 minutes
- Your app will be available at: `https://mummy-card-game.onrender.com`

### Note on Free Tier
- Free services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid ($7/month) for always-on

---

## Option 2: Railway

Railway offers simple deployment with generous free tier.

### Step 1: Push to GitHub (same as above)

### Step 2: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 3: Deploy
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway auto-detects Node.js

### Step 4: Configure
1. Go to **Settings** → **General**
2. Set **Root Directory**: `/` (or where Web folder is)
3. Go to **Settings** → **Build**
4. Set **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install && npm run build`
5. Set **Start Command**: `cd server && npm start`

### Step 5: Generate Domain
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Your app is live!

---

## Option 3: Fly.io

Fly.io provides excellent WebSocket support and global edge deployment.

### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Or with npm
npm install -g flyctl
```

### Step 2: Login
```bash
fly auth login
```

### Step 3: Create fly.toml

Create `fly.toml` in the `Web` folder:

```toml
app = "mummy-card-game"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Step 4: Create Dockerfile

Create `Dockerfile` in the `Web` folder:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server/dist/index.js"]
```

### Step 5: Deploy
```bash
fly launch
fly deploy
```

Your app will be at: `https://mummy-card-game.fly.dev`

---

## Option 4: VPS (DigitalOcean, AWS, etc.)

For full control, deploy to a VPS.

### Step 1: Create VPS
1. Create a Ubuntu 22.04 droplet/instance
2. SSH into your server

### Step 2: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Clone and Build
```bash
git clone https://github.com/YOUR_USERNAME/mummy-card-game.git
cd mummy-card-game/Web

# Install and build
cd client && npm install && npm run build
cd ../server && npm install && npm run build
```

### Step 4: Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### Step 5: Start with PM2
```bash
cd server
pm2 start dist/index.js --name mummy-game
pm2 save
pm2 startup
```

### Step 6: Setup Nginx (Optional - for domain/SSL)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/mummy-game
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/mummy-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Option 5: Local Network (LAN Party)

Play with friends on the same WiFi network.

### Step 1: Find Your IP Address

```bash
# Windows
ipconfig
# Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.100)

# Mac/Linux
ifconfig
# or
ip addr
```

### Step 2: Update Server CORS

In `server/src/index.ts`, update CORS:

```typescript
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // Allow all
    methods: ['GET', 'POST'],
  },
});
```

### Step 3: Build and Run

```bash
# Build client
cd client
npm run build

# Start server
cd ../server
npm run build
npm start
```

### Step 4: Connect
- Your device: `http://localhost:3001`
- Other devices on network: `http://YOUR_IP:3001` (e.g., `http://192.168.1.100:3001`)

### Tip: Allow Through Firewall

Windows:
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Mummy Game" dir=in action=allow protocol=TCP localport=3001
```

---

## Troubleshooting

### WebSocket Connection Failed
- Ensure your hosting supports WebSockets
- Check if server CORS allows your domain
- Verify the client is connecting to the correct URL

### Build Fails
- Check Node.js version (needs 18+)
- Run `npm install` in both client and server folders
- Check for TypeScript errors: `npm run build`

### Assets Not Loading
- Ensure `Assests` folder is copied to `client/dist` after build
- Or configure Vite to copy it (already done via `publicDir`)

### Free Tier Limits
- Render: 750 hours/month free
- Railway: $5 credit/month
- Fly.io: 3 shared VMs free

---

## Quick Commands Reference

```bash
# Local development
cd server && npm run dev    # Start server (dev mode)
cd client && npm run dev    # Start client (dev mode)

# Production build
cd client && npm run build
cd server && npm run build
cd server && npm start

# Or with root package.json
npm run build
npm start
```

---

## Sharing with Friends

Once deployed, share your URL:
1. **Render**: `https://your-app-name.onrender.com`
2. **Railway**: `https://your-app-name.up.railway.app`
3. **Fly.io**: `https://your-app-name.fly.dev`
4. **Custom VPS**: `https://yourdomain.com`
5. **LAN**: `http://YOUR_LOCAL_IP:3001`

Players just need to open the link in their browser - no installation required!
