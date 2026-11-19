import { defineEventHandler } from 'h3'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { BACKUP_SOURCES, BACKUP_ACCOUNTS, type BackupSource, type SourceAccount } from '../utils/backup-sources'

type Backup = {
  file: string
  key: string
  date: string
  time: string
  iso: string
  size: number
  lastModified: string
}

type Project = {
  name: string
  count: number
  totalSize: number
  latest: string | null
  backups: Backup[]
}

type SourceResult = {
  id: string
  label: string
  account: SourceAccount
  error: string | null
  today: string
  projects: Project[]
  totalProjects: number
  totalBackups: number
  listedCount: number
}

const getTodayInTz = (tz: string): string => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = fmt.formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

const parseBackupTimestamp = (name: string): { date: string; time: string; iso: string } | null => {
  const match = name.match(/(\d{4})-(\d{2})-(\d{2})[ _-](\d{2})[-_](\d{2})[-_]?(\d{2})?/)
  if (!match) return null
  const [, year, month, day, hour, minute, second = '00'] = match
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    iso: `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  }
}

const extractBackupType = (fileName: string): string => {
  const match = fileName.match(/^(.*?)\d{4}-\d{2}-\d{2}/)
  const raw = match ? match[1] : fileName
  return raw.replace(/[-_]+$/g, '').trim()
}

const listSource = async (source: BackupSource): Promise<SourceResult> => {
  const account = BACKUP_ACCOUNTS[source.account]
  const accessKeyId = process.env[account.accessKeyId]
  const secretAccessKey = process.env[account.secretAccessKey]
  const region = process.env[account.region] || process.env.AWS_REGION
  const bucket = source.bucketEnv ? (process.env[source.bucketEnv] || '') : source.bucket

  const base: SourceResult = {
    id: source.id,
    label: source.label,
    account: source.account,
    error: null,
    today: getTodayInTz(source.timezone),
    projects: [],
    totalProjects: 0,
    totalBackups: 0,
    listedCount: 0
  }

  if (!accessKeyId || !secretAccessKey) {
    return { ...base, error: `Credentials not configured for ${source.account}` }
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  })

  const byProject: Record<string, Project> = {}
  let continuationToken: string | undefined

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: source.prefix || undefined,
        ContinuationToken: continuationToken
      })
      const result = await client.send(command)
      base.listedCount += result.KeyCount || 0

      for (const obj of result.Contents || []) {
        const key = obj.Key || ''
        const relative = source.prefix
          ? key.slice(source.prefix.length).replace(/^\/+/, '')
          : key
        if (!relative || relative.endsWith('/')) continue

        const lastModified = obj.LastModified?.toISOString() || ''
        const ts = parseBackupTimestamp(relative)

        const backup: Backup = {
          file: relative,
          key,
          date: ts?.date || lastModified.slice(0, 10),
          time: ts?.time || lastModified.slice(11, 19),
          iso: ts?.iso || lastModified,
          size: obj.Size || 0,
          lastModified
        }

        let projectName: string
        if (source.groupBy === 'folder') {
          const slash = relative.indexOf('/')
          if (slash <= 0) continue
          projectName = relative.slice(0, slash)
        } else {
          const type = extractBackupType(relative)
          projectName = type ? `${source.label} · ${type}` : source.label
        }

        const project = byProject[projectName] || {
          name: projectName,
          count: 0,
          totalSize: 0,
          latest: null,
          backups: []
        }
        project.count++
        project.totalSize += backup.size
        project.backups.push(backup)
        byProject[projectName] = project
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const code = (err as { name?: string, Code?: string })?.name || (err as { Code?: string })?.Code
    if (code === 'InvalidAccessKeyId' || /access key id you provided does not exist/i.test(message)) {
      return { ...base, error: 'Access key error' }
    }
    return { ...base, error: `Failed to list ${bucket}/${source.prefix}: ${message}` }
  }

  const projects = Object.values(byProject)
    .map((project) => {
      project.backups.sort((a, b) => b.iso.localeCompare(a.iso))
      project.latest = project.backups[0]?.iso || null
      return project
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  base.projects = projects
  base.totalProjects = projects.length
  base.totalBackups = projects.reduce((sum, project) => sum + project.count, 0)
  return base
}

export default defineEventHandler(async () => {
  const sources = await Promise.all(BACKUP_SOURCES.map(listSource))

  return {
    sources,
    totalProjects: sources.reduce((sum, source) => sum + source.totalProjects, 0),
    totalBackups: sources.reduce((sum, source) => sum + source.totalBackups, 0),
    listedAt: new Date().toISOString()
  }
})
