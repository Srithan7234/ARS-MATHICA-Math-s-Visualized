import React, { useState } from 'react';
import { 
  Zap, Palette, BookOpen, User, Shield, 
  Save, RotateCcw, Check, AlertTriangle, Eye, CheckCircle, Flag, Trash2,
  ChevronDown, Check as CheckIcon
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DEFAULTS' | 'APPEARANCE' | 'TUTORIALS' | 'PROFILE' | 'MODERATION'>('DEFAULTS');

  // Form States
  const [fractal2D, setFractal2D] = useState('Mandelbrot Set');
  const [iter2D, setIter2D] = useState(100);
  const [fractal3D, setFractal3D] = useState('Mandelbulb');
  const [iter3D, setIter3D] = useState(12);
  const [artPattern, setArtPattern] = useState('Fractal Tree');
  const [artDepth, setArtDepth] = useState(10);
  
  const [colorScheme, setColorScheme] = useState('Purple Dream');
  const [hqExport, setHqExport] = useState(false);
  
  const [showTutorials, setShowTutorials] = useState(true);
  
  const [autoSave, setAutoSave] = useState(true);

  // Constants
  const TABS = [
    { id: 'DEFAULTS', label: 'Defaults', icon: Zap },
    { id: 'APPEARANCE', label: 'Appearance', icon: Palette },
    { id: 'TUTORIALS', label: 'Tutorials', icon: BookOpen },
    { id: 'PROFILE', label: 'Profile', icon: User },
    { id: 'MODERATION', label: 'Moderation', icon: Shield },
  ];

  const FRACTAL_TYPES_2D = ['Mandelbrot Set', 'Julia Set', 'Burning Ship', 'Tricorn'];
  const FRACTAL_TYPES_3D = ['Mandelbulb', 'Mandelbox', 'Menger Sponge'];
  const ART_PATTERNS = ['Fractal Tree', 'Sierpinski Triangle', 'Koch Snowflake', 'Dragon Curve', 'Barnsley Fern'];
  const COLOR_SCHEMES = [
    { name: 'Purple Dream', color: '#a855f7' },
    { name: 'Cosmic Purple', color: '#7c3aed' },
    { name: 'Violet Night', color: '#5b21b6' },
    { name: 'Aurora', color: '#22d3ee' },
    { name: 'Purple Sunset', color: '#e879f9' },
    { name: 'Cyberpunk', color: '#f472b6' },
    { name: 'Fire', color: '#f97316' },
    { name: 'Ocean', color: '#3b82f6' }
  ];

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
        activeTab === id 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.3)]' 
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  const SectionHeader = ({ icon: Icon, title }: any) => (
    <div className="flex items-center gap-2 text-white mb-6 pb-4 border-b border-white/5">
      <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400">
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
    </div>
  );

  const Dropdown = ({ label, value, options, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="mb-6 relative z-20">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">{label}</label>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[#13141f] border border-white/10 text-left text-gray-200 text-sm rounded-lg px-4 py-3 flex justify-between items-center hover:border-purple-500/30 hover:bg-[#1a1b29] transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        >
          <span>{value}</span>
          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
           <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b26] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
             {options.map((opt: any) => {
                const optLabel = typeof opt === 'string' ? opt : opt.name;
                const isSelected = optLabel === value;
                return (
                  <button 
                    key={optLabel}
                    onClick={() => { onChange(optLabel); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${isSelected ? 'bg-purple-900/20 text-purple-300' : 'text-gray-400'}`}
                  >
                    <div className="flex items-center gap-2">
                      {typeof opt !== 'string' && (
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: opt.color }}></div>
                      )}
                      {optLabel}
                    </div>
                    {isSelected && <CheckIcon size={14} />}
                  </button>
                );
             })}
           </div>
        )}
      </div>
    );
  };

  const Slider = ({ label, value, min, max, onChange }: any) => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-500/20">{value}</span>
      </div>
      <div className="relative flex items-center h-4">
        <div className="absolute w-full h-1.5 bg-[#13141f] rounded-full overflow-hidden">
           <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500" style={{ width: `${((value-min)/(max-min))*100}%` }}></div>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value} 
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-4 absolute opacity-0 cursor-pointer"
        />
        <div 
            className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-purple-500 pointer-events-none transition-all"
            style={{ left: `calc(${((value-min)/(max-min))*100}% - 8px)` }}
        ></div>
      </div>
    </div>
  );

  const Toggle = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5 last:border-0 last:mb-0 last:pb-0">
      <div>
        <div className="text-sm font-bold text-gray-200 mb-1">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <button 
        onClick={() => onChange(!checked)} 
        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${checked ? 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.4)]' : 'bg-gray-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? 'left-7' : 'left-1'}`}></div>
      </button>
    </div>
  );

  const StatsCard = ({ label, value, color = "text-white" }: any) => (
    <div className="bg-[#13141f] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 p-8 overflow-hidden">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent font-[Orbitron] tracking-wide">
          Settings & Preferences
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Customize your Fractal Universe experience
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/5 pb-4 shrink-0">
        {TABS.map(tab => (
          <TabButton key={tab.id} {...tab} />
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-12 pr-2">
        <div className="max-w-4xl mx-auto lg:mx-0">
          
          {/* --- DEFAULTS TAB --- */}
          {activeTab === 'DEFAULTS' && (
            <div className="bg-[#050508] border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
              <SectionHeader icon={Zap} title="Default Fractal Settings" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                  <h4 className="text-sm font-bold text-purple-400 mb-6 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> 2D Fractal Explorer</h4>
                  <Dropdown label="Default Fractal Type" value={fractal2D} options={FRACTAL_TYPES_2D} onChange={setFractal2D} />
                  <Slider label="Default Iterations" value={iter2D} min={10} max={500} onChange={setIter2D} />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-purple-400 mb-6 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> 3D Fractal Explorer</h4>
                  <Dropdown label="Default Fractal Type" value={fractal3D} options={FRACTAL_TYPES_3D} onChange={setFractal3D} />
                  <Slider label="Default Iterations" value={iter3D} min={5} max={30} onChange={setIter3D} />
                </div>

                <div className="md:col-span-2 border-t border-white/5 pt-8">
                  <h4 className="text-sm font-bold text-pink-400 mb-6 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div> Algorithmic Art</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                     <Dropdown label="Default Pattern" value={artPattern} options={ART_PATTERNS} onChange={setArtPattern} />
                     <Slider label="Default Recursion Depth" value={artDepth} min={1} max={14} onChange={setArtDepth} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 size={16} /> Reset to Defaults
                </button>
                <button className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 transition-all transform hover:-translate-y-0.5">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* --- APPEARANCE TAB --- */}
          {activeTab === 'APPEARANCE' && (
            <div className="bg-[#050508] border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
              <SectionHeader icon={Palette} title="Appearance & Colors" />
              
              <div className="max-w-md">
                <Dropdown label="Default Color Scheme" value={colorScheme} options={COLOR_SCHEMES} onChange={setColorScheme} />
                <div className="text-xs text-gray-500 -mt-2 mb-8 pl-1">This will be the default color scheme when opening fractals</div>

                <div className="border-t border-white/5 pt-8">
                   <Toggle 
                      label="High Quality Export" 
                      desc="Export images at maximum resolution (may be slower)" 
                      checked={hqExport} 
                      onChange={setHqExport} 
                   />
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 size={16} /> Reset to Defaults
                </button>
                <button className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 transition-all transform hover:-translate-y-0.5">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* --- TUTORIALS TAB --- */}
          {activeTab === 'TUTORIALS' && (
            <div className="bg-[#050508] border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
               <SectionHeader icon={BookOpen} title="Tutorial Settings" />
               
               <div className="space-y-6 max-w-2xl">
                  <div className="bg-[#13141f] rounded-xl p-6 border border-white/5">
                      <Toggle 
                        label="Show Tutorials on Page Load" 
                        desc="Automatically open tutorial on first visit" 
                        checked={showTutorials} 
                        onChange={setShowTutorials} 
                      />
                  </div>
                  
                  <div className="pt-4">
                     <button className="w-full sm:w-auto px-6 py-3 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2">
                        <RotateCcw size={16} /> Reset All Tutorials
                     </button>
                     <p className="text-[10px] text-gray-500 mt-3 pl-1">
                        Tutorials will appear again as if you're a new user. This cannot be undone.
                     </p>
                  </div>
               </div>

               <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 size={16} /> Reset to Defaults
                </button>
                <button className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 transition-all transform hover:-translate-y-0.5">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* --- PROFILE TAB --- */}
          {activeTab === 'PROFILE' && (
            <div className="bg-[#050508] border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
               <SectionHeader icon={User} title="Profile Information" />
               
               <div className="max-w-xl space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
                    <div className="w-full bg-[#13141f]/50 border border-white/5 text-gray-500 text-sm rounded-lg px-4 py-3 cursor-not-allowed flex items-center gap-2">
                        <User size={16} /> msssrithan@gmail.com
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
                    <input type="text" defaultValue="M Srithan" className="w-full bg-[#13141f] border border-white/10 text-gray-200 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500/50 focus:bg-[#1a1b29] transition-all" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Role</label>
                    <div className="w-full bg-[#13141f]/50 border border-white/5 text-purple-400 text-sm rounded-lg px-4 py-3 cursor-not-allowed flex items-center gap-2 font-bold">
                        <Shield size={16} /> Admin
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 mt-6">
                     <Toggle 
                        label="Auto-Save Work" 
                        desc="Automatically save fractals periodically to local storage" 
                        checked={autoSave} 
                        onChange={setAutoSave} 
                     />
                  </div>
               </div>

               <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 size={16} /> Reset to Defaults
                </button>
                <button className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 transition-all transform hover:-translate-y-0.5">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* --- MODERATION TAB --- */}
          {activeTab === 'MODERATION' && (
            <div className="bg-[#050508] border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-2xl">
               <SectionHeader icon={Shield} title="Moderation Tools" />
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <StatsCard label="Pending" value="0" color="text-orange-400" />
                 <StatsCard label="Reviewed" value="12" />
                 <StatsCard label="Resolved" value="8" color="text-green-400" />
                 <StatsCard label="Dismissed" value="4" color="text-gray-400" />
               </div>

               <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                 <button className="px-4 py-2 rounded-lg bg-[#2d1f0f] border border-orange-500/30 text-orange-400 text-xs font-bold flex items-center gap-2 transition-all hover:bg-[#3d2a15]"><AlertTriangle size={14} /> Pending</button>
                 <button className="px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent text-gray-400 text-xs font-bold flex items-center gap-2 transition-all"><Eye size={14} /> Reviewed</button>
                 <button className="px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent text-gray-400 text-xs font-bold flex items-center gap-2 transition-all"><CheckCircle size={14} /> Resolved</button>
                 <button className="px-4 py-2 rounded-lg hover:bg-white/5 border border-transparent text-gray-400 text-xs font-bold flex items-center gap-2 transition-all"><Flag size={14} /> All</button>
               </div>

               <div className="h-64 border border-white/5 rounded-xl bg-[#0a0b10] flex flex-col items-center justify-center text-gray-500 shadow-inner">
                  <div className="p-5 bg-[#13141f] rounded-full mb-4 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <div className="text-base font-medium text-gray-300">No pending reports</div>
                  <p className="text-xs text-gray-600 mt-1">Great job! The community is safe.</p>
               </div>

               <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 size={16} /> Reset to Defaults
                </button>
                <button className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:brightness-110 transition-all transform hover:-translate-y-0.5">
                  <Save size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};