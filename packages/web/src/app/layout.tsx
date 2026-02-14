import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import '../styles/tokens.css';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="en" className={`dark ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-base text-primary font-sans min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
