import './globals.css';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '../lib/auth';
import { AccessibilityProvider } from '../lib/accessibility';
import { ThemeProvider } from '../lib/theme';
import type { Metadata } from 'next';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body'
});

const space = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display'
});

const FALLBACK_TITLE = 'Projeto Integrador';
const FALLBACK_DESCRIPTION = 'Projeto Integrador - UNIVESP';

const toAbsoluteUrl = (base: string, path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}${path.startsWith('/') ? '' : '/'}${path}`;
};

export async function generateMetadata(): Promise<Metadata> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const response = await fetch(`${apiBase}/platform-settings/public`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      throw new Error('Falha ao carregar configuração da plataforma.');
    }
    const data = await response.json();
    const favicon = toAbsoluteUrl(apiBase, data.faviconUrl);
    return {
      title: data.platformName || FALLBACK_TITLE,
      description: data.platformDescription || FALLBACK_DESCRIPTION,
      ...(favicon ? { icons: { icon: favicon } } : {})
    };
  } catch {
    return {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION
    };
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${plex.variable} ${space.variable}`}>
      <body>
        <AccessibilityProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
