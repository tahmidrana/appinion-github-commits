<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">GitHub Commits Viewer</h1>

    <!-- Date selectors -->
    <div class="flex gap-4 mb-4">
      <input type="date" v-model="from" class="border p-2 rounded" />
      <input type="date" v-model="to" class="border p-2 rounded" />
      <button @click="fetchCommits" class="bg-blue-500 text-white px-4 py-2 rounded">Load</button>
    </div>

    <!-- User filter -->
    <div v-if="Object.keys(commitsData).length" class="mb-6">
      <label class="mr-2 font-semibold">Filter by User:</label>
      <select v-model="selectedUser" class="border p-2 rounded">
        <option value="">All Users</option>
        <option v-for="user in sortedUsers" :key="user" :value="user">{{ user }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading">Loading...</div>

    <!-- Commits list -->
    <div v-else>
      <div
        v-for="(commits, user) in filteredCommits"
        :key="user"
        class="mb-6"
      >
        <h2 class="text-xl font-semibold mb-2">{{ user }}</h2>
        <ul class="pl-4 list-disc">
          <li v-for="commit in commits" :key="commit.hash">
            <a :href="commit.url" target="_blank" class="text-blue-600">
              {{ commit.hash }}
            </a>
            - {{ commit.message }}
            <br />
            <small class="text-gray-500">
              📅 {{ formatDate(commit.date) }} | 📂 {{ commit.project }}
            </small>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const from = ref('')
const to = ref('')
const commitsData = ref({})
const loading = ref(false)
const selectedUser = ref('')

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
  selectedUser.value = ''
  loading.value = false
}

const sortedUsers = computed(() => Object.keys(commitsData.value).sort())

const filteredCommits = computed(() => {
  if (!selectedUser.value) return commitsData.value
  return { [selectedUser.value]: commitsData.value[selectedUser.value] || [] }
})

const formatDate = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString()
}
</script>
