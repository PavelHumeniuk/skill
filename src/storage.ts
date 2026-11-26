import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { isDayStr, type DayStr } from './dates';
import {
  TOTAL_CELLS,
  applyDecay,
  cleanDescription,
  cleanName,
  createSkill,
  fill,
  removeCell,
  undoToday,
  type HistoryEntry,
  type HistoryReason,
  type Skill,
} from './model';
import { t } from './strings';

export const STORAGE_KEY = 'skill-app:v1';

type Stored = { version: 1; skills: Skill[] };

const REASONS: ReadonlySet<string> = new Set<HistoryReason>(['fill', 'undo', 'decay', 'manual']);

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (!isObject(v)) return false;
  return (
    isDayStr(v.date) &&
    typeof v.delta === 'number' &&
    Number.isInteger(v.delta) &&
    typeof v.reason === 'string' &&
    REASONS.has(v.reason) &&
    (v.prevAnchor === undefined || isDayStr(v.prevAnchor)) &&
    (v.prevLastFilled === undefined || v.prevLastFilled === null || isDayStr(v.prevLastFilled))
  );
}

function isSkill(v: unknown): v is Skill {
  if (!isObject(v)) return false;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    isDayStr(v.createdAt) &&
    typeof v.cells === 'number' &&
    Number.isInteger(v.cells) &&
    v.cells >= 0 &&
    (v.lastFilled === null || isDayStr(v.lastFilled)) &&
    isDayStr(v.decayAnchor) &&
    Array.isArray(v.history) &&
    v.history.every(isHistoryEntry)
  );
}

/** Copy only known fields, so stray keys in a file never reach app state. */
function normalize(s: Skill): Skill {
  return {
    id: s.id,
    name: cleanName(s.name) || 'Untitled',
    description: cleanDescription(s.description),
    createdAt: s.createdAt,
    cells: Math.min(s.cells, TOTAL_CELLS),
    lastFilled: s.lastFilled,
    decayAnchor: s.decayAnchor,
    history: s.history.map((h) => {
      const e: HistoryEntry = { date: h.date, delta: h.delta, reason: h.reason };
      if (h.prevAnchor !== undefined) e.prevAnchor = h.prevAnchor;
      if (h.prevLastFilled !== undefined) e.prevLastFilled = h.prevLastFilled;
      return e;
    }),
  };
}

/** Validate and normalize stored or imported data. Throws with a readable message. */
export function parseData(raw: unknown): Skill[] {
  if (!isObject(raw)) throw new Error('Not a valid backup file');
  if (raw.version !== 1 || !Array.isArray(raw.skills)) {
    throw new Error('Unsupported backup format');
  }
  const bad = raw.skills.findIndex((s) => !isSkill(s));
  if (bad !== -1) throw new Error(`Skill #${bad + 1} is malformed`);
  const skills = raw.skills as Skill[];
  const ids = new Set<string>();
  for (const s of skills) {
    if (ids.has(s.id)) throw new Error(`Duplicate skill id "${s.id}"`);
    ids.add(s.id);
  }
  return skills.map(normalize);
}

export function exportJson(skills: Skill[]): string {
  return JSON.stringify({ version: 1, skills } satisfies Stored, null, 2);
}

function serialize(skills: Skill[]): string {
  return JSON.stringify({ version: 1, skills } satisfies Stored);
}

export type LoadResult = {
  skills: Skill[];
  error: string | null;
  /** True when writing would destroy data we couldn't back up, or storage is unusable. */
  blockSave: boolean;
};

/**
 * Read saved skills. Unreadable data is never silently dropped: it is copied
 * to a backup key first, and if that fails, saving is disabled for the session.
 */
export function load(storage: Storage = localStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { skills: [], error: t.storageUnavailable, blockSave: true };
  }
  if (!raw) return { skills: [], error: null, blockSave: false };
  try {
    return { skills: parseData(JSON.parse(raw)), error: null, blockSave: false };
  } catch {
    const backupKey = `${STORAGE_KEY}:unreadable-${Date.now()}`;
    try {
      storage.setItem(backupKey, raw);
      return { skills: [], error: t.dataUnreadable(backupKey), blockSave: false };
    } catch {
      return { skills: [], error: t.dataUnreadableNoBackup, blockSave: true };
    }
  }
}

// StrictMode runs state initializers twice in dev; loading once avoids making two backups.
let firstLoad: LoadResult | null = null;
function loadOnce(): LoadResult {
  return (firstLoad ??= load());
}

type Action =
  | { type: 'decay'; today: DayStr }
  | { type: 'add'; name: string; description: string; level: number; today: DayStr }
  | { type: 'update'; id: string; patch: Partial<Pick<Skill, 'name' | 'description'>> }
  | { type: 'fill'; id: string; today: DayStr }
  | { type: 'undo'; id: string; today: DayStr }
  | { type: 'removeCell'; id: string; today: DayStr }
  | { type: 'delete'; id: string }
  | { type: 'replace'; skills: Skill[]; today: DayStr };

function mapOne(skills: Skill[], id: string, fn: (s: Skill) => Skill): Skill[] {
  return skills.map((s) => (s.id === id ? fn(s) : s));
}

function reducer(skills: Skill[], a: Action): Skill[] {
  switch (a.type) {
    case 'decay': {
      const next = skills.map((s) => applyDecay(s, a.today));
      return next.some((s, i) => s !== skills[i]) ? next : skills;
    }
    case 'add':
      return [...skills, createSkill(a.name, a.description, a.level, a.today)];
    case 'update':
      return mapOne(skills, a.id, (s) => ({
        ...s,
        ...(a.patch.name !== undefined && cleanName(a.patch.name) ? { name: cleanName(a.patch.name) } : {}),
        ...(a.patch.description !== undefined
          ? { description: cleanDescription(a.patch.description) }
          : {}),
      }));
    case 'fill':
      return mapOne(skills, a.id, (s) => fill(s, a.today));
    case 'undo':
      return mapOne(skills, a.id, (s) => undoToday(s, a.today));
    case 'removeCell':
      return mapOne(skills, a.id, (s) => removeCell(s, a.today));
    case 'delete':
      return skills.filter((s) => s.id !== a.id);
    case 'replace':
      return a.skills.map((s) => applyDecay(s, a.today));
  }
}

/**
 * @param today    the day currently shown in the UI
 * @param getToday reads the clock now, so an action right after midnight lands on the right day
 */
export function useSkills(today: DayStr, getToday: () => DayStr) {
  const [initial] = useState(loadOnce);
  const [skills, dispatch] = useReducer(reducer, initial.skills, (list) =>
    list.map((s) => applyDecay(s, today)),
  );
  const [error, setError] = useState<string | null>(initial.error);
  const blockSave = useRef(initial.blockSave);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (blockSave.current) return;
    const json = serialize(skills);
    if (json === lastSaved.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, json);
      lastSaved.current = json;
      setError((e) => (e === t.saveFailed ? null : e));
    } catch {
      setError(t.saveFailed);
    }
  }, [skills]);

  useEffect(() => dispatch({ type: 'decay', today }), [today]);

  // Keep tabs in sync if the app is open twice.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        const next = parseData(JSON.parse(e.newValue));
        lastSaved.current = e.newValue;
        dispatch({ type: 'replace', skills: next, today: getToday() });
      } catch {
        // Another tab wrote something we can't read; keep our state.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [getToday]);

  const actions = {
    add: useCallback(
      (name: string, description: string, level: number) =>
        dispatch({ type: 'add', name, description, level, today: getToday() }),
      [getToday],
    ),
    update: useCallback(
      (id: string, patch: Partial<Pick<Skill, 'name' | 'description'>>) =>
        dispatch({ type: 'update', id, patch }),
      [],
    ),
    fill: useCallback((id: string) => dispatch({ type: 'fill', id, today: getToday() }), [getToday]),
    undo: useCallback((id: string) => dispatch({ type: 'undo', id, today: getToday() }), [getToday]),
    removeCell: useCallback(
      (id: string) => dispatch({ type: 'removeCell', id, today: getToday() }),
      [getToday],
    ),
    remove: useCallback((id: string) => dispatch({ type: 'delete', id }), []),
    replaceAll: useCallback(
      (next: Skill[]) => dispatch({ type: 'replace', skills: next, today: getToday() }),
      [getToday],
    ),
  };

  return {
    skills,
    actions,
    error,
    // While saving is off, the warning must stay visible: changes would be lost on reload.
    canDismissError: !blockSave.current,
    dismissError: useCallback(() => setError(null), []),
  };
}

export type SkillActions = ReturnType<typeof useSkills>['actions'];
