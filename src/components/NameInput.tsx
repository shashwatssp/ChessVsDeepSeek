import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../api/firebaseConfig'; 
import { getDoc, collection, getDocs, doc } from 'firebase/firestore'; 
import { motion } from 'framer-motion'; // Import Framer Motion
import { ClipLoader } from 'react-spinners'; // Import ClipLoader

const NameInput: React.FC = () => {
  const [name, setName] = useState('');
  const [totalMoves, setTotalMoves] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; moves: number }[]>([]);
  const [winStats, setWinStats] = useState<{ humanWins: number; aiWins: number; draw: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [fetchError, setFetchError] = useState<boolean>(false); // Track if fetch fails
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
          const stats = statsDoc.data() as { humanWins: number; aiWins: number; draw: number };
          setWinStats({
            humanWins: stats.humanWins || 0,
            aiWins: stats.aiWins || 0,
            draw: stats.draw || 0, // Ensure draw is available
          });
        }
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        setFetchError(true); // Set fetchError to true if data fetch fails
      } finally {
        setLoading(false); // Set loading to false once data is fetched
      }
    };

    fetchData();
  }, []);

  const handleStartGame = () => {
    if (name.trim()) {
      localStorage.setItem('playerName', name);
      navigate('/game');
    } else {
      alert('Please enter your name!');
    }
  };

  const totalGames = winStats ? winStats.humanWins + winStats.aiWins + winStats.draw : 0;

  return (
    <motion.div
      className="name-input"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }} // Fade in transition
    >
      <h1>Chess vs DeepSeek</h1>

      <div className="input-section">
        <h2>Enter Your Name:</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleStartGame}>Play</button>
      </div>

      <div className="match-stats">
        <h2>STATISTICS</h2>
        {loading ? (
          <ClipLoader size={30} color={"#4A90E2"} loading={loading} />
        ) : winStats ? (
          <p>
            Humans: <strong>{winStats.humanWins}</strong> wins (
            {totalGames > 0 ? ((winStats.humanWins / totalGames) * 100).toFixed(1) : 0}%)
            <br />
            DeepSeek: <strong>{winStats.aiWins}</strong> wins (
            {totalGames > 0 ? ((winStats.aiWins / totalGames) * 100).toFixed(1) : 0}%)
            <br />
            Draws: <strong>{winStats.draw}</strong> (
            {totalGames > 0 ? ((winStats.draw / totalGames) * 100).toFixed(1) : 0}%)
          </p>
        ) : (
          <p>Failed to load stats</p>
        )}
      </div>

      <div className="total-moves">
        <h2>Total Moves Played:</h2>
        {loading ? (
          <ClipLoader size={30} color={"#4A90E2"} loading={loading} />
        ) : (
          <p>{totalMoves !== null ? totalMoves : 'Failed to load moves'}</p>
        )}
      </div>

      <div className="leaderboard">
  <h2>Leaderboard</h2>
  {fetchError ? (
    <p>Feature rolling out soon</p>
  ) : loading ? (
    <ClipLoader size={30} color={"#4A90E2"} loading={loading} />
  ) : leaderboard.length > 0 ? (
    <ul>
      {leaderboard.slice(0, 3).map((player, index) => (
        <li key={index}>
          {index + 1}.{" "}
          <strong>
            {player.name === 'DeepSeek'
              ? `DeepSeek beat someone in ${player.moves} moves`
              : `${player.name} beat DeepSeek in ${player.moves} moves`}
          </strong>
        </li>
      ))}
    </ul>
  ) : (
    <p>Feature Rolling Out Soon...</p>
  )}
</div>
    </motion.div>
  );
};

export default NameInput;
