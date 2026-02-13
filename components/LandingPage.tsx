import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations
    setTimeout(() => setMounted(true), 100);
  }, []);

  const handleSwipe = () => {
    setIsExiting(true);
    setTimeout(onEnter, 800); // Wait for exit animation
  };

  return (
    <div 
      onClick={handleSwipe}
      className={`fixed inset-0 bg-paper flex flex-col items-center justify-between overflow-hidden cursor-pointer transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] z-50 ${isExiting ? '-translate-y-full' : 'translate-y-0'}`}
    >
      {/* Visual Element 1: Rotating Text Ring (Top Left) */}
      <div className={`absolute -top-20 -left-20 md:-top-32 md:-left-32 w-[300px] h-[300px] md:w-[600px] md:h-[600px] opacity-10 transition-opacity duration-1000 ${mounted ? 'opacity-10' : 'opacity-0'}`}>
        <div className="w-full h-full animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
            <text className="text-[10px] md:text-[8px] font-mono uppercase tracking-[0.25em] fill-ink">
              <textPath href="#curve">
                • Capture Thoughts • Leave Traces • Whisper • Echo • Listen • 
              </textPath>
            </text>
          </svg>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center relative w-full px-6 z-10">
        
        {/* Typography Group */}
        <div className={`text-center relative transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          <div className="flex flex-col items-center leading-none">
            {/* "Whisper" - Italic Serif */}
            <h1 className="font-serif italic text-6xl md:text-9xl text-ink font-light tracking-tight z-10">
              Whisper
            </h1>
            
            {/* "&" - Small connection */}
            <span className="font-serif text-3xl md:text-5xl text-sage my-2 md:my-4 italic">&</span>
            
            {/* "Echo" - Bold Serif */}
            <h1 className="font-serif text-7xl md:text-[10rem] text-ink font-normal tracking-tighter z-10">
              Echo
            </h1>
          </div>
          
          <div className="mt-12 flex flex-col items-center gap-6">
             <div className="h-px w-16 bg-ink/30"></div>
             <p className="text-lg md:text-2xl font-light tracking-[0.3em] text-ink/80 uppercase">
               让声音留下痕迹
             </p>
          </div>
        </div>

        {/* Visual Element 2: Floating Tape/Waveform Strip (Bottom Right) */}
        {/* Adjusted position to be lower and further right to avoid text overlap */}
        <div className={`absolute bottom-[8%] -right-[15%] md:bottom-[5%] md:right-[5%] transition-all duration-1000 delay-500 transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-40 opacity-0'}`}>
           <div className="bg-ink text-paper py-3 md:py-4 px-12 md:px-24 rounded-full shadow-2xl rotate-[-6deg] flex items-center gap-6 border-2 border-paper outline outline-1 outline-ink animate-float hover:rotate-[-3deg] transition-transform duration-500">
              {/* Animated Waveform Bars */}
              <div className="flex gap-1.5 items-center h-6 md:h-8">
                {[...Array(8)].map((_,i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-paper rounded-full animate-[pulse_1s_ease-in-out_infinite]" 
                    style={{
                      height: `${Math.max(40, Math.random() * 100)}%`, 
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
              
              <span className="font-mono text-xs md:text-sm tracking-widest whitespace-nowrap">
                AUDIO ARCHIVE
              </span>

              {/* More Waveform Bars */}
               <div className="flex gap-1.5 items-center h-6 md:h-8">
                {[...Array(5)].map((_,i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-paper rounded-full animate-[pulse_1s_ease-in-out_infinite]" 
                    style={{
                      height: `${Math.max(40, Math.random() * 100)}%`, 
                      animationDelay: `${(i + 8) * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
           </div>
        </div>

      </div>

      {/* Footer / CTA */}
      <div className={`mb-12 flex flex-col items-center gap-3 transition-opacity duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[10px] md:text-xs font-mono text-subtext tracking-[0.2em] uppercase">向上滑动进入</span>
        <div className="w-px h-16 bg-gradient-to-b from-ink/0 via-ink/40 to-ink/0">
           <div className="w-full h-full animate-[bounce_2s_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;