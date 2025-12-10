import React, { useState, useRef } from 'react';
import { DialogueLine } from '../types';
import { Mic, Square, Play, Star, RotateCcw, Volume2 } from 'lucide-react';
import { evaluateAudio } from '../services/geminiService';

interface Props {
  dialogues: DialogueLine[];
  onExit: () => void;
}

const DirectorGame: React.FC<Props> = ({ dialogues, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number; feedback: string } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentLine = dialogues[currentIndex];

  const playAudio = (text: string) => {
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`);
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const startRecording = async () => {
    try {
      setScoreData(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        await processAudio(blob);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("无法访问麦克风，请检查权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (blob: Blob) => {
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const base64Content = base64data.split(',')[1];
      
      const result = await evaluateAudio(currentLine.line, base64Content);
      setScoreData(result);
      setIsProcessing(false);
    };
  };

  const nextLine = () => {
    setScoreData(null);
    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      alert("杀青了！演得太棒了！");
      onExit();
    }
  };

  if (!currentLine) return <div>正在加载剧本...</div>;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
      {/* Scene Header */}
      <div className="bg-black text-white p-4 rounded-t-xl text-center border-b-4 border-gray-700">
        <div className="uppercase tracking-widest text-xs font-bold text-yellow-400 mb-1">场景 {currentIndex + 1}</div>
        <h2 className="text-2xl font-bold font-serif">电影片场 🎬</h2>
      </div>

      {/* Action Area */}
      <div className="flex-1 bg-gray-900 relative rounded-b-xl overflow-hidden flex flex-col items-center justify-center p-8 space-y-8">
        
        {/* Character Card */}
        <div className="bg-white text-black p-6 rounded-2xl shadow-2xl max-w-md w-full transform -rotate-1 relative group">
            <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 text-sm font-bold rounded shadow-sm uppercase">
                角色: {currentLine.character}
            </div>
            <div className="absolute -top-3 -right-3 bg-pink-500 text-white px-3 py-1 text-sm font-bold rounded shadow-sm">
                情感: {currentLine.emotion}
            </div>
            
            <p className="text-3xl font-bold text-center mt-4 mb-2 leading-relaxed">
                "{currentLine.line}"
            </p>
            
            <button 
                onClick={() => playAudio(currentLine.line)}
                className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 transition"
            >
                <Volume2 size={18} /> 听示范
            </button>
        </div>

        {/* Feedback Section */}
        {isProcessing && (
            <div className="text-yellow-400 font-mono animate-pulse">导演正在回放你的表演...</div>
        )}

        {scoreData && (
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl w-full max-w-md text-center animate-bounce-short z-10">
                <div className="flex justify-center mb-2">
                    {[...Array(Math.min(5, Math.ceil(scoreData.score / 20)))].map((_, i) => (
                        <Star key={i} className="fill-yellow-400 text-yellow-400" size={32} />
                    ))}
                </div>
                <div className="text-4xl font-bold text-white mb-2">{scoreData.score}/100</div>
                <p className="text-gray-300 italic">"{scoreData.feedback}"</p>
                
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={nextLine} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold">
                        下一场
                    </button>
                    <button onClick={() => setScoreData(null)} className="text-gray-400 hover:text-white flex items-center gap-1 px-4">
                        <RotateCcw size={16} /> 重来
                    </button>
                </div>
            </div>
        )}

        {/* Controls */}
        {!scoreData && !isProcessing && (
            <div className="mt-8 text-center">
                {isRecording ? (
                    <button 
                        onClick={stopRecording}
                        className="w-24 h-24 rounded-full bg-red-600 border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center animate-pulse mx-auto"
                    >
                        <Square size={32} className="fill-white text-white" />
                    </button>
                ) : (
                    <button 
                        onClick={startRecording}
                        className="w-24 h-24 rounded-full bg-white border-4 border-gray-300 shadow-xl flex items-center justify-center hover:bg-gray-50 transition-transform hover:scale-105 active:scale-95 mx-auto"
                    >
                        <Mic size={40} className="text-gray-800" />
                    </button>
                )}
                <p className="text-gray-400 text-center mt-4 text-sm uppercase tracking-wider">
                    {isRecording ? "录音中... 点击停止" : "点击录音"}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DirectorGame;