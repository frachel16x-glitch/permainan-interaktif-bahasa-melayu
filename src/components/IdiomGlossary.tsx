import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SIMPULAN_BAHASA_BANK } from '../data/simpulanBahasa';
import { LevelNumber } from '../types';

export function IdiomGlossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'all' | LevelNumber>('all');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SIMPULAN_BAHASA_BANK.filter((item) => {
      const levelMatch = selectedLevel === 'all' || item.level === selectedLevel;
      const queryMatch =
        !q ||
        item.ungkapan.toLowerCase().includes(q) ||
        item.maksud.toLowerCase().includes(q) ||
        item.contohAyat.toLowerCase().includes(q);
      return levelMatch && queryMatch;
    });
  }, [searchQuery, selectedLevel]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-teal-800">
            Rujukan Tingkatan 5 UUM · 30 Ungkapan Terpilih
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Nota Simpulan Bahasa
          </h1>
          <p className="mt-2 text-base text-slate-600 leading-relaxed">
            Senarai lengkap simpulan bahasa berserta maksud, petunjuk ingatan, dan contoh ayat
            untuk ulang kaji pantas sebelum atau selepas permainan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari simpulan bahasa..."
              className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <div
            role="group"
            aria-label="Tapis mengikut tahap"
            className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1"
          >
            {(
              [
                { value: 'all', label: 'Semua' },
                { value: 1, label: 'Tahap 1' },
                { value: 2, label: 'Tahap 2' },
                { value: 3, label: 'Tahap 3' },
              ] as const
            ).map((tab) => (
              <button
                key={String(tab.value)}
                type="button"
                onClick={() => setSelectedLevel(tab.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedLevel === tab.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            Tiada simpulan bahasa ditemui
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Cuba kata kunci lain atau pilih paparan semua tahap.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Tahap {item.level} <span aria-hidden="true">·</span> {item.kategori}
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
                  {item.ungkapan}
                </h2>
                <p className="mt-2 text-sm font-medium text-teal-900 leading-relaxed">
                  {item.maksud}
                </p>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Petunjuk: {item.petunjuk}
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-700">Contoh Ayat</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  {item.contohAyat}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
