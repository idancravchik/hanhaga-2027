import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

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
  const [manualCode, setManualCode] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'game-qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      setManualCode('');
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setErrorMsg(null);
    setManualCode('');

    const startScanner = async () => {
      try {
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const scanner = new Html5Qrcode(readerElementId);
        scannerRef.current = scanner;

        const qrCodeSuccessCallback = (decodedText: string) => {
          if (scanner.isScanning) {
            scanner.stop().catch(() => {});
          }
          onScanSuccess(decodedText);
        };

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {}
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error('Camera QR start error:', err);
        if (isMounted) {
          setIsStarting(false);
          setErrorMsg('שגיאה בהפעלת המצלמה. באפשרותך להזין קוד תחנה ידנית למטה.');
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
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (e) {}
    }
    onScanSuccess(trimmed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 select-none">
      <div className="relative w-full max-w-md bg-[#FFFDF0] border-6 border-black rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FFD166] border-b-4 border-black">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-black stroke-[3]" />
            <span className="text-base font-black text-black">סריקת ברקוד / QR</span>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור סורק"
            className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center cursor-pointer hover:bg-red-200"
          >
            <X className="w-5 h-5 text-black stroke-[3]" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative h-[220px] bg-black flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full max-w-[280px]" />

          {isStarting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black text-white gap-2">
              <RefreshCw className="w-7 h-7 text-[#FFD166] animate-spin" />
              <span className="text-xs font-black">טוען מצלמה...</span>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#FFFDF0] p-4 text-center">
              <AlertCircle className="w-9 h-9 text-red-600 mb-1" />
              <p className="text-xs text-black font-black mb-1">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Fallback Manual Code Input Field */}
        <div className="p-4 bg-[#FFFDF0] border-t-4 border-black">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <label htmlFor="manual-station-code" className="text-xs font-black text-black flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-black" />
              <span>הזנת קוד תחנה ידנית (גיבוי):</span>
            </label>
            <div className="flex gap-2">
              <input
                id="manual-station-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="למשל: 1 או station-1"
                className="flex-1 px-3 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold text-black outline-none focus:ring-2 focus:ring-[#FFD166]"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-[#06D6A0] disabled:opacity-50 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                אישור
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
