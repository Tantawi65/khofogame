import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import { GameEngine } from '../game/GameEngine.js';
import type {
  Room,
  RoomInfo,
  Player,
  ServerToClientEvents,
  ClientToServerEvents,
  CardInstance,
  GameState,
} from '@shared/types.js';

interface GameRoom extends Room {
  game: GameEngine | null;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // socketId -> roomId

  createRoom(hostSocketId: string, playerName: string, roomName: string): GameRoom {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    
    const host: Player = {
      id: hostSocketId,
      name: playerName,
      isAlive: true,
      cardCount: 0,
      isReady: false,
      isHost: true,
    };
    
    const room: GameRoom = {
      id: roomId,
      name: roomName,
      hostId: hostSocketId,
      players: [host],
      maxPlayers: 6,
      gameState: null,
      game: null,
    };
    
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostSocketId, roomId);
    
    return room;
  }

  joinRoom(socketId: string, playerName: string, roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.gameState?.phase === 'playing') return null;
    
    const player: Player = {
      id: socketId,
      name: playerName,
      isAlive: true,
      cardCount: 0,
      isReady: false,
      isHost: false,
    };
    
    room.players.push(player);
    this.playerRooms.set(socketId, roomId);
    
    return room;
  }

  leaveRoom(socketId: string): { room: GameRoom | null; wasHost: boolean } {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return { room: null, wasHost: false };
    
    const room = this.rooms.get(roomId);
    if (!room) return { room: null, wasHost: false };
    
    const wasHost = room.hostId === socketId;
    room.players = room.players.filter(p => p.id !== socketId);
    this.playerRooms.delete(socketId);
    
    // If game is in progress, eliminate the player
    if (room.game && room.gameState?.phase === 'playing') {
      room.game.eliminatePlayer(socketId);
      room.gameState = room.game.getGameState();
    }
    
    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { room: null, wasHost };
    }
    
    // Transfer host if needed
    if (wasHost && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }
    
    return { room, wasHost };
  }

  handleDisconnect(socketId: string, io: Server<ClientToServerEvents, ServerToClientEvents>): void {
    const { room } = this.leaveRoom(socketId);
    if (room) {
      // Notify remaining players
      io.to(room.id).emit('roomUpdated', this.getRoomInfo(room));
      
      if (room.gameState) {
        io.to(room.id).emit('gameStateUpdated', room.gameState);
        
        // Emit player eliminated event for disconnected player
        io.to(room.id).emit('playerEliminated', socketId);
        
        // Check for game over
        if (room.gameState.phase === 'game_over' && room.gameState.winnerId) {
          const winner = room.players.find(p => p.id === room.gameState?.winnerId);
          io.to(room.id).emit('gameOver', room.gameState.winnerId, winner?.name ?? 'Unknown');
        }
      }
    }
  }

  setPlayerReady(socketId: string, ready: boolean): GameRoom | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    
    const room = this.rooms.get(roomId);
    if (!room) return null;
    
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      player.isReady = ready;
    }
    
    return room;
  }

  canStartGame(room: GameRoom): boolean {
    if (room.players.length < 2) return false;
    return room.players.every(p => p.isReady || p.isHost);
  }

  startGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || !this.canStartGame(room)) return null;
    
    // Create game engine
    room.game = new GameEngine(room.players);
    room.game.initializeGame();
    room.gameState = room.game.getGameState();
    
    return room;
  }

  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) ?? null;
  }

  getPlayerRoom(socketId: string): GameRoom | null {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) ?? null;
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      isPlaying: room.gameState?.phase === 'playing',
    }));
  }

  private getRoomInfo(room: GameRoom): Room {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
    };
  }

  // Update game state
  updateGameState(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.game) {
      room.gameState = room.game.getGameState();
    }
  }
}
