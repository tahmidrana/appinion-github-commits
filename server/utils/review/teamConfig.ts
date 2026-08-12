// Team membership and roles — pure data/config.
// Add/remove members or roles here without touching pipeline logic.

export type TeamRole = 'sr-engineer' | 'jr-engineer' | 'sr-frontend-engineer'

export interface TeamMember {
  id: string // stable slug, e.g. "iftekher-mahmud"
  displayName: string // "IFTEKHER MAHMUD"
  githubLogins: string[] // ["iftekhermahmud"] - may have multiple aliases
  role: TeamRole
  // Optional extra git author NAMES to match (besides displayName + githubLogins).
  // Use this when a member's commits show a different author name than displayName
  // on the home page (e.g. displayName "Riad" but commits authored as "Riad Hasan").
  aliases?: string[]
}

export const teamMembers: TeamMember[] = [
  { id: 'iftekher-mahmud', displayName: 'IFTEKHER MAHMUD', githubLogins: ['iftekhermahmud'], role: 'sr-engineer' },
  { id: 'shahriar-sagor', displayName: 'Shahriar Sagor', githubLogins: ['shahriarsagor'], role: 'sr-engineer' },
  { id: 'riad-appinion', displayName: 'Riad', githubLogins: ['riad-appinion'], role: 'jr-engineer' },
  { id: 'shoron', displayName: 'Shoron', githubLogins: ['shoron00'], role: 'jr-engineer' },
  { id: 'rahat-rar', displayName: 'Rahat', githubLogins: ['rahatrar'], role: 'sr-engineer' },
  { id: 'shamsad-anam', displayName: 'Shamsad Anam', githubLogins: ['shamsadanam', 'shamsad'], role: 'sr-frontend-engineer' },
]
