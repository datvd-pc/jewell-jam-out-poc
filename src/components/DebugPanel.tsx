import { Bug, CheckCircle, Play, RefreshCw, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { runAllLogicTests, TestResult } from '../game/tests';
import { ALL_LEVELS } from '../game/levels';
import { solveLevel } from '../game/simulation';
import { LevelData, Piece } from '../game/types';

interface DebugPanelProps {
  currentLevel: LevelData;
  remainingPieces: Piece[];
  onSelectLevel: (lvlId: number) => void;
  onTriggerAutoSolve: () => void;
  isDebugGrid: boolean;
  onToggleDebugGrid: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  currentLevel,
  remainingPieces,
  onSelectLevel,
  onTriggerAutoSolve,
  isDebugGrid,
  onToggleDebugGrid,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  // Compute solution order for current level
  const solutionOrder = solveLevel(currentLevel);

  const handleRunTests = () => {
    const report = runAllLogicTests();
    setTestResults(report.results);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Debug Panel"
        className="fixed bottom-4 left-4 z-50 p-2 rounded-full bg-black/80 hover:bg-black text-amber-300 border border-amber-400/50 shadow-xl cursor-pointer text-xs flex items-center gap-1.5"
      >
        <Bug className="w-4 h-4" />
        <span className="font-mono font-bold">Debug</span>
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] z-50 bg-[#160c2b]/95 backdrop-blur-md border-r border-[#6943a8]/50 shadow-2xl p-4 text-xs font-mono text-purple-100 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-purple-800/60 mb-3">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
              <Bug className="w-4 h-4" /> Debug Inspector
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200"
            >
              ✕
            </button>
          </div>

          {/* Quick Level Selector */}
          <div className="mb-4">
            <span className="text-[11px] uppercase tracking-wider text-purple-300 font-bold block mb-1.5">
              Jump to Level
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`py-1.5 rounded text-center font-bold transition-colors cursor-pointer ${
                    currentLevel.id === lvl.id
                      ? 'bg-amber-400 text-purple-950 shadow'
                      : 'bg-[#29174b] text-purple-200 hover:bg-[#382069]'
                  }`}
                >
                  Lvl {lvl.id}
                </button>
              ))}
            </div>
          </div>

          {/* Solution & Solvability status */}
          <div className="mb-4 p-2.5 rounded bg-[#21123d] border border-purple-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-purple-200">Solvability:</span>
              <span className="text-emerald-400 font-bold">
                {solutionOrder ? 'SOLVABLE' : 'UNSOLVABLE'}
              </span>
            </div>
            <div className="text-[10px] text-purple-300/80 break-words">
              Order: {solutionOrder ? solutionOrder.join(' → ') : 'None'}
            </div>
            <div className="mt-2 text-[11px] text-purple-200">
              Remaining pieces: <span className="font-bold">{remainingPieces.length}</span> /{' '}
              {currentLevel.pieces.length}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 mb-4">
            <button
              onClick={onToggleDebugGrid}
              className="w-full py-2 px-3 rounded bg-[#2a174f] hover:bg-[#3b216f] border border-purple-600/40 text-purple-100 flex items-center justify-between cursor-pointer"
            >
              <span>Toggle Grid Overlay</span>
              <span className={isDebugGrid ? 'text-amber-300 font-bold' : 'text-gray-400'}>
                {isDebugGrid ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              onClick={onTriggerAutoSolve}
              className="w-full py-2 px-3 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Auto-Solve</span>
            </button>

            <button
              onClick={handleRunTests}
              className="w-full py-2 px-3 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run 12 Required Tests</span>
            </button>
          </div>

          {/* Test results output */}
          {testResults && (
            <div className="mt-3 p-2 rounded bg-black/60 border border-purple-800/80 max-h-60 overflow-y-auto">
              <div className="font-bold text-amber-300 mb-1.5 flex items-center justify-between text-[11px]">
                <span>Test Suite Results:</span>
                <span
                  className={
                    testResults.every((t) => t.passed) ? 'text-emerald-400' : 'text-red-400'
                  }
                >
                  {testResults.filter((t) => t.passed).length}/{testResults.length} Passed
                </span>
              </div>
              <div className="space-y-1">
                {testResults.map((t) => (
                  <div key={t.id} className="flex items-start gap-1.5 text-[10px]">
                    {t.passed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={t.passed ? 'text-purple-200' : 'text-red-300'}>
                        #{t.id} {t.name}
                      </span>
                      {t.message && (
                        <div className="text-[9px] text-gray-400 break-words">{t.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
