import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import {Chess} from 'chess.js';
import { handleMove } from '../api/deepseek';
import '../App.css'; 

const Game: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [error, setError] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(600);  // State for dynamic board width
  const playerName = localStorage.getItem('playerName') || '';
  const navigate = useNavigate();

  // Function to calculate the board width based on window size
  const calculateBoardWidth = () => {
    if (window.innerWidth <= 600) {
      setBoardWidth(window.innerWidth * 0.9);  // 90% of the window width for mobile
    } else if (window.innerWidth <= 1024) {
      setBoardWidth(window.innerWidth * 0.8);  // 80% of the window width for tablets
    } else {
      setBoardWidth(600);  // Fixed width for larger screens
    }
  };

  useEffect(() => {
    calculateBoardWidth();  // Initial calculation
    window.addEventListener('resize', calculateBoardWidth);  // Recalculate on window resize
    return () => {
      window.removeEventListener('resize', calculateBoardWidth);  // Clean up event listener
    };
  }, []);

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    console.log(`onDrop called: ${sourceSquare} to ${targetSquare}`);
    try {
      const move = makeMove(sourceSquare, targetSquare, "H");
      if (move === null) {
        const invalidMove = `H-${sourceSquare}${targetSquare}-I`;
        setMoveHistory((prev) => [...prev, invalidMove]);
        alert('Your move is illegal. Please try again!');
        return false;
      }
      console.log('Move made successfully, now AI will play');
      setTimeout(() => {
        handleAIMove();
      }, 500);
      return true;
    } catch (err) {
      console.error('Error during onDrop:', err);
      setError('Something went wrong with the move.');
      return false;
    }
  };

  const handleAIMove = async () => {
    try {
      let retries = 0;
      let failedMoves: string[] = [];
      const humanMove = moveHistory[moveHistory.length - 1];
      if (humanMove && humanMove.startsWith('H-')) {
        failedMoves = [];
      }

      while (retries < 50) {
        console.log(`AI turn: Attempting to make a legal move, retry: ${retries + 1}`);
        const aiMove = await handleMove(game.fen(), failedMoves, 'A');
        if (aiMove) {
          const move = makeMove(aiMove.slice(0, 2), aiMove.slice(2, 4), "A");
          if (move) {
            console.log(`AI move made: ${aiMove.slice(0, 2)} to ${aiMove.slice(2, 4)}`);
            checkGameOver();
            return;
          } else {
            const invalidMove = `A-${aiMove.slice(0, 2)}${aiMove.slice(2, 4)}-I`;
            setMoveHistory((prev) => [...prev, invalidMove]);
            failedMoves.push(aiMove);
          }
        } else {
          console.log('AI failed to provide a move, retrying...');
        }

        retries++;
        if (retries === 50) {
          alert('AI is unable to make a legal move after 50 attempts. Please check the game state!');
          setError('AI is stuck in an illegal move state.');
        }
      }
    } catch (err) {
      console.error('Error during AI move:', err);
      setError('Something went wrong with the AI move.');
    }
  };
 
  const makeMove = (from: string, to: string, player: "H" | "A"): string | null => {
    try {
      // Type casting 'from' and 'to' to 'any' to avoid TypeScript errors
      const move = game.move({ from: from as any, to: to as any, promotion: 'q' });
      if (move) {
        setGame(new Chess(game.fen()));
        setMoveHistory((prev) => [...prev, `${player}-${from}${to}`]);
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

  const checkGameOver = () => {
    if (game.game_over()) {
      let gameOverMessage = '';
      if (game.in_checkmate()) {
        gameOverMessage = 'Checkmate! You lost!';
      } else if (game.in_stalemate()) {
        gameOverMessage = 'Stalemate! The game is a draw!';
      } else if (game.insufficient_material()) {
        gameOverMessage = 'Draw due to insufficient material!';
      } else if (game.in_draw()) {
        gameOverMessage = 'Draw due to threefold repetition or 50-move rule!';
      } else if (game.in_check()) {
        gameOverMessage = 'You are in check!';
      }
      setGameOverMessage(gameOverMessage);
    }
  };

  useEffect(() => {
    if (!playerName) navigate('/');
  }, [playerName, navigate]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="center-container">
      <div className="game-container">
        {gameOverMessage && <div className="game-over-message">{gameOverMessage}</div>}
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={boardWidth * 0.95}  // Pass the dynamically calculated width here
          />
        </div>
      </div>
  );
};

export default Game;
