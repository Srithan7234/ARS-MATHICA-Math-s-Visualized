import React from 'react';
import { X, BookOpen, HelpCircle } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'TUTORIAL' | 'HELP';
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0c0d15] w-[600px] max-h-[80vh] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#13141f]">
          <div className="flex items-center gap-2 text-white">
            {type === 'TUTORIAL' ? <BookOpen size={20} className="text-purple-400" /> : <HelpCircle size={20} className="text-purple-400" />}
            <h2 className="text-lg font-bold">{type === 'TUTORIAL' ? 'Quick Start Tutorial' : 'Help & Documentation'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar text-gray-300 space-y-6">
          {type === 'TUTORIAL' ? (
            <>
              <section>
                <h3 className="text-white font-bold mb-2">1. Choose a Pattern</h3>
                <p className="text-sm text-gray-400">Start by clicking the <span className="text-white font-bold bg-white/10 px-1 rounded">Browse</span> button to select a base algorithm. We support Trees, L-Systems, and Geometric Fractals.</p>
              </section>
              <section>
                <h3 className="text-white font-bold mb-2">2. Adjust Parameters</h3>
                <p className="text-sm text-gray-400">Use the sidebar sliders to modify the recursion depth, branching angle, and ratio. 
                <br/>• <span className="text-purple-400">Depth</span> controls complexity.
                <br/>• <span className="text-pink-400">Angle</span> changes the spread.
                <br/>• <span className="text-orange-400">Ratio</span> affects size scaling.</p>
              </section>
              <section>
                <h3 className="text-white font-bold mb-2">3. Animate & Color</h3>
                <p className="text-sm text-gray-400">Toggle "Animate Growth" to see the fractal evolve. Select different Color Schemes to change the visual mood.</p>
              </section>
            </>
          ) : (
             <>
              <section>
                <h3 className="text-white font-bold mb-2">Shortcuts</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div className="bg-white/5 p-2 rounded flex justify-between"><span>Save Preset</span> <kbd className="bg-black/50 px-1 rounded">Ctrl+S</kbd></div>
                  <div className="bg-white/5 p-2 rounded flex justify-between"><span>Reset View</span> <kbd className="bg-black/50 px-1 rounded">R</kbd></div>
                  <div className="bg-white/5 p-2 rounded flex justify-between"><span>Toggle UI</span> <kbd className="bg-black/50 px-1 rounded">Tab</kbd></div>
                </div>
              </section>
              <section>
                <h3 className="text-white font-bold mb-2">About Algorithms</h3>
                <p className="text-sm text-gray-400 mb-2"><strong className="text-white">Recursive Trees:</strong> Built by repeating a branching pattern at smaller scales.</p>
                <p className="text-sm text-gray-400 mb-2"><strong className="text-white">L-Systems:</strong> String rewriting rules that translate into geometric paths (e.g., Algae, Dragon Curve).</p>
                <p className="text-sm text-gray-400"><strong className="text-white">Iterated Function Systems:</strong> Geometric transformations applied repeatedly (e.g., Sierpinski Triangle).</p>
              </section>
             </>
          )}
        </div>
        
        <div className="p-4 border-t border-white/5 bg-[#0a0b10] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};