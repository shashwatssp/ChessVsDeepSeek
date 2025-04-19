// public/stockfish-worker.js (Move this file to public directory)

// Use importScripts instead of import
importScripts('./stockfish.js');
import { Stockfish } from 'stockfish.js';
// or
import * as StockfishModule from 'stockfish.js';
const Stockfish = StockfishModule.default || StockfishModule;


// Initialize Stockfish engine
const engine = Stockfish();

// Set up message handler once
engine.onmessage = function(event) {
  const line = event.data;
  
  // When we receive the bestmove response, send it back to the main thread
  if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    if (parts.length >= 2) {
      self.postMessage(parts[1]);
    }
  }
};

// Handle messages from the main thread
self.onmessage = function(e) {
  const { fen, depth } = e.data;
  
  // Send commands to the engine
  engine.postMessage('uci');
  engine.postMessage('isready');
  engine.postMessage(`position fen ${fen}`);
  engine.postMessage(`go depth ${depth}`);
};
