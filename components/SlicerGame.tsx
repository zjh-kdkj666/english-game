import React, { useState, useEffect, useRef } from 'react';
import { SlicerRound, SlicerItem } from '../types';
import { Play, Scissors, Bomb, Star } from 'lucide-react';

interface Props {
  rounds: SlicerRound[];
  onExit: () => void;
}

interface FloatingItem extends SlicerItem {
  uid: number;
  x: number; // percentage
  y: number; // percentage
  velocity: number;
  rotation: number;
  isSliced: boolean;
}

const SlicerGame: React.FC<Props> = ({ rounds, onExit }) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [items, setItems] = useState<FloatingItem[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [combo, setCombo] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  // Using number for browser compatibility instead of NodeJS.Timeout
  const spawnTimerRef = useRef<number>();
  const nextItemUid = useRef(0);

  const currentRound = rounds[roundIndex];

  const playAudio = (text: string) => {
    // Simple beep for slice, or read word? Reading word is better for learning
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.play().catch(() => {});
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setLives(3);
    setItems([]);
  };

  useEffect(() => {
    if (!gameActive || !currentRound) return;

    // Spawn logic
    const spawnItem = () => {
      if (Math.random() > 0.3) { // 70% chance to spawn
        const template = currentRound.items[Math.floor(Math.random() * currentRound.items.length)];
        const newItem: FloatingItem = {
            ...template,
            uid: nextItemUid.current++,
            x: 10 + Math.random() * 80, // 10-90% width
            y: 110, // Start below screen
            velocity: 0.5 + Math.random() * 0.5,
            rotation: Math.random() * 360,
            isSliced: false
        };
        setItems(prev => [...prev, newItem]);
      }
    };

    spawnTimerRef.current = window.setInterval(spawnItem, 1000); // Spawn every second

    // Physics loop
    const update = () => {
        setItems(prevItems => {
            return prevItems
                .map(item => ({
                    ...item,
                    y: item.y - item.velocity, // Move up
                    rotation: item.rotation + 1
                }))
                .filter(item => item.y > -20); // Remove if went off top
        });
        requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
        if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameActive, currentRound]);

  // Check win condition (e.g. survival for 30s or score limit) - let's use Score Limit for simplicity
  useEffect(() => {
    if (score >= 10 && roundIndex < rounds.length - 1) {
       // Next round
       setGameActive(false);
       setTimeout(() => {
           setRoundIndex(prev => prev + 1);
           alert("下一关！");
           startGame();
       }, 500);
    } else if (score >= 10 && roundIndex === rounds.length - 1) {
        setGameActive(false);
        alert("通关！你的反应太快了！");
        onExit();
    }
  }, [score, roundIndex, rounds.length, onExit]);

  useEffect(() => {
      if (lives <= 0) {
          setGameActive(false);
      }
  }, [lives]);

  const handleSlice = (item: FloatingItem) => {
    if (item.isSliced) return;

    // Visual slice effect update
    setItems(prev => prev.map(i => i.uid === item.uid ? { ...i, isSliced: true } : i));
    
    playAudio(item.text);

    if (item.isTarget) {
        // Correct
        setScore(prev => prev + 1);
        setCombo(prev => prev + 1);
    } else {
        // Wrong
        setLives(prev => prev - 1);
        setCombo(0);
        // Maybe vibration
        if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  if (!gameActive && lives > 0 && score === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white space-y-6">
              <h2 className="text-4xl font-bold text-yellow-400">节奏切切乐</h2>
              <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 max-w-sm text-center">
                <p className="text-gray-400 mb-2">本关规则</p>
                <p className="text-2xl font-bold">{currentRound?.rule}</p>
                <p className="text-sm text-gray-500 mt-4">看到符合规则的单词，切碎它！<br/>不要切错哦！</p>
              </div>
              <button onClick={startGame} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-bold text-xl shadow-[0_0_20px_rgba(236,72,153,0.5)] flex items-center gap-2">
                  <Play fill="currentColor"/> 开始游戏
              </button>
          </div>
      );
  }

  if (lives <= 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white space-y-6">
            <h2 className="text-4xl font-bold text-red-500">游戏结束</h2>
            <p>别灰心，再试一次！</p>
            <button onClick={startGame} className="bg-blue-500 px-6 py-3 rounded-full font-bold">重试</button>
            <button onClick={onExit} className="text-gray-400 underline">退出</button>
        </div>
      );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 relative overflow-hidden cursor-crosshair select-none">
      {/* HUD */}
      <div className="absolute top-4 left-4 z-20 text-white font-mono text-xl">
          分数: <span className="text-yellow-400">{score}</span>
      </div>
      <div className="absolute top-4 right-4 z-20 flex gap-1">
          {[...Array(3)].map((_, i) => (
              <Bomb key={i} className={i < lives ? "text-red-500 fill-red-500" : "text-gray-700"} />
          ))}
      </div>
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-slate-800/80 px-4 py-1 rounded-full text-white text-sm border border-slate-600 z-10">
          目标: {currentRound.rule}
      </div>

      {/* Game Area */}
      {items.map(item => (
          <div
            key={item.uid}
            onPointerDown={() => handleSlice(item)}
            className={`absolute px-4 py-2 rounded-lg font-bold text-xl shadow-lg transition-transform duration-100 flex items-center gap-2 cursor-pointer
                ${item.isSliced 
                    ? 'scale-110 opacity-0 pointer-events-none text-green-400' 
                    : item.isTarget ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-700 text-gray-300 border border-gray-500'}`}
            style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `rotate(${item.rotation}deg) scale(${item.isSliced ? 1.5 : 1})`
            }}
          >
             {item.isSliced && <Scissors size={20} className="text-white"/>}
             {item.text}
          </div>
      ))}
    </div>
  );
};

export default SlicerGame;