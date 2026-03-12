<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <section class="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">GitHub activity</p>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-950">Monthly commit overview</h1>
            <p class="text-sm text-slate-600">
              Browse per-contributor feed for {{ monthLabel }}.
            </p>
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

            <label v-if="hasResults" class="flex min-w-44 flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Contributor</span>
              <select
                v-model="selectedUser"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              >
                <option value="">All contributors</option>
                <option v-for="user in rankedUsers" :key="user" :value="user">{{ user }}</option>
              </select>
            </label>

            <button
              class="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="loading"
              @click="fetchCommits"
            >
              <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? 'Loading' : 'Load commits' }}
            </button>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading || cacheEntryCount === 0"
              @click="clearCache"
            >
              Clear cache
            </button>
          </div>
        </div>

        <div class="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div class="bg-sky-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Contributors</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.contributors }}</p>
          </div>
          <div class="bg-indigo-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Commits</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.commits }}</p>
          </div>
          <div class="bg-emerald-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Repositories</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.projects }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
          <p>{{ cacheStatus }}</p>
          <p>{{ cacheEntryCount }} cached {{ cacheEntryCount === 1 ? 'month' : 'months' }}</p>
        </div>
      </section>

      <section v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm shadow-rose-100/80">
        {{ errorMessage }}
      </section>

      <section class="relative">
        <label v-if="hasResults" class="flex min-w-52 flex-col gap-1 mb-3">
          <input v-model.trim="authorSearch" type="text" placeholder="Search author name"
            class="h-10 rounded-xl border border-slate-300 bg-white/95 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white">
        </label>

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
          v-else-if="hasSearched && !hasResults && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          No commits found for {{ monthLabel }}.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="(commits, user) in filteredCommits"
            :key="user"
            class="overflow-hidden rounded-2xl border shadow-sm"
            :class="getAuthorCardClass(user)"
          >
            <div class="flex items-center gap-3 px-4 py-3" :class="getAuthorHoverClass(user)">
              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                @click="toggleAuthor(user)"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold"
                    :class="getAuthorRankPillClass(user)"
                  >
                    #{{ getAuthorRank(user) }}
                  </span>
                  <h2 class="truncate text-base font-semibold text-slate-950">{{ user }}</h2>
                  <span
                    v-if="getAuthorRank(user) <= 3"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    :class="getAuthorBadgeClass(user)"
                  >
                    {{ getAuthorBadgeLabel(user) }}
                  </span>
                </div>
                <p class="text-xs text-slate-500">{{ commits.length }} {{ commits.length === 1 ? 'commit' : 'commits' }}</p>
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                  :aria-label="`Toggle analytics for ${user}`"
                  @click.stop="toggleAnalytics(user)"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                    <path d="M3 16.25A1.25 1.25 0 0 1 4.25 15h11.5a.75.75 0 0 1 0 1.5H4.25A1.25 1.25 0 0 1 3 16.25Zm1-3.5A1.25 1.25 0 0 1 5.25 11.5h1.5A1.25 1.25 0 0 1 8 12.75v2a.75.75 0 0 1-1.5 0V13H5.5v1.75a.75.75 0 0 1-1.5 0v-2Zm4.75-4A1.25 1.25 0 0 1 10 7.5h1.5a1.25 1.25 0 0 1 1.25 1.25v6a.75.75 0 0 1-1.5 0V9H10.25v5.75a.75.75 0 0 1-1.5 0v-6Zm4.75-3A1.25 1.25 0 0 1 14.75 4.5h1.5a1.25 1.25 0 0 1 1.25 1.25v9a.75.75 0 0 1-1.5 0V6H15v8.75a.75.75 0 0 1-1.5 0v-9Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform"
                  :class="isAuthorOpen(user) ? 'rotate-180' : ''"
                  :aria-label="`Toggle commits for ${user}`"
                  @click="toggleAuthor(user)"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                    <path
                      fill-rule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              v-if="isAnalyticsOpen(user)"
              class="grid gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 sm:grid-cols-5"
            >
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Commits</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ getAuthorAnalytics(user).commits }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Projects</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ getAuthorAnalytics(user).projects }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Lines added</p>
                <button
                  v-if="!authorStats[user] && !isStatsLoading(user)"
                  class="mt-1 text-sm font-semibold text-sky-600 hover:text-sky-800"
                  @click.stop="fetchAuthorStats(user)"
                >
                  View
                </button>
                <p v-else class="mt-1 text-sm font-semibold text-emerald-600">
                  <span v-if="isStatsLoading(user)" class="inline-block h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
                  <span v-else>{{ getAuthorAnalytics(user).additions }}</span>
                </p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Lines deleted</p>
                <button
                  v-if="!authorStats[user] && !isStatsLoading(user)"
                  class="mt-1 text-sm font-semibold text-sky-600 hover:text-sky-800"
                  @click.stop="fetchAuthorStats(user)"
                >
                  View
                </button>
                <p v-else class="mt-1 text-sm font-semibold text-rose-600">
                  <span v-if="isStatsLoading(user)" class="inline-block h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
                  <span v-else>{{ getAuthorAnalytics(user).deletions }}</span>
                </p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Latest commit</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ getAuthorAnalytics(user).latestCommit }}</p>
              </div>
            </div>

            <div v-if="isAuthorOpen(user)" class="border-t border-slate-200 bg-white/95 px-4 py-3">
              <ul class="space-y-2">
                <li
                  v-for="commit in commits"
                  :key="`${commit.project}-${commit.hash}-${commit.date}`"
                  class="rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <a
                          :href="commit.url"
                          target="_blank"
                          rel="noreferrer"
                          class="text-xs font-semibold text-sky-700 hover:text-sky-900"
                        >
                          {{ commit.hash }}
                        </a>
                        <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          {{ commit.project }}
                        </span>
                      </div>
                      <p class="mt-1 line-clamp-2 text-sm leading-5 text-slate-800">{{ commit.message }}</p>
                    </div>
                    <time class="shrink-0 text-xs text-slate-500" :datetime="commit.date">
                      {{ formatDate(commit.date) }}
                    </time>
                  </div>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const pad = (value) => `${value}`.padStart(2, '0')
const CACHE_PREFIX = 'github-commits-cache:v1:'

const currentDate = new Date()
const selectedMonth = ref(`${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`)
const commitsData = ref({})
const loading = ref(false)
const selectedUser = ref('')
const authorSearch = ref('')
const errorMessage = ref('')
const hasSearched = ref(false)
const openAuthors = ref([])
const analyticsAuthors = ref([])
const authorStats = ref({})
const statsLoading = ref([])
const cacheStatus = ref('No cached data loaded yet.')
const cacheEntryCount = ref(0)

const monthRange = computed(() => {
  if (!selectedMonth.value) {
    return { from: '', to: '' }
  }

  const [year, month] = selectedMonth.value.split('-').map(Number)
  const fromDate = new Date(year, month - 1, 1)
  const toDate = new Date(year, month, 0)

  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to: `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`
  }
})

const getCacheKey = (month) => `${CACHE_PREFIX}${month}`

const refreshCacheCount = () => {
  if (!import.meta.client) return
  cacheEntryCount.value = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX)).length
}

const applyCommits = (payload, source) => {
  commitsData.value = payload || {}
  selectedUser.value = ''
  authorSearch.value = ''

  const users = Object.keys(commitsData.value).sort((left, right) => {
    const commitDiff = (commitsData.value[right]?.length || 0) - (commitsData.value[left]?.length || 0)
    return commitDiff || left.localeCompare(right)
  })
  openAuthors.value = []
  analyticsAuthors.value = []
  authorStats.value = {}
  cacheStatus.value = source
}

const readCachedCommits = (month) => {
  if (!import.meta.client) return null

  const cached = localStorage.getItem(getCacheKey(month))
  if (!cached) return null

  try {
    return JSON.parse(cached)
  } catch {
    localStorage.removeItem(getCacheKey(month))
    refreshCacheCount()
    return null
  }
}

const writeCachedCommits = (month, payload) => {
  if (!import.meta.client) return
  localStorage.setItem(getCacheKey(month), JSON.stringify(payload))
  refreshCacheCount()
}

const fetchCommits = async () => {
  if (!monthRange.value.from || !monthRange.value.to) {
    errorMessage.value = 'Please select a month.'
    return
  }

  errorMessage.value = ''
  hasSearched.value = true

  const cachedPayload = readCachedCommits(selectedMonth.value)
  if (cachedPayload) {
    applyCommits(cachedPayload, `Showing cached results for ${monthLabel.value}.`)
    return
  }

  loading.value = true

  try {
    const { data, error } = await useFetch('/api/commits', {
      query: monthRange.value
    })

    if (error.value) {
      throw error.value
    }

    const payload = data.value
    if (payload?.error) {
      throw new Error(payload.error)
    }

    applyCommits(payload, `Showing live results for ${monthLabel.value}.`)
    writeCachedCommits(selectedMonth.value, payload || {})
  } catch (error) {
    commitsData.value = {}
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred.'
    openAuthors.value = []
    analyticsAuthors.value = []
    authorStats.value = {}
    cacheStatus.value = 'No cached data loaded yet.'
  } finally {
    loading.value = false
  }
}

const rankedUsers = computed(() =>
  Object.keys(commitsData.value).sort((left, right) => {
    const commitDiff = (commitsData.value[right]?.length || 0) - (commitsData.value[left]?.length || 0)
    return commitDiff || left.localeCompare(right)
  })
)

const filteredCommits = computed(() => {
  let users = rankedUsers.value

  if (selectedUser.value) {
    users = users.filter((user) => user === selectedUser.value)
  }

  if (authorSearch.value) {
    const query = authorSearch.value.toLowerCase()
    users = users.filter((user) => user.toLowerCase().includes(query))
  }

  return Object.fromEntries(
    users.map((user) => [user, commitsData.value[user] || []])
  )
})

const hasResults = computed(() => rankedUsers.value.length > 0)

const stats = computed(() => {
  const commits = Object.values(commitsData.value).flat()
  return {
    contributors: rankedUsers.value.length,
    commits: commits.length,
    projects: new Set(commits.map((commit) => commit.project)).size
  }
})

const topAuthor = computed(() => rankedUsers.value[0] || '')

const monthLabel = computed(() => {
  if (!selectedMonth.value) return 'the selected month'

  const [year, month] = selectedMonth.value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
})

const formatDate = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getAuthorAnalytics = (user) => {
  const commits = commitsData.value[user] || []
  const latestCommit = commits.reduce((latest, commit) => {
    if (!latest) return commit
    return new Date(commit.date) > new Date(latest.date) ? commit : latest
  }, null)

  const stats = authorStats.value[user] || {}

  return {
    commits: commits.length,
    projects: new Set(commits.map((commit) => commit.project)).size,
    additions: stats.additions || 0,
    deletions: stats.deletions || 0,
    latestCommit: latestCommit ? formatDate(latestCommit.date) : 'No activity'
  }
}

const getAuthorRank = (user) => rankedUsers.value.indexOf(user) + 1

const getAuthorBadgeLabel = (user) => {
  const rank = getAuthorRank(user)
  if (rank === 1) return 'Top Contributor'
  if (rank === 2) return '2nd Place'
  if (rank === 3) return '3rd Place'
  return ''
}

const getAuthorCardClass = (user) => {
  const rank = getAuthorRank(user)
  if (rank === 1) return 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-amber-100'
  if (rank === 2) return 'border-sky-300 bg-gradient-to-r from-sky-100 to-cyan-50 shadow-sky-100'
  if (rank === 3) return 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-emerald-100'
  return 'border-slate-200 bg-white/95 shadow-slate-200/60'
}

const getAuthorHoverClass = (user) => {
  const rank = getAuthorRank(user)
  if (rank === 1) return 'hover:bg-amber-100/70'
  if (rank === 2) return 'hover:bg-sky-100/80'
  if (rank === 3) return 'hover:bg-emerald-100/80'
  return 'hover:bg-sky-50/70'
}

const getAuthorRankPillClass = (user) => {
  const rank = getAuthorRank(user)
  if (rank === 1) return 'bg-amber-200 text-amber-900'
  if (rank === 2) return 'bg-sky-200 text-sky-900'
  if (rank === 3) return 'bg-emerald-200 text-emerald-900'
  return 'bg-sky-100 text-sky-700'
}

const getAuthorBadgeClass = (user) => {
  const rank = getAuthorRank(user)
  if (rank === 1) return 'bg-amber-200 text-amber-900'
  if (rank === 2) return 'bg-sky-200 text-sky-900'
  if (rank === 3) return 'bg-emerald-200 text-emerald-900'
  return ''
}

const isAuthorOpen = (user) => openAuthors.value.includes(user)

const toggleAuthor = (user) => {
  if (openAuthors.value.includes(user)) {
    openAuthors.value = openAuthors.value.filter((author) => author !== user)
    return
  }

  openAuthors.value = [...openAuthors.value, user]
}

const isAnalyticsOpen = (user) => analyticsAuthors.value.includes(user)

const fetchAuthorStats = async (user) => {
  if (authorStats.value[user] || statsLoading.value.includes(user)) return

  statsLoading.value = [...statsLoading.value, user]

  try {
    const { data } = await useFetch('/api/commit-stats', {
      method: 'POST',
      body: {
        commits: commitsData.value[user] || []
      }
    })

    if (data.value && !data.value.error) {
      const stats = data.value
      let totalAdditions = 0
      let totalDeletions = 0

      for (const commit of commitsData.value[user] || []) {
        const key = `${commit.project}-${commit.hash}`
        if (stats[key]) {
          totalAdditions += stats[key].additions || 0
          totalDeletions += stats[key].deletions || 0
        }
      }

      authorStats.value[user] = {
        additions: totalAdditions,
        deletions: totalDeletions
      }
    }
  } catch (e) {
    console.error('Failed to fetch author stats:', e)
  } finally {
    statsLoading.value = statsLoading.value.filter((u) => u !== user)
  }
}

const toggleAnalytics = async (user) => {
  if (analyticsAuthors.value.includes(user)) {
    analyticsAuthors.value = analyticsAuthors.value.filter((author) => author !== user)
    return
  }

  analyticsAuthors.value = [...analyticsAuthors.value, user]
}

const isStatsLoading = (user) => statsLoading.value.includes(user)

const clearCache = () => {
  if (!import.meta.client) return

  Object.keys(localStorage)
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .forEach((key) => localStorage.removeItem(key))

  refreshCacheCount()
  cacheStatus.value = 'Cache cleared.'
}

onMounted(() => {
  refreshCacheCount()
})
</script>
