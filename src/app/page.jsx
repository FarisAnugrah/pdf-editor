"use client"
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Type, Image as ImageIcon, 
  ArrowLeft, MousePointer2, Minus, Plus, 
  PenTool, Highlighter, Eraser, FileSignature, 
  Layers, LayoutTemplate, SquarePen, Menu
} from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState(null);
  const [zoom, setZoom] = useState(1.2);
  const [activeTool, setActiveTool] = useState('edit');
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  }, []);

  const handleFileUpload = async (e) => {
    const f = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f || f.type !== 'application/pdf') return;
    
    setFile(f);
    setFileName(f.name);
    
    const bytes = await f.arrayBuffer();
    setPdfBytes(bytes);
    renderPdf(bytes, zoom);
  };

  const renderPdf = async (bytes, currentZoom) => {
    const loadingTask = window.pdfjsLib.getDocument({data: bytes});
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    
    const viewport = page.getViewport({scale: currentZoom});
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    await page.render({canvasContext: ctx, viewport: viewport}).promise;
    
    const textLayer = textLayerRef.current;
    if (!textLayer) return;
    
    textLayer.innerHTML = '';
    const textContent = await page.getTextContent();
    
    textContent.items.forEach(item => {
      if (!item.str.trim()) return;

      const div = document.createElement('div');
      div.className = 'pdf-text';
      div.innerText = item.str;
      
      div.dataset.orig = item.str;
      div.dataset.x = item.transform[4];
      div.dataset.y = item.transform[5];
      div.dataset.w = item.width;
      div.dataset.sz = item.transform[0];
      
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const fontSize = item.transform[0] * viewport.scale;
      
      div.style.left = x + 'px';
      div.style.top = (y - fontSize) + 'px'; 
      div.style.fontSize = fontSize + 'px';
      div.style.fontFamily = item.fontName || 'sans-serif';
      
      div.onclick = () => {
        if(activeTool !== 'edit') return;
        div.contentEditable = true;
        div.classList.add('editing');
        div.focus();
      };
      
      div.onblur = () => {
        div.contentEditable = false;
        div.classList.remove('editing');
        if (div.innerText !== div.dataset.orig) {
          div.classList.add('edited');
        } else {
          div.classList.remove('edited');
        }
      };
      
      textLayer.appendChild(div);
    });
  };

  // Re-render when zoom changes
  useEffect(() => {
    if (pdfBytes) {
      renderPdf(pdfBytes, zoom);
    }
  }, [zoom, activeTool]); // re-render layout wrapper

  const handleSave = async () => {
    if(!pdfBytes) return;
    const { PDFDocument, rgb } = window.PDFLib;
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    const firstPage = pages[0];

    const nodes = textLayerRef.current.querySelectorAll('.pdf-text.edited');
    nodes.forEach(node => {
        const newText = node.innerText;
        const pdfX = parseFloat(node.dataset.x);
        const pdfY = parseFloat(node.dataset.y);
        const pdfW = parseFloat(node.dataset.w);
        const pdfSz = parseFloat(node.dataset.sz);
        
        firstPage.drawRectangle({
            x: pdfX, 
            y: pdfY - (pdfSz * 0.2),
            width: Math.max(pdfW, newText.length * (pdfSz * 0.5)),
            height: pdfSz * 1.2,
            color: rgb(1, 1, 1)
        });

        firstPage.drawText(newText, {
            x: pdfX,
            y: pdfY,
            size: pdfSz,
            color: rgb(0, 0, 0)
        });
    });

    const savedBytes = await doc.save();
    const blob = new Blob([savedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${fileName}`;
    a.click();
  };

  const ToolButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTool(id)}
      className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all ${
        activeTool === id 
          ? 'bg-blue-50 text-blue-600 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      title={label}
    >
      <Icon size={20} strokeWidth={activeTool === id ? 2.5 : 2} />
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  // Landing Page UI
  if (!file) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        <header className="h-16 px-6 lg:px-12 flex items-center justify-between bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Layers size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800">PDFEditor.AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Pricing</button>
            <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</button>
            <button className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full transition-colors shadow-sm">Sign up</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center pt-24 px-4 pb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-6 tracking-tight text-slate-900">
            Edit PDF Document Online
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 text-center max-w-2xl leading-relaxed">
            A free, fast, and secure way to modify your PDF files directly in the browser. No installation or registration required.
          </p>

          <div 
            className={`w-full max-w-3xl rounded-3xl border-3 border-dashed transition-all duration-200 p-2 ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
          >
            <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <Upload size={32} className="text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload your PDF</h3>
              <p className="text-slate-500 mb-8 text-center">Drag and drop your file here, or click to browse</p>
              
              <label className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-3">
                <Upload size={20} />
                Select PDF File
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
              </label>
              
              <p className="text-xs text-slate-400 mt-6 flex items-center gap-2">
                🔒 Files stay private. Automatically deleted after 2 hours.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Editor UI
  return (
    <div className="h-screen bg-[#E5E7EB] flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-4 w-1/4">
          <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 cursor-pointer transition-colors max-w-full">
            <SquarePen size={16} className="text-slate-400" />
            <span className="font-semibold text-slate-700 truncate text-sm">{fileName}</span>
          </div>
        </div>

        {/* Centered Floating Toolbar */}
        <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl p-1.5 z-40 absolute left-1/2 -translate-x-1/2">
          <ToolButton id="edit" icon={MousePointer2} label="Edit Text" />
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <ToolButton id="add-text" icon={Type} label="Add Text" />
          <ToolButton id="image" icon={ImageIcon} label="Image" />
          <ToolButton id="signature" icon={FileSignature} label="Sign" />
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <ToolButton id="draw" icon={PenTool} label="Draw" />
          <ToolButton id="highlight" icon={Highlighter} label="Highlight" />
          <ToolButton id="eraser" icon={Eraser} label="Erase" />
        </div>
        
        <div className="flex items-center justify-end gap-3 w-1/4">
          <button onClick={handleSave} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 shadow-sm hover:shadow text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all">
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Pages */}
        <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] hidden lg:flex">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2 text-slate-700">
            <LayoutTemplate size={18} />
            <span className="font-bold text-sm">Page Thumbnails</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            {/* Dummy Thumbnail for PoC */}
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="relative w-full aspect-[1/1.4] bg-white border-2 border-blue-500 rounded-lg shadow-sm overflow-hidden flex items-center justify-center">
                {/* Visual placeholder for thumbnail */}
                <div className="w-3/4 h-3/4 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  <Layers size={32} />
                </div>
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Page 1</span>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <button className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} />
              Add Blank Page
            </button>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-auto flex justify-center p-8 lg:p-12 pb-32 bg-[#E5E7EB] relative scroll-smooth">
          
          {/* Zoom Controls (Bottom Center Floating) */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-2 py-1.5 flex items-center gap-2 z-40">
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <Minus size={18} />
            </button>
            <div className="w-16 text-center font-semibold text-sm text-slate-700">
              {Math.round(zoom * 100)}%
            </div>
            <button 
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Actual PDF Container */}
          <div 
            className={`relative bg-white shadow-2xl transition-transform origin-top ${
              activeTool === 'edit' ? '' : 'cursor-crosshair'
            }`}
          >
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className={`absolute top-0 left-0 w-full h-full overflow-hidden ${activeTool !== 'edit' ? 'pointer-events-none' : ''}`} />
          </div>
        </main>
      </div>
    </div>
  );
}
