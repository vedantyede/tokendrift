import type { ReactNode } from 'react';

export const metadata = {
  title: 'TokenDrift',
  description: 'Design system drift scanner and score for your codebase.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
