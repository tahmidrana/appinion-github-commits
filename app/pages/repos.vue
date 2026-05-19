<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <section class="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">GitHub activity</p>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-950">Repository leaderboard</h1>
            <p class="text-sm text-slate-600">Repos ranked by commit count for {{ monthLabel }}.</p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="flex min-w-44 flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Month</span>
              <input
                v-model="selectedMonth"
                type="month"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              >
            </label>

            <button
              class="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="loading"
              @click="fetchCommits"
            >
              <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? 'Loading' : 'Load commits' }}
            </button>
          </div>
        </div>

        <div class="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div class="bg-sky-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Repositories</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ rankedRepos.length }}</p>
          </div>
          <div class="bg-indigo-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Total commits</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ totalCommits }}</p>
          </div>
          <div class="bg-emerald-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Contributors</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ totalContributors }}</p>
          </div>
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
            Loading commits...
          </div>
        </div>

        <div
          v-if="!hasSearched && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          Pick a month and load commits.
        </div>

        <div
          v-else-if="hasSearched && rankedRepos.length === 0 && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          No commits found for {{ monthLabel }}.
        </div>

        <div v-else-if="rankedRepos.length > 0" class="space-y-3">
          <article
            v-for="(repo, index) in rankedRepos"
            :key="repo.name"
            class="overflow-hidden rounded-2xl border shadow-sm"
            :class="rankCardClass(index + 1)"
          >
            <div class="flex items-center gap-3 px-4 py-3" :class="rankHoverClass(index + 1)">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold"
                    :class="rankPillClass(index + 1)"
                  >
                    #{{ index + 1 }}
                  </span>
                  <h2 class="truncate text-base font-semibold text-slate-950">{{ repo.name }}</h2>
                  <span
                    v-if="index < 3"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    :class="rankBadgeClass(index + 1)"
                  >
                    {{ index === 0 ? 'Most active' : index === 1 ? '2nd Place' : '3rd Place' }}
                  </span>
                </div>
                <p class="mt-1 pl-1 text-xs text-slate-500">
                  {{ repo.commits }} {{ repo.commits === 1 ? 'commit' : 'commits' }} · {{ repo.contributors.length }} {{ repo.contributors.length === 1 ? 'contributor' : 'contributors' }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-slate-200 bg-white/95 px-4 py-3">
              <span
                v-for="(contributor, ci) in repo.contributors"
                :key="contributor.name"
                class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                :class="ci === 0
                  ? 'border-amber-300 bg-amber-100 text-amber-900'
                  : 'border-slate-200 bg-slate-100 text-slate-700'"
              >
                {{ contributor.name }}
                <span :class="ci === 0 ? 'text-amber-500' : 'text-slate-400'">·</span>
                <span class="font-semibold">{{ contributor.commits }}</span>
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'

const pad = (value) => `${value}`.padStart(2, '0')
const CACHE_PREFIX = 'github-commits-cache:v1:'

const currentDate = new Date()
const selectedMonth = ref(`${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`)
const commitsData = ref({})
const loading = ref(false)
const errorMessage = ref('')
const hasSearched = ref(false)

const monthRange = computed(() => {
  if (!selectedMonth.value) return { from: '', to: '' }
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const fromDate = new Date(year, month - 1, 1)
  const toDate = new Date(year, month, 0)
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to: `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`
  }
})

const monthLabel = computed(() => {
  if (!selectedMonth.value) return 'the selected month'
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

const rankedRepos = computed(() => {
  const repoMap = {}
  for (const [author, commits] of Object.entries(commitsData.value)) {
    for (const commit of commits) {
      if (!repoMap[commit.project]) repoMap[commit.project] = { name: commit.project, commits: 0, authorMap: {} }
      repoMap[commit.project].commits++
      repoMap[commit.project].authorMap[author] = (repoMap[commit.project].authorMap[author] || 0) + 1
    }
  }
  return Object.values(repoMap)
    .map((r) => ({
      name: r.name,
      commits: r.commits,
      contributors: Object.entries(r.authorMap)
        .map(([name, commits]) => ({ name, commits }))
        .sort((a, b) => b.commits - a.commits)
    }))
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name))
})

const totalCommits = computed(() => rankedRepos.value.reduce((sum, r) => sum + r.commits, 0))
const totalContributors = computed(() => new Set(Object.keys(commitsData.value)).size)

const getCacheKey = (month) => `${CACHE_PREFIX}${month}`

const fetchCommits = async () => {
  if (!monthRange.value.from || !monthRange.value.to) {
    errorMessage.value = 'Please select a month.'
    return
  }

  errorMessage.value = ''
  hasSearched.value = true

  if (import.meta.client) {
    const cached = localStorage.getItem(getCacheKey(selectedMonth.value))
    if (cached) {
      try {
        commitsData.value = JSON.parse(cached)
        return
      } catch {
        localStorage.removeItem(getCacheKey(selectedMonth.value))
      }
    }
  }

  loading.value = true
  try {
    const { data, error } = await useFetch('/api/commits', { query: monthRange.value })
    if (error.value) throw error.value
    const payload = data.value
    if (payload?.error) throw new Error(payload.error)
    commitsData.value = payload || {}
    if (import.meta.client) localStorage.setItem(getCacheKey(selectedMonth.value), JSON.stringify(payload || {}))
  } catch (err) {
    commitsData.value = {}
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
  } finally {
    loading.value = false
  }
}

const rankCardClass = (rank) => {
  if (rank === 1) return 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-amber-100'
  if (rank === 2) return 'border-sky-300 bg-gradient-to-r from-sky-100 to-cyan-50 shadow-sky-100'
  if (rank === 3) return 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-emerald-100'
  return 'border-slate-200 bg-white/95 shadow-slate-200/60'
}

const rankHoverClass = (rank) => {
  if (rank === 1) return 'hover:bg-amber-100/70'
  if (rank === 2) return 'hover:bg-sky-100/80'
  if (rank === 3) return 'hover:bg-emerald-100/80'
  return 'hover:bg-sky-50/70'
}

const rankPillClass = (rank) => {
  if (rank === 1) return 'bg-amber-200 text-amber-900'
  if (rank === 2) return 'bg-sky-200 text-sky-900'
  if (rank === 3) return 'bg-emerald-200 text-emerald-900'
  return 'bg-slate-100 text-slate-600'
}

const rankBadgeClass = (rank) => {
  if (rank === 1) return 'bg-amber-200 text-amber-900'
  if (rank === 2) return 'bg-sky-200 text-sky-900'
  if (rank === 3) return 'bg-emerald-200 text-emerald-900'
  return ''
}
</script>
