import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  CardId,
  CardInstance,
  PendingAction,
} from '@shared/types.js';
import { CARD_DATABASE } from '@shared/types.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

const KING_RA_TIMEOUT = 5000; // 5 seconds for reactions

export function setupSocketHandlers(
  io: GameServer,
  socket: GameSocket,
  roomManager: RoomManager
): void {
    // Host kicks a player before game starts
    socket.on('kickPlayer', (targetPlayerId: string) => {
      // Only host can kick, and only before game starts
      const room = roomManager.kickPlayer(socket.id, targetPlayerId);
      if (!room) {
        socket.emit('error', 'Failed to remove player. Only host can kick before game starts.');
        return;
      }
      // Notify kicked player
      io.to(targetPlayerId).emit('roomLeft');
      // Notify all in room
      io.to(room.id).emit('roomUpdated', {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        players: room.players,
        maxPlayers: room.maxPlayers,
        gameState: room.gameState,
      });
      io.emit('roomList', roomManager.getRoomList());
    });
  // ============ LOBBY HANDLERS ============
  
  socket.on('getRooms', () => {
    socket.emit('roomList', roomManager.getRoomList());
  });

  socket.on('createRoom', (playerName: string, roomName: string) => {
    const room = roomManager.createRoom(socket.id, playerName, roomName);
    socket.join(room.id);
    socket.emit('roomJoined', {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
    });
    io.emit('roomList', roomManager.getRoomList());
  });

  socket.on('joinRoom', (playerName: string, roomId: string) => {
    const room = roomManager.joinRoom(socket.id, playerName, roomId);
    if (!room) {
      socket.emit('error', 'Could not join room. Room may be full or in progress.');
      return;
    }
    
    socket.join(room.id);
    socket.emit('roomJoined', {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
    });
    
    io.to(room.id).emit('roomUpdated', {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
    });
    
    io.emit('roomList', roomManager.getRoomList());
  });

  socket.on('leaveRoom', () => {
    const { room, wasHost } = roomManager.leaveRoom(socket.id);
    socket.emit('roomLeft');
    
    if (room) {
      io.to(room.id).emit('roomUpdated', {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        players: room.players,
        maxPlayers: room.maxPlayers,
        gameState: room.gameState,
      });
    }
    
    io.emit('roomList', roomManager.getRoomList());
  });

  socket.on('setReady', (ready: boolean) => {
    const room = roomManager.setPlayerReady(socket.id, ready);
    if (room) {
      io.to(room.id).emit('roomUpdated', {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        players: room.players,
        maxPlayers: room.maxPlayers,
        gameState: room.gameState,
      });
    }
  });

  socket.on('startGame', () => {
    const playerRoom = roomManager.getPlayerRoom(socket.id);
    if (!playerRoom || playerRoom.hostId !== socket.id) {
      socket.emit('error', 'Only the host can start the game.');
      return;
    }
    
    if (playerRoom.players.length < 2) {
      socket.emit('error', 'Need at least 2 players to start.');
      return;
    }
    
    const room = roomManager.startGame(playerRoom.id);
    if (!room || !room.game || !room.gameState) {
      socket.emit('error', 'Could not start game.');
      return;
    }
    
    // Send game started to all players with their hands
    for (const player of room.players) {
      const hand = room.game.getPlayerHand(player.id);
      io.to(player.id).emit('gameStarted', room.gameState, hand);
    }
    
    // Notify whose turn it is
    const currentPlayer = room.game.getCurrentPlayer();
    if (currentPlayer) {
      io.to(room.id).emit('turnStarted', currentPlayer.id, room.gameState.turnsRemaining);
    }
    
    io.emit('roomList', roomManager.getRoomList());
  });

  // ============ GAME ACTION HANDLERS ============

  socket.on('playCard', async (cardInstanceId: string, targetPlayerId?: string, additionalData?: any) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    
    // Verify it's player's turn
    if (!game.isPlayerTurn(socket.id)) {
      socket.emit('error', "It's not your turn!");
      return;
    }
    
    // Find the card
    const card = game.findCardInstance(socket.id, cardInstanceId);
    if (!card) {
      socket.emit('error', 'Card not found in your hand.');
      return;
    }
    
    const cardDef = CARD_DATABASE[card.cardId];
    
    // Check for half cards - need 2 copies
    if (cardDef.isHalf) {
      const count = game.countCards(socket.id, card.cardId);
      if (count < 2) {
        socket.emit('error', 'Half cards require 2 copies to play!');
        return;
      }
    }
    
    // King Ra cannot be played during your turn
    if (card.cardId === 'king_ra_says_no') {
      socket.emit('error', 'King Ra Says NO can only be played reactively!');
      return;
    }
    
    // Take a Lap cannot be played manually
    if (card.cardId === 'take_a_lap') {
      socket.emit('error', 'Take a Lap is used automatically when drawing a mummy!');
      return;
    }
    
    // Remove and discard the card(s)
    game.removeCardFromHand(socket.id, cardInstanceId);
    game.discardCard(card);
    // Immediately update game state so discard pile reflects any card played
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
    
    // For half cards, remove second copy
    let secondCard: CardInstance | null = null;
    if (cardDef.isHalf) {
      const hand = game.getPlayerHand(socket.id);
      const secondInstance = hand.find(c => c.cardId === card.cardId);
      if (secondInstance) {
        secondCard = game.removeCardFromHand(socket.id, secondInstance.instanceId);
        if (secondCard) game.discardCard(secondCard);
      }
    }
    
    // IMMEDIATELY update the player's hand in UI
    socket.emit('handUpdated', game.getPlayerHand(socket.id));
    
    // Update game state for all players
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
    
    // Notify all players about the card played
    io.to(room.id).emit('cardPlayed', socket.id, card.cardId, targetPlayerId);
    
    // Cards that cannot be cancelled by King Ra (self-affecting or neutral)
    const nonCancellableCards = [
      'shuffle_it',    // Just shuffles deck
      'sharp_eye',     // Just peeks at cards
      'wait_a_sec',    // Just skips drawing
      'flip_the_table' // Rearranges deck
    ];
    
    // For cancellable cards, show reaction window to ALL players
    if (!nonCancellableCards.includes(card.cardId)) {
      // Get all other alive players
      const otherPlayers = game.getOtherAlivePlayers(socket.id);
      
      if (otherPlayers.length > 0) {
        // Set up pending action
        game.pendingAction = {
          action: { type: 'PLAY_CARD', playerId: socket.id, cardInstanceId, targetId: targetPlayerId, additionalData },
          cardPlayed: card.cardId,
          playerId: socket.id,
          targetId: targetPlayerId,
          kingRaResponses: new Map(),
          kingRaCount: 0,
          timeoutAt: Date.now() + KING_RA_TIMEOUT,
        };
        
        // Notify the player that their action is pending reactions
        socket.emit('actionPending', card.cardId, KING_RA_TIMEOUT);
        
        // Send reaction window to ALL other players (they'll auto-decline if no King Ra)
        for (const player of otherPlayers) {
          // Send actor and target info for King Ra modal context
          const actor = room.players.find(p => p.id === socket.id);
          const target = room.players.find(p => p.id === targetPlayerId);
          io.to(player.id).emit('kingRaPrompt', {
            actorId: socket.id,
            actorName: actor?.name ?? 'Unknown',
            cardPlayed: card.cardId,
            targetId: targetPlayerId,
            targetName: target?.name ?? (targetPlayerId ? 'Unknown' : undefined),
            timeout: KING_RA_TIMEOUT
          });
        }
        
        // Set timeout
        setTimeout(() => {
          if (game.pendingAction && game.pendingAction.cardPlayed === card.cardId) {
            resolvePendingAction(io, room.id, game, roomManager);
          }
        }, KING_RA_TIMEOUT);
        
        return;
      }
    }
    
    // Execute card effect immediately ONLY for non-cancellable cards or if there are no other players
    if (nonCancellableCards.includes(card.cardId) || game.getOtherAlivePlayers(socket.id).length === 0) {
      await executeCardEffect(io, socket, room.id, game, card.cardId, targetPlayerId, additionalData, roomManager);
    }
  });

  socket.on('kingRaResponse', (useKingRa: boolean) => {
    console.log('kingRaResponse received:', { socketId: socket.id, useKingRa });
    
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game?.pendingAction) {
      console.log('No pending action found');
      return;
    }
    
    const game = room.game;
    const pending = game.pendingAction;
    
    // Check if pending action exists
    if (!pending) {
      console.log('Pending is null');
      return;
    }
    
    console.log('Pending action:', { cardPlayed: pending.cardPlayed, kingRaCount: pending.kingRaCount });
    
    // Record response
    pending.kingRaResponses.set(socket.id, true);
    
    const hasKingRaCard = game.hasCard(socket.id, 'king_ra_says_no');
    console.log('Player has King Ra card:', hasKingRaCard);
    
    if (useKingRa && hasKingRaCard) {
      console.log('Using King Ra card!');
      // Use King Ra
      const hand = game.getPlayerHand(socket.id);
      const kingRaCard = hand.find(c => c.cardId === 'king_ra_says_no');
      if (kingRaCard) {
        console.log('Found King Ra card, removing it');
        game.removeCardFromHand(socket.id, kingRaCard.instanceId);
        game.discardCard(kingRaCard);
        pending.kingRaCount++;
        // Immediately update game state so discard pile reflects King Ra
        io.to(room.id).emit('gameStateUpdated', game.getGameState());
        
        console.log('Emitting kingRaResponse');
        io.to(room.id).emit('kingRaResponse', socket.id, true);
        io.to(socket.id).emit('handUpdated', game.getPlayerHand(socket.id));
        
        // Check for chain reactions - allow countering the King Ra
        const otherPlayersWithKingRa = game.getPlayersWithKingRa(socket.id)
          .filter((id: string) => !pending.kingRaResponses.has(id));
        
        if (otherPlayersWithKingRa.length > 0) {
          // Reset timeout and ask others who can counter
          pending.timeoutAt = Date.now() + KING_RA_TIMEOUT;
          pending.kingRaResponses.clear(); // Clear responses for the new round
          
          for (const playerId of otherPlayersWithKingRa) {
            // Chain King Ra: actor is the player who just played King Ra, card is always king_ra_says_no
            const actor = room.players.find(p => p.id === socket.id);
            io.to(playerId).emit('kingRaPrompt', {
              actorId: socket.id,
              actorName: actor?.name ?? 'Unknown',
              cardPlayed: 'king_ra_says_no',
              targetId: undefined,
              targetName: undefined,
              timeout: KING_RA_TIMEOUT
            });
          }
          
          setTimeout(() => {
            if (game.pendingAction === pending) {
              resolvePendingAction(io, room.id, game, roomManager);
            }
          }, KING_RA_TIMEOUT);
          
          return;
        } else {
          // No one can counter - resolve immediately
          resolvePendingAction(io, room.id, game, roomManager);
        }
      }
    }
    // For declines, just let the timeout handle resolution
    // Don't resolve early - wait for the full 5 seconds so others can decide
  });

  socket.on('drawCard', async () => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    
    if (!game.isPlayerTurn(socket.id)) {
      socket.emit('error', "It's not your turn!");
      return;
    }
    
    // Block drawing while waiting for arrange or other pending actions
    if (game.pendingAction?.waitingForArrange) {
      socket.emit('error', 'Please wait for card arrangement to complete!');
      return;
    }
    
    await handleDrawCard(io, socket, room.id, game, roomManager);
  });

  socket.on('placeMummy', (position: number) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    
    // Create mummy card and insert
    const mummyCard: CardInstance = {
      instanceId: `mummy_${Date.now()}`,
      cardId: 'mummified',
    };
    
    game.insertCardInDeck(mummyCard, position);
    
    // End turn
    game.endTurn();
    roomManager.updateGameState(room.id);
    
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
    
    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer) {
      io.to(room.id).emit('turnStarted', currentPlayer.id, game.getGameState().turnsRemaining);
    }
  });

  socket.on('spellboundRequest', (targetId: string, requestedCardId: CardId) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    const game = room.game;
    // If there is a pending King Ra window for Spellbound, ignore/queue the request
    if (game.pendingAction && game.pendingAction.cardPlayed === 'spellbound') {
      // Optionally, you could queue this request and process it after King Ra resolves
      socket.emit('error', 'Please wait for King Ra reaction to resolve before Spellbound request.');
      return;
    }
    // ...existing code...
    // Check if target has the card
    if (game.hasCard(targetId, requestedCardId)) {
      // Success - take one copy
      const targetHand = game.getPlayerHand(targetId);
      const cardToTake = targetHand.find(c => c.cardId === requestedCardId);
      if (cardToTake) {
        game.removeCardFromHand(targetId, cardToTake.instanceId);
        game.addCardToHand(socket.id, cardToTake);
        socket.emit('spellboundResult', true, requestedCardId);
        io.to(socket.id).emit('handUpdated', game.getPlayerHand(socket.id));
        io.to(targetId).emit('handUpdated', game.getPlayerHand(targetId));
      }
    } else {
      // Failure - asker draws as penalty
      socket.emit('spellboundResult', false);
      handleDrawCard(io, socket, room.id, game, roomManager, true);
    }
    roomManager.updateGameState(room.id);
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
  });

  socket.on('blindStealSelect', (position: number) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    const pending = game.pendingAction;
    
    if (!pending || pending.action.type !== 'PLAY_CARD') return;
    
    const targetId = pending.targetId;
    if (!targetId) return;
    
    const stolenCard = game.getRandomCard(targetId, position);
    if (stolenCard) {
      game.removeCardFromHand(targetId, stolenCard.instanceId);
      game.addCardToHand(socket.id, stolenCard);
      
      io.to(socket.id).emit('handUpdated', game.getPlayerHand(socket.id));
      io.to(targetId).emit('handUpdated', game.getPlayerHand(targetId));
    }
    
    game.pendingAction = null;
    roomManager.updateGameState(room.id);
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
  });

  socket.on('arrangeHand', (newOrder: string[]) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    game.rearrangeHand(socket.id, newOrder);
    io.to(socket.id).emit('handUpdated', game.getPlayerHand(socket.id));
    
    // If this was for criminal_mummy, notify the thief they can now pick
    if (game.pendingAction?.waitingForArrange && game.pendingAction?.cardPlayed === 'criminal_mummy') {
      game.pendingAction.waitingForArrange = false;
      const thiefId = game.pendingAction.playerId;
      const currentHand = game.getPlayerHand(socket.id);
      io.to(thiefId).emit('blindStealStart', thiefId, socket.id, currentHand.length);
    }
  });

  socket.on('burnCard', (cardInstanceId: string) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    const game = room.game;
    const pending = game.pendingAction;
    
    if (!pending || pending.action.type !== 'PLAY_CARD') return;
    
    const targetId = pending.targetId;
    if (!targetId) return;
    
    const card = game.removeCardFromHand(targetId, cardInstanceId);
    if (card) {
      game.discardCard(card);
      
      io.to(targetId).emit('handUpdated', game.getPlayerHand(targetId));
    }
    
    game.pendingAction = null;
    roomManager.updateGameState(room.id);
    io.to(room.id).emit('gameStateUpdated', game.getGameState());
  });

  socket.on('rearrangeTopCards', (newOrder: string[]) => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (!room?.game) return;
    
    room.game.rearrangeTopCards(newOrder);
    room.game.pendingAction = null;
    
    roomManager.updateGameState(room.id);
    io.to(room.id).emit('gameStateUpdated', room.game.getGameState());
  });
}

// ============ HELPER FUNCTIONS ============

async function handleDrawCard(
  io: GameServer,
  socket: GameSocket,
  roomId: string,
  game: any,
  roomManager: RoomManager,
  isPenalty: boolean = false
): Promise<void> {
  const card = game.drawTopCard();
  if (!card) {
    socket.emit('error', 'Deck is empty!');
    return;
  }
  
  if (card.cardId === 'mummified') {
    // Mummy drawn!
    io.to(roomId).emit('mummyDrawn', socket.id);
    
    if (game.canDefuse(socket.id)) {
      // Use defuse
      game.useDefuse(socket.id);
      io.to(roomId).emit('mummyDefused', socket.id);
      
      socket.emit('handUpdated', game.getPlayerHand(socket.id));
      
      // Place mummy back at random position
      const mummyCard: CardInstance = {
        instanceId: `mummy_${Date.now()}`,
        cardId: 'mummified',
      };
      const randomPosition = Math.floor(Math.random() * (game.getDeckSize() + 1));
      game.insertCardInDeck(mummyCard, randomPosition);
      
      // End turn
      game.endTurn();
      roomManager.updateGameState(roomId);
      io.to(roomId).emit('gameStateUpdated', game.getGameState());
      
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer) {
        io.to(roomId).emit('turnStarted', currentPlayer.id, game.getGameState().turnsRemaining);
      }
    } else {
      // Eliminated!
      game.eliminatePlayer(socket.id);
      
      io.to(roomId).emit('playerEliminated', socket.id);
      
      roomManager.updateGameState(roomId);
      const gameState = game.getGameState();
      io.to(roomId).emit('gameStateUpdated', gameState);
      
      if (gameState.phase === 'game_over' && gameState.winnerId) {
        const winner = game.getPlayer(gameState.winnerId);
        io.to(roomId).emit('gameOver', gameState.winnerId, winner?.name ?? 'Unknown');
      } else {
        const currentPlayer = game.getCurrentPlayer();
        if (currentPlayer) {
          io.to(roomId).emit('turnStarted', currentPlayer.id, gameState.turnsRemaining);
        }
      }
    }
  } else {
    // Normal card
    game.addCardToHand(socket.id, card);
    socket.emit('handUpdated', game.getPlayerHand(socket.id));
    
    if (!isPenalty) {
      // End turn
      game.endTurn();
    }
    
    roomManager.updateGameState(roomId);
    io.to(roomId).emit('gameStateUpdated', game.getGameState());
    
    if (!isPenalty) {
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer) {
        io.to(roomId).emit('turnStarted', currentPlayer.id, game.getGameState().turnsRemaining);
      }
    }
  }
}

function resolvePendingAction(
  io: GameServer,
  roomId: string,
  game: any,
  roomManager: RoomManager
): void {
  const pending = game.pendingAction;
  if (!pending) {
    console.log('resolvePendingAction: No pending action');
    return;
  }
  
  const cancelled = pending.kingRaCount % 2 === 1;
  const cardId = pending.cardPlayed as keyof typeof CARD_DATABASE;
  
  console.log('resolvePendingAction:', { cancelled, kingRaCount: pending.kingRaCount, cardId });
  
  if (cancelled) {
    console.log('ACTION CANCELLED - King Ra count odd');
    io.to(roomId).emit('actionCancelled', pending.cardPlayed, pending.kingRaCount);
    game.pendingAction = null;
  } else {
    // Notify all players that reaction window is over and action proceeds
    io.to(roomId).emit('actionResolved', pending.cardPlayed);
    
    // Clear pendingAction BEFORE executing so card effects can set up their own
    game.pendingAction = null;
    
    // Execute the original action
    const playerSocket = io.sockets.sockets.get(pending.playerId);
    if (playerSocket) {
      executeCardEffect(
        io,
        playerSocket as GameSocket,
        roomId,
        game,
        pending.cardPlayed,
        pending.targetId,
        pending.action.type === 'PLAY_CARD' ? pending.action.additionalData : undefined,
        roomManager
      );
    }
  }
}

async function executeCardEffect(
  io: GameServer,
  socket: GameSocket,
  roomId: string,
  game: any,
  cardId: CardId,
  targetId?: string,
  additionalData?: any,
  roomManager?: RoomManager
): Promise<void> {
  const playerId = socket.id;
  
  switch (cardId) {
    case 'sharp_eye': {
      // Peek at top 3 cards
      const topCards = game.peekTopCards(3);
      socket.emit('peekCards', topCards);
      break;
    }
    
    case 'wait_a_sec': {
      // End turn without drawing
      game.endTurn();
      roomManager?.updateGameState(roomId);
      io.to(roomId).emit('gameStateUpdated', game.getGameState());
      
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer) {
        io.to(roomId).emit('turnStarted', currentPlayer.id, game.getGameState().turnsRemaining);
      }
      break;
    }
    
    case 'me_or_you': {
      // Duel
      if (!targetId) {
        socket.emit('error', 'Must select an opponent for duel!');
        return;
      }
      
      const card1 = game.drawTopCard();
      const card2 = game.drawTopCard();
      
      if (!card1 || !card2) {
        socket.emit('error', 'Not enough cards in deck for duel!');
        return;
      }
      
      const value1 = CARD_DATABASE[card1.cardId as keyof typeof CARD_DATABASE].value;
      const value2 = CARD_DATABASE[card2.cardId as keyof typeof CARD_DATABASE].value;
      
      let winnerId: string;
      
      if (value1 > value2) {
        winnerId = playerId;
        game.addCardToHand(playerId, card1);
        game.addCardToHand(playerId, card2);
      } else if (value2 > value1) {
        winnerId = targetId;
        game.addCardToHand(targetId, card1);
        game.addCardToHand(targetId, card2);
      } else {
        // Tie - shuffle back and try again
        game.insertCardInDeck(card1, Math.floor(Math.random() * game.getDeckSize()));
        game.insertCardInDeck(card2, Math.floor(Math.random() * game.getDeckSize()));
        game.shuffleDeck();
        break;
      }
      
      // Only show duel cards to the two players involved
      io.to(playerId).emit('duelResult', 
        { playerId, card: card1 },
        { playerId: targetId, card: card2 },
        winnerId
      );
      io.to(targetId).emit('duelResult', 
        { playerId, card: card1 },
        { playerId: targetId, card: card2 },
        winnerId
      );
      
      // Check if winner got a mummy
      const wonCards = winnerId === playerId ? [card1, card2] : [card1, card2];
      for (const wonCard of wonCards) {
        if (wonCard.cardId === 'mummified') {
          io.to(roomId).emit('mummyDrawn', winnerId);
          
          if (game.canDefuse(winnerId)) {
            game.useDefuse(winnerId);
            io.to(roomId).emit('mummyDefused', winnerId);
            game.removeCardFromHand(winnerId, wonCard.instanceId);
            
            // Place mummy back at random position
            const mummyCard: CardInstance = {
              instanceId: `mummy_${Date.now()}`,
              cardId: 'mummified',
            };
            const randomPosition = Math.floor(Math.random() * (game.getDeckSize() + 1));
            game.insertCardInDeck(mummyCard, randomPosition);
          } else {
            game.eliminatePlayer(winnerId);
            io.to(roomId).emit('playerEliminated', winnerId);
          }
        }
      }
      
      io.to(playerId).emit('handUpdated', game.getPlayerHand(playerId));
      io.to(targetId).emit('handUpdated', game.getPlayerHand(targetId));
      break;
    }
    
    case 'spellbound': {
      // Ask for specific card - handled by separate event
      // Just send prompt to player
      if (!targetId) {
        socket.emit('error', 'Must select a target player!');
        return;
      }
      // Client will send spellboundRequest with the requested card type
      break;
    }
    
    case 'criminal_mummy': {
      // Blind steal
      if (!targetId) {
        socket.emit('error', 'Must select a target player!');
        return;
      }
      
      const targetHand = game.getPlayerHand(targetId);
      if (targetHand.length === 0) {
        socket.emit('error', 'Target has no cards!');
        return;
      }
      
      // Set pending action for blind steal with arrange state tracking
      game.pendingAction = {
        action: { type: 'PLAY_CARD', playerId, cardInstanceId: '', targetId },
        cardPlayed: 'criminal_mummy',
        playerId,
        targetId,
        kingRaResponses: new Map(),
        kingRaCount: 0,
        timeoutAt: Date.now() + 15000,
        waitingForArrange: true, // Track if we're waiting for arrange
      };
      
      // Prompt victim to rearrange
      io.to(targetId).emit('arrangeHandPrompt', playerId);
      
      // Auto-timeout after 15 seconds if victim doesn't confirm
      setTimeout(() => {
        if (game.pendingAction?.waitingForArrange && game.pendingAction?.cardPlayed === 'criminal_mummy') {
          // Time's up - proceed to blind steal
          game.pendingAction.waitingForArrange = false;
          const currentHand = game.getPlayerHand(targetId);
          io.to(playerId).emit('blindStealStart', playerId, targetId, currentHand.length);
        }
      }, 15000);
      
      break;
    }
    
    case 'give_and_take': {
      // Swap lowest for highest
      if (!targetId) {
        socket.emit('error', 'Must select a target player!');
        return;
      }
      
      const lowestCard = game.getLowestValueCard(playerId);
      const highestCard = game.getHighestValueCard(targetId);
      
      if (!lowestCard || !highestCard) {
        socket.emit('error', 'Not enough cards to swap!');
        return;
      }
      
      // Perform swap
      game.removeCardFromHand(playerId, lowestCard.instanceId);
      game.removeCardFromHand(targetId, highestCard.instanceId);
      game.addCardToHand(playerId, highestCard);
      game.addCardToHand(targetId, lowestCard);
      
      const playerName = game.getPlayer(playerId)?.name ?? 'A player';
      const targetName = game.getPlayer(targetId)?.name ?? 'someone';
      
      // Emit swap result to both players (show what they gave and received)
      io.to(playerId).emit('swapResult', lowestCard, highestCard, targetName);
      io.to(targetId).emit('swapResult', highestCard, lowestCard, playerName);
      
      io.to(playerId).emit('handUpdated', game.getPlayerHand(playerId));
      io.to(targetId).emit('handUpdated', game.getPlayerHand(targetId));
      break;
    }
    
    case 'shuffle_it': {
      // Reshuffle deck
      game.shuffleDeck();
      break;
    }
    
    case 'safe_travels': {
      // End turn, next player takes 2 turns
      game.setNextPlayerTurns(2);
      roomManager?.updateGameState(roomId);
      
      const currentPlayer = game.getCurrentPlayer();
      if (currentPlayer) {
        io.to(roomId).emit('turnStarted', currentPlayer.id, 2);
      }
      
      io.to(roomId).emit('gameStateUpdated', game.getGameState());
      break;
    }
    
    case 'all_or_nothing': {
      // View hand, burn a card
      if (!targetId) {
        socket.emit('error', 'Must select a target player!');
        return;
      }
      
      const targetHand = game.getPlayerHand(targetId);
      
      // Set pending action
      game.pendingAction = {
        action: { type: 'PLAY_CARD', playerId, cardInstanceId: '', targetId },
        cardPlayed: 'all_or_nothing',
        playerId,
        targetId,
        kingRaResponses: new Map(),
        kingRaCount: 0,
        timeoutAt: Date.now() + 30000,
      };
      
      // Show hand to player
      socket.emit('viewHand', targetId, targetHand);
      break;
    }
    
    case 'flip_the_table': {
      // Peek and rearrange top 5
      const topCards = game.peekTopCards(5);
      
      // Set pending action
      game.pendingAction = {
        action: { type: 'PLAY_CARD', playerId, cardInstanceId: '' },
        cardPlayed: 'flip_the_table',
        playerId,
        kingRaResponses: new Map(),
        kingRaCount: 0,
        timeoutAt: Date.now() + 30000,
      };
      
      socket.emit('flipTableCards', topCards);
      break;
    }
    
    case 'this_is_on_you': {
      // Force opponent to draw
      if (!targetId) {
        socket.emit('error', 'Must select a target player!');
        return;
      }
      
      // Make target draw
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket && roomManager) {
        await handleDrawCard(io, targetSocket as GameSocket, roomId, game, roomManager, true);
      }
      break;
    }
  }
  
  // Update game state
  roomManager?.updateGameState(roomId);
  io.to(roomId).emit('gameStateUpdated', game.getGameState());
}
