import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'TokensDrift — Design System Drift Scanner & Score for Your Codebase',
  description:
    'Scan your codebase for hardcoded colors, off-scale spacing, and low design token adoption. Get a shareable Drift Score in 60 seconds with one command: npx tokensdrift. Free, local, zero dependencies.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
