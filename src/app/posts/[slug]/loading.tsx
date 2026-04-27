export default function Loading() {
  return (
    <main className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-16">
          {/* Article skeleton */}
          <article className="flex-1 min-w-0 max-w-2xl animate-pulse">
            {/* Tags */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-5 w-12 bg-[#E5E5E3] rounded-full" />
              <div className="h-4 w-16 bg-[#E5E5E3] rounded" />
            </div>
            {/* Title */}
            <div className="h-10 bg-[#E5E5E3] rounded mb-4 w-3/4" />
            <div className="h-10 bg-[#E5E5E3] rounded mb-6 w-1/2" />
            {/* Meta */}
            <div className="flex gap-4 pb-8 border-b border-[#E5E5E3]">
              <div className="h-4 w-24 bg-[#E5E5E3] rounded" />
              <div className="h-4 w-20 bg-[#E5E5E3] rounded" />
            </div>
            {/* Cover */}
            <div className="h-64 sm:h-96 bg-[#E5E5E3] rounded-[10px] my-10" />
            {/* Content lines */}
            <div className="space-y-3">
              <div className="h-4 bg-[#E5E5E3] rounded w-full" />
              <div className="h-4 bg-[#E5E5E3] rounded w-11/12" />
              <div className="h-4 bg-[#E5E5E3] rounded w-full" />
              <div className="h-4 bg-[#E5E5E3] rounded w-5/6" />
              <div className="h-4 bg-[#E5E5E3] rounded w-3/4" />
            </div>
          </article>

          {/* Sidebar skeleton */}
          <aside className="hidden lg:block w-72 flex-shrink-0 animate-pulse">
            <div className="h-48 bg-white border border-[#E5E5E3] rounded-[10px]" />
          </aside>
        </div>
      </div>
    </main>
  )
}
