import React, { useState, useEffect } from 'react';
import { generateGameContent } from './services/geminiService';
import { getLessons, saveLesson, deleteLesson, clearAllLessons } from './services/storageService';
import { GameMode, LessonData, MatchingPair, FileAttachment } from './types';
import TowerGame from './components/TowerGame';
import KitchenGame from './components/KitchenGame';
import FlashcardGame from './components/FlashcardGame';
// Rename File to FileIcon to avoid conflict with native DOM File object
import { Wand2, Loader2, Castle, Puzzle, Image as ImageIcon, History, Trash2, ChevronRight, X, Plus, Download, Share, Menu, FileText, FileSpreadsheet, File as FileIcon, Presentation, Smartphone, Copy, Check, Link, AlertTriangle, Globe, Github, Package, FileCode, KeyRound, Gamepad2, ExternalLink } from 'lucide-react';

// Declare globals for the CDN libraries
declare const XLSX: any;
declare const JSZip: any;
declare const mammoth: any;

// Hardcoded Demo Data for users without API Key
const DEMO_LESSON: LessonData = {
    id: 'demo-space-adventure',
    timestamp: Date.now(),
    topic: 'Space Explorer (演示课程)',
    towerWords: [
      { id: 'w1', english: 'Astronaut', chinese: '宇航员', options: ['Astronaut', 'Driver', 'Chef', 'Pilot'].sort(() => 0.5 - Math.random()) },
      { id: 'w2', english: 'Rocket', chinese: '火箭', options: ['Rocket', 'Car', 'Bike', 'Boat'].sort(() => 0.5 - Math.random()) },
      { id: 'w3', english: 'Planet', chinese: '行星', options: ['Planet', 'Star', 'Moon', 'Sun'].sort(() => 0.5 - Math.random()) },
      { id: 'w4', english: 'Galaxy', chinese: '银河', options: ['Galaxy', 'World', 'City', 'Town'].sort(() => 0.5 - Math.random()) },
      { id: 'w5', english: 'Telescope', chinese: '望远镜', options: ['Telescope', 'Microscope', 'Glasses', 'Mirror'].sort(() => 0.5 - Math.random()) }
    ],
    matchingPairs: [
      { id: 'm1', english: 'The sun is a star.', chinese: '太阳是一颗恒星。' },
      { id: 'm2', english: 'The moon orbits the earth.', chinese: '月亮绕着地球转。' },
      { id: 'm3', english: 'Gravity pulls us down.', chinese: '重力把我们往下拉。' },
      { id: 'm4', english: 'Mars is the red planet.', chinese: '火星是红色的星球。' },
      { id: 'm5', english: 'Stars shine at night.', chinese: '星星在夜晚闪耀。' },
      { id: 'm6', english: 'Earth is our home.', chinese: '地球是我们的家。' }
    ],
    // Pre-filled images using Pollinations to avoid hitting API limits in demo
    flashcards: [
      { id: 'f1', english: 'Astronaut', chinese: '宇航员', visualPrompt: 'Cute astronaut floating in space with stars', generatedImage: 'https://image.pollinations.ai/prompt/Cute%20astronaut%20floating%20in%20space%20with%20stars?nologo=true&width=768&height=1024&model=flux' },
      { id: 'f2', english: 'Rocket', chinese: '火箭', visualPrompt: 'Red rocket ship blasting off into space', generatedImage: 'https://image.pollinations.ai/prompt/Red%20rocket%20ship%20blasting%20off%20into%20space?nologo=true&width=768&height=1024&model=flux' },
      { id: 'f3', english: 'Earth', chinese: '地球', visualPrompt: 'Planet earth seen from space, blue and green', generatedImage: 'https://image.pollinations.ai/prompt/Planet%20earth%20seen%20from%20space,%20blue%20and%20green?nologo=true&width=768&height=1024&model=flux' },
      { id: 'f4', english: 'Alien', chinese: '外星人', visualPrompt: 'Friendly green alien waving hand', generatedImage: 'https://image.pollinations.ai/prompt/Friendly%20green%20alien%20waving%20hand?nologo=true&width=768&height=1024&model=flux' }
    ]
  };

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<'start' | 'loading' | 'select' | 'playing'>('start');
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameMode>(GameMode.NONE);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LessonData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Load history asynchronously on mount
  useEffect(() => {
    loadHistory();
    checkApiKey();
    
    // Listen for PWA install event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const checkApiKey = () => {
      // Check if API KEY is undefined or empty string
      if (!process.env.API_KEY || process.env.API_KEY === '') {
          // Only show error if we are not already showing a specific error
          setError("⚠️ 未检测到 API Key。请在根目录创建 .env 文件并配置 API_KEY，或者使用演示模式。");
      }
  };

  const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await getLessons();
        setHistory(data);
      } catch (e) {
        console.error("Failed to load history", e);
        // Even if history fails, we should let the app run
      } finally {
        setIsLoadingHistory(false);
      }
  };

  const handleGenerate = async () => {
    if (!inputText.trim() && attachments.length === 0) return;

    try {
      setInputMode('loading');
      setError(null);
      const data = await generateGameContent(inputText, attachments);
      setLessonData(data);
      
      // Async save
      await saveLesson(data);
      await loadHistory();
      
      setInputMode('select');
      setInputText('');
      setAttachments([]);
    } catch (err: any) {
      console.error("Generation failed:", err);
      let msg = "哎呀！魔法棒失效了。请尝试更简单的内容或确保文件格式正确。";
      
      // Check for common deployment errors
      const errStr = err?.toString() || "";
      if (errStr.includes("process is not defined") || errStr.includes("API key")) {
          msg = "配置错误：API Key 未生效。请检查 Vercel 的环境变量设置 (API_KEY)。";
      } else if (errStr.includes("429") || errStr.includes("quota")) {
          msg = "服务太繁忙了 (429)，请稍后再试。";
      }

      setError(msg);
      setInputMode('start');
    }
  };

  const handleDemo = () => {
    setError(null);
    setLessonData(DEMO_LESSON);
    setInputMode('select');
    // Don't save demo to history to avoid clutter
  };

  const handleInstallApp = async () => {
      if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
              setDeferredPrompt(null);
          }
      } else {
          setShowInstallModal(true);
      }
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAttachments: FileAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.name.toLowerCase();
          
          try {
              // 1. Image handling
              if (file.type.startsWith('image/')) {
                  const base64 = await readFileAsBase64(file);
                  newAttachments.push({
                      id: crypto.randomUUID(),
                      type: 'image',
                      mimeType: file.type,
                      content: base64,
                      name: file.name
                  });
              } 
              // 2. PDF handling (Native Gemini support)
              else if (file.type === 'application/pdf') {
                  const base64 = await readFileAsBase64(file);
                  newAttachments.push({
                      id: crypto.randomUUID(),
                      type: 'pdf',
                      mimeType: 'application/pdf',
                      content: base64,
                      name: file.name
                  });
              }
              // 3. Word (.docx) handling (Mammoth extraction)
              else if (fileName.endsWith('.docx')) {
                  const arrayBuffer = await readFileAsArrayBuffer(file);
                  if (typeof mammoth !== 'undefined') {
                      const result = await mammoth.extractRawText({ arrayBuffer });
                      newAttachments.push({
                          id: crypto.randomUUID(),
                          type: 'text',
                          mimeType: 'text/plain',
                          content: result.value, // The raw text
                          name: file.name
                      });
                  } else {
                      alert("Word 解析库未加载，请刷新页面。");
                  }
              }
              // 4. Excel (.xlsx, .xls) handling (SheetJS)
              else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                   const arrayBuffer = await readFileAsArrayBuffer(file);
                   if (typeof XLSX !== 'undefined') {
                       const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                       const firstSheetName = workbook.SheetNames[0];
                       const worksheet = workbook.Sheets[firstSheetName];
                       const csvText = XLSX.utils.sheet_to_csv(worksheet);
                       
                       newAttachments.push({
                           id: crypto.randomUUID(),
                           type: 'text',
                           mimeType: 'text/plain',
                           content: csvText,
                           name: file.name
                       });
                   } else {
                       alert("Excel 解析库未加载，请刷新页面。");
                   }
              }
              // 5. PowerPoint (.pptx) handling (JSZip XML extraction)
              else if (fileName.endsWith('.pptx')) {
                  const arrayBuffer = await readFileAsArrayBuffer(file);
                   if (typeof JSZip !== 'undefined') {
                       const zip = await JSZip.loadAsync(arrayBuffer);
                       const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
                       
                       let pptText = "";
                       slideFiles.sort((a: string, b: string) => {
                           const numA = parseInt(a.match(/\d+/)?.[0] || "0");
                           const numB = parseInt(b.match(/\d+/)?.[0] || "0");
                           return numA - numB;
                       });

                       for (const slideFilename of slideFiles) {
                           const xml = await zip.file(slideFilename).async("string");
                           const slideContent = xml.match(/<a:t>(.*?)<\/a:t>/g)?.map((t: string) => t.replace(/<\/?a:t>/g, '')) || [];
                           if (slideContent.length > 0) {
                               pptText += `[Slide ${slideFilename}]: ${slideContent.join(' ')}\n`;
                           }
                       }

                       if (pptText.trim().length === 0) {
                           pptText = "Empty presentation or text could not be extracted.";
                       }

                       newAttachments.push({
                           id: crypto.randomUUID(),
                           type: 'text',
                           mimeType: 'text/plain',
                           content: pptText,
                           name: file.name
                       });
                   } else {
                       alert("PPT 解析库未加载，请刷新页面。");
                   }
              }
              // 6. Plain Text
              else if (file.type === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
                  const text = await readFileAsText(file);
                  newAttachments.push({
                      id: crypto.randomUUID(),
                      type: 'text',
                      mimeType: 'text/plain',
                      content: text,
                      name: file.name
                  });
              }
              else {
                  alert(`暂不支持文件类型: ${file.name}`);
              }
          } catch (err) {
              console.error("File read error:", err);
              alert(`无法读取文件 ${file.name}，文件可能已损坏。`);
          }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
      });
  };

  const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
      });
  };

  const handleRemoveAttachment = (id: string) => {
      setAttachments(prev => prev.filter(f => f.id !== id));
  };

  const handleFlashcardUpdate = async (index: number, imageUrl: string) => {
    setLessonData(prev => {
        if (!prev) return null;
        const newCards = [...prev.flashcards];
        newCards[index] = { ...newCards[index], generatedImage: imageUrl };
        return { ...prev, flashcards: newCards };
    });

    if (lessonData) {
        const newCards = [...lessonData.flashcards];
        newCards[index] = { ...newCards[index], generatedImage: imageUrl };
        const updatedLesson = { ...lessonData, flashcards: newCards };
        await saveLesson(updatedLesson);
        const newHistory = await getLessons();
        setHistory(newHistory);
    }
  };

  const handleSelectHistory = (lesson: LessonData) => {
      setLessonData(lesson);
      setInputMode('select');
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("确定要删除这个课程吗？")) {
          const newHistory = await deleteLesson(id);
          setHistory(newHistory);
      }
  };
  
  const handleClearHistory = async () => {
      if (window.confirm("确定要清空所有历史记录吗？")) {
          await clearAllLessons();
          setHistory([]);
      }
  };

  const getMatchingPairs = (): MatchingPair[] => {
    if (!lessonData) return [];
    if (lessonData.matchingPairs && lessonData.matchingPairs.length > 0) {
        return lessonData.matchingPairs;
    }
    if (lessonData.kitchenOrders && lessonData.kitchenOrders.length > 0) {
        return lessonData.kitchenOrders.map((order, idx) => ({
            id: order.id || `legacy-${idx}`,
            english: order.englishFull,
            chinese: order.chinese
        }));
    }
    return [];
  };

  const renderInstallModal = () => {
    if (!showInstallModal) return null;
    
    const isPreviewEnv = window.location.hostname.includes('googleusercontent') || 
                         window.location.hostname.includes('localhost') || 
                         window.location.hostname.includes('webcontainer') ||
                         window.location.hostname.includes('127.0.0.1');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowInstallModal(false)}>
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
                
                <div className="text-center mb-6">
                    <div className="bg-purple-100 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <Smartphone className="text-purple-600 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                        安装APP到手机
                    </h3>
                </div>

                <div className="space-y-4">
                    {isPreviewEnv && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                            <h4 className="text-amber-800 font-bold text-sm flex items-center gap-2 mb-1">
                                <AlertTriangle size={14} /> 链接不可用? (404)
                            </h4>
                            <p className="text-xs text-amber-700 leading-relaxed mb-2">
                                这是因为您正在使用<b>预览链接</b>。手机无法直接访问此私有地址。
                            </p>
                        </div>
                    )}

                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                            <Link size={12}/> 复制当前链接
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white p-2 rounded-lg text-xs text-slate-600 truncate font-mono border border-slate-200">
                                {window.location.href}
                            </div>
                            <button 
                                onClick={handleCopyLink}
                                className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                            >
                                {isCopied ? <Check size={14}/> : <Copy size={14}/>}
                                {isCopied ? "已复制" : "复制"}
                            </button>
                        </div>
                    </div>

                    {deferredPrompt && (
                        <div className="mb-2">
                            <button 
                                onClick={handleInstallApp}
                                className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition animate-bounce-short flex items-center justify-center gap-2"
                            >
                                <Download size={20}/> 立即下载/安装
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">手动安装步骤</h4>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">🍎 iOS (Safari)</h4>
                            <p className="text-xs text-slate-500">
                                点击底部 <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 rounded align-middle"><Share size={10} /></span> 分享 &rarr; <b>添加到主屏幕</b>
                            </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">🤖 Android (Chrome)</h4>
                            <p className="text-xs text-slate-500">
                                点击右上角 <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 rounded align-middle"><Menu size={10} /></span> 菜单 &rarr; <b>安装应用</b>
                            </p>
                        </div>
                    </div>
                    
                    <button onClick={() => setShowInstallModal(false)} className="w-full mt-2 py-3 bg-white text-slate-400 rounded-xl font-bold hover:bg-slate-50 transition border border-slate-200 text-sm">关闭</button>
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    switch (inputMode) {
      case 'start':
        return (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in pb-10">
            <div className="text-center space-y-4 relative">
              <button 
                onClick={() => setShowInstallModal(true)}
                className={`absolute right-0 top-0 text-slate-400 hover:text-purple-600 transition flex flex-col items-center gap-1 ${deferredPrompt ? 'animate-bounce' : ''}`}
                title="下载/安装APP"
              >
                  <div className={`bg-white p-3 rounded-full shadow-md border ${deferredPrompt ? 'border-purple-300 text-purple-600' : 'border-slate-200'}`}>
                    <Download size={20} />
                  </div>
                  <span className="text-[10px] font-bold">下载APP</span>
              </button>

              <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                <Wand2 size={48} className="text-purple-600" />
              </div>
              <h1 className="text-5xl font-black text-slate-800 tracking-tight">魔法英语游戏机</h1>
              <p className="text-slate-500 text-xl font-medium">把任何资料变成好玩的游戏！</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-100 space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">文字输入</label>
                <textarea
                  className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-purple-400 focus:ring-0 outline-none transition text-slate-700 font-medium"
                  rows={3}
                  placeholder="粘贴课文、单词表或绘本故事..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-300 font-bold">或上传文件</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                    <span>资料文件</span>
                    <span className="text-xs text-purple-500 normal-case font-medium">支持 PDF, Word, Excel, PPT</span>
                 </label>
                 
                 {attachments.length > 0 && (
                     <div className="grid grid-cols-2 gap-3 mb-3">
                         {attachments.map((file, idx) => (
                             <div key={idx} className="relative p-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center gap-3 group hover:border-purple-300 transition">
                                 {file.type === 'image' ? (
                                    <img src={`data:${file.mimeType};base64,${file.content}`} className="w-10 h-10 object-cover rounded-lg bg-white" alt="thumb" />
                                 ) : file.type === 'pdf' ? (
                                    <div className="w-10 h-10 bg-red-100 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={20}/></div>
                                 ) : (
                                    <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0"><FileText size={20}/></div>
                                 )}
                                 
                                 <div className="min-w-0 flex-1">
                                     <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                     <p className="text-xs text-slate-400 font-medium">{file.type.toUpperCase()}</p>
                                 </div>

                                 <button 
                                    onClick={() => handleRemoveAttachment(file.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                 >
                                     <X size={16} />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}

                 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition group bg-white">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="flex gap-4 mb-2 opacity-50 group-hover:opacity-100 transition text-slate-400 group-hover:text-purple-500">
                            <FileText size={24} />
                            <FileSpreadsheet size={24} />
                            <Presentation size={24} />
                            <ImageIcon size={24} />
                        </div>
                        <p className="text-sm text-slate-500 font-medium text-center">
                            点击上传资料 <br/>
                            <span className="text-[10px] text-slate-400">PDF • Word • PPT • Excel • JPG</span>
                        </p>
                    </div>
                    {/* Accept widely used formats */}
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx" multiple onChange={handleFileUpload} />
                </label>
              </div>

              <div className="space-y-3">
                  <button
                      disabled={!inputText.trim() && attachments.length === 0}
                      onClick={handleGenerate}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Wand2 size={20} />
                      开始生成魔法游戏
                    </button>

                    <button
                      onClick={handleDemo}
                      className="w-full py-3 bg-white text-green-600 hover:bg-green-50 border border-green-200 font-bold text-lg rounded-xl shadow-sm transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Gamepad2 size={20} />
                      试玩演示 (无需Key)
                    </button>
              </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <History size={16} /> 我的资料库 ({history.length})
                    </h3>
                    {history.length > 0 && (
                        <button onClick={handleClearHistory} className="text-xs text-red-300 hover:text-red-500 font-bold">清空全部</button>
                    )}
                </div>
                
                {isLoadingHistory ? (
                    <div className="flex justify-center p-4 text-slate-400"><Loader2 className="animate-spin"/></div>
                ) : history.length > 0 ? (
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {history.map(lesson => (
                            <div 
                                key={lesson.id} 
                                onClick={() => handleSelectHistory(lesson)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-purple-200 transition group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-bold text-slate-700 truncate">{lesson.topic}</h4>
                                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                        <span>{new Date(lesson.timestamp).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>{lesson.flashcards.length} 张卡片</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => handleDeleteHistory(e, lesson.id)}
                                        className="p-2 px-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-bold text-xs flex items-center gap-1 border border-transparent hover:border-red-100"
                                        title="删除此资料"
                                    >
                                        <Trash2 size={14} /> 删除
                                    </button>
                                    <ChevronRight className="text-slate-300 group-hover:text-purple-500 transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 text-slate-400 text-sm bg-slate-100 rounded-xl border-dashed border-2 border-slate-200">
                        暂无历史记录，快去生成第一个游戏吧！
                    </div>
                )}
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center font-medium">
                    {error}
                </div>
            )}
          </div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
            <Loader2 size={64} className="text-purple-600 animate-spin" />
            <h2 className="text-2xl font-bold text-slate-700">正在生成游戏...</h2>
            <p className="text-slate-500">AI 正在阅读您的资料 (共 {attachments.length > 0 ? attachments.length + ' 个文件' : (inputText.length > 50 ? '长文本' : '文本')})</p>
          </div>
        );

      case 'select':
        if (!lessonData) return null;
        return (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-8">
            <div className="text-center">
                <h2 className="text-3xl font-black text-slate-800 mb-2">{lessonData.topic}</h2>
                <p className="text-slate-500">选择一个模式开始学习！</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => { setSelectedGame(GameMode.TOWER); setInputMode('playing'); }} className="group bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 text-left relative overflow-hidden h-64 flex flex-col">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <Castle className="text-white w-12 h-12 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">炮塔守卫</h3>
                    <p className="text-blue-100 text-sm font-medium flex-1">怪兽来了！看中文，选出正确的英文单词发射炮弹！</p>
                    <div className="mt-4 inline-flex items-center text-sm font-bold bg-white/20 px-3 py-1 rounded-full">{lessonData.towerWords.length} 波数</div>
                </button>

                <button onClick={() => { setSelectedGame(GameMode.KITCHEN); setInputMode('playing'); }} className="group bg-gradient-to-br from-orange-400 to-red-500 text-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 text-left relative overflow-hidden h-64 flex flex-col">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <Puzzle className="text-white w-12 h-12 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">单词消消乐</h3>
                    <p className="text-orange-100 text-sm font-medium flex-1">中英配对连连看！消除所有的卡片来获得高分！</p>
                    <div className="mt-4 inline-flex items-center text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                        {getMatchingPairs().length} 对卡片
                    </div>
                </button>

                <button onClick={() => { setSelectedGame(GameMode.FLASHCARD); setInputMode('playing'); }} className="group bg-gradient-to-br from-pink-500 to-purple-600 text-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 text-left relative overflow-hidden h-64 flex flex-col">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                    <ImageIcon className="text-white w-12 h-12 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">情景记忆卡</h3>
                    <p className="text-pink-100 text-sm font-medium flex-1">AI 现场画图！看着图片听发音，猜猜背后是什么单词？</p>
                    <div className="mt-4 inline-flex items-center text-sm font-bold bg-white/20 px-3 py-1 rounded-full">{lessonData.flashcards.length} 张卡片</div>
                </button>
            </div>
            <div className="text-center pt-8">
                <button onClick={() => setInputMode('start')} className="text-slate-400 hover:text-slate-600 font-bold text-sm flex items-center justify-center gap-2 mx-auto px-4 py-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight className="rotate-180" size={16}/> 返回资料库
                </button>
            </div>
          </div>
        );

      case 'playing':
        if (!lessonData) return null;
        return (
          <div className="h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden relative border-4 border-slate-900 animate-fade-in">
             <button onClick={() => setInputMode('select')} className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-slate-800 px-4 py-2 rounded-full transition shadow-sm font-bold text-xs backdrop-blur flex items-center gap-2">
                 <X size={14}/> 退出游戏
             </button>
             {selectedGame === GameMode.TOWER && <TowerGame words={lessonData.towerWords} onExit={() => setInputMode('select')} />}
             
             {selectedGame === GameMode.KITCHEN && (
                 <KitchenGame 
                    pairs={getMatchingPairs()} 
                    onExit={() => setInputMode('select')} 
                 />
             )}
             
             {selectedGame === GameMode.FLASHCARD && <FlashcardGame cards={lessonData.flashcards} onExit={() => setInputMode('select')} onUpdateCardImage={handleFlashcardUpdate} />}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-200">
      <main className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {renderContent()}
        {renderInstallModal()}
      </main>
    </div>
  );
};

export default App;