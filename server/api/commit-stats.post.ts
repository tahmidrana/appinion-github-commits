import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { commits } = await readBody(event)
  const org = process.env.GITHUB_ORG
  const token = process.env.GITHUB_TOKEN

  if (!commits || !Array.isArray(commits)) {
    return { error: 'Please provide commits array' }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Nuxt-GitHub-App'
  }

  const stats: Record<string, { additions: number; deletions: number }> = {}

  for (const commit of commits) {
    const detailRes = await fetch(
      `https://api.github.com/repos/${org}/${commit.project}/commits/${commit.hash}`,
      { headers }
    )
    const detail: any = await detailRes.json()

    const key = `${commit.project}-${commit.hash}`
    stats[key] = {
      additions: detail.stats?.additions || 0,
      deletions: detail.stats?.deletions || 0
    }
  }

  return stats
})