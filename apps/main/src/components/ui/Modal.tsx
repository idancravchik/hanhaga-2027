import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { ModalState } from '@/types/ui';

interface ModalProps {
    modal: ModalState;
    setModal: (modal: ModalState) => void;
}

export const Modal: React.FC<ModalProps> = ({ modal, setModal }) => (
    <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-200 ${modal.show ? 'visible opacity-100' : 'invisible opacity-0'}`}
    >
        <div className="absolute inset-0 bg-[#202124]/50" onClick={() => !modal.isConfirm && setModal({ ...modal, show: false })}></div>
        <div className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-[440px] relative z-10 p-5 sm:p-6 text-right shadow-none max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${modal.isConfirm ? 'bg-[#fef7e0] text-[#b06000]' : 'bg-[#e8f0fe] text-[#1a73e8]'}`}>
                    {modal.isConfirm ? <AlertTriangle size={20} /> : <Info size={20} />}
                </div>
                <h3 id="modal-title" className="text-[18px] font-medium text-[#202124] leading-tight">{modal.title}</h3>
            </div>
            <p className="text-[#3c4043] text-[16px] leading-relaxed mb-6 font-normal">{modal.message}</p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#dadce0]/60">
                {modal.isConfirm && (
                    <button
                        type="button"
                        onClick={() => setModal({ ...modal, show: false })}
                        className="h-10 px-6 rounded-full text-[14px] font-medium text-[#3c4043] bg-[#f1f3f4] hover:bg-[#e8eaed] transition-colors"
                    >
                        ביטול
                    </button>
                )}
                <button
                    type="button"
                    onClick={modal.onConfirm}
                    className="h-10 px-6 rounded-full text-[14px] font-medium text-white bg-[#1a73e8] hover:bg-[#1967d2] transition-colors"
                >
                    אישור
                </button>
            </div>
        </div>
    </div>
);
