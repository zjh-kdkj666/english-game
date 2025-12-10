import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { Search, Key, CheckCircle, XCircle, Volume2 } from 'lucide-react';

interface Props {
  questions: QuizQuestion[];
  onExit: () => void;
}

const DetectiveGame: React.FC<Props> = ({ questions, onExit }) => {
  const [solvedCount, setSolvedCount] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Simple hardcoded visual positions for "clues" to make it feel like a room
  const cluePositions = [
    { top: '20%', left: '10%', icon: '📚' }, // Bookshelf
    { top: '60%', left: '70%', icon: '🧳' }, // Chest
    { top: '40%', left: '40%', icon: '🖼️' }, // Painting
    { top: '75%', left: '20%', icon: '🪴' }, // Plant
    { top: '15%', left: '80%', icon: '🕰️' }  // Clock
  ];

  const playAudio = (text: string) => {
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const handleClueClick = (idx: number) => {
    if (idx < questions.length && !answeredIds.includes(questions[idx].id)) {
      setActiveQuestion(questions[idx]);
      setFeedback(null);
    }
  };

  const handleAnswer = (option: string) => {
    if (!activeQuestion) return;

    if (option === activeQuestion.correctAnswer) {
      setFeedback('correct');
      setTimeout(() => {
        setSolvedCount(prev => prev + 1);
        setAnsweredIds(prev => [...prev, activeQuestion.id]);
        setActiveQuestion(null);
        if (solvedCount + 1 === questions.length) {
            // Game Won
        }
      }, 1500);
    } else {
      setFeedback('wrong');
    }
  };

  if (solvedCount === questions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
        <div className="text-8xl">🕵️‍♂️</div>
        <h2 className="text-4xl font-bold text-green-700">案件告破！</h2>
        <p className="text-xl text-green-600">你找到了所有线索并破解了谜题。</p>
        <button onClick={onExit} className="px-8 py-3 bg-green-500 text-white rounded-full font-bold shadow-lg hover:scale-105 transition">再玩一局</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-amber-50 rounded-xl overflow-hidden shadow-inner border-8 border-amber-900/10">
      {/* Room Background (Abstract) */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200 via-amber-100 to-amber-50 pointer-events-none"></div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm border border-amber-200">
        <div className="flex items-center space-x-2 text-amber-900 font-bold">
            <Key size={20} />
            <span>发现线索: {solvedCount} / {questions.length}</span>
        </div>
      </div>

      {/* Clue Hotspots */}
      {questions.map((q, idx) => {
        const pos = cluePositions[idx % cluePositions.length];
        const isSolved = answeredIds.includes(q.id);
        
        return (
          <button
            key={q.id}
            onClick={() => handleClueClick(idx)}
            disabled={isSolved}
            style={{ top: pos.top, left: pos.left }}
            className={`absolute w-16 h-16 flex items-center justify-center text-3xl rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 
              ${isSolved ? 'bg-green-100 opacity-50 grayscale' : 'bg-white animate-bounce-short cursor-pointer border-4 border-amber-400'}`}
          >
            {isSolved ? <CheckCircle className="text-green-500" /> : pos.icon}
          </button>
        );
      })}

      {/* Question Modal */}
      {activeQuestion && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl transform transition-all scale-100 border-t-8 border-amber-500">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                    <Search className="text-amber-500"/>
                    线索 #{questions.indexOf(activeQuestion) + 1}
                </h3>
                <button onClick={() => setActiveQuestion(null)} className="text-gray-400 hover:text-gray-600">
                    <XCircle />
                </button>
            </div>
            
            <div className="flex items-start gap-3 mb-6">
                <p className="text-lg text-gray-800 font-medium flex-1">{activeQuestion.question}</p>
                <button 
                  onClick={() => playAudio(activeQuestion.question)}
                  className="p-2 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200"
                >
                  <Volume2 size={20} />
                </button>
            </div>

            <div className="space-y-3">
              {activeQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={feedback === 'correct'}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all border-2 
                    ${feedback === 'correct' && opt === activeQuestion.correctAnswer 
                        ? 'bg-green-100 border-green-500 text-green-800' 
                        : feedback === 'wrong' && opt !== activeQuestion.correctAnswer 
                        ? 'bg-white border-gray-200 hover:border-amber-400 text-gray-700'
                        : 'bg-white border-gray-100 hover:bg-amber-50 hover:border-amber-300 text-gray-700'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {feedback === 'wrong' && (
                <div className="mt-4 text-center text-red-500 font-bold animate-pulse">
                    不对哦... 仔细看看文章！
                </div>
            )}
             {feedback === 'correct' && (
                <div className="mt-4 text-center text-green-600 font-bold">
                    正确！你找到了一个线索！
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectiveGame;