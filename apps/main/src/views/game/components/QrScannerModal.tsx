import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

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
          setErrorMsg('שגיאה בהפעלת המצלמה. אנא ודאו שאישרתם הרשאה לדפדפן.');
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
            className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center cursor-pointer hover:bg-red-200"
          >
            <X className="w-5 h-5 text-black stroke-[3]" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative h-[250px] bg-black flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full max-w-[280px]" />

          {isStarting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black text-white gap-2">
              <RefreshCw className="w-7 h-7 text-[#FFD166] animate-spin" />
              <span className="text-xs font-black">טוען מצלמה...</span>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#FFFDF0] p-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-600 mb-2" />
              <p className="text-xs text-black font-black mb-3">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-[#FFD166] border-2 border-black rounded-lg text-xs font-black cursor-pointer"
              >
                סגור
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
