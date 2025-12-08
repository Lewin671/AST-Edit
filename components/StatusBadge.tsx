import React from 'react';
import { EngineStatus } from '../types';
import { CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';

interface StatusBadgeProps {
  engineStatus: EngineStatus;
  lastOperation?: { success: boolean; message: string } | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ engineStatus, lastOperation }) => {
  if (engineStatus === EngineStatus.LOADING) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading Tree-sitter...</span>
      </div>
    );
  }

  if (engineStatus === EngineStatus.ERROR) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
        <AlertCircle className="w-3 h-3" />
        <span>Engine Error</span>
      </div>
    );
  }

  if (!lastOperation) {
    return (
       <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
        <Zap className="w-3 h-3" />
        <span>Ready</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      lastOperation.success 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }`}>
      {lastOperation.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      <span className="max-w-[300px] truncate">{lastOperation.message}</span>
    </div>
  );
};