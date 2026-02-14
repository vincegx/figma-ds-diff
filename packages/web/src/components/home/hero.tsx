export function Hero() {
  return (
    <div className="animate-fade-up" style={{ padding: '52px 0 36px' }}>
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
  );
}
