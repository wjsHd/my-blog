'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Menu, PenLine } from 'lucide-react'
import type { Post } from '@/types'

interface NavbarProps {
  blogName: string
}

const NAV_LINKS = [
  { label: '全部', href: '/', category: null },
  { label: '文章', href: '/?category=文章', category: '文章' },
  { label: '思考', href: '/?category=思考', category: '思考' },
  { label: '生活', href: '/?category=生活', category: '生活' },
  { label: '关于', href: '/about', category: null },
]

export function Navbar({ blogName }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Post[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')

  const debounceTimer = useRef<NodeJS.Timeout>()

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/posts?search=${encodeURIComponent(q)}&status=published&limit=5`)
      const data = await res.json()
      setSearchResults(data.posts || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(debounceTimer.current)
  }, [searchQuery, performSearch])

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

  function handleSearchResult(slug: string) {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    router.push(`/posts/${slug}`)
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Blog name */}
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-primary hover:text-accent transition-colors"
          >
            {blogName}
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.category === null
                  ? link.href === '/' && currentCategory === null
                  : currentCategory === link.category
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'text-accent font-medium'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
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
                    className="w-48 sm:w-64 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="text-muted hover:text-primary"
                  >
                    <X size={16} />
                  </button>
                  {/* Search dropdown */}
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute top-full mt-1.5 left-0 w-full bg-surface border border-border rounded-lg shadow-dropdown overflow-hidden">
                      {isSearching ? (
                        <div className="px-4 py-3 text-sm text-muted">搜索中...</div>
                      ) : (
                        searchResults.map((post) => (
                          <button
                            key={post.id}
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
                  className="p-2 text-muted hover:text-primary transition-colors rounded-md hover:bg-surface-hover"
                  aria-label="搜索"
                >
                  <Search size={16} />
                </button>
              )}
            </div>

            {/* Admin link */}
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted hover:text-accent transition-colors rounded-md hover:bg-surface-hover"
            >
              <PenLine size={13} />
              <span>管理</span>
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-muted hover:text-primary transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="菜单"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border py-3">
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
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-2 py-2.5 text-sm text-muted hover:text-accent transition-colors"
            >
              管理后台
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
