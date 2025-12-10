
import React, { useState, useRef } from 'react';
import { FractalVis, FractalVisRef } from './components/FractalVis';
import { AlgorithmicArt, AlgorithmicArtRef, ArtPatternType, ColorScheme } from './components/AlgorithmicArt';
import { DetectAndPaint } from './components/DetectAndPaint'; // Import the new component
import { CommunityGallery } from './components/CommunityGallery'; // Import Gallery
import { Settings } from './components/Settings'; // Import Settings
import { TutorialModal } from './components/TutorialModal';
import { FractalMode, AnimationPreset } from './types';
import { getFractalInsight } from './services/geminiService';
import { 
  Box, Layers, Share2, Download, RefreshCw, Save, Settings as SettingsIcon, Keyboard, ChevronDown,
  PlayCircle, Activity, Zap, LayoutGrid, Sliders, Hand, X, Palette, Play, Grid,
  Maximize2, Minimize2, Video, MousePointer,
  Sparkles, Atom, Brain, Image as ImageIcon, Users,
  BookOpen, HelpCircle, Folder, Shuffle, Wand2, TreeDeciduous, Triangle, Hexagon, Flower, Wind, CloudLightning,
  List, RotateCw, Check, Camera, Move3d
} from 'lucide-react';

const formatModeName = (mode: FractalMode) => {
    switch (mode) {
        case FractalMode.MANDELBULB_3D: return "Mandelbulb 3D";
        case FractalMode.JULIA_2D: return "Julia Set (2D)";
        case FractalMode.MANDELBROT: return "Mandelbrot Set";
        case FractalMode.TRICORN: return "Tricorn Fractal";
        case FractalMode.BURNING_SHIP: return "Burning Ship";
        case FractalMode.MENGER_SPONGE: return "Menger Sponge";
        case FractalMode.SIERPINSKI: return "Sierpinski Tet";
        default: return mode;
    }
};

const ART_PRESETS = [
   { name: "Fractal Tree", type: "Trees", icon: TreeDeciduous, code: 'FRACTAL_TREE' },
   { name: "Binary Tree", type: "Trees", icon: TreeDeciduous, code: 'BINARY_TREE' },
   { name: "Pythagoras Tree", type: "Trees", icon: Grid, code: 'PYTHAGORAS_TREE' },
   { name: "Fractal Bush", type: "Trees", icon: TreeDeciduous, code: 'FRACTAL_BUSH' },
   { name: "Koch Snowflake", type: "Curves", icon: Hexagon, code: 'KOCH_SNOWFLAKE' },
   { name: "Sierpinski Triangle", type: "Geometric", icon: Triangle, code: 'SIERPINSKI_TRIANGLE' },
   { name: "Dragon Curve", type: "Curves", icon: Wind, code: 'DRAGON_CURVE' },
   { name: "Levy C Curve", type: "Curves", icon: Wind, code: 'LEVY_C_CURVE' },
   { name: "Sierpinski Carpet", type: "Geometric", icon: Box, code: 'SIERPINSKI_CARPET' },
   { name: "Cantor Set", type: "Geometric", icon: Sliders, code: 'CANTOR_SET' },
   { name: "Fractal Lightning", type: "Nature", icon: Zap, code: 'FRACTAL_LIGHTNING' },
   { name: "Coral Branching", type: "Nature", icon: CloudLightning, code: 'CORAL_BRANCHING' },
   { name: "Algae Pattern", type: "L-Systems", icon: Flower, code: 'ALGAE_L_SYSTEM' },
   { name: "Flower Fractal", type: "L-Systems", icon: Flower, code: 'FLOWER_FRACTAL' },
];

const App: React.FC = () => {
  // Global Nav State
  const [activeTab, setActiveTab] = useState('EXPLORER'); // EXPLORER, ART, DETECT, COMMUNITY

  // --- FRACTAL EXPLORER STATE ---
  const [mode, setMode] = useState<FractalMode>(FractalMode.JULIA_2D);
  const [stats, setStats] = useState<string>("Initializing...");
  const [insight, setInsight] = useState<string>("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [fractalDropdownOpen, setFractalDropdownOpen] = useState(false);
  
  const [controlsOpen, setControlsOpen] = useState(true);
  
  const [activeAnimation, setActiveAnimation] = useState<AnimationPreset>('NONE');
  const [isInteractive, setIsInteractive] = useState(false); // Interactive Mode State

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAnimationOpen, setIsAnimationOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'parameters' | 'colors'>('parameters');

  const [attractionSens, setAttractionSens] = useState(1.0);
  const [pinchSens, setPinchSens] = useState(1.0);
  const [morphSpeed, setMorphSpeed] = useState(0.1);

  const [iterations, setIterations] = useState(128); 
  const [power, setPower] = useState(8.0);
  // Default to 0 (Reference/Purple) as per user request
  const [colorMode, setColorMode] = useState(0); 

  const visRef = useRef<FractalVisRef>(null);

  // --- ALGORITHMIC ART STATE ---
  const artRef = useRef<AlgorithmicArtRef>(null);
  const [artPattern, setArtPattern] = useState<ArtPatternType>('FRACTAL_TREE');
  const [artDepth, setArtDepth] = useState(10);
  const [artAngle, setArtAngle] = useState(25);
  const [artRatio, setArtRatio] = useState(0.7);
  const [artRandomness, setArtRandomness] = useState(0.0);
  const [artAnimate, setArtAnimate] = useState(false);
  const [artColorScheme, setArtColorScheme] = useState<ColorScheme>('COSMIC');
  
  const [isArtBrowseOpen, setIsArtBrowseOpen] = useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [artPatternDropdownOpen, setArtPatternDropdownOpen] = useState(false);
  
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Helper booleans for highlighting
  const is2DMode = mode === FractalMode.JULIA_2D || mode === FractalMode.MANDELBROT || mode === FractalMode.TRICORN || mode === FractalMode.BURNING_SHIP;
  const is3DMode = mode === FractalMode.MANDELBULB_3D || mode === FractalMode.MENGER_SPONGE || mode === FractalMode.SIERPINSKI;

  // --- HANDLERS ---

  const handleGeminiAnalysis = async () => {
    setIsLoadingInsight(true);
    setInsight("Analyzing dimensional data...");
    const text = await getFractalInsight(mode, stats);
    setInsight(text);
    setIsLoadingInsight(false);
  };

  const handleDownload = () => {
      let dataUrl = "";
      if (activeTab === 'EXPLORER' && visRef.current) {
          dataUrl = visRef.current.captureImage();
      } else if (activeTab === 'ART' && artRef.current) {
          dataUrl = artRef.current.captureImage();
      }

      if (dataUrl) {
          const link = document.createElement('a');
          link.download = `fractal_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
      }
  };

  const handleShare = () => {
      let dataUrl = "";
      if (activeTab === 'EXPLORER' && visRef.current) dataUrl = visRef.current.captureImage();
      else if (activeTab === 'ART' && artRef.current) dataUrl = artRef.current.captureImage();

      if (dataUrl && navigator.share) {
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], "art.png", { type: "image/png" });
                navigator.share({ title: 'Fractal Art', text: 'Created with Fractal Universe', files: [file] }).catch(console.error);
            });
      }
  };

  const playAnimation = (preset: AnimationPreset) => {
      setActiveAnimation(preset);
      setIsAnimationOpen(false); 
  };

  const PresetCard = ({ title, desc, icon: Icon, onClick }: { title: string, desc: string, icon: any, onClick?: () => void }) => (
    <button onClick={onClick} className="w-full text-left p-4 rounded-xl bg-[#13141f] hover:bg-[#1e1f2e] border border-white/5 hover:border-purple-500/30 transition-all group mb-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/0 to-purple-900/0 group-hover:from-purple-900/10 group-hover:to-transparent transition-all"></div>
      <div className="flex items-start gap-3 relative z-10">
        <div className="p-2 rounded-lg bg-[#0a0b10] text-purple-400 group-hover:text-purple-300 ring-1 ring-white/5">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-200 group-hover:text-white flex items-center justify-between w-full">
            {title}
            <PlayCircle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 ml-2" />
          </h4>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  );

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex flex-col items-center justify-center gap-2 p-3 transition-all relative group ${activeTab === id ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <div className={`p-3 rounded-xl transition-all ${activeTab === id ? 'bg-purple-500/10 ring-1 ring-purple-500/50' : 'group-hover:bg-white/5'}`}>
            <Icon size={24} strokeWidth={1.5} />
        </div>
        <span className="text-[9px] font-bold text-center leading-none tracking-wide">{label}</span>
        {activeTab === id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-purple-500 rounded-l-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
    </button>
  );

  const ArtPresetItem = ({ name, type, icon: Icon, active, onClick }: any) => (
      <div onClick={onClick} className={`cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all ${active ? 'bg-purple-900/20 border-purple-500/50' : 'bg-[#1a1b26] border-white/5 hover:border-white/10'}`}>
          <div className="p-2 bg-[#0a0b10] rounded text-purple-400"><Icon size={16} /></div>
          <div>
              <div className="text-xs font-bold text-gray-200">{name}</div>
              <div className="text-[10px] text-gray-500">{type}</div>
          </div>
      </div>
  );

  const COLOR_MODES = [
    { id: 0, name: 'Reference', gradient: 'from-black via-purple-900 to-white', desc: 'Strict Deep Purple & Black' },
    { id: 1, name: 'Magma', gradient: 'from-red-900 via-orange-900 to-black', desc: 'Fiery reds & bright yellows' },
    { id: 2, name: 'Aqua', gradient: 'from-blue-900 via-cyan-900 to-black', desc: 'Oceanic blues & teals' },
    { id: 3, name: 'Matrix', gradient: 'from-green-900 via-green-800 to-black', desc: 'Digital toxic greens' },
    { id: 4, name: 'Cyberpunk', gradient: 'from-pink-900 via-purple-900 to-blue-900', desc: 'Neon pinks & electric blues' },
  ];

  return (
    <div className="flex h-screen bg-black text-gray-300 font-sans selection:bg-purple-500/30 selection:text-white overflow-hidden relative">
      
      {/* Global Navigation Sidebar */}
      <aside className="w-[100px] bg-black border-r border-white/10 flex flex-col items-center py-6 gap-2 shrink-0 z-50 shadow-2xl">
          <div className="mb-4 text-purple-500"><Zap size={32}/></div>
          <NavItem icon={Sparkles} label="FRACTAL EXPLORER" id="EXPLORER" />
          <NavItem icon={Atom} label="ALGORITHMIC ART" id="ART" />
          <NavItem icon={Brain} label="DETECT & PAINT" id="DETECT" />
          <NavItem icon={ImageIcon} label="COMMUNITY" id="COMMUNITY" />
          
          <div className="mt-auto w-full flex flex-col items-center gap-2">
            <div className="w-12 h-[1px] bg-white/5 my-2"></div>
            <NavItem icon={SettingsIcon} label="SETTINGS" id="SETTINGS" />
          </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* --- ALL MODALS (Rendered at top level to ensure visibility) --- */}
      
      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} type="TUTORIAL" />
      <TutorialModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} type="HELP" />

      {isArtBrowseOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#0c0d15] w-[900px] h-[700px] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
                  <div>
                      <h2 className="text-xl font-bold text-white mb-1">Fractal Browser</h2>
                      <p className="text-xs text-gray-500">{ART_PRESETS.length} fractals available</p>
                  </div>
                  <button onClick={() => setIsArtBrowseOpen(false)}><X size={20} className="hover:text-white" /></button>
               </div>
               <div className="px-6 py-4 border-b border-white/5 flex gap-2">
                   <div className="flex-1 relative">
                       <input type="text" placeholder="Search fractals..." className="w-full bg-[#13141f] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50" />
                       <div className="absolute left-3 top-2.5 text-gray-500"><Grid size={14} /></div>
                   </div>
                   <button className="p-2 bg-[#13141f] border border-white/10 rounded-lg text-gray-400 hover:text-white"><List size={16} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4 custom-scrollbar">
                   {ART_PRESETS.map((item, i) => (
                       <div key={i} onClick={() => { setArtPattern(item.code as ArtPatternType); setIsArtBrowseOpen(false); }} className={`p-4 rounded-xl border border-white/5 bg-[#13141f] hover:border-purple-500/40 cursor-pointer group relative overflow-hidden`}>
                           <div className="flex items-start gap-3">
                               <div className="p-2.5 bg-[#0a0b10] rounded-lg text-purple-400 group-hover:text-purple-300 transition-colors">
                                   <item.icon size={20} />
                               </div>
                               <div>
                                   <h3 className="font-bold text-gray-200 text-sm mb-1">{item.name}</h3>
                                   <span className="px-1.5 py-0.5 rounded bg-[#1e1f2e] text-[10px] text-gray-400 border border-white/5">{item.type}</span>
                               </div>
                           </div>
                           <p className="text-[10px] text-gray-500 mt-3 leading-snug">Recursive algorithmic pattern generation.</p>
                       </div>
                   ))}
               </div>
            </div>
          </div>
      )}

      {/* ... PresetManagerModal (Omitted for brevity, assumed existing logic) ... */}

      {isAnimationOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#0c0d15] w-[800px] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-purple-400">
                      <PlayCircle size={18} />
                      <h2 className="text-lg font-bold text-white">Animation Sequences</h2>
                  </div>
                  <button onClick={() => setIsAnimationOpen(false)}><X size={20} className="hover:text-white" /></button>
               </div>
               <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                      { id: 'MANDELBROT_DIVE', title: "Mandelbrot Deep Dive", time: "12s", desc: "Journey into the heart of the Mandelbrot set." },
                      { id: 'JULIA_MORPH', title: "Julia Set Morphing", time: "10s", desc: "Watch Julia sets transform through parameter space." },
                      { id: 'UNIVERSE_TOUR', title: "Fractal Universe Tour", time: "15s", desc: "Experience multiple fractal types in one journey." },
                      { id: 'GEOMETRIC_PATTERNS', title: "Geometric Patterns", time: "12s", desc: "L-System fractals showcasing recursive beauty." },
                      { id: 'COLOR_SYMPHONY', title: "Color Symphony", time: "12s", desc: "Same fractal, different color schemes." },
                      { id: 'INFINITY_ZOOM', title: "Infinity Zoom", time: "15s", desc: "Never-ending zoom into mathematical infinity." },
                  ].map((item, i) => (
                      <div key={i} className="bg-[#13141f] border border-white/5 rounded-xl p-4 hover:border-purple-500/40 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-white text-sm">{item.title}</h3>
                              <span className="text-[10px] bg-[#1e1f2e] px-1.5 py-0.5 rounded text-purple-300">{item.time}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-4 h-8">{item.desc}</p>
                          <button 
                            onClick={() => playAnimation(item.id as AnimationPreset)}
                            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-2 opacity-90 hover:opacity-100"
                          >
                              <Play size={12} fill="currentColor" /> Play Animation
                          </button>
                      </div>
                  ))}
               </div>
            </div>
          </div>
      )}

      {isLibraryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#0c0d15] w-[900px] h-[600px] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
               <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 text-purple-400">
                      <Grid size={18} />
                      <h2 className="text-lg font-bold text-white">Fractal Presets Library</h2>
                  </div>
                  <button onClick={() => setIsLibraryOpen(false)}><X size={20} className="hover:text-white" /></button>
               </div>
               <div className="p-6 overflow-y-auto grid grid-cols-3 gap-4 custom-scrollbar">
                  {[
                      { name: "Seahorse Valley", type: "Mandelbrot", tag: "Cosmic", zoom: "100x", mode: FractalMode.MANDELBROT },
                      { name: "Spiral Galaxy", type: "Mandelbulb", tag: "Aurora", zoom: "5000x", mode: FractalMode.MANDELBULB_3D },
                      { name: "Electric Dreams", type: "Julia", tag: "Fire", zoom: "1x", mode: FractalMode.JULIA_2D },
                      { name: "Burning Ship Voyage", type: "Burning Ship", tag: "Fire", zoom: "1x", mode: FractalMode.BURNING_SHIP },
                      { name: "Tricorn Mystery", type: "Tricorn", tag: "Cyberpunk", zoom: "1x", mode: FractalMode.TRICORN },
                      { name: "Sierpinski Pyramid", type: "Sierpinski", tag: "Bw", zoom: "1x", mode: FractalMode.SIERPINSKI },
                  ].map((item, i) => (
                      <div key={i} onClick={() => { setMode(item.mode); setIsLibraryOpen(false); }} className="bg-[#13141f] border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all group cursor-pointer">
                          <div className="h-24 bg-[#0a0b10] flex items-center justify-center relative">
                             <Box size={24} className="text-gray-700 group-hover:text-purple-500 transition-colors" />
                             <div className="absolute top-2 right-2 text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.type}</div>
                          </div>
                          <div className="p-3">
                              <h3 className="font-bold text-white text-xs mb-1">{item.name}</h3>
                              <div className="flex justify-between items-center text-[10px] text-gray-500">
                                  <span>Zoom: {item.zoom}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.tag === 'Fire' ? 'bg-red-900/30 text-red-400' : item.tag === 'Cosmic' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{item.tag}</span>
                              </div>
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          </div>
      )}

      {isAdvancedOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0c0d15] w-[600px] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-[#13141f]/50">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                    <Sliders size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Advanced Configuration</h2>
                </div>
                <p className="text-xs text-gray-500 pl-1">Fine-tune fractal generation parameters and rendering engine.</p>
              </div>
              <button 
                onClick={() => setIsAdvancedOpen(false)} 
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-8 border-b border-white/5 bg-[#0a0b10]">
               {['parameters', 'colors'].map((tab) => (
                 <button 
                    key={tab} 
                    onClick={() => setAdvancedTab(tab as any)} 
                    className={`
                        px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all relative
                        ${advancedTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                    `}
                 >
                    {tab}
                    {advancedTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                    )}
                 </button>
               ))}
            </div>

            {/* Content */}
            <div className="p-8 min-h-[320px] bg-black">
              {advancedTab === 'parameters' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {/* Iterations Slider */}
                   <div className="group">
                      <div className="flex justify-between text-xs mb-3">
                         <span className="text-gray-300 font-bold flex items-center gap-2">
                            <RotateCw size={12} className="text-purple-400"/> Iterations
                         </span>
                         <span className="text-purple-400 font-mono bg-purple-900/20 px-2 py-0.5 rounded border border-purple-500/20">{iterations}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="500" 
                        value={iterations} 
                        onChange={(e) => setIterations(parseInt(e.target.value))} 
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                      />
                      <p className="text-[10px] text-gray-600 mt-2">Higher iterations increase detail but may reduce performance.</p>
                   </div>

                   {/* Power Slider */}
                   <div className="group">
                      <div className="flex justify-between text-xs mb-3">
                         <span className="text-gray-300 font-bold flex items-center gap-2">
                            <Zap size={12} className="text-pink-400"/> Power Exponent
                         </span>
                         <span className="text-pink-400 font-mono bg-pink-900/20 px-2 py-0.5 rounded border border-pink-500/20">{power.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="16" 
                        step="0.1" 
                        value={power} 
                        onChange={(e) => setPower(parseFloat(e.target.value))} 
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                      />
                      <p className="text-[10px] text-gray-600 mt-2">Controls the folding complexity of the fractal formula.</p>
                   </div>
                </div>
              )}
              
              {advancedTab === 'colors' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 gap-3">
                          {COLOR_MODES.map((scheme) => (
                             <button
                                key={scheme.id}
                                onClick={() => setColorMode(scheme.id)}
                                className={`
                                  relative overflow-hidden rounded-xl border p-4 transition-all text-left flex items-center justify-between group
                                  ${colorMode === scheme.id ? 'border-purple-500 bg-[#13141f] shadow-[0_0_15px_rgba(147,51,234,0.2)]' : 'border-white/5 bg-[#0a0b10] hover:border-white/10'}
                                `}
                             >
                                <div className="flex items-center gap-4 relative z-10">
                                   <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${scheme.gradient} shadow-inner`}></div>
                                   <div>
                                      <h4 className={`text-xs font-bold ${colorMode === scheme.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{scheme.name}</h4>
                                      <p className="text-[10px] text-gray-600">{scheme.desc}</p>
                                   </div>
                                </div>
                                {colorMode === scheme.id && (
                                   <div className="text-purple-500 relative z-10">
                                      <Check size={16} strokeWidth={3} />
                                   </div>
                                )}
                                {colorMode === scheme.id && (
                                    <div className="absolute inset-0 bg-purple-500/5 z-0"></div>
                                )}
                             </button>
                          ))}
                      </div>
                  </div>
              )}
            </div>
            
            {/* Footer actions for Parameters */}
            {advancedTab === 'parameters' && (
                <div className="px-8 py-4 border-t border-white/5 bg-[#13141f]/30 flex justify-end gap-3">
                    <button 
                        onClick={() => { setIterations(128); setPower(8.0); }}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => setIsAdvancedOpen(false)}
                        className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/20 transition-all"
                    >
                        Apply Changes
                    </button>
                </div>
            )}
          </div>
        </div>
      )}

      {isShortcutsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0c0d15] w-[400px] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="px-5 py-4 border-b border-white/5 flex justify-between items-start">
               <div>
                 <div className="flex items-center gap-2 text-purple-400 mb-1">
                   <Keyboard size={16} />
                   <h2 className="text-base font-bold text-white">Keyboard Shortcuts</h2>
                 </div>
               </div>
               <button onClick={() => setIsShortcutsOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
             </div>
             <div className="p-5 space-y-1">
               {[
                 { action: 'Reset View', key: 'R' },
                 { action: 'Play/Pause Animation', key: 'Space' },
                 { action: 'Zoom In/Out', key: 'Scroll' },
                 { action: 'Pan (2D) / Orbit (3D)', key: 'Drag' },
               ].map((item, i) => (
                 <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                   <span className="text-xs font-medium text-gray-300">{item.action}</span>
                   <span className="px-2 py-1 rounded bg-[#1e1f2e] border border-white/10 text-[10px] font-mono text-gray-400 min-w-[24px] text-center">{item.key}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      )}

      
      {/* DYNAMIC CONTENT AREA */}
      
      {activeTab === 'EXPLORER' && (
         /* FRACTAL EXPLORER UI */
        <>
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/90 h-[80px] shrink-0 sticky top-0 z-40">
                <div>
                  <div className="h-1.5 w-32 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full mb-2"></div>
                  <h1 className="text-[10px] font-bold text-gray-500 tracking-[0.15em] uppercase">Interactive Mathematical Visualization</h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-[#13141f] border border-white/5 rounded-lg p-1">
                        <button onClick={() => setMode(FractalMode.JULIA_2D)} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${is2DMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Maximize2 size={12} /> 2D</button>
                        <button onClick={() => setMode(FractalMode.MANDELBULB_3D)} className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${is3DMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Box size={12} /> 3D</button>
                    </div>

                    {/* INTERACTIVE MODE TOGGLE */}
                    <button 
                        onClick={() => setIsInteractive(!isInteractive)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isInteractive ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-[#13141f] text-gray-400 border-white/5 hover:text-white'}`}
                    >
                        {isInteractive ? <Move3d size={14} /> : <MousePointer size={14} />}
                        {isInteractive ? 'Interactive Gestures' : 'Standard View'}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsAdvancedOpen(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#13141f] border border-white/5 rounded-lg hover:bg-[#1e1f2e] transition-colors text-gray-400 hover:text-white"><SettingsIcon size={14} /> Advanced</button>
                      <button onClick={() => setIsShortcutsOpen(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#13141f] border border-white/5 rounded-lg hover:bg-[#1e1f2e] transition-colors text-gray-400 hover:text-white"><Keyboard size={14} /> Shortcuts</button>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 p-6 gap-6 h-[calc(100vh-80px)] overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="relative flex-1 bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black group">
                        {/* Interactive Mode Overlay Hint */}
                        {isInteractive && (
                            <div className="absolute top-4 left-4 z-30 pointer-events-none">
                                {/* HUD IS RENDERED BY FRACTAL VIS */}
                            </div>
                        )}
                        
                        {/* Static Help Overlay for Gestures */}
                        {isInteractive && (
                            <div className="absolute bottom-6 right-6 z-30 bg-black/60 backdrop-blur border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gesture Guide</div>
                                <div className="flex items-center gap-2 text-xs text-white"><span className="text-xl">✋</span> <span className="font-bold">Palm</span> Hover / Steer</div>
                                <div className="flex items-center gap-2 text-xs text-white"><span className="text-xl">✊</span> <span className="font-bold">Fist</span> Grab / Rotate</div>
                                <div className="flex items-center gap-2 text-xs text-white"><span className="text-xl">👌</span> <span className="font-bold">Pinch</span> Zoom / Drag</div>
                                <div className="flex items-center gap-2 text-xs text-white"><span className="text-xl">👏</span> <span className="font-bold">Clap</span> Switch Mode</div>
                                <div className="flex items-center gap-2 text-xs text-white"><span className="text-xl">👊</span> <span className="font-bold">Punch</span> Pulse Zoom</div>
                            </div>
                        )}

                        {activeAnimation !== 'NONE' && (
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-purple-900/80 px-4 py-2 rounded-full border border-purple-500/50 backdrop-blur text-xs font-bold text-white shadow-lg animate-pulse flex items-center gap-2">
                                <PlayCircle size={14} /> Playing: {activeAnimation.replace('_', ' ')}
                                <button onClick={() => setActiveAnimation('NONE')} className="ml-2 hover:text-red-300"><X size={14} /></button>
                            </div>
                        )}
                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <button onClick={() => window.location.reload()} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5 transition-colors"><RefreshCw size={16} /></button>
                            <button onClick={handleDownload} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5 transition-colors"><Download size={16} /></button>
                            <button onClick={handleShare} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5 transition-colors"><Share2 size={16} /></button>
                        </div>
                        
                        <FractalVis 
                            ref={visRef} 
                            mode={mode} 
                            onStatsUpdate={setStats} 
                            attractionSensitivity={attractionSens} 
                            pinchSensitivity={pinchSens} 
                            morphSpeed={morphSpeed} 
                            iterations={iterations} 
                            power={power} 
                            interactiveMode={isInteractive} // Passed dynamic state
                            activeAnimation={activeAnimation} 
                            colorMode={colorMode} 
                        />
                        
                         {!isInteractive && (
                            <div className="absolute bottom-6 left-6 z-20 bg-[#0F1016]/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-lg text-xs font-mono text-gray-300 pointer-events-none">
                                <div className="flex items-center gap-3">
                                <span className="font-bold">Click & Drag to Pan</span>
                                <span className="w-[1px] h-3 bg-white/20"></span>
                                <span className="font-bold">Scroll to Zoom</span>
                                </div>
                            </div>
                         )}
                    </div>
                </div>

                {/* Right Sidebar Controls */}
                <div className="w-[300px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar">
                     {/* Controls */}
                    <div className="bg-[#13141f] border border-white/5 rounded-xl overflow-hidden shrink-0">
                        <button onClick={() => setControlsOpen(!controlsOpen)} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2 text-gray-400"><MousePointer size={14} /><h3 className="text-xs font-bold uppercase tracking-wider">Controls</h3></div>
                            <ChevronDown size={14} className={`text-gray-500 transition-transform ${controlsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {controlsOpen && (
                            <div className="p-4 pt-0 border-t border-white/5 bg-[#0a0b10]/50 space-y-5">
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] mb-1.5 text-gray-400 font-bold"><span>Attraction</span><span>{(attractionSens * 100).toFixed(0)}%</span></div>
                                    <input type="range" min="0" max="3" step="0.1" value={attractionSens} onChange={(e) => setAttractionSens(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1.5 text-gray-400 font-bold"><span>Pinch Power</span><span>{(pinchSens * 100).toFixed(0)}%</span></div>
                                    <input type="range" min="0" max="3" step="0.1" value={pinchSens} onChange={(e) => setPinchSens(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1.5 text-gray-400 font-bold"><span>Morph Speed</span><span>{(morphSpeed * 100).toFixed(0)}%</span></div>
                                    <input type="range" min="0.01" max="0.5" step="0.01" value={morphSpeed} onChange={(e) => setMorphSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                            </div>
                        )}
                    </div>

                     {/* Animation Presets */}
                    <div className="shrink-0 flex-1">
                        <div className="flex items-center justify-between mb-3 text-gray-400 px-1">
                          <div className="flex items-center gap-2"><LayoutGrid size={14} /><h3 className="text-xs font-bold uppercase tracking-wider">Animation Presets</h3></div>
                          <button onClick={() => setIsAnimationOpen(true)} className="text-[10px] text-purple-400 hover:text-white font-bold">View All</button>
                        </div>
                        <PresetCard title="Mandelbrot Deep Dive" desc="Journey into the heart of the Mandelbrot set." icon={Activity} onClick={() => playAnimation('MANDELBROT_DIVE')} />
                        <PresetCard title="Julia Set Morphing" desc="Transform through complex parameter space." icon={Layers} onClick={() => playAnimation('JULIA_MORPH')} />
                    </div>

                    <div className="bg-[#13141f] border border-white/5 rounded-xl p-4 shrink-0 mb-2 mt-auto">
                        <div className="flex items-center gap-2 mb-3 text-gray-400"><Box size={14} /><h3 className="text-xs font-bold uppercase tracking-wider">Fractal Type</h3></div>
                        <div className="relative">
                            <button onClick={() => setFractalDropdownOpen(!fractalDropdownOpen)} className="w-full flex items-center justify-between p-3 bg-[#0a0b10] border border-white/5 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/10 transition-colors"><span className="flex items-center gap-2">{formatModeName(mode)}</span><ChevronDown size={14} className={`transition-transform ${fractalDropdownOpen ? 'rotate-180' : ''}`} /></button>
                            {fractalDropdownOpen && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1b26] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                    {Object.values(FractalMode).map((m) => (<button key={m} onClick={() => { setMode(m); setFractalDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-purple-600 hover:text-white transition-colors">{formatModeName(m)}</button>))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
      )}

      {/* ... OTHER TABS ... */}
      {activeTab === 'ART' && (
        /* ALGORITHMIC ART STUDIO UI */
        <>
           <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/90 backdrop-blur-md sticky top-0 z-40 h-[76px] shrink-0">
               <div>
                   <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent font-[Orbitron] tracking-wide">Algorithmic Art Studio</h1>
                   <p className="text-[11px] text-gray-500 mt-0.5 tracking-wide uppercase">Create Beautiful Patterns Using Recursive Algorithms</p>
               </div>
               <div className="flex items-center gap-3">
                   <button onClick={() => setIsTutorialOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:bg-white/5"><BookOpen size={14} /> Tutorial</button>
                   <button onClick={() => setIsHelpOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:bg-white/5"><HelpCircle size={14} /> Help</button>
                   <button onClick={() => setIsArtBrowseOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:bg-white/5"><LayoutGrid size={14} /> Browse</button>
                   <button onClick={() => setIsPresetManagerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:bg-white/5"><Folder size={14} /> Presets</button>
               </div>
           </header>

           <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 h-[calc(100vh-76px)] overflow-hidden">
               {/* Canvas Area */}
               <div className="lg:col-span-3 flex flex-col gap-4">
                   <div className="relative flex-1 bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                       {/* Canvas Header Overlay */}
                       <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                           <div className="pointer-events-auto">
                               <div className="flex items-center gap-2 text-green-400 mb-1"><TreeDeciduous size={16} /> <span className="font-bold text-sm text-gray-200">{artPattern === 'FRACTAL_TREE' ? 'Fractal Tree' : artPattern.replace(/_/g, ' ')}</span></div>
                               <div className="text-[10px] text-cyan-400 font-mono">L<sub>n+1</sub> = L<sub>n</sub> × r, θ<sub>n+1</sub> = θ<sub>n</sub> ± α</div>
                               <div className="text-[10px] text-gray-500 mt-1">Recursive branching with angle variation</div>
                           </div>
                           <div className="flex items-center gap-2 pointer-events-auto">
                               <button onClick={() => setArtRandomness(Math.random())} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5"><Shuffle size={14} /></button>
                               <button onClick={() => { setArtAngle(25); setArtDepth(10); setArtRatio(0.7); }} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5"><RefreshCw size={14} /></button>
                               <button onClick={handleDownload} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5"><Download size={14} /></button>
                               <button onClick={handleShare} className="p-2 bg-[#0F1016]/80 hover:bg-[#1F212E] rounded-lg text-gray-400 hover:text-white border border-white/5 flex items-center gap-2"><Share2 size={14} /> Share</button>
                               <button onClick={() => setArtAnimate(!artAnimate)} className={`p-2 rounded-lg border border-white/5 transition-colors ${artAnimate ? 'bg-purple-600 text-white' : 'bg-[#0F1016]/80 text-gray-400 hover:text-white'}`}><Wand2 size={14} /></button>
                           </div>
                       </div>
                       
                       <div className="w-full h-full p-10">
                           <AlgorithmicArt 
                             ref={artRef}
                             pattern={artPattern}
                             depth={artDepth}
                             angle={artAngle}
                             ratio={artRatio}
                             randomness={artRandomness}
                             animate={artAnimate}
                             colorScheme={artColorScheme}
                           />
                       </div>
                   </div>
               </div>

               {/* Right Sidebar Controls */}
               <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar pb-10">
                   {/* Pattern Type */}
                   <div className="bg-[#13141f] border border-white/5 rounded-xl p-4 shrink-0">
                       <label className="text-xs font-bold text-gray-400 mb-3 block">Pattern Type</label>
                       <div className="relative">
                            <button onClick={() => setArtPatternDropdownOpen(!artPatternDropdownOpen)} className="w-full flex items-center justify-between p-3 bg-[#0a0b10] border border-white/5 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-1 rounded bg-green-900/30 text-green-400">
                                        <TreeDeciduous size={16}/>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold">{artPattern.replace(/_/g,' ')}</div>
                                        <div className="text-[9px] text-gray-500">Recursive</div>
                                    </div>
                                </div>
                                <ChevronDown size={14} />
                            </button>
                            {artPatternDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b26] border border-white/10 rounded-lg shadow-xl z-50 p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {ART_PRESETS.map((preset) => (
                                        <ArtPresetItem 
                                            key={preset.code}
                                            name={preset.name} 
                                            type={preset.type} 
                                            icon={preset.icon} 
                                            active={artPattern === preset.code} 
                                            onClick={() => { setArtPattern(preset.code as ArtPatternType); setArtPatternDropdownOpen(false); }} 
                                        />
                                    ))}
                                </div>
                            )}
                       </div>
                   </div>

                   {/* Parameters */}
                   <div className="bg-[#13141f] border border-white/5 rounded-xl p-4 shrink-0 space-y-5">
                       <div className="flex items-center justify-between"><label className="text-xs font-bold text-gray-400">Parameters</label></div>
                       
                       <div>
                           <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Recursion Depth</span><span>{artDepth}</span></div>
                           <input type="range" min="1" max="14" step="1" value={artDepth} onChange={(e) => setArtDepth(parseInt(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                       </div>
                       <div>
                           <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Branch Angle</span><span>{artAngle.toFixed(1)}°</span></div>
                           <input type="range" min="0" max="180" step="0.5" value={artAngle} onChange={(e) => setArtAngle(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                       </div>
                       <div>
                           <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Branch Ratio</span><span>{artRatio.toFixed(2)}</span></div>
                           <input type="range" min="0.1" max="0.85" step="0.01" value={artRatio} onChange={(e) => setArtRatio(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                       </div>
                       <div>
                           <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Randomness</span><span>{artRandomness.toFixed(1)}°</span></div>
                           <input type="range" min="0" max="1" step="0.1" value={artRandomness} onChange={(e) => setArtRandomness(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                       </div>
                       <div className="flex items-center justify-between pt-2">
                           <span className="text-xs text-gray-400">Animate Growth</span>
                           <button onClick={() => setArtAnimate(!artAnimate)} className={`w-10 h-5 rounded-full relative transition-colors ${artAnimate ? 'bg-purple-600' : 'bg-gray-700'}`}>
                               <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${artAnimate ? 'left-6' : 'left-1'}`}></div>
                           </button>
                       </div>
                   </div>

                   {/* Color Scheme */}
                   <div className="bg-[#13141f] border border-white/5 rounded-xl p-4 shrink-0">
                       <label className="text-xs font-bold text-gray-400 mb-3 block">Color Scheme</label>
                       <div className="space-y-2">
                           {['COSMIC', 'FIRE', 'OCEAN', 'RAINBOW', 'FOREST'].map(( scheme ) => (
                               <button key={scheme} onClick={() => setArtColorScheme(scheme as ColorScheme)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${artColorScheme === scheme ? 'bg-purple-900/30 border-purple-500 text-white' : 'bg-[#0a0b10] border-white/5 text-gray-400 hover:border-white/20'}`}>
                                   {scheme.charAt(0) + scheme.slice(1).toLowerCase()}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
           </main>
        </>
      )}

      {/* --- DETECT & PAINT TAB --- */}
      {activeTab === 'DETECT' && (
          <DetectAndPaint />
      )}

      {/* --- COMMUNITY TAB --- */}
      {activeTab === 'COMMUNITY' && (
          <CommunityGallery />
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'SETTINGS' && (
          <Settings />
      )}
      
      </div>
    </div>
  );
};

export default App;
