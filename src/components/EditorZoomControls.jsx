import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function EditorZoomControls({ zoom, setZoom }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 px-2 py-1.5 flex items-center gap-1 z-40">
      <button 
        onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
        className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
        title="Zoom Out (-)"
      >
        <Minus size={18} />
      </button>
      <div 
        className="w-16 text-center font-bold text-sm text-slate-700 cursor-pointer hover:bg-slate-100 py-1 rounded"
        onClick={() => setZoom(1.0)}
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </div>
      <button 
        onClick={() => setZoom(z => Math.min(3, z + 0.25))}
        className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
        title="Zoom In (+)"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
