import React from 'react';
import { LayoutTemplate, Plus } from 'lucide-react';

export default function EditorSidebar({
  numPages,
  thumbnailsRef,
  handlePageDelete,
  handlePageRotate
}) {
  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] hidden lg:flex">
      <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2 text-slate-700">
        <LayoutTemplate size={18} />
        <span className="font-bold text-sm">Page Thumbnails</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {Array.from({ length: numPages }).map((_, idx) => (
          <div 
            key={idx}
            className="flex flex-col items-center gap-2 group cursor-pointer"
            onClick={() => {
              const target = document.getElementById(`page-wrapper-${idx}`);
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="relative w-full aspect-[1/1.4] bg-white border-2 border-slate-200 hover:border-blue-500 rounded-lg shadow-sm overflow-hidden flex items-center justify-center transition-colors">
              <canvas 
                ref={el => thumbnailsRef.current[idx] = el}
                className="w-full h-full object-cover"
              />
              {!thumbnailsRef.current[idx] && <span className="text-slate-400 font-bold absolute">{idx + 1}</span>}
              <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow" title="Delete Page" onClick={(e)=>{e.stopPropagation(); handlePageDelete(idx);}}>X</button>
              <button className="absolute bottom-1 right-1 w-6 h-6 bg-blue-500 rounded text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-600 shadow" title="Rotate Page" onClick={(e)=>{e.stopPropagation(); handlePageRotate(idx);}}>↻</button>
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Page {idx + 1}</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <button className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
          <Plus size={16} />
          Add Blank Page
        </button>
      </div>
    </aside>
  );
}
