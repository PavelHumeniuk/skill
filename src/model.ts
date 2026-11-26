import { addDays, daysBetween, type DayStr } from './dates';

/** Cells needed to complete each level. Index = level. */
export const THRESHOLDS = [1, 2, 3, 5, 8, 13, 21] as const;
export const MAX_LEVEL = THRESHOLDS.length; // 7 = Master
export const TOTAL_CELLS = THRESHOLDS.reduce((a, b) => a + b, 0); // 53
export const DECAY_DAYS = 30;
export const NAME_MAX = 60;
export const DESC_MAX = 2000;

export function cleanName(name: string): string {
  return name.trim().slice(0, NAME_MAX);
}

export function cleanDescription(text: string): string {
  return text.trim().slice(0, DESC_MAX);
}

export type HistoryReason = 'fill' | 'undo' | 'decay' | 'manual';

export type HistoryEntry = {
  date: DayStr;
  delta: number;
  reason: HistoryReason;
  /** For 'fill': state before the fill, so it can be undone exactly. */
  prevAnchor?: DayStr;
  prevLastFilled?: DayStr | null;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  createdAt: DayStr;
  cells: number;
  lastFilled: DayStr | null;
  decayAnchor: DayStr;
  history: HistoryEntry[];
};

export type LevelInfo = {
  level: number;
  filledInLevel: number;
  levelSize: number;
  isMaster: boolean;
};

/** Total cells required to reach the start of `level`. */
export function cellsForLevel(level: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(level, MAX_LEVEL); i++) sum += THRESHOLDS[i];
  return sum;
}

export function levelInfo(cells: number): LevelInfo {
  let remaining = Math.max(0, cells);
  for (let level = 0; level < MAX_LEVEL; level++) {
    const size = THRESHOLDS[level];
    if (remaining < size) {
      return { level, filledInLevel: remaining, levelSize: size, isMaster: false };
    }
    remaining -= size;
  }
  return { level: MAX_LEVEL, filledInLevel: 0, levelSize: 0, isMaster: true };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createSkill(
  name: string,
  description: string,
  startLevel: number,
  today: DayStr,
  id: string = newId(),
): Skill {
  const level = Math.max(0, Math.min(MAX_LEVEL, Math.floor(startLevel)));
  return {
    id,
    name: cleanName(name),
    description: cleanDescription(description),
    createdAt: today,
    cells: cellsForLevel(level),
    lastFilled: null,
    decayAnchor: today,
    history: [],
  };
}

export function filledToday(skill: Skill, today: DayStr): boolean {
  return skill.lastFilled === today;
}

export function canFillToday(skill: Skill, today: DayStr): boolean {
  return !filledToday(skill, today);
}

/** Mark today's practice. At Master level the cell count stays capped but activity still counts. */
export function fill(skill: Skill, today: DayStr): Skill {
  if (!canFillToday(skill, today)) return skill;
  const delta = skill.cells < TOTAL_CELLS ? 1 : 0;
  return {
    ...skill,
    cells: skill.cells + delta,
    lastFilled: today,
    decayAnchor: today,
    history: [
      ...skill.history,
      {
        date: today,
        delta,
        reason: 'fill',
        prevAnchor: skill.decayAnchor,
        prevLastFilled: skill.lastFilled,
      },
    ],
  };
}

/** Undo today's fill, restoring the state before it. */
export function undoToday(skill: Skill, today: DayStr): Skill {
  if (!filledToday(skill, today)) return skill;
  let idx = -1;
  for (let i = skill.history.length - 1; i >= 0; i--) {
    const h = skill.history[i];
    if (h.reason === 'fill' && h.date === today) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return skill;
  const entry = skill.history[idx];
  // Drop the fill entry instead of logging an 'undo', so fill/undo spam can't grow history.
  // ('undo' entries may still exist in older saved data and are handled by streak().)
  return {
    ...skill,
    cells: Math.max(0, skill.cells - entry.delta),
    lastFilled: entry.prevLastFilled ?? null,
    decayAnchor: entry.prevAnchor ?? skill.decayAnchor,
    history: skill.history.filter((_, i) => i !== idx),
  };
}

/** Manually remove one cell (e.g. a mistake on an earlier day). */
export function removeCell(skill: Skill, today: DayStr): Skill {
  if (skill.cells <= 0) return skill;
  return {
    ...skill,
    cells: skill.cells - 1,
    history: [...skill.history, { date: today, delta: -1, reason: 'manual' }],
  };
}

/** Lose one cell for every full DECAY_DAYS period without practice. */
export function applyDecay(skill: Skill, today: DayStr): Skill {
  const elapsed = daysBetween(skill.decayAnchor, today);
  const periods = Math.floor(elapsed / DECAY_DAYS);
  if (periods <= 0) return skill;

  let cells = skill.cells;
  const history = [...skill.history];
  for (let i = 1; i <= periods; i++) {
    if (cells <= 0) break;
    cells -= 1;
    history.push({ date: addDays(skill.decayAnchor, i * DECAY_DAYS), delta: -1, reason: 'decay' });
  }
  return {
    ...skill,
    cells,
    history,
    decayAnchor: addDays(skill.decayAnchor, periods * DECAY_DAYS),
  };
}

/** Days left until the next cell is lost (assumes decay already applied). */
export function daysUntilDecay(skill: Skill, today: DayStr): number {
  return Math.max(0, DECAY_DAYS - daysBetween(skill.decayAnchor, today));
}

/** Current consecutive-day streak, ending today or yesterday. */
export function streak(skill: Skill, today: DayStr): number {
  const filled = new Set<string>();
  // Replay fills and undos in order to know which days are effectively filled.
  for (const h of skill.history) {
    if (h.reason === 'fill') filled.add(h.date);
    else if (h.reason === 'undo') filled.delete(h.date);
  }
  let day = filled.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (filled.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export const LEVEL_NAMES = [
  'Curious',
  'Beginner',
  'Apprentice',
  'Practitioner',
  'Skilled',
  'Advanced',
  'Expert',
  'Master',
] as const;
