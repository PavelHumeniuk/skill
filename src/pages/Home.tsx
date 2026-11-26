import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DayStr } from '../dates';
import type { Skill } from '../model';
import type { SkillActions } from '../storage';
import { t } from '../strings';
import SkillCard from '../components/SkillCard';
import AddSkillDialog from '../components/AddSkillDialog';

type Props = { skills: Skill[]; actions: SkillActions; today: DayStr };

export default function Home({ skills, actions, today }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1 className="brand">
            <span className="brand-mark" aria-hidden>
              <i /><i /><i /><i />
            </span>
            {t.appName}
          </h1>
        </div>
        <Link to="/settings" className="icon-btn" aria-label={t.settings} title={t.settings}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </Link>
      </header>

      {skills.length === 0 ? (
        <section className="empty">
          <div className="empty-grid" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={`cell${i === 4 ? ' is-next' : ''}`} />
            ))}
          </div>
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyBody}</p>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            {t.addSkill}
          </button>
        </section>
      ) : (
        <>
          <p className="tagline">{t.tagline}</p>
          <ul className="skill-list">
            {skills.map((s) => (
              <SkillCard key={s.id} skill={s} today={today} onFill={() => actions.fill(s.id)} />
            ))}
          </ul>
        </>
      )}

      {skills.length > 0 && (
        <button className="fab" onClick={() => setAdding(true)} aria-label={t.addSkill} title={t.addSkill}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <AddSkillDialog open={adding} onClose={() => setAdding(false)} onCreate={actions.add} />
    </main>
  );
}
