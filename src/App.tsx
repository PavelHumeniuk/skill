import { useCallback, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { todayStr } from './dates';
import { useSkills } from './storage';
import { t } from './strings';
import Home from './pages/Home';
import SkillPage from './pages/SkillPage';
import Settings from './pages/Settings';

/** Current local day; refreshes when the tab regains focus or the clock passes midnight. */
function useToday() {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const refresh = () => setToday(todayStr());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  // Read the clock at the moment of an action, and sync the displayed day with it.
  const getToday = useCallback(() => {
    const now = todayStr();
    setToday(now);
    return now;
  }, []);
  return { today, getToday };
}

export default function App() {
  const { today, getToday } = useToday();
  const { skills, actions, error, canDismissError, dismissError } = useSkills(today, getToday);

  return (
    <div className="app">
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          {canDismissError && (
            <button className="banner-close" onClick={dismissError} aria-label={t.dismiss} title={t.dismiss}>
              ×
            </button>
          )}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home skills={skills} actions={actions} today={today} />} />
        <Route
          path="/skill/:id"
          element={<SkillPage skills={skills} actions={actions} today={today} />}
        />
        <Route path="/settings" element={<Settings skills={skills} actions={actions} />} />
        <Route path="*" element={<Home skills={skills} actions={actions} today={today} />} />
      </Routes>
    </div>
  );
}
