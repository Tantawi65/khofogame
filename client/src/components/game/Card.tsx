import { motion } from 'framer-motion';
import type { CardInstance, CardId } from '@shared/types';
import { CARD_DATABASE, CARD_ASSETS, CARD_BACK_ASSET } from '@shared/types';

interface CardProps {
  card?: CardInstance;
  cardId?: CardId;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showValue?: boolean;
}

const sizeClasses = {
  small: 'w-16',
  medium: 'w-24',
  large: 'w-32',
};

export function Card({
  card,
  cardId,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  size = 'medium',
  className = '',
  showValue = true,
}: CardProps) {
  const actualCardId = card?.cardId ?? cardId;
  const cardDef = actualCardId ? CARD_DATABASE[actualCardId] : null;
  
  const imageSrc = faceDown || !actualCardId
    ? `/${CARD_BACK_ASSET}`
    : `/${CARD_ASSETS[actualCardId]}`;

  const isMummy = actualCardId === 'mummified';
  const isHalf = cardDef?.isHalf;

  return (
    <motion.div
      className={`
        card ${sizeClasses[size]} ${className}
        ${selected ? 'selected' : ''}
        ${disabled ? 'disabled' : ''}
        ${isMummy && !faceDown ? 'mummy' : ''}
      `}
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { scale: 1.05, y: -10 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <img 
        src={imageSrc} 
        alt={cardDef?.nameEn ?? 'Card'} 
        className="card-image"
        onError={(e) => {
          // Fallback if image doesn't exist
          (e.target as HTMLImageElement).src = `/${CARD_BACK_ASSET}`;
        }}
      />
      
      {!faceDown && cardDef && (
        <>
          <div className="card-overlay" />
          
          {isHalf && (
            <span className="half-indicator">½</span>
          )}
          
          {showValue && cardDef.value > 0 && (
            <span className="absolute top-1 left-1 bg-nile-blue/80 text-egyptian-gold text-xs font-bold px-1 rounded">
              {cardDef.value}
            </span>
          )}
          
          {/* Card name removed: image alone identifies the card */}
        </>
      )}
    </motion.div>
  );
}

interface CardBackProps {
  count?: number;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function CardBack({ count, onClick, size = 'medium', className = '' }: CardBackProps) {
  return (
    <div className={`relative ${className}`}>
      <Card faceDown size={size} onClick={onClick} />
      {count !== undefined && (
        <span className="absolute -bottom-2 -right-2 bg-egyptian-gold text-nile-blue text-sm font-bold px-2 py-1 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
