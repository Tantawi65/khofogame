// Host kicks a player before game starts
export const emitKickPlayer = (targetPlayerId: string): void => {
  socket.emit('kickPlayer', targetPlayerId);
};
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, CardId } from '@shared/types';
import { useGameStore } from '../store/gameStore';

const SERVER_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:3001';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
  upgrade: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

let isInitialized = false;
const processedEvents = new Set<string>();

// Prevent duplicate event processing (clears every 5 seconds)
function shouldProcessEvent(eventKey: string): boolean {
  if (processedEvents.has(eventKey)) return false;
  processedEvents.add(eventKey);
  setTimeout(() => processedEvents.delete(eventKey), 5000);
  return true;
}

export function initializeSocket(): void {
  // Prevent multiple initializations (React StrictMode, hot reload)
  if (isInitialized) {
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }
  isInitialized = true;
  
  const store = useGameStore.getState();
  
  socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
    store.setPlayerId(socket.id ?? null);
    store.setConnected(true);
    socket.emit('getRooms');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    store.setConnected(false);
  });
  
  socket.on('error', (message) => {
    store.addToast(message, 'danger');
  });
  
  // Room events
  socket.on('roomList', (rooms) => {
    store.setRoomList(rooms);
  });
  
  socket.on('roomJoined', (room) => {
    store.setRoom(room);
    store.setScreen('room');
  });
  
  socket.on('roomUpdated', (room) => {
    store.setRoom(room);
  });
  
  socket.on('roomLeft', () => {
    store.setRoom(null);
    store.setScreen('lobby');
    socket.emit('getRooms');
  });
  
  // Game events
  socket.on('gameStarted', (state, hand) => {
    store.setGameState(state);
    store.setMyHand(hand);
    store.setScreen('game');
  });
  
  socket.on('gameStateUpdated', (state) => {
    store.setGameState(state);
  });
  
  socket.on('handUpdated', (hand) => {
    store.setMyHand(hand);
  });
  
  // Card events
  socket.on('cardPlayed', (_playerId, _cardId, _targetId) => {
    // Card play events are handled visually, no toast needed
  });
  
  socket.on('peekCards', (cards) => {
    const eventKey = `peekCards-${cards.map(c => c.instanceId).join(',')}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('peek-cards', { peekCards: cards });
    }
  });
  
  socket.on('duelResult', (challenger, opponent, winnerId) => {
    const eventKey = `duelResult-${challenger.card.instanceId}-${opponent.card.instanceId}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('duel-result', {
        duelChallenger: challenger,
        duelOpponent: opponent,
        duelWinnerId: winnerId,
      });
    }
  });
  
  socket.on('swapResult', (youGave, youReceived, otherPlayerName) => {
    const eventKey = `swapResult-${youGave.instanceId}-${youReceived.instanceId}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('swap-result', {
        swapGaveCard: youGave,
        swapReceivedCard: youReceived,
        swapOtherPlayer: otherPlayerName,
      });
    }
  });
  
  socket.on('spellboundResult', (_success, _cardId) => {
    // Result shown in modal/game state update
  });
  
  socket.on('blindStealStart', (_thiefId, _targetId, cardCount) => {
    const state = useGameStore.getState();
    if (socket.id === state.playerId) {
      const eventKey = `blindSteal-${Date.now()}`;
      if (shouldProcessEvent(eventKey)) {
        store.openModal('blind-steal', { blindStealCount: cardCount });
      }
    }
  });
  
  socket.on('arrangeHandPrompt', (_thiefId) => {
    const eventKey = `arrangeHand-${Date.now()}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('arrange-hand');
    }
  });
  
  socket.on('viewHand', (targetId, cards) => {
    const eventKey = `viewHand-${targetId}-${cards.map(c => c.instanceId).join(',')}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('view-hand', { viewHandCards: cards, viewHandTargetId: targetId });
    }
  });
  
  socket.on('flipTableCards', (cards) => {
    const eventKey = `flipTable-${cards.map(c => c.instanceId).join(',')}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('flip-table', { flipTableCards: cards });
    }
  });
  
  // King Ra events
  socket.on('kingRaPrompt', (payload) => {
    // Support both old and new payloads for backward compatibility
    let actorId, cardPlayed, targetId, timeout;
    if (typeof payload === 'object' && payload !== null && 'actorId' in payload) {
      ({ actorId, cardPlayed, targetId, timeout } = payload);
    } else {
      // Old style: (playerId, cardPlayed, timeout)
      actorId = payload;
      cardPlayed = arguments[1];
      targetId = undefined;
      timeout = arguments[2];
    }
    const state = useGameStore.getState();
    // Don't show prompt to the player who played the card (they can't cancel their own action)
    if (actorId === state.playerId) {
      return;
    }
    // Don't show if action was recently resolved (stale event from network delay)
    if (Date.now() - state.lastActionResolvedAt < 2000) {
      return;
    }
    // Don't show if a non-related modal is open (action already resolved and moved on)
    const currentModal = state.activeModal;
    if (currentModal && currentModal !== 'king-ra-prompt') {
      // Another modal is already showing (like duel result), skip this
      return;
    }
    // Show the reaction window to ALL players (they can only use it if they have King Ra)
    store.openModal('king-ra-prompt', {
      kingRaPlayerId: actorId,
      kingRaCardPlayed: cardPlayed,
      kingRaTargetId: targetId,
      kingRaTimeout: timeout,
    });
  });
  
  socket.on('kingRaResponse', (_responderId, _didCancel) => {
    // King Ra response is shown visually
  });

  socket.on('actionPending', (_cardId: CardId, _timeout: number) => {
    store.setReactionWindowActive(true);
  });

  socket.on('actionResolved', (_cardId: CardId) => {
    // Reaction window ended, action proceeds - close King Ra modal if open
    const state = useGameStore.getState();
    if (state.activeModal === 'king-ra-prompt') {
      store.closeModal();
    }
    store.setReactionWindowActive(false);
    store.setLastActionResolvedAt(Date.now());
  });

  socket.on('actionCancelled', (_cardId: CardId, _cancelCount) => {
    // Close King Ra modal if open
    const state = useGameStore.getState();
    if (state.activeModal === 'king-ra-prompt') {
      store.closeModal();
    }
    store.setReactionWindowActive(false);
    store.setLastActionResolvedAt(Date.now());
  });
  
  // Mummy events
  socket.on('mummyDrawn', (playerId) => {
    const state = useGameStore.getState().gameState;
    const player = state?.players.find(p => p.id === playerId);
    store.setMummyEvent({ type: 'drawn', playerName: player?.name ?? 'A player' });
  });
  
  socket.on('mummyDefused', (playerId) => {
    const state = useGameStore.getState().gameState;
    const player = state?.players.find(p => p.id === playerId);
    store.setMummyEvent({ type: 'defused', playerName: player?.name ?? 'A player' });
  });
  
  socket.on('placeMummyPrompt', (deckSize) => {
    const eventKey = `placeMummy-${deckSize}-${Date.now()}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('place-mummy', { deckSize });
    }
  });
  
  socket.on('playerEliminated', (playerId) => {
    const state = useGameStore.getState().gameState;
    const player = state?.players.find(p => p.id === playerId);
    store.setMummyEvent({ type: 'eliminated', playerName: player?.name ?? 'A player' });
  });
  
  // Turn events
  socket.on('turnStarted', (playerId, turnsRemaining) => {
    store.setTurnInfo(playerId, turnsRemaining);
  });
  
  // Ignore server notifications - only show mummy events via overlay
  socket.on('notification', () => {
    // Notifications disabled - mummy events handled separately
  });
  
  // Game over
  socket.on('gameOver', (winnerId, winnerName) => {
    const eventKey = `gameOver-${winnerId}`;
    if (shouldProcessEvent(eventKey)) {
      store.openModal('game-over', { winnerId, winnerName });
    }
  });
  
  // Connect
  socket.connect();
}

export function disconnectSocket(): void {
  socket.disconnect();
}

// Emit helpers
export const emitCreateRoom = (playerName: string, roomName: string): void => {
  socket.emit('createRoom', playerName, roomName);
};

export const emitJoinRoom = (playerName: string, roomId: string): void => {
  socket.emit('joinRoom', playerName, roomId);
};

export const emitLeaveRoom = (): void => {
  socket.emit('leaveRoom');
};

export const emitSetReady = (ready: boolean): void => {
  socket.emit('setReady', ready);
};

export const emitStartGame = (): void => {
  socket.emit('startGame');
};

export const emitPlayCard = (cardInstanceId: string, targetPlayerId?: string, additionalData?: unknown): void => {
  socket.emit('playCard', cardInstanceId, targetPlayerId, additionalData);
};

export const emitDrawCard = (): void => {
  socket.emit('drawCard');
};

export const emitSpellboundRequest = (targetId: string, requestedCardId: string): void => {
  socket.emit('spellboundRequest', targetId, requestedCardId as any);
};

export const emitBlindStealSelect = (position: number): void => {
  socket.emit('blindStealSelect', position);
};

export const emitArrangeHand = (newOrder: string[]): void => {
  socket.emit('arrangeHand', newOrder);
};

export const emitBurnCard = (cardInstanceId: string): void => {
  socket.emit('burnCard', cardInstanceId);
};

export const emitRearrangeTopCards = (newOrder: string[]): void => {
  socket.emit('rearrangeTopCards', newOrder);
};

export const emitPlaceMummy = (position: number): void => {
  socket.emit('placeMummy', position);
};

export const emitKingRaResponse = (useKingRa: boolean): void => {
  console.log('socket.ts emitKingRaResponse called with:', useKingRa);
  socket.emit('kingRaResponse', useKingRa);
  console.log('socket.ts kingRaResponse emitted');
};

export const emitGetRooms = (): void => {
  socket.emit('getRooms');
};
