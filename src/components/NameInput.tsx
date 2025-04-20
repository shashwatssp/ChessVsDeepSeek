import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../api/firebaseConfig'; 
import { getDoc, collection, getDocs, doc } from 'firebase/firestore'; 
import { motion } from 'framer-motion';
import { BeatLoader } from 'react-spinners';
import './NameInput.css'; 

const NameInput: React.FC = () => {
  const [name, setName] = useState('');
  const [totalMoves, setTotalMoves] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ name: string; moves: number }[]>([]);
  const [winStats, setWinStats] = useState<{ humanWins: number; aiWins: number; draw: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
            draw: stats.draw || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        setFetchError(true);
      } finally {
        setLoading(false);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStartGame();
    }
  };

  const totalGames = winStats ? winStats.humanWins + winStats.aiWins + winStats.draw : 0;

  return (

    
    <div>
      <div style={{ height: 300 }}></div>
      <motion.div
      className="name-input-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="content-wrapper">
        <header className="app-header">
          <h1>ChessVsDeepSeek</h1>
          <p className="tagline">Challenge the AI and make your mark</p>
        </header>

        <section className="input-section">
          <motion.div 
            className="name-card"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>Enter Your Name</h2>
            <div className="input-group">
              <input
                type="text"
                placeholder="Your name here"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <motion.button 
                onClick={handleStartGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Now
              </motion.button>
            </div>
          </motion.div>
        </section>

        <section className="stats-section">
          <motion.div 
            className="card stats-card"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2>Game Statistics</h2>
            {loading ? (
              <div className="loader-container">
                <BeatLoader size={10} color={"#4A90E2"} loading={loading} />
              </div>
            ) : winStats ? (
              <div className="stats-grid">
                <div className="stat-item human">
                  <span className="stat-value">{winStats.humanWins}</span>
                  <span className="stat-label">Human Wins</span>
                  <span className="stat-percent">
                    {totalGames > 0 ? ((winStats.humanWins / totalGames) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div className="stat-item ai">
                  <span className="stat-value">{winStats.aiWins}</span>
                  <span className="stat-label">AI Wins</span>
                  <span className="stat-percent">
                    {totalGames > 0 ? ((winStats.aiWins / totalGames) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div className="stat-item draw">
                  <span className="stat-value">{winStats.draw}</span>
                  <span className="stat-label">Draws</span>
                  <span className="stat-percent">
                    {totalGames > 0 ? ((winStats.draw / totalGames) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="error-message">Failed to load statistics</p>
            )}
          </motion.div>

          <motion.div 
            className="card moves-card"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2>Total Moves Played</h2>
            {loading ? (
              <div className="loader-container">
                <BeatLoader size={10} color={"#4A90E2"} loading={loading} />
              </div>
            ) : (
              <div className="total-moves-display">
                {totalMoves !== null ? (
                  <span className="moves-count">{totalMoves.toLocaleString()}</span>
                ) : (
                  <span className="error-message">Failed to load moves</span>
                )}
              </div>
            )}
          </motion.div>

          <motion.div 
            className="card leaderboard-card"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2>Leaderboard</h2>
            {fetchError ? (
              <p className="coming-soon">Feature rolling out soon</p>
            ) : loading ? (
              <div className="loader-container">
                <BeatLoader size={10} color={"#4A90E2"} loading={loading} />
              </div>
            ) : leaderboard.length > 0 ? (
              <ul className="leaderboard-list">
                {leaderboard.slice(0, 3).map((player, index) => (
                  <li key={index} className="leaderboard-item">
                    <div className="rank">{index + 1}</div>
                    <div className="player-info">
                      {player.name === 'DeepSeek' ? (
                        <>
                          <span className="player-name">DeepSeek</span>
                          <span className="achievement">beat someone in {player.moves} moves</span>
                        </>
                      ) : (
                        <>
                          <span className="player-name">{player.name}</span>
                          <span className="achievement">beat DeepSeek in {player.moves} moves</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="coming-soon">Feature Rolling Out Soon...</p>
            )}
          </motion.div>
        </section>

        <footer className="app-footer">
          <p>Challenge your strategic thinking against DeepSeek AI</p>
        </footer>
      </div>
    </motion.div>
    </div>

  );
};

export default NameInput;
