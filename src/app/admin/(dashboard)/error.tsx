'use client'

import { useEffect } from 'react'

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin dashboard error', error)
  }, [error])

  return (
    <div role="alert" className="max-w-2xl rounded-[10px] border border-amber-200 bg-amber-50 px-6 py-7">
      <h1 className="font-serif text-xl font-bold text-[#1A1A1A]">后台数据暂时不可用</h1>
      <p className="mt-2 text-sm leading-6 text-[#6A6A65]">
        当前没有把文章数量显示成零，避免造成数据已丢失的误解。请稍后重新连接。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#333]"
      >
        重新连接
      </button>
    </div>
  )
}
