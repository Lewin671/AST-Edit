import React, { useEffect, useState, useCallback } from 'react';
import { ArrowDown, FileCode2, Play, RotateCcw, Sparkles, Code2, FileOutput } from 'lucide-react';
import { Editor } from './components/Editor';
import { StatusBadge } from './components/StatusBadge';
import { initParser, performAstEdit } from './services/astEngine';
import { EditResult, EngineStatus } from './types';

// Initial Demo Code
const DEFAULT_SOURCE = `function calculateTotal(items) {
  let total = 0;
  
  for(let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  return total;
}`;

const DEFAULT_FIND = `for(let i = 0; i < items.length; i++) {
    total += items[i].price;
}`;

const DEFAULT_REPLACE = `for (const item of items) {
    total += item.price;
}`;

const App: React.FC = () => {
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOURCE);
  const [findString, setFindString] = useState(DEFAULT_FIND);
  const [replaceString, setReplaceString] = useState(DEFAULT_REPLACE);
  
  const [resultCode, setResultCode] = useState<string>('');
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(EngineStatus.LOADING);
  const [lastResult, setLastResult] = useState<EditResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initParser()
      .then(() => setEngineStatus(EngineStatus.READY))
      .catch((e) => {
        console.error(e);
        setEngineStatus(EngineStatus.ERROR);
      });
  }, []);

  const handleEdit = useCallback(() => {
    if (engineStatus !== EngineStatus.READY) return;

    setIsProcessing(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const result = performAstEdit(sourceCode, findString, replaceString);
      setLastResult(result);
      
      if (result.success && result.newCode) {
        setResultCode(result.newCode);
      } else {
        setResultCode(''); // Clear result on error
      }
      setIsProcessing(false);
    }, 100);
  }, [engineStatus, sourceCode, findString, replaceString]);

  const handleReset = useCallback(() => {
    setSourceCode(DEFAULT_SOURCE);
    setFindString(DEFAULT_FIND);
    setReplaceString(DEFAULT_REPLACE);
    setResultCode('');
    setLastResult(null);
  }, []);

  // Initial run once engine is ready
  useEffect(() => {
    if (engineStatus === EngineStatus.READY && !lastResult) {
        handleEdit();
    }
  }, [engineStatus, handleEdit, lastResult]);

  return (
    <div className="min-h-screen bg-background text-gray-200 flex flex-col font-sans selection:bg-primary/20 selection:text-primary-100">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileCode2 size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">AST Precise Edit</h1>
              <p className="text-xs text-gray-500">Structural Find & Replace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white text-xs font-medium rounded-md transition-colors hover:bg-white/5"
            >
              <RotateCcw size={12} />
              Reset Demo
            </button>
            <StatusBadge engineStatus={engineStatus} lastOperation={lastResult ? { success: lastResult.success, message: lastResult.message } : null} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 gap-4 grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-4rem)]">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden h-full">
          {/* Controls */}
          <div className="flex flex-col gap-4 bg-surface/30 p-4 rounded-xl border border-border">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Sparkles size={14} className="text-primary" />
                 <h2 className="text-sm font-semibold text-gray-300">Transformation Rules</h2>
               </div>
               <button 
                  onClick={handleEdit}
                  disabled={engineStatus !== EngineStatus.READY || isProcessing}
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-all shadow-lg shadow-blue-500/10"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-current" />
                      Apply Edit
                    </>
                  )}
                </button>
             </div>
             
             <div className="grid gap-3">
               <div className="h-36">
                <Editor 
                  label="🔍 Find Pattern" 
                  value={findString} 
                  onChange={setFindString}
                  placeholder="Paste code snippet to find..."
                  className="h-full"
                  highlightError={lastResult ? !lastResult.success : false}
                />
               </div>
               <div className="flex justify-center -my-1 relative z-10">
                 <div className="bg-surface border border-border p-1.5 rounded-full text-primary">
                   <ArrowDown size={14} />
                 </div>
               </div>
               <div className="h-36">
                <Editor 
                  label="✨ Replace With" 
                  value={replaceString} 
                  onChange={setReplaceString}
                  placeholder="Paste replacement code..."
                  className="h-full"
                />
               </div>
             </div>
             
             {/* Info/Tips */}
             <div className="text-xs text-gray-500 px-2 py-2 bg-white/[0.02] rounded-lg border border-white/5">
               <p className="flex items-start gap-2">
                 <span className="text-primary mt-0.5">💡</span>
                 <span>
                   <strong className="text-gray-400">Tip:</strong> The finder is whitespace-tolerant. It will match AST nodes even if your spacing differs from the source code.
                 </span>
               </p>
             </div>
          </div>
        </div>

        {/* Right Column: Code Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full overflow-hidden">
          <div className="grid grid-rows-2 h-full gap-4">
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-1">
                <Code2 size={14} className="text-gray-600" />
              </div>
              <Editor 
                label="📄 Original Source" 
                value={sourceCode} 
                onChange={setSourceCode}
                className="h-full"
              />
            </div>
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-1">
                <FileOutput size={14} className="text-gray-600" />
              </div>
              <Editor 
                label={lastResult?.success ? "✅ Result Preview" : "📋 Result Preview"} 
                value={resultCode} 
                readOnly 
                highlightError={lastResult ? !lastResult.success : false}
                placeholder={lastResult && !lastResult.success ? `⚠️ ${lastResult.message}` : "Click 'Apply Edit' to see the result..."}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;