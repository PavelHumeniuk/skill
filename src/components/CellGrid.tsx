type Props = {
  size: number;
  filled: number;
  /** Index of the square that was just filled, for the pop animation. */
  justFilled?: number | null;
  /** Changes on every fill, so the animated square remounts and the animation replays. */
  popKey?: number;
  compact?: boolean;
};

export default function CellGrid({ size, filled, justFilled = null, popKey = 0, compact }: Props) {
  return (
    <div
      className={`cell-grid${compact ? ' is-compact' : ''}`}
      role="img"
      aria-label={`${filled} of ${size} squares filled`}
    >
      {Array.from({ length: size }, (_, i) => (
        <span
          key={i === justFilled ? `pop-${popKey}` : i}
          className={`cell${i < filled ? ' is-filled' : ''}${i === justFilled ? ' is-new' : ''}${
            i === filled ? ' is-next' : ''
          }`}
        />
      ))}
    </div>
  );
}
