import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ToastState } from '@/types/ui';

interface ToastProps {
    toast: ToastState;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded-full border border-[#dadce0] bg-white text-[#202124] flex items-center gap-3 shadow-sm`}>
            {toast.type === 'error' ? (
                <AlertTriangle size={18} className="text-[#d93025]" />
            ) : (
                <CheckCircle2 size={18} className="text-[#188038]" />
            )}
            <span className="font-medium text-[14px]">{toast.message}</span>
        </div>
    </div>
);
