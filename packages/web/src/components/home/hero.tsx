export function Hero() {
  return (
    <div className="animate-fade-up flex items-start gap-6" style={{ padding: '52px 0 36px' }}>
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--accent-from)',
          marginTop: 6,
        }}
      >
        <FigmaIcon />
      </div>
      <div>
        <h1
          className="text-[48px] font-extrabold leading-[1.05] mb-3.5"
          style={{ letterSpacing: '-0.04em' }}
        >
          Design System
          <br />
          <span
            className="bg-clip-text"
            style={{
              background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Diff Reports
          </span>
        </h1>
        <p
          className="text-[15px] max-w-[440px]"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.65 }}
        >
          Track upstream changes, local modifications, and conflicts between your
          forked design system and its source library.
        </p>
      </div>
    </div>
  );
}

function FigmaIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="currentColor" opacity="0.8" />
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="currentColor" opacity="0.6" />
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="currentColor" opacity="0.6" />
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="currentColor" opacity="0.8" />
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="currentColor" />
    </svg>
  );
}
