import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { todayStr } from '../dates';
import type { Skill } from '../model';
import { exportJson, parseData, type SkillActions } from '../storage';
import { t } from '../strings';

type Props = { skills: Skill[]; actions: SkillActions };

export default function Settings({ skills, actions }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJson(skills)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skills-${todayStr()}.json`;
    a.click();
    // Revoking synchronously can cancel the download in Firefox and Safari.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file: File) => {
    try {
      const next = parseData(JSON.parse(await file.text()));
      if (skills.length > 0 && !window.confirm(t.importConfirm(next.length))) return;
      actions.replaceAll(next);
      setMessage({ ok: true, text: t.importDone(next.length) });
    } catch (err) {
      setMessage({ ok: false, text: t.importFailed((err as Error).message) });
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <Link to="/" className="icon-btn" aria-label={t.back} title={t.back}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="topbar-title">{t.settings}</h1>
        <span className="icon-btn-spacer" />
      </header>

      <section className="card">
        <h2>{t.rules}</h2>
        <ul className="rules">
          {t.rulesBody.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{t.backup}</h2>
        <p className="muted">{t.backupBody}</p>
        <div className="row">
          <button className="btn btn-primary" onClick={doExport} disabled={skills.length === 0}>
            {t.exportData}
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            {t.importData}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className={message.ok ? 'ok' : 'error'}>{message.text}</p>}
      </section>
    </main>
  );
}
