import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../api/firebaseConfig';
import { getDoc, collection, getDocs, doc } from 'firebase/firestore';
import { motion } from 'framer-motion'; // Import Framer Motion
import { BeatLoader } from 'react-spinners'; // Import BeatLoader
const NameInput = () => {
    const [name, setName] = useState('');
    const [totalMoves, setTotalMoves] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [winStats, setWinStats] = useState(null);
    const [loading, setLoading] = useState(true); // Loading state
    const [fetchError, setFetchError] = useState(false); // Track if fetch fails
    const navigate = useNavigate();
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); // Start loading when data is being fetched
            try {
                const moveDoc = await getDoc(doc(firestore, 'moveCounts', 'totalMoves'));
                if (moveDoc.exists()) {
                    const data = moveDoc.data();
                    setTotalMoves(data.count);
                }
                const leaderboardSnapshot = await getDocs(collection(firestore, 'leaderboard'));
                const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
                    name: doc.data().name,
                    moves: doc.data().moves,
                }));
                setLeaderboard(leaderboardData.sort((a, b) => a.moves - b.moves));
                const statsDoc = await getDoc(doc(firestore, 'matchStats', 'stats'));
                if (statsDoc.exists()) {
                    const stats = statsDoc.data();
                    setWinStats({
                        humanWins: stats.humanWins || 0,
                        aiWins: stats.aiWins || 0,
                        draw: stats.draw || 0, // Ensure draw is available
                    });
                }
            }
            catch (error) {
                console.error('Error fetching data from Firestore:', error);
                setFetchError(true); // Set fetchError to true if data fetch fails
            }
            finally {
                setLoading(false); // Set loading to false once data is fetched
            }
        };
        fetchData();
    }, []);
    const handleStartGame = () => {
        if (name.trim()) {
            localStorage.setItem('playerName', name);
            navigate('/game');
        }
        else {
            alert('Please enter your name!');
        }
    };
    const totalGames = winStats ? winStats.humanWins + winStats.aiWins + winStats.draw : 0;
    return (_jsxs(motion.div, { className: "name-input", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 1 }, children: [_jsx("h1", { children: "Chess vs DeepSeek" }), _jsxs("div", { className: "input-section", children: [_jsx("h2", { children: "Enter Your Name:" }), _jsx("input", { type: "text", placeholder: "Enter your name", value: name, onChange: (e) => setName(e.target.value) }), _jsx("button", { onClick: handleStartGame, children: "Play" })] }), _jsxs("div", { className: "match-stats", children: [_jsx("h2", { children: "STATISTICS" }), loading ? (_jsx(BeatLoader, { size: 20, color: "#4A90E2", loading: loading })) : winStats ? (_jsxs("p", { children: ["Humans: ", _jsx("strong", { children: winStats.humanWins }), " wins (", totalGames > 0 ? ((winStats.humanWins / totalGames) * 100).toFixed(1) : 0, "%)", _jsx("br", {}), "DeepSeek: ", _jsx("strong", { children: winStats.aiWins }), " wins (", totalGames > 0 ? ((winStats.aiWins / totalGames) * 100).toFixed(1) : 0, "%)", _jsx("br", {}), "Draws: ", _jsx("strong", { children: winStats.draw }), " (", totalGames > 0 ? ((winStats.draw / totalGames) * 100).toFixed(1) : 0, "%)"] })) : (_jsx("p", { children: "Failed to load stats" }))] }), _jsxs("div", { className: "total-moves", children: [_jsx("h2", { children: "Total Moves Played:" }), loading ? (_jsx(BeatLoader, { size: 20, color: "#4A90E2", loading: loading })) : (_jsx("p", { children: totalMoves !== null ? totalMoves : 'Failed to load moves' }))] }), _jsxs("div", { className: "leaderboard", children: [_jsx("h2", { children: "Leaderboard" }), fetchError ? (_jsx("p", { children: "Feature rolling out soon" })) : loading ? (_jsx(BeatLoader, { size: 20, color: "#4A90E2", loading: loading })) : leaderboard.length > 0 ? (_jsx("ul", { children: leaderboard.slice(0, 3).map((player, index) => (_jsxs("li", { children: [index + 1, ".", " ", _jsx("strong", { children: player.name === 'DeepSeek'
                                        ? `DeepSeek beat someone in ${player.moves} moves`
                                        : `${player.name} beat DeepSeek in ${player.moves} moves` })] }, index))) })) : (_jsx("p", { children: "Feature Rolling Out Soon..." }))] })] }));
};
export default NameInput;
