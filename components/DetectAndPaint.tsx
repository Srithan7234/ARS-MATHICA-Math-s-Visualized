import React, { useState, useRef } from 'react';
import { 
  Upload, Sparkles, Brain, Wand2, RefreshCw, Download, Share2, 
  Target, Info, AlertCircle, Scan, Palette, Maximize, X, Image as ImageIcon, Image, Key, Layers
} from 'lucide-react';
import { analyzeFractalPattern, generateFractalArt, optimizePrompt } from '../services/geminiService';

type ToolMode = 'DETECT' | 'PAINT';

export const DetectAndPaint: React.FC = () => {
  const [mode, setMode] = useState<ToolMode>('DETECT');
  
  // --- DETECT STATE ---
  const [detectImage, setDetectImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // --- PAINT STATE ---
  const [paintImage, setPaintImage] = useState<string | null>(null); // Reference image
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Pure Math");
  const [imageSize, setImageSize] = useState("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const paintInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'DETECT' | 'PAINT') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'DETECT') {
            setDetectImage(reader.result as string);
            setAnalysisResult(null);
        } else {
            setPaintImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
      if (!detectImage) return;
      setErrorMsg(null);
      
      try {
          setIsAnalyzing(true);
          const result = await analyzeFractalPattern(detectImage);
          setAnalysisResult(result);
      } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Analysis failed.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleOptimizePrompt = async () => {
      if (!prompt) return;
      setIsOptimizing(true);
      setStatusMsg("Optimizing prompt with Gemini...");
      
      try {
          const optimized = await optimizePrompt(prompt);
          setPrompt(optimized);
          setStatusMsg("Prompt enhanced!");
          setTimeout(() => setStatusMsg(""), 2000);
      } catch (e: any) {
          console.error(e);
          // Fail silently or show minor toast, keep original prompt
      } finally {
          setIsOptimizing(false);
      }
  };

  const runGeneration = async () => {
      if (!prompt) return;
      setErrorMsg(null);
      setGeneratedImage(null);
      setIsGenerating(true);
      setStatusMsg("Initializing Gemini Imaging...");
      
      try {
          setStatusMsg("Dreaming in Fractals...");
          const resultUrl = await generateFractalArt(prompt, selectedStyle, imageSize, paintImage || undefined);
          
          setGeneratedImage(resultUrl);
          setStatusMsg("");

      } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Generation failed.");
          setStatusMsg("");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-gray-200 overflow-hidden">
        {/* --- Header --- */}
        <div className="px-8 py-6 border-b border-white/5 bg-black/50">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent font-[Orbitron]">Creation Tools</h1>
            <p className="text-sm text-gray-500 mt-1">Analyze patterns or paint with mathematics</p>
            
            {/* Mode Switcher */}
            <div className="mt-6 flex bg-[#13141f] w-fit p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setMode('DETECT')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'DETECT' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Scan size={16} /> Pattern Detector
                </button>
                <button 
                    onClick={() => setMode('PAINT')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${mode === 'PAINT' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Wand2 size={16} /> Fractal Painter
                </button>
            </div>
        </div>

        {/* --- Content --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center justify-between text-red-200 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-900/40 rounded"><X size={16} /></button>
                </div>
            )}

            {mode === 'DETECT' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left: Upload & Config */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Upload size={18} className="text-cyan-400"/> Upload Pattern Image</h2>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 rounded-xl h-64 flex flex-col items-center justify-center bg-[#13141f]/50 hover:bg-[#13141f] hover:border-purple-500/50 transition-all cursor-pointer relative overflow-hidden group"
                            >
                                {detectImage ? (
                                    <img src={detectImage} alt="Upload" className="w-full h-full object-contain z-10 p-2" />
                                ) : (
                                    <>
                                        <div className="p-4 bg-[#1e1f2e] rounded-full mb-3 group-hover:scale-110 transition-transform"><ImageIcon size={32} className="text-gray-400" /></div>
                                        <p className="text-sm font-bold text-gray-300">Drop Your Image Here</p>
                                        <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'DETECT')} className="hidden" accept="image/*" />
                                
                                {detectImage && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDetectImage(null); setAnalysisResult(null); }}
                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/80 transition-colors z-20"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={runAnalysis}
                                    disabled={!detectImage || isAnalyzing}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                >
                                    {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Scan size={18} />}
                                    {isAnalyzing ? "Analyzing Geometry..." : "Analyze Pattern"}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Analysis Preferences</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Coordinate System</label>
                                    <select className="w-full bg-[#13141f] border border-white/10 rounded-lg py-2 px-3 text-sm text-gray-300 outline-none focus:border-cyan-500/50">
                                        <option>Auto-detect</option>
                                        <option>Cartesian (x, y)</option>
                                        <option>Polar (r, θ)</option>
                                        <option>Complex Plane (z)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-1 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-600"></div>
                        <div className="p-6 h-full flex flex-col">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Sparkles size={18} className="text-purple-400" /> Analysis Results</h2>
                            
                            {analysisResult ? (
                                <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-[#13141f] border border-purple-500/20 rounded-xl p-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full"></div>
                                        <div className="text-xs text-purple-400 font-bold uppercase mb-1">Pattern Type</div>
                                        <div className="text-xl font-bold text-white">{analysisResult.patternType}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#13141f] rounded-xl p-4 border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">Self-Similarity</div>
                                            <div className="text-2xl font-mono text-cyan-400">{analysisResult.similarityScore}%</div>
                                        </div>
                                        <div className="bg-[#13141f] rounded-xl p-4 border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">Complexity Class</div>
                                            <div className="text-sm font-bold text-white">Type IV (Chaotic)</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-sm font-bold text-gray-300 mb-3 border-l-2 border-cyan-500 pl-3">Mathematical Properties</div>
                                        <div className="flex flex-wrap gap-2">
                                            {analysisResult.mathematicalProperties.map((prop: string, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-cyan-900/20 text-cyan-300 rounded-full text-xs border border-cyan-500/20">{prop}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-sm text-green-400 relative group cursor-pointer hover:bg-black/60 transition-colors">
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-gray-500">Copy LaTeX</div>
                                        {analysisResult.primaryEquation}
                                    </div>

                                    <p className="text-sm text-gray-400 leading-relaxed italic bg-[#1e1f2e]/50 p-4 rounded-lg border border-white/5">
                                        "{analysisResult.description}"
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                                    <div className={`p-6 rounded-full bg-[#13141f] ${isAnalyzing ? 'animate-pulse' : ''}`}>
                                        <Brain size={48} className={`opacity-20 ${isAnalyzing ? 'text-purple-500 opacity-100' : ''}`} />
                                    </div>
                                    <p className="text-sm">{isAnalyzing ? "Processing neural geometry..." : "Upload an image to begin mathematical extraction"}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {mode === 'PAINT' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    {/* Left: Controls (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* Reference Image */}
                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-sm font-bold text-gray-300">Reference Image (Optional)</h2>
                                {paintImage && <button onClick={() => setPaintImage(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
                            </div>
                            
                            {!paintImage ? (
                                <div onClick={() => paintInputRef.current?.click()} className="h-32 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-4 cursor-pointer hover:bg-[#13141f] transition-colors">
                                    <div className="p-3 bg-[#1e1f2e] rounded-lg"><Image size={20} className="text-purple-400" /></div>
                                    <div className="text-sm text-gray-500">Drop image for structure guidance</div>
                                </div>
                            ) : (
                                <div className="h-32 relative rounded-xl overflow-hidden border border-white/10 bg-black group">
                                    <img src={paintImage} alt="Ref" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => setPaintImage(null)} className="text-white text-xs font-bold bg-red-500/20 px-3 py-1 rounded-full hover:bg-red-500/40">Remove</button>
                                    </div>
                                </div>
                            )}
                            <input type="file" ref={paintInputRef} onChange={(e) => handleFileUpload(e, 'PAINT')} className="hidden" />
                        </div>

                        {/* Prompt Input */}
                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-bold text-white block">What do you want to create?</label>
                                <button 
                                    onClick={handleOptimizePrompt}
                                    disabled={!prompt || isOptimizing}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-[10px] font-bold text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <Sparkles size={12} className={isOptimizing ? "animate-spin" : "group-hover:text-purple-300"} /> 
                                    {isOptimizing ? "Optimizing..." : "Enhance Prompt"}
                                </button>
                            </div>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Mona Lisa but made of spirals, A cyberpunk city in a fractal loop..." 
                                className="w-full h-24 bg-[#13141f] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 outline-none resize-none"
                            />
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {['Recursive', 'Mandelbrot set', 'Fibonacci spiral', 'Golden ratio', 'Self-similar', 'Infinite zoom', 'Kaleidoscopic'].map(tag => (
                                    <button key={tag} onClick={() => setPrompt(p => p + (p ? ' ' : '') + tag)} className="px-3 py-1 bg-[#1e1f2e] border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-purple-500/50 transition-all shrink-0">
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Image Size Selection */}
                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                                <Layers size={16} className="text-purple-400" /> Output Resolution
                            </h2>
                            <div className="flex gap-3">
                                {['1K', '2K', '4K'].map(size => (
                                    <button 
                                        key={size}
                                        onClick={() => setImageSize(size)}
                                        className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${imageSize === size ? 'bg-purple-900/20 border-purple-500 text-purple-300 ring-1 ring-purple-500/30' : 'bg-[#13141f] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="bg-[#0c0d15] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-sm font-bold text-gray-300 mb-4">Fractal Style</h2>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { name: 'Van Gogh', desc: 'Swirling starry strokes', color: 'bg-orange-500' },
                                    { name: 'Cyberpunk', desc: 'Neon geometric glow', color: 'bg-pink-500' },
                                    { name: 'Pure Math', desc: 'Raw recursive geometry', color: 'bg-emerald-500' },
                                    { name: 'Surrealist', desc: 'Melting dreamlike forms', color: 'bg-purple-500' },
                                    { name: 'Ukiyo-e', desc: 'Japanese wave patterns', color: 'bg-red-500' },
                                    { name: 'Monet', desc: 'Soft impressionist light', color: 'bg-blue-500' },
                                ].map(style => (
                                    <button 
                                        key={style.name}
                                        onClick={() => setSelectedStyle(style.name)}
                                        className={`p-3 rounded-xl border text-left transition-all ${selectedStyle === style.name ? 'bg-[#1e1f2e] border-purple-500 ring-1 ring-purple-500/30' : 'bg-[#13141f] border-white/5 hover:border-white/20'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${style.color} mb-2`}></div>
                                        <div className="text-xs font-bold text-white">{style.name}</div>
                                        <div className="text-[10px] text-gray-500">{style.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={runGeneration}
                            disabled={isGenerating || !prompt}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-auto"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 size={20} />}
                            {isGenerating ? `Generating with Gemini 3...` : "Generate Masterpiece"}
                        </button>
                        
                        {/* Status Message */}
                        {statusMsg && (
                            <div className="text-center text-xs text-purple-400 font-mono animate-pulse">
                                {statusMsg}
                            </div>
                        )}
                    </div>

                    {/* Right: Output (4 cols) */}
                    <div className="lg:col-span-4 bg-[#050508] border border-white/10 rounded-2xl p-2 h-full min-h-[600px] flex flex-col">
                        {generatedImage ? (
                            <>
                                <div className="relative flex-1 rounded-xl overflow-hidden bg-black group">
                                    <img src={generatedImage} alt="Result" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button className="p-3 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"><Maximize size={20}/></button>
                                        <a href={generatedImage} download="fractal_art.png" className="p-3 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 text-white"><Download size={20}/></a>
                                    </div>
                                </div>
                                {/* Fingerprint Card */}
                                <div className="mt-2 bg-[#13141f] rounded-xl p-4 border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Target size={20}/></div>
                                            <div>
                                                <div className="text-xs font-bold text-white">Gemini Fingerprint</div>
                                                <div className="text-[10px] text-gray-500">Model: Gemini 3 Pro / Flash</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500">Seed: {Math.floor(Math.random() * 1000)}</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        <div className="text-center p-2 bg-[#0c0d15] rounded-lg">
                                            <div className="text-xs font-bold text-white">{imageSize}</div>
                                            <div className="text-[9px] text-gray-500">Res</div>
                                        </div>
                                        <div className="text-center p-2 bg-[#0c0d15] rounded-lg">
                                            <div className="text-xs font-bold text-white">Google</div>
                                            <div className="text-[9px] text-gray-500">Cloud</div>
                                        </div>
                                        <div className="text-center p-2 bg-[#0c0d15] rounded-lg">
                                            <div className="text-xs font-bold text-white">Imagen</div>
                                            <div className="text-[9px] text-gray-500">Engine</div>
                                        </div>
                                        <div className="text-center p-2 bg-[#0c0d15] rounded-lg">
                                            <div className="text-xs font-bold text-white">High</div>
                                            <div className="text-[9px] text-gray-500">Quality</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 rounded bg-purple-500 text-white text-[10px] font-bold">{selectedStyle}</span>
                                            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">{imageSize}</span>
                                            <span className="text-[10px] text-gray-400 truncate flex-1">"{prompt}"</span>
                                        </div>
                                        <div className="h-8 flex gap-1 mt-2">
                                            <div className="flex-1 bg-cyan-500 rounded-sm"></div>
                                            <div className="flex-1 bg-blue-600 rounded-sm"></div>
                                            <div className="flex-1 bg-purple-600 rounded-sm"></div>
                                            <div className="flex-1 bg-pink-500 rounded-sm"></div>
                                            <div className="flex-1 bg-orange-500 rounded-sm"></div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-4">
                                        <button className="flex-1 py-2 bg-[#6d28d9] rounded-lg text-xs font-bold text-white hover:bg-[#5b21b6] flex items-center justify-center gap-2"><Share2 size={12} /> Share Stats</button>
                                        <button className="flex-1 py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"><Download size={12} /> JSON</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                                <Palette size={48} className="opacity-20" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-400">Ready to Create</p>
                                    <p className="text-xs text-gray-600 mt-1 max-w-[200px]">Enter a prompt and select a style to generate your unique fractal artwork.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};