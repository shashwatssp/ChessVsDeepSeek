import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { handleMove } from '../api/deepseek';
import { firestore } from '../api/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ClipLoader, ClockLoader } from 'react-spinners';
import '../App.css';

const Game: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [error, setError] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(600);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<{ name: string; moves: number }[]>([]);
  const [matchStatus, setMatchStatus] = useState<string>('Match is Live');
  const playerName = localStorage.getItem('playerName') || '';
  const navigate = useNavigate();
  const isAITurn = moveHistory.length % 2 === 1;

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

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (matchStatus !== 'Match is Live') {
      alert(`Game over: ${matchStatus}`);
      return false;
    }
    try {
      const move = makeMove(sourceSquare, targetSquare, 'H');
      if (move === null) {
        alert('Invalid move. Please try again.');
        return false;
      }
      setTimeout(handleAIMove, 500);
      return true;
    } catch {
      setError('An error occurred while making your move.');
      return false;
    }
  };

  const handleAIMove = async () => {
    if (matchStatus !== 'Match is Live') return;
    try {
      setAiLoading(true);
      let retries = 0;
      let failedMoves: string[] = [];
      while (retries < 50) {
        const aiMove = await handleMove(game.fen(), failedMoves, 'A');
        if (aiMove) {
          const move = makeMove(aiMove.slice(0, 2), aiMove.slice(2, 4), 'A');
          if (move) return checkGameOver();
          failedMoves.push(aiMove);
        }
        retries++;
      }
    } catch {
      setError('An error occurred during AI’s turn.');
    } finally {
      setAiLoading(false);
    }
  };

  const makeMove = (from: string, to: string, player: "H" | "A"): string | null => {
    try {
      const move = game.move({ from: from as any, to: to as any, promotion: 'q' });
      if (move) {
        setGame(new Chess(game.fen()));
        setMoveHistory((prev) => [...prev, `${player}-${from}${to}`]);
        updateMoveCount();
        checkGameOver();
        return move.san;
      }
      return null;
    } catch (err) {
      console.error('Error during makeMove:', err);
      setError('Something went wrong while making a move.');
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
      let winner = '';
    
      if (game.in_checkmate()) {
        const lastPlayer = moveHistory.length % 2 === 1 ? 'AI' : 'Human';
        message = `Checkmate! ${lastPlayer === 'Human' ? 'You' : 'AI'} won.`;
        winner = lastPlayer;
      } else if (game.in_stalemate()) {
        message = 'Stalemate! It’s a draw.';
        updateWinCount('Draw');
      } else if (game.insufficient_material()) {
        message = 'Draw due to insufficient material.';
        updateWinCount('Draw');
      } else if (game.in_draw()) {
        message = 'Draw by threefold repetition or 50-move rule.';
        updateWinCount('Draw');
        setError('OOPS!! MATCH IS DRAW');
      }
    
      setMatchStatus(message); // Automatically updates match status
      setGameOverMessage(message);
    
      if (winner) {
        updateWinCount(winner);

        if (winner === 'Human') {
          addToLeaderboard(playerName);
          setError('CONGRATULATIONS!! YOU WON!!');
        }
        else {
          addToLeaderboard('DeepSeek');
          setError('OOPS!! BETTER LUCK NEXT TIME');
        }
      }
    }
  };

  const updateWinCount = async (result: string) => {
    try {
      const statsDoc = await getDoc(doc(firestore, 'matchStats', 'stats'));
      if (statsDoc.exists()) {
        const stats = statsDoc.data() as { humanWins: number; aiWins: number; draws: number };
        const updatedStats = {
          humanWins: stats.humanWins + (result === 'Human' ? 1 : 0),
          aiWins: stats.aiWins + (result === 'AI' ? 1 : 0),
          draws: stats.draws + (result === 'Draw' ? 1 : 0),
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
      setLeaderboard(leaderboardData.sort((a, b) => a.moves - b.moves)); // Sort leaderboard
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const addToLeaderboard = async (name: string) => {
    try {
      const moves = moveHistory.length;
      const docRef = await addDoc(collection(firestore, 'leaderboard'), { name, moves });
      console.log('Document written with ID:', docRef.id);
      updateLeaderboard(); // Refresh the leaderboard after adding the new entry
    } catch (error) {
      console.error('Error adding to leaderboard:', error);
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <motion.div
      className="game-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {gameOverMessage && (
        <motion.div
          className="game-over"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {gameOverMessage}
        </motion.div>
      )}
  
      <motion.div
        className="turn-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="ai-turn-message">
          {isAITurn ? "DeepSeek's Turn" : "Your Turn"}
        </div>
      </motion.div>
  
      {aiLoading ? (
          <Chessboard position={game.fen()} onPieceDrop={onDrop} boardWidth={boardWidth} />
      ) : (
        <Chessboard position={game.fen()} onPieceDrop={onDrop} boardWidth={boardWidth} />
      )}
    </motion.div>
  );
  
};

export default Game;
