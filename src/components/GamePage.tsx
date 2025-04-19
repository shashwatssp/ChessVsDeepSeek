import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { handleMove } from '../api/deepseek';
import { firestore } from '../api/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ClipLoader } from 'react-spinners';
import '../App.css';

// Custom Alert Component
const CustomAlert = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❗';
      case 'success': return '✅';
      default: return null;
    }
  };

  return (
    <div className={`custom-alert ${type}`}>
      <span className="alert-icon">{getIcon()}</span>
      {message}
    </div>
  );
};

const Game = () => {
  const [game, setGame] = useState(new Chess());
  const [alert, setAlert] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [boardWidth, setBoardWidth] = useState(600);
  const [aiLoading, setAiLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [matchStatus, setMatchStatus] = useState('Match is Live');
  const [isFirstMove, setFirstMove] = useState(true);
  const playerName = localStorage.getItem('playerName') || 'Player';
  const navigate = useNavigate();
  const isAITurn = moveHistory.length % 2 === 1;
  let winner = '';

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const leaderboardSnapshot = await getDocs(collection(firestore, 'leaderboard'));
        const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
          name: doc.data().name,
          moves: doc.data().moves,
        }));
        setLeaderboard(leaderboardData.sort((a, b) => a.moves - b.moves));
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const calculateBoardWidth = () => {
      if (window.innerWidth <= 600) setBoardWidth(window.innerWidth * 0.9);
      else if (window.innerWidth <= 1024) setBoardWidth(window.innerWidth * 0.8);
      else setBoardWidth(600);
    };
    calculateBoardWidth();
    window.addEventListener('resize', calculateBoardWidth);
    return () => window.removeEventListener('resize', calculateBoardWidth);
  }, []);

  const onDrop = (sourceSquare, targetSquare) => {
    if (matchStatus !== 'Match is Live') {
      showAlert(`Game over: ${matchStatus}`, 'warning');
      return false;
    }
    try {
      const move = makeMove(sourceSquare, targetSquare, 'H');
      if (move === null) {
        showAlert('Invalid move. Please try again.', 'warning');
        return false;
      }
      setTimeout(handleAIMove, 500);
      return true;
    } catch (error) {
      showAlert('An error occurred while making your move.', 'error');
      return false;
    }
  };

  const handleAIMove = async () => {
    if (matchStatus !== 'Match is Live') return;
    try {
      setAiLoading(true);
      let retries = 0;
      let failedMoves = [];
      while (retries < 50) {
        const aiMove = await handleMove(game.fen(), failedMoves, 'A');
        if (aiMove) {
          const move = makeMove(aiMove.slice(0, 2), aiMove.slice(2, 4), 'A');
          if (move) return checkGameOver();
          failedMoves.push(aiMove);
        }
        retries++;
      }

      if (retries === 50 && winner === '')
        showAlert('DeepSeek Failed to make a move. Please restart the game.', 'error');
    } catch (error) {
      showAlert('An error occurred during AI\'s turn.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const makeMove = (from, to, player) => {
    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        setGame(new Chess(game.fen()));
        setMoveHistory((prev) => [...prev, `${player}-${from}${to}`]);
        updateMoveCount();
        checkGameOver();
        return move.san;
      }

      if (isFirstMove)
        setFirstMove(false);

      return null;
    } catch (err) {
      console.error('Error during makeMove:', err);
      showAlert('Something went wrong while making a move.', 'error');
      return null;
    }
  };

  const updateMoveCount = async () => {
    try {
      const moveDoc = await getDoc(doc(firestore, 'moveCounts', 'totalMoves'));
      if (moveDoc.exists()) {
        const data = moveDoc.data();
        const newCount = data.count + 1;
        await updateDoc(doc(firestore, 'moveCounts', 'totalMoves'), { count: newCount });
      }
    } catch (error) {
      console.error('Error updating move count:', error);
    }
  };

  const checkGameOver = () => {
    if (game.game_over()) {
      let message = '';

      if (game.in_checkmate()) {
        const lastPlayer = moveHistory.length % 2 === 1 ? 'AI' : 'Human';
        message = `Checkmate! ${lastPlayer === 'Human' ? 'You' : 'AI'} won.`;
        winner = lastPlayer;
      } else if (game.in_stalemate()) {
        message = 'Stalemate! It\'s a draw.';
        updateWinCount('Draw');
      } else if (game.insufficient_material()) {
        message = 'Draw due to insufficient material.';
        updateWinCount('Draw');
      } else if (game.in_draw()) {
        message = 'Draw by threefold repetition or 50-move rule.';
        updateWinCount('Draw');
        showAlert('OOPS!! MATCH IS DRAW', 'info');
      }

      setMatchStatus(message);
      setGameOverMessage(message);

      if (winner) {
        updateWinCount(winner);

        if (winner === 'Human') {
          addToLeaderboard(playerName);
          setGameOverMessage('Checkmate! You won.');
          setMatchStatus('Checkmate!! You won.');
          showAlert('WOW!! CHECKMATE!! YOU WON!! CONGRATULATIONS!!', 'success');
        }
        else {
          addToLeaderboard('DeepSeek');
          setGameOverMessage('Checkmate! You Lost.');
          setMatchStatus('Checkmate! You Lost.');
          showAlert('OOPS!! CHECKMATE!!', 'warning');
        }
      }
    }
  };

  const updateWinCount = async (result) => {
    try {
      const statsDoc = await getDoc(doc(firestore, 'matchStats', 'stats'));
      if (statsDoc.exists()) {
        const stats = statsDoc.data();
        const updatedStats = {
          humanWins: stats.humanWins + (result === 'Human' ? 1 : 0),
          aiWins: stats.aiWins + (result === 'AI' ? 1 : 0),
          draw: stats.draw + (result === 'Draw' ? 1 : 0),
        };
        await updateDoc(doc(firestore, 'matchStats', 'stats'), updatedStats);
      }
    } catch (error) {
      console.error('Error updating win count:', error);
    }
  };

  const updateLeaderboard = async () => {
    try {
      const leaderboardSnapshot = await getDocs(collection(firestore, 'leaderboard'));
      const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
        name: doc.data().name,
        moves: doc.data().moves,
      }));
      setLeaderboard(leaderboardData.sort((a, b) => a.moves - b.moves));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const addToLeaderboard = async (name) => {
    try {
      const moves = moveHistory.length;
      const docRef = await addDoc(collection(firestore, 'leaderboard'), { name, moves });
      updateLeaderboard();
    } catch (error) {
      console.error('Error adding to leaderboard:', error);
    }
  };

  return (
    <div>
      <div style={{ height: 100 }}></div>
      <motion.div
      className="chess-game-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Game Stats Strip */}
      <div className="game-stats-strip">
        <div className="stat-item">
          <span className="stat-label">Player:</span>
          <span className="stat-value">{playerName || 'Guest'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Moves:</span>
          <span className="stat-value">{moveHistory.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Status:</span>
          <span className="stat-value">{matchStatus}</span>
        </div>
      </div>

      {/* Main Game Board */}
      <div className="game-board-section">
        {/* Turn Indicator with Player Icons */}
        <motion.div
          className="turn-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {isAITurn ? (
            <motion.div
              className="turn-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {isAITurn ? (
                <div className="turn-indicator-ai">
                  <div className="player-icon ai">🤖</div>
                  <span>DeepSeek is thinking</span>
                  {aiLoading && (
                    <span className="thinking-dots">
                      <ClipLoader color="#4a90e2" size={16} css={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                    </span>
                  )}
                </div>
              ) : (
                <div className="turn-indicator-human">
                  <div className="player-icon human">♟️</div>
                  <span>Your Turn</span>
                </div>
              )}
            </motion.div>

          ) : (
            <div className="turn-indicator-human">
              <div className="player-icon human">♟️</div>
              <span>Your Turn</span>
            </div>
          )}
        </motion.div>

        {/* Chess Board */}
        <div className="chessboard-wrapper">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={boardWidth}
            arePiecesDraggable={!aiLoading && matchStatus === 'Match is Live' && !isAITurn}
            customBoardStyle={{
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px'
            }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          />
        </div>

        {/* Game Over Message */}
        {gameOverMessage && (
          <motion.div
            className="game-over-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h3>{gameOverMessage}</h3>
            <button className="replay-button" onClick={() => navigate('/')}>
              Play Again
            </button>
          </motion.div>
        )}

        {/* Custom Alert */}
        {alert && (
          <CustomAlert
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert(null)}
          />
        )}
      </div>
    </motion.div>
    </div>
    
  );
};

export default Game;
