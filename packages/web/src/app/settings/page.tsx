import Link from 'next/link';
import { NavBar } from '@/components/layout/nav-bar';
import { SettingsForm } from '@/components/settings/settings-form';

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <NavBar>
        <Link
          href="/"
          className="flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-tertiary)',
            fontSize: 18,
            transition: 'all var(--duration-fast)',
          }}
          aria-label="Close and return to home"
        >
          ✕
        </Link>
      </NavBar>

      <div
        className="mx-auto animate-fade-up"
        style={{ maxWidth: 680, padding: '0 32px' }}
      >
        {/* Page header */}
        <div style={{ padding: '44px 0 28px' }}>
          <h2
            className="text-[26px] font-bold mb-1.5"
            style={{ letterSpacing: '-0.03em' }}
          >
            Settings
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Configure your Figma API token to enable file comparisons.
          </p>
        </div>

        <SettingsForm />
      </div>
    </div>
  );
}
