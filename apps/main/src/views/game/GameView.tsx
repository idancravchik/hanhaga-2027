import React, { useState, useEffect, useCallback } from 'react';
import { useGameSession } from './hooks/useGameSession';
import { STATIONS } from './constants/gameConstants';
import { LandscapeGuard } from './components/LandscapeGuard';
import { RegistrationScreen } from './components/RegistrationScreen';
import { NavigationHud } from './components/NavigationHud';
import { QrScannerModal } from './components/QrScannerModal';
import { StationQuizModal } from './components/StationQuizModal';
import { GameSummaryScreen } from './components/GameSummaryScreen';
import { kioskUtils } from './utils/kioskUtils';

export const GameView: React.FC = () => {
  const {
    session,
    startGame,
    openStation,
    closeStation,
    completeStation,
    resetGame,
  } = useGameSession();

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullscreenExited, setIsFullscreenExited] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Complete page scroll lock
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyTouch = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'manipulation';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevBodyTouch;
    };
  }, []);

  // Kiosk mode beforeunload & history trap
  useEffect(() => {
    if (session.status === 'navigation') {
      const cleanupBeforeUnload = kioskUtils.enableBeforeUnloadWarning();
      const cleanupHistory = kioskUtils.setupHistoryTrap(() => {
        showToast('המשחק פעיל!');
      });

      return () => {
        cleanupBeforeUnload();
        cleanupHistory();
      };
    }
  }, [session.status, showToast]);

  // Exam Fullscreen Listener (Detect if user exited fullscreen during game)
  useEffect(() => {
    if (session.status !== 'navigation') {
      setIsFullscreenExited(false);
      return;
    }

    const unbind = kioskUtils.onFullscreenChange((isFullscreen) => {
      if (!isFullscreen && session.status === 'navigation') {
        setIsFullscreenExited(true);
      } else {
        setIsFullscreenExited(false);
      }
    });

    return unbind;
  }, [session.status]);

  // Active station
  const activeStation = STATIONS.find((s) => s.id === session.activeStationId) || null;

  // QR Code scan handler
  const handleQrScan = useCallback(
    (decodedText: string) => {
      setIsScannerOpen(false);
      const cleanText = decodedText.trim();

      const foundStation = STATIONS.find((st) => {
        if (cleanText === st.qrCode || cleanText === st.id) return true;
        if (cleanText.includes(`station=${st.id}`) || cleanText.includes(`station=${st.qrCode}`)) return true;
        const stationNum = st.id.replace('station-', '');
        if (cleanText.includes(`station=${stationNum}`) || cleanText.endsWith(`/${st.id}`)) return true;
        return false;
      });

      if (!foundStation) {
        showToast('קוד ברקוד לא שייך למשחק');
        return;
      }

      if (session.completedStationIds.includes(foundStation.id)) {
        showToast('תחנה זו כבר הושלמה');
        return;
      }

      openStation(foundStation.id);
    },
    [session.completedStationIds, openStation, showToast]
  );

  // Return to Fullscreen
  const handleResumeFullscreen = async () => {
    await kioskUtils.requestFullscreen();
    setIsFullscreenExited(false);
  };

  // Cancel game without saving
  const handleCancelGame = () => {
    setIsFullscreenExited(false);
    resetGame();
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] overflow-hidden select-none touch-none overscroll-none font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[#FFFDF0] text-black border-4 border-black px-4 py-1.5 rounded-xl text-sm font-black text-center">
          {toastMessage}
        </div>
      )}

      {/* Exam Mode: Fullscreen Exit Blocker */}
      {isFullscreenExited && session.status === 'navigation' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
          <div className="bg-[#FFFDF0] border-6 border-black rounded-3xl p-5 max-w-sm w-full text-center flex flex-col items-center">
            <h2 className="text-2xl font-black text-black mb-2">
              ⚠️ יצאתם ממסך מלא!
            </h2>
            <div className="w-full space-y-2 mt-2">
              <button
                onClick={handleResumeFullscreen}
                className="w-full py-2.5 bg-[#4CAF50] text-black font-black text-base rounded-xl border-4 border-black cursor-pointer active:translate-y-1"
              >
                חזרה למסך מלא
              </button>
              <button
                onClick={handleCancelGame}
                className="w-full py-2 bg-[#FF6B6B] text-black font-black text-sm rounded-xl border-4 border-black cursor-pointer active:translate-y-1"
              >
                ביטול משחק ואיפוס
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Views */}
      {session.status === 'registration' ? (
        <RegistrationScreen onStartGame={startGame} />
      ) : (
        <LandscapeGuard>
          {session.status === 'navigation' && (
            <NavigationHud
              session={session}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          )}

          {session.status === 'completed' && (
            <GameSummaryScreen session={session} onRestart={resetGame} />
          )}

          {/* QR Scanner */}
          <QrScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={handleQrScan}
          />

          {/* Station 3 Questions Quiz */}
          {activeStation && (
            <StationQuizModal
              station={activeStation}
              onComplete={(stationId, score, answers) => {
                completeStation(stationId, score, answers);
              }}
              onClose={closeStation}
            />
          )}
        </LandscapeGuard>
      )}
    </div>
  );
};

export default GameView;
