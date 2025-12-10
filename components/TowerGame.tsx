import React, { useState, useEffect, useRef } from 'react';
import { TowerWord } from '../types';
import { Shield, Target, Skull } from 'lucide-react';

interface Props {
  words: TowerWord[];
  onExit: () => void;
}

const TowerGame: React.FC<Props> = ({ words, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [monsterPos, setMonsterPos] = useState(0); // 0 to 100% (right to left)
  const [baseHp, setBaseHp] = useState(3);
  const [isFiring, setIsFiring] = useState(false);
  
  const currentWord = words[currentIndex];
  const timerRef = useRef<number | null>(null);

  const speakNative = (text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices.find(v => v.lang === 'en-US');
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
    }
  };

  const playAudio = (text: string) => {
    if (text.length > 50) {
        speakNative(text);
        return;
    }
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.onerror = () => speakNative(text);
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => speakNative(text));
    }
  };

  useEffect(() => {
    if (!currentWord) return;
    setMonsterPos(0);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = window.setInterval(() => {
      setMonsterPos(prev => {
        if (prev >= 90) {
          handleMonsterHit();
          return 0;
        }
        return prev + 0.3;
      });
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, currentWord]);

  const handleMonsterHit = () => {
    playAudio("Oh no");
    setBaseHp(prev => {
      const newHp = prev - 1;
      if (newHp <= 0 && timerRef.current) clearInterval(timerRef.current);
      return newHp;
    });
    setMonsterPos(0);
  };

  const handleOptionClick = (selectedOption: string) => {
    if (isFiring) return;
    if (selectedOption === currentWord.english) {
      setIsFiring(true);
      playAudio(currentWord.english);
      setTimeout(() => {
        setIsFiring(false);
        if (currentIndex < words.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          alert("胜利！你保卫了基地！");
          onExit();
        }
      }, 500);
    } else {
      const audio = new Audio('https://dict.youdao.com/dictvoice?audio=wrong&type=2');
      audio.play().catch(() => {});
      setMonsterPos(prev => Math.min(prev + 15, 90));
    }
  };

  if (baseHp <= 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-center space-y-6 bg-red-50 rounded-xl animate-fade-in">
        <Skull size={64} className="text-red-500" />
        <h2 className="text-4xl font-bold text-red-600">基地被攻破了!</h2>
        <button onClick={onExit} className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg">退出</button>
      </div>
    );
  }

  if (!currentWord) return <div>准备战斗...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative rounded-xl font-sans">
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/50 p-2 rounded-lg text-white border border-slate-600">
        <Shield className="text-blue-400 fill-blue-400" />
        <span className="text-xl font-bold">{baseHp}</span>
      </div>
      <div className="absolute top-4 right-4 z-20 text-slate-400 font-mono">
        WAVE {currentIndex + 1} / {words.length}
      </div>

      <div className="flex-1 relative flex items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="absolute left-0 bottom-20 w-32 h-32 z-10 flex flex-col items-center">
            <div className={`text-6xl transition-transform duration-200 ${isFiring ? 'scale-125 -rotate-12' : 'scale-100'}`}>🏰</div>
            <div className="w-16 h-8 bg-slate-700 rounded-t-lg mt-2 relative">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-12 bg-gray-500 origin-bottom transition-transform ${isFiring ? '-rotate-45' : 'rotate-0'}`}></div>
            </div>
        </div>
        {isFiring && <div className="absolute left-24 bottom-32 w-6 h-6 bg-yellow-400 rounded-full shadow-[0_0_15px_yellow] animate-ping z-30"></div>}
        <div className="w-full h-4 bg-slate-700 absolute bottom-24 border-t border-b border-slate-600"></div>
        <div className="absolute bottom-24 transition-all duration-75 ease-linear flex flex-col items-center z-10" style={{ right: `${100 - monsterPos}%`, transform: 'translateX(50%)' }}>
          <div className="w-12 h-2 bg-red-900 rounded mb-1 overflow-hidden"><div className="h-full bg-red-500 w-full"></div></div>
          <div className="text-7xl drop-shadow-lg filter">👾</div>
          <div className="bg-red-600 text-white text-lg font-bold px-3 py-1 rounded-full mt-2 whitespace-nowrap border-2 border-red-400 shadow-lg">{currentWord.chinese}</div>
        </div>
      </div>

      <div className="h-2/5 bg-slate-800 border-t-4 border-slate-700 p-4 flex flex-col items-center justify-center">
        <div className="text-slate-400 mb-2 text-sm uppercase tracking-widest flex items-center gap-2">
             <Target size={16} /> 选择正确的单词攻击
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl h-full pb-2">
          {currentWord.options.map((option, idx) => (
            <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                className="bg-white hover:bg-blue-50 active:bg-blue-200 border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 rounded-xl text-lg font-bold text-slate-800 shadow-lg transition-all p-2 flex items-center justify-center text-center whitespace-normal break-words leading-tight"
            >
                {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TowerGame;