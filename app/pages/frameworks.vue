<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <section class="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Framework status</p>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-950">Framework versions</h1>
            <p class="text-sm text-slate-600">Detects Nuxt, AdonisJS, and Laravel across org repos. Flags repos behind on major version.</p>
            <p class="text-xs text-slate-500">Results are cached for 24 hours. Use "Clear cache" to force a fresh scan.</p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Filter</span>
              <select
                v-model="frameworkFilter"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              >
                <option value="">All frameworks</option>
                <option value="Nuxt">Nuxt</option>
                <option value="AdonisJS">AdonisJS</option>
                <option value="Laravel">Laravel</option>
              </select>
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
              <select
                v-model="statusFilter"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              >
                <option value="">All</option>
                <option value="outdated">Outdated only</option>
                <option value="uptodate">Up to date</option>
              </select>
            </label>

            <button
              class="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="loading"
              @click="fetchFrameworks()"
            >
              <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? 'Scanning' : 'Scan repos' }}
            </button>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading || !hasCache"
              @click="clearCache"
            >
              Clear cache
            </button>
          </div>
        </div>

        <div class="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
          <div class="bg-sky-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Repos with frameworks</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ rows.length }}</p>
          </div>
          <div class="bg-rose-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Outdated (major)</p>
            <p class="mt-1 text-lg font-semibold text-rose-700">{{ outdatedCount }}</p>
          </div>
          <div class="bg-emerald-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Up to date</p>
            <p class="mt-1 text-lg font-semibold text-emerald-700">{{ rows.length - outdatedCount }}</p>
          </div>
          <div class="bg-indigo-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Repos scanned</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ totalScanned }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
          <p>{{ cacheStatus }}</p>
          <p v-if="scannedAt">Scanned {{ formatScanTime(scannedAt) }}</p>
        </div>
      </section>

      <section v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm shadow-rose-100/80">
        {{ errorMessage }}
      </section>

      <section class="relative">
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm"
        >
          <div class="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            Scanning repos...
          </div>
        </div>

        <div
          v-if="!hasSearched && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          Click "Scan repos" to detect frameworks.
        </div>

        <div
          v-else-if="hasSearched && filteredRows.length === 0 && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          No matching results.
        </div>

        <div v-else-if="filteredRows.length > 0" class="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3">Repository</th>
                <th class="px-4 py-3">Framework</th>
                <th class="px-4 py-3">Current</th>
                <th class="px-4 py-3">Latest</th>
                <th class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr
                v-for="row in filteredRows"
                :key="`${row.repo}-${row.framework}`"
                :class="row.outdated ? 'bg-rose-50/40' : ''"
              >
                <td class="px-4 py-3">
                  <a :href="row.url" target="_blank" rel="noreferrer" class="font-medium text-sky-700 hover:text-sky-900">{{ row.repo }}</a>
                  <span v-if="row.archived" class="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">archived</span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="frameworkBadgeClass(row.framework)">
                    {{ row.framework }}
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ row.current }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ row.latest || '—' }}</td>
                <td class="px-4 py-3">
                  <span
                    v-if="row.outdated"
                    class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                  >
                    Outdated · v{{ row.currentMajor }} → v{{ row.latestMajor }}
                  </span>
                  <span
                    v-else-if="row.latest"
                    class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                  >
                    Up to date
                  </span>
                  <span v-else class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    Unknown
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const CACHE_KEY = 'github-frameworks-cache:v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const loading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)
const repos = ref([])
const totalScanned = ref(0)
const scannedAt = ref('')
const cacheStatus = ref('No cached data loaded yet.')
const hasCache = ref(false)
const frameworkFilter = ref('')
const statusFilter = ref('')

const hasData = computed(() => repos.value.length > 0)

const rows = computed(() => {
  const out = []
  for (const repo of repos.value) {
    for (const det of repo.detections || []) {
      out.push({
        repo: repo.repo,
        url: repo.url,
        archived: repo.archived,
        ...det
      })
    }
  }
  return out.sort((a, b) => {
    if (a.outdated !== b.outdated) return a.outdated ? -1 : 1
    return a.repo.localeCompare(b.repo)
  })
})

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    if (frameworkFilter.value && row.framework !== frameworkFilter.value) return false
    if (statusFilter.value === 'outdated' && !row.outdated) return false
    if (statusFilter.value === 'uptodate' && row.outdated) return false
    return true
  })
})

const outdatedCount = computed(() => rows.value.filter((r) => r.outdated).length)

const frameworkBadgeClass = (framework) => {
  if (framework === 'Nuxt') return 'bg-emerald-100 text-emerald-800'
  if (framework === 'AdonisJS') return 'bg-violet-100 text-violet-800'
  if (framework === 'Laravel') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-700'
}

const formatScanTime = (iso) => {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const refreshCacheFlag = () => {
  if (!import.meta.client) return
  hasCache.value = !!localStorage.getItem(CACHE_KEY)
}

const readCache = () => {
  if (!import.meta.client) return null
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      refreshCacheFlag()
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(CACHE_KEY)
    refreshCacheFlag()
    return null
  }
}

const writeCache = (payload) => {
  if (!import.meta.client) return
  localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), payload }))
  refreshCacheFlag()
}

const applyPayload = (payload, source) => {
  repos.value = payload?.repos || []
  totalScanned.value = payload?.totalScanned || 0
  scannedAt.value = payload?.scannedAt || ''
  cacheStatus.value = source
}

const fetchFrameworks = async (allowCache = true) => {
  errorMessage.value = ''
  hasSearched.value = true

  if (allowCache) {
    const cached = readCache()
    if (cached?.payload) {
      applyPayload(cached.payload, `Showing cached scan (saved ${formatScanTime(new Date(cached.savedAt).toISOString())}).`)
      return
    }
  }

  loading.value = true
  try {
    const { data, error } = await useFetch('/api/frameworks', { key: `frameworks-${Date.now()}` })
    if (error.value) throw error.value
    const payload = data.value
    if (payload?.error) throw new Error(payload.error)
    applyPayload(payload, 'Showing fresh scan results.')
    writeCache(payload)
  } catch (err) {
    repos.value = []
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
    cacheStatus.value = 'No cached data loaded yet.'
  } finally {
    loading.value = false
  }
}

const clearCache = () => {
  if (!import.meta.client) return
  localStorage.removeItem(CACHE_KEY)
  refreshCacheFlag()
  cacheStatus.value = 'Cache cleared.'
}

onMounted(() => {
  refreshCacheFlag()
  const cached = readCache()
  if (cached?.payload) {
    hasSearched.value = true
    applyPayload(cached.payload, `Showing cached scan (saved ${formatScanTime(new Date(cached.savedAt).toISOString())}).`)
  }
})
</script>
