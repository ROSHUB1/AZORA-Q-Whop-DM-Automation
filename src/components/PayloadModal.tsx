import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface PayloadModalProps {
  title: string;
  subtitle?: string;
  data: any;
  onClose: () => void;
}

export const PayloadModal: React.FC<PayloadModalProps> = ({
  title,
  subtitle,
  data,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div
        className="w-full max-w-2xl bg-[#0e1014] border border-[#1e222b] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1e222b] bg-[#090a0d] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 font-mono">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#15171d] hover:bg-neutral-800 border border-[#232732] text-neutral-300 text-xs font-mono transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#07080a]">
          <pre className="text-[11px] font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed">
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  );
};
