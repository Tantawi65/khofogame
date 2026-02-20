import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './socket/handlers.js';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types.js';


const app = express();
app.use(cors());

// Serve static files from client build in production (bulletproof path)
const clientDistPath = path.join(process.cwd(), '../client/dist');
app.use(express.static(clientDistPath));

const httpServer = createServer(app);

// Allow all origins in production, restrict in development
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? true // Allow all origins
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
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
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🎮 Mummy Card Game Server running on port ${PORT}`);
});
