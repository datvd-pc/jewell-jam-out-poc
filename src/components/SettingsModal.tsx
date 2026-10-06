import { Check, Volume2, VolumeX, Vibrate, Sparkles, X } from 'lucide-react';
import React from 'react';
import { GameSettings } from '../game/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xs bg-gradient-to-b from-[#3d2766] to-[#251543] rounded-3xl p-6 border border-[#7e5cb8]/60 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#52338a]/80 hover:bg-[#6640ab] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
          <p className="text-xs text-purple-200/70 mt-0.5">Preferences & Sound</p>
        </div>

        {/* Options */}
        <div className="space-y-3.5">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#321c54]/70 border border-[#6f4ca8]/40">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-amber-300" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-semibold">Sound FX</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                settings.soundEnabled ? 'bg-amber-400 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-5.5 h-5.5 rounded-full bg-white shadow-md flex items-center justify-center">
                {settings.soundEnabled && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </div>
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#321c54]/70 border border-[#6f4ca8]/40">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-emerald-300" />
              <span className="text-sm font-semibold">Haptics</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                settings.hapticsEnabled ? 'bg-emerald-400 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-5.5 h-5.5 rounded-full bg-white shadow-md flex items-center justify-center">
                {settings.hapticsEnabled && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#321c54]/70 border border-[#6f4ca8]/40">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <span className="text-sm font-semibold">Reduced Motion</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                settings.reducedMotion ? 'bg-purple-400 justify-end' : 'bg-gray-600 justify-start'
              }`}
            >
              <div className="w-5.5 h-5.5 rounded-full bg-white shadow-md flex items-center justify-center">
                {settings.reducedMotion && <Check className="w-3.5 h-3.5 text-purple-700" />}
              </div>
            </button>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-bold text-sm tracking-wide shadow-lg active:scale-98 transition-transform cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
