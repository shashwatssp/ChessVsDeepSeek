import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../api/firebaseConfig'; // This should match the export in firebaseConfig.ts
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore'; 

const NameInput: React.FC = () => {
  const [name, setName] = useState('');
  const [totalMoves, setTotalMoves] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; moves: number }[]>([]);
  const [winStats, setWinStats] = useState<{ humanWins: number; aiWins: number } | null>(null);
  const navigate = useNavigate();

  // Fetch data from Firestore on component mount
  useEffect(() => {
    const fetchData = async () => {
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
          const stats = statsDoc.data() as { humanWins: number; aiWins: number };
          setWinStats(stats);
        }
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
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

  return (
    <div className="name-input">
      <h1>Chess vs DeepSeek</h1>

      {/* Name Input Section */}
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

      {/* STATISTICS Section */}
      <div className="match-stats">
        <h2 style={{ fontWeight: 'bold', fontSize: '22px', color: '#007aff', textTransform: 'uppercase' }}>STATISTICS</h2>
        {winStats ? (
          <p style={{ color: '#333', fontSize: '18px' }}>
            Humans: <strong>{winStats.humanWins}</strong> wins (
            {((winStats.humanWins / (winStats.humanWins + winStats.aiWins)) * 100).toFixed(1)}%)
            <br />
            DeepSeek: <strong>{winStats.aiWins}</strong> wins (
            {((winStats.aiWins / (winStats.humanWins + winStats.aiWins)) * 100).toFixed(1)}%)
          </p>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      {/* Total Moves Played */}
      <div className="total-moves">
        <h2>Total Moves Played:</h2>
        <p>{totalMoves !== null ? totalMoves : 'Loading...'}</p>
      </div>

      {/* Leaderboard Section */}
      <div className="leaderboard">
        <h2 style={{ fontWeight: 'bold', fontSize: '22px', color: '#007aff', textTransform: 'uppercase' }}>Leaderboard</h2>
        {leaderboard.length > 0 ? (
          <ul>
            {leaderboard.slice(0, 5).map((player, index) => (
              <li key={index} style={{ color: 'green', fontSize: '18px' }}>
                {index + 1}. <strong>{player.name}</strong> beat DeepSeek in {player.moves} moves
              </li>
            ))}
          </ul>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default NameInput;
