import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavigationProgress } from '@/components/layout/NavigationProgress'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

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
  },
  twitter: {
    card: 'summary',
    title: 'Peter · 随笔',
    description: '记录工作、思考、生活与投资理财实践',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <head>
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
