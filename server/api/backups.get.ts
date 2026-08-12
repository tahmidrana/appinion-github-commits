import { defineEventHandler } from 'h3'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

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

const BACKUP_TZ = 'Asia/Dhaka'

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

export default defineEventHandler(async () => {
  const bucket = process.env.AWS_BUCKET
  const region = process.env.AWS_DEFAULT_REGION || 'ap-southeast-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return { error: 'AWS credentials are not configured' }
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  })

  const byProject: Record<string, Project> = {}
  let continuationToken: string | undefined
  let listedCount = 0

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken
      })
      const result = await client.send(command)
      listedCount += result.KeyCount || 0

      for (const obj of result.Contents || []) {
        const key = obj.Key || ''
        const slash = key.indexOf('/')
        if (slash <= 0) continue

        const projectName = key.slice(0, slash)
        const fileName = key.slice(slash + 1)
        if (!fileName) continue

        const lastModified = obj.LastModified?.toISOString() || ''
        const ts = parseBackupTimestamp(fileName)

        const backup: Backup = {
          file: fileName,
          key,
          date: ts?.date || lastModified.slice(0, 10),
          time: ts?.time || lastModified.slice(11, 19),
          iso: ts?.iso || lastModified,
          size: obj.Size || 0,
          lastModified
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
    console.error('Failed to list S3 backups:', err)
    return { error: `Failed to list backups from S3: ${err instanceof Error ? err.message : String(err)}` }
  }

  const projects = Object.values(byProject)
    .map((project) => {
      project.backups.sort((a, b) => b.iso.localeCompare(a.iso))
      project.latest = project.backups[0]?.iso || null
      return project
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalBackups = projects.reduce((sum, project) => sum + project.count, 0)

  return {
    bucket,
    today: getTodayInTz(BACKUP_TZ),
    projects,
    totalProjects: projects.length,
    totalBackups,
    listedCount,
    listedAt: new Date().toISOString()
  }
})