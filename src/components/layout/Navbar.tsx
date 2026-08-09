'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X, Menu } from 'lucide-react'
import type { PostSummary } from '@/types'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

interface NavbarProps {
  blogName: string
}

const NAV_LINKS = [
  { label: '全部', href: '/', category: null },
  { label: '工作', href: '/?category=工作', category: '工作' },
  { label: '思考', href: '/?category=思考', category: '思考' },
  { label: '生活', href: '/?category=生活', category: '生活' },
  { label: '投资理财', href: '/?category=投资理财', category: '投资理财' },
  { label: '归档', href: '/archive', category: null },
  { label: '关于', href: '/about', category: null },
]

export function Navbar({ blogName }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PostSummary[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentCategory = searchParams.get('category')

  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  const performSearch = useCallback(async (q: string) => {
    const query = q.trim()
    searchControllerRef.current?.abort()

    if (!query) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    searchControllerRef.current = controller
    setIsSearching(true)
    try {
      const res = await fetch(`/api/posts?search=${encodeURIComponent(query)}&status=published&limit=5`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Search request failed')
      const data = await res.json()
      setSearchResults(data.posts || [])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setSearchResults([])
    } finally {
      if (searchControllerRef.current === controller) setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(debounceTimer.current)
  }, [searchQuery, performSearch])

  useEffect(() => () => searchControllerRef.current?.abort(), [])

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 12)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  function handleSearchResult(slug: string) {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    router.push(`/posts/${slug}`)
  }

  return (
    <nav className={`navbar-shell sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Blog name */}
          <Link
            href="/"
            className="pressable rounded-sm font-serif text-lg font-semibold text-primary hover:text-accent"
          >
            {blogName}
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/about'
                  ? pathname === '/about'
                  : link.href === '/archive'
                    ? pathname === '/archive'
                    : pathname === '/' && currentCategory === link.category
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`pressable px-4 py-2 text-sm rounded-md ${
                    isActive
                      ? 'bg-[#C09060]/10 text-accent font-medium'
                      : 'text-muted hover:bg-surface-hover hover:text-primary'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle compact />

            {/* Search */}
            <div ref={searchRef} className="relative">
              {searchOpen ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索文章..."
                    aria-label="搜索文章"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isSearching || searchQuery.trim().length > 0}
                    aria-controls="site-search-results"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchOpen(false)
                        setSearchQuery('')
                        setSearchResults([])
                      }
                    }}
                    className="w-48 sm:w-64 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="pressable rounded-md p-1 text-muted hover:text-primary"
                    aria-label="关闭搜索"
                  >
                    <X size={16} />
                  </button>
                  {/* Search dropdown */}
                  {(isSearching || searchQuery.trim().length > 0) && (
                    <div
                      id="site-search-results"
                      role={isSearching || searchResults.length === 0 ? 'status' : 'listbox'}
                      aria-live={isSearching || searchResults.length === 0 ? 'polite' : undefined}
                      className="popover-enter absolute top-full mt-1.5 left-0 w-full bg-surface border border-border rounded-lg shadow-dropdown overflow-hidden"
                    >
                      {isSearching ? (
                        <div className="px-4 py-3 text-sm text-muted">搜索中...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted">未找到相关文章</div>
                      ) : (
                        searchResults.map((post) => (
                          <button
                            key={post.id}
                            role="option"
                            aria-selected="false"
                            onClick={() => handleSearchResult(post.slug)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors border-b border-border last:border-0"
                          >
                            <div className="font-medium text-primary truncate">{post.title}</div>
                            <div className="text-xs text-muted mt-0.5">{post.category}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="pressable p-2 text-muted hover:text-primary rounded-md hover:bg-surface-hover"
                  aria-label="搜索"
                >
                  <Search size={16} />
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="pressable md:hidden p-2 text-muted hover:text-primary rounded-md"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="菜单"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mobile-menu-enter md:hidden border-t border-border py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-2 py-2.5 text-sm text-muted hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
