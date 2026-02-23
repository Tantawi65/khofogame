import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { PeekCardsModal } from './PeekCardsModal';
import { TargetSelectModal } from './TargetSelectModal';
import { CardTypeSelectModal } from './CardTypeSelectModal';
import { BlindStealModal } from './BlindStealModal';
import { ArrangeHandModal } from './ArrangeHandModal';
import { ViewHandModal } from './ViewHandModal';
import { FlipTableModal } from './FlipTableModal';
import { PlaceMummyModal } from './PlaceMummyModal';
import { KingRaPromptModal } from './KingRaPromptModal';
import { DuelResultModal } from './DuelResultModal';
import { SwapResultModal } from './SwapResultModal';
import { GameOverModal } from './GameOverModal';

export function ModalRenderer() {
  const activeModal = useGameStore((state) => state.activeModal);
  const modalData = useGameStore((state) => state.modalData);
  const closeModal = useGameStore((state) => state.closeModal);

  const renderModal = () => {
    switch (activeModal) {
      case 'peek-cards':
        return <PeekCardsModal cards={modalData.peekCards ?? []} onClose={closeModal} />;
      
      case 'target-select':
        return <TargetSelectModal players={modalData.targetPlayers ?? []} onClose={closeModal} />;
      
      case 'card-type-select':
        return <CardTypeSelectModal targetId={modalData.spellboundTargetId} onClose={closeModal} />;
      
      case 'blind-steal':
        return <BlindStealModal cardCount={modalData.blindStealCount ?? 0} onClose={closeModal} />;
      
      case 'arrange-hand':
        return <ArrangeHandModal onClose={closeModal} />;
      
      case 'view-hand':
        return <ViewHandModal cards={modalData.viewHandCards ?? []} targetId={modalData.viewHandTargetId} onClose={closeModal} />;
      
      case 'flip-table':
        return <FlipTableModal cards={modalData.flipTableCards ?? []} onClose={closeModal} />;
      
      case 'place-mummy':
        return <PlaceMummyModal deckSize={modalData.deckSize ?? 0} onClose={closeModal} />;
      
      case 'king-ra-prompt':
        return (
          <KingRaPromptModal
            key={`king-ra-${modalData.kingRaPlayerId}-${modalData.kingRaCardPlayed}`}
            onClose={closeModal}
          />
        );
      
      case 'duel-result':
        return (
          <DuelResultModal
            challenger={modalData.duelChallenger}
            opponent={modalData.duelOpponent}
            winnerId={modalData.duelWinnerId}
            onClose={closeModal}
          />
        );
      
      case 'swap-result':
        return (
          <SwapResultModal
            gaveCard={modalData.swapGaveCard}
            receivedCard={modalData.swapReceivedCard}
            otherPlayer={modalData.swapOtherPlayer}
            onClose={closeModal}
          />
        );
      
      case 'game-over':
        return <GameOverModal winnerId={modalData.winnerId} winnerName={modalData.winnerName} onClose={closeModal} />;
      
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {activeModal && renderModal()}
    </AnimatePresence>
  );
}
