interface GenerateStepProps {
  onGenerate: () => void;
  onBack: () => void;
}

export function GenerateStep({ onGenerate, onBack }: GenerateStepProps) {
  return (
    <div className="text-center animate-fade-up" style={{ padding: '36px 0' }}>
      <div className="text-[15px] font-semibold mb-1.5">Ready to compare</div>
      <p
        className="text-xs mb-5"
        style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}
      >
        Fetch files, resolve baseline, compare components &amp; styles, render
        visual diffs.
      </p>
      <div className="flex gap-2.5 justify-center">
        <button
          onClick={onBack}
          className="text-xs font-semibold cursor-pointer font-sans"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            padding: '12px 24px',
            borderRadius: 10,
          }}
        >
          ← Back
        </button>
        <button
          onClick={onGenerate}
          className="text-white text-[13px] font-bold cursor-pointer border-none font-sans"
          style={{
            background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
            padding: '12px 36px',
            borderRadius: 10,
          }}
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
