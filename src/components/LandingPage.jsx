import React from 'react';
import { Layers, Upload, MousePointer2, FileSignature } from 'lucide-react';

export default function LandingPage({ isDragging, setIsDragging, handleFileUpload }) {
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
        
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl -z-10 opacity-70 pointer-events-none animate-pulse duration-1000"></div>
        <div className="absolute -left-32 top-32 w-72 h-72 bg-rose-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none mix-blend-multiply animate-blob"></div>
        <div className="absolute -right-32 top-64 w-96 h-96 bg-blue-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none mix-blend-multiply animate-blob animation-delay-2000"></div>

        <div className="text-center max-w-4xl mx-auto mb-14 px-4 animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm mb-6 border border-blue-100 shadow-sm">
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
