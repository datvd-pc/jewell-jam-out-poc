import { RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import React from 'react';

interface HUDProps {
  levelNumber: number;
  onReplay: () => void;
  onOpenSettings: () => void;
  ftueHint: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  levelNumber,
  onReplay,
  onOpenSettings,
  ftueHint,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none select-none px-5 pt-4 pb-2">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Level Title */}
        <div className="pointer-events-auto flex items-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Level {levelNumber}
          </h1>
        </div>

        {/* Action Buttons: Replay & Settings */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Replay Button */}
          <button
            onClick={onReplay}
            aria-label="Replay level"
            className="w-11 h-11 rounded-full bg-[#462d73]/90 hover:bg-[#56388f] active:scale-95 transition-transform flex items-center justify-center border border-[#7e5cb8]/60 shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-white stroke-[2.4]" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Game settings"
            className="w-11 h-11 rounded-full bg-[#462d73]/90 hover:bg-[#56388f] active:scale-95 transition-transform flex items-center justify-center border border-[#7e5cb8]/60 shadow-lg cursor-pointer"
          >
            <SettingsIcon className="w-5 h-5 text-white stroke-[2.4]" />
          </button>
        </div>
      </div>

      {/* FTUE Hint banner if present */}
      {ftueHint && (
        <div className="mt-3 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#2a174c]/85 border border-[#8b65ce]/50 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md animate-bounce">
            {ftueHint}
          </span>
        </div>
      )}
    </header>
  );
};
