import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ToastState } from '@/types/ui';

interface ToastProps {
    toast: ToastState;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => (
    <div
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        aria-atomic="true"
        className={`fixed z-[100] transition-all duration-300 pointer-events-none transform left-1/2 -translate-x-1/2 bottom-20 sm:bottom-auto sm:top-6 ${
            toast.show ? 'translate-y-0 opacity-100' : 'translate-y-4 sm:-translate-y-6 opacity-0'
        }`}
    >
        <div className="px-6 py-3 rounded-full border border-[#dadce0] bg-white text-[#202124] flex items-center gap-3 shadow-lg pointer-events-auto">
            {toast.type === 'error' ? (
                <AlertTriangle size={18} className="text-[#d93025] shrink-0" aria-hidden="true" />
            ) : (
                <CheckCircle2 size={18} className="text-[#188038] shrink-0" aria-hidden="true" />
            )}
            <span className="font-medium text-[14px]">{toast.message}</span>
        </div>
    </div>
);
