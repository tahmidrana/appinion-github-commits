<template>
  <main class="flex flex-1 w-full items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50 px-4">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200/70">
      <div class="mb-6 space-y-1 text-center">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">GitHub Activity</p>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-950">Enter PIN</h1>
        <p class="text-sm text-slate-500">Access is restricted. Enter your PIN to continue.</p>
      </div>

      <form @submit.prevent="submit">
        <div class="space-y-4">
          <input
            ref="pinInput"
            v-model="pin"
            type="password"
            inputmode="numeric"
            placeholder="PIN"
            maxlength="20"
            autocomplete="current-password"
            class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 text-center text-lg tracking-widest text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
            :class="{ 'border-rose-400 bg-rose-50 focus:border-rose-400': errorMessage }"
            @input="errorMessage = ''"
          >

          <p v-if="errorMessage" class="text-center text-sm text-rose-600">{{ errorMessage }}</p>

          <button
            type="submit"
            :disabled="loading || !pin"
            class="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-700 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
          >
            <span v-if="loading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            {{ loading ? 'Checking…' : 'Continue' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
const pin = ref('')
const loading = ref(false)
const errorMessage = ref('')
const pinInput = ref(null)

onMounted(() => pinInput.value?.focus())

const submit = async () => {
  if (!pin.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await useFetch('/api/auth', { method: 'POST', body: { pin: pin.value } })
    if (data.value?.ok) {
      localStorage.setItem('app-auth', 'true')
      await navigateTo('/')
    } else {
      errorMessage.value = data.value?.error || 'Invalid PIN'
      pin.value = ''
    }
  } catch {
    errorMessage.value = 'Something went wrong. Try again.'
  } finally {
    loading.value = false
  }
}
</script>
