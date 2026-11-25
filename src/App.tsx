import { useCallback, useEffect, useState } from 'react';
import { GameArena } from './components/GameArena';
import { Header } from './components/Header';
import { IdiomGlossary } from './components/IdiomGlossary';
import { TeacherPanel } from './components/TeacherPanel';
import { WinnerLeaderboard } from './components/WinnerLeaderboard';
import { LEVEL_CONFIGS } from './data/simpulanBahasa';
import { AppSection, ClassroomAnalytics, LevelNumber, WinnerRecord } from './types';

const LOCAL_STORAGE_KEY = 'jejak_simpulan_5uum_records_v1';

function readLocalCache(): ClassroomAnalytics {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { winners: [], idiomMistakes: {}, idiomAttempts: {} };
    const parsed = JSON.parse(raw) as Partial<ClassroomAnalytics>;
    return {
      winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      idiomMistakes: parsed.idiomMistakes || {},
      idiomAttempts: parsed.idiomAttempts || {},
    };
  } catch {
    return { winners: [], idiomMistakes: {}, idiomAttempts: {} };
  }
}

function writeLocalCache(data: ClassroomAnalytics): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('permainan');
  const [resetTrigger, setResetTrigger] = useState(0);
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [idiomMistakes, setIdiomMistakes] = useState<Record<string, number>>({});
  const [idiomAttempts, setIdiomAttempts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchClassroomData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/winners');
      if (res.ok) {
        const data = (await res.json()) as ClassroomAnalytics;
        setWinners(data.winners);
        setIdiomMistakes(data.idiomMistakes);
        setIdiomAttempts(data.idiomAttempts);
        writeLocalCache(data);
        return;
      }
    } catch {
      // Fallback to localStorage below
    } finally {
      setIsLoading(false);
    }

    const cached = readLocalCache();
    setWinners(cached.winners);
    setIdiomMistakes(cached.idiomMistakes);
    setIdiomAttempts(cached.idiomAttempts);
  }, []);

  useEffect(() => {
    void fetchClassroomData();
  }, [fetchClassroomData]);

  const handleSaveResult = useCallback(
    async (payload: {
      id: string;
      playerName: string;
      teamName: string;
      level: LevelNumber;
      levelTitle: string;
      score: number;
      accuracy: number;
      maxCombo: number;
      durationSeconds: number;
      hintsUsed: number;
      badge: string;
      mistakeIds: string[];
      attemptedIds: string[];
    }): Promise<WinnerRecord | null> => {
      const fallbackRecord: WinnerRecord = {
        id: payload.id,
        playerName: payload.playerName,
        teamName: payload.teamName,
        level: payload.level,
        levelTitle: payload.levelTitle,
        score: payload.score,
        accuracy: payload.accuracy,
        maxCombo: payload.maxCombo,
        durationSeconds: payload.durationSeconds,
        hintsUsed: payload.hintsUsed,
        badge: payload.badge,
        createdAt: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/winners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { record: WinnerRecord };
          await fetchClassroomData();
          return data.record;
        }
      } catch {
        // Fallback to local cache
      }

      const nextWinners = [...winners, fallbackRecord];
      const nextMistakes = { ...idiomMistakes };
      const nextAttempts = { ...idiomAttempts };
      for (const id of payload.mistakeIds) {
        nextMistakes[id] = (nextMistakes[id] || 0) + 1;
      }
      for (const id of payload.attemptedIds) {
        nextAttempts[id] = (nextAttempts[id] || 0) + 1;
      }
      setWinners(nextWinners);
      setIdiomMistakes(nextMistakes);
      setIdiomAttempts(nextAttempts);
      writeLocalCache({
        winners: nextWinners,
        idiomMistakes: nextMistakes,
        idiomAttempts: nextAttempts,
      });
      return fallbackRecord;
    },
    [fetchClassroomData, idiomAttempts, idiomMistakes, winners]
  );

  const handleAddManualWinner = useCallback(
    async (payload: {
      playerName: string;
      teamName: string;
      level: LevelNumber;
      score: number;
      accuracy: number;
      durationSeconds: number;
    }) => {
      const badge =
        payload.accuracy >= 90
          ? 'Jaguh Emas'
          : payload.accuracy >= 75
          ? 'Pencabar Perak'
          : 'Harapan Gangsa';

      await handleSaveResult({
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerName: payload.playerName,
        teamName: payload.teamName,
        level: payload.level,
        levelTitle: LEVEL_CONFIGS[payload.level].title,
        score: payload.score,
        accuracy: payload.accuracy,
        maxCombo: 1,
        durationSeconds: payload.durationSeconds,
        hintsUsed: 0,
        badge,
        mistakeIds: [],
        attemptedIds: [],
      });
    },
    [handleSaveResult]
  );

  const handleDeleteWinner = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/winners/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {
        // Ignore network error and update local state
      }
      const next = winners.filter((w) => w.id !== id);
      setWinners(next);
      writeLocalCache({
        winners: next,
        idiomMistakes,
        idiomAttempts,
      });
    },
    [idiomAttempts, idiomMistakes, winners]
  );

  const handleResetAll = useCallback(async () => {
    try {
      await fetch('/api/winners', { method: 'DELETE' });
    } catch {
      // Ignore network error
    }
    setWinners([]);
    setIdiomMistakes({});
    setIdiomAttempts({});
    writeLocalCache({ winners: [], idiomMistakes: {}, idiomAttempts: {} });
  }, []);

  const handleQuickStart = () => {
    setActiveSection('permainan');
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-slate-900">
      <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onQuickStart={handleQuickStart}
      />

      <main className="flex-1">
        {activeSection === 'permainan' && (
          <GameArena
            resetTrigger={resetTrigger}
            onSaveResult={handleSaveResult}
            onOpenLeaderboard={() => setActiveSection('pemenang')}
          />
        )}

        {activeSection === 'nota' && <IdiomGlossary />}

        {activeSection === 'pemenang' && (
          <WinnerLeaderboard
            winners={winners}
            isLoading={isLoading}
            onStartPlaying={handleQuickStart}
          />
        )}

        {activeSection === 'guru' && (
          <TeacherPanel
            winners={winners}
            idiomMistakes={idiomMistakes}
            idiomAttempts={idiomAttempts}
            onAddManualWinner={handleAddManualWinner}
            onDeleteWinner={handleDeleteWinner}
            onResetAll={handleResetAll}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Jejak Simpulan · Aplikasi Pembelajaran Bahasa Melayu Tingkatan 5 UUM (Cikgu Fedelish)
          </p>
          <p>30 Simpulan Bahasa · Padanan Maksud, Tahap Berperingkat & Data Pemenang</p>
        </div>
      </footer>
    </div>
  );
}
