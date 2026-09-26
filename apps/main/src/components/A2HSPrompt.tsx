import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

const STORAGE_KEY = 'a2hs_dismissed';

export const A2HSPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already running in standalone mode (already installed)
        const isStandaloneMode = 
            window.matchMedia('(display-mode: standalone)').matches || 
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://');

        if (isStandaloneMode) {
            setIsStandalone(true);
            return;
        }

        // Check if user previously dismissed the prompt
        const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
        if (dismissed) {
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // For iOS: show prompt after a short delay if in Safari (not standalone)
        if (isIosDevice) {
            const isSafari = /safari/.test(userAgent) && !/crios|fxios|opios|mercury/.test(userAgent);
            if (isSafari) {
                const timer = setTimeout(() => setIsVisible(true), 2500);
                return () => clearTimeout(timer);
            }
        }

        // For Android / Chrome / Desktop: capture beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            // Keep Chrome's capability to prompt, capture event
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // ignore localStorage disabled/quota errors
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            handleDismiss();
        }
        setDeferredPrompt(null);
    };

    if (isStandalone || !isVisible) {
        return null;
    }

    return (
        <aside 
            aria-label="התקנת אפליקציה למסך הבית" 
            className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <img 
                        src="/icons/icon-192.png" 
                        alt="לוגו אפליקציה" 
                        className="w-12 h-12 rounded-xl shadow-sm object-cover border border-slate-100"
                    />
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                            התקנת אפליקציית הנהגה 2027
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            גישה מהירה ונוחה ישירות ממסך הבית
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="סגור הודעה"
                >
                    <X size={18} />
                </button>
            </div>

            {isIOS ? (
                <div className="mt-3 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900 leading-relaxed">
                    <p className="font-semibold mb-1">איך להתקין ב-iPhone:</p>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span>1. לחצו על כפתור השיתוף בתחתית המסך</span>
                        <Share size={14} className="text-blue-600 inline shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span>2. גללו מטה ובחרו ב-</span>
                        <strong className="font-semibold flex items-center gap-1 text-blue-800">
                            "הוסף למסך הבית"
                            <PlusSquare size={13} className="shrink-0" />
                        </strong>
                    </div>
                </div>
            ) : (
                deferredPrompt && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                            onClick={handleDismiss}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            לא עכשיו
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="flex items-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
                        >
                            <Download size={14} />
                            <span>הוסף למסך הבית</span>
                        </button>
                    </div>
                )
            )}
        </aside>
    );
};
