import { AppSection } from '../types';

interface HeaderProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onQuickStart: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'permainan', label: 'Permainan' },
  { id: 'nota', label: 'Nota Bahasa' },
  { id: 'pemenang', label: 'Data Pemenang' },
  { id: 'guru', label: 'Panel Guru' },
];

export function Header({ activeSection, onNavigate, onQuickStart }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-[#FAF8F4]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('permainan')}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          Jejak Simpulan
        </button>

        <nav aria-label="Navigasi utama" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'text-teal-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-1 h-0.5 bg-teal-700 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onQuickStart}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Mula Main
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <nav
        aria-label="Navigasi mudah alih"
        className="flex md:hidden items-center justify-between gap-2 border-t border-slate-200/80 px-4 py-2 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-teal-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
