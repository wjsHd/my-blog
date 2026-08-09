import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavigationProgress } from '@/components/layout/NavigationProgress'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const themeInitializer = `
  (function () {
    try {
      var savedTheme = localStorage.getItem('blog-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : (prefersDark ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#121210' : '#FAFAF9');
    } catch (_) {
      document.documentElement.dataset.theme = 'light';
    }
  })();
`

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://my-blog-wheat.vercel.app'),
  title: {
    template: '%s | Peter · 随笔',
    default: 'Peter · 随笔',
  },
  description: '记录工作、思考、生活与投资理财实践',
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    title: 'Peter · 随笔',
    description: '记录工作、思考、生活与投资理财实践',
    url: '/',
    siteName: 'Peter · 随笔',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Peter · 随笔 — 记录工作、思考、生活与投资理财实践',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peter · 随笔',
    description: '记录工作、思考、生活与投资理财实践',
    images: ['/og.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FAFAF9" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-primary antialiased">
        <NavigationProgress />
        {children}
      </body>
    </html>
  )
}
