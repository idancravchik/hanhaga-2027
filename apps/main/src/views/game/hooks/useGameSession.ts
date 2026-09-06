import { useState, useEffect, useCallback, useRef } from 'react';
import { GAME_CONSTANTS, STATIONS } from '../constants/gameConstants';

export interface GameSessionState {
  teamName: string;
  members: string[];
  status: 'registration' | 'navigation' | 'completed';
  completedStationIds: string[];
  activeStationId: string | null;
  startTime: number | null;
  elapsedSeconds: number;
  totalScore: number;
  stationAnswers: Record<string, number[]>;
}

const INITIAL_STATE: GameSessionState = {
  teamName: '',
  members: [],
  status: 'registration',
  completedStationIds: [],
  activeStationId: null,
  startTime: null,
  elapsedSeconds: 0,
  totalScore: 0,
  stationAnswers: {},
};

export function useGameSession() {
  const [session, setSession] = useState<GameSessionState>(() => {
    if (typeof window === 'undefined') return INITIAL_STATE;
    try {
      const saved = localStorage.getItem(GAME_CONSTANTS.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Calculate adjusted elapsed time if game was running
        if (parsed.status === 'navigation' && parsed.startTime) {
          const now = Date.now();
          const elapsed = Math.floor((now - parsed.startTime) / 1000);
          return { ...parsed, elapsedSeconds: elapsed };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load game session from localStorage:', e);
    }
    return INITIAL_STATE;
  });

  // Keep a ref to session for timer accuracy
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Persist session to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(GAME_CONSTANTS.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to persist game session:', e);
    }
  }, [session]);

  // Live Timer tick when in game
  useEffect(() => {
    if (session.status !== 'navigation') return;

    const interval = setInterval(() => {
      setSession((prev) => {
        if (prev.status !== 'navigation') return prev;
        if (!prev.startTime) return prev;
        const now = Date.now();
        const elapsed = Math.floor((now - prev.startTime) / 1000);
        return {
          ...prev,
          elapsedSeconds: elapsed,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status]);

  /**
   * Start a new game with team details
   */
  const startGame = useCallback((teamName: string, members: string[]) => {
    const now = Date.now();
    setSession({
      teamName: teamName.trim(),
      members: members.filter((m) => m.trim().length > 0),
      status: 'navigation',
      completedStationIds: [],
      activeStationId: null,
      startTime: now,
      elapsedSeconds: 0,
      totalScore: 0,
      stationAnswers: {},
    });
  }, []);

  /**
   * Open station quiz modal
   */
  const openStation = useCallback((stationId: string) => {
    setSession((prev) => ({
      ...prev,
      activeStationId: stationId,
    }));
  }, []);

  /**
   * Close station quiz without finishing
   */
  const closeStation = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      activeStationId: null,
    }));
  }, []);

  /**
   * Mark station as completed after answering 3 questions
   */
  const completeStation = useCallback((stationId: string, earnedScore: number, answers: number[]) => {
    setSession((prev) => {
      const alreadyCompleted = prev.completedStationIds.includes(stationId);
      const newCompleted = alreadyCompleted
        ? prev.completedStationIds
        : [...prev.completedStationIds, stationId];

      const newScore = alreadyCompleted ? prev.totalScore : prev.totalScore + earnedScore;
      const isAllDone = newCompleted.length >= STATIONS.length;

      return {
        ...prev,
        activeStationId: null,
        completedStationIds: newCompleted,
        totalScore: newScore,
        stationAnswers: {
          ...prev.stationAnswers,
          [stationId]: answers,
        },
        status: isAllDone ? 'completed' : 'navigation',
      };
    });
  }, []);

  /**
   * Finish game early or manually
   */
  const finishGame = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      status: 'completed',
      activeStationId: null,
    }));
  }, []);

  /**
   * Reset game session completely
   */
  const resetGame = useCallback(() => {
    try {
      localStorage.removeItem(GAME_CONSTANTS.STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setSession(INITIAL_STATE);
  }, []);

  return {
    session,
    startGame,
    openStation,
    closeStation,
    completeStation,
    finishGame,
    resetGame,
  };
}
