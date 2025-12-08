import React from 'react';

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  label: string;
  highlightError?: boolean;
  placeholder?: string;
  className?: string;
}

export const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  readOnly = false, 
  label, 
  highlightError = false,
  placeholder,
  className = ""
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-border/30 border-t border-x border-border rounded-t-lg">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className={`relative flex-1 bg-surface border rounded-b-lg overflow-hidden transition-colors duration-200 ${highlightError ? 'border-error' : 'border-border'}`}>
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          placeholder={placeholder}
          className={`w-full h-full p-4 font-mono text-sm bg-transparent resize-none outline-none leading-6 ${readOnly ? 'text-gray-400 cursor-default' : 'text-gray-200'}`}
        />
      </div>
    </div>
  );
};