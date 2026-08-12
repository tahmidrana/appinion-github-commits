// Builds one prompt per team member from role criteria + their commit diffs.
import type { TeamMember } from './teamConfig'
import { getCriteriaForRole } from './criteriaConfig'
import type { ReviewCommit } from './githubClient'

export interface BuiltPrompt {
  system: string
  user: string
}

export const buildMemberPrompt = (member: TeamMember, commits: ReviewCommit[]): BuiltPrompt => {
  const criteriaSet = getCriteriaForRole(member.role)

  const criteriaText = criteriaSet.criteria
    .map((c) => `- "${c.key}" — ${c.label} (max ${c.maxPoints} pts): ${c.description}`)
    .join('\n')

  const system = [
    'You are a senior engineering manager conducting a monthly KPI code review.',
    'You score one team member against a fixed rubric by reviewing the ACTUAL CODE DIFFS of their commits — not the commit messages alone.',
    '',
    'Rules:',
    '- Skip trivial commits when deciding what to score: typo fixes, single-line changes, label/text updates, formatting-only changes, and merge commits. Decide this per-commit yourself.',
    '- Base every score and comment on evidence visible in the diffs.',
    '- The "scores" array MUST contain exactly one entry per rubric criterion provided, using the exact criterionKey and maxPoints given — no more, no fewer.',
    '- "totalScore" must equal the sum of the per-criterion scores; "totalMaxPoints" must equal the sum of the criterion maxPoints.',
    '- "commitsReviewed" lists the SHAs you actually scored; "commitsSkippedAsTrivial" lists SHAs you judged trivial.',
    '- Return ONLY the structured JSON result. No prose, no markdown.',
  ].join('\n')

  const header = [
    `Team member: ${member.displayName}`,
    `memberId (echo this exactly): ${member.id}`,
    `Role: ${member.role}`,
    `Total possible points: ${criteriaSet.totalPoints}`,
    '',
    'Rubric criteria for this role:',
    criteriaText,
    '',
    `Commits to review (${commits.length}):`,
  ].join('\n')

  const commitsText = commits
    .map((c, i) => {
      const diff = c.diff && c.diff.trim().length > 0 ? c.diff : '[no reviewable diff content]'
      return [
        `===== Commit ${i + 1} =====`,
        `SHA: ${c.sha}`,
        `Message: ${c.message}`,
        `Files changed: ${c.filesChanged} (+${c.additions}/-${c.deletions})`,
        'Diff:',
        diff,
      ].join('\n')
    })
    .join('\n\n')

  return { system, user: `${header}\n\n${commitsText}` }
}
