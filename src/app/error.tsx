'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Public page error', error)
  }, [error])

  return (
    <main id="main-content" className="blog-page min-h-screen grid place-items-center px-4 py-16">
      <section className="w-full max-w-lg rounded-[14px] border border-[#E5E5E3] bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <p className="section-kicker">Temporary interruption</p>
        <h1 className="mt-3 font-serif text-2xl font-bold text-[#1A1A1A]">内容暂时没有加载出来</h1>
        <p className="mt-3 text-sm leading-7 text-[#6A6A65]">
          这通常只是内容服务短暂不可用，并不代表文章被删除。可以稍后重试，或先返回首页。
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
          >
            重新加载
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[#E5E5E3] px-5 py-2.5 text-sm font-semibold text-[#5A5A55] transition-colors hover:bg-[#F5F5F3]"
          >
            返回首页
          </Link>
        </div>
      </section>
    </main>
  )
}
