'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: '控制台', icon: '📊', exact: true },
  { href: '/admin/posts', label: '文章管理', icon: '📝', exact: false },
  { href: '/admin/posts/new', label: '写新文章', icon: '✏️', exact: true },
  { href: '/admin/settings', label: '网站设置', icon: '⚙️', exact: false },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#F0F0EE]">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">✍️</span>
          <span className="font-serif font-bold text-[#1A1A1A] group-hover:text-[#C09060] transition-colors text-sm">
            后台管理
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#6A6A65] hover:bg-[#F5F5F3] hover:text-[#1A1A1A]'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#F0F0EE] space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#6A6A65] hover:bg-[#F5F5F3] hover:text-[#1A1A1A] transition-colors"
        >
          <span>🌐</span>
          <span>查看博客</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#9A9A96] hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <span>🚪</span>
          <span>{loggingOut ? '退出中...' : '退出登录'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-white border-r border-[#E5E5E3] z-40">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E5E5E3] px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <span className="font-serif font-bold text-[#1A1A1A] text-sm">后台管理</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-[#F5F5F3] transition-colors"
          aria-label="菜单"
        >
          <div className="w-5 space-y-1">
            <span className={`block h-0.5 bg-[#1A1A1A] transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block h-0.5 bg-[#1A1A1A] transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-[#1A1A1A] transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div className="bg-white border-b border-[#E5E5E3] shadow-lg px-4 py-4">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      active ? 'bg-[#1A1A1A] text-white' : 'text-[#6A6A65] hover:bg-[#F5F5F3]'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <span>🚪</span>
                <span>退出登录</span>
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/20" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Mobile content padding */}
      <div className="lg:hidden h-14" />
    </>
  )
}
