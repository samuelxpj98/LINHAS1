import React, { useState, useEffect, useRef } from 'react';
import { CellStatus, GameState, Player, TheologicalInsight } from './types';
import { DB_THEOLOGY, DB_CONTEXT, RANKS } from './constants';
import { getTheologicalInsight } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    isGameActive: false,
    view: 'config',
    seconds: 0,
    gridSize: 3,
    playerCount: 2,
    turnTime: 60,
    gridX: [],
    gridY: [],
    cellStatus: {},
    players: [],
    showFinalResult: false,
  });

  const [activeCell, setActiveCell] = useState<{ coord: string; x: string; y: string } | null>(null);
  const [insight, setInsight] = useState<TheologicalInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startGame = () => {
    const { gridSize, playerCount } = gameState;
    const gridX = shuffle(DB_THEOLOGY).slice(0, gridSize);
    const gridY = shuffle(DB_CONTEXT).slice(0, gridSize);
    
    let deck: string[] = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 1; j <= gridSize; j++) {
        deck.push(`${String.fromCharCode(65 + i)}${j}`);
      }
    }
    deck = shuffle(deck);

    const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      name: `JOGADOR ${i + 1}`,
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
      gridX,
      gridY,
      cellStatus: {},
      players,
      showFinalResult: false
    }));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setGameState(prev => ({ ...prev, seconds: prev.seconds + 1 }));
    }, 1000);
  };

  const handleCellClick = (coord: string, x: string, y: string) => {
    if (!gameState.isGameActive || gameState.cellStatus[coord]) return;
    setActiveCell({ coord, x, y });
    setInsight(null);
  };

  const fetchInsight = async () => {
    if (!activeCell) return;
    setLoadingInsight(true);
    const result = await getTheologicalInsight(activeCell.x, activeCell.y);
    setInsight(result);
    setLoadingInsight(false);
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
      showFinalResult: playedCells === totalCells
    }));

    if (playedCells === totalCells && timerRef.current) {
      clearInterval(timerRef.current);
    }

    setActiveCell(null);
    setInsight(null);
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
        <h2 className="text-xl font-bold text-gray-800 mb-1">Configuração</h2>
        <p className="text-xs text-gray-400 mb-8 border-b border-gray-50 pb-4">Personalize sua partida</p>

        {/* Time per Turn */}
        <div className="mb-8">
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
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Participantes</div>
            </div>
            <button 
              onClick={() => setGameState(prev => ({ ...prev, playerCount: Math.min(8, prev.playerCount + 1) }))}
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
        INICIAR JOGO
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </button>
    </div>
  );

  const renderGame = () => (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setGameState(prev => ({ ...prev, view: 'config', isGameActive: false }))} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="bg-[#f58a27] text-white font-mono px-5 py-2 rounded-full text-xl font-bold shadow-lg shadow-orange-100">
          {formatTime(gameState.seconds)}
        </div>
        <button className="text-gray-400 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
      </div>

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
                    ${status === CellStatus.WRONG ? 'bg-red-400 border-red-500 text-white opacity-40' : ''}
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
        <p className="text-center text-[10px] text-gray-400 mb-5 uppercase font-black tracking-[0.3em]">Missões Ativas</p>
        <div className="space-y-4">
          {gameState.players.map((player) => (
            <details key={player.id} className="group bg-white border border-[#f1f5f9] rounded-[24px] overflow-hidden shadow-sm transition-all">
              <summary className="list-none flex justify-between items-center p-5 cursor-pointer select-none">
                <span className="font-black text-[#1e293b] text-sm tracking-widest">{player.name}</span>
                <span className="text-[#f58a27] group-open:rotate-180 transition-transform text-xs">▼</span>
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

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center p-6 max-w-lg mx-auto pb-12">
      <header className="w-full text-center mb-10 pt-4">
        <div className="flex justify-between items-center mb-6 text-[#94a3b8] px-2">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
           <button className="p-1"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm-8.22 4.75c-.21.1-.38.27-.47.48l-.13.3c-.22.5-.22 1.05 0 1.55l.13.3a1.5 1.5 0 00.95.95l.3.13c.5.22 1.05.22 1.55 0l.3-.13a1.5 1.5 0 00.48-.47l.1-.21c.1-.21.27-.38.48-.47l.21-.1c.21-.1.38-.27.47-.48l.13-.3c.22-.5.22-1.05 0-1.55l-.13-.3a1.5 1.5 0 00-.95-.95l-.3-.13c-.5-.22-1.05-.22-1.55 0l-.3.13a1.5 1.5 0 00-.48.47l-.1.21c-.1.21-.27.38-.48.47z"/></svg></button>
        </div>
        <h1 className="text-6xl font-black tracking-widest text-[#f58a27] mb-2 drop-shadow-sm">LINHAS</h1>
        <div className="h-1 w-14 bg-[#ffedd5] mx-auto mb-4 rounded-full"></div>
        <p className="text-[11px] font-black tracking-[0.5em] text-[#64748b] uppercase">Conexões Teológicas</p>
      </header>

      {gameState.view === 'config' ? renderConfig() : renderGame()}

      {/* Action Modal */}
      {activeCell && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 transition-all">
          <div className="bg-white w-full max-w-md p-10 rounded-t-[48px] sm:rounded-[48px] shadow-2xl text-center animate-in slide-in-from-bottom-full duration-300 border-t border-[#f1f5f9]">
            <div className="text-8xl font-black text-[#1e293b] mb-4">{activeCell.coord}</div>
            <div className="text-base font-black text-[#f58a27] mb-10 uppercase tracking-[0.2em] bg-orange-50 inline-block px-6 py-1.5 rounded-full">
              {activeCell.x} + {activeCell.y}
            </div>

            <div className="mb-10 p-8 bg-[#f8fafc] rounded-[40px] min-h-[140px] flex flex-col items-center justify-center border border-[#f1f5f9]">
              {loadingInsight ? (
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-[6px] border-[#ffedd5] border-t-[#f58a27] animate-spin"></div>
                  <span className="text-[#f58a27] text-xs font-black uppercase tracking-widest">Consultando Oráculo...</span>
                </div>
              ) : insight ? (
                <div className="text-left animate-in fade-in zoom-in-95 duration-500">
                  <p className="text-sm font-bold text-[#334155] mb-5 leading-relaxed italic tracking-tight">"{insight.explanation}"</p>
                  <div className="flex gap-4 items-start">
                    <div className="w-1.5 h-10 bg-[#f58a27] rounded-full shrink-0"></div>
                    <p className="text-[11px] font-black text-[#64748b] uppercase leading-relaxed tracking-wider">{insight.verse}</p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={fetchInsight}
                  className="bg-white text-[#f58a27] text-[11px] font-black px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-all uppercase tracking-[0.15em] border border-[#ffedd5]"
                >
                  ✨ Revelar Insight
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <button 
                onClick={() => markResult(CellStatus.CORRECT)}
                className="bg-[#22c55e] text-white font-black py-6 rounded-[32px] shadow-xl shadow-green-100 flex flex-col items-center gap-1 active:scale-95 transition-all"
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
              onClick={() => { setActiveCell(null); setInsight(null); }}
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