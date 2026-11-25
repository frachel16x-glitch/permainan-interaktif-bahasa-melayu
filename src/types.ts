export type LevelNumber = 1 | 2 | 3;

export type AppSection = 'permainan' | 'nota' | 'pemenang' | 'guru';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'BONUS_QUIZ' | 'ROUND_SUMMARY';

export interface SimpulanItem {
  id: string;
  ungkapan: string;
  maksud: string;
  petunjuk: string;
  contohAyat: string;
  ayatKosong: string;
  level: LevelNumber;
  kategori: 'Sikap & Perwatakan' | 'Kehidupan & Masyarakat' | 'Usaha & Kerjaya';
}

export interface LevelConfig {
  level: LevelNumber;
  title: string;
  subtitle: string;
  difficultyLabel: string;
  pairCount: number;
  distractorCount: number;
  pointsPerMatch: number;
  penaltyPerWrong: number;
  maxHints: number;
  hasBonusQuiz: boolean;
  description: string;
}

export interface WinnerRecord {
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
  createdAt: string;
}

export interface ClassroomAnalytics {
  winners: WinnerRecord[];
  idiomMistakes: Record<string, number>;
  idiomAttempts: Record<string, number>;
}
