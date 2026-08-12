// Per-member review step, shared by the streaming endpoint.
// Processing the team is driven member-by-member so the UI can render results
// progressively and the run can be cancelled between members.

import type { RawCommit } from './githubClient'
import type { TeamMember } from './teamConfig'
import { buildMemberCommits } from './githubClient'
import { reviewMember } from './claudeReviewClient'
import type { ReviewResult } from './reviewSchema'

// Serializable per-member outcome sent to the client and later back for Excel.
export interface MemberReviewResult {
  memberId: string
  displayName: string
  role: string
  result: ReviewResult | null
  error: string | null
  commitCount: number
}

export const reviewOneMember = async (
  allCommits: RawCommit[],
  member: TeamMember,
): Promise<MemberReviewResult> => {
  const base = { memberId: member.id, displayName: member.displayName, role: member.role }
  try {
    const commits = await buildMemberCommits(allCommits, member)
    if (commits.length === 0) {
      return { ...base, result: null, error: 'No commits in range', commitCount: 0 }
    }
    const result = await reviewMember(member, commits)
    return { ...base, result, error: null, commitCount: commits.length }
  } catch (e) {
    return { ...base, result: null, error: e instanceof Error ? e.message : 'Review failed', commitCount: 0 }
  }
}
