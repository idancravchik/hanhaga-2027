import React, { useState, useEffect, useCallback } from 'react';
import { useGameSession } from './hooks/useGameSession';
import { STATIONS, Station } from './constants/gameConstants';
import { LandscapeGuard } from './components/LandscapeGuard';
import { RegistrationScreen } from './components/RegistrationScreen';
import { NavigationHud } from './components/NavigationHud';
import { QrScannerModal } from './components/QrScannerModal';
import { StationQuizModal } from './components/StationQuizModal';
import { GameSummaryScreen } from './components/GameSummaryScreen';
import { kioskUtils } from './utils/kioskUtils';
import { soundEngine } from './utils/audioUtils';

export const GameView: React.FC = () => {
  const {
    session,
    startGame,
    openStation,
    closeStation,
    completeStation,
    finishGame,
    resetGame,
  } = useGameSession();

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Kiosk mode beforeunload protection
  useEffect(() => {
    if (session.status === 'navigation') {
      const cleanupBeforeUnload = kioskUtils.enableBeforeUnloadWarning();
      const cleanupHistory = kioskUtils.setupHistoryTrap(() => {
        showToast('המשחק בעיצומו! כדי לצאת לחצו על סיום בסרגל העליון.');
      });

      return () => {
        cleanupBeforeUnload();
        cleanupHistory();
      };
    }
  }, [session.status, showToast]);

  // Find active station object if open
  const activeStation = STATIONS.find((s) => s.id === session.activeStationId) || null;

  // Handler when QR code is scanned
  const handleQrScan = useCallback(
    (decodedText: string) => {
      setIsScannerOpen(false);
      const cleanText = decodedText.trim();

      // Match station by qrCode, id, or number
      const foundStation = STATIONS.find((st) => {
        if (cleanText === st.qrCode || cleanText === st.id) return true;
        // Check if QR is a URL like ".../game?station=1" or ".../game?station=station-1"
        if (cleanText.includes(`station=${st.id}`) || cleanText.includes(`station=${st.qrCode}`)) return true;
        const stationNum = st.id.replace('station-', '');
        if (cleanText.includes(`station=${stationNum}`) || cleanText.endsWith(`/${st.id}`)) return true;
        return false;
      });

      if (!foundStation) {
        soundEngine.playScanBeep();
        showToast('⚠️ קוד ה-QR שנסרק אינו שייך לתחנות הניווט בפרדס חנה. נסו שוב!');
        return;
      }

      // Check if station was already completed
      if (session.completedStationIds.includes(foundStation.id)) {
        soundEngine.playSuccessChime();
        showToast(`📍 תחנת "${foundStation.name}" כבר הושלמה בעבר! המשיכו לתחנה הבאה.`);
        return;
      }

      // Open Quiz Modal for this station
      openStation(foundStation.id);
    },
    [session.completedStationIds, openStation, showToast]
  );

  return (
    <LandscapeGuard>
      <div className="relative min-h-screen w-full font-sans antialiased overflow-hidden select-none">
        
        {/* Floating In-Game Toast */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#FFFDF0] text-black border-4 border-black px-5 py-2 rounded-2xl text-xs sm:text-sm font-black max-w-md text-center">
            {toastMessage}
          </div>
        )}

        {/* View Switcher */}
        {session.status === 'registration' && (
          <RegistrationScreen onStartGame={startGame} />
        )}

        {session.status === 'navigation' && (
          <NavigationHud
            session={session}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {session.status === 'completed' && (
          <GameSummaryScreen session={session} onRestart={resetGame} />
        )}

        {/* QR Scanner Camera Modal */}
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleQrScan}
        />

        {/* Station 3 Questions Quiz Modal */}
        {activeStation && (
          <StationQuizModal
            station={activeStation}
            onComplete={(stationId, score, answers) => {
              completeStation(stationId, score, answers);
            }}
            onClose={closeStation}
          />
        )}
      </div>
    </LandscapeGuard>
  );
};

export default GameView;
