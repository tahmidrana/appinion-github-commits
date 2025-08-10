<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">GitHub Commits Viewer</h1>

    <div class="flex gap-4 mb-6">
      <input type="date" v-model="from" class="border p-2 rounded" />
      <input type="date" v-model="to" class="border p-2 rounded" />
      <button @click="fetchCommits" class="bg-blue-500 text-white px-4 py-2 rounded">Load</button>
    </div>

    <div v-if="loading">Loading...</div>

    <div v-else>
      <div v-for="(commits, user) in commitsData" :key="user" class="mb-6">
        <h2 class="text-xl font-semibold mb-2">{{ user }}</h2>
        <ul class="pl-4 list-disc">
          <li v-for="commit in commits" :key="commit.hash">
            <a :href="commit.url" target="_blank" class="text-blue-600">
              {{ commit.hash }}
            </a>
            - {{ commit.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const from = ref('')
const to = ref('')
const commitsData = ref({})
const loading = ref(false)

const fetchCommits = async () => {
  if (!from.value || !to.value) {
    alert('Please select both dates')
    return
  }
  loading.value = true
  const { data } = await useFetch('/api/commits', {
    query: { from: from.value, to: to.value }
  })
  commitsData.value = data.value || {}
  loading.value = false
}
</script>
