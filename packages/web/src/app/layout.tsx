import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Figma DS Diff',
  description: 'Compare two Figma design system libraries and visualize differences',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
