<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                class="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500"
              >
            </label>

            <label v-if="hasResults" class="flex min-w-44 flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Contributor</span>
              <select
                v-model="selectedUser"
                class="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500"
              >
                <option value="">All contributors</option>
                <option v-for="user in sortedUsers" :key="user" :value="user">{{ user }}</option>
              </select>
            </label>

            <button
              class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="loading"
              @click="fetchCommits"
            >
              <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? 'Loading' : 'Load commits' }}
            </button>
          </div>
        </div>

        <div class="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div class="bg-slate-50 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Contributors</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.contributors }}</p>
          </div>
          <div class="bg-slate-50 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Commits</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.commits }}</p>
          </div>
          <div class="bg-slate-50 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Repositories</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.projects }}</p>
          </div>
        </div>
      </section>

      <section v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
          class="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm"
        >
          Pick a month and load commits.
        </div>

        <div
          v-else-if="hasSearched && !hasResults && !loading"
          class="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm"
        >
          No commits found for {{ monthLabel }}.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="(commits, user) in filteredCommits"
            :key="user"
            class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-100"
              @click="toggleAuthor(user)"
            >
              <div class="min-w-0">
                <h2 class="truncate text-base font-semibold text-slate-950">{{ user }}</h2>
                <p class="text-xs text-slate-500">{{ commits.length }} {{ commits.length === 1 ? 'commit' : 'commits' }}</p>
              </div>
              <span
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform"
                :class="isAuthorOpen(user) ? 'rotate-180' : ''"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <div v-if="isAuthorOpen(user)" class="border-t border-slate-200 bg-white px-4 py-3">
              <ul class="space-y-2">
                <li
                  v-for="commit in commits"
                  :key="`${commit.project}-${commit.hash}-${commit.date}`"
                  class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <a
                          :href="commit.url"
                          target="_blank"
                          rel="noreferrer"
                          class="text-xs font-semibold text-sky-700 hover:text-sky-800"
                        >
                          {{ commit.hash }}
                        </a>
                        <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
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
import { computed, ref } from 'vue'

const pad = (value) => `${value}`.padStart(2, '0')

const currentDate = new Date()
const selectedMonth = ref(`${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`)
const commitsData = ref({})
const loading = ref(false)
const selectedUser = ref('')
const errorMessage = ref('')
const hasSearched = ref(false)
const openAuthors = ref([])

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

const fetchCommits = async () => {
  if (!monthRange.value.from || !monthRange.value.to) {
    errorMessage.value = 'Please select a month.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  hasSearched.value = true

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

    commitsData.value = payload || {}
    selectedUser.value = ''
    openAuthors.value = sortedUsers.value.length ? [sortedUsers.value[0]] : []
  } catch (error) {
    commitsData.value = {}
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred.'
    openAuthors.value = []
  } finally {
    loading.value = false
  }
}

const sortedUsers = computed(() => Object.keys(commitsData.value).sort())

const filteredCommits = computed(() => {
  if (!selectedUser.value) return commitsData.value
  return { [selectedUser.value]: commitsData.value[selectedUser.value] || [] }
})

const hasResults = computed(() => sortedUsers.value.length > 0)

const stats = computed(() => {
  const commits = Object.values(commitsData.value).flat()
  return {
    contributors: sortedUsers.value.length,
    commits: commits.length,
    projects: new Set(commits.map((commit) => commit.project)).size
  }
})

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

const isAuthorOpen = (user) => openAuthors.value.includes(user)

const toggleAuthor = (user) => {
  if (openAuthors.value.includes(user)) {
    openAuthors.value = openAuthors.value.filter((author) => author !== user)
    return
  }

  openAuthors.value = [...openAuthors.value, user]
}
</script>
