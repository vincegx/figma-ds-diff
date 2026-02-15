'use client';

import { useState, useEffect } from 'react';

export function SettingsForm() {
  const [token, setToken] = useState('');
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json() as Promise<{ configured: boolean; maskedToken: string | null }>)
      .then((data) => {
        setConfigured(data.configured);
        setMaskedToken(data.maskedToken);
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to load current settings.' });
      });
  }, []);

  async function handleSave() {
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = (await res.json()) as { configured?: boolean; maskedToken?: string; error?: string };

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save token.' });
        return;
      }

      setConfigured(true);
      setMaskedToken(data.maskedToken ?? null);
      setToken('');
      setMessage({ type: 'success', text: 'Token saved successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current status */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: configured ? 'var(--color-green)' : 'var(--text-tertiary)',
            }}
          />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {configured ? 'Token configured' : 'No token configured'}
          </span>
        </div>
        {maskedToken && (
          <p className="text-[12px] font-mono ml-4" style={{ color: 'var(--text-tertiary)' }}>
            {maskedToken}
          </p>
        )}
      </div>

      {/* Token input */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="figma-token"
          className="text-[13px] font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {configured ? 'Update token' : 'Figma Personal Access Token'}
        </label>
        <div className="relative">
          <input
            id="figma-token"
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="figd_xxxxxxxxxxxxxxxx"
            className="w-full rounded-lg text-[13px] pr-10"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color var(--duration-fast)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-from)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
            aria-label={showToken ? 'Hide token' : 'Show token'}
          >
            {showToken ? '◉' : '○'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Generate a token at{' '}
          <a
            href="https://www.figma.com/developers/api#access-tokens"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-from)', textDecoration: 'underline' }}
          >
            Figma Developer Settings
          </a>
          . The token needs read access to your files.
        </p>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!token.trim() || saving}
        className="rounded-lg text-[13px] font-semibold cursor-pointer"
        style={{
          padding: '10px 20px',
          background: !token.trim() || saving
            ? 'var(--bg-surface)'
            : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
          color: !token.trim() || saving ? 'var(--text-tertiary)' : 'white',
          border: !token.trim() || saving ? '1px solid var(--border-default)' : 'none',
          opacity: saving ? 0.7 : 1,
          transition: 'all var(--duration-fast)',
          alignSelf: 'flex-start',
        }}
      >
        {saving ? 'Saving…' : 'Save Token'}
      </button>

      {/* Message */}
      {message && (
        <div
          className="rounded-lg text-[13px] p-3"
          style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' ? 'var(--color-green)' : 'var(--color-red)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
