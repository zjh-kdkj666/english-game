import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '../types';
import { Sword, Heart, Skull, Volume2 } from 'lucide-react';

interface Props {
  words: VocabularyWord[];
  onExit: () => void;
}

const RPGGame: React.FC<Props> = ({ words, onExit }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [heroHp, setHeroHp] = useState(3);
  const [monsterHp, setMonsterHp] = useState(100); // Visual only
  const [feedback, setFeedback] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);

  const currentWord = words[currentWordIndex];

  const playAudio = (text: string) => {
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  useEffect(() => {
    if (currentWord) {
      // Auto play audio when monster appears (optional, maybe too noisy, let's keep it click only or play once)
      // playAudio(currentWord.word);
      
      // Generate options: 1 correct + 3 random distractors from other words (or fake ones if not enough)
      const distractors = words
        .filter((_, i) => i !== currentWordIndex)
        .map(w => w.chinese)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      const allOptions = [...distractors, currentWord.chinese].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setMonsterHp(100);
    }
  }, [currentWord, currentWordIndex, words]);

  const handleAttack = (selectedMeaning: string) => {
    if (selectedMeaning === currentWord.chinese) {
      // Correct
      playAudio(currentWord.word); // Play audio on success too
      setMonsterHp(0);
      setFeedback("暴击! 🔥");
      setTimeout(() => {
        setFeedback(null);
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
        } else {
          // Win
          alert("胜利！你打败了所有的单词怪兽！");
          onExit();
        }
      }, 1500);
    } else {
      // Wrong
      setHeroHp(prev => prev - 1);
      setFeedback("未命中！怪兽攻击了你！🛡️");
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  if (heroHp <= 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-pulse">
        <Skull size={64} className="text-red-500" />
        <h2 className="text-4xl font-bold text-red-600">游戏结束</h2>
        <button onClick={onExit} className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg">重试</button>
      </div>
    );
  }

  if (!currentWord) return <div>正在加载地牢...</div>;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 relative">
      {/* HUD */}
      <div className="flex justify-between items-center mb-8 bg-slate-800 text-white p-4 rounded-xl shadow-lg border-b-4 border-slate-900">
        <div className="flex items-center space-x-2">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">🦸</div>
          <div className="flex space-x-1">
            {[...Array(heroHp)].map((_, i) => <Heart key={i} className="fill-red-500 text-red-500" />)}
          </div>
        </div>
        <div className="text-xl font-bold font-mono">关卡 {currentWordIndex + 1} / {words.length}</div>
      </div>

      {/* Battle Scene */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 relative">
        
        {/* Monster */}
        <div className={`transition-all duration-500 ${monsterHp === 0 ? 'scale-0 opacity-0 rotate-180' : 'scale-100'}`}>
          <div 
            className="w-56 h-56 bg-purple-100 rounded-full flex flex-col items-center justify-center border-8 border-purple-300 shadow-2xl relative overflow-visible cursor-pointer hover:scale-105 transition"
            onClick={() => playAudio(currentWord.word)}
          >
            <div className="absolute -top-10 text-6xl animate-bounce-short">👾</div>
            <h2 className="text-3xl font-extrabold text-purple-900 mt-8 mb-2 flex items-center gap-2">
                {currentWord.word}
                <Volume2 size={24} className="text-purple-400" />
            </h2>
            <p className="text-xs text-purple-600 max-w-[80%] text-center">{currentWord.definition}</p>
            <div className="mt-2 text-xs font-bold text-purple-400 uppercase tracking-widest">点击发音</div>
          </div>
        </div>

        {/* Feedback Overlay */}
        {feedback && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
             <div className="bg-yellow-400 text-red-900 font-black text-3xl px-6 py-4 rounded-xl shadow-xl border-4 border-yellow-200 transform -rotate-6">
                {feedback}
             </div>
          </div>
        )}

        {/* Controls */}
        <div className="w-full grid grid-cols-2 gap-4 mt-8">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAttack(opt)}
              className="bg-white hover:bg-blue-50 active:bg-blue-200 border-b-4 border-blue-200 text-blue-800 font-bold text-lg py-6 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Sword size={20} className="text-blue-400" />
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RPGGame;