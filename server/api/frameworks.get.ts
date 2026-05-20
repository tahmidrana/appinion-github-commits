import { defineEventHandler } from 'h3'

type FrameworkDef = {
  id: string
  label: string
  pkg: string
  registry: 'npm' | 'packagist'
  manifest: 'package.json' | 'composer.json'
  sections: string[]
}

const FRAMEWORK_DEFS: FrameworkDef[] = [
  { id: 'nuxt', label: 'Nuxt', pkg: 'nuxt', registry: 'npm', manifest: 'package.json', sections: ['dependencies', 'devDependencies'] },
  { id: 'adonisjs', label: 'AdonisJS', pkg: '@adonisjs/core', registry: 'npm', manifest: 'package.json', sections: ['dependencies', 'devDependencies'] },
  { id: 'laravel', label: 'Laravel', pkg: 'laravel/framework', registry: 'packagist', manifest: 'composer.json', sections: ['require'] }
]

const extractMajor = (versionRange: string | null | undefined): number | null => {
  if (!versionRange) return null
  const match = String(versionRange).match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

const fetchManifest = async (org: string, repo: string, path: string, branch: string, headers: Record<string, string>): Promise<any | null> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${org}/${repo}/contents/${path}?ref=${branch}`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.content) return null
    const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const fetchLatestNpm = async (pkg: string): Promise<string | null> => {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}/latest`)
    if (!res.ok) return null
    const data = await res.json()
    return data.version || null
  } catch {
    return null
  }
}

const fetchLatestPackagist = async (pkg: string): Promise<string | null> => {
  try {
    const res = await fetch(`https://repo.packagist.org/p2/${pkg}.json`)
    if (!res.ok) return null
    const data = await res.json()
    const versions = data.packages?.[pkg] || []
    const stable = versions.find((v: any) => !/-(dev|alpha|beta|rc)/i.test(v.version || ''))
    return stable?.version || versions[0]?.version || null
  } catch {
    return null
  }
}

export default defineEventHandler(async () => {
  const org = process.env.GITHUB_ORG
  const token = process.env.GITHUB_TOKEN

  if (!org || !token) return { error: 'GITHUB_ORG or GITHUB_TOKEN not configured' }

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Nuxt-GitHub-App',
    Accept: 'application/vnd.github+json'
  }

  const repos: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`, { headers })
    if (!res.ok) return { error: `Failed to fetch repos: ${res.status}` }
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    repos.push(...batch)
    if (batch.length < 100) break
    page++
  }

  const latestVersions: Record<string, string | null> = {}
  await Promise.all(
    FRAMEWORK_DEFS.map(async (def) => {
      latestVersions[def.id] = def.registry === 'npm'
        ? await fetchLatestNpm(def.pkg)
        : await fetchLatestPackagist(def.pkg)
    })
  )

  const probeRepo = async (repo: any) => {
    const branch = repo.default_branch || 'main'
    const [pkgJson, composerJson] = await Promise.all([
      fetchManifest(org, repo.name, 'package.json', branch, headers),
      fetchManifest(org, repo.name, 'composer.json', branch, headers)
    ])

    const detections: any[] = []
    for (const def of FRAMEWORK_DEFS) {
      const manifest = def.manifest === 'package.json' ? pkgJson : composerJson
      if (!manifest) continue

      let current: string | null = null
      for (const section of def.sections) {
        if (manifest[section]?.[def.pkg]) {
          current = manifest[section][def.pkg]
          break
        }
      }
      if (!current) continue

      const latest = latestVersions[def.id]
      const currentMajor = extractMajor(current)
      const latestMajor = extractMajor(latest)
      const outdated = currentMajor !== null && latestMajor !== null && currentMajor < latestMajor

      detections.push({
        framework: def.label,
        current,
        currentMajor,
        latest,
        latestMajor,
        outdated
      })
    }

    if (detections.length === 0) return null
    return {
      repo: repo.name,
      url: repo.html_url,
      archived: !!repo.archived,
      detections
    }
  }

  const results: any[] = []
  const batchSize = 10
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize)
    const probed = await Promise.all(batch.map(probeRepo))
    results.push(...probed.filter(Boolean))
  }

  return {
    repos: results,
    totalScanned: repos.length,
    scannedAt: new Date().toISOString()
  }
})
