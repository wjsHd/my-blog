'use client'

import { useState, useEffect } from 'react'

const PHD_START = new Date('2025-09-01T00:00:00')

export function PhDCounter() {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    function calcDays() {
      const now = new Date()
      const diff = now.getTime() - PHD_START.getTime()
      setDays(Math.floor(diff / (1000 * 60 * 60 * 24)))
    }

    calcDays()

    // 计算距离明天 00:00:00 的毫秒数，到点自动刷新
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    const timer = setTimeout(() => {
      calcDays()
    }, msUntilMidnight)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-5 mt-6">
      <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest mb-3">读博计时</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-[#C09060]">
          {days === null ? '—' : days}
        </span>
        <span className="text-sm text-[#6A6A65]">天</span>
      </div>
      <p className="text-[11px] text-[#B0B0AA] mt-1.5">自 2025年9月1日 入学至今</p>
    </div>
  )
}
