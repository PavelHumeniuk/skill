import { Link } from 'react-router-dom';
import type { DayStr } from '../dates';
import { daysUntilDecay, filledToday, levelInfo, type Skill } from '../model';
import { t } from '../strings';
import LevelBadge from './LevelBadge';

type Props = { skill: Skill; today: DayStr; onFill: () => void };

export default function SkillCard({ skill, today, onFill }: Props) {
  const info = levelInfo(skill.cells);
  const done = filledToday(skill, today);
  const fadeDays = daysUntilDecay(skill, today);
  const atRisk = !done && skill.cells > 0 && fadeDays <= 7;
  const pct = info.isMaster ? 100 : (info.filledInLevel / info.levelSize) * 100;

  return (
    <li className={`skill-card${done ? ' is-done' : ''}`}>
      <Link to={`/skill/${skill.id}`} className="skill-card-link">
        <div className="skill-card-top">
          <h2 className="skill-card-name">{skill.name}</h2>
          <LevelBadge level={info.level} master={info.isMaster} />
        </div>
        <div className="progress" aria-hidden>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="skill-card-meta">
          <span>
            {info.isMaster ? t.masterTitle : t.squares(info.filledInLevel, info.levelSize)}
          </span>
          {atRisk && <span className="warn">{t.fadesIn(fadeDays)}</span>}
        </div>
      </Link>
      <button
        type="button"
        className={`check-btn${done ? ' is-done' : ''}`}
        onClick={onFill}
        disabled={done}
        aria-label={done ? t.doneToday : t.markToday}
        title={done ? t.doneToday : t.markToday}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          {done ? (
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </li>
  );
}
