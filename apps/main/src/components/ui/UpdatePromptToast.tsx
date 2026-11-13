import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

/**
 * UpdatePromptToast
 * Pillar 1: Versioning & Seamless PWA Updates
 *
 * Listens for waiting Service Worker updates and gently prompts the user to refresh.
 * Only triggers page reload when the user explicitly clicks the update action.
 */
export const UpdatePromptToast: React.FC = () => {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg) return;

            if (reg.waiting) {
                setWaitingWorker(reg.waiting);
                setShowPrompt(true);
            }

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setWaitingWorker(newWorker);
                        setShowPrompt(true);
                    }
                });
            });
        });
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            }, { once: true });
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
            window.location.reload();
        }
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <aside
            aria-label="הודעת עדכון מערכת"
            className="fixed bottom-6 left-6 z-50 max-w-sm bg-white/95 backdrop-blur-md border border-[#dadce0] rounded-2xl shadow-2xl p-4 text-[#202124] animate-in fade-in slide-in-from-bottom-4 duration-300"
            role="status"
        >
            <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 text-[#1a73e8] rounded-xl shrink-0">
                    <Sparkles size={20} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#202124] mb-0.5">גרסה חדשה זמינה!</h2>
                    <p className="text-[12px] text-[#5f6368] leading-relaxed mb-3">
                        המערכת עודכנה עם שיפורי אבטחה וביצועים חדשים.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUpdate}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-white bg-[#1a73e8] hover:bg-[#1967d2] rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-1"
                        >
                            <RefreshCw size={13} className="animate-spin-reverse" aria-hidden="true" />
                            עדכן כעת
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPrompt(false)}
                            className="px-3 py-1.5 text-[12px] font-medium text-[#5f6368] hover:text-[#202124] hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            מאוחר יותר
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
