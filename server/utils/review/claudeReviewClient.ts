// Calls Claude via the Claude Agent SDK, which authenticates with the local
// Claude Code login (your Max subscription) — NOT an API key.
//
// Requirements on the host running this server:
//   - Claude Code installed and logged in (`claude login`) as the user running Node.
//   - ANTHROPIC_API_KEY must be UNSET, otherwise the SDK would route to paid API billing.
//
// Model is switchable via CLAUDE_REVIEW_MODEL (e.g. "sonnet", "opus", "haiku",
// or a full id like "claude-sonnet-4-6"). Defaults to "sonnet".

import { query } from '@anthropic-ai/claude-agent-sdk'
import type { TeamMember } from './teamConfig'
import { getCriteriaForRole } from './criteriaConfig'
import { buildMemberPrompt } from './promptBuilder'
import { ReviewResultSchema, type ReviewResult } from './reviewSchema'
import type { ReviewCommit } from './githubClient'

const MODEL = process.env.CLAUDE_REVIEW_MODEL || 'sonnet'

// Run a single, tool-free, one-turn completion and return the final text.
const runQuery = async (system: string, user: string): Promise<string> => {
  let finalText = ''
  const response = query({
    prompt: user,
    options: {
      model: MODEL,
      systemPrompt: system, // replace Claude Code's default agent prompt
      maxTurns: 1,
      allowedTools: [], // pure LLM call — no filesystem/tools
      settingSources: [], // don't load CLAUDE.md / project settings into the review
    },
  })

  for await (const message of response) {
    if (message.type === 'result') {
      if (message.subtype === 'success') {
        finalText = message.result
      } else {
        throw new Error(`Claude run did not succeed: ${message.subtype}`)
      }
    }
  }

  if (!finalText) throw new Error('Claude returned no result text')
  return finalText
}

// Pull a JSON object out of the model's text, tolerating markdown fences / prose.
const extractJson = (text: string): any => {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

// Coerce the model output into a deterministic, schema-valid result:
// criteria order/keys/maxPoints are forced from config; totals are recomputed.
const reconcile = (member: TeamMember, parsed: any): ReviewResult => {
  const set = getCriteriaForRole(member.role)
  const byKey = new Map<string, any>()
  if (Array.isArray(parsed?.scores)) {
    for (const s of parsed.scores) if (s?.criterionKey) byKey.set(String(s.criterionKey), s)
  }

  const scores = set.criteria.map((c) => {
    const s = byKey.get(c.key) || {}
    let score = Number(s.score)
    if (!Number.isFinite(score)) score = 0
    score = Math.max(0, Math.min(c.maxPoints, Math.round(score * 100) / 100))
    return {
      criterionKey: c.key,
      score,
      maxPoints: c.maxPoints,
      comment: typeof s.comment === 'string' ? s.comment : '',
    }
  })

  const totalScore = Math.round(scores.reduce((a, s) => a + s.score, 0) * 100) / 100

  return {
    memberId: member.id,
    scores,
    totalScore,
    totalMaxPoints: set.totalPoints,
    summaryFeedback: typeof parsed?.summaryFeedback === 'string' ? parsed.summaryFeedback : '',
    commitsReviewed: Array.isArray(parsed?.commitsReviewed) ? parsed.commitsReviewed.map(String) : [],
    commitsSkippedAsTrivial: Array.isArray(parsed?.commitsSkippedAsTrivial) ? parsed.commitsSkippedAsTrivial.map(String) : [],
  }
}

export const reviewMember = async (member: TeamMember, commits: ReviewCommit[]): Promise<ReviewResult> => {
  const built = buildMemberPrompt(member, commits)

  const attempt = async (extraInstruction?: string): Promise<ReviewResult> => {
    const user = extraInstruction ? `${built.user}\n\n${extraInstruction}` : built.user
    const raw = await runQuery(built.system, user)
    const parsed = extractJson(raw)
    return ReviewResultSchema.parse(reconcile(member, parsed))
  }

  try {
    return await attempt()
  } catch {
    // Retry once with an explicit "valid JSON only" nudge before failing this member.
    return await attempt(
      'Your last response was invalid or did not match the required JSON schema. ' +
        'Return ONLY valid JSON matching the schema exactly — no prose, no markdown fences.',
    )
  }
}
