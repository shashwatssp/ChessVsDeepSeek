import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { handleMove } from '../api/deepseek';
import { firestore } from '../api/firebaseConfig'; 
import { doc, getDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import '../App.css';

const Game: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [error, setError] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(600);
  const [leaderboard, setLeaderboard] = useState<{ name: string; moves: number }[]>([]);
  const playerName = localStorage.getItem('playerName') || '';
  const navigate = useNavigate();
  const isAITurn = moveHistory.length % 2 === 1;
  const isFirstTurn = moveHistory.length === 0; // Check if it's the first turn

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
    try {
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
      setError('AI failed to make a move.');
    } catch {
      setError('An error occurred during AI’s turn.');
    }
  };

  const makeMove = (from: string, to: string, player: "H" | "A"): string | null => {
    try {
      const move = game.move({ from: from as any, to: to as any, promotion: 'q' });
      if (move) {
        setGame(new Chess(game.fen()));
        setMoveHistory((prev) => [...prev, `${player}-${from}${to}`]);
        updateMoveCount();
        console.log(`Move made: ${from} to ${to}, Current Board: ${game.fen()}`);
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

  const updateLeaderboard = async () => {
    try {
      if (leaderboard.length < 5 || moveHistory.length <= leaderboard[4].moves) {
        const existingPlayerIndex = leaderboard.findIndex((player) => player.name === playerName);
        if (existingPlayerIndex !== -1) {
          leaderboard[existingPlayerIndex].moves = moveHistory.length;
        } else {
          leaderboard.push({ name: playerName, moves: moveHistory.length });
        }

        const updatedLeaderboard = leaderboard.sort((a, b) => a.moves - b.moves).slice(0, 5);

        // Update leaderboard in Firestore
        const leaderboardRef = collection(firestore, 'leaderboard');
        await Promise.all(
          updatedLeaderboard.map(async (player, index) => {
            const playerRef = doc(leaderboardRef, player.name);
            await updateDoc(playerRef, { name: player.name, moves: player.moves });
          })
        );
      }
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  };

  const checkGameOver = () => {
    if (game.game_over()) {
      let message = '';
      let winner = '';
      if (game.in_checkmate()) {
        message = 'Checkmate! ';
        winner = moveHistory.length % 2 === 0 ? 'AI' : 'Human';
      } else if (game.in_stalemate()) message = 'Stalemate! It’s a draw.';
      else if (game.insufficient_material()) message = 'Draw due to insufficient material.';
      else if (game.in_draw()) message = 'Draw by threefold repetition or 50-move rule.';

      setGameOverMessage(message);
      updateWinCount(winner);
      updateLeaderboard();
    }
  };

  const updateWinCount = async (winner: string) => {
    try {
      const statsDoc = await getDoc(doc(firestore, 'matchStats', 'stats'));
      if (statsDoc.exists()) {
        const stats = statsDoc.data() as { humanWins: number; aiWins: number };
        const updatedStats = winner === 'Human' ? { humanWins: stats.humanWins + 1, aiWins: stats.aiWins } : { humanWins: stats.humanWins, aiWins: stats.aiWins + 1 };
        await updateDoc(doc(firestore, 'matchStats', 'stats'), updatedStats);
      }
    } catch (error) {
      console.error('Error updating win count:', error);
    }
  };

  useEffect(() => {
    if (!playerName) navigate('/');
  }, [playerName, navigate]);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="center-container">
      <div className="game-container">
        {gameOverMessage && <div className="game-over">{gameOverMessage}</div>}

        {!isAITurn && (
          <div
            className="player-turn-message"
            style={{
              padding: '15px',
              fontSize: '18px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#000', // Black color for player's turn
            }}
          >
            {isFirstTurn ? 'Drag and drop to move White pieces' : 'Your Turn'}
          </div>
        )}

        {isAITurn && (
          <div
            className="ai-turn-message"
            style={{
              padding: '15px',
              fontSize: '18px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#000', // Black color for AI's turn
            }}
          >
            DeepSeek's Turn
          </div>
        )}

        <Chessboard position={game.fen()} onPieceDrop={onDrop} boardWidth={boardWidth} />
      </div>
    </div>
  );
};

export default Game;
