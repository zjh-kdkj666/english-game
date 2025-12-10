import React, { useState, useEffect } from 'react';
import { FlashcardItem } from '../types';
import { generateImage, ImageModelProvider, AspectRatio } from '../services/geminiService';
import { Volume2, Loader2, ArrowRight, ArrowLeft, Download, ImageIcon, RefreshCw, Palette, AlertCircle, Settings, Upload, X, Ratio, Edit3 } from 'lucide-react';

interface Props {
  cards: FlashcardItem[];
  onExit: () => void;
  onUpdateCardImage: (index: number, imageUrl: string) => void;
}

const FlashcardGame: React.FC<Props> = ({ cards, onExit, onUpdateCardImage }) => {
  const [index, setIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings State - Default to GEMINI per user request
  const [selectedModel, setSelectedModel] = useState<ImageModelProvider>('GEMINI');
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'prompt' | 'ratio' | 'ref'>('prompt');
  
  const [customPrompt, setCustomPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [refImage, setRefImage] = useState<string | null>(null);

  const currentCard = cards[index];

  // Initialize prompt when card changes
  useEffect(() => {
    setCustomPrompt(currentCard.visualPrompt);
    setRefImage(null); // Reset ref image for new card
    
    setErrorMsg(null);
    if (currentCard.generatedImage) {
        setImageUrl(currentCard.generatedImage);
        setIsLoadingImage(false);
    } else {
        // Auto-generate on load using defaults
        requestImage(selectedModel, currentCard.visualPrompt, aspectRatio, null);
    }
    playAudio(currentCard.english);
  }, [index, currentCard, onUpdateCardImage]); 

  const requestImage = (model: ImageModelProvider, prompt: string, ratio: AspectRatio, refImg: string | null) => {
    setImageUrl(null);
    setIsLoadingImage(true);
    setErrorMsg(null);
    setShowSettings(false); // Close settings on generate
    
    generateImage({
        prompt,
        provider: model,
        aspectRatio: ratio,
        referenceImageBase64: refImg
    })
      .then(url => {
        if (url) {
            setImageUrl(url);
            onUpdateCardImage(index, url);
        }
        setIsLoadingImage(false);
      })
      .catch((err: any) => {
        setIsLoadingImage(false);
        const msg = err.toString();
        if (msg.includes("429") || msg.includes("quota") || msg.includes("exceeded")) {
            setErrorMsg("QUOTA_EXCEEDED");
        } else {
            setErrorMsg("生成失败，请重试");
        }
      });
  };

  const handleManualGenerate = () => {
    requestImage(selectedModel, customPrompt, aspectRatio, refImage);
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const content = base64.split(',')[1];
            setRefImage(content);
        };
        reader.readAsDataURL(file);
    }
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

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < cards.length - 1) setIndex(prev => prev + 1);
    else { alert("太棒了！你学习了所有的卡片！"); onExit(); }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) setIndex(prev => prev - 1);
  };
  
  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    requestImage(selectedModel, customPrompt, aspectRatio, refImage);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imageUrl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 800;
    let height = 1200; 
    
    const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
    if (wRatio && hRatio) {
        height = (800 / wRatio) * hRatio;
        height += 200; 
    }

    const imgHeight = height - 200;
    const textHeight = 200;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    await new Promise((resolve) => { img.onload = resolve; });

    const sRatio = img.width / img.height;
    const dRatio = width / imgHeight;
    let sx, sy, sWidth, sHeight;

    if (sRatio > dRatio) { 
        sHeight = img.height;
        sWidth = img.height * dRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
    } else {
        sWidth = img.width;
        sHeight = img.width / dRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, imgHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#1e293b'; 
    let fontSize = 60;
    ctx.font = `900 ${fontSize}px sans-serif`;
    
    const maxTextWidth = width * 0.9;
    let textWidth = ctx.measureText(currentCard.english).width;
    while (textWidth > maxTextWidth && fontSize > 20) {
        fontSize -= 4;
        ctx.font = `900 ${fontSize}px sans-serif`;
        textWidth = ctx.measureText(currentCard.english).width;
    }
    ctx.fillText(currentCard.english, width / 2, imgHeight + (textHeight * 0.35));

    ctx.fillStyle = '#64748b'; 
    ctx.font = '700 36px sans-serif';
    ctx.fillText(currentCard.chinese, width / 2, imgHeight + (textHeight * 0.75));

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `flashcard-${currentCard.english.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFontSize = (text: string) => {
    if (text.length > 80) return 'text-sm';
    if (text.length > 40) return 'text-base';
    if (text.length > 20) return 'text-lg';
    return 'text-2xl';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-4 font-sans relative">
      
      {/* Top Model Selector */}
      <div className="absolute top-4 w-full max-w-xl flex items-center justify-center px-4 z-20">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
            <Palette size={16} className="text-purple-500" />
            <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value as ImageModelProvider)}
                className="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer max-w-[150px] sm:max-w-none truncate"
            >
                <option value="GEMINI">Google Gemini (默认)</option>
                <option value="POLLINATIONS_DEFAULT">Magic Art (绘本/省空间)</option>
                <option value="POLLINATIONS_ANIME">Anime (动漫)</option>
                <option value="POLLINATIONS_REALISTIC">Realistic (写实)</option>
                <option value="POLLINATIONS_WATERCOLOR">Watercolor (水彩)</option>
                <option value="POLLINATIONS_TURBO">Lightning (快画)</option>
            </select>
          </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
                    <Settings size={24} className="text-purple-500"/> 绘画设置
                </h3>
                
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button 
                        onClick={() => setActiveSettingsTab('prompt')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeSettingsTab === 'prompt' ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-500'}`}
                    >
                        <Edit3 size={16}/> 提示词
                    </button>
                    <button 
                        onClick={() => setActiveSettingsTab('ratio')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeSettingsTab === 'ratio' ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-500'}`}
                    >
                        <Ratio size={16}/> 比例
                    </button>
                    <button 
                        onClick={() => setActiveSettingsTab('ref')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${activeSettingsTab === 'ref' ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-500'}`}
                    >
                        <Upload size={16}/> 参考图
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto mb-4">
                    {/* Prompt Tab */}
                    {activeSettingsTab === 'prompt' && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">描述画面内容 (英文最佳)</label>
                            <textarea 
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:border-purple-500 outline-none h-40 resize-none shadow-inner"
                                placeholder="例如: A cute cat eating an apple..."
                            />
                        </div>
                    )}

                    {/* Aspect Ratio Tab */}
                    {activeSettingsTab === 'ratio' && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">选择画幅比例</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(["1:1", "3:4", "4:3", "9:16", "16:9"] as AspectRatio[]).map(ratio => (
                                    <button 
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio)}
                                        className={`py-4 rounded-xl text-sm font-bold border-2 transition flex flex-col items-center gap-1 ${aspectRatio === ratio ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'}`}
                                    >
                                        <Ratio size={20} className="mb-1 opacity-50"/>
                                        {ratio}
                                        <span className="text-[10px] opacity-60 font-normal">
                                            {ratio === "1:1" ? "正方形" : ratio === "3:4" ? "竖屏 (默认)" : ratio === "16:9" ? "宽屏" : "其他"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reference Image Tab */}
                    {activeSettingsTab === 'ref' && (
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex justify-between">
                                <span>上传参考图 (控制构图/主体)</span>
                             </label>
                             {selectedModel !== 'GEMINI' && (
                                 <div className="mb-4 bg-orange-50 text-orange-600 text-xs p-3 rounded-lg flex items-center gap-2">
                                     <AlertCircle size={16}/> 参考图功能仅在 <b>Google Gemini</b> 画师模式下生效。
                                 </div>
                             )}
                             <div className="flex flex-col gap-4">
                                <label className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${refImage ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50 text-slate-400'}`}>
                                    {refImage ? (
                                        <>
                                            <div className="w-full h-full p-2"><img src={`data:image/jpeg;base64,${refImage}`} className="w-full h-full object-contain rounded-lg"/></div>
                                            <div className="text-xs font-bold mt-1">点击更换</div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={32} className="mb-2" />
                                            <span className="text-sm font-bold">点击上传图片</span>
                                            <span className="text-xs opacity-60 mt-1">支持 JPG/PNG</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleRefImageUpload} />
                                </label>
                                {refImage && (
                                    <button onClick={() => setRefImage(null)} className="py-2 text-red-400 hover:text-red-600 text-sm font-bold flex items-center justify-center gap-2 border border-red-200 rounded-lg hover:bg-red-50">
                                        <X size={16}/> 清除参考图
                                    </button>
                                )}
                             </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleManualGenerate}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl hover:opacity-90 transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={20}/> 立即生成
                </button>
            </div>
        </div>
      )}

      {/* Main Card */}
      <div className="mb-4 mt-16 sm:mt-12 text-slate-400 font-bold uppercase tracking-widest text-center">卡片 {index + 1} / {cards.length}</div>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden flex flex-col h-[70vh]">
          
          {/* Toolbar overlay inside card area */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
               <button 
                    onClick={() => { setShowSettings(true); setActiveSettingsTab('prompt'); }}
                    className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur transition"
                    title="修改提示词"
               >
                   <Edit3 size={18} />
               </button>
               <button 
                    onClick={handleRegenerate}
                    className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur transition"
                    title="快速重绘"
               >
                   <RefreshCw size={18} className={isLoadingImage ? "animate-spin" : ""} />
               </button>
          </div>

          <div className="h-[80%] w-full bg-slate-50 flex items-center justify-center relative group border-b-2 border-slate-100 flex-shrink-0 overflow-hidden">
             {isLoadingImage ? (
               <div className="flex flex-col items-center text-purple-400 px-4 text-center">
                   <Loader2 size={48} className="animate-spin mb-4" />
                   <p className="text-base font-bold text-slate-700">AI 正在绘制画面...</p>
                   <p className="text-xs text-slate-400 mt-2 max-w-[200px] truncate">"{customPrompt}"</p>
               </div>
             ) : errorMsg ? (
               <div className="flex flex-col items-center text-center p-6 space-y-4">
                  <AlertCircle size={48} className="text-red-400" />
                  <div>
                    <p className="text-slate-600 font-bold mb-1">图片生成失败</p>
                    <p className="text-xs text-slate-400">请检查网络或切换画师重试</p>
                  </div>
                  <button onClick={() => setShowSettings(true)} className="px-6 py-2 bg-purple-100 text-purple-700 rounded-full font-bold text-sm">
                      打开设置重试
                  </button>
               </div>
             ) : imageUrl ? (
               <img src={imageUrl} alt="AI Generated Scene" className="w-full h-full object-contain bg-slate-100" />
             ) : (
               <div className="flex flex-col items-center text-slate-300 gap-2">
                   <ImageIcon size={64} />
                   <button onClick={() => setShowSettings(true)} className="text-purple-500 font-bold underline">点击开始绘画</button>
               </div>
             )}
          </div>
          
          <div className="h-[20%] p-2 flex flex-col items-center justify-center text-center bg-gradient-to-b from-white to-slate-50 relative z-20">
             <div className="w-full overflow-y-auto flex flex-col items-center justify-center h-full custom-scrollbar">
                <h2 onClick={() => playAudio(currentCard.english)} className={`${getFontSize(currentCard.english)} font-black text-slate-800 leading-tight cursor-pointer hover:text-purple-600 transition-colors flex items-center justify-center gap-1 group select-none`} title="点击发音">
                    {currentCard.english} <Volume2 size={18} className="text-purple-300 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                </h2>
                <p className="text-slate-500 font-medium text-sm mt-1">{currentCard.chinese}</p>
             </div>
          </div>
      </div>

      {/* Main Controls Below */}
      <div className="mt-6 flex flex-wrap justify-center gap-3 w-full max-w-md">
          <button 
             onClick={() => setShowSettings(true)} 
             className="flex-1 bg-white text-slate-600 py-3 px-4 rounded-xl shadow-sm font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-50 hover:text-purple-600 transition"
          >
              <Settings size={18}/> 绘画设置
          </button>
          
          <button 
             onClick={handleDownload} 
             disabled={!imageUrl}
             className="flex-1 bg-white text-slate-600 py-3 px-4 rounded-xl shadow-sm font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-50 hover:text-green-600 transition disabled:opacity-50"
          >
              <Download size={18}/> 保存卡片
          </button>
      </div>

      <div className="mt-4 flex gap-6">
        <button disabled={index === 0} onClick={handlePrev} className="p-4 bg-white rounded-full shadow-lg text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition"><ArrowLeft size={24} /></button>
        <button onClick={handleNext} className="px-8 py-4 bg-purple-600 text-white rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition transform active:scale-95">{index === cards.length - 1 ? '完成' : '下一张'} <ArrowRight size={20} /></button>
      </div>
    </div>
  );
};

export default FlashcardGame;