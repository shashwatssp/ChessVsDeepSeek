export async function handleStockfishMove(
    fen: string,
    depth = 18
  ): Promise<string> {
    console.log(`[Stockfish] Starting analysis for position: ${fen}`);
    console.log(`[Stockfish] Analysis depth set to: ${depth}`);
    
    const startTime = performance.now();
    
    try {
      // Use relative path instead of alias
      const worker = new Worker(new URL('../workers/stockfish.ts', import.meta.url), {
        type: 'module'
      });
      
      console.log('[Stockfish] Worker initialized');
      
      return new Promise((resolve) => {
        console.log('[Stockfish] Sending message to worker...');
        worker.postMessage({ fen, depth });
        
        worker.onmessage = (e) => {
          const endTime = performance.now();
          const calculationTime = (endTime - startTime).toFixed(2);
          
          console.log(`[Stockfish] Received response from worker: ${e.data}`);
          console.log(`[Stockfish] Analysis completed in ${calculationTime}ms`);
          
          resolve(e.data);
          console.log('[Stockfish] Worker terminated');
          worker.terminate();
        };
        
        worker.onerror = (error) => {
          console.error('[Stockfish] Worker error:', error);
          console.log('[Stockfish] Attempting to terminate worker after error');
          worker.terminate();
          resolve('');
        };
      });
    } catch (error) {
      const endTime = performance.now();
      console.error('[Stockfish] Error in handleStockfishMove:', error);
      console.log(`[Stockfish] Failed after ${(endTime - startTime).toFixed(2)}ms`);
      return '';
    }
  }
  