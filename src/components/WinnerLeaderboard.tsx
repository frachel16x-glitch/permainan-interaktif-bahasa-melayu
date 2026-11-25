import { useMemo, useState } from 'react';
import { Download, Search, Trophy } from 'lucide-react';
import { LevelNumber, WinnerRecord } from '../types';

interface WinnerLeaderboardProps {
  winners: WinnerRecord[];
  isLoading: boolean;
  onStartPlaying: () => void;
}

const EMBLEM_IMG = '/src/assets/images/emblem_jaguh_bahasa_1795571757443.jpg';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WinnerLeaderboard({
  winners,
  isLoading,
  onStartPlaying,
}: WinnerLeaderboardProps) {
  const [levelFilter, setLevelFilter] = useState<'all' | LevelNumber>('all');
  const [searchName, setSearchName] = useState('');
  const [emblemError, setEmblemError] = useState(false);

  const filteredWinners = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    return winners
      .filter((w) => {
        const matchLevel = levelFilter === 'all' || w.level === levelFilter;
        const matchName =
          !q ||
          w.playerName.toLowerCase().includes(q) ||
          w.teamName.toLowerCase().includes(q);
        return matchLevel && matchName;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return a.durationSeconds - b.durationSeconds;
      });
  }, [winners, levelFilter, searchName]);

  const topThree = filteredWinners.slice(0, 3);

  const handleExportCsv = () => {
    if (filteredWinners.length === 0) return;
    const headers = [
      'Kedudukan',
      'Nama Pelajar',
      'Kumpulan',
      'Tahap',
      'Gelaran Tahap',
      'Markah',
      'Ketepatan (%)',
      'Kombo Tertinggi',
      'Masa (Saat)',
      'Pangkat',
      'Tarikh',
    ];
    const rows = filteredWinners.map((w, idx) => [
      idx + 1,
      `"${w.playerName.replace(/"/g, '""')}"`,
      `"${w.teamName.replace(/"/g, '""')}"`,
      w.level,
      `"${w.levelTitle.replace(/"/g, '""')}"`,
      w.score,
      w.accuracy,
      w.maxCombo,
      w.durationSeconds,
      `"${w.badge.replace(/"/g, '""')}"`,
      `"${formatDate(w.createdAt)}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-pemenang-5uum-tahap-${levelFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-teal-800">
            Rekod Pencapaian Kelas · Tingkatan 5 UUM
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Data Level Pemenang
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Kedudukan markah tertinggi pelajar mengikut tahap permainan, ketepatan padanan, dan kepantasan masa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Tapis pemenang mengikut tahap"
            className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1"
          >
            {(
              [
                { value: 'all', label: 'Semua Tahap' },
                { value: 1, label: 'Tahap 1' },
                { value: 2, label: 'Tahap 2' },
                { value: 3, label: 'Tahap 3' },
              ] as const
            ).map((tab) => (
              <button
                key={String(tab.value)}
                type="button"
                onClick={() => setLevelFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  levelFilter === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredWinners.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Muat Turun CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">Memuatkan rekod pemenang kelas 5 UUM...</p>
        </div>
      ) : filteredWinners.length === 0 ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            Belum ada rekod pemenang untuk paparan ini
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Ajak pelajar Tingkatan 5 UUM melengkapkan mana-mana tahap permainan untuk merekodkan nama mereka di podium.
          </p>
          <button
            type="button"
            onClick={onStartPlaying}
            className="mt-6 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 cursor-pointer"
          >
            Mula Permainan Sekarang
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {topThree.map((winner, index) => {
              const rankLabels = ['01. Juara', '02. Naib Juara', '03. Tempat Ketiga'];
              const isFirst = index === 0;
              return (
                <div
                  key={winner.id}
                  className={`flex flex-col justify-between rounded-xl border p-6 ${
                    isFirst
                      ? 'border-teal-800 bg-[#0D3B36] text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          isFirst ? 'text-amber-300' : 'text-teal-800'
                        }`}
                      >
                        {rankLabels[index]}
                      </p>
                      <h2 className="mt-1.5 font-display text-2xl font-bold truncate max-w-[210px]">
                        {winner.playerName}
                      </h2>
                      <p
                        className={`mt-1 text-xs ${
                          isFirst ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        {winner.teamName} <span aria-hidden="true">·</span> Tahap {winner.level} ({winner.levelTitle})
                      </p>
                    </div>

                    {isFirst && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-amber-300/40 bg-teal-950">
                        {!emblemError ? (
                          <img
                            src={EMBLEM_IMG}
                            alt="Lencana Juara Bahasa 5 UUM"
                            referrerPolicy="no-referrer"
                            onError={() => setEmblemError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-amber-300">
                            <Trophy className="h-6 w-6" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`mt-6 grid grid-cols-3 gap-3 border-t pt-4 ${
                      isFirst ? 'border-white/15' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <p className={`text-xs ${isFirst ? 'text-teal-200' : 'text-slate-500'}`}>
                        Markah
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                        {winner.score}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${isFirst ? 'text-teal-200' : 'text-slate-500'}`}>
                        Ketepatan
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                        {winner.accuracy}%
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${isFirst ? 'text-teal-200' : 'text-slate-500'}`}>
                        Masa
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                        {formatDuration(winner.durationSeconds)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search and Full Table */}
          <div className="mt-10 rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Senarai Penuh Pemenang & Peserta
                </h2>
                <p className="text-xs text-slate-500">
                  Menunjukkan {filteredWinners.length} rekod mengikut susunan markah tertinggi
                </p>
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Cari nama pelajar atau kumpulan..."
                  className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3.5">Ked.</th>
                    <th className="px-5 py-3.5">Nama Pelajar / Kumpulan</th>
                    <th className="px-5 py-3.5">Tahap Permainan</th>
                    <th className="px-5 py-3.5 text-right">Markah</th>
                    <th className="px-5 py-3.5 text-right">Ketepatan</th>
                    <th className="px-5 py-3.5 text-right">Kombo</th>
                    <th className="px-5 py-3.5 text-right">Masa</th>
                    <th className="px-5 py-3.5">Pangkat</th>
                    <th className="px-5 py-3.5">Tarikh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWinners.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-500 tabular-nums">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{w.playerName}</p>
                        <p className="text-xs text-slate-500">{w.teamName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        Tahap {w.level} · {w.levelTitle}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-teal-900 tabular-nums">
                        {w.score}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                        {w.accuracy}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                        x{w.maxCombo}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                        {formatDuration(w.durationSeconds)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {w.badge}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(w.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
