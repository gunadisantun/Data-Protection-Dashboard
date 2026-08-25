export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}
