import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { soundEngine } from '../utils/audioUtils';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'game-qr-reader-container';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsStarting(true);
    setErrorMsg(null);

    const startScanner = async () => {
      try {
        // Wait a tick for the DOM element to mount
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const scanner = new Html5Qrcode(readerElementId);
        scannerRef.current = scanner;

        const qrCodeSuccessCallback = (decodedText: string) => {
          soundEngine.playScanBeep();
          // Stop camera quickly
          if (scanner.isScanning) {
            scanner.stop().catch(() => {});
          }
          onScanSuccess(decodedText);
        };

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {} // ignore frame scan errors
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error('Camera QR start error:', err);
        if (isMounted) {
          setIsStarting(false);
          setErrorMsg(
            'לא הצלחנו להפעיל את המצלמה. אנא ודאו שאישרתם הרשאת מצלמה לדפדפן.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch (e) {
          // ignore cleanup errors
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#1b4332] border-2 border-[#ffb703] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-black/30 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#ffb703] animate-pulse" />
            <h3 className="text-lg font-black text-white">סריקת ברקוד / QR של התחנה</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Video / Reader Area */}
        <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-black overflow-hidden">
          {/* Target Box & Laser Guide */}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            <div className="w-[240px] h-[240px] border-2 border-[#ffb703]/80 rounded-2xl relative">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#ffb703] -mt-1 -ml-1 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#ffb703] -mt-1 -mr-1 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#ffb703] -mb-1 -ml-1 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#ffb703] -mb-1 -mr-1 rounded-br-sm" />

              {/* Animated Laser line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#ffb703] to-transparent shadow-[0_0_8px_#ffb703] animate-pulse top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* HTML5 QR Container */}
          <div id={readerElementId} className="w-full h-full max-w-[360px]" />

          {/* Loading indicator */}
          {isStarting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 text-white gap-2">
              <RefreshCw className="w-8 h-8 text-[#ffb703] animate-spin" />
              <span className="text-sm font-semibold">מפעיל את המצלמה...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-sm text-red-200 font-medium mb-4 max-w-xs">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold cursor-pointer"
              >
                סגור
              </button>
            </div>
          )}
        </div>

        {/* Footer instruction */}
        <div className="p-3 bg-black/40 text-center text-xs text-emerald-200 border-t border-white/10">
          כוונו את המצלמה לקוד ה-QR שמוצב בתחנה בפרדס חנה
        </div>
      </div>
    </div>
  );
};
