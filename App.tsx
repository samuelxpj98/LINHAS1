
import React, { useState, useEffect, useRef } from 'react';
import { CellStatus, GameState, Player } from './types';
import { DB_THEOLOGY, DB_CONTEXT, RANKS } from './constants';

const CITY_NAMES = ["Jerusalém", "Judeia", "Samaria", "Mundo"];
const DB_PASSWORD = "989833";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    isGameActive: false,
    view: 'config',
    seconds: 0,
    currentTurnSeconds: 60,
    gridSize: 3,
    playerCount: 2,
    turnTime: 60,
    gridX: [],
    gridY: [],
    cellStatus: {},
    players: [],
    showFinalResult: false,
    currentPlayerIndex: 0,
  });

  // Database Management State
  const [theologyList, setTheologyList] = useState<string[]>([]);
  const [contextList, setContextList] = useState<string[]>([]);
  const [isDBEditorOpen, setIsDBEditorOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [dbPasswordInput, setDbPasswordInput] = useState("");
  const [tempTheology, setTempTheology] = useState("");
  const [tempContext, setTempContext] = useState("");

  const [activeCell, setActiveCell] = useState<{ coord: string; x: string; y: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize and load words
  useEffect(() => {
    const savedTheology = localStorage.getItem('linhas_db_theology');
    const savedContext = localStorage.getItem('linhas_db_context');

    if (savedTheology) {
      setTheologyList(JSON.parse(savedTheology));
    } else {
      setTheologyList(DB_THEOLOGY);
    }

    if (savedContext) {
      setContextList(JSON.parse(savedContext));
    } else {
      setContextList(DB_CONTEXT);
    }
  }, []);

  // Lógica de tempo por turno
  useEffect(() => {
    let interval: number;
    if (gameState.isGameActive && gameState.turnTime !== 'inf') {
      interval = window.setInterval(() => {
        setGameState(prev => {
          if (prev.currentTurnSeconds <= 0) {
            return { ...prev, currentTurnSeconds: 0 };
          }
          return { ...prev, currentTurnSeconds: prev.currentTurnSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isGameActive, gameState.turnTime, gameState.currentPlayerIndex]);

  // Abertura automática do modal quando o tempo acaba
  useEffect(() => {
    if (gameState.isGameActive && gameState.turnTime !== 'inf' && gameState.currentTurnSeconds === 0 && !activeCell && !gameState.showFinalResult) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer) {
        // Encontra a primeira coordenada da mão que ainda não foi jogada
        const firstValidCoord = currentPlayer.hand.find(c => !gameState.cellStatus[c]);
        if (firstValidCoord) {
          const colIndex = firstValidCoord.charCodeAt(0) - 65;
          const rowIndex = parseInt(firstValidCoord.slice(1)) - 1;
          const wordX = gameState.gridX[colIndex];
          const wordY = gameState.gridY[rowIndex];
          setActiveCell({ coord: firstValidCoord, x: wordX, y: wordY });
        }
      }
    }
  }, [gameState.currentTurnSeconds, gameState.isGameActive, activeCell, gameState.showFinalResult]);

  const handlePasswordSubmit = () => {
    if (dbPasswordInput === DB_PASSWORD) {
      setDbPasswordInput("");
      setIsPasswordModalOpen(false);
      setTempTheology(theologyList.join(', '));
      setTempContext(contextList.join(', '));
      setIsDBEditorOpen(true);
    } else {
      alert("Senha incorreta!");
      setDbPasswordInput("");
    }
  };

  const saveDatabase = () => {
    const newTheology = tempTheology.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const newContext = tempContext.split(',').map(s => s.trim()).filter(s => s.length > 0);

    setTheologyList(newTheology);
    setContextList(newContext);
    localStorage.setItem('linhas_db_theology', JSON.stringify(newTheology));
    localStorage.setItem('linhas_db_context', JSON.stringify(newContext));
    setIsDBEditorOpen(false);
  };

  const resetDatabase = () => {
    if (confirm("Deseja restaurar as palavras padrão do sistema?")) {
      setTheologyList(DB_THEOLOGY);
      setContextList(DB_CONTEXT);
      localStorage.removeItem('linhas_db_theology');
      localStorage.removeItem('linhas_db_context');
      setIsDBEditorOpen(false);
    }
  };

  const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startGame = () => {
    const { gridSize, playerCount, turnTime } = gameState;
    
    if (theologyList.length < gridSize || contextList.length < gridSize) {
      alert("Banco de dados insuficiente para este tamanho de grade.");
      return;
    }

    const gridX = shuffle(theologyList).slice(0, gridSize);
    const gridY = shuffle(contextList).slice(0, gridSize);
    
    let deck: string[] = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 1; j <= gridSize; j++) {
        deck.push(`${String.fromCharCode(65 + i)}${j}`);
      }
    }
    
    deck = shuffle(deck);

    const players: Player[] = CITY_NAMES.slice(0, playerCount).map((name, i) => ({
      id: i + 1,
      name: name,
      hand: []
    }));

    deck.forEach((card, index) => {
      players[index % playerCount].hand.push(card);
    });

    players.forEach(p => p.hand.sort());

    setGameState(prev => ({
      ...prev,
      view: 'game',
      isGameActive: true,
      seconds: 0,
      currentTurnSeconds: turnTime === 'inf' ? 999 : turnTime,
      gridX,
      gridY,
      cellStatus: {},
      players,
      showFinalResult: false,
      currentPlayerIndex: 0
    }));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setGameState(prev => ({ ...prev, seconds: prev.seconds + 1 }));
    }, 1000);
  };

  const handleCellClick = (coord: string, x: string, y: string) => {
    if (!gameState.isGameActive || gameState.cellStatus[coord]) return;
    setActiveCell({ coord, x, y });
  };

  const markResult = (status: CellStatus) => {
    if (!activeCell) return;
    
    const newStatus = { ...gameState.cellStatus, [activeCell.coord]: status };
    const totalCells = gameState.gridSize * gameState.gridSize;
    const playedCells = Object.keys(newStatus).length;

    setGameState(prev => ({
      ...prev,
      cellStatus: newStatus,
      isGameActive: playedCells < totalCells,
      showFinalResult: playedCells === totalCells,
      currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.playerCount,
      currentTurnSeconds: prev.turnTime === 'inf' ? 999 : prev.turnTime
    }));

    if (playedCells === totalCells && timerRef.current) {
      clearInterval(timerRef.current);
    }

    setActiveCell(null);
  };

  const calculateScore = () => {
    const total = gameState.gridSize * gameState.gridSize;
    const correct = Object.values(gameState.cellStatus).filter(s => s === CellStatus.CORRECT).length;
    return Math.round((correct / total) * 100);
  };

  const getRank = (score: number) => {
    return RANKS.find(r => score >= r.threshold) || RANKS[RANKS.length - 1];
  };

  const renderConfig = () => (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-12">
        {/* Time per Turn */}
        <div className="mb-8 pt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500">⏱</span>
            <label className="text-sm font-bold text-gray-700">Tempo por Turno</label>
          </div>
          <div className="bg-[#f1f5f9] rounded-2xl p-1 flex">
            {[30, 60, 90, 'inf'].map(t => (
              <button
                key={t}
                onClick={() => setGameState(prev => ({ ...prev, turnTime: t as any }))}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${gameState.turnTime === t ? 'bg-[#f58a27] text-white shadow-lg' : 'text-[#94a3b8]'}`}
              >
                {t === 'inf' ? '∞' : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Players Stepper */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500 text-lg">👥</span>
            <label className="text-sm font-bold text-gray-700">Jogadores</label>
          </div>
          <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-4 flex items-center justify-between">
            <button 
              onClick={() => setGameState(prev => ({ ...prev, playerCount: Math.max(2, prev.playerCount - 1) }))}
              className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-orange-500 text-2xl font-bold shadow-sm active:scale-95"
            >
              -
            </button>
            <div className="text-center">
              <div className="text-2xl font-black text-gray-800 leading-tight">{gameState.playerCount}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center px-2 leading-none mt-1">
                {CITY_NAMES.slice(0, gameState.playerCount).join(', ')}
              </div>
            </div>
            <button 
              onClick={() => setGameState(prev => ({ ...prev, playerCount: Math.min(4, prev.playerCount + 1) }))}
              className="w-10 h-10 bg-[#f58a27] rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-100 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Grid Size Grid */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500">🔳</span>
            <label className="text-sm font-bold text-gray-700">Tamanho da Grade</label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { size: 2, label: 'Iniciante' },
              { size: 3, label: 'Padrão' },
              { size: 4, label: 'Hardcore' }
            ].map(item => (
              <button
                key={item.size}
                onClick={() => setGameState(prev => ({ ...prev, gridSize: item.size }))}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all relative ${gameState.gridSize === item.size ? 'border-[#f58a27] bg-white' : 'border-gray-100 bg-white'}`}
              >
                {gameState.gridSize === item.size && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#f58a27] rounded-full flex items-center justify-center shadow-md z-10">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                  </div>
                )}
                <div className={`grid gap-0.5 mb-2 ${item.size === 2 ? 'grid-cols-2' : item.size === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {Array.from({ length: item.size * item.size }).map((_, idx) => (
                    <div key={idx} className={`w-3.5 h-3.5 rounded-sm ${gameState.gridSize === item.size ? 'bg-[#94a3b8]' : 'bg-[#cbd5e1]'}`}></div>
                  ))}
                </div>
                <div className="text-xs font-black text-gray-700">{item.size} × {item.size}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={startGame}
        className="w-full bg-[#f58a27] text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-200 flex items-center justify-center gap-2 group transition-all active:scale-95"
      >
        INICIAR MISSÃO
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </button>
    </div>
  );

  const renderGame = () => {
    const isTimeRunningOut = gameState.turnTime !== 'inf' && gameState.currentTurnSeconds <= 10 && gameState.currentTurnSeconds > 0;

    return (
      <div className={`w-full animate-in fade-in duration-500 relative transition-all duration-300`}>
        {/* Alerta de Tempo Esgotando - Borda Pulsante */}
        {isTimeRunningOut && (
          <div className="fixed inset-0 pointer-events-none ring-[12px] ring-red-500/30 animate-pulse z-50"></div>
        )}

        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex justify-between items-center w-full px-2">
            <button onClick={() => setGameState(prev => ({ ...prev, view: 'config', isGameActive: false }))} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <div className="flex items-center gap-2">
              <div className={`bg-[#f58a27] text-white font-mono px-5 py-2 rounded-full text-xl font-bold shadow-lg shadow-orange-100 flex items-center gap-3 transition-colors ${isTimeRunningOut ? 'bg-red-600 shadow-red-200 scale-110' : ''}`}>
                <span>{formatTime(gameState.seconds)}</span>
                {gameState.turnTime !== 'inf' && (
                  <div className={`w-px h-6 bg-white/30`}></div>
                )}
                {gameState.turnTime !== 'inf' && (
                  <span className={`text-sm ${gameState.currentTurnSeconds <= 10 ? 'text-white animate-pulse' : 'text-white/80'}`}>
                    {gameState.currentTurnSeconds}s
                  </span>
                )}
              </div>
              
              <div className="bg-white border border-[#f1f5f9] px-4 py-2 rounded-full shadow-sm flex items-center gap-2 animate-in slide-in-from-right-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Vez de:</span>
                <span className="text-xs font-black text-[#1e293b] uppercase tracking-wider">{gameState.players[gameState.currentPlayerIndex]?.name}</span>
                <div className={`w-2 h-2 rounded-full ${isTimeRunningOut ? 'bg-red-500 animate-ping' : 'bg-orange-500 animate-pulse'}`}></div>
              </div>
            </div>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Alerta Flutuante de Emoção */}
        {isTimeRunningOut && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
             <div className="bg-red-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.3em] shadow-xl shadow-red-200 animate-bounce">
                Rápido! O tempo está acabando!
             </div>
          </div>
        )}

        <div className="grid gap-1.5 mb-8" style={{ gridTemplateColumns: `50px repeat(${gameState.gridSize}, 1fr)` }}>
          <div className="h-12 w-full"></div>
          {gameState.gridX.map((word, i) => (
            <div key={i} className="bg-[#f58a27] text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center text-center p-1 rounded-2xl uppercase min-h-[54px] shadow-sm leading-tight">
              {word}
            </div>
          ))}

          {gameState.gridY.map((wordY, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="bg-[#f1f5f9] text-[#475569] text-[9px] sm:text-[10px] font-black flex items-center justify-center text-center p-1 rounded-2xl uppercase min-h-[54px] leading-tight shadow-sm">
                {wordY}
              </div>
              {gameState.gridX.map((wordX, colIndex) => {
                const coord = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
                const status = gameState.cellStatus[coord];
                return (
                  <button
                    key={coord}
                    onClick={() => handleCellClick(coord, wordX, wordY)}
                    className={`
                      aspect-square flex items-center justify-center font-black rounded-2xl border transition-all text-xl
                      ${!status ? 'bg-white border-[#f1f5f9] text-[#cbd5e1] hover:border-[#f58a27] hover:text-[#f58a27]' : ''}
                      ${status === CellStatus.CORRECT ? 'bg-green-500 border-green-600 text-white shadow-lg' : ''}
                      ${status === CellStatus.WRONG ? 'bg-red-600 border-red-700 text-white shadow-lg' : ''}
                    `}
                  >
                    {status === CellStatus.CORRECT ? '✓' : status === CellStatus.WRONG ? '✕' : coord}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="w-full border-t border-gray-100 pt-8 pb-4">
          <p className="text-center text-[10px] text-gray-400 mb-5 uppercase font-black tracking-[0.3em]">Coordenadas de Missão</p>
          <div className="space-y-4">
            {gameState.players.map((player, idx) => (
              <details 
                key={player.id} 
                className={`group bg-white border rounded-[24px] overflow-hidden shadow-sm transition-all ${idx === gameState.currentPlayerIndex ? 'border-[#f58a27] ring-1 ring-[#f58a27]' : 'border-[#f1f5f9]'}`}
              >
                <summary className="list-none flex justify-between items-center p-5 cursor-pointer select-none">
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${idx === gameState.currentPlayerIndex ? 'text-[#f58a27]' : 'text-gray-400'}`}>Cidade</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1e293b] text-sm tracking-widest">{player.name}</span>
                      {idx === gameState.currentPlayerIndex && (
                         <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">SUA VEZ</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-300 uppercase hidden group-open:inline animate-pulse">Privado</span>
                    <span className="text-[#f58a27] group-open:rotate-180 transition-transform text-xs">▼</span>
                  </div>
                </summary>
                <div className="p-5 flex flex-wrap gap-2.5 justify-center bg-[#f8fafc] border-t border-[#f1f5f9]">
                  {player.hand.map(coord => (
                    <span 
                      key={coord} 
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-xl font-black text-base shadow-md transition-all
                        ${gameState.cellStatus[coord] ? 'bg-white text-[#e2e8f0] border border-[#f1f5f9]' : 'bg-white text-[#f58a27] border border-[#fed7aa]'}
                      `}
                    >
                      {coord}
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center p-6 max-w-lg mx-auto pb-12 relative">
      <header className="w-full text-center mb-10 pt-4">
        <h1 className="text-6xl font-black tracking-widest text-[#f58a27] mb-2 drop-shadow-sm">LINHAS</h1>
        <div className="h-1 w-14 bg-[#ffedd5] mx-auto mb-4 rounded-full"></div>
        <p className="text-[11px] font-black tracking-[0.5em] text-[#64748b] uppercase">Conexões Teológicas</p>
      </header>

      {gameState.view === 'config' ? renderConfig() : renderGame()}

      {/* Floating Database Icon */}
      <button 
        onClick={() => setIsPasswordModalOpen(true)}
        className="fixed bottom-6 right-6 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-300 hover:text-orange-500 hover:border-orange-100 transition-all active:scale-95 z-40"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 4.02 2 6.5s4.48 4.5 10 4.5 10-2.02 10-4.5S17.52 2 12 2zm0 18c-5.52 0-10-2.02-10-4.5V18c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-1.5c0 2.48-4.48 4.5-10 4.5zm0-9c-5.52 0-10-2.02-10-4.5V12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5V8.5c0 2.48-4.48 4.5-10 4.5z"/></svg>
      </button>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-center justify-center p-6 z-[110]">
          <div className="bg-white w-full max-w-xs p-8 rounded-[40px] shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Acesso Restrito</h3>
            <input 
              type="password"
              value={dbPasswordInput}
              onChange={(e) => setDbPasswordInput(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-4 text-center text-lg font-black tracking-[0.5em] outline-none focus:border-orange-500 mb-6"
              placeholder="••••••"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="grid grid-cols-2 gap-3">
               <button 
                onClick={handlePasswordSubmit}
                className="bg-[#f58a27] text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95"
              >
                Entrar
              </button>
              <button 
                onClick={() => { setIsPasswordModalOpen(false); setDbPasswordInput(""); }}
                className="bg-gray-100 text-gray-400 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Editor Modal */}
      {isDBEditorOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 z-[120] transition-all">
          <div className="bg-white w-full max-w-md p-8 rounded-t-[48px] sm:rounded-[48px] shadow-2xl animate-in slide-in-from-bottom-full duration-300 border-t border-[#f1f5f9] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-[#1e293b] mb-2 uppercase tracking-tight">Editor de Palavras</h2>
            <p className="text-xs text-gray-400 mb-8 font-bold uppercase tracking-widest">Separe os termos com vírgulas</p>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">Conceitos Teológicos</label>
                <textarea 
                  value={tempTheology}
                  onChange={(e) => setTempTheology(e.target.value)}
                  className="w-full h-32 bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-4 text-xs font-bold text-gray-700 focus:border-orange-500 outline-none resize-none"
                  placeholder="Graça, Justiça, Amor..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">Contextos Bíblicos</label>
                <textarea 
                  value={tempContext}
                  onChange={(e) => setTempContext(e.target.value)}
                  className="w-full h-32 bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-4 text-xs font-bold text-gray-700 focus:border-orange-500 outline-none resize-none"
                  placeholder="Cruz, Deserto, Vinha..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={saveDatabase}
                className="w-full bg-[#f58a27] text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 uppercase tracking-[0.2em] text-sm active:scale-95 transition-all"
              >
                Salvar Alterações
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={resetDatabase}
                  className="bg-[#f1f5f9] text-[#94a3b8] font-black py-4 rounded-[20px] uppercase tracking-widest text-[10px] hover:bg-[#e2e8f0] transition-all"
                >
                  Restaurar Padrão
                </button>
                <button 
                  onClick={() => setIsDBEditorOpen(false)}
                  className="bg-[#f1f5f9] text-[#94a3b8] font-black py-4 rounded-[20px] uppercase tracking-widest text-[10px] hover:bg-[#e2e8f0] transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {activeCell && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 transition-all">
          <div className="bg-white w-full max-w-md p-10 rounded-t-[48px] sm:rounded-[48px] shadow-2xl text-center animate-in slide-in-from-bottom-full duration-300 border-t border-[#f1f5f9]">
            <div className="text-xs font-black text-[#f58a27] uppercase tracking-[0.4em] mb-4">Vez de {gameState.players[gameState.currentPlayerIndex]?.name}</div>
            <div className="text-8xl font-black text-[#1e293b] mb-4">{activeCell.coord}</div>
            <div className="text-base font-black text-[#f58a27] mb-10 uppercase tracking-[0.2em] bg-orange-50 inline-block px-6 py-1.5 rounded-full">
              {activeCell.x} + {activeCell.y}
            </div>

            {gameState.turnTime !== 'inf' && gameState.currentTurnSeconds === 0 && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                ⚠️ TEMPO ESGOTADO!
              </div>
            )}

            <div className="grid grid-cols-2 gap-5 mb-6">
              <button 
                onClick={() => markResult(CellStatus.CORRECT)}
                className={`bg-[#22c55e] text-white font-black py-6 rounded-[32px] shadow-xl shadow-green-100 flex flex-col items-center gap-1 active:scale-95 transition-all`}
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                <span className="text-[10px] uppercase font-black tracking-[0.2em]">Acertou</span>
              </button>
              <button 
                onClick={() => markResult(CellStatus.WRONG)}
                className="bg-[#ef4444] text-white font-black py-6 rounded-[32px] shadow-xl shadow-red-100 flex flex-col items-center gap-1 active:scale-95 transition-all"
              >
                <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
                <span className="text-[10px] uppercase font-black tracking-[0.2em]">Errou</span>
              </button>
            </div>
            <button 
              onClick={() => { setActiveCell(null); }}
              className="text-[#94a3b8] font-black py-2 text-[11px] uppercase tracking-[0.3em] hover:text-[#64748b] transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* End Modal */}
      {gameState.showFinalResult && (
        <div className="fixed inset-0 bg-[#fafafa] flex flex-col items-center justify-center p-8 z-[60] text-center animate-in fade-in duration-700">
            <h3 className="text-[11px] font-black text-[#94a3b8] uppercase tracking-[0.5em] mb-16">Relatório Final</h3>
            
            <div className={`w-56 h-56 rounded-full border-[14px] ${getRank(calculateScore()).color} flex items-center justify-center mx-auto mb-12 bg-white shadow-2xl relative`}>
              <div className="absolute -top-6 bg-white px-8 py-2 rounded-full border-2 border-[#f1f5f9] shadow-sm text-xs font-black text-[#334155] tracking-widest uppercase">Mestria</div>
              <span className="text-6xl font-black text-[#1e293b]">{calculateScore()}%</span>
            </div>

            <div className="text-4xl font-black text-[#1e293b] mb-4 tracking-tight">{getRank(calculateScore()).title}</div>
            <div className="text-base font-bold text-[#64748b] mb-16 max-w-[280px] mx-auto leading-relaxed italic">"{getRank(calculateScore()).desc}"</div>
            
            <div className="bg-white border-2 border-[#f1f5f9] rounded-3xl py-5 px-12 inline-block mb-16 text-[#475569] font-black tracking-[0.2em] text-sm shadow-sm">
              TEMPO TOTAL: {formatTime(gameState.seconds)}
            </div>

            <button 
              onClick={() => setGameState(prev => ({ ...prev, view: 'config', showFinalResult: false }))}
              className="w-full max-w-xs bg-[#f58a27] text-white font-black py-6 rounded-[32px] shadow-2xl shadow-orange-200 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] text-sm"
            >
              Jogar Novamente
            </button>
        </div>
      )}

      <footer className="mt-auto pt-16 text-center">
        <p className="text-[10px] font-black text-[#cbd5e1] tracking-[0.3em] uppercase">Samuel Duarte • Design System 2.0</p>
      </footer>
    </div>
  );
};

export default App;
