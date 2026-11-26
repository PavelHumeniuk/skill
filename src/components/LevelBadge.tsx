import { LEVEL_NAMES } from '../model';
import { t } from '../strings';

export default function LevelBadge({ level, master }: { level: number; master?: boolean }) {
  return (
    <span className={`level-badge${master ? ' is-master' : ''}`} data-level={level}>
      <span className="level-badge-num">
        {master ? '★' : `${t.levelShort} ${level}`}
      </span>
      <span className="level-badge-name">{LEVEL_NAMES[level]}</span>
    </span>
  );
}
