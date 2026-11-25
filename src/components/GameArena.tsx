import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GripVertical,
  Lightbulb,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  DISTRACTOR_MEANINGS,
  LEVEL_CONFIGS,
  SIMPULAN_BAHASA_BANK,
} from '../data/simpulanBahasa';
import { GameState, LevelNumber, SimpulanItem, WinnerRecord } from '../types';
import { soundEngine } from '../utils/sound';

interface MeaningCard {
  id: string;
  maksud: string;
  isDistractor: boolean;
  sourceItemId: string | null;
}

interface MatchFeedback {
  type: 'success' | 'error' | 'hint';
  title: string;
  detail: string;
}

interface GameArenaProps {
  resetTrigger: number;
  onSaveResult: (payload: {
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
  }) => Promise<WinnerRecord | null>;
  onOpenLeaderboard: () => void;
}

const HERO_IMG = '/src/assets/images/hero_pustaka_melayu_1795571757656.jpg';
const EMBLEM_IMG = '/src/assets/images/emblem_jaguh_bahasa_1795571757443.jpg';

const TEAM_OPTIONS = [
  'Individu · 5 UUM',
  'Kumpulan Merbau',
  'Kumpulan Cempaka',
  'Kumpulan Kenanga',
  'Kumpulan Angsana',
];

function shuffleArray<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeBadge(accuracy: number): string {
  if (accuracy >= 90) return 'Jaguh Emas';
  if (accuracy >= 75) return 'Pencabar Perak';
  return 'Harapan Gangsa';
}

export function GameArena({
  resetTrigger,
  onSaveResult,
  onOpenLeaderboard,
}: GameArenaProps) {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState(TEAM_OPTIONS[0]);
  const [selectedLevel, setSelectedLevel] = useState<LevelNumber>(1);
  const [nameError, setNameError] = useState('');
  const [muted, setMuted] = useState(false);

  const [heroImgError, setHeroImgError] = useState(false);
  const [emblemImgError, setEmblemImgError] = useState(false);

  // Active round state
  const [roundItems, setRoundItems] = useState<SimpulanItem[]>([]);
  const [meaningCards, setMeaningCards] = useState<MeaningCard[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [selectedIdiomId, setSelectedIdiomId] = useState<string | null>(null);
  const [selectedMeaningId, setSelectedMeaningId] = useState<string | null>(null);
  const [draggedIdiomId, setDraggedIdiomId] = useState<string | null>(null);
  const [dragOverMeaningId, setDragOverMeaningId] = useState<string | null>(null);
  const [shakePair, setShakePair] = useState<{ idiomId: string; meaningId: string } | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(1);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedback, setFeedback] = useState<MatchFeedback | null>(null);

  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<string[]>([]);

  // Bonus quiz state (Level 3)
  const [bonusQuestions, setBonusQuestions] = useState<
    { item: SimpulanItem; choices: SimpulanItem[] }[]
  >([]);
  const [bonusIndex, setBonusIndex] = useState(0);
  const [bonusScoreEarned, setBonusScoreEarned] = useState(0);
  const [bonusChoiceFeedback, setBonusChoiceFeedback] = useState<{
    chosenId: string;
    correct: boolean;
  } | null>(null);

  // Summary breakdown
  const [summaryData, setSummaryData] = useState<{
    baseScore: number;
    speedBonus: number;
    bonusQuizScore: number;
    finalScore: number;
    accuracy: number;
    badge: string;
    saved: boolean;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Return to title menu if header "Mula Main" clicked while not on menu
  useEffect(() => {
    if (resetTrigger > 0) {
      setGameState('TITLE_MENU');
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 60);
    }
  }, [resetTrigger]);

  // Game clock while actively playing or in bonus quiz
  useEffect(() => {
    if (gameState === 'PLAYING' || gameState === 'BONUS_QUIZ') {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.muted = next;
  };

  const levelConfig = LEVEL_CONFIGS[selectedLevel];

  const startRound = useCallback(
    (levelToStart: LevelNumber, overrideName?: string) => {
      const activeName = (overrideName ?? playerName).trim();
      if (!activeName) {
        setNameError('Sila masukkan nama pelajar atau nama kumpulan terlebih dahulu.');
        nameInputRef.current?.focus();
        return;
      }
      setNameError('');

      const config = LEVEL_CONFIGS[levelToStart];
      const pool = SIMPULAN_BAHASA_BANK.filter((item) => item.level === levelToStart);
      const chosenItems = shuffleArray(pool).slice(0, config.pairCount);

      const trueMeanings: MeaningCard[] = chosenItems.map((item) => ({
        id: `m-${item.id}`,
        maksud: item.maksud,
        isDistractor: false,
        sourceItemId: item.id,
      }));

      const distractorsPool = DISTRACTOR_MEANINGS.filter((d) => d.level >= levelToStart);
      const chosenDistractors: MeaningCard[] = shuffleArray(distractorsPool)
        .slice(0, config.distractorCount)
        .map((d) => ({
          id: `d-${d.id}`,
          maksud: d.maksud,
          isDistractor: true,
          sourceItemId: null,
        }));

      setSelectedLevel(levelToStart);
      setRoundItems(chosenItems);
      setMeaningCards(shuffleArray([...trueMeanings, ...chosenDistractors]));
      setMatchedIds([]);
      setSelectedIdiomId(null);
      setSelectedMeaningId(null);
      setDraggedIdiomId(null);
      setDragOverMeaningId(null);
      setShakePair(null);
      setScore(0);
      setCombo(0);
      setMaxCombo(1);
      setTotalAttempts(0);
      setCorrectAttempts(0);
      setHintsUsed(0);
      setElapsedSeconds(0);
      setMistakeIds([]);
      setAttemptedIds([]);
      setBonusQuestions([]);
      setBonusIndex(0);
      setBonusScoreEarned(0);
      setBonusChoiceFeedback(null);
      setSummaryData(null);
      setFeedback({
        type: 'hint',
        title: `${config.subtitle} · ${config.title}`,
        detail: 'Klik atau seret kad Simpulan Bahasa ke kad Maksud yang sepadan.',
      });
      setGameState('PLAYING');
      soundEngine.playSelect();
    },
    [playerName]
  );

  const finalizeRound = useCallback(
    async (
      finalBaseScore: number,
      finalBonusQuiz: number,
      finalCorrect: number,
      finalTotal: number,
      finalMaxCombo: number,
      finalHints: number,
      finalElapsed: number,
      finalMistakes: string[],
      finalAttempted: string[]
    ) => {
      const config = LEVEL_CONFIGS[selectedLevel];
      const accuracy =
        finalTotal > 0 ? Math.min(100, Math.round((finalCorrect / finalTotal) * 100)) : 100;
      const targetTime = config.pairCount * 14;
      const speedBonus = Math.max(0, Math.min(120, (targetTime - finalElapsed) * 3));
      const totalScore = finalBaseScore + finalBonusQuiz + speedBonus;
      const badge = computeBadge(accuracy);

      soundEngine.playVictory();
      setGameState('ROUND_SUMMARY');

      const recordId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const saved = await onSaveResult({
        id: recordId,
        playerName: playerName.trim(),
        teamName,
        level: selectedLevel,
        levelTitle: config.title,
        score: totalScore,
        accuracy,
        maxCombo: finalMaxCombo,
        durationSeconds: Math.max(1, finalElapsed),
        hintsUsed: finalHints,
        badge,
        mistakeIds: finalMistakes,
        attemptedIds: finalAttempted,
      });

      setSummaryData({
        baseScore: finalBaseScore,
        speedBonus,
        bonusQuizScore: finalBonusQuiz,
        finalScore: totalScore,
        accuracy,
        badge,
        saved: Boolean(saved),
      });
    },
    [onSaveResult, playerName, selectedLevel, teamName]
  );

  const evaluateMatch = useCallback(
    (idiomId: string, meaningId: string) => {
      const idiomItem = roundItems.find((item) => item.id === idiomId);
      const meaningCard = meaningCards.find((m) => m.id === meaningId);
      if (!idiomItem || !meaningCard) return;
      if (matchedIds.includes(idiomId)) return;

      const nextTotal = totalAttempts + 1;
      const nextAttempted = attemptedIds.includes(idiomId)
        ? attemptedIds
        : [...attemptedIds, idiomId];
      setTotalAttempts(nextTotal);
      setAttemptedIds(nextAttempted);

      if (!meaningCard.isDistractor && meaningCard.sourceItemId === idiomId) {
        const nextCombo = combo + 1;
        const nextMaxCombo = Math.max(maxCombo, nextCombo);
        const comboBonus = nextCombo > 1 ? (nextCombo - 1) * 25 : 0;
        const gained = levelConfig.pointsPerMatch + comboBonus;
        const nextScore = score + gained;
        const nextMatched = [...matchedIds, idiomId];
        const nextCorrect = correctAttempts + 1;

        setScore(nextScore);
        setCombo(nextCombo);
        setMaxCombo(nextMaxCombo);
        setMatchedIds(nextMatched);
        setCorrectAttempts(nextCorrect);
        setSelectedIdiomId(null);
        setSelectedMeaningId(null);

        soundEngine.playMatch(nextCombo);
        setFeedback({
          type: 'success',
          title: `Tepat · +${gained} markah${nextCombo > 1 ? ` (Kombo x${nextCombo})` : ''}`,
          detail: `Contoh ayat: ${idiomItem.contohAyat}`,
        });

        // Check if level matching is complete
        if (nextMatched.length === roundItems.length) {
          if (levelConfig.hasBonusQuiz) {
            // Prepare 3 fill-in-the-blank bonus questions
            const quizItems = shuffleArray(roundItems).slice(0, 3);
            const built = quizItems.map((qItem) => {
              const others = shuffleArray(
                roundItems.filter((o) => o.id !== qItem.id)
              ).slice(0, 3);
              return {
                item: qItem,
                choices: shuffleArray([qItem, ...others]),
              };
            });
            setTimeout(() => {
              setBonusQuestions(built);
              setBonusIndex(0);
              setBonusScoreEarned(0);
              setGameState('BONUS_QUIZ');
            }, 650);
          } else {
            setTimeout(() => {
              void finalizeRound(
                nextScore,
                0,
                nextCorrect,
                nextTotal,
                nextMaxCombo,
                hintsUsed,
                elapsedSeconds,
                mistakeIds,
                nextAttempted
              );
            }, 650);
          }
        }
      } else {
        const nextScore = Math.max(0, score - levelConfig.penaltyPerWrong);
        const nextMistakes = [...mistakeIds, idiomId];
        setScore(nextScore);
        setCombo(0);
        setMistakeIds(nextMistakes);
        setSelectedIdiomId(null);
        setSelectedMeaningId(null);
        setShakePair({ idiomId, meaningId });
        setTimeout(() => setShakePair(null), 420);

        soundEngine.playMismatch();
        setFeedback({
          type: 'error',
          title: `Padanan kurang tepat · -${levelConfig.penaltyPerWrong} markah`,
          detail: meaningCard.isDistractor
            ? 'Kad maksud itu ialah pengecoh. Cuba teliti maksud sebenar simpulan bahasa.'
            : `Maksud tersebut bukan untuk "${idiomItem.ungkapan}". Gunakan butang Petunjuk jika perlukan bantuan.`,
        });
      }
    },
    [
      attemptedIds,
      combo,
      correctAttempts,
      elapsedSeconds,
      finalizeRound,
      hintsUsed,
      levelConfig,
      matchedIds,
      maxCombo,
      meaningCards,
      mistakeIds,
      roundItems,
      score,
      totalAttempts,
    ]
  );

  const handleIdiomClick = (id: string) => {
    if (matchedIds.includes(id)) return;
    soundEngine.playSelect();
    if (selectedMeaningId) {
      evaluateMatch(id, selectedMeaningId);
    } else {
      setSelectedIdiomId((prev) => (prev === id ? null : id));
    }
  };

  const handleMeaningClick = (meaningId: string) => {
    const card = meaningCards.find((m) => m.id === meaningId);
    if (!card) return;
    if (!card.isDistractor && card.sourceItemId && matchedIds.includes(card.sourceItemId)) {
      return;
    }
    soundEngine.playSelect();
    if (selectedIdiomId) {
      evaluateMatch(selectedIdiomId, meaningId);
    } else {
      setSelectedMeaningId((prev) => (prev === meaningId ? null : meaningId));
    }
  };

  const handleUseHint = () => {
    if (hintsUsed >= levelConfig.maxHints) return;
    const target =
      (selectedIdiomId && !matchedIds.includes(selectedIdiomId)
        ? roundItems.find((i) => i.id === selectedIdiomId)
        : null) || roundItems.find((i) => !matchedIds.includes(i.id));

    if (!target) return;
    setSelectedIdiomId(target.id);
    setHintsUsed((prev) => prev + 1);
    soundEngine.playSelect();
    setFeedback({
      type: 'hint',
      title: `Petunjuk · ${target.ungkapan}`,
      detail: target.petunjuk,
    });
  };

  const handleBonusAnswer = (chosenId: string) => {
    if (bonusChoiceFeedback) return;
    const currentQ = bonusQuestions[bonusIndex];
    if (!currentQ) return;

    const isCorrect = chosenId === currentQ.item.id;
    const nextBonus = bonusScoreEarned + (isCorrect ? 80 : 0);
    const nextTotal = totalAttempts + 1;
    const nextCorrect = correctAttempts + (isCorrect ? 1 : 0);
    const nextMistakes = isCorrect ? mistakeIds : [...mistakeIds, currentQ.item.id];

    setTotalAttempts(nextTotal);
    setCorrectAttempts(nextCorrect);
    setMistakeIds(nextMistakes);
    setBonusScoreEarned(nextBonus);
    setBonusChoiceFeedback({ chosenId, correct: isCorrect });

    if (isCorrect) {
      soundEngine.playMatch(2);
    } else {
      soundEngine.playMismatch();
    }

    setTimeout(() => {
      setBonusChoiceFeedback(null);
      if (bonusIndex + 1 < bonusQuestions.length) {
        setBonusIndex((prev) => prev + 1);
      } else {
        void finalizeRound(
          score,
          nextBonus,
          nextCorrect,
          nextTotal,
          maxCombo,
          hintsUsed,
          elapsedSeconds,
          nextMistakes,
          attemptedIds
        );
      }
    }, 950);
  };

  const handleStartSubmit = (e: FormEvent) => {
    e.preventDefault();
    startRound(selectedLevel);
  };

  const remainingHints = Math.max(0, levelConfig.maxHints - hintsUsed);

  // Check if a meaning card is already matched
  const matchedMeaningSourceIds = useMemo(() => new Set(matchedIds), [matchedIds]);

  // ---------------------------------------------------------------------------
  // 1. TITLE MENU VIEW
  // ---------------------------------------------------------------------------
  if (gameState === 'TITLE_MENU') {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Hero Setup Column */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 lg:col-span-7">
            <div>
              <p className="text-xs font-medium text-teal-800">
                Tingkatan 5 UUM <span aria-hidden="true">·</span> Bahasa Melayu{' '}
                <span aria-hidden="true">·</span> Cikgu Fedelish
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
                Padankan Simpulan Bahasa, Takluk Setiap Tahap
              </h1>
              <p className="mt-3 max-w-xl text-base text-slate-600 leading-relaxed">
                Permainan padanan interaktif untuk mengukuhkan penguasaan simpulan bahasa pelajar tahap sederhana. Kumpul markah kombo, guna petunjuk pantas, dan catat nama dalam rekod pemenang kelas.
              </p>

              <form onSubmit={handleStartSubmit} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="player-name"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nama Pelajar / Wakil Kumpulan
                    </label>
                    <input
                      ref={nameInputRef}
                      id="player-name"
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      placeholder="Contoh: Muhammad Adam"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    />
                    {nameError && (
                      <p className="mt-1.5 text-xs font-medium text-red-700">{nameError}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="team-select"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Mod / Kumpulan Kelas
                    </label>
                    <select
                      id="team-select"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    >
                      {TEAM_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700">
                    Pilih Tahap Permainan
                  </span>
                  <div
                    role="group"
                    aria-label="Pilih tahap permainan"
                    className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1.5"
                  >
                    {([1, 2, 3] as LevelNumber[]).map((lvl) => {
                      const cfg = LEVEL_CONFIGS[lvl];
                      const active = selectedLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedLevel(lvl)}
                          className={`rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span className="block text-xs font-bold whitespace-nowrap">
                            Tahap {lvl} · {cfg.difficultyLabel}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 truncate">
                            {cfg.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    {LEVEL_CONFIGS[selectedLevel].description}{' '}
                    <span className="font-medium text-slate-800">
                      ({LEVEL_CONFIGS[selectedLevel].pairCount} pasangan · +
                      {LEVEL_CONFIGS[selectedLevel].pointsPerMatch} markah asas)
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-900 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    Mula Permainan
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenLeaderboard}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                  >
                    <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    Lihat Data Pemenang
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Editorial Media Column */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-5">
            <div className="relative flex-1 min-h-[260px] bg-amber-50">
              {!heroImgError ? (
                <img
                  src={HERO_IMG}
                  alt="Ilustrasi pustaka Bahasa Melayu dengan penanda buku songket"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-900 to-teal-800 p-8 text-center text-white">
                  <BookOpen className="h-12 w-12 text-amber-300" aria-hidden="true" />
                  <p className="mt-3 font-display text-2xl font-bold">Pustaka 5 UUM</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 p-6">
              <p className="text-xs font-semibold text-teal-800">
                Cara Bermain Secara Aktif
              </p>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Pelajar boleh klik kad Simpulan Bahasa kemudian klik Maksud, atau seret dan lepas terus kad ke papan padanan. Markah kombo bertambah apabila padanan tepat berturut-turut.
              </p>
              <p className="mt-3 text-xs font-medium text-slate-500">
                30 Simpulan Bahasa <span aria-hidden="true">·</span> 3 Tahap Berperingkat{' '}
                <span aria-hidden="true">·</span> Rekod Pemenang Kelas
              </p>
            </div>
          </div>
        </div>

        {/* 3-Column Stage Overview Strip */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {([1, 2, 3] as LevelNumber[]).map((lvl) => {
            const cfg = LEVEL_CONFIGS[lvl];
            return (
              <div
                key={lvl}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Tahap {lvl} <span aria-hidden="true">·</span> {cfg.difficultyLabel}
                  </p>
                  <h2 className="mt-1.5 font-display text-xl font-bold text-slate-900">
                    {cfg.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {cfg.description}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {cfg.pairCount} pasang · +{cfg.pointsPerMatch} pts
                  </span>
                  <button
                    type="button"
                    onClick={() => startRound(lvl)}
                    className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Main Tahap {lvl}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ACTIVE MATCHING BOARD ('PLAYING')
  // ---------------------------------------------------------------------------
  if (gameState === 'PLAYING') {
    return (
      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        {/* Compact Top Game HUD */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {playerName} <span aria-hidden="true">·</span> {teamName}
            </p>
            <h1 className="font-display text-lg font-bold text-slate-900">
              {levelConfig.subtitle} · {levelConfig.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Padanan</span>
              <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                {matchedIds.length}/{roundItems.length}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Markah</span>
              <span className="font-mono text-base font-bold text-teal-800 tabular-nums">
                {score}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Kombo</span>
              <span className="font-mono text-base font-bold text-amber-700 tabular-nums">
                x{Math.max(1, combo)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Masa</span>
              <span className="font-mono text-base font-semibold text-slate-800 tabular-nums">
                {formatClock(elapsedSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseHint}
              disabled={remainingHints === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap cursor-pointer"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              Petunjuk ({remainingHints})
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Hidupkan bunyi' : 'Senyapkan bunyi'}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setGameState('TITLE_MENU')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Live Feedback & Example Sentence Strip */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-950'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            ) : feedback.type === 'error' ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            ) : (
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">{feedback.title}</p>
              <p className="mt-0.5 text-xs sm:text-sm opacity-90">{feedback.detail}</p>
            </div>
          </div>
        )}

        {/* Two-Column Matching Board */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Column A: Simpulan Bahasa */}
          <div className="lg:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                1. Pilih atau Seret Simpulan Bahasa
              </h2>
              <span className="text-xs text-slate-500">
                {roundItems.length - matchedIds.length} berbaki
              </span>
            </div>

            <div className="space-y-3">
              {roundItems.map((item) => {
                const isMatched = matchedIds.includes(item.id);
                const isSelected = selectedIdiomId === item.id;
                const isShaking = shakePair?.idiomId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    draggable={!isMatched}
                    onDragStart={(e) => {
                      if (isMatched) return;
                      setDraggedIdiomId(item.id);
                      setSelectedIdiomId(item.id);
                      e.dataTransfer.setData('text/plain', item.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedIdiomId(null);
                      setDragOverMeaningId(null);
                    }}
                    onClick={() => handleIdiomClick(item.id)}
                    className={`group flex w-full min-h-[64px] items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      isShaking ? 'animate-shake border-red-500 bg-red-50' : ''
                    } ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 cursor-default'
                        : isSelected
                        ? 'border-teal-800 bg-teal-800 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-teal-700/60 hover:bg-teal-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {!isMatched && (
                        <GripVertical
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-teal-200' : 'text-slate-400 group-hover:text-teal-700'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      {isMatched && (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-display text-lg font-bold tracking-tight">
                        {item.ungkapan}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        isMatched
                          ? 'text-emerald-700'
                          : isSelected
                          ? 'text-teal-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {isMatched ? 'Dipadankan' : isSelected ? 'Dipilih' : 'Pilih'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column B: Maksud Simpulan Bahasa */}
          <div className="lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                2. Padankan dengan Maksud yang Tepat
              </h2>
              {levelConfig.distractorCount > 0 && (
                <span className="text-xs text-slate-500">
                  Termasuk {levelConfig.distractorCount} kad pengecoh
                </span>
              )}
            </div>

            <div className="space-y-3">
              {meaningCards.map((card) => {
                const isMatched =
                  !card.isDistractor &&
                  card.sourceItemId !== null &&
                  matchedMeaningSourceIds.has(card.sourceItemId);
                const isSelected = selectedMeaningId === card.id;
                const isDragOver = dragOverMeaningId === card.id;
                const isShaking = shakePair?.meaningId === card.id;
                const matchedIdiom = isMatched
                  ? roundItems.find((i) => i.id === card.sourceItemId)
                  : null;

                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={isMatched}
                    onDragOver={(e) => {
                      if (isMatched) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverMeaningId !== card.id) {
                        setDragOverMeaningId(card.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverMeaningId === card.id) {
                        setDragOverMeaningId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverMeaningId(null);
                      const droppedId =
                        e.dataTransfer.getData('text/plain') || draggedIdiomId;
                      if (droppedId && !isMatched) {
                        evaluateMatch(droppedId, card.id);
                      }
                    }}
                    onClick={() => handleMeaningClick(card.id)}
                    className={`flex w-full min-h-[64px] items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      isShaking ? 'animate-shake border-red-500 bg-red-50' : ''
                    } ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 cursor-default'
                        : isDragOver
                        ? 'border-teal-700 bg-teal-50 ring-2 ring-teal-700/30'
                        : isSelected
                        ? 'border-teal-800 bg-teal-50 ring-2 ring-teal-800/30 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-teal-700/60 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-[15px] font-medium leading-snug">{card.maksud}</p>
                    {isMatched && matchedIdiom ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {matchedIdiom.ungkapan}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                        {isDragOver
                          ? 'Lepas di sini'
                          : isSelected
                          ? 'Dipilih'
                          : 'Padan di sini'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. BONUS QUIZ VIEW (LEVEL 3 CONTEXT SENTENCE CHALLENGE)
  // ---------------------------------------------------------------------------
  if (gameState === 'BONUS_QUIZ') {
    const currentQ = bonusQuestions[bonusIndex];
    if (!currentQ) return null;

    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold text-amber-700">
                Pusingan Bonus Tahap 3 · Konteks Ayat (+80 markah setiap soalan)
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                Soalan {bonusIndex + 1} daripada {bonusQuestions.length}
              </h1>
            </div>
            <div className="text-right">
              <span className="block text-xs text-slate-500">Markah Semasa</span>
              <span className="font-mono text-xl font-bold text-teal-800 tabular-nums">
                {score + bonusScoreEarned}
              </span>
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-slate-600">
            Pilih simpulan bahasa yang paling tepat untuk melengkapkan ayat di bawah:
          </p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-[#FAF8F4] p-5 font-display text-xl font-semibold text-slate-900 leading-relaxed">
            {currentQ.item.ayatKosong}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {currentQ.choices.map((choice) => {
              const isChosen = bonusChoiceFeedback?.chosenId === choice.id;
              const isRightAnswer = choice.id === currentQ.item.id;
              const showRight = Boolean(bonusChoiceFeedback) && isRightAnswer;
              const showWrong = isChosen && !bonusChoiceFeedback?.correct;

              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={Boolean(bonusChoiceFeedback)}
                  onClick={() => handleBonusAnswer(choice.id)}
                  className={`flex min-h-[56px] items-center justify-between rounded-xl border px-4 py-3.5 text-left font-display text-lg font-bold transition-colors cursor-pointer ${
                    showRight
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                      : showWrong
                      ? 'border-red-500 bg-red-50 text-red-950'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-teal-700 hover:bg-teal-50/40'
                  }`}
                >
                  <span>{choice.ungkapan}</span>
                  {showRight && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  )}
                  {showWrong && (
                    <XCircle className="h-5 w-5 text-red-700" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. ROUND SUMMARY VIEW
  // ---------------------------------------------------------------------------
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-teal-900/20 bg-teal-950">
              {!emblemImgError ? (
                <img
                  src={EMBLEM_IMG}
                  alt="Lencana Pencapaian Simpulan Bahasa"
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-amber-300">
                  <Trophy className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-800">
                Tahniah, {playerName} <span aria-hidden="true">·</span> {teamName}
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
                {summaryData?.badge || 'Selesai Tahap'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {levelConfig.subtitle} ({levelConfig.title}) berjaya dilengkapkan.
                {summaryData?.saved ? ' Rekod anda telah disimpan dalam Data Level Pemenang.' : ''}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="block text-xs font-medium text-slate-500">Jumlah Markah</span>
            <span className="font-mono text-4xl font-bold text-teal-800 tabular-nums">
              {summaryData?.finalScore ?? score}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-[#FAF8F4] p-4">
            <p className="text-xs text-slate-500">Markah Padanan</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {summaryData?.baseScore ?? score}
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF8F4] p-4">
            <p className="text-xs text-slate-500">Bonus Masa & Konteks</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              +{(summaryData?.speedBonus ?? 0) + (summaryData?.bonusQuizScore ?? 0)}
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF8F4] p-4">
            <p className="text-xs text-slate-500">Ketepatan</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {summaryData?.accuracy ?? 100}%
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF8F4] p-4">
            <p className="text-xs text-slate-500">Masa Diambil</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {formatClock(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {selectedLevel < 3 && (
            <button
              type="button"
              onClick={() => startRound((selectedLevel + 1) as LevelNumber)}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 whitespace-nowrap cursor-pointer"
            >
              Terus ke Tahap {selectedLevel + 1}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => startRound(selectedLevel)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Main Tahap Ini Semula
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Lihat Data Pemenang
          </button>
        </div>

        {/* Learning Recap */}
        <div className="mt-9 border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Semakan Pembelajaran Tahap Ini
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Ulang kaji maksud dan contoh ayat bagi setiap simpulan bahasa yang telah anda padankan.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {roundItems.map((item) => (
              <div key={item.id} className="py-3.5">
                <p className="font-display text-base font-bold text-slate-900">
                  {item.ungkapan}{' '}
                  <span className="font-sans text-sm font-medium text-teal-800">
                    — {item.maksud}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.contohAyat}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
