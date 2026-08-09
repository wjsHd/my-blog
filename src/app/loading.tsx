function CardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[10px] border border-border bg-surface ${featured ? 'md:col-span-2' : ''}`}>
      <div className={`skeleton-block w-full ${featured ? 'h-64 sm:h-80' : 'h-44'}`} />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="skeleton-block h-5 w-20 rounded-full" />
        <div className="skeleton-block h-7 w-4/5 rounded-md" />
        <div className="skeleton-block h-4 w-full rounded-md" />
        <div className="skeleton-block h-4 w-2/3 rounded-md" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background" aria-busy="true" aria-label="页面加载中">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="skeleton-block h-6 w-32 rounded-md" />
          <div className="skeleton-block h-8 w-40 rounded-md" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-9 space-y-4">
          <div className="skeleton-block h-10 w-52 rounded-md sm:h-12 sm:w-72" />
          <div className="skeleton-block h-5 w-full max-w-lg rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CardSkeleton featured />
          {Array.from({ length: 8 }, (_, index) => <CardSkeleton key={index} />)}
        </div>
      </div>
      <span className="sr-only">正在加载文章</span>
    </main>
  )
}
