<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <section class="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">AWS S3</p>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-950">Backups</h1>
            <p class="text-sm text-slate-600">
              Daily project backups stored, newest first.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label v-if="hasData" class="flex min-w-52 flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Search project</span>
              <input
                v-model.trim="projectSearch"
                type="text"
                placeholder="Filter by project name"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:bg-white"
              >
            </label>

            <button
              class="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="loading"
              @click="fetchBackups"
            >
              <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? 'Loading' : 'Refresh' }}
            </button>
          </div>
        </div>

        <div class="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div class="bg-sky-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Projects</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.projects }}</p>
          </div>
          <div class="bg-indigo-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Backup files</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.backups }}</p>
          </div>
          <div class="bg-emerald-50/80 px-4 py-3">
            <p class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Total size</p>
            <p class="mt-1 text-lg font-semibold text-slate-950">{{ stats.totalSize }}</p>
          </div>
        </div>

        <div v-if="hasData" class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
          <p>{{ dataStatus }}</p>
          <p>{{ filteredProjects.length }} of {{ stats.projects }} shown</p>
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
            Fetching backups from S3...
          </div>
        </div>

        <div
          v-if="!hasData && !loading && !errorMessage"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          Loading backups…
        </div>

        <div
          v-else-if="hasData && filteredProjects.length === 0 && !loading"
          class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
        >
          No projects match "{{ projectSearch }}".
        </div>

        <div v-else-if="filteredProjects.length > 0" class="flex flex-wrap items-center justify-between gap-2">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-3 w-3 text-slate-400">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 4.25a.75.75 0 0 0-1.5 0v3c0 .27.144.52.378.655l2 1.155a.75.75 0 0 0 .744-1.3L8.75 7.655V5.25Z" />
            </svg>
            Sorted by
            <span class="font-semibold text-sky-600">project name</span>
          </div>
          <button
            type="button"
            class="text-xs font-medium text-sky-700 transition hover:text-sky-900"
            @click="toggleAll"
          >
            {{ allOpen ? 'Collapse all' : 'Expand all' }}
          </button>
        </div>

        <div v-if="filteredProjects.length > 0" class="space-y-3">
          <article
            v-for="project in filteredProjects"
            :key="project.name"
            class="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/60"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50/70"
              @click="toggleProject(project.name)"
            >
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                  <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h4.586a.75.75 0 0 1 .53.22L14.47 7.31a.75.75 0 0 0 .53.22H18A2.25 2.25 0 0 1 20.25 9.75v9A2.25 2.25 0 0 1 18 21H6a2.25 2.25 0 0 1-2.25-2.25v-12.75ZM6 5.25A.75.75 0 0 0 5.25 6v12.75c0 .414.336.75.75.75h12a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 1-.53-.22L9.97 6.03a.75.75 0 0 0-.53-.22H6Z" />
                </svg>
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <h2 class="truncate text-base font-semibold text-slate-950">{{ project.name }}</h2>
                  <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {{ project.count }} {{ project.count === 1 ? 'backup' : 'backups' }}
                  </span>
                  <span
                    v-if="projectLatest(project)"
                    class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  >
                    Latest {{ formatDate(projectLatest(project).date) }}
                  </span>
                  <span
                    v-if="missingBadge(project)"
                    class="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                  >
                    {{ missingBadge(project) }}
                  </span>
                </span>
                <span class="mt-1 block pl-0.5 text-xs text-slate-500">
                  {{ formatSize(project.totalSize) }} total
                </span>
              </span>

              <span
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform"
                :class="isOpen(project.name) ? 'rotate-180' : ''"
                aria-hidden="true"
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

            <div v-if="isOpen(project.name)" class="border-t border-slate-200 bg-white/95 px-4 py-3">
              <ul class="space-y-2">
                <li
                  v-for="range in missingRanges(project)"
                  :key="`missing-${range.from}`"
                  class="flex flex-col gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  :class="range.includesToday ? 'border-rose-300 bg-rose-100/90' : 'border-rose-200 bg-rose-50/90'"
                >
                  <div class="flex min-w-0 items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true">
                      <path
                        fill-rule="evenodd"
                        d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div class="min-w-0">
                      <time
                        class="block truncate text-sm font-medium"
                        :class="range.includesToday ? 'text-rose-900' : 'text-rose-700'"
                        :datetime="`${range.from}T00:00:00Z`"
                        :title="rangeLabel(range)"
                      >
                        {{ rangeLabel(range) }}
                      </time>
                      <p class="truncate text-[11px] text-rose-500">
                        {{ range.count }} {{ range.count === 1 ? 'day' : 'days' }} without a backup
                      </p>
                    </div>
                  </div>
                  <span
                    class="shrink-0 text-[11px] font-bold uppercase tracking-wide sm:pl-2"
                    :class="range.includesToday ? 'text-rose-600' : 'text-rose-500'"
                  >
                    {{ range.includesToday ? 'Missing today' : 'Missing' }}
                  </span>
                </li>
                <li
                  v-for="backup in project.backups"
                  :key="backup.key"
                  class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/85 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div class="flex min-w-0 items-center gap-2.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true">
                      <path d="M1.8 2.8A1.75 1.75 0 0 1 3.55 1.5h3.6c.4 0 .785.16 1.068.444l1.53 1.53c.13.13.306.203.49.203h5.26a1.75 1.75 0 0 1 1.75 1.75v1.05h.16a1.75 1.75 0 0 1 1.733 2.104l-1.1 5.6a1.75 1.75 0 0 1-1.733 1.396H5.42a1.75 1.75 0 0 1-1.733-1.396l-1.1-5.6A1.75 1.75 0 0 1 4.32 7.23H4V4.55c0-.96.8-1.75 1.75-1.75H5.53a.5.5 0 0 1 .35.15l1.53 1.53c.13.13.306.203.49.203h3.6a.5.5 0 0 0 0-1H8.2c-.09 0-.18-.128 0-.306ZM1.9 4.95h.6v4.05h7.02a2 2 0 0 1 1.94 1.5.5.5 0 0 0 .48.365h.003A1.5 1.5 0 0 1 13.44 9.67l.13-.65a2 2 0 0 1 1.95-1.52h.1v-.45a.75.75 0 0 0-.75-.75H8.2a1.75 1.75 0 0 1-1.243-.515L5.517 3.507a.25.25 0 0 0-.177-.073h-.59a.75.75 0 0 0-.75.75v.766Zm4 4.8v2.25a.75.75 0 0 0 1.5 0V9.75a.75.75 0 0 0-1.5 0Zm2.25-.75a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V9.75a.75.75 0 0 1 .75-.75Zm3.75.75v2.25a.75.75 0 0 0 1.5 0V9.75a.75.75 0 0 0-1.5 0Z" />
                    </svg>
                    <div class="min-w-0">
                      <time
                        class="block truncate text-sm font-medium text-slate-900"
                        :datetime="backup.iso"
                        :title="`${backup.date} ${backup.time}`"
                      >
                        {{ formatDate(backup.date) }} · {{ formatTime(backup.time) }}
                      </time>
                      <p class="truncate text-[11px] text-slate-500">{{ backup.file }}</p>
                    </div>
                  </div>
                  <span class="shrink-0 text-xs font-semibold text-slate-600 sm:pl-2">{{ formatSize(backup.size) }}</span>
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

const projects = ref([])
const openProjects = ref([])
const projectSearch = ref('')
const loading = ref(false)
const errorMessage = ref('')
const dataStatus = ref('')
const hasData = ref(false)
const today = ref('')

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fetchBackups = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    const payload = await $fetch('/api/backups')
    if (payload?.error) throw new Error(payload.error)
    projects.value = payload?.projects || []
    today.value = payload?.today || localToday()
    hasData.value = true
    dataStatus.value = `Synced with S3 at ${formatDateTime(payload?.listedAt || '')}.`
  } catch (err) {
    projects.value = []
    hasData.value = false
    errorMessage.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
    dataStatus.value = ''
  } finally {
    loading.value = false
  }
}

const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  const query = projectSearch.value.toLowerCase()
  return projects.value.filter((project) => project.name.toLowerCase().includes(query))
})

const stats = computed(() => ({
  projects: projects.value.length,
  backups: projects.value.reduce((sum, project) => sum + project.count, 0),
  totalSize: formatSize(projects.value.reduce((sum, project) => sum + project.totalSize, 0))
}))

const isOpen = (name) => openProjects.value.includes(name)

const toggleProject = (name) => {
  openProjects.value = isOpen(name)
    ? openProjects.value.filter((p) => p !== name)
    : [...openProjects.value, name]
}

const toggleAll = () => {
  if (allOpen.value) {
    openProjects.value = []
  } else {
    openProjects.value = filteredProjects.value.map((project) => project.name)
  }
}

const allOpen = computed(() => filteredProjects.value.length > 0 && openProjects.value.length === filteredProjects.value.length)

const projectLatest = (project) => (project.count > 0 ? project.backups[0] : null)

const pad = (value) => `${value}`.padStart(2, '0')

const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day + days))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

const dayDiff = (from, to) => {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

const missingRanges = (project) => {
  if (!today.value || project.backups.length === 0) return []

  const dates = new Set(project.backups.map((backup) => backup.date))
  const start = [...dates].sort()[0]
  const end = today.value
  if (start > end) return []

  const ranges = []
  let current = null
  let d = start
  while (d <= end) {
    if (!dates.has(d)) {
      if (current && addDays(current.to, 1) === d) {
        current.to = d
      } else {
        current = { from: d, to: d }
        ranges.push(current)
      }
    }
    d = addDays(d, 1)
  }

  return ranges.map((range) => ({
    from: range.from,
    to: range.to,
    count: dayDiff(range.from, range.to) + 1,
    includesToday: range.to === end
  }))
}

const missingBadge = (project) => {
  const ranges = missingRanges(project)
  if (ranges.length === 0) return ''
  if (ranges.some((range) => range.includesToday)) return 'Missing today'
  const total = ranges.reduce((sum, range) => sum + range.count, 0)
  return `${total} missing ${total === 1 ? 'day' : 'days'}`
}

const rangeLabel = (range) => {
  if (range.from === range.to) return formatDate(range.from)
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return timeStr.length >= 5 && timeStr.endsWith(':00') ? timeStr.slice(0, 5) : timeStr
}

const formatDateTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

onMounted(fetchBackups)
</script>