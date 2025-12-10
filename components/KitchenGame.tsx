import React, { useState, useEffect } from 'react';
import { MatchingPair } from '../types';
import { Trophy, Shuffle, Volume2, AlertCircle, X, ArrowRight, Star } from 'lucide-react';

interface Props {
  pairs: MatchingPair[];
  onExit: () => void;
}

interface Card {
  id: string; // Unique ID for the card instance
  text: string;
  type: 'EN' | 'CN';
  matchId: string; // The ID of the pair it belongs to
  state: 'idle' | 'selected' | 'matched' | 'wrong';
}

const PAIRS_PER_LEVEL = 6;

const MatchingGame: React.FC<Props> = ({ pairs = [], onExit }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Game State
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelMatchedCount, setLevelMatchedCount] = useState(0); // Matched in THIS level
  const [totalScore, setTotalScore] = useState(0);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);

  // Computed
  const totalLevels = Math.ceil((pairs?.length || 0) / PAIRS_PER_LEVEL);

  // Initialize Level
  useEffect(() => {
    if (pairs && pairs.length > 0) {
        startLevel(currentLevel);
    }
  }, [pairs, currentLevel]);

  const startLevel = (levelIdx: number) => {
    if (!pairs || pairs.length === 0) return;

    // Calculate slice for current level
    const startIndex = (levelIdx - 1) * PAIRS_PER_LEVEL;
    const endIndex = Math.min(startIndex + PAIRS_PER_LEVEL, pairs.length);
    const levelPairs = pairs.slice(startIndex, endIndex);
    
    const newCards: Card[] = [];
    levelPairs.forEach((pair, idx) => {
        const uniqueSuffix = `${levelIdx}-${idx}`;
        newCards.push({
            id: `en-${uniqueSuffix}`,
            text: pair.english,
            type: 'EN',
            matchId: pair.id || `pair-${uniqueSuffix}`,
            state: 'idle'
        });
        newCards.push({
            id: `cn-${uniqueSuffix}`,
            text: pair.chinese,
            type: 'CN',
            matchId: pair.id || `pair-${uniqueSuffix}`,
            state: 'idle'
        });
    });

    // Shuffle
    setCards(newCards.sort(() => 0.5 - Math.random()));
    setLevelMatchedCount(0);
    setSelectedCard(null);
    setIsLevelComplete(false);
  };

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
    if (text.length > 50) { speakNative(text); return; }
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.play().catch(() => speakNative(text));
  };

  const handleCardClick = (clickedCard: Card) => {
    if (clickedCard.state === 'matched' || clickedCard.state === 'wrong') return;
    
    if (selectedCard && selectedCard.id === clickedCard.id) {
        setSelectedCard(null);
        setCards(prev => prev.map(c => c.id === clickedCard.id ? { ...c, state: 'idle' } : c));
        return;
    }

    if (clickedCard.type === 'EN') {
        playAudio(clickedCard.text);
    }

    setCards(prev => prev.map(c => c.id === clickedCard.id ? { ...c, state: 'selected' } : c));

    if (!selectedCard) {
        setSelectedCard(clickedCard);
    } else {
        if (selectedCard.matchId === clickedCard.matchId) {
            handleMatch(selectedCard.id, clickedCard.id);
        } else {
            handleMismatch(selectedCard.id, clickedCard.id);
        }
    }
  };

  const handleMatch = (id1: string, id2: string) => {
    setCards(prev => prev.map(c => 
        (c.id === id1 || c.id === id2) ? { ...c, state: 'matched' } : c
    ));
    setTotalScore(prev => prev + 100);
    setSelectedCard(null);

    // Update matched count for this level
    const newMatchedCount = levelMatchedCount + 1;
    setLevelMatchedCount(newMatchedCount);

    // Check Level Completion
    // Total cards is cards.length, pairs is cards.length/2
    if (newMatchedCount === cards.length / 2) {
        setTimeout(() => {
            if (currentLevel < totalLevels) {
                setIsLevelComplete(true);
            } else {
                setIsGameWon(true);
            }
        }, 800);
    }
  };

  const handleMismatch = (id1: string, id2: string) => {
    setCards(prev => prev.map(c => 
        (c.id === id1 || c.id === id2) ? { ...c, state: 'wrong' } : c
    ));

    setTimeout(() => {
        setCards(prev => prev.map(c => 
            (c.id === id1 || c.id === id2) ? { ...c, state: 'idle' } : c
        ));
        setSelectedCard(null);
    }, 800);
  };

  const handleNextLevel = () => {
      setCurrentLevel(prev => prev + 1);
  };

  const handleReplay = () => {
      setTotalScore(0);
      setCurrentLevel(1);
      setIsGameWon(false);
      // startLevel(1) will trigger via useEffect
  };

  // Safe Check
  if (!pairs || pairs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-400 gap-4">
             <AlertCircle size={48} />
             <p className="font-bold">暂无配对单词，请重新生成课程。</p>
             <button onClick={onExit} className="text-purple-500 underline">返回</button>
        </div>
      );
  }

  // Final Win Screen
  if (isGameWon) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-xl animate-fade-in p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/confetti.png')] opacity-20"></div>
              <Trophy size={80} className="text-yellow-300 mb-6 drop-shadow-lg animate-bounce" />
              <h2 className="text-4xl font-black mb-2">通关成功！</h2>
              <p className="text-xl mb-8 opacity-90">你完成了所有 {totalLevels} 个关卡！</p>
              <div className="text-6xl font-black mb-8 drop-shadow-md">{totalScore} 分</div>
              <div className="flex gap-4 z-10">
                 <button onClick={handleReplay} className="bg-white text-orange-600 px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2">
                    <Shuffle size={20}/> 再玩一次
                 </button>
                 <button onClick={onExit} className="bg-black/20 text-white px-8 py-4 rounded-full font-bold hover:bg-black/30 transition">
                    退出
                 </button>
              </div>
          </div>
      );
  }

  // Level Complete Intermission
  if (isLevelComplete) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-slate-50 relative animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4 border-b-8 border-purple-100">
                  <div className="flex justify-center mb-4">
                      <div className="flex gap-1">
                          <Star className="text-yellow-400 fill-yellow-400 w-10 h-10 animate-bounce" style={{ animationDelay: '0s' }} />
                          <Star className="text-yellow-400 fill-yellow-400 w-12 h-12 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <Star className="text-yellow-400 fill-yellow-400 w-10 h-10 animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2">关卡 {currentLevel} 完成!</h2>
                  <p className="text-slate-500 mb-8">休息一下，准备好下一关了吗？</p>
                  <button 
                    onClick={handleNextLevel}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                      下一关 <ArrowRight size={24}/>
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden rounded-xl font-sans p-4">
       {/* Header */}
       <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-shrink-0">
           <div className="flex items-center gap-4">
               <div className="flex flex-col leading-none">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LEVEL</span>
                   <span className="text-xl font-black text-purple-600">{currentLevel} <span className="text-slate-300">/ {totalLevels}</span></span>
               </div>
               <div className="h-8 w-[1px] bg-slate-100"></div>
               <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm">
                        {levelMatchedCount}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">当前进度</span>
               </div>
           </div>
           <div className="text-xl font-black text-slate-700 font-mono tracking-tight">{totalScore}</div>
       </div>

       {/* Grid */}
       <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center">
           <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-2xl">
               {cards.map(card => {
                   let baseStyle = "relative aspect-[4/3] rounded-2xl font-bold text-sm sm:text-base shadow-sm transition-all flex flex-col items-center justify-center p-2 leading-tight break-words select-none cursor-pointer transform duration-200 border-b-4";
                   let colorStyle = "bg-white border-slate-200 text-slate-600 hover:border-b-0 hover:translate-y-1 hover:shadow-md";
                   
                   if (card.state === 'selected') {
                       colorStyle = "bg-purple-500 border-purple-700 text-white translate-y-1 border-b-0 ring-4 ring-purple-200 scale-95";
                   } else if (card.state === 'wrong') {
                       colorStyle = "bg-red-500 border-red-700 text-white animate-shake";
                   } else if (card.state === 'matched') {
                       return <div key={card.id} className="aspect-[4/3] opacity-0"></div>;
                   }

                   return (
                       <button
                           key={card.id}
                           onClick={() => handleCardClick(card)}
                           className={`${baseStyle} ${colorStyle}`}
                       >
                           {card.type === 'EN' && (
                               <span className="absolute top-1 left-2 text-[10px] opacity-60 font-black tracking-tighter">EN</span>
                           )}
                           <span className="z-10">{card.text}</span>
                           
                           {card.state === 'wrong' && <X className="absolute opacity-50 w-12 h-12"/>}
                           {card.state === 'selected' && card.type === 'EN' && <Volume2 size={16} className="absolute bottom-2 opacity-80"/>}
                       </button>
                   );
               })}
           </div>
       </div>

       <style>{`
         @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px) rotate(-2deg); }
            40% { transform: translateX(4px) rotate(2deg); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
         }
         .animate-shake { animation: shake 0.4s ease-in-out; }
       `}</style>
    </div>
  );
};

export default MatchingGame;