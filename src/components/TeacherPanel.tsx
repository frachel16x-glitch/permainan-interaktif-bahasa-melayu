import { FormEvent, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { LEVEL_CONFIGS, SIMPULAN_BAHASA_BANK } from '../data/simpulanBahasa';
import { LevelNumber, WinnerRecord } from '../types';

interface TeacherPanelProps {
  winners: WinnerRecord[];
  idiomMistakes: Record<string, number>;
  idiomAttempts: Record<string, number>;
  onAddManualWinner: (payload: {
    playerName: string;
    teamName: string;
    level: LevelNumber;
    score: number;
    accuracy: number;
    durationSeconds: number;
  }) => Promise<void>;
  onDeleteWinner: (id: string) => Promise<void>;
  onResetAll: () => Promise<void>;
}

export function TeacherPanel({
  winners,
  idiomMistakes,
  idiomAttempts,
  onAddManualWinner,
  onDeleteWinner,
  onResetAll,
}: TeacherPanelProps) {
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('5 UUM');
  const [level, setLevel] = useState<LevelNumber>(1);
  const [score, setScore] = useState('450');
  const [accuracy, setAccuracy] = useState('90');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const summaryStats = useMemo(() => {
    const totalPlays = winners.length;
    const avgScore =
      totalPlays > 0
        ? Math.round(winners.reduce((acc, w) => acc + w.score, 0) / totalPlays)
        : 0;
    const avgAccuracy =
      totalPlays > 0
        ? Math.round(winners.reduce((acc, w) => acc + w.accuracy, 0) / totalPlays)
        : 0;
    const level3Count = winners.filter((w) => w.level === 3).length;
    return { totalPlays, avgScore, avgAccuracy, level3Count };
  }, [winners]);

  const trickyIdioms = useMemo(() => {
    return SIMPULAN_BAHASA_BANK.map((item) => {
      const mistakes = idiomMistakes[item.id] || 0;
      const attempts = idiomAttempts[item.id] || 0;
      return { item, mistakes, attempts };
    })
      .filter((entry) => entry.mistakes > 0)
      .sort((a, b) => b.mistakes - a.mistakes)
      .slice(0, 8);
  }, [idiomMistakes, idiomAttempts]);

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddManualWinner({
        playerName: playerName.trim(),
        teamName: teamName.trim() || '5 UUM',
        level,
        score: Math.max(0, Number(score) || 0),
        accuracy: Math.min(100, Math.max(0, Number(accuracy) || 0)),
        durationSeconds: 60,
      });
      setPlayerName('');
      setFeedbackMsg('Rekod pemenang berjaya ditambah ke papan pendahulu.');
      setTimeout(() => setFeedbackMsg(''), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-teal-800">
            Ruang Pengurusan Cikgu Fedelish · Tingkatan 5 UUM
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Panel Guru & Analisis Kelas
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Pantau tahap penguasaan pelajar, kesan simpulan bahasa yang kerap tersalah padan, dan urus rekod pemenang kelas.
          </p>
        </div>

        <div className="shrink-0">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={winners.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Kosongkan Rekod Kelas
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
              <span className="text-xs font-medium text-red-900">Padam semua rekod?</span>
              <button
                type="button"
                onClick={async () => {
                  await onResetAll();
                  setConfirmReset(false);
                }}
                className="rounded bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
              >
                Ya, Padam
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Jumlah Penyertaan</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.totalPlays}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Purata Markah Kelas</p>
          <p className="mt-2 font-mono text-2xl font-bold text-teal-800 tabular-nums">
            {summaryStats.avgScore}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Purata Ketepatan</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryStats.avgAccuracy}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Penamat Tahap 3 (Lanjutan)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {summaryStats.level3Count}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Mistake Analysis */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Simpulan Bahasa Perlu Pengukuhan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Senarai ungkapan yang paling kerap tersalah padan oleh pelajar semasa aktiviti kelas.
          </p>

          {trickyIdioms.length === 0 ? (
            <div className="mt-6 rounded-lg border border-slate-200/80 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-600">
                Belum ada rekod kesilapan dikesan. Apabila pelajar mula bermain, analisis kesukaran setiap simpulan bahasa akan dipaparkan di sini.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {trickyIdioms.map(({ item, mistakes, attempts }) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.ungkapan}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        · Tahap {item.level}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">{item.maksud}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-red-700 tabular-nums">
                      {mistakes} salah
                    </p>
                    {attempts > 0 && (
                      <p className="text-xs text-slate-500 tabular-nums">
                        daripada {attempts} cubaan
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Winner Entry */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Tambah Rekod Pemenang Manual
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Gunakan borang ini jika Cikgu Fedelish menjalankan kuiz lisan di papan putih dan mahu merekodkan markah pelajar.
          </p>

          <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="manual-name" className="block text-xs font-semibold text-slate-700">
                Nama Pelajar / Kumpulan
              </label>
              <input
                id="manual-name"
                type="text"
                required
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Contoh: Nur Aina / Kumpulan Kenanga"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="manual-team" className="block text-xs font-semibold text-slate-700">
                  Kelas / Kumpulan
                </label>
                <input
                  id="manual-team"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label htmlFor="manual-level" className="block text-xs font-semibold text-slate-700">
                  Tahap Permainan
                </label>
                <select
                  id="manual-level"
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as LevelNumber)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value={1}>Tahap 1 · {LEVEL_CONFIGS[1].title}</option>
                  <option value={2}>Tahap 2 · {LEVEL_CONFIGS[2].title}</option>
                  <option value={3}>Tahap 3 · {LEVEL_CONFIGS[3].title}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="manual-score" className="block text-xs font-semibold text-slate-700">
                  Markah
                </label>
                <input
                  id="manual-score"
                  type="number"
                  min={0}
                  max={5000}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
              <div>
                <label htmlFor="manual-accuracy" className="block text-xs font-semibold text-slate-700">
                  Ketepatan (%)
                </label>
                <input
                  id="manual-accuracy"
                  type="number"
                  min={0}
                  max={100}
                  value={accuracy}
                  onChange={(e) => setAccuracy(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            {feedbackMsg && (
              <p className="text-xs font-medium text-teal-800">{feedbackMsg}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !playerName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Simpan Rekod Pemenang
            </button>
          </form>
        </div>
      </div>

      {/* Manage existing records */}
      {winners.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Urus Rekod Individu
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {winners.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-900">{w.playerName}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {w.teamName} · Tahap {w.level} · {w.score} markah
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteWinner(w.id)}
                  aria-label={`Padam rekod ${w.playerName}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Padam
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
