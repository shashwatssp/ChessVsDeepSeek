import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { handleMove } from '../api/deepseek';
import { firestore } from '../api/firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import '../App.css';
const Game = () => {
    const [game, setGame] = useState(new Chess());
    const [error, setError] = useState(null);
    const [moveHistory, setMoveHistory] = useState([]);
    const [gameOverMessage, setGameOverMessage] = useState(null);
    const [boardWidth, setBoardWidth] = useState(600);
    const [aiLoading, setAiLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [matchStatus, setMatchStatus] = useState('Match is Live');
    const [isFirstMove, setFirstMove] = useState(true);
    const playerName = localStorage.getItem('playerName') || '';
    const navigate = useNavigate();
    const isAITurn = moveHistory.length % 2 === 1;
    let winner = '';
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const leaderboardSnapshot = await getDocs(collection(firestore, 'leaderboard'));
                const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
                    name: doc.data().name,
                    moves: doc.data().moves,
                }));
                setLeaderboard(leaderboardData.sort((a, b) => a.moves - b.moves));
            }
            catch (error) {
                console.error('Error fetching leaderboard:', error);
            }
        };
        fetchLeaderboard();
    }, []);
    useEffect(() => {
        const calculateBoardWidth = () => {
            if (window.innerWidth <= 600)
                setBoardWidth(window.innerWidth * 0.9);
            else if (window.innerWidth <= 1024)
                setBoardWidth(window.innerWidth * 0.8);
            else
                setBoardWidth(600);
        };
        calculateBoardWidth();
        window.addEventListener('resize', calculateBoardWidth);
        return () => window.removeEventListener('resize', calculateBoardWidth);
    }, []);
    const onDrop = (sourceSquare, targetSquare) => {
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
        }
        catch {
            setError('An error occurred while making your move.');
            return false;
        }
    };
    const handleAIMove = async () => {
        if (matchStatus !== 'Match is Live')
            return;
        try {
            setAiLoading(true);
            let retries = 0;
            let failedMoves = [];
            while (retries < 50) {
                const aiMove = await handleMove(game.fen(), failedMoves, 'A');
                if (aiMove) {
                    const move = makeMove(aiMove.slice(0, 2), aiMove.slice(2, 4), 'A');
                    if (move)
                        return checkGameOver();
                    failedMoves.push(aiMove);
                }
                retries++;
            }
            // console.log("winner is: ");
            // console.log(winner);
            if (retries == 50 && winner == '')
                setError('DeepSeek Failed to make a move. Please restart the game.');
        }
        catch {
            setError('An error occurred during AI’s turn.');
        }
        finally {
            setAiLoading(false);
        }
    };
    const makeMove = (from, to, player) => {
        try {
            const move = game.move({ from: from, to: to, promotion: 'q' });
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
        }
        catch (err) {
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
        }
        catch (error) {
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
            }
            else if (game.in_stalemate()) {
                message = 'Stalemate! It’s a draw.';
                updateWinCount('Draw');
            }
            else if (game.insufficient_material()) {
                message = 'Draw due to insufficient material.';
                updateWinCount('Draw');
            }
            else if (game.in_draw()) {
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
                    setGameOverMessage('Checkmate! You won.');
                    setMatchStatus('Checkmate!! You won.');
                    setError('WOW!! CHECKMATE!! YOU WON!! CONGRATULATIONS!!');
                }
                else {
                    addToLeaderboard('DeepSeek');
                    setGameOverMessage('Checkmate! You Lost.');
                    setMatchStatus('Checkmate! You Lost.');
                    setError('OOPS!! CHECKMATE!!');
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };
    const addToLeaderboard = async (name) => {
        try {
            const moves = moveHistory.length;
            const docRef = await addDoc(collection(firestore, 'leaderboard'), { name, moves });
            // console.log('Document written with ID:', docRef.id);
            updateLeaderboard(); // Refresh the leaderboard after adding the new entry
        }
        catch (error) {
            console.error('Error adding to leaderboard:', error);
        }
    };
    if (error)
        return _jsx("div", { className: "error", children: error });
    return (_jsxs(motion.div, { className: "game-container", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1 }, children: [gameOverMessage && (_jsx(motion.div, { className: "game-over", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1 }, children: gameOverMessage })), _jsx(motion.div, { className: "turn-message-container", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 }, children: (_jsx("div", { className: `turn-message ${isAITurn ? 'ai-turn' : 'human-turn'}`, children: isAITurn ? "DeepSeek's Turn" : "Your Turn" })) }), aiLoading ? (_jsx(Chessboard, { position: game.fen(), onPieceDrop: onDrop, boardWidth: boardWidth })) : (_jsx(Chessboard, { position: game.fen(), onPieceDrop: onDrop, boardWidth: boardWidth }))] }));
};
export default Game;
