import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { ModalState } from '@/types/ui';

interface ModalProps {
    modal: ModalState;
    setModal: (modal: ModalState) => void;
}

export const Modal: React.FC<ModalProps> = ({ modal, setModal }) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!modal.show) return;

        // Remember element that had focus before opening
        previousActiveElement.current = document.activeElement as HTMLElement | null;

        // Autofocus on first interactive element
        const timer = setTimeout(() => {
            if (dialogRef.current) {
                const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    focusableElements[0]?.focus();
                } else {
                    dialogRef.current.focus();
                }
            }
        }, 50);

        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape key closes modal
            if (e.key === 'Escape') {
                e.preventDefault();
                setModal({ ...modal, show: false });
                return;
            }

            // Keyboard focus containment (Tab trapping)
            if (e.key === 'Tab' && dialogRef.current) {
                const focusableElements = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                );

                if (focusableElements.length === 0) {
                    e.preventDefault();
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            // Focus return on unmount / close
            if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
                previousActiveElement.current.focus();
            }
        };
    }, [modal.show, setModal]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-200 ${modal.show ? 'visible opacity-100' : 'invisible opacity-0'}`}
        >
            <div className="absolute inset-0 bg-[#202124]/50" onClick={() => !modal.isConfirm && setModal({ ...modal, show: false })}></div>
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="bg-white rounded-[24px] border border-[#dadce0] w-full max-w-[440px] relative z-10 p-5 sm:p-6 text-right shadow-none max-h-[90vh] overflow-y-auto focus:outline-hidden"
                dir="rtl"
            >
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
};
