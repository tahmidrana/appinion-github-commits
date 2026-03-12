import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const { from, to } = getQuery(event)
  const org = process.env.GITHUB_ORG
  const token = process.env.GITHUB_TOKEN

  if (!from || !to) {
    return { error: 'Please provide from and to dates' }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Nuxt-GitHub-App'
  }

  // Get all repos in the org
  const reposRes = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, { headers })
  const repos = await reposRes.json()

  let commitsByUser: Record<string, any[]> = {}

  for (const repo of repos) {
    const commitsRes = await fetch(
      `https://api.github.com/repos/${org}/${repo.name}/commits?since=${from}T00:00:00Z&until=${to}T23:59:59Z&per_page=100`,
      { headers }
    )
    const commits = await commitsRes.json()
    if (!Array.isArray(commits) || commits.length === 0) continue

    for (const commit of commits) {
      if (!commit.commit?.author?.name) continue

      const author = commit.commit.author.name
      if (!commitsByUser[author]) commitsByUser[author] = []

      commitsByUser[author].push({
        hash: commit.sha.substring(0, 7),
        message: commit.commit.message,
        date: commit.commit.author.date,
        project: repo.name,
        url: commit.html_url
      })
    }
  }

  return commitsByUser
})
