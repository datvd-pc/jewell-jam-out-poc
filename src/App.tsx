/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { DebugPanel } from './components/DebugPanel';
import { HUD } from './components/HUD';
import { RevealOverlay } from './components/RevealOverlay';
import { SettingsModal } from './components/SettingsModal';
import { GameEngine } from './game/GameEngine';
import { GameSettings, GameState, LevelData, Piece } from './game/types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React UI states
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [remainingPieces, setRemainingPieces] = useState<Piece[]>([]);
  const [ftueHint, setFtueHint] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    reducedMotion: false,
  });
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isDebugGrid, setIsDebugGrid] = useState(false);

  // Initialize GameEngine & Responsive Resize
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Check query parameters
    const params = new URLSearchParams(window.location.search);
    const initialLevelParam = parseInt(params.get('level') || '1', 10);
    const initialLevelId = isNaN(initialLevelParam) ? 1 : initialLevelParam;
    const debugParam = params.get('debug') === '1';
    setIsDebugMode(debugParam);

    const engine = new GameEngine(canvasRef.current, initialLevelId, {
      onLevelChanged: (lvl) => {
        setCurrentLevel(lvl);
        setRemainingPieces(lvl.pieces);
      },
      onStateChanged: (state) => {
        setGameState(state);
      },
      onFtueHint: (hint) => {
        setFtueHint(hint);
      },
    });

    engine.isDebug = debugParam;
    engineRef.current = engine;
    setCurrentLevel(engine.getCurrentLevel());
    setRemainingPieces(engine.getRemainingPieces());
    setSettings(engine.getSettings());

    // Resize handler
    const updateCanvasSize = () => {
      if (!containerRef.current || !canvasRef.current || !engineRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      engineRef.current.resize(clientWidth, clientHeight);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync remaining pieces periodically when pieces are removed
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setRemainingPieces(engineRef.current.getRemainingPieces());
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Pointer Tap Handler on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    engineRef.current.handlePointerTap(e.clientX, e.clientY);
  };

  const handleReplay = () => {
    if (!engineRef.current) return;
    engineRef.current.replay();
    setRemainingPieces(engineRef.current.getRemainingPieces());
  };

  const handleNextLevel = () => {
    if (!engineRef.current) return;
    engineRef.current.nextLevel();
  };

  const handleSelectLevel = (lvlId: number) => {
    if (!engineRef.current) return;
    engineRef.current.setLevel(lvlId);
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    if (!engineRef.current) return;
    engineRef.current.updateSettings(partial);
    setSettings(engineRef.current.getSettings());
  };

  const handleToggleDebugGrid = () => {
    if (!engineRef.current) return;
    engineRef.current.isDebug = !isDebugGrid;
    setIsDebugGrid(!isDebugGrid);
  };

  const handleTriggerAutoSolve = () => {
    if (!engineRef.current) return;
    engineRef.current.triggerAutoSolve();
  };

  return (
    <main className="w-screen h-screen bg-[#170e2b] flex items-center justify-center overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 9:16 Portrait Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-[480px] max-h-[853px] aspect-[9/16] bg-[#251745] overflow-hidden shadow-2xl flex items-center justify-center touch-none select-none"
      >
        {/* Gameplay Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className="w-full h-full block cursor-pointer touch-none"
        />

        {/* HUD (Level Indicator, Replay, Settings) */}
        {currentLevel && (
          <HUD
            levelNumber={currentLevel.id}
            onReplay={handleReplay}
            onOpenSettings={() => setIsSettingsOpen(true)}
            ftueHint={ftueHint}
          />
        )}

        {/* Level Complete Handbag Reveal Overlay */}
        {currentLevel && (
          <RevealOverlay
            isRevealed={gameState === 'COMPLETE' || gameState === 'REVEALING'}
            onNextLevel={handleNextLevel}
            levelNumber={currentLevel.id}
            onSetCustomImage={(dataUrl) => {
              if (engineRef.current) {
                engineRef.current.setRevealImageData(dataUrl);
              }
            }}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Debug Inspector Tool */}
      {(isDebugMode || window.location.search.includes('debug=1')) && currentLevel && (
        <DebugPanel
          currentLevel={currentLevel}
          remainingPieces={remainingPieces}
          onSelectLevel={handleSelectLevel}
          onTriggerAutoSolve={handleTriggerAutoSolve}
          isDebugGrid={isDebugGrid}
          onToggleDebugGrid={handleToggleDebugGrid}
        />
      )}
    </main>
  );
}
