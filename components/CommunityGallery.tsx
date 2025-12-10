import React, { useState } from 'react';
import { Search, Sparkles, Clock, TrendingUp, Star } from 'lucide-react';

export const CommunityGallery: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('Recent');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full bg-black text-gray-200 p-8 overflow-hidden">
      {/* Header Section */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent font-[Orbitron]">
          Community Gallery
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover and share amazing fractal creations
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search fractals..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#13141f] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
          />
        </div>
        
        <div className="flex bg-[#13141f] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveFilter('Recent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeFilter === 'Recent' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={14} /> Recent
          </button>
          <button
            onClick={() => setActiveFilter('Popular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeFilter === 'Popular' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp size={14} /> Popular
          </button>
          <button
            onClick={() => setActiveFilter('Featured')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeFilter === 'Featured' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star size={14} /> Featured
          </button>
        </div>
      </div>

      {/* Empty State / Gallery Area */}
      <div className="flex-1 bg-[#050508] border border-white/10 rounded-2xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-6 bg-[#13141f] rounded-full border border-white/5 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl"></div>
            <Sparkles size={48} className="text-purple-400 relative z-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">No posts yet</h3>
            <p className="text-sm text-gray-500">Be the first to share your fractal creation!</p>
          </div>
        </div>
      </div>
    </div>
  );
};