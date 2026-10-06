import { ArrowRight, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface RevealOverlayProps {
  isRevealed: boolean;
  onNextLevel: () => void;
  levelNumber: number;
  onSetCustomImage?: (dataUrl: string) => void;
}

export const RevealOverlay: React.FC<RevealOverlayProps> = ({
  isRevealed,
  onNextLevel,
  levelNumber,
  onSetCustomImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('/reveal.jpg');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jewelry_jam_reveal_image');
      if (saved) {
        setImageUrl(saved);
      }
    } catch {}
  }, []);

  if (!isRevealed) return null;

  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageUrl(result);
        try {
          localStorage.setItem('jewelry_jam_reveal_image', result);
        } catch {}
        if (onSetCustomImage) {
          onSetCustomImage(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  return (
    <>
      {/* Hidden file input for uploading the user's reveal.jpg */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Fixed Full Reveal Image Layer */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`absolute inset-0 z-15 pointer-events-auto animate-fade-in overflow-hidden ${
          isDragging ? 'ring-4 ring-amber-400 ring-inset' : ''
        }`}
      >
        {/* The reveal product image */}
        <img
          src={imageUrl}
          alt="Level 3 Handbag Revealed"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none"
        />

        {/* Ambient subtle golden shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none animate-pulse opacity-60" />

        {/* Drag over indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-amber-300 font-bold text-base flex-col gap-2">
            <Upload className="w-8 h-8 animate-bounce" />
            <span>Thả file reveal.jpg vào đây</span>
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center justify-end pointer-events-none px-6">
        <div className="pointer-events-auto flex flex-col items-center gap-2.5 animate-fade-in w-full max-w-xs">
          {/* Subtle Luxury Completed Badge */}
          <div className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-300/60 shadow-lg backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs uppercase tracking-widest font-extrabold text-amber-200">
              Handbag Revealed
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 w-full justify-center">
            {/* Next Level / Play Again Button */}
            <button
              onClick={onNextLevel}
              className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-purple-950 font-extrabold text-sm sm:text-base tracking-wide shadow-2xl hover:shadow-amber-400/30 hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-100"
            >
              <span>{levelNumber === 3 ? 'Play Again' : 'Next Level'}</span>
              <ArrowRight className="w-4.5 h-4.5 text-purple-950 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Quick Upload / Replace with exact reveal.jpg file button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Kéo thả hoặc chọn file reveal.jpg từ máy"
              className="w-11 h-11 rounded-full bg-[#3d2568]/85 hover:bg-[#52338a] text-amber-300 border border-[#7e5cb8]/60 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all backdrop-blur-md shrink-0"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
