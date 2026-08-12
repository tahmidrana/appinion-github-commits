// Streams the KPI review member-by-member as newline-delimited JSON (NDJSON).
// Event shapes:
//   { type: 'meta', total, members: [{id, displayName, role}] }
//   { type: 'progress', index, memberId, displayName }   // member started
//   { type: 'result', review }                           // member finished
//   { type: 'done' }
//   { type: 'error', message }
//
// Cancellation: when the client aborts the fetch, the stream's cancel() runs,
// which stops the loop before the next member is started.

import { defineEventHandler, readBody, setResponseHeaders, createError } from 'h3'
import { teamMembers } from '../../utils/review/teamConfig'
import { fetchOrgRepos, fetchAllCommits } from '../../utils/review/githubClient'
import { reviewOneMember } from '../../utils/review/reviewOrchestrator'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const from = body?.from || body?.startDate
  const to = body?.to || body?.endDate

  if (!from || !to) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide from and to dates' })
  }

  const encoder = new TextEncoder()
  let cancelled = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      try {
        const repos = await fetchOrgRepos()
        const allCommits = await fetchAllCommits(repos, from, to)

        // Distinct author identities in range — helps map members whose commits
        // show an unexpected author name (add it to that member's `aliases`).
        const authorMap = new Map<string, { name: string; login: string; count: number }>()
        for (const c of allCommits) {
          const key = `${c.name}|${c.login}`
          const entry = authorMap.get(key) || { name: c.name, login: c.login, count: 0 }
          entry.count++
          authorMap.set(key, entry)
        }
        const authors = [...authorMap.values()].sort((a, b) => b.count - a.count)

        send({
          type: 'meta',
          total: teamMembers.length,
          members: teamMembers.map((m) => ({ id: m.id, displayName: m.displayName, role: m.role })),
          authors,
        })

        for (let i = 0; i < teamMembers.length; i++) {
          if (cancelled) break
          const member = teamMembers[i]
          send({ type: 'progress', index: i, memberId: member.id, displayName: member.displayName })

          const review = await reviewOneMember(allCommits, member)
          if (cancelled) break
          send({ type: 'result', review })
        }

        if (!cancelled) send({ type: 'done' })
      } catch (e) {
        if (!cancelled) send({ type: 'error', message: e instanceof Error ? e.message : 'Review run failed' })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed (client gone)
        }
      }
    },
    cancel() {
      cancelled = true
    },
  })

  setResponseHeaders(event, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  })
  return stream
})
