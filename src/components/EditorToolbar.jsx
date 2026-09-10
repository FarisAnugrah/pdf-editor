import React from 'react';
import { 
  ArrowLeft, Download, Undo2, Redo2, Edit3,
  MousePointer2, Type, Image as ImageIcon, FileSignature, 
  PenTool, Highlighter, Eraser, Trash2, Spline, StickyNote, Square, Circle, Triangle
} from 'lucide-react';

export default function EditorToolbar({
  setFileName,
  fileName,
  setFile,
  activeTool,
  setActiveTool,
  textColor,
  setTextColor,
  textSize,
  setTextSize,
  activeTextId,
  handleUndo,
  handleRedo,
  historyStep,
  historyLength,
  handleSave,
  isExporting
}) {

  const ToolButton = ({ id, icon: Icon, label, shortcut }) => {
    const isWorking = ['edit', 'add-text', 'image', 'signature', 'draw', 'line', 'rect', 'circle', 'triangle', 'square', 'highlight', 'eraser', 'sticky']; 
    const enabled = isWorking.includes(id);
    
    return (
      <button
        onClick={() => enabled && setActiveTool(id)}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all relative group ${
          activeTool === id 
            ? 'bg-blue-50 text-blue-600 shadow-sm' 
            : enabled 
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <Icon size={20} strokeWidth={activeTool === id ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
        
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label} {shortcut && <span className="opacity-60 ml-1">({shortcut})</span>}
          {!enabled && <span className="text-red-300 ml-1">(Coming Soon)</span>}
        </div>
      </button>
    );
  };

  return (
    <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 shadow-sm relative">
      <div className="flex items-center gap-4 w-1/4">
        <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 cursor-pointer transition-colors max-w-full">
          <Edit3 size={16} className="text-slate-400" />
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="font-semibold text-slate-700 bg-transparent outline-none w-full min-w-[100px] border-b border-transparent focus:border-slate-300" title="Rename file" />
        </div>
        
        <div className="flex items-center ml-2 border-l border-slate-200 pl-4 gap-1">
          <button 
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className={`p-2 rounded-md transition-colors ${historyStep <= 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button 
            onClick={handleRedo}
            disabled={historyStep >= historyLength - 1}
            className={`p-2 rounded-md transition-colors ${historyStep >= historyLength - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl p-1.5 z-40 absolute left-1/2 -translate-x-1/2">
        <ToolButton id="edit" icon={MousePointer2} label="Edit" shortcut="E" />
        <div className="w-px h-8 bg-slate-200 mx-1"></div>
        <ToolButton id="add-text" icon={Type} label="Text" shortcut="T" />
        
        {activeTool === 'edit' && activeTextId && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 ml-1 animate-in fade-in zoom-in duration-200">
            <input 
              type="color" 
              value={textColor} 
              onChange={(e) => setTextColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              title="Text Color"
            />
            <input 
              type="number" 
              value={textSize}
              onChange={(e) => setTextSize(parseInt(e.target.value) || 14)}
              className="w-12 h-7 text-xs border border-slate-200 rounded text-center"
              min="6" max="72"
              title="Font Size"
            />
          </div>
        )}
        
        <ToolButton id="image" icon={ImageIcon} label="Image" shortcut="I" />
        <ToolButton id="signature" icon={FileSignature} label="Sign" />
        <div className="w-px h-8 bg-slate-200 mx-1"></div>
        <ToolButton id="draw" icon={PenTool} label="Draw" shortcut="D" />
        <ToolButton id="line" icon={Spline} label="Line" />
        <ToolButton id="rect" icon={Square} label="Rect" />
        <ToolButton id="circle" icon={Circle} label="Circle" />
        <ToolButton id="triangle" icon={Triangle} label="Triangle" />
        <ToolButton id="highlight" icon={Highlighter} label="Highlight" shortcut="H" />
        <ToolButton id="eraser" icon={Eraser} label="Erase" />
        <button onClick={() => window.dispatchEvent(new Event('clear-canvas'))} className="flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all relative group text-slate-600 hover:bg-red-50 hover:text-red-500" title="Clear All Drawings"><Trash2 size={20} strokeWidth={2} /><span className="text-[10px] mt-1 font-medium">Clear</span></button>
        <ToolButton id="sticky" icon={StickyNote} label="Note" />
      </div>
      
      <div className="flex items-center justify-end gap-3 w-1/4">
        <button 
          onClick={handleSave} 
          disabled={isExporting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
            isExporting ? 'bg-slate-300 text-slate-500 cursor-wait' : 'bg-red-500 hover:bg-red-600 hover:shadow text-white'
          }`}
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={18} />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </header>
  );
}
