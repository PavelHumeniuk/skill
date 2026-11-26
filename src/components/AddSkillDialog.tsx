import { useEffect, useRef, useState } from 'react';
import { DESC_MAX, LEVEL_NAMES, MAX_LEVEL, NAME_MAX, cellsForLevel } from '../model';
import { t } from '../strings';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, level: number) => void;
};

export default function AddSkillDialog({ open, onClose, onCreate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setName('');
      setDescription('');
      setLevel(0);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, description, level);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <form onSubmit={submit} className="dialog-body">
        <h2>{t.newSkill}</h2>

        <label className="field">
          <span>{t.name}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={NAME_MAX}
            required
          />
        </label>

        <label className="field">
          <span>{t.description}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descriptionPlaceholder}
            rows={3}
            maxLength={DESC_MAX}
          />
        </label>

        <fieldset className="field">
          <legend>{t.startLevel}</legend>
          <div className="level-chips" role="radiogroup">
            {Array.from({ length: MAX_LEVEL + 1 }, (_, l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={level === l}
                className={`chip${level === l ? ' is-active' : ''}`}
                onClick={() => setLevel(l)}
                title={LEVEL_NAMES[l]}
              >
                {l === MAX_LEVEL ? '★' : l}
              </button>
            ))}
          </div>
          <p className="hint">
            <strong>{LEVEL_NAMES[level]}.</strong> {t.startLevelHint(level, cellsForLevel(level))}
          </p>
        </fieldset>

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {t.create}
          </button>
        </div>
      </form>
    </dialog>
  );
}
