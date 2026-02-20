import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Card, CardBack } from '../game/Card';
import { emitDrawCard, emitPlayCard } from '../../socket/socket';
import type { CardInstance, Player } from '@shared/types';
import { CARD_DATABASE } from '@shared/types';

export function GameBoard() {
  const gameState = useGameStore((state) => state.gameState);
  const myHand = useGameStore((state) => state.myHand);
  const playerId = useGameStore((state) => state.playerId);
  const isMyTurn = useGameStore((state) => state.isMyTurn);
  const turnsRemaining = useGameStore((state) => state.turnsRemaining);
  const selectedCards = useGameStore((state) => state.selectedCards);
  const openModal = useGameStore((state) => state.openModal);
  const addToast = useGameStore((state) => state.addToast);
  const activeModal = useGameStore((state) => state.activeModal);
  const reactionWindowActive = useGameStore((state) => state.reactionWindowActive);
  
  const [pendingCard, setPendingCard] = useState<CardInstance | null>(null);

  // Clear pendingCard when relevant modals close (not target-select or card-type-select)
  useEffect(() => {
    if (pendingCard && activeModal !== 'target-select' && activeModal !== 'card-type-select') {
      setPendingCard(null);
    }
  }, [activeModal]);

  // Also clear pendingCard when it's no longer in hand (was played)
  useEffect(() => {
    if (pendingCard && !myHand.some(c => c.instanceId === pendingCard.instanceId)) {
      setPendingCard(null);
    }
  }, [myHand, pendingCard]);

  if (!gameState) {
    return <div className="flex-1 flex items-center justify-center text-papyrus">Loading game...</div>;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const otherPlayers = gameState.players.filter(p => p.id !== playerId);
  const myPlayer = gameState.players.find(p => p.id === playerId);

  const handleCardClick = (card: CardInstance) => {
    // Block card plays during reaction window (except handled by modal)
    if (reactionWindowActive) {
      addToast('Wait for reaction window to end!', 'warning');
      return;
    }
    
    if (!isMyTurn) {
      addToast("It's not your turn!", 'warning');
      return;
    }

    const cardDef = CARD_DATABASE[card.cardId];

    // Check if it's a half card
    if (cardDef.isHalf) {
      const count = myHand.filter(c => c.cardId === card.cardId).length;
      if (count < 2) {
        addToast('Half cards require 2 copies to play!', 'warning');
        return;
      }
    }

    // Check if card needs a target
    const cardsNeedingTarget = [
      'me_or_you', 'spellbound', 'criminal_mummy', 'give_and_take',
      'all_or_nothing', 'this_is_on_you'
    ];

    if (cardsNeedingTarget.includes(card.cardId)) {
      // Open target selection modal
      setPendingCard(card);
      const alivePlayers = otherPlayers.filter(p => p.isAlive);
      openModal('target-select', { targetPlayers: alivePlayers });
      return;
    }

    // Special handling for spellbound (needs card type selection too)
    // This is handled after target selection in modal

    // Play the card directly
    emitPlayCard(card.instanceId);
  };

  const handleDrawCard = () => {
    if (!isMyTurn) {
      addToast("It's not your turn!", 'warning');
      return;
    }
    emitDrawCard();
  };

  const handleTargetSelect = (targetId: string): boolean => {
    if (!pendingCard) return false;

    if (pendingCard.cardId === 'spellbound') {
      // Emit the card play first to consume the card
      emitPlayCard(pendingCard.instanceId, targetId);
      // Then open card type selection modal
      openModal('card-type-select', { spellboundTargetId: targetId });
      setPendingCard(null);
      return true; // Keep target modal from closing since we're opening another
    } else {
      emitPlayCard(pendingCard.instanceId, targetId);
      setPendingCard(null);
      return false;
    }
  };

  // Subscribe to target selection from modal
  const setTargetSelectCallback = (callback: (targetId: string) => void) => {
    (window as any).__targetSelectCallback = callback;
  };
  setTargetSelectCallback(handleTargetSelect);

  return (
    <div 
      className="game-board flex-1 flex flex-col"
      style={{
        backgroundImage: 'url(/menu_background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Top area - Other players */}
      <div className="flex justify-center gap-4 p-2">
        {otherPlayers.map((player) => (
          <PlayerDisplay 
            key={player.id} 
            player={player} 
            isCurrentTurn={currentPlayer?.id === player.id}
          />
        ))}
      </div>

      {/* Middle area - Deck and discard */}
      <div className="flex-1 flex items-center justify-center gap-8">
        {/* Deck */}
        <motion.div
          className="deck-pile"
          data-count={gameState.deckCount}
          whileHover={isMyTurn ? { scale: 1.05 } : {}}
          onClick={handleDrawCard}
        >
          <CardBack size="large" />
          <p className="text-center text-papyrus mt-2">Deck</p>
        </motion.div>

        {/* Turn info */}
        <div className="text-center">
          <motion.div
            key={currentPlayer?.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/60 rounded-lg px-6 py-3"
          >
            <p className="text-papyrus mb-1">
              {currentPlayer?.id === playerId ? "Your Turn!" : `${currentPlayer?.name}'s Turn`}
            </p>
            {turnsRemaining > 1 && (
              <p className="text-egyptian-gold text-sm">
                {turnsRemaining} turns remaining
              </p>
            )}
          </motion.div>
        </div>

        {/* Discard pile */}
        <div className="relative">
          {gameState.discardPile.length > 0 ? (
            <Card 
              cardId={gameState.discardPile[gameState.discardPile.length - 1]} 
              size="large"
              disabled
            />
          ) : (
            <div className="w-32 h-48 border-2 border-dashed border-papyrus/30 rounded-lg flex items-center justify-center">
              <p className="text-papyrus/40 text-center text-sm">Discard</p>
            </div>
          )}
          <p className="text-center text-papyrus mt-2">Discard ({gameState.discardPile.length})</p>
        </div>
      </div>

      {/* Bottom area - My hand */}
      <div className="bg-black/50 backdrop-blur-sm p-4">
        {/* My player info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`player-avatar ${isMyTurn ? 'current-turn' : ''}`}>
              {myPlayer?.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-papyrus">{myPlayer?.name} (You)</span>
          </div>
          <span className="text-egyptian-gold">{myHand.length} cards</span>
        </div>

        {/* Hand */}
        <div className="hand-area">
          <AnimatePresence mode="popLayout">
            {myHand.map((card, index) => (
              <motion.div
                key={card.instanceId}
                layout
                initial={{ opacity: 0, y: 50, rotate: -10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  rotate: 0,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ opacity: 0, y: -50, scale: 0.5 }}
              >
                <Card
                  card={card}
                  selected={selectedCards.includes(card.instanceId)}
                  onClick={() => handleCardClick(card)}
                  disabled={!isMyTurn}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Draw button for mobile */}
        {isMyTurn && (
          <motion.button
            className="btn btn-primary w-full mt-2"
            onClick={handleDrawCard}
            whileTap={{ scale: 0.95 }}
          >
            Draw Card (End Turn)
          </motion.button>
        )}
      </div>
    </div>
  );
}

interface PlayerDisplayProps {
  player: Player;
  isCurrentTurn: boolean;
}

function PlayerDisplay({ player, isCurrentTurn }: PlayerDisplayProps) {
  return (
    <motion.div
      className={`bg-black/50 rounded-lg p-2 ${isCurrentTurn ? 'ring-2 ring-green-500' : ''}`}
      animate={isCurrentTurn ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: isCurrentTurn ? Infinity : 0, duration: 1.5 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`player-avatar w-8 h-8 text-sm ${!player.isAlive ? 'eliminated' : ''} ${isCurrentTurn ? 'current-turn' : ''}`}>
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className={`text-sm ${player.isAlive ? 'text-papyrus' : 'text-papyrus/50 line-through'}`}>
            {player.name}
          </p>
          {!player.isAlive && <p className="text-mummy-red text-xs">☠️ Mummified</p>}
        </div>
      </div>
      
      {player.isAlive && (
        <div className="flex gap-1 justify-center">
          {Array.from({ length: Math.min(player.cardCount, 8) }).map((_, i) => (
            <div 
              key={i} 
              className="w-4 h-6 bg-gradient-to-br from-egyptian-gold to-sand rounded shadow-sm"
            />
          ))}
          {player.cardCount > 8 && (
            <span className="text-egyptian-gold text-xs">+{player.cardCount - 8}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
