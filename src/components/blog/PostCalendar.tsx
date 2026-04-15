'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface PostCalendarProps {
  postDates: string[] // ISO date strings like "2026-04-14T..."
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function PostCalendar({ postDates }: PostCalendarProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-based

  // Build a Set of "YYYY-MM-DD" strings that have posts
  const postDaySet = useMemo(() => {
    const set = new Set<string>()
    postDates.forEach((d) => {
      const date = new Date(d)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      set.add(key)
    })
    return set
  }, [postDates])

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // What weekday does the 1st fall on?
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest">日历</p>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F5F5F3] text-[#9A9A96] hover:text-[#1A1A1A] transition-colors text-xs"
          >
            ‹
          </button>
          <span className="text-xs font-semibold text-[#5A5A55] min-w-[60px] text-center">
            {year}年{MONTHS[month]}
          </span>
          <button
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#F5F5F3] text-[#9A9A96] hover:text-[#1A1A1A] transition-colors text-xs"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] text-[#C0C0BB] font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasPost = postDaySet.has(dateKey)
          const isToday = isCurrentMonth && day === today.getDate()

          if (hasPost) {
            return (
              <Link
                key={day}
                href={`/?date=${dateKey}`}
                className="flex items-center justify-center h-7 text-xs font-bold rounded-full bg-[#C09060] text-white hover:bg-[#A07040] transition-colors"
                title={`${dateKey} 有文章`}
              >
                {day}
              </Link>
            )
          }

          return (
            <div
              key={day}
              className={`flex items-center justify-center h-7 text-xs rounded-full transition-colors ${
                isToday
                  ? 'bg-[#F5F5F3] text-[#1A1A1A] font-bold ring-1 ring-[#C09060]'
                  : 'text-[#9A9A96]'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F0EE]">
        <div className="w-3 h-3 rounded-full bg-[#C09060]" />
        <span className="text-[10px] text-[#9A9A96]">有文章发布</span>
        {isCurrentMonth && (
          <>
            <div className="w-3 h-3 rounded-full ring-1 ring-[#C09060] bg-[#F5F5F3] ml-2" />
            <span className="text-[10px] text-[#9A9A96]">今天</span>
          </>
        )}
      </div>
    </div>
  )
}
