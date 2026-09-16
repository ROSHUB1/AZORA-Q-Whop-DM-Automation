import React from 'react';
import { X, CheckCircle2, Shield, Info, ArrowRight } from 'lucide-react';

export interface WorkflowNodeDetail {
  id: string;
  name: string;
  stage: string;
  description: string;
  triggerCondition: string;
  parameters: Record<string, string | number | boolean>;
  safeguards: string[];
  failureAction: string;
}

interface WorkflowNodeModalProps {
  node: WorkflowNodeDetail | null;
  onClose: () => void;
}

export const WorkflowNodeModal: React.FC<WorkflowNodeModalProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div
        className="w-full max-w-lg bg-[#0e1014] border border-[#1e222b] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1e222b] bg-[#090a0d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300">
              {node.stage}
            </span>
            <h3 className="text-sm font-semibold text-neutral-100 font-mono">
              {node.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono mb-1">
              Description & Objective
            </div>
            <p className="text-neutral-300 font-mono text-[11px] leading-relaxed">
              {node.description}
            </p>
          </div>

          <div className="p-3 rounded-md bg-[#13161c] border border-[#1e222b] space-y-2 font-mono">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Trigger & Condition
            </div>
            <p className="text-neutral-200 text-[11px] bg-[#090a0d] p-2 rounded border border-[#1e222b]">
              {node.triggerCondition}
            </p>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono mb-1.5">
              Active Parameters
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              {Object.entries(node.parameters).map(([key, val]) => (
                <div
                  key={key}
                  className="p-2 rounded bg-[#13161c] border border-[#1e222b] flex items-center justify-between"
                >
                  <span className="text-neutral-400 text-[10px]">{key}</span>
                  <span className="text-neutral-200 font-semibold">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono mb-1.5">
              Safeguards Applied
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {node.safeguards.map((sg, idx) => (
                <div key={idx} className="flex items-center gap-2 text-neutral-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{sg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e222b] flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Failure Strategy:</span>
            <span className="text-rose-400 font-medium">{node.failureAction}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
