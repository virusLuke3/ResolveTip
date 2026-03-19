import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkillTip',
  description: 'Reward interesting agent-skill publishers with Sepolia USDT.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              SkillTip
            </Link>
            <nav>
              <Link href="/">Dashboard</Link>
              <Link href="/audit">Audit</Link>
            </nav>
          </header>
          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
