export type SourceAccount = 'appinion' | 'renata'

export type BackupSource = {
  id: string
  label: string
  account: SourceAccount
  bucket: string
  prefix: string
  region: string
  timezone: string
  groupBy: 'folder' | 'flat'
}

export const BACKUP_ACCOUNTS: Record<SourceAccount, { accessKeyId: string; secretAccessKey: string; region: string }> = {
  appinion: {
    accessKeyId: 'AWS_ACCESS_KEY_ID',
    secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
    region: 'AWS_DEFAULT_REGION'
  },
  renata: {
    accessKeyId: 'RENATA_AWS_ACCESS_KEY_ID',
    secretAccessKey: 'RENATA_AWS_SECRET_ACCESS_KEY',
    region: 'RENATA_AWS_DEFAULT_REGION'
  }
}

export const BACKUP_SOURCES: BackupSource[] = [
  {
    id: 'appinion-projects',
    label: 'Appinion Projects',
    account: 'appinion',
    bucket: 'appinion-projects-db-backup',
    prefix: '',
    region: 'ap-southeast-1',
    timezone: 'Asia/Dhaka',
    groupBy: 'folder'
  },
  {
    id: 'renata-momenta',
    label: 'Momenta',
    account: 'renata',
    bucket: 'momenta-files',
    prefix: 'Momenta-New-Backups',
    region: 'ap-southeast-1',
    timezone: 'Asia/Dhaka',
    groupBy: 'flat'
  },
  {
    id: 'renata-redevelop',
    label: 'Re-Develop Learning Portal',
    account: 'renata',
    bucket: 're-develop-backups',
    prefix: 'Re-Develop-Learning-Portal',
    region: 'ap-southeast-1',
    timezone: 'Asia/Dhaka',
    groupBy: 'flat'
  },
  {
    id: 'renata-animedex',
    label: 'Animedex',
    account: 'renata',
    bucket: 'renata-ahd-database-backup',
    prefix: 'Animedex',
    region: 'ap-southeast-1',
    timezone: 'Asia/Dhaka',
    groupBy: 'flat'
  },
  {
    id: 'renata-mis',
    label: 'Renata MIS',
    account: 'renata',
    bucket: 'renata-mis-backup',
    prefix: 'Renata-MIS',
    region: 'ap-southeast-1',
    timezone: 'Asia/Dhaka',
    groupBy: 'flat'
  }
]
