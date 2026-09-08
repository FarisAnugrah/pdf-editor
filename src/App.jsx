import React, { useState, useRef } from 'react';
import { Upload, Download, Type, Image as ImageIcon, CheckSquare, Settings, ArrowLeft, MousePointer2, Minus, Plus, Search } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

export default function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState(null);
  const [zoom, setZoom] = useState(1.5);
  const [activeTool, setActiveTool] = useState('edit'); // edit, text, add-image, draw
  
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name);
    
    const bytes = await f.arrayBuffer();
    setPdfBytes(bytes);
    renderPdf(bytes, zoom);
  };

  const renderPdf = async (bytes, currentZoom) => {
    const loadingTask = pdfjsLib.getDocument({data: bytes});
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1); // Still page 1 for PoC
    
    const viewport = page.getViewport({scale: currentZoom});
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    await page.render({canvasContext: ctx, viewport: viewport}).promise;
    
    // Interactive Text Layer
    const textLayer = textLayerRef.current;
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
      div.dataset.h = item.height;
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

  const handleSave = async () => {
    if(!pdfBytes) return;
    const { PDFDocument, rgb } = PDFLib;
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

  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Edit PDF</h1>
            <p className="text-gray-500">Fast, easy, and secure PDF editor.</p>
          </div>
          <div className="p-8">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-blue-400 border-dashed rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 text-blue-500 mb-3" />
                <p className="mb-2 text-sm text-blue-700 font-semibold">Select PDF file</p>
                <p className="text-xs text-blue-500">or drop PDF here</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setFile(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div className="font-medium text-gray-800 truncate max-w-[200px]">{fileName}</div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Search size={20} />
          </button>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mx-2">
            <button className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Minus size={16} /></button>
            <span className="text-sm px-3">{Math.round(zoom * 100)}%</span>
            <button className="p-1 hover:bg-white rounded shadow-sm text-gray-600"><Plus size={16} /></button>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            <Download size={16} />
            Download
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0">
          <button 
            onClick={() => setActiveTool('edit')}
            className={`p-3 rounded-xl transition-colors ${activeTool === 'edit' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Edit Text"
          >
            <MousePointer2 size={24} />
          </button>
          <button className="p-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Add Text (Coming Soon)">
            <Type size={24} />
          </button>
          <button className="p-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Add Image (Coming Soon)">
            <ImageIcon size={24} />
          </button>
          <button className="p-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" title="Forms (Coming Soon)">
            <CheckSquare size={24} />
          </button>
          <div className="mt-auto">
            <button className="p-3 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Settings size={24} />
            </button>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-auto flex justify-center p-8 bg-[#F0F2F5]">
          <div ref={containerRef} className="relative bg-white shadow-sm ring-1 ring-gray-900/5">
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden" />
          </div>
        </main>
      </div>
    </div>
  );
}
