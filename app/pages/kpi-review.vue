<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 text-slate-900">
    <div class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
      <!-- Controls -->
      <section class="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/70">
        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700">AI code review</p>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-950">KPI Review with AI</h1>
            <p class="text-sm text-slate-600">
              Pick a date range, then review each team member's commits one by one against their KPI rubric.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">From</span>
              <input
                v-model="fromDate"
                type="date"
                :disabled="running"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
              >
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs font-medium uppercase tracking-wide text-slate-500">To</span>
              <input
                v-model="toDate"
                type="date"
                :disabled="running"
                class="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-60"
              >
            </label>

            <button
              v-if="!running"
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-700 px-4 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              @click="startReview"
            >
              Start review
            </button>
            <button
              v-else
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              @click="cancelReview"
            >
              Cancel
            </button>

            <button
              v-if="canDownload"
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
              :disabled="downloading"
              @click="downloadExcel"
            >
              <span v-if="downloading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ downloading ? 'Preparing…' : 'Download Excel' }}
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div v-if="total > 0" class="border-t border-slate-200 px-4 py-3">
          <div class="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>
              <span v-if="running && currentName">Reviewing <span class="font-semibold text-slate-800">{{ currentName }}</span>…</span>
              <span v-else-if="status === 'done'" class="font-semibold text-emerald-700">All members reviewed.</span>
              <span v-else-if="status === 'cancelled'" class="font-semibold text-rose-600">Review cancelled.</span>
              <span v-else-if="status === 'error'" class="font-semibold text-rose-600">Review failed.</span>
            </span>
            <span>{{ reviews.length }} / {{ total }}</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-indigo-600 transition-all"
              :style="{ width: `${total ? (reviews.length / total) * 100 : 0}%` }"
            />
          </div>
        </div>
      </section>

      <section v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm shadow-rose-100/80">
        {{ errorMessage }}
      </section>

      <!-- Diagnostic: actual GitHub author identities found in the range. -->
      <details v-if="authorsFound.length" class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-sm shadow-slate-200/70">
        <summary class="cursor-pointer font-medium text-slate-700">
          GitHub authors found in this range ({{ authorsFound.length }})
          <span class="font-normal text-slate-400">— if a member shows no commits, add their exact author name to <code class="text-slate-600">aliases</code> in teamConfig.ts</span>
        </summary>
        <ul class="mt-2 grid gap-1 sm:grid-cols-2">
          <li v-for="a in authorsFound" :key="`${a.name}|${a.login}`" class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
            <span class="truncate text-slate-700">
              <span class="font-medium">{{ a.name || '(no name)' }}</span>
              <span v-if="a.login" class="text-slate-400"> · @{{ a.login }}</span>
            </span>
            <span class="shrink-0 text-xs text-slate-500">{{ a.count }}</span>
          </li>
        </ul>
      </details>

      <section
        v-if="!running && reviews.length === 0 && status === 'idle'"
        class="rounded-2xl border border-slate-200 bg-white/95 px-4 py-10 text-center text-sm text-slate-500 shadow-sm shadow-slate-200/70"
      >
        Choose a date range and start the review. Members appear here as each one is scored.
      </section>

      <!-- Per-member results, rendered progressively -->
      <article
        v-for="review in reviews"
        :key="review.memberId"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/60"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div>
            <h2 class="text-base font-semibold text-slate-950">{{ review.displayName }}</h2>
            <p class="text-xs text-slate-500">{{ review.role }}</p>
          </div>
          <div v-if="review.result" class="text-right">
            <p class="text-lg font-semibold text-indigo-700">{{ review.result.totalScore }} / {{ review.result.totalMaxPoints }}</p>
            <p class="text-[11px] text-slate-500">
              {{ review.result.commitsReviewed.length }} reviewed · {{ review.result.commitsSkippedAsTrivial.length }} skipped
            </p>
          </div>
          <span v-else class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
            {{ review.error || 'No review' }}
          </span>
        </div>

        <div v-if="review.result" class="px-4 py-3">
          <table class="w-full table-fixed text-sm">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th class="w-1/4 pb-1 font-medium">Criterion</th>
                <th class="w-16 pb-1 font-medium">Score</th>
                <th class="pb-1 font-medium">Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in review.result.scores" :key="s.criterionKey" class="border-t border-slate-100 align-top">
                <td class="py-2 pr-2 font-medium text-slate-800">{{ criterionLabel(s.criterionKey) }}</td>
                <td class="py-2 pr-2 whitespace-nowrap text-slate-700">{{ s.score }} / {{ s.maxPoints }}</td>
                <td class="py-2 text-slate-600">{{ s.comment }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="review.result.summaryFeedback" class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span class="font-semibold text-slate-800">Summary:</span> {{ review.result.summaryFeedback }}
          </p>
        </div>
        <div v-else class="px-4 py-3 text-sm text-slate-500">
          {{ review.error || 'No reviewable commits for this member in the selected range.' }}
        </div>
      </article>

      <!-- Placeholder for the member currently being reviewed -->
      <article
        v-if="running && currentName"
        class="flex items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-4 py-4 text-sm text-slate-600"
      >
        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        Reviewing <span class="font-semibold text-slate-800">{{ currentName }}</span>…
      </article>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'

const CRITERION_LABELS = {
  codeQuality: 'Code Quality',
  dbQueryPerformance: 'DB Query Performance',
  frontendPerformance: 'Frontend Performance & Optimization',
  architecturePerformance: 'Architecture & Performance Improvement'
}
const criterionLabel = (key) => CRITERION_LABELS[key] || key

const pad = (n) => `${n}`.padStart(2, '0')
const today = new Date()
const fromDate = ref(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`)
const toDate = ref(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`)

const running = ref(false)
const downloading = ref(false)
const status = ref('idle') // idle | running | done | cancelled | error
const errorMessage = ref('')

const total = ref(0)
const currentName = ref('')
const reviews = ref([])
const authorsFound = ref([])

let controller = null

const canDownload = computed(
  () => !running.value && reviews.value.some((r) => r.result) && (status.value === 'done' || status.value === 'cancelled')
)

const startReview = async () => {
  if (!fromDate.value || !toDate.value) {
    errorMessage.value = 'Please select both a From and To date.'
    return
  }
  if (fromDate.value > toDate.value) {
    errorMessage.value = 'The From date must be on or before the To date.'
    return
  }

  errorMessage.value = ''
  reviews.value = []
  authorsFound.value = []
  total.value = 0
  currentName.value = ''
  status.value = 'running'
  running.value = true
  controller = new AbortController()

  try {
    const res = await fetch('/api/review/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromDate.value, to: toDate.value }),
      signal: controller.signal
    })

    if (!res.ok || !res.body) {
      let message = `Review failed (${res.status})`
      try {
        const data = await res.json()
        message = data?.statusMessage || data?.message || message
      } catch { /* ignore */ }
      throw new Error(message)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let nl
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (line) handleEvent(JSON.parse(line))
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      status.value = 'cancelled'
    } else {
      status.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'Review failed.'
    }
  } finally {
    running.value = false
    currentName.value = ''
    controller = null
  }
}

const handleEvent = (evt) => {
  switch (evt.type) {
    case 'meta':
      total.value = evt.total
      authorsFound.value = Array.isArray(evt.authors) ? evt.authors : []
      break
    case 'progress':
      currentName.value = evt.displayName
      break
    case 'result':
      reviews.value = [...reviews.value, evt.review]
      currentName.value = ''
      break
    case 'done':
      status.value = 'done'
      break
    case 'error':
      status.value = 'error'
      errorMessage.value = evt.message || 'Review failed.'
      break
  }
}

const cancelReview = () => {
  if (controller) controller.abort()
  status.value = 'cancelled'
}

const downloadExcel = async () => {
  downloading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch('/api/review/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromDate.value, to: toDate.value, reviews: reviews.value })
    })

    if (!res.ok) {
      let message = `Download failed (${res.status})`
      try {
        const data = await res.json()
        message = data?.statusMessage || data?.message || message
      } catch { /* ignore */ }
      throw new Error(message)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kpi-review-${fromDate.value}_to_${toDate.value}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Download failed.'
  } finally {
    downloading.value = false
  }
}
</script>
