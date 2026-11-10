export const kicker = { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' };
export const muted = { fontSize: 13, color: 'var(--color-neutral-700)' };

export function Seg({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {options.map(([k, l]) => (
        <button type="button" key={k} className="btn" aria-pressed={value === k} onClick={() => onChange(k)}
          style={{ padding: '6px 12px', fontSize: 14, color: value === k ? 'var(--color-bg)' : 'var(--color-text)', background: value === k ? 'var(--color-accent)' : 'transparent' }}>{l}</button>
      ))}
    </div>
  );
}

export function Toast({ text }) {
  if (!text) return null;
  return <div role="status" className="elev-md" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-text)', color: 'var(--color-bg)', padding: '10px 18px', borderRadius: 'var(--radius-md)', zIndex: 10 }}>{text}</div>;
}
