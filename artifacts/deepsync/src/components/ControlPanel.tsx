import React from 'react';

interface ControlPanelProps {
  onStartMock: () => void;
  onStartReal: () => void;
  onStop: () => void;
  status: 'IDLE' | 'MOCK' | 'REAL';
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onStartMock, onStartReal, onStop, status }) => {
  return (
    <div className="flex gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
      <button 
        onClick={onStartMock}
        className={`px-4 py-2 rounded font-bold transition-all ${status === 'MOCK' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
      >
        الوضع الافتراضي
      </button>
      <button 
        onClick={onStartReal}
        className={`px-4 py-2 rounded font-bold transition-all ${status === 'REAL' ? 'bg-green-700' : 'bg-slate-700 hover:bg-green-900'}`}
      >
        الوضع الواقعي
      </button>
      <button 
        onClick={onStop}
        className="px-4 py-2 rounded font-bold bg-red-900 hover:bg-red-800 transition-all"
      >
        إيقاف العمليات
      </button>
    </div>
  );
};