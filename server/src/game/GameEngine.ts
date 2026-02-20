import { v4 as uuidv4 } from 'uuid';
import type {
  CardId,
  CardInstance,
  Player,
  GameState,
  PlayerHand,
  CARD_DATABASE,
  PendingAction,
} from '../../../shared/types.js';
import { CARD_DATABASE as CardDB } from '../../../shared/types.js';

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper to create card instances
function createCardInstances(cardId: CardId, count: number): CardInstance[] {
  return Array.from({ length: count }, () => ({
    instanceId: uuidv4(),
    cardId,
  }));
}

export class GameEngine {
  private deck: CardInstance[] = [];
  private discardPile: CardInstance[] = [];
  private playerHands: Map<string, CardInstance[]> = new Map();
  private players: Player[] = [];
  private currentPlayerIndex: number = 0;
  private turnsRemaining: number = 1;
  private phase: 'waiting' | 'playing' | 'game_over' = 'waiting';
  private winnerId: string | null = null;
  
  // Pending action for King Ra reactions
  public pendingAction: PendingAction | null = null;
  
  // Callbacks for socket events
  public onStateChange?: (state: GameState) => void;
  public onHandChange?: (playerId: string, hand: CardInstance[]) => void;
  public onNotification?: (playerId: string | null, message: string, type: 'info' | 'warning' | 'success' | 'danger') => void;

  constructor(players: Player[]) {
    this.players = players.map(p => ({ ...p, isAlive: true, cardCount: 0 }));
  }

  // Initialize the game
  initializeGame(): void {
    const playerCount = this.players.length;
    
    // Create the deck based on player count
    this.deck = [];
    
    // Add N copies of each normal card
    const normalCards: CardId[] = [
      'sharp_eye', 'wait_a_sec', 'me_or_you', 'spellbound',
      'criminal_mummy', 'shuffle_it', 'king_ra_says_no', 'safe_travels'
    ];
    
    for (const cardId of normalCards) {
      this.deck.push(...createCardInstances(cardId, playerCount));
    }
    
    // Add N copies of each half card
    const halfCards: CardId[] = [
      'give_and_take', 'all_or_nothing', 'flip_the_table', 'this_is_on_you'
    ];
    
    for (const cardId of halfCards) {
      this.deck.push(...createCardInstances(cardId, playerCount));
    }
    
    // Add Take a Lap cards: N+1 total (N distributed, 1 in deck)
    const defuseCards = createCardInstances('take_a_lap', playerCount + 1);
    
    // Add Mummy cards: N-1
    const mummyCards = createCardInstances('mummified', playerCount - 1);
    
    // Shuffle deck (without defuse and mummy for now)
    this.deck = shuffleArray(this.deck);
    
    // Distribute starting hands
    for (const player of this.players) {
      const hand: CardInstance[] = [];
      
      // Give 1 defuse card
      hand.push(defuseCards.pop()!);
      
      // Give 4 random cards from deck (non-mummy, non-defuse)
      for (let i = 0; i < 4 && this.deck.length > 0; i++) {
        hand.push(this.deck.pop()!);
      }
      
      this.playerHands.set(player.id, shuffleArray(hand));
      player.cardCount = hand.length;
    }
    
    // Add remaining defuse card to deck
    if (defuseCards.length > 0) {
      this.deck.push(...defuseCards);
    }
    
    // Add mummy cards to deck
    this.deck.push(...mummyCards);
    
    // Final shuffle
    this.deck = shuffleArray(this.deck);
    
    // Start the game
    this.phase = 'playing';
    this.currentPlayerIndex = 0;
    this.turnsRemaining = 1;
  }

  // Get current game state (public info only)
  getGameState(): GameState {
    return {
      phase: this.phase,
      players: this.players.map(p => ({
        ...p,
        cardCount: this.playerHands.get(p.id)?.length ?? 0,
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      turnsRemaining: this.turnsRemaining,
      deckCount: this.deck.length,
      discardPile: this.discardPile.map(c => c.cardId),
      winnerId: this.winnerId,
    };
  }

  // Get a player's hand
  getPlayerHand(playerId: string): CardInstance[] {
    return this.playerHands.get(playerId) ?? [];
  }

  // Get current player
  getCurrentPlayer(): Player | null {
    return this.players[this.currentPlayerIndex] ?? null;
  }

  // Check if it's a player's turn
  isPlayerTurn(playerId: string): boolean {
    const current = this.getCurrentPlayer();
    return current?.id === playerId && this.phase === 'playing';
  }

  // Check if player has card
  hasCard(playerId: string, cardId: CardId): boolean {
    const hand = this.playerHands.get(playerId);
    return hand?.some(c => c.cardId === cardId) ?? false;
  }

  // Count cards of type in hand
  countCards(playerId: string, cardId: CardId): number {
    const hand = this.playerHands.get(playerId);
    return hand?.filter(c => c.cardId === cardId).length ?? 0;
  }

  // Find card instance in hand
  findCardInstance(playerId: string, instanceId: string): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    return hand?.find(c => c.instanceId === instanceId) ?? null;
  }

  // Remove card from hand
  removeCardFromHand(playerId: string, instanceId: string): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    if (!hand) return null;
    
    const index = hand.findIndex(c => c.instanceId === instanceId);
    if (index === -1) return null;
    
    const [card] = hand.splice(index, 1);
    this.updatePlayerCardCount(playerId);
    return card;
  }

  // Add card to hand
  addCardToHand(playerId: string, card: CardInstance): void {
    const hand = this.playerHands.get(playerId);
    if (hand) {
      hand.push(card);
      this.updatePlayerCardCount(playerId);
    }
  }

  // Update player card count
  private updatePlayerCardCount(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.cardCount = this.playerHands.get(playerId)?.length ?? 0;
    }
  }

  // Discard card
  discardCard(card: CardInstance): void {
    this.discardPile.push(card);
  }

  // Draw top card from deck
  drawTopCard(): CardInstance | null {
    return this.deck.pop() ?? null;
  }

  // Peek at top N cards
  peekTopCards(count: number): CardInstance[] {
    const startIndex = Math.max(0, this.deck.length - count);
    return this.deck.slice(startIndex).reverse(); // Top card first
  }

  // Insert card at position in deck (0 = top)
  insertCardInDeck(card: CardInstance, position: number): void {
    const actualPosition = this.deck.length - position;
    this.deck.splice(Math.max(0, actualPosition), 0, card);
  }

  // Rearrange top N cards
  rearrangeTopCards(newOrder: string[]): void {
    const count = newOrder.length;
    const topCards = this.deck.splice(-count);
    
    // Sort by new order
    const orderedCards = newOrder.map(instanceId => 
      topCards.find(c => c.instanceId === instanceId)!
    ).filter(Boolean);
    
    // Put back in reverse (so first in array is on top)
    this.deck.push(...orderedCards.reverse());
  }

  // Shuffle deck
  shuffleDeck(): void {
    this.deck = shuffleArray(this.deck);
  }

  // Get deck size
  getDeckSize(): number {
    return this.deck.length;
  }

  // End current turn
  endTurn(skipDraw: boolean = false): void {
    this.turnsRemaining--;
    
    if (this.turnsRemaining <= 0) {
      this.moveToNextPlayer();
    }
  }

  // Move to next alive player
  private moveToNextPlayer(): void {
    const alivePlayers = this.players.filter(p => p.isAlive);
    
    if (alivePlayers.length <= 1) {
      this.endGame(alivePlayers[0]?.id ?? null);
      return;
    }
    
    // Find next alive player
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (!this.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    
    this.currentPlayerIndex = nextIndex;
    this.turnsRemaining = 1;
  }

  // Set turns remaining (for Safe Travels)
  setNextPlayerTurns(turns: number): void {
    // Find next player
    const alivePlayers = this.players.filter(p => p.isAlive);
    if (alivePlayers.length <= 1) return;
    
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (!this.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    
    this.currentPlayerIndex = nextIndex;
    this.turnsRemaining = turns;
  }

  // Eliminate player
  eliminatePlayer(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    
    player.isAlive = false;
    
    // Discard their hand
    const hand = this.playerHands.get(playerId) ?? [];
    for (const card of hand) {
      this.discardCard(card);
    }
    this.playerHands.set(playerId, []);
    player.cardCount = 0;
    
    // Check win condition
    const alivePlayers = this.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1) {
      this.endGame(alivePlayers[0].id);
    } else if (this.getCurrentPlayer()?.id === playerId) {
      // If eliminated player was current, move to next
      this.moveToNextPlayer();
    }
  }

  // End game
  private endGame(winnerId: string | null): void {
    this.phase = 'game_over';
    this.winnerId = winnerId;
  }

  // Check if player can use Take a Lap (defuse)
  canDefuse(playerId: string): boolean {
    return this.hasCard(playerId, 'take_a_lap');
  }

  // Use defuse card
  useDefuse(playerId: string): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    if (!hand) return null;
    
    const defuseIndex = hand.findIndex(c => c.cardId === 'take_a_lap');
    if (defuseIndex === -1) return null;
    
    const [defuseCard] = hand.splice(defuseIndex, 1);
    this.discardCard(defuseCard);
    this.updatePlayerCardCount(playerId);
    
    return defuseCard;
  }

  // Get alive players except one
  getOtherAlivePlayers(excludeId: string): Player[] {
    return this.players.filter(p => p.isAlive && p.id !== excludeId);
  }

  // Get player by ID
  getPlayer(playerId: string): Player | null {
    return this.players.find(p => p.id === playerId) ?? null;
  }

  // Find lowest value card in hand (excluding defuse and mummy)
  getLowestValueCard(playerId: string): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    if (!hand || hand.length === 0) return null;
    
    const playableCards = hand.filter(c => 
      c.cardId !== 'take_a_lap' && c.cardId !== 'mummified'
    );
    
    if (playableCards.length === 0) return null;
    
    return playableCards.reduce((lowest, card) => {
      const lowestValue = CardDB[lowest.cardId].value;
      const cardValue = CardDB[card.cardId].value;
      return cardValue < lowestValue ? card : lowest;
    });
  }

  // Find highest value card in hand (excluding mummy)
  getHighestValueCard(playerId: string): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    if (!hand || hand.length === 0) return null;
    
    const playableCards = hand.filter(c => c.cardId !== 'mummified');
    
    if (playableCards.length === 0) return null;
    
    return playableCards.reduce((highest, card) => {
      const highestValue = CardDB[highest.cardId].value;
      const cardValue = CardDB[card.cardId].value;
      return cardValue > highestValue ? card : highest;
    });
  }

  // Get random card from hand (for blind steal)
  getRandomCard(playerId: string, position: number): CardInstance | null {
    const hand = this.playerHands.get(playerId);
    if (!hand || position < 0 || position >= hand.length) return null;
    return hand[position];
  }

  // Rearrange player's hand
  rearrangeHand(playerId: string, newOrder: string[]): void {
    const hand = this.playerHands.get(playerId);
    if (!hand) return;
    
    const newHand = newOrder
      .map(instanceId => hand.find(c => c.instanceId === instanceId))
      .filter((c): c is CardInstance => c !== undefined);
    
    this.playerHands.set(playerId, newHand);
  }

  // Check if game is over
  isGameOver(): boolean {
    return this.phase === 'game_over';
  }

  // Get players with King Ra card (excluding one player)
  getPlayersWithKingRa(excludeId: string): string[] {
    return this.players
      .filter(p => p.isAlive && p.id !== excludeId && this.hasCard(p.id, 'king_ra_says_no'))
      .map(p => p.id);
  }
}
