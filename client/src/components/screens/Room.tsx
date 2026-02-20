import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { emitSetReady, emitStartGame, emitLeaveRoom } from '../../socket/socket';

export function Room() {
  const currentRoom = useGameStore((state) => state.currentRoom);
  const playerId = useGameStore((state) => state.playerId);
  
  if (!currentRoom) {
    return <div className="flex-1 flex items-center justify-center text-papyrus">Loading...</div>;
  }

  const isHost = currentRoom.hostId === playerId;
  const currentPlayer = currentRoom.players.find(p => p.id === playerId);
  const isReady = currentPlayer?.isReady ?? false;
  
  const allReady = currentRoom.players.every(p => p.isReady || p.isHost);
  const canStart = currentRoom.players.length >= 2 && (allReady || isHost);

  const handleLeave = () => {
    emitLeaveRoom();
  };

  const handleReady = () => {
    emitSetReady(!isReady);
  };

  const handleStart = () => {
    emitStartGame();
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom.id);
    useGameStore.getState().addToast('Room code copied!', 'success');
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/menu_background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 max-w-lg w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleLeave} className="text-egyptian-gold hover:text-yellow-400">
            ← Leave
          </button>
          <h1 className="text-xl font-bold text-egyptian-gold">{currentRoom.name}</h1>
          <span className="text-papyrus/60">
            {currentRoom.players.length}/{currentRoom.maxPlayers}
          </span>
        </div>

        {/* Room Code */}
        <div className="text-center mb-6">
          <p className="text-papyrus mb-2">Room Code:</p>
          <button
            onClick={copyRoomCode}
            className="room-code cursor-pointer hover:bg-nile-blue/80 transition-colors"
          >
            {currentRoom.id}
          </button>
          <p className="text-papyrus/60 text-sm mt-2">Click to copy</p>
        </div>

        {/* Players */}
        <div className="mb-6">
          <h2 className="text-papyrus font-semibold mb-3">Players</h2>
          <div className="space-y-2">
            {currentRoom.players.map((player, index) => (
              <motion.div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === playerId ? 'bg-egyptian-gold/20' : 'bg-nile-blue/30'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-papyrus font-semibold">
                      {player.name}
                      {player.id === playerId && ' (You)'}
                    </p>
                    {player.isHost && (
                      <span className="text-egyptian-gold text-sm">👑 Host</span>
                    )}
                  </div>
                </div>
                <div>
                  {player.isHost ? (
                    <span className="text-green-400">Ready</span>
                  ) : player.isReady ? (
                    <span className="text-green-400">✓ Ready</span>
                  ) : (
                    <span className="text-yellow-400">Waiting...</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty slots */}
          {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="p-3 rounded-lg bg-nile-blue/10 border border-dashed border-papyrus/20 mt-2"
            >
              <p className="text-papyrus/40 text-center">Waiting for player...</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isHost && (
            <button
              onClick={handleReady}
              className={`btn flex-1 ${isReady ? 'btn-danger' : 'btn-secondary'}`}
            >
              {isReady ? 'Not Ready' : 'Ready'}
            </button>
          )}
          
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="btn btn-primary flex-1"
            >
              {currentRoom.players.length < 2
                ? 'Need 2+ Players'
                : !allReady
                ? 'Waiting for Players'
                : 'Start Game'}
            </button>
          )}
        </div>

        {/* Min players warning */}
        {currentRoom.players.length < 2 && (
          <p className="text-center text-yellow-400 mt-4 text-sm">
            Need at least 2 players to start
          </p>
        )}
      </motion.div>
    </div>
  );
}
