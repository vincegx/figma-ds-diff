'use client';

export function VariablesEmpty() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: '80px 28px' }}
    >
      <div
        className="animate-pulse-soft"
        style={{
          fontSize: 40,
          marginBottom: 16,
          opacity: 0.3,
        }}
      >
        ⬡
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: 6,
        }}
      >
        No variable files uploaded
      </div>
      <p
        className="text-center"
        style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          maxWidth: 320,
          lineHeight: 1.6,
        }}
      >
        Export variables from Tokens Studio or DTCG format and upload them during the comparison step to see variable diffs here.
      </p>
    </div>
  );
}
