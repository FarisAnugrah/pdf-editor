"use client"
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Type, Image as ImageIcon, 
  ArrowLeft, MousePointer2, Minus, Plus, 
  PenTool, Highlighter, Eraser, FileSignature, 
  Layers, LayoutTemplate, Menu, Edit3,
  Undo2, Redo2
} from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [activeTool, setActiveTool] = useState('edit');
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef(null);
  const pagesRef = useRef([]); 
  const textLayersRef = useRef([]); 
  const drawLayersRef = useRef([]); 
  const thumbnailsRef = useRef([]); 
  const viewportsRef = useRef([]);

  // History State for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Image & Sign upload
  const imageInputRef = useRef(null);
  const pendingImagePos = useRef(null);

  // Drawing state
  const isDrawing = useRef(false);
  const lastDrawPos = useRef({ x: 0, y: 0 });

  // Helper to save state snapshot
  const saveHistorySnapshot = () => {
    // Only capture current visible edits/drawings
    const snapshot = {
      drawings: drawLayersRef.current.map(c => c ? c.toDataURL() : null),
      // For text/images, cloning innerHTML is easiest for PoC
      texts: textLayersRef.current.map(l => l ? l.innerHTML : '')
    };
    
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(snapshot);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const step = historyStep - 1;
      restoreSnapshot(history[step]);
      setHistoryStep(step);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const step = historyStep + 1;
      restoreSnapshot(history[step]);
      setHistoryStep(step);
    }
  };

  const restoreSnapshot = (snapshot) => {
    snapshot.drawings.forEach((dataUrl, idx) => {
      const canvas = drawLayersRef.current[idx];
      if (canvas && dataUrl) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = new window.Image(); // Use native Image
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = dataUrl;
      } else if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    snapshot.texts.forEach((html, idx) => {
      const layer = textLayersRef.current[idx];
      if (layer) {
        layer.innerHTML = html;
        // Re-attach event listeners since innerHTML destroys them
        Array.from(layer.children).forEach(child => {
          if (child.classList.contains('pdf-text')) {
             child.onclick = (ev) => {
                ev.stopPropagation();
                if(['edit', 'add-text'].includes(activeTool)) {
                  child.contentEditable = true;
                  child.classList.add('editing');
                  child.focus();
                }
             };
             child.onblur = () => {
               child.contentEditable = false;
               child.classList.remove('editing');
               if (child.innerText !== child.dataset.orig) child.classList.add('edited');
               else child.classList.remove('edited');
               saveHistorySnapshot(); // Auto save on text edit finish
             };
          } else if (child.classList.contains('pdf-image')) {
            child.ondragstart = () => false;
            child.onmousedown = (evDrag) => attachImageDragEvents(child, idx, evDrag);
          }
        });
      }
    });
  };

  const attachImageDragEvents = (img, pageIndex, evDrag) => {
      if (activeTool !== 'edit') return;
      let startX = evDrag.clientX - img.offsetLeft;
      let startY = evDrag.clientY - img.offsetTop;
      const viewport = viewportsRef.current[pageIndex];
      
      const onMove = (evMove) => {
          img.style.left = (evMove.clientX - startX) + 'px';
          img.style.top = (evMove.clientY - startY) + 'px';
          const [newPdfX, newPdfY] = viewport.convertToPdfPoint(evMove.clientX - startX, evMove.clientY - startY);
          img.dataset.pdfX = newPdfX;
          img.dataset.pdfY = newPdfY;
      };
      const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          saveHistorySnapshot(); // Save on image move drop
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  }, []);

  // Handle zoom scroll
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) setZoom(z => Math.min(3, z + 0.1));
        else setZoom(z => Math.max(0.5, z - 0.1));
      }
    };
    
    // Non-passive event listener required for preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in a text field
      if (document.activeElement.isContentEditable) return;
      
      switch(e.key.toLowerCase()) {
        case 'e': setActiveTool('edit'); break;
        case 't': setActiveTool('add-text'); break;
        case 'i': setActiveTool('image'); break;
        case 'd': setActiveTool('draw'); break;
        case 'h': setActiveTool('highlight'); break;
        case '-': setZoom(z => Math.max(0.5, z - 0.25)); break;
        case '=': 
        case '+': setZoom(z => Math.min(3, z + 0.25)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const handleFileUpload = async (e) => {
    const f = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f || f.type !== 'application/pdf') return;
    
    setFile(f);
    setFileName(f.name);
    
    const bytes = await f.arrayBuffer();
    setPdfBytes(bytes);
    
    const loadingTask = window.pdfjsLib.getDocument({data: bytes});
    const doc = await loadingTask.promise;
    setPdfDoc(doc);
    setNumPages(doc.numPages);
    
    pagesRef.current = Array(doc.numPages).fill(null);
    textLayersRef.current = Array(doc.numPages).fill(null);
    drawLayersRef.current = Array(doc.numPages).fill(null);
    thumbnailsRef.current = Array(doc.numPages).fill(null);
    viewportsRef.current = Array(doc.numPages).fill(null);
    
    // Reset History
    setHistory([]);
    setHistoryStep(-1);
  };

  // Ref to track active rendering tasks to prevent cancellation errors
  const renderTasksRef = useRef([]);

  // Use a ref to track if a render is currently in progress
  const isRenderingRef = useRef(false);
  const pendingRenderRef = useRef(false);

  useEffect(() => {
    if (pdfDoc) {
      // If already rendering, mark that we need another render right after
      if (isRenderingRef.current) {
        pendingRenderRef.current = true;
        return;
      }
      
      const doRender = async () => {
        isRenderingRef.current = true;
        
        // Cancel ongoing tasks just in case
        renderTasksRef.current.forEach(task => {
          if (task && task.cancel) {
            try { task.cancel(); } catch(e){}
          }
        });
        renderTasksRef.current = Array(pdfDoc.numPages).fill(null);
        
        await renderAllPages();
        
        isRenderingRef.current = false;
        
        // If zoom changed while we were rendering, trigger render again
        if (pendingRenderRef.current) {
          pendingRenderRef.current = false;
          doRender();
        }
      };
      
      doRender();
    }
  }, [pdfDoc, zoom]);

  const matchFontFamily = (pdfFontName) => {
    const fontName = pdfFontName.toLowerCase();
    const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy');
    const isItalic = fontName.includes('italic') || fontName.includes('oblique');

    let pdfType = 'Helvetica';
    let css = 'Arial, Helvetica, sans-serif';

    if (fontName.includes('times') || fontName.includes('serif')) {
      pdfType = 'TimesRoman';
      css = '"Times New Roman", Times, serif';
    } else if (fontName.includes('courier') || fontName.includes('mono')) {
      pdfType = 'Courier';
      css = '"Courier New", Courier, monospace';
    }

    if (isBold && isItalic) pdfType += 'BoldItalic';
    else if (isBold) pdfType += 'Bold';
    else if (isItalic) pdfType += 'Oblique';

    if (pdfType === 'TimesRomanOblique') pdfType = 'TimesRomanItalic';
    
    return { css, pdfType, isBold, isItalic };
  };

  const renderAllPages = async () => {
    if (!pdfDoc) return;
    
    // Create an array of page numbers
    const pagesToRender = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    
    // Render sequentially instead of using Promise.all to avoid 
    // "Canvas context is already in use" errors from PDF.js workers
    // which causes missing pages
    for (const pageNum of pagesToRender) {
      try {
        await renderPage(pageNum);
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    }
  };

  const renderPage = async (pageNumber) => {
    // Safety check to ensure canvas elements exist before rendering
    if (!pagesRef.current[pageNumber - 1]) {
      await new Promise(r => setTimeout(r, 100));
      if (!pagesRef.current[pageNumber - 1]) return;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      
      // Thumbnail rendering with concurrency protection
      const thumbCanvas = thumbnailsRef.current[pageNumber - 1];
      if (thumbCanvas) {
        const unscaledViewport = page.getViewport({scale: 1.0});
        const thumbScale = 150 / unscaledViewport.width; 
        const thumbViewport = page.getViewport({scale: thumbScale});
        
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        
        // Prevent concurrent thumb render collision
        if (!thumbCanvas.dataset.rendering) {
          thumbCanvas.dataset.rendering = "true";
          try {
            await page.render({canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport}).promise;
          } catch(e) { /* ignore thumb errors */ }
          finally { thumbCanvas.dataset.rendering = ""; }
        }
      }

      // Main Canvas rendering
      const viewport = page.getViewport({scale: zoom});
      viewportsRef.current[pageNumber - 1] = viewport;
      
      const canvas = pagesRef.current[pageNumber - 1];
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Cancel previous render task completely
      if (renderTasksRef.current[pageNumber - 1]) {
        try { renderTasksRef.current[pageNumber - 1].cancel(); } catch(e){}
      }

      const renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
      const renderTask = page.render(renderContext);
      renderTasksRef.current[pageNumber - 1] = renderTask;
      
      await renderTask.promise;
      
      // Draw Layer Setup
      const drawCanvas = drawLayersRef.current[pageNumber - 1];
      if (drawCanvas) {
        // Only resize if different to prevent clearing existing drawings
        if (drawCanvas.width !== viewport.width) drawCanvas.width = viewport.width;
        if (drawCanvas.height !== viewport.height) drawCanvas.height = viewport.height;
      }

      // Text Layer Setup
      const textLayer = textLayersRef.current[pageNumber - 1];
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
        
        const fontMatch = matchFontFamily(item.fontName || '');
        div.dataset.fontName = fontMatch.pdfType; 
        div.dataset.pageIndex = pageNumber - 1;
        
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const fontSize = item.transform[0] * zoom;
        
        div.style.left = x + 'px';
        div.style.top = (y - fontSize) + 'px'; 
        div.style.fontSize = fontSize + 'px';
        
        div.style.fontFamily = fontMatch.css;
        if (fontMatch.isBold) div.style.fontWeight = 'bold';
        if (fontMatch.isItalic) div.style.fontStyle = 'italic';
        
        div.style.pointerEvents = 'auto';
        
        div.onclick = (ev) => {
          ev.stopPropagation();
          if(activeTool !== 'edit') return;
          div.contentEditable = true;
          div.classList.add('editing');
          div.focus();
        };
        
        div.onblur = () => {
          div.contentEditable = false;
          div.classList.remove('editing');
          const oldHtml = div.innerHTML;
          if (div.innerText !== div.dataset.orig) {
            div.classList.add('edited');
          } else {
            div.classList.remove('edited');
          }
          if (oldHtml !== div.innerHTML || div.classList.contains('edited')) {
             saveHistorySnapshot();
          }
        };
        
        textLayer.appendChild(div);
      });

      if (pageNumber === pdfDoc.numPages && historyStep === -1) {
         setTimeout(saveHistorySnapshot, 500);
      }

    } catch (err) {
      if (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled')) {
        return; 
      }
      console.warn(`Render error on page ${pageNumber}:`, err);
    }
  };

  // --- DRAWING LOGIC ---
  const startDrawing = (e, idx) => {
    if (!['draw', 'highlight', 'eraser'].includes(activeTool)) return;
    isDrawing.current = true;
    const canvas = drawLayersRef.current[idx];
    const rect = canvas.getBoundingClientRect();
    
    // Scale correction: coordinate in CSS pixels vs Canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    lastDrawPos.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const draw = (e, idx) => {
    if (!isDrawing.current || !['draw', 'highlight', 'eraser'].includes(activeTool)) return;
    const canvas = drawLayersRef.current[idx];
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 30 * (canvas.width / rect.width); // Scale line width
    } else if (activeTool === 'highlight') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 225, 0, 0.3)';
      ctx.lineWidth = 20 * (canvas.width / rect.width);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 * (canvas.width / rect.width);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastDrawPos.current = { x, y };
  };

  const stopDrawing = () => { 
    if (isDrawing.current) {
      isDrawing.current = false; 
      saveHistorySnapshot(); // Capture drawing stroke
    }
  };

  // --- IMAGE / SIGN LOGIC ---
  const handleImageUpload = (e) => {
    const f = e.target.files[0];
    if (!f || !pendingImagePos.current) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const { pageIndex, x, y } = pendingImagePos.current;
        const viewport = viewportsRef.current[pageIndex];
        const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);
        
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'pdf-image edited-image';
        img.dataset.pdfX = pdfX;
        img.dataset.pdfY = pdfY;
        
        img.style.position = 'absolute';
        img.style.left = x + 'px';
        img.style.top = y + 'px';
        img.style.maxWidth = '150px'; 
        img.style.cursor = 'move';
        
        img.ondragstart = () => false;
        img.onmousedown = (evDrag) => attachImageDragEvents(img, pageIndex, evDrag);

        textLayersRef.current[pageIndex].appendChild(img);
        saveHistorySnapshot(); // Capture image added
    };
    reader.readAsDataURL(f);
    e.target.value = ''; 
  };

  // --- TEXT CLICK LOGIC ---
  const handlePageClick = (e, pageIndex) => {
    if (activeTool === 'add-text') {
        const rect = textLayersRef.current[pageIndex].getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const viewport = viewportsRef.current[pageIndex];
        const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);

        const div = document.createElement('div');
        div.className = 'pdf-text edited new-text';
        div.innerText = 'New Text';
        div.contentEditable = true;
        
        div.dataset.orig = '';
        div.dataset.x = pdfX;
        div.dataset.y = pdfY;
        div.dataset.w = 50; 
        div.dataset.sz = 14; 
        div.dataset.fontName = 'Helvetica'; 
        div.dataset.pageIndex = pageIndex;
        div.dataset.isNew = 'true';

        div.style.left = x + 'px';
        div.style.top = (y - 14 * zoom) + 'px'; 
        div.style.fontSize = (14 * zoom) + 'px';
        div.style.fontFamily = 'Arial, Helvetica, sans-serif';
        div.style.whiteSpace = 'nowrap';
        div.style.minWidth = '20px';

        div.onblur = () => { 
          div.contentEditable = false; 
          div.classList.remove('editing'); 
          saveHistorySnapshot(); // Capture new text added
        };
        div.onclick = (ev) => { 
          ev.stopPropagation(); 
          if (['edit', 'add-text'].includes(activeTool)) { 
            div.contentEditable = true; 
            div.classList.add('editing'); 
            div.focus(); 
          } 
        };

        textLayersRef.current[pageIndex].appendChild(div);
        setTimeout(() => { div.focus(); }, 50);

    } else if (activeTool === 'image' || activeTool === 'signature') {
        const rect = textLayersRef.current[pageIndex].getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        pendingImagePos.current = { pageIndex, x, y };
        if (imageInputRef.current) imageInputRef.current.click();
    }
  };

  // --- EXPORT LOGIC ---
  const handleSave = async () => {
    if(!pdfBytes) return;
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const doc = await PDFDocument.load(pdfBytes);
    
    const fontCache = {
      Helvetica: await doc.embedFont(StandardFonts.Helvetica),
      HelveticaBold: await doc.embedFont(StandardFonts.HelveticaBold),
      HelveticaOblique: await doc.embedFont(StandardFonts.HelveticaOblique),
      HelveticaBoldOblique: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
      TimesRoman: await doc.embedFont(StandardFonts.TimesRoman),
      TimesRomanBold: await doc.embedFont(StandardFonts.TimesRomanBold),
      TimesRomanItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
      TimesRomanBoldItalic: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
      Courier: await doc.embedFont(StandardFonts.Courier),
      CourierBold: await doc.embedFont(StandardFonts.CourierBold),
      CourierOblique: await doc.embedFont(StandardFonts.CourierOblique),
      CourierBoldOblique: await doc.embedFont(StandardFonts.CourierBoldOblique),
    };

    const pages = doc.getPages();

    for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        const layer = textLayersRef.current[index];
        if(!layer) continue;
        
        // 1. Export Texts
        const textNodes = layer.querySelectorAll('.pdf-text.edited');
        textNodes.forEach(node => {
            const newText = node.innerText;
            const pdfX = parseFloat(node.dataset.x);
            const pdfY = parseFloat(node.dataset.y);
            const pdfW = parseFloat(node.dataset.w);
            const pdfSz = parseFloat(node.dataset.sz);
            const pdfType = node.dataset.fontName || 'Helvetica';
            
            if (node.dataset.isNew !== 'true') {
                page.drawRectangle({
                    x: pdfX, 
                    y: pdfY - (pdfSz * 0.2),
                    width: Math.max(pdfW, newText.length * (pdfSz * 0.5)), 
                    height: pdfSz * 1.2,
                    color: rgb(1, 1, 1) 
                });
            }
            page.drawText(newText, {
                x: pdfX,
                y: pdfY,
                size: pdfSz,
                font: fontCache[pdfType],
                color: rgb(0, 0, 0)
            });
        });

        // 2. Export Images
        const imageNodes = layer.querySelectorAll('.pdf-image.edited-image');
        for (const img of imageNodes) {
            const isPng = img.src.includes('image/png');
            const embeddedImg = isPng ? await doc.embedPng(img.src) : await doc.embedJpg(img.src);
            const pdfX = parseFloat(img.dataset.pdfX);
            const pdfY = parseFloat(img.dataset.pdfY);
            
            // Adjust visual width to PDF points
            const imgPdfW = img.offsetWidth / zoom;
            const imgPdfH = img.offsetHeight / zoom;
            
            page.drawImage(embeddedImg, {
                x: pdfX,
                y: pdfY - imgPdfH, // PDF draws bottom-up
                width: imgPdfW,
                height: imgPdfH
            });
        }

        // 3. Export Drawings
        const drawCanvas = drawLayersRef.current[index];
        if (drawCanvas) {
            // Check if canvas is actually empty (don't embed if empty to save file size)
            const isCanvasEmpty = () => {
              const ctx = drawCanvas.getContext('2d');
              const pixels = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
              for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i+3] !== 0) return false; // Found non-transparent pixel
              }
              return true;
            };

            if (!isCanvasEmpty()) {
                const dataUrl = drawCanvas.toDataURL('image/png');
                const pngImage = await doc.embedPng(dataUrl);
                
                // Get accurate dimensions of the page including CropBox/MediaBox
                const { width: pW, height: pH } = page.getSize();
                
                page.drawImage(pngImage, {
                    x: 0,
                    y: 0,
                    width: pW,
                    height: pH
                });
            }
        }
    }

    const savedBytes = await doc.save();
    const blob = new Blob([savedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_${fileName}`;
    a.click();
  };

  const ToolButton = ({ id, icon: Icon, label, shortcut }) => {
    // ACTIVE TOOLS CONTROLLED BY THIS ARRAY
    const isWorking = ['edit', 'add-text', 'image', 'signature', 'draw', 'highlight', 'eraser']; 
    const enabled = isWorking.includes(id);
    
    return (
      <button
        onClick={() => enabled && setActiveTool(id)}
        className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all relative group ${
          activeTool === id 
            ? 'bg-blue-50 text-blue-600 shadow-sm' 
            : enabled 
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed'
        }`}
      >
        <Icon size={20} strokeWidth={activeTool === id ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
        
        {/* Tooltip */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label} {shortcut && <span className="opacity-60 ml-1">({shortcut})</span>}
          {!enabled && <span className="text-red-300 ml-1">(Coming Soon)</span>}
        </div>
      </button>
    );
  };

  // --- RENDER LANDING PAGE ---
  if (!file) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        
        <header className="h-20 px-6 lg:px-16 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform duration-300">
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-800">PDFEditor<span className="text-red-500">.AI</span></span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <button className="hover:text-slate-900 transition-colors">Features</button>
            <button className="hover:text-slate-900 transition-colors">Tools</button>
            <button className="hover:text-slate-900 transition-colors">Pricing</button>
            <button className="hover:text-slate-900 transition-colors">API</button>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</button>
            <button className="text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Sign up</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center pt-20 px-4 pb-24 relative overflow-hidden">
          
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl -z-10 opacity-70 pointer-events-none"></div>
          <div className="absolute -left-32 top-32 w-72 h-72 bg-rose-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
          <div className="absolute -right-32 top-64 w-96 h-96 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

          <div className="text-center max-w-4xl mx-auto mb-14 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm mb-6 border border-blue-100">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              New: Auto Font-Matching Engine
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
              Edit PDF Documents <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Like a Pro.</span>
            </h1>
            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              The fastest, most secure way to modify text, add images, and sign your PDF files directly in the browser. No installation required.
            </p>
          </div>

          <div 
            className={`w-full max-w-3xl rounded-[2rem] border-2 transition-all duration-300 p-2 relative group z-10 overflow-hidden ${
              isDragging 
                ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-2xl shadow-blue-500/20' 
                : 'border-dashed border-slate-300 bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-slate-200/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
          >
            {/* Drag active overlay effect */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/5 pointer-events-none z-0 flex items-center justify-center">
                 <div className="w-full h-full border-4 border-blue-400 rounded-[1.8rem] opacity-50 animate-pulse"></div>
              </div>
            )}
            
            <div className="flex flex-col items-center justify-center py-24 px-4 rounded-[1.5rem] bg-slate-50/30 group-hover:bg-slate-50/80 transition-colors relative z-10">
              <div className={`w-24 h-24 bg-white shadow-md rounded-2xl flex items-center justify-center mb-8 border border-slate-100 transition-transform duration-300 ${isDragging ? '-translate-y-4 scale-110' : 'group-hover:-translate-y-2'}`}>
                <Upload size={40} className={`transition-colors duration-300 ${isDragging ? 'text-blue-600 animate-bounce' : 'text-blue-500'}`} strokeWidth={1.5} />
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-3">{isDragging ? 'Drop it here!' : 'Upload your PDF'}</h3>
              <p className="text-slate-500 mb-10 text-lg text-center max-w-md">Drag & drop your file here, or click the button below to browse your computer.</p>
              
              <label className="relative overflow-hidden bg-slate-900 hover:bg-slate-800 cursor-pointer text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-slate-900/25 flex items-center gap-3 transform hover:-translate-y-1">
                <Upload size={22} />
                Select PDF File
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
              </label>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400 font-medium">
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Private & Secure</div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Deleted after 2 hours</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-32 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <MousePointer2 size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-slate-800">Edit Text Seamlessly</h4>
              <p className="text-slate-500 leading-relaxed">Click any text to edit. We automatically match the original font style, size, and weight.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6">
                <FileSignature size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-slate-800">Sign & Fill Forms</h4>
              <p className="text-slate-500 leading-relaxed">Quickly add your signature, highlight important sections, or fill out PDF forms with ease.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Layers size={24} />
              </div>
              <h4 className="text-xl font-bold mb-3 text-slate-800">100% Free & Local</h4>
              <p className="text-slate-500 leading-relaxed">No watermark, no registration. Processing happens directly in your browser ensuring privacy.</p>
            </div>
          </div>

        </main>
      </div>
    );
  }

  // --- RENDER EDITOR UI ---
  const isDrawingTool = ['draw', 'highlight', 'eraser'].includes(activeTool);
  const isTextOrImageTool = ['edit', 'add-text', 'image', 'signature'].includes(activeTool);
  
  // Custom cursor classes
  let cursorClass = 'cursor-default';
  if (isDrawingTool) cursorClass = 'cursor-crosshair';
  else if (activeTool === 'add-text') cursorClass = 'cursor-text';
  else if (activeTool === 'image' || activeTool === 'signature') cursorClass = 'cursor-crosshair';

  return (
    <div className="h-screen bg-[#E5E7EB] flex flex-col font-sans overflow-hidden">
      
      {/* Hidden File Input for Image/Sign */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />

      <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-4 w-1/4">
          <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-200 cursor-pointer transition-colors max-w-full">
            <Edit3 size={16} className="text-slate-400" />
            <span className="font-semibold text-slate-700 truncate text-sm">{fileName}</span>
          </div>
          
          {/* UNDO / REDO CONTROLS */}
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
              disabled={historyStep >= history.length - 1}
              className={`p-2 rounded-md transition-colors ${historyStep >= history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl p-1.5 z-40 absolute left-1/2 -translate-x-1/2">
          <ToolButton id="edit" icon={MousePointer2} label="Edit Text" shortcut="E" />
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <ToolButton id="add-text" icon={Type} label="Add Text" shortcut="T" />
          <ToolButton id="image" icon={ImageIcon} label="Image" shortcut="I" />
          <ToolButton id="signature" icon={FileSignature} label="Sign" />
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          <ToolButton id="draw" icon={PenTool} label="Draw" shortcut="D" />
          <ToolButton id="highlight" icon={Highlighter} label="Highlight" shortcut="H" />
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

        <main className="flex-1 overflow-auto flex justify-center p-8 lg:p-12 pb-32 bg-[#E5E7EB] relative scroll-smooth">
          
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

          <div className={`flex flex-col items-center gap-8 pb-10 ${cursorClass}`}>
            {Array.from({ length: numPages }).map((_, idx) => (
              <div 
                key={idx}
                id={`page-wrapper-${idx}`}
                className="relative bg-white shadow-2xl transition-transform origin-top flex-shrink-0"
                style={{ width: 'fit-content', height: 'fit-content' }}
              >
                {/* 1. PDF Base */}
                <canvas 
                  ref={el => pagesRef.current[idx] = el} 
                  className="block" 
                />
                
                  {/* 2. Drawing Layer */}
                  <canvas 
                    ref={el => drawLayersRef.current[idx] = el} 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />

                {/* 3. Text & Image Layer */}
                <div 
                  ref={el => textLayersRef.current[idx] = el} 
                  className={`absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none`} 
                />

                {/* 4. Interaction Overlay (Sits on top, delegates events) */}
                <div 
                  className={`absolute top-0 left-0 w-full h-full ${isDrawingTool ? 'cursor-crosshair' : ''} ${activeTool === 'add-text' ? 'cursor-text' : ''}`}
                  onMouseDown={(e) => {
                    if (isDrawingTool) startDrawing(e, idx);
                    else if (isTextOrImageTool) handlePageClick(e, idx);
                  }}
                  onMouseMove={(e) => {
                    if (isDrawingTool) draw(e, idx);
                  }}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
