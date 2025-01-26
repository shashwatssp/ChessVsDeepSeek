import { Chess } from 'chess.js';  // Import chess.js

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;



// Initialize chess.js instance to handle game logic
const chess = new Chess();

// Validate moves based on the type of piece
const isValidMove = (move: string): boolean => {
  const [from, to] = [move.slice(0, 2), move.slice(2, 4)];

  const isValidSquare = (square: string) => {
    const [file, rank] = [square.charAt(0), parseInt(square.charAt(1), 10)];
    return file >= 'a' && file <= 'h' && rank >= 1 && rank <= 8;
  };

  return isValidSquare(from) && isValidSquare(to);
};

// Unified function to make moves, either for AI or human, and handle failed moves
export async function handleMove(
  fen: string,
  failedMoves: string[],
  player: 'H' | 'A',
  lastMove: string | null = null
): Promise<string | null> {
  try {

    if(failedMoves.length){
      console.log(`======FAILED MOVES=======`);
      console.log(failedMoves.join(', '));
      console.log(`======FAILED MOVES=======`);
      console.log(fen);
    }else{
      console.log("Going Great!!")
    }


    // Set the FEN in chess.js to track the game state
    chess.load(fen);

    // Check for checkmate or game over
    if (chess.game_over()) {
      if (chess.in_checkmate()) {
        console.log('Checkmate detected!');
        return null;  // No more moves, game over
      } else if (chess.in_stalemate()) {
        console.log('Stalemate detected!');
        return null;  // No more moves, game over
      }
    }

    // Get AI move if it's the AI's turn
    if (player === 'A') {
      const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          
            model: 'deepseek-chat',
            temperature: 0.1,  // Reduces randomness
            max_tokens: 8,     // Limits to move + potential promotion (e.g., e7e8q)
            top_p: 0.15,       // Focuses on high-probability moves
            stop: ['\n'],      // Prevents extra text
          messages: [
            {
              role: 'system',
              content: `Act as a chess grandmaster. Follow these strict rules:
            1. Current FEN: ${fen}
            2. Generate ONLY legal moves in SAN format (e.g., Nf3, exd5, O-O)
            3. Banned moves: ${failedMoves.join(', ')} (including all capture variants).
            4. Your priority should be thinking about valid moves and those moves which are not there in Banned Moves and to ensure that you dont have to retry many times.
            5. Next Priorities in order:
               a) Forced checkmate sequences
               b) Material gain tactics
               c) Positional advantages (center control, king safety, pawn structure)
               d) Long-term strategic planning
            6. Calculate 3 candidate moves before answering
            7. Never explain - only output the move`
            },
            {
              role: 'user',
              content: `Current FEN: ${fen}. Do not repeat the following invalid moves: ${failedMoves.join(', ')}. A failed move is one that has been attempted but is not valid or previously used by the player. Please do not attempt those moves again, even with slight variations (like "x" for captures).  Your focus should be on playing legal moves, avoiding the invalid moves, and trying to win the game. Please make a legal move in the format: <fromSquare><toSquare> (e.g., "e2e4"). Only return the move in this format.`,
            },
          ],
          stream: false,
        }),
      });

      const data = await response.json();
      const move = data.choices[0]?.message.content.trim() || null;

      // Validate the returned move
      if (move && isValidMove(move) && !failedMoves.includes(move)) {
        return move;
      } else {
        console.error('Invalid or repeated move returned by AI:', move);
        return null;
      }
    } else {
      // Human move
      if (lastMove && isValidMove(lastMove) && !failedMoves.includes(lastMove)) {
        return lastMove;
      }
    }

    return null;
  } catch (err) {
    console.error('Error during move handling:', err);
    return null;
  }
}
