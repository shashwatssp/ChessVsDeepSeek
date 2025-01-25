import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { handleMove } from '../api/deepseek';
import '../App.css';

const Game: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [error, setError] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(600);
  const playerName = localStorage.getItem('playerName') || '';
  const navigate = useNavigate();
  const isAITurn = moveHistory.length % 2 === 1;
  const isFirstTurn = moveHistory.length === 0; // Check if it's the first turn

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
      let message = '';
      if (game.in_checkmate()) message = 'Checkmate! You lost.';
      else if (game.in_stalemate()) message = 'Stalemate! It’s a draw.';
      else if (game.insufficient_material()) message = 'Draw due to insufficient material.';
      else if (game.in_draw()) message = 'Draw by threefold repetition or 50-move rule.';
      setGameOverMessage(message);
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
