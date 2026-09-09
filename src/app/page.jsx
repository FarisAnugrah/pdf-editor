"use client"
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Type, Image as ImageIcon, 
  ArrowLeft, MousePointer2, Minus, Plus, 
  PenTool, Highlighter, Eraser, Spline, Square, Circle, Triangle, FileSignature, 
  Layers, LayoutTemplate, Menu, Edit3,
  Undo2, Redo2
} from 'lucide-react';

import { Toaster, toast } from 'sonner';

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [activeTool, setActiveTool] = useState('edit');
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  
  // Customization controls
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(14);
  const [activeTextId, setActiveTextId] = useState(null);
  
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
  const startShapePos = useRef({ x: 0, y: 0 }); // Track start for shapes
  const snapshotBeforeShape = useRef(null); // Save canvas state before drawing shape

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
          saveHistorySnapshot(); 
      };
      
      // Make image active on click so it can be deleted
      setActiveTextId(img);
      img.style.outline = "2px solid #0078d7";
      
      const clearOutline = (e) => {
        if (e.target !== img) {
          img.style.outline = "none";
          document.removeEventListener('mousedown', clearOutline);
        }
      };
      document.addEventListener('mousedown', clearOutline);

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
      
      // Handle deletion of active text/image/note
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeTextId) {
          activeTextId.remove();
          setActiveTextId(null);
          saveHistorySnapshot();
          toast.success("Element deleted");
        }
        return;
      }

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
  useEffect(() => {
    const handleClearCanvas = () => {
      drawLayersRef.current.forEach(canvas => {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      saveHistorySnapshot();
      toast.success("All drawings cleared!");
    };
    
    window.addEventListener('clear-canvas', handleClearCanvas);
    return () => window.removeEventListener('clear-canvas', handleClearCanvas);
  }, []);

  const handleFileUpload = async (e) => {
    const f = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f || f.type !== 'application/pdf') {
       toast.error("Please upload a valid PDF file.");
       return;
    }
    
    setIsDocumentLoading(true);
    setFile(f);
    setFileName(f.name);
    
    try {
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
      
      setHistory([]);
      setHistoryStep(-1);
      toast.success("Document loaded successfully!");
    } catch (err) {
      toast.error("Failed to read PDF document.");
      console.error(err);
      setFile(null);
    } finally {
      setIsDocumentLoading(false);
    }
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
      if (thumbCanvas && !thumbCanvas.dataset.rendered) {
        const unscaledViewport = page.getViewport({scale: 1.0});
        const thumbScale = 150 / unscaledViewport.width; 
        const thumbViewport = page.getViewport({scale: thumbScale});
        
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        
        if (!thumbCanvas.dataset.rendering) {
          thumbCanvas.dataset.rendering = "true";
          try {
            await page.render({canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport}).promise;
            thumbCanvas.dataset.rendered = "true";
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
        div.style.color = '#000000'; // Default color
        
        div.style.fontFamily = fontMatch.css;
        if (fontMatch.isBold) div.style.fontWeight = 'bold';
        if (fontMatch.isItalic) div.style.fontStyle = 'italic';
        
        div.style.pointerEvents = 'auto';
        
        div.onclick = (ev) => {
          ev.stopPropagation();
          if(activeTool !== 'edit') return;
          div.contentEditable = true;
          div.classList.add('editing');
          setActiveTextId(div);
          div.focus();
        };
        
        div.onblur = () => {
          div.contentEditable = false;
          div.classList.remove('editing');
          // Delay clearing active text to allow formatting clicks
          setTimeout(() => {
             if (document.activeElement !== div) setActiveTextId(null);
          }, 200);
          
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
    if (!['draw', 'line', 'rect', 'circle', 'triangle', 'highlight', 'eraser'].includes(activeTool)) return;
    isDrawing.current = true;
    const canvas = drawLayersRef.current[idx];
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;

    lastDrawPos.current = { x: startX, y: startY };
    startShapePos.current = { x: startX, y: startY };
    
    // Save current canvas state to allow shape preview
    if (['line', 'rect', 'circle', 'triangle'].includes(activeTool)) {
      snapshotBeforeShape.current = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    }
  };
  };

  const draw = (e, idx) => {
    if (!isDrawing.current || !['draw', 'line', 'rect', 'circle', 'triangle', 'highlight', 'eraser'].includes(activeTool)) return;
    const canvas = drawLayersRef.current[idx];
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // For freehand tools (draw, highlight, eraser)
    if (['draw', 'highlight', 'eraser'].includes(activeTool)) {
      ctx.beginPath();
      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 30 * (canvas.width / rect.width);
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
    } 
    // For shape tools
    else {
      // Restore canvas to state before shape was started (to clear preview)
      if (snapshotBeforeShape.current) {
        ctx.putImageData(snapshotBeforeShape.current, 0, 0);
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 * (canvas.width / rect.width);
      ctx.beginPath();
      
      const startX = startShapePos.current.x;
      const startY = startShapePos.current.y;

      if (activeTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
      } else if (activeTool === 'rect') {
        ctx.rect(startX, startY, x - startX, y - startY);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      } else if (activeTool === 'triangle') {
        ctx.moveTo(startX + (x - startX) / 2, startY);
        ctx.lineTo(x, y);
        ctx.lineTo(startX, y);
        ctx.closePath();
      }
      ctx.stroke();
    }
  };

  const stopDrawing = () => { 
    if (isDrawing.current) {
      isDrawing.current = false; 
      snapshotBeforeShape.current = null;
      saveHistorySnapshot(); 
    }
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
    if (activeTool === 'sticky') {
        const rect = textLayersRef.current[pageIndex].getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const viewport = viewportsRef.current[pageIndex];
        const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);
        const div = document.createElement('div');
        div.className = 'pdf-text edited new-text sticky-note';
        div.innerText = 'Note';
        div.contentEditable = true;
        div.dataset.orig = '';
        div.dataset.x = pdfX;
        div.dataset.y = pdfY;
        div.dataset.w = 150;
        div.dataset.sz = 12;
        div.dataset.fontName = 'Helvetica';
        div.dataset.pageIndex = pageIndex;
        div.dataset.isNew = 'true';
        div.dataset.isSticky = 'true';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.fontSize = (12 * zoom) + 'px';
        div.style.fontFamily = 'Arial, Helvetica, sans-serif';
        div.style.backgroundColor = '#fef08a';
        div.style.padding = '8px';
        div.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
        div.style.border = '1px solid #facc15';
        div.style.borderRadius = '2px';
        div.style.minWidth = '100px';
        div.style.minHeight = '50px';
        div.style.color = '#000000';
        div.onblur = () => { div.contentEditable = false; div.classList.remove('editing'); saveHistorySnapshot(); };
        div.onclick = (ev) => { 
          ev.stopPropagation(); 
          if (['edit', 'sticky'].includes(activeTool)) { 
            div.contentEditable = true; 
            div.classList.add('editing'); 
            setActiveTextId(div);
            div.focus(); 
          } 
        };
        textLayersRef.current[pageIndex].appendChild(div);
        setActiveTextId(div);
        setTimeout(() => { div.focus(); }, 50);
        return;
    }

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
        div.style.color = textColor;
        div.style.fontFamily = 'Arial, Helvetica, sans-serif';
        div.style.whiteSpace = 'nowrap';
        div.style.minWidth = '20px';

        div.onblur = () => { 
          div.contentEditable = false; 
          div.classList.remove('editing'); 
          setTimeout(() => { if (document.activeElement !== div) setActiveTextId(null); }, 200);
          saveHistorySnapshot(); 
        };
        div.onclick = (ev) => { 
          ev.stopPropagation(); 
          if (['edit', 'add-text'].includes(activeTool)) { 
            div.contentEditable = true; 
            div.classList.add('editing'); 
            setActiveTextId(div);
            div.focus(); 
          } 
        };

        textLayersRef.current[pageIndex].appendChild(div);
        setActiveTextId(div);
        setTimeout(() => { div.focus(); }, 50);

    } else if (activeTool === 'image' || activeTool === 'signature') {
        const rect = textLayersRef.current[pageIndex].getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        pendingImagePos.current = { pageIndex, x, y };
        if (imageInputRef.current) imageInputRef.current.click();
    }
  };

  // Apply color change to active text
  useEffect(() => {
    if (activeTextId && activeTool === 'edit') {
       activeTextId.style.color = textColor;
       saveHistorySnapshot();
    }
  }, [textColor]);

  // Apply size change to active text
  useEffect(() => {
    if (activeTextId && activeTool === 'edit') {
       activeTextId.style.fontSize = (textSize * zoom) + 'px';
       activeTextId.dataset.sz = textSize;
       saveHistorySnapshot();
    }
  }, [textSize]);
  const hexToRgb = (hex) => {
    // Default to black if format is wrong
    if (!hex || hex[0] !== '#') return { r: 0, g: 0, b: 0 }; 
    // Handle rgb/rgba string from DOM
    if (hex.startsWith('rgb')) {
       const rgbVals = hex.match(/\d+/g);
       if(rgbVals && rgbVals.length >= 3) {
         return { r: parseInt(rgbVals[0])/255, g: parseInt(rgbVals[1])/255, b: parseInt(rgbVals[2])/255 };
       }
    }
    // Handle hex
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c + c).join('');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return { r: r||0, g: g||0, b: b||0 };
  };

  const handlePageRotate = async (idx) => {
    if (!pdfBytes) return;
    const { PDFDocument, degrees } = window.PDFLib;
    const doc = await PDFDocument.load(pdfBytes);
    const page = doc.getPages()[idx];
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees(currentRot + 90));
    const newBytes = await doc.save();
    setPdfBytes(newBytes);
    const loadingTask = window.pdfjsLib.getDocument({data: newBytes});
    const newDoc = await loadingTask.promise;
    setPdfDoc(newDoc);
    toast.success("Page rotated");
  };

  const handlePageDelete = async (idx) => {
    if (!pdfBytes) return;
    if (numPages <= 1) {
      toast.error("Cannot delete the last page.");
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete page ${idx + 1}?`);
    if (!confirmDelete) return;
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.load(pdfBytes);
    doc.removePage(idx);
    const newBytes = await doc.save();
    setPdfBytes(newBytes);
    const loadingTask = window.pdfjsLib.getDocument({data: newBytes});
    const newDoc = await loadingTask.promise;
    setPdfDoc(newDoc);
    setNumPages(newDoc.numPages);
    pagesRef.current = Array(newDoc.numPages).fill(null);
    textLayersRef.current = Array(newDoc.numPages).fill(null);
    drawLayersRef.current = Array(newDoc.numPages).fill(null);
    thumbnailsRef.current = Array(newDoc.numPages).fill(null);
    viewportsRef.current = Array(newDoc.numPages).fill(null);
    toast.success("Page deleted successfully");
  };

  const handleSave = async () => {
    if(!pdfBytes) return;
    setIsExporting(true);
    const toastId = toast.loading('Preparing your document for export...');

    try {
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
            const colorRgb = hexToRgb(node.style.color || '#000000');
            
              if (node.dataset.isSticky === 'true') {
                  page.drawRectangle({
                      x: pdfX - 4,
                      y: pdfY - (pdfSz * 1.5) - 4,
                      width: Math.max(100, newText.length * (pdfSz * 0.5) + 8),
                      height: pdfSz * 2.5 + 8,
                      color: rgb(254/255, 240/255, 138/255),
                      borderColor: rgb(250/255, 204/255, 21/255),
                      borderWidth: 1
                  });
              }

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
                color: rgb(colorRgb.r, colorRgb.g, colorRgb.b)
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
    toast.success("Document exported successfully!", { id: toastId });
  } catch (err) {
      console.error(err);
      toast.error('Failed to export document.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) {
    return <LandingPage isDragging={isDragging} setIsDragging={setIsDragging} handleFileUpload={handleFileUpload} />;
  }

  const isDrawingTool = ["draw", "line", "rect", "circle", "triangle", "square", "highlight", "eraser"].includes(activeTool);
  const isTextOrImageTool = ['sticky', "edit", "add-text", "image", "signature"].includes(activeTool);
  let cursorClass = "cursor-default";
  if (isDrawingTool) cursorClass = "cursor-crosshair";
  else if (activeTool === "add-text" || activeTool === "sticky") cursorClass = "cursor-text";
  else if (activeTool === "image" || activeTool === "signature") cursorClass = "cursor-crosshair";

  return (
    <div className="h-screen bg-[#E5E7EB] flex flex-col font-sans overflow-hidden">
      
      {/* Hidden File Input for Image/Sign */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />

      <EditorToolbar 
        fileName={fileName}
        setFile={setFile}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        textColor={textColor}
        setTextColor={setTextColor}
        textSize={textSize}
        setTextSize={setTextSize}
        activeTextId={activeTextId}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        historyStep={historyStep}
        historyLength={history.length}
        handleSave={handleSave}
        isExporting={isExporting}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <EditorSidebar 
          numPages={numPages}
          thumbnailsRef={thumbnailsRef}
          handlePageDelete={handlePageDelete}
          handlePageRotate={handlePageRotate}
        />

        <main className="flex-1 overflow-auto flex justify-center p-8 lg:p-12 pb-32 bg-[#E5E7EB] relative scroll-smooth">
          <EditorZoomControls zoom={zoom} setZoom={setZoom} />

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
