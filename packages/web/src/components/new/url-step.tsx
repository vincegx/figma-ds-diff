interface UrlStepProps {
  constructorUrl: string;
  forkUrl: string;
  onConstructorChange: (v: string) => void;
  onForkChange: (v: string) => void;
  onContinue: () => void;
  isValid: boolean;
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 9,
  padding: '11px 14px',
  fontSize: 12,
  color: 'var(--text-primary)',
} as const;

export function UrlStep({
  constructorUrl,
  forkUrl,
  onConstructorChange,
  onForkChange,
  onContinue,
  isValid,
}: UrlStepProps) {
  return (
    <div className="flex flex-col gap-[18px] animate-fade-up">
      <div>
        <label
          className="block text-xs font-semibold mb-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          Constructor Library URL
        </label>
        <input
          value={constructorUrl}
          onChange={(e) => onConstructorChange(e.target.value)}
          placeholder="https://figma.com/design/…"
          className="font-mono"
          style={inputStyle}
        />
        <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          The upstream source-of-truth
        </div>
      </div>
      <div>
        <label
          className="block text-xs font-semibold mb-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          Your Fork URL
        </label>
        <input
          value={forkUrl}
          onChange={(e) => onForkChange(e.target.value)}
          placeholder="https://figma.com/design/…"
          className="font-mono"
          style={inputStyle}
        />
        <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Your forked version
        </div>
      </div>
      <button
        onClick={onContinue}
        disabled={!isValid}
        className="self-end text-white text-xs font-semibold cursor-pointer border-none font-sans disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
          padding: '10px 24px',
          borderRadius: 9,
        }}
      >
        Continue →
      </button>
    </div>
  );
}
