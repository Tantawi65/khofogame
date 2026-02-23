import { create } from 'zustand';
import type { Room, GameState, CardInstance, Player, CardId } from '@shared/types';

export type Screen = 'menu' | 'lobby' | 'room' | 'game';

export type ModalType = 
  | 'peek-cards'
  | 'target-select'
  | 'card-type-select'
  | 'blind-steal'
  | 'arrange-hand'
  | 'view-hand'
  | 'flip-table'
  | 'place-mummy'
  | 'king-ra-prompt'
  | 'duel-result'
  | 'swap-result'
  | 'game-over'
  | null;

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface MummyEvent {
  type: 'drawn' | 'defused' | 'eliminated';
  playerName: string;
}

export interface ModalData {
  peekCards?: CardInstance[];
  targetPlayers?: Player[];
  blindStealCount?: number;
  viewHandCards?: CardInstance[];
  viewHandTargetId?: string;
  flipTableCards?: CardInstance[];
  deckSize?: number;
  kingRaPlayerId?: string;
  kingRaCardPlayed?: CardId;
  kingRaTimeout?: number;
  kingRaTargetId?: string;
  duelChallenger?: { playerId: string; card: CardInstance };
  duelOpponent?: { playerId: string; card: CardInstance };
  duelWinnerId?: string;
  spellboundTargetId?: string;
  swapGaveCard?: CardInstance;
  swapReceivedCard?: CardInstance;
  swapOtherPlayer?: string;
  winnerId?: string;
  winnerName?: string;
}

interface GameStore {
  // Connection
  playerId: string | null;
  playerName: string;
  isConnected: boolean;
  
  // Navigation
  currentScreen: Screen;
  
  // Room state
  currentRoom: Room | null;
  roomList: { id: string; name: string; playerCount: number; maxPlayers: number; isPlaying: boolean }[];
  
  // Game state
  gameState: GameState | null;
  myHand: CardInstance[];
  selectedCards: string[]; // instanceIds
  
  // Turn state
  isMyTurn: boolean;
  currentTurnPlayerId: string | null;
  turnsRemaining: number;
  reactionWindowActive: boolean;
  lastActionResolvedAt: number; // Timestamp when last action resolved
  
  // UI state
  activeModal: ModalType;
  modalData: ModalData;
  toasts: Toast[];
  mummyEvent: MummyEvent | null;
  
  // Actions
  setPlayerId: (id: string | null) => void;
  setPlayerName: (name: string) => void;
  setConnected: (connected: boolean) => void;
  setScreen: (screen: Screen) => void;
  setRoom: (room: Room | null) => void;
  setRoomList: (rooms: { id: string; name: string; playerCount: number; maxPlayers: number; isPlaying: boolean }[]) => void;
  setGameState: (state: GameState | null) => void;
  setMyHand: (hand: CardInstance[]) => void;
  toggleCardSelection: (instanceId: string) => void;
  clearSelection: () => void;
  setTurnInfo: (playerId: string, turnsRemaining: number) => void;
  setReactionWindowActive: (active: boolean) => void;
  setLastActionResolvedAt: (timestamp: number) => void;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setMummyEvent: (event: MummyEvent | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  playerId: null,
  playerName: '',
  isConnected: false,
  currentScreen: 'menu',
  currentRoom: null,
  roomList: [],
  gameState: null,
  myHand: [],
  selectedCards: [],
  isMyTurn: false,
  currentTurnPlayerId: null,
  turnsRemaining: 1,
  reactionWindowActive: false,
  lastActionResolvedAt: 0,
  activeModal: null,
  modalData: {},
  toasts: [],
  mummyEvent: null,
  
  // Actions
  setPlayerId: (id) => set({ playerId: id }),
  
  setPlayerName: (name) => set({ playerName: name }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  setScreen: (screen) => set({ currentScreen: screen }),
  
  setRoom: (room) => set({ currentRoom: room }),
  
  setRoomList: (rooms) => set({ roomList: rooms }),
  
  setGameState: (state) => {
    const { playerId } = get();
    const isMyTurn = state?.players[state.currentPlayerIndex]?.id === playerId;
    set({ 
      gameState: state,
      isMyTurn,
      currentTurnPlayerId: state?.players[state.currentPlayerIndex]?.id ?? null,
      turnsRemaining: state?.turnsRemaining ?? 1,
    });
  },
  
  setMyHand: (hand) => set({ myHand: hand }),
  
  toggleCardSelection: (instanceId) => {
    const { selectedCards } = get();
    if (selectedCards.includes(instanceId)) {
      set({ selectedCards: selectedCards.filter(id => id !== instanceId) });
    } else {
      set({ selectedCards: [...selectedCards, instanceId] });
    }
  },
  
  clearSelection: () => set({ selectedCards: [] }),
  
  setTurnInfo: (playerId, turnsRemaining) => {
    const { playerId: myId } = get();
    set({
      currentTurnPlayerId: playerId,
      turnsRemaining,
      isMyTurn: playerId === myId,
    });
  },
  
  setReactionWindowActive: (active) => set({ reactionWindowActive: active }),
  
  setLastActionResolvedAt: (timestamp) => set({ lastActionResolvedAt: timestamp }),
  
  openModal: (type, data = {}) => {
    const state = get();
    // Prevent opening the same modal type if it's already open
    if (state.activeModal === type) return;
    
    // When opening a result modal (duel, swap, etc.), clear the reaction window state
    // This prevents King Ra modal from re-appearing after action completes
    const resultModals = ['duel-result', 'swap-result', 'peek-cards', 'view-hand', 'blind-steal'];
    if (resultModals.includes(type as string)) {
      set({ activeModal: type, modalData: data, reactionWindowActive: false });
    } else {
      set({ activeModal: type, modalData: data });
    }
  },
  
  closeModal: () => set({ activeModal: null, modalData: {} }),
  
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto remove after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },
  
  setMummyEvent: (event) => {
    set({ mummyEvent: event });
    // Auto-clear after 3 seconds
    if (event) {
      setTimeout(() => {
        const current = get().mummyEvent;
        // Only clear if it's the same event
        if (current?.type === event.type && current?.playerName === event.playerName) {
          set({ mummyEvent: null });
        }
      }, 3000);
    }
  },
  
  reset: () => set({
    currentScreen: 'menu',
    currentRoom: null,
    gameState: null,
    myHand: [],
    selectedCards: [],
    isMyTurn: false,
    currentTurnPlayerId: null,
    turnsRemaining: 1,
    reactionWindowActive: false,
    lastActionResolvedAt: 0,
    activeModal: null,
    modalData: {},
    mummyEvent: null,
  }),
}));
