const appinionSource = {
  id: 'appinion-projects',
  label: 'Appinion Projects',
  account: 'appinion',
  error: null,
  today: '2026-08-12',
  totalProjects: 3,
  totalBackups: 4,
  listedCount: 4,
  projects: [
    {
      name: 'Agrani Amar Passbook',
      count: 2,
      totalSize: 21448198,
      latest: '2026-08-05T02:00:01Z',
      backups: [
        { file: '2026-08-05-02-00-01.zip', key: 'Agrani Amar Passbook/2026-08-05-02-00-01.zip', date: '2026-08-05', time: '02:00:01', iso: '2026-08-05T02:00:01Z', size: 10680531, lastModified: '2026-08-05T02:00:09.000Z' },
        { file: '2026-08-06-02-00-02.zip', key: 'Agrani Amar Passbook/2026-08-06-02-00-02.zip', date: '2026-08-06', time: '02:00:02', iso: '2026-08-06T02:00:02Z', size: 10786791, lastModified: '2026-08-06T02:00:10.000Z' }
      ]
    },
    {
      name: 'Healthy',
      count: 1,
      totalSize: 853030,
      latest: '2026-08-08T02:30:00Z',
      backups: [
        { file: 'db-2026-08-08_02-30.zip', key: 'Healthy/db-2026-08-08_02-30.zip', date: '2026-08-08', time: '02:30:00', iso: '2026-08-08T02:30:00Z', size: 853030, lastModified: '2026-08-08T02:30:18.000Z' }
      ]
    },
    {
      name: 'NPHL-Backups',
      count: 1,
      totalSize: 1565715,
      latest: '2026-08-05T01:20:00Z',
      backups: [
        { file: 'backup-db-2026-08-05_01-20-Wednesday.zip', key: 'NPHL-Backups/backup-db-2026-08-05_01-20-Wednesday.zip', date: '2026-08-05', time: '01:20:00', iso: '2026-08-05T01:20:00Z', size: 1565715, lastModified: '2026-08-05T01:20:06.000Z' }
      ]
    }
  ]
}

const makeRenataBackup = (file: string, date: string, time: string) => ({
  file,
  key: `Momenta-New-Backups/${file}`,
  date,
  time,
  iso: `${date}T${time}Z`,
  size: 1000000,
  lastModified: `${date}T${time}Z`
})

const renataMomentaSource = {
  id: 'renata-momenta',
  label: 'Momenta',
  account: 'renata',
  error: null,
  today: '2026-08-12',
  totalProjects: 2,
  totalBackups: 2,
  listedCount: 2,
  projects: [
    {
      name: 'Momenta · backup-db',
      count: 1,
      totalSize: 1000000,
      latest: '2026-08-12T01:20:00Z',
      backups: [makeRenataBackup('backup-db-2026-08-12_01-20-Wednesday.zip', '2026-08-12', '01:20:00')]
    },
    {
      name: 'Momenta · backup-source-and-files',
      count: 1,
      totalSize: 1000000,
      latest: '2026-08-12T03:00:00Z',
      backups: [makeRenataBackup('backup-source-and-files-2026-08-12_03-00-Wednesday.zip', '2026-08-12', '03:00:00')]
    }
  ]
}

const buildAppinionProject = (name: string, dates: string[]) => ({
  name,
  count: dates.length,
  totalSize: dates.length * 1000000,
  latest: `${dates[dates.length - 1]}T02:00:01Z`,
  backups: dates.map((date) => ({
    file: `${date}-02-00-01.zip`,
    key: `${name}/${date}-02-00-01.zip`,
    date,
    time: '02:00:01',
    iso: `${date}T02:00:01Z`,
    size: 1000000,
    lastModified: `${date}T02:00:01.000Z`
  }))
})

export const mockBackupsPayload = {
  sources: [appinionSource, renataMomentaSource],
  totalProjects: 5,
  totalBackups: 6,
  listedAt: '2026-08-12T10:00:00.000Z'
}

const buildRenataSeries = (type: string, dates: string[], time = '01:20:00') =>
  dates.map((date) => ({
    file: `${type}-${date}_${time.replace(':', '-')}-Wednesday.zip`,
    key: `Momenta-New-Backups/${type}-${date}_${time.replace(':', '-')}-Wednesday.zip`,
    date,
    time,
    iso: `${date}T${time}Z`,
    size: 1000000,
    lastModified: `${date}T${time}Z`
  }))

const lastNDates = (n: number): string[] => {
  const end = new Date(Date.UTC(2026, 7, 12))
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end.getTime() - (n - 1 - i) * 86400000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
}

export const gapBackupsPayload = {
  sources: [
    {
      ...appinionSource,
      totalProjects: 1,
      totalBackups: 7,
      listedCount: 7,
      projects: [buildAppinionProject('Agrani Amar Passbook', ['2026-08-05', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12'])]
    }
  ],
  totalProjects: 1,
  totalBackups: 7,
  listedAt: '2026-08-12T10:00:00.000Z'
}

export const pruneDangerPayload = {
  sources: [
    {
      ...renataMomentaSource,
      totalProjects: 2,
      totalBackups: 14,
      listedCount: 14,
      projects: [
        {
          name: 'Momenta · backup-db',
          count: 12,
          totalSize: 12000000,
          latest: '2026-08-12T01:20:00Z',
          backups: buildRenataSeries('backup-db', lastNDates(12))
        },
        {
          name: 'Momenta · backup-source-and-files',
          count: 2,
          totalSize: 2000000,
          latest: '2026-08-01T03:00:00Z',
          backups: buildRenataSeries('backup-source-and-files', ['2026-08-01', '2026-07-31'], '03:00:00')
        }
      ]
    }
  ],
  totalProjects: 2,
  totalBackups: 14,
  listedAt: '2026-08-12T10:00:00.000Z'
}

export const errorBackupsPayload = {
  sources: [
    appinionSource,
    {
      id: 'renata-redevelop',
      label: 'Re-Develop Learning Portal',
      account: 'renata',
      error: 'Failed to list re-develop-backups/Re-Develop-Learning-Portal: Access Denied',
      today: '2026-08-12',
      totalProjects: 0,
      totalBackups: 0,
      listedCount: 0,
      projects: []
    }
  ],
  totalProjects: 3,
  totalBackups: 4,
  listedAt: '2026-08-12T10:00:00.000Z'
}

export const emptyBackupsPayload = {
  sources: [],
  totalProjects: 0,
  totalBackups: 0,
  listedAt: '2026-08-12T10:00:00.000Z'
}
