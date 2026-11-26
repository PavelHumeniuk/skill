import { describe, expect, it } from 'vitest';
import { addDays, daysBetween } from './dates';
import {
  MAX_LEVEL,
  TOTAL_CELLS,
  applyDecay,
  cellsForLevel,
  createSkill,
  daysUntilDecay,
  fill,
  levelInfo,
  removeCell,
  streak,
  undoToday,
} from './model';
import { STORAGE_KEY, exportJson, load, parseData } from './storage';

const D = '2026-01-01';

describe('dates', () => {
  it('adds and diffs days across month and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-01-01', '2026-03-02')).toBe(60);
    expect(daysBetween('2026-03-02', '2026-01-01')).toBe(-60);
  });
});

describe('levelInfo', () => {
  it('follows 1,2,3,5,8,13,21', () => {
    expect(levelInfo(0)).toEqual({ level: 0, filledInLevel: 0, levelSize: 1, isMaster: false });
    expect(levelInfo(1)).toEqual({ level: 1, filledInLevel: 0, levelSize: 2, isMaster: false });
    expect(levelInfo(2)).toEqual({ level: 1, filledInLevel: 1, levelSize: 2, isMaster: false });
    expect(levelInfo(3)).toEqual({ level: 2, filledInLevel: 0, levelSize: 3, isMaster: false });
    expect(levelInfo(32)).toEqual({ level: 6, filledInLevel: 0, levelSize: 21, isMaster: false });
    expect(levelInfo(52)).toEqual({ level: 6, filledInLevel: 21 - 1, levelSize: 21, isMaster: false });
  });

  it('reaches Master at 53', () => {
    expect(TOTAL_CELLS).toBe(53);
    expect(levelInfo(53)).toMatchObject({ level: MAX_LEVEL, isMaster: true });
  });

  it('cellsForLevel is the inverse of levelInfo at level starts', () => {
    for (let l = 0; l <= MAX_LEVEL; l++) {
      expect(levelInfo(cellsForLevel(l)).level).toBe(l);
      expect(levelInfo(cellsForLevel(l)).filledInLevel).toBe(0);
    }
  });
});

describe('createSkill', () => {
  it('starts at the chosen level with an empty current level', () => {
    const s = createSkill(' Guitar ', '', 3, D);
    expect(s.name).toBe('Guitar');
    expect(s.cells).toBe(6);
    expect(levelInfo(s.cells)).toMatchObject({ level: 3, filledInLevel: 0 });
  });

  it('clamps level', () => {
    expect(createSkill('x', '', 99, D).cells).toBe(TOTAL_CELLS);
    expect(createSkill('x', '', -2, D).cells).toBe(0);
  });
});

describe('fill / undo', () => {
  it('fills once per day', () => {
    let s = createSkill('x', '', 0, D);
    s = fill(s, D);
    expect(s.cells).toBe(1);
    expect(fill(s, D)).toBe(s);
    s = fill(s, addDays(D, 1));
    expect(s.cells).toBe(2);
  });

  it('undo restores previous state and allows re-fill', () => {
    const start = createSkill('x', '', 0, D);
    const day2 = addDays(D, 5);
    const a = fill(start, D);
    const b = fill(a, day2);
    const c = undoToday(b, day2);
    expect(c.cells).toBe(a.cells);
    expect(c.lastFilled).toBe(D);
    expect(c.decayAnchor).toBe(D);
    expect(fill(c, day2).cells).toBe(b.cells);
  });

  it('undo does nothing when today is not filled', () => {
    const s = fill(createSkill('x', '', 0, D), D);
    expect(undoToday(s, addDays(D, 1))).toBe(s);
  });

  it('keeps cells capped at Master but still records activity', () => {
    let s = createSkill('x', '', MAX_LEVEL, D);
    s = fill(s, addDays(D, 10));
    expect(s.cells).toBe(TOTAL_CELLS);
    expect(s.decayAnchor).toBe(addDays(D, 10));
    s = undoToday(s, addDays(D, 10));
    expect(s.cells).toBe(TOTAL_CELLS);
  });

  it('removeCell never goes below zero', () => {
    const s = createSkill('x', '', 0, D);
    expect(removeCell(s, D)).toBe(s);
    expect(removeCell(fill(s, D), D).cells).toBe(0);
  });
});

describe('decay', () => {
  const base = createSkill('x', '', 4, D); // 11 cells

  it('nothing at 29 days', () => {
    expect(applyDecay(base, addDays(D, 29))).toBe(base);
    expect(daysUntilDecay(base, addDays(D, 29))).toBe(1);
  });

  it('one cell at 30 days, and drops the level', () => {
    const s = applyDecay(base, addDays(D, 30));
    expect(s.cells).toBe(10);
    expect(levelInfo(s.cells).level).toBe(3);
    expect(s.decayAnchor).toBe(addDays(D, 30));
    expect(daysUntilDecay(s, addDays(D, 30))).toBe(30);
  });

  it('two cells at 61 days, idempotent when re-applied', () => {
    const s = applyDecay(base, addDays(D, 61));
    expect(s.cells).toBe(9);
    expect(applyDecay(s, addDays(D, 61))).toBe(s);
    expect(daysUntilDecay(s, addDays(D, 61))).toBe(29);
  });

  it('bottoms out at zero', () => {
    const s = applyDecay(base, addDays(D, 400));
    expect(s.cells).toBe(0);
  });

  it('filling resets the timer', () => {
    let s = fill(base, addDays(D, 25));
    s = applyDecay(s, addDays(D, 50));
    expect(s.cells).toBe(12);
  });
});

describe('streak', () => {
  it('counts consecutive days, ignoring undone ones', () => {
    let s = createSkill('x', '', 0, D);
    for (let i = 0; i < 4; i++) s = fill(s, addDays(D, i));
    expect(streak(s, addDays(D, 3))).toBe(4);
    expect(streak(s, addDays(D, 4))).toBe(4);
    expect(streak(s, addDays(D, 5))).toBe(0);
    s = undoToday(s, addDays(D, 3));
    expect(streak(s, addDays(D, 3))).toBe(3);
  });
});

describe('backup', () => {
  it('round-trips', () => {
    const skills = [fill(createSkill('x', 'desc', 2, D), D)];
    expect(parseData(JSON.parse(exportJson(skills)))).toEqual(skills);
  });

  it('rejects junk', () => {
    expect(() => parseData({ foo: 1 })).toThrow();
    expect(() => parseData({ version: 1, skills: [{ id: 1 }] })).toThrow();
  });

  const valid = () => JSON.parse(exportJson([fill(createSkill('x', '', 1, D), D)]));

  it('rejects malformed history entries', () => {
    const d = valid();
    d.skills[0].history = [null];
    expect(() => parseData(d)).toThrow(/malformed/);
    const d2 = valid();
    d2.skills[0].history[0].reason = 'hack';
    expect(() => parseData(d2)).toThrow(/malformed/);
  });

  it('rejects impossible dates and non-integer cells', () => {
    const d = valid();
    d.skills[0].decayAnchor = '2026-99-99';
    expect(() => parseData(d)).toThrow();
    const d2 = valid();
    d2.skills[0].createdAt = '2026-02-30';
    expect(() => parseData(d2)).toThrow();
    const d3 = valid();
    d3.skills[0].cells = 2.5;
    expect(() => parseData(d3)).toThrow();
  });

  it('rejects duplicate ids', () => {
    const d = valid();
    d.skills.push({ ...d.skills[0] });
    expect(() => parseData(d)).toThrow(/Duplicate/);
  });

  it('clamps cells and drops unknown fields', () => {
    const d = valid();
    d.skills[0].cells = 100;
    d.skills[0].extra = '<script>';
    const [s] = parseData(d);
    expect(s.cells).toBe(TOTAL_CELLS);
    expect('extra' in s).toBe(false);
  });
});

class MemoryStorage implements Storage {
  map = new Map<string, string>();
  failWrites = false;
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
}

describe('load', () => {
  it('returns empty with no data', () => {
    expect(load(new MemoryStorage())).toEqual({ skills: [], error: null, blockSave: false });
  });

  it('backs up unreadable data instead of dropping it', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, '{"version":2,"skills":[]}');
    const r = load(st);
    expect(r.skills).toEqual([]);
    expect(r.blockSave).toBe(false);
    expect(r.error).toBeTruthy();
    const backupKey = [...st.map.keys()].find((k) => k !== STORAGE_KEY)!;
    expect(st.getItem(backupKey)).toBe('{"version":2,"skills":[]}');
  });

  it('blocks saving when the backup itself fails', () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, 'not json');
    st.failWrites = true;
    const r = load(st);
    expect(r.blockSave).toBe(true);
    expect(st.getItem(STORAGE_KEY)).toBe('not json');
  });
});
