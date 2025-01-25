import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NameInput from "./components/NameInput";
import GamePage from "./components/GamePage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NameInput />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </Router>
  );
};

export default App;
