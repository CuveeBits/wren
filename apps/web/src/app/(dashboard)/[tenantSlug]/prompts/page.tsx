'use client'

/**
 * Prompt Library browse page — /[tenantSlug]/prompts
 *
 * Layout:
 *   - Department filter sidebar (desktop) / horizontal chips (mobile)
 *   - Search bar (debounced 300ms, updates URL param ?search=)
 *   - Prompt card grid
 *   - "Load more" pagination button
 *
 * Sprint 1 — Task 1.4
 * Sprint 4b — UI localisation
 */
import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button, Input, Skeleton, cn } from '@wren/ui'
import { PromptCard } from '@/components/prompt/PromptCard'
import { useTranslations, useLocale } from '@/i18n/translations-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptSummary {
  id: string
  title: string
  description: string | null
  category: string
  department: string
  difficulty: string
  estimatedMinutesSaved: number | null
  usageCount: number
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function PromptsPage() {
  const params = useParams<{ tenantSlug: string }>()
  const { tenantSlug } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const locale = useLocale()

  // Sprint 4c (F-04): translated prompt titles/descriptions map
  const [promptTranslations, setPromptTranslations] = React.useState<
    Record<string, { title: string; description: string | null }>
  >({})

  const [departments, setDepartments] = React.useState<string[]>([])
  const [prompts, setPrompts] = React.useState<PromptSummary[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)

  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? ''
  )
  const debouncedSearch = useDebounce(searchInput, 300)

  const [activeDept, setActiveDept] = React.useState(
    searchParams.get('dept') ?? ''
  )

  // Sync URL params
  React.useEffect(() => {
    const p = new URLSearchParams()
    if (debouncedSearch) p.set('search', debouncedSearch)
    if (activeDept) p.set('dept', activeDept)
    router.replace(`?${p.toString()}`, { scroll: false })
  }, [debouncedSearch, activeDept, router])

  // Sprint 4c (F-04): Fetch translated prompt titles/descriptions when locale changes
  React.useEffect(() => {
    if (!locale || locale === 'en') {
      setPromptTranslations({})
      return
    }
    const qs = new URLSearchParams({ tenantSlug })
    fetch(`${API_BASE}/api/v1/tenant/prompts/locale/${locale}?${qs}`, { credentials: 'omit' })
      .then((r) => {
        if (r.ok) return r.json()
        return null
      })
      .then((j) => {
        if (j?.data) setPromptTranslations(j.data as Record<string, { title: string; description: string | null }>)
      })
      .catch(console.error)
  }, [locale, tenantSlug])

  // Fetch departments on mount
  React.useEffect(() => {
    fetch(`${API_BASE}/api/v1/prompts/meta/depts`, { credentials: 'omit' })
      .then((r) => r.json())
      .then((j: { data: string[] }) => setDepartments(j.data))
      .catch(console.error)
  }, [])

  // Fetch prompts whenever filters change (reset to page 1)
  React.useEffect(() => {
    setPage(1)
    setPrompts([])
    loadPrompts(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeDept])

  async function loadPrompts(pageNum: number, replace: boolean) {
    if (replace) setIsLoading(true)
    else setIsLoadingMore(true)

    const qs = new URLSearchParams({ page: String(pageNum), limit: '24' })
    if (debouncedSearch) qs.set('search', debouncedSearch)
    if (activeDept) qs.set('department', activeDept)

    try {
      const res = await fetch(`${API_BASE}/api/v1/prompts?${qs}`, {
        credentials: 'omit',
      })
      const json = (await res.json()) as {
        data: PromptSummary[]
        meta: { total: number }
      }
      setTotal(json.meta.total)
      setPrompts((prev) => (replace ? json.data : [...prev, ...json.data]))
    } catch (err) {
      console.error('Failed to load prompts', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  function handleLoadMore() {
    const next = page + 1
    setPage(next)
    loadPrompts(next, false)
  }

  const hasMore = prompts.length < total

  // ── Sidebar dept list
  const deptList = (
    <ul className="space-y-0.5">
      <li>
        <button
          type="button"
          onClick={() => setActiveDept('')}
          className={cn(
            'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
            activeDept === ''
              ? 'bg-primary text-primary-foreground font-medium'
              : 'hover:bg-accent hover:text-accent-foreground text-foreground'
          )}
        >
          {t('prompts.allDepartments')}
        </button>
      </li>
      {departments.map((dept) => (
        <li key={dept}>
          <button
            type="button"
            onClick={() => setActiveDept(dept)}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm capitalize transition-colors',
              activeDept === dept
                ? 'bg-primary text-primary-foreground font-medium'
                : 'hover:bg-accent hover:text-accent-foreground text-foreground'
            )}
          >
            {dept.replace(/-/g, ' ')}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('prompts.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('prompts.subtitle')}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('prompts.searchPlaceholder')}
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* ── Mobile dept chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {['', ...departments].map((dept) => (
          <button
            key={dept || '__all'}
            type="button"
            onClick={() => setActiveDept(dept)}
            className={cn(
              'flex-shrink-0 rounded-full border px-3 py-1 text-xs capitalize transition-colors',
              activeDept === dept
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-accent'
            )}
          >
            {dept ? dept.replace(/-/g, ' ') : t('prompts.all')}
          </button>
        ))}
      </div>

      {/* ── Layout: sidebar + grid ── */}
      <div className="flex gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-48 flex-shrink-0 md:block">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('prompts.departments')}
          </p>
          {deptList}
        </aside>

        {/* Grid */}
        <div className="flex-1 space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-20 mt-auto" />
                </div>
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">{t('prompts.noResults')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('prompts.noResultsHint')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {prompts.map((prompt) => {
                  const tx = promptTranslations[prompt.id]
                  return (
                  <PromptCard
                    key={prompt.id}
                    tenantSlug={tenantSlug}
                    {...prompt}
                    title={tx?.title ?? prompt.title}
                    description={tx?.description ?? prompt.description}
                  />
                  )
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore
                      ? t('prompts.loading')
                      : t('prompts.loadMore').replace('{count}', String(total - prompts.length))}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
