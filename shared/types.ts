// ============================================
// SHARED TYPES - Used by both client and server
// ============================================

// Card Types
export type CardId =
  | 'sharp_eye'
  | 'wait_a_sec'
  | 'me_or_you'
  | 'spellbound'
  | 'criminal_mummy'
  | 'give_and_take'
  | 'shuffle_it'
  | 'king_ra_says_no'
  | 'safe_travels'
  | 'take_a_lap'
  | 'all_or_nothing'
  | 'flip_the_table'
  | 'this_is_on_you'
  | 'mummified';

export interface CardDefinition {
  id: CardId;
  nameEn: string;
  nameAr: string;
  value: number;
  isHalf: boolean;
  description: string;
}

export interface CardInstance {
  instanceId: string; // Unique ID for each card instance
  cardId: CardId;
}

// Card Database
export const CARD_DATABASE: Record<CardId, CardDefinition> = {
  sharp_eye: {
    id: 'sharp_eye',
    nameEn: 'Sharp Eye',
    nameAr: 'كلك نظر',
    value: 1,
    isHalf: false,
    description: 'Peek at the top 3 cards of the draw pile.',
  },
  wait_a_sec: {
    id: 'wait_a_sec',
    nameEn: 'Wait a Sec',
    nameAr: 'اتقل سيكا',
    value: 3,
    isHalf: false,
    description: 'End your turn immediately without drawing a card.',
  },
  me_or_you: {
    id: 'me_or_you',
    nameEn: 'Me or You',
    nameAr: 'يا أنا يا أنت',
    value: 4,
    isHalf: false,
    description: 'Duel! Both draw a card, higher value wins both.',
  },
  spellbound: {
    id: 'spellbound',
    nameEn: 'Spellbound',
    nameAr: 'سحرالك',
    value: 5,
    isHalf: false,
    description: 'Ask a player for a specific card. If wrong, you draw.',
  },
  criminal_mummy: {
    id: 'criminal_mummy',
    nameEn: 'Criminal Mummy',
    nameAr: 'موميا سوابق',
    value: 3,
    isHalf: false,
    description: 'Steal one random card from an opponent blindly.',
  },
  give_and_take: {
    id: 'give_and_take',
    nameEn: 'Give & Take',
    nameAr: 'الدنيا أخذ وعطى',
    value: 0,
    isHalf: true,
    description: 'Swap your lowest card with opponent\'s highest.',
  },
  shuffle_it: {
    id: 'shuffle_it',
    nameEn: 'Shuffle It',
    nameAr: 'هشقبلهالك',
    value: 3,
    isHalf: false,
    description: 'Reshuffle the entire draw pile.',
  },
  king_ra_says_no: {
    id: 'king_ra_says_no',
    nameEn: 'King Ra Says NO',
    nameAr: 'الملك رع بيقول لع',
    value: 4,
    isHalf: false,
    description: 'Cancel any player\'s action. Reactive only!',
  },
  safe_travels: {
    id: 'safe_travels',
    nameEn: 'Safe Travels',
    nameAr: 'طريق السلامة أنت',
    value: 3,
    isHalf: false,
    description: 'End turn without drawing, next player takes 2 turns.',
  },
  take_a_lap: {
    id: 'take_a_lap',
    nameEn: 'Take a Lap',
    nameAr: 'خدلك لفة',
    value: 6,
    isHalf: false,
    description: 'Defuse the mummy card and place it back in deck.',
  },
  all_or_nothing: {
    id: 'all_or_nothing',
    nameEn: 'All or Nothing',
    nameAr: 'فيها لأخفيها',
    value: 0,
    isHalf: true,
    description: 'View opponent\'s hand, choose one card to burn.',
  },
  flip_the_table: {
    id: 'flip_the_table',
    nameEn: 'Flip the Table',
    nameAr: 'اقلب الترابيزة',
    value: 0,
    isHalf: true,
    description: 'Peek at top 5 cards and rearrange them.',
  },
  this_is_on_you: {
    id: 'this_is_on_you',
    nameEn: 'This is on You',
    nameAr: 'البس أنت',
    value: 0,
    isHalf: true,
    description: 'Force an opponent to draw the top card.',
  },
  mummified: {
    id: 'mummified',
    nameEn: "You're Mummified",
    nameAr: 'هتتحنط هنا',
    value: 0,
    isHalf: false,
    description: 'If drawn without defuse, you are eliminated!',
  },
};

// Game State Types
export type GamePhase = 'waiting' | 'playing' | 'game_over';

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  cardCount: number; // Only count shown to others
  isReady: boolean;
  isHost: boolean;
}

export interface PlayerHand {
  playerId: string;
  cards: CardInstance[];
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  turnsRemaining: number;
  deckCount: number;
  discardPile: CardId[]; // Only shows card types, not instances
  winnerId: string | null;
}

// Room Types
export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gameState: GameState | null;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPlaying: boolean;
}

// Socket Event Types
export interface ServerToClientEvents {
  // Lobby events
  roomList: (rooms: RoomInfo[]) => void;
  roomJoined: (room: Room) => void;
  roomUpdated: (room: Room) => void;
  roomLeft: () => void;
  error: (message: string) => void;

  // Game events
  gameStarted: (state: GameState, hand: CardInstance[]) => void;
  gameStateUpdated: (state: GameState) => void;
  handUpdated: (hand: CardInstance[]) => void;
  
  // Card action events
  cardPlayed: (playerId: string, cardId: CardId, targetId?: string) => void;
  peekCards: (cards: CardInstance[]) => void;
  duelResult: (challenger: { playerId: string; card: CardInstance }, opponent: { playerId: string; card: CardInstance }, winnerId: string) => void;
  spellboundResult: (success: boolean, cardId?: CardId) => void;
  blindStealStart: (thiefId: string, victimId: string, cardCount: number) => void;
  arrangeHandPrompt: (thiefId: string) => void;
  viewHand: (targetId: string, cards: CardInstance[]) => void;
  flipTableCards: (cards: CardInstance[]) => void;
  swapResult: (youGave: CardInstance, youReceived: CardInstance, otherPlayerName: string) => void;
  
  // King Ra events
  /**
   * New: Accepts an object for context-rich modal (actor, card, target, timeout)
   * Old: Accepts (playerId, cardPlayed, timeout) for backward compatibility
   */
  kingRaPrompt: (
    payload:
      | { actorId: string; actorName?: string; cardPlayed: CardId; targetId?: string; targetName?: string; timeout: number }
      | string, // playerId (legacy)
    cardPlayed?: CardId, // legacy
    timeout?: number // legacy
  ) => void;
  kingRaResponse: (responderId: string, didCancel: boolean) => void;
  actionPending: (cardId: CardId, timeout: number) => void;
  actionResolved: (cardId: CardId) => void;
  actionCancelled: (cardId: CardId, cancelCount: number) => void;
  
  // Mummy events
  mummyDrawn: (playerId: string) => void;
  mummyDefused: (playerId: string) => void;
  placeMummyPrompt: (deckSize: number) => void;
  playerEliminated: (playerId: string) => void;
  
  // Turn events
  turnStarted: (playerId: string, turnsRemaining: number) => void;
  turnEnded: (playerId: string) => void;
  
  // Game end
  gameOver: (winnerId: string, winnerName: string) => void;
  
  // Notifications
  notification: (message: string, type: 'info' | 'warning' | 'success' | 'danger') => void;
}

export interface ClientToServerEvents {
  // Lobby events
  createRoom: (playerName: string, roomName: string) => void;
  joinRoom: (playerName: string, roomId: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  getRooms: () => void;

  // Game actions
  playCard: (cardInstanceId: string, targetPlayerId?: string, additionalData?: any) => void;
  drawCard: () => void;
  
  // Card-specific actions
  spellboundRequest: (targetId: string, requestedCardId: CardId) => void;
  blindStealSelect: (position: number) => void;
  arrangeHand: (newOrder: string[]) => void; // Array of instanceIds
  burnCard: (cardInstanceId: string) => void;
  rearrangeTopCards: (newOrder: string[]) => void; // For flip the table
  placeMummy: (position: number) => void;
  
  // King Ra response
  kingRaResponse: (useKingRa: boolean) => void;
}

// Action types for game logic
export type GameAction =
  | { type: 'PLAY_CARD'; playerId: string; cardInstanceId: string; targetId?: string; additionalData?: any }
  | { type: 'DRAW_CARD'; playerId: string }
  | { type: 'KING_RA_RESPONSE'; playerId: string; useKingRa: boolean }
  | { type: 'PLACE_MUMMY'; playerId: string; position: number }
  | { type: 'BLIND_STEAL_SELECT'; playerId: string; position: number }
  | { type: 'ARRANGE_HAND'; playerId: string; newOrder: string[] }
  | { type: 'BURN_CARD'; playerId: string; cardInstanceId: string }
  | { type: 'REARRANGE_TOP_CARDS'; playerId: string; newOrder: string[] }
  | { type: 'SPELLBOUND_REQUEST'; playerId: string; targetId: string; requestedCardId: CardId };

// Pending action for King Ra reactions
export interface PendingAction {
  action: GameAction;
  cardPlayed: CardId;
  playerId: string;
  targetId?: string;
  kingRaResponses: Map<string, boolean>; // playerId -> hasResponded
  kingRaCount: number; // Number of King Ra cards played
  timeoutAt: number;
  waitingForArrange?: boolean; // For Criminal Mummy - waiting for victim to arrange hand
}

// Asset mapping for cards
export const CARD_ASSETS: Record<CardId, string> = {
  sharp_eye: 'card_sharp_eye.png',
  wait_a_sec: 'card_wait_a_sec.png',
  me_or_you: 'card_me_or_you.png.png', // Note: file has double extension
  spellbound: 'card_spellbound.png',
  criminal_mummy: 'card_criminal_mummy.png',
  give_and_take: 'card_give_and_take.png',
  shuffle_it: 'card_shuffle_it.png',
  king_ra_says_no: 'card_king_ra_says_no.png',
  safe_travels: 'card_safe_travels.png',
  take_a_lap: 'card_take_a_lap.png',
  all_or_nothing: 'card_all_or_nothing.png',
  flip_the_table: 'card_flip_the_table.png',
  this_is_on_you: 'card_this_is_on_you.png',
  mummified: 'card_mummy.png',
};

export const CARD_BACK_ASSET = 'card_back.png';
