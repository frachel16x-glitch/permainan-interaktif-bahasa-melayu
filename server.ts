import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface WinnerRecord {
  id: string;
  playerName: string;
  teamName: string;
  level: 1 | 2 | 3;
  levelTitle: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  durationSeconds: number;
  hintsUsed: number;
  badge: string;
  createdAt: string;
}

interface ClassroomStore {
  winners: WinnerRecord[];
  idiomMistakes: Record<string, number>;
  idiomAttempts: Record<string, number>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'classroom_records.json');

function ensureStore(): ClassroomStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: ClassroomStore = {
        winners: [],
        idiomMistakes: {},
        idiomAttempts: {},
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ClassroomStore>;
    return {
      winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      idiomMistakes: parsed.idiomMistakes && typeof parsed.idiomMistakes === 'object' ? parsed.idiomMistakes : {},
      idiomAttempts: parsed.idiomAttempts && typeof parsed.idiomAttempts === 'object' ? parsed.idiomAttempts : {},
    };
  } catch {
    return { winners: [], idiomMistakes: {}, idiomAttempts: {} };
  }
}

function saveStore(store: ClassroomStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/winners', (_req, res) => {
    const store = ensureStore();
    const sorted = [...store.winners].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.durationSeconds - b.durationSeconds;
    });
    res.json({
      winners: sorted,
      idiomMistakes: store.idiomMistakes,
      idiomAttempts: store.idiomAttempts,
    });
  });

  app.post('/api/winners', (req, res) => {
    const body = req.body as {
      id?: string;
      playerName?: string;
      teamName?: string;
      level?: number;
      levelTitle?: string;
      score?: number;
      accuracy?: number;
      maxCombo?: number;
      durationSeconds?: number;
      hintsUsed?: number;
      badge?: string;
      mistakeIds?: string[];
      attemptedIds?: string[];
    };

    const playerName = typeof body.playerName === 'string' ? body.playerName.trim().slice(0, 60) : '';
    if (!playerName) {
      res.status(400).json({ error: 'Nama pelajar diperlukan.' });
      return;
    }

    const levelNum = body.level === 1 || body.level === 2 || body.level === 3 ? body.level : 1;
    const score = typeof body.score === 'number' && Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;
    const accuracy = typeof body.accuracy === 'number' && Number.isFinite(body.accuracy) ? Math.min(100, Math.max(0, Math.round(body.accuracy))) : 0;
    const maxCombo = typeof body.maxCombo === 'number' && Number.isFinite(body.maxCombo) ? Math.max(1, Math.round(body.maxCombo)) : 1;
    const durationSeconds = typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) ? Math.max(1, Math.round(body.durationSeconds)) : 1;
    const hintsUsed = typeof body.hintsUsed === 'number' && Number.isFinite(body.hintsUsed) ? Math.max(0, Math.round(body.hintsUsed)) : 0;

    const record: WinnerRecord = {
      id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerName,
      teamName: typeof body.teamName === 'string' && body.teamName.trim() ? body.teamName.trim().slice(0, 40) : '5 UUM',
      level: levelNum,
      levelTitle: typeof body.levelTitle === 'string' && body.levelTitle.trim() ? body.levelTitle.trim().slice(0, 50) : `Tahap ${levelNum}`,
      score,
      accuracy,
      maxCombo,
      durationSeconds,
      hintsUsed,
      badge: typeof body.badge === 'string' && body.badge.trim() ? body.badge.trim().slice(0, 40) : 'Peserta Aktif',
      createdAt: new Date().toISOString(),
    };

    const store = ensureStore();
    if (!store.winners.some((w) => w.id === record.id)) {
      store.winners.push(record);
    }

    if (Array.isArray(body.mistakeIds)) {
      for (const id of body.mistakeIds) {
        if (typeof id === 'string' && id.trim()) {
          store.idiomMistakes[id] = (store.idiomMistakes[id] || 0) + 1;
        }
      }
    }

    if (Array.isArray(body.attemptedIds)) {
      for (const id of body.attemptedIds) {
        if (typeof id === 'string' && id.trim()) {
          store.idiomAttempts[id] = (store.idiomAttempts[id] || 0) + 1;
        }
      }
    }

    saveStore(store);
    res.status(201).json({ record });
  });

  app.delete('/api/winners/:id', (req, res) => {
    const { id } = req.params;
    const store = ensureStore();
    const before = store.winners.length;
    store.winners = store.winners.filter((w) => w.id !== id);
    if (store.winners.length === before) {
      res.status(404).json({ error: 'Rekod tidak ditemui.' });
      return;
    }
    saveStore(store);
    res.json({ deleted: id });
  });

  app.delete('/api/winners', (_req, res) => {
    const empty: ClassroomStore = { winners: [], idiomMistakes: {}, idiomAttempts: {} };
    saveStore(empty);
    res.json({ cleared: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
