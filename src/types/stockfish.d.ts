declare module 'stockfish.js' {
    interface Stockfish {
      init(): Promise<void>;
      postMessage(msg: string): void;
      onMessage(cb: (msg: string) => void): void;
      terminate(): void;
    }
  
    const Stockfish: {
      new (): Stockfish;
    };
    export default Stockfish;
  }
  