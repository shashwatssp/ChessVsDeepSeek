import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NameInput: React.FC = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

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
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleStartGame}>Start Game</button>
    </div>
  );
};

export default NameInput;
