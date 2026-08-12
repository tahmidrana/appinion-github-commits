// Fetch commits + diffs from GitHub for the review pipeline.
// Reuses the existing GITHUB_TOKEN / GITHUB_ORG env vars (same auth as the
// commit-list feature) — no new token handling is introduced.
//
// Matching strategy: we fetch ALL commits in the range (exactly like the home
// page does — no GitHub `author=` filter, which only matches commits linked to
// a GitHub account), then match each commit to a member locally by login, git
// author name, or email. This guarantees anything visible on the home page
// (which groups by git author NAME) is also found here.

import type { TeamMember } from './teamConfig'

export interface ReviewCommit {
  sha: string
  message: string
  url: string
  diff: string
  filesChanged: number
  additions: number
  deletions: number
}

// A commit's identity fields, captured once during the org-wide fetch.
export interface RawCommit {
  repo: string
  sha: string
  message: string
  url: string
  date: string
  login: string // commit.author?.login (GitHub account), may be ''
  name: string // commit.commit.author.name (git display name)
  email: string // commit.commit.author.email
}

// --- Diff filtering / budget config (confirmed defaults) ---
const EXCLUDED_EXACT = new Set(['package-lock.json', 'composer.lock', 'yarn.lock', 'pnpm-lock.yaml'])
const EXCLUDED_PATH_SEGMENTS = ['node_modules/', 'vendor/', 'dist/', 'build/', '.nuxt/', '.output/', 'database/migrations/']
const EXCLUDED_EXT = ['.min.js', '.min.css', '.map', '.lock', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf']

const MAX_FILE_DIFF_CHARS = 20000 // truncate any single file's patch beyond this
const MAX_TOTAL_DIFF_CHARS = 150000 // total diff budget per member
const MAX_MESSAGE_CHARS = 500
const MAX_COMMIT_PAGES = 5 // up to 500 commits/repo in range

const isExcludedFile = (filename: string): boolean => {
  const base = filename.split('/').pop() || filename
  if (EXCLUDED_EXACT.has(base)) return true
  if (EXCLUDED_PATH_SEGMENTS.some((seg) => filename.includes(seg))) return true
  if (EXCLUDED_EXT.some((ext) => filename.toLowerCase().endsWith(ext))) return true
  return false
}

const ghHeaders = () => {
  const token = process.env.GITHUB_TOKEN
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Nuxt-GitHub-App',
    Accept: 'application/vnd.github+json',
  }
}

export interface OrgRepo {
  name: string
  default_branch?: string
}

// Fetch all repos in the org once; reused across all members.
export const fetchOrgRepos = async (): Promise<OrgRepo[]> => {
  const org = process.env.GITHUB_ORG
  const headers = ghHeaders()
  const repos: OrgRepo[] = []
  let page = 1
  while (true) {
    const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`, { headers })
    if (!res.ok) throw new Error(`Failed to fetch repos: ${res.status}`)
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    repos.push(...batch.map((r: any) => ({ name: r.name, default_branch: r.default_branch })))
    if (batch.length < 100) break
    page++
  }
  return repos
}

// Fetch every commit across the org within [from, to] — once per run, shared by
// all members. No `author=` filter, so this mirrors the home page's commit set.
export const fetchAllCommits = async (repos: OrgRepo[], from: string, to: string): Promise<RawCommit[]> => {
  const org = process.env.GITHUB_ORG
  const headers = ghHeaders()
  const since = `${from}T00:00:00Z`
  const until = `${to}T23:59:59Z`
  const all: RawCommit[] = []

  for (const repo of repos) {
    for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
      const url =
        `https://api.github.com/repos/${org}/${repo.name}/commits` +
        `?since=${since}&until=${until}&per_page=100&page=${page}`
      const res = await fetch(url, { headers })
      if (!res.ok) break
      const commits = await res.json()
      if (!Array.isArray(commits) || commits.length === 0) break

      for (const c of commits) {
        if (!c?.sha) continue
        all.push({
          repo: repo.name,
          sha: c.sha,
          message: (c.commit?.message || '').trim(),
          url: c.html_url,
          date: c.commit?.author?.date || c.commit?.committer?.date || '',
          login: (c.author?.login || '').toLowerCase(),
          name: (c.commit?.author?.name || '').trim(),
          email: (c.commit?.author?.email || '').toLowerCase(),
        })
      }
      if (commits.length < 100) break
    }
  }
  return all
}

// Does this commit belong to the member? Match by GitHub login, git author name
// (the home page's grouping key), an optional alias, or email local-part.
const identityMatches = (c: RawCommit, member: TeamMember): boolean => {
  const logins = member.githubLogins.map((s) => s.toLowerCase())
  const names = [member.displayName, ...(member.aliases || [])].map((s) => s.trim().toLowerCase()).filter(Boolean)
  const name = c.name.toLowerCase()

  if (c.login && logins.includes(c.login)) return true
  if (name && names.includes(name)) return true
  if (name && logins.includes(name)) return true // git author name set to the login
  if (c.email) {
    const local = c.email.split('@')[0]
    if (logins.includes(local)) return true
  }
  return false
}

// Collapse a per-commit `files` array into a single budgeted diff string.
const buildDiff = (files: any[]): { diff: string; filesChanged: number } => {
  const reviewable = (files || []).filter((f) => f?.filename && !isExcludedFile(f.filename))
  // Favor substantive files: sort by total changes (additions + deletions) desc.
  reviewable.sort((a, b) => ((b.additions || 0) + (b.deletions || 0)) - ((a.additions || 0) + (a.deletions || 0)))

  const parts: string[] = []
  let total = 0
  for (const f of reviewable) {
    if (!f.patch) continue // binary / too-large files have no patch
    let patch = f.patch as string
    if (patch.length > MAX_FILE_DIFF_CHARS) {
      patch = patch.slice(0, MAX_FILE_DIFF_CHARS) + '\n... [file diff truncated]'
    }
    const header = `\n--- File: ${f.filename} (${f.status}, +${f.additions || 0}/-${f.deletions || 0}) ---\n`
    if (total + header.length + patch.length > MAX_TOTAL_DIFF_CHARS) {
      parts.push('\n... [remaining file diffs omitted to stay within size budget]')
      break
    }
    parts.push(header + patch)
    total += header.length + patch.length
  }
  return { diff: parts.join('\n'), filesChanged: reviewable.length }
}

// Build the ordered, diff-hydrated commit list for one member from the shared
// org-wide commit set. Merged identities are collapsed (dedupe by sha).
export const buildMemberCommits = async (allCommits: RawCommit[], member: TeamMember): Promise<ReviewCommit[]> => {
  const org = process.env.GITHUB_ORG
  const headers = ghHeaders()

  const seen = new Set<string>()
  const matched: RawCommit[] = []
  for (const c of allCommits) {
    if (seen.has(c.sha)) continue
    if (!identityMatches(c, member)) continue
    seen.add(c.sha)
    matched.push(c)
  }

  // Order oldest-first by author date.
  matched.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())

  const results: ReviewCommit[] = []
  for (const c of matched) {
    const detailRes = await fetch(`https://api.github.com/repos/${org}/${c.repo}/commits/${c.sha}`, { headers })
    if (!detailRes.ok) continue
    const detail: any = await detailRes.json()
    const { diff, filesChanged } = buildDiff(detail.files)
    let message = c.message
    if (message.length > MAX_MESSAGE_CHARS) message = message.slice(0, MAX_MESSAGE_CHARS) + '…'
    results.push({
      sha: c.sha,
      message,
      url: c.url,
      diff,
      filesChanged,
      additions: detail.stats?.additions || 0,
      deletions: detail.stats?.deletions || 0,
    })
  }
  return results
}
