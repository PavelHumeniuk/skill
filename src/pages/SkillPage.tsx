import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { DayStr } from '../dates';
import {
  DECAY_DAYS,
  DESC_MAX,
  LEVEL_NAMES,
  NAME_MAX,
  THRESHOLDS,
  daysUntilDecay,
  filledToday,
  levelInfo,
  streak,
  type Skill,
} from '../model';
import type { SkillActions } from '../storage';
import { t } from '../strings';
import CellGrid from '../components/CellGrid';
import LevelBadge from '../components/LevelBadge';

type Props = { skills: Skill[]; actions: SkillActions; today: DayStr };

export default function SkillPage({ skills, actions, today }: Props) {
  const { id } = useParams();
  const skill = skills.find((s) => s.id === id);

  if (!skill) {
    return (
      <main className="page">
        <BackBar />
        <p className="empty">{t.notFound}</p>
      </main>
    );
  }
  return <SkillView key={skill.id} skill={skill} actions={actions} today={today} />;
}

function BackBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <Link to="/" className="icon-btn" aria-label={t.back} title={t.back}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {children}
    </header>
  );
}

function SkillView({ skill, actions, today }: { skill: Skill; actions: SkillActions; today: DayStr }) {
  const navigate = useNavigate();
  const info = levelInfo(skill.cells);
  const done = filledToday(skill, today);
  const fadeDays = daysUntilDecay(skill, today);
  const currentStreak = streak(skill, today);

  // Animation state: pop the newly filled square, celebrate level-ups.
  const [pop, setPop] = useState<{ index: number; key: number } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const prevCells = useRef(skill.cells);
  // Animate only fills made on this screen, not changes synced from another tab.
  const filledHere = useRef(false);
  const fillHere = () => {
    filledHere.current = true;
    actions.fill(skill.id);
  };
  useEffect(() => {
    const before = levelInfo(prevCells.current);
    const mine = filledHere.current;
    filledHere.current = false;
    if (skill.cells > prevCells.current && mine) {
      if (info.level > before.level) {
        setLevelUp(info.level);
        setPop(null);
      } else {
        const index = info.filledInLevel - 1;
        setPop((p) => ({ index, key: (p?.key ?? 0) + 1 }));
      }
    } else if (skill.cells < prevCells.current) {
      setPop(null);
    }
    prevCells.current = skill.cells;
  }, [skill.cells, info.level, info.filledInLevel]);
  useEffect(() => {
    if (levelUp === null) return;
    const timer = window.setTimeout(() => setLevelUp(null), 3200);
    return () => window.clearTimeout(timer);
  }, [levelUp]);

  return (
    <main className="page skill-page">
      <BackBar>
        <Menu
          canRemove={skill.cells > 0}
          onRemoveCell={() => window.confirm(t.removeCellConfirm) && actions.removeCell(skill.id)}
          onDelete={() => {
            if (window.confirm(t.deleteSkillConfirm(skill.name))) {
              actions.remove(skill.id);
              navigate('/');
            }
          }}
        />
      </BackBar>

      <section className="skill-head">
        <EditableTitle value={skill.name} onSave={(name) => actions.update(skill.id, { name })} />
        <EditableDescription
          value={skill.description}
          onSave={(description) => actions.update(skill.id, { description })}
        />
      </section>

      <section className={`level-panel${info.isMaster ? ' is-master' : ''}`}>
        {levelUp !== null && (
          <div className="level-up" role="status">
            {t.levelUp(levelUp, LEVEL_NAMES[levelUp])}
          </div>
        )}
        <div className="level-panel-head">
          <LevelBadge level={info.level} master={info.isMaster} />
          {!info.isMaster && (
            <span className="muted">{t.squares(info.filledInLevel, info.levelSize)}</span>
          )}
        </div>

        {info.isMaster ? (
          <div className="master">
            <div className="master-star" aria-hidden>★</div>
            <h2>{t.masterTitle}</h2>
            <p>{t.masterBody}</p>
          </div>
        ) : (
          <>
            <CellGrid size={info.levelSize} filled={info.filledInLevel} justFilled={pop?.index ?? null}
              popKey={pop?.key}
            />
            <p className="muted small">{t.toNext(info.levelSize - info.filledInLevel)}</p>
          </>
        )}

        <div className="primary-actions">
          {done ? (
            <>
              <div className="done-pill">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.doneToday}
              </div>
              <button className="btn btn-ghost" onClick={() => actions.undo(skill.id)}>
                {t.undoToday}
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-big" onClick={fillHere}>
              {t.markToday}
            </button>
          )}
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <span className="stat-value">{currentStreak}</span>
          <span className="stat-label">{t.statStreak}</span>
        </div>
        <div className={`stat${!done && skill.cells > 0 && fadeDays <= 7 ? ' is-warn' : ''}`}>
          <span className="stat-value">{skill.cells > 0 ? fadeDays : '—'}</span>
          <span className="stat-label">{t.statFade}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{skill.cells}</span>
          <span className="stat-label">{t.statTotal}</span>
        </div>
      </section>
      {skill.cells > 0 && !done && (
        <p className="muted small center">{t.fadeNote(fadeDays || DECAY_DAYS)}</p>
      )}

      {info.level > 0 && (
        <section className="passed">
          <h3>{t.levelsPassed}</h3>
          <ol className="passed-list">
            {THRESHOLDS.slice(0, info.level).map((size, l) => (
              <li key={l}>
                <span className="passed-label">
                  {t.levelShort} {l} · {LEVEL_NAMES[l]}
                </span>
                <CellGrid size={size} filled={size} compact />
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

function Menu({
  canRemove,
  onRemoveCell,
  onDelete,
}: {
  canRemove: boolean;
  onRemoveCell: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="icon-btn"
        aria-label={t.more}
        title={t.more}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <button
            role="menuitem"
            disabled={!canRemove}
            onClick={() => {
              setOpen(false);
              onRemoveCell();
            }}
          >
            {t.removeCell}
          </button>
          <button
            role="menuitem"
            className="danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            {t.deleteSkill}
          </button>
        </div>
      )}
    </div>
  );
}

function EditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    else setDraft(value);
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        className="title-input"
        autoFocus
        value={draft}
        maxLength={NAME_MAX}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <h1 className="skill-title">
      <button
        className="editable"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title={t.edit}
      >
        {value}
      </button>
    </h1>
  );
}

function EditableDescription({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <div className="desc-edit">
        <textarea
          autoFocus
          rows={4}
          maxLength={DESC_MAX}
          value={draft}
          placeholder={t.descriptionPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              onSave(draft.trim());
              setEditing(false);
            }
          }}
        />
        <div className="row-end">
          <button className="btn btn-ghost" onClick={() => setEditing(false)}>
            {t.cancel}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave(draft.trim());
              setEditing(false);
            }}
          >
            {t.save}
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      className={`editable desc${value ? '' : ' is-empty'}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || `+ ${t.addDescription}`}
    </button>
  );
}
