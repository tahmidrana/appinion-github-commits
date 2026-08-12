// Builds the .xlsx from results already computed by the streaming run.
// The client posts back the per-member results it collected; we rehydrate the
// TeamMember from config and generate the workbook. Nothing is persisted.

import { defineEventHandler, readBody, setResponseHeaders, createError } from 'h3'
import { teamMembers } from '../../utils/review/teamConfig'
import { generateWorkbook, type MemberReview } from '../../utils/review/excelGenerator'
import { ReviewResultSchema } from '../../utils/review/reviewSchema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const from = body?.from || body?.startDate
  const to = body?.to || body?.endDate
  const incoming = Array.isArray(body?.reviews) ? body.reviews : []

  if (!from || !to) {
    throw createError({ statusCode: 400, statusMessage: 'Please provide from and to dates' })
  }
  if (incoming.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No review results provided' })
  }

  const memberById = new Map(teamMembers.map((m) => [m.id, m]))

  const reviews: MemberReview[] = []
  for (const item of incoming) {
    const member = memberById.get(item?.memberId)
    if (!member) continue // unknown id — skip rather than trust client-provided identity

    let result = null
    if (item?.result) {
      const parsed = ReviewResultSchema.safeParse(item.result)
      result = parsed.success ? parsed.data : null
    }

    reviews.push({
      member,
      result,
      error: typeof item?.error === 'string' ? item.error : undefined,
      commitCount: Number.isFinite(item?.commitCount) ? item.commitCount : 0,
    })
  }

  if (reviews.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No recognizable members in results' })
  }

  // Keep canonical team order in the workbook regardless of arrival order.
  reviews.sort((a, b) => teamMembers.indexOf(a.member) - teamMembers.indexOf(b.member))

  const buffer = await generateWorkbook(reviews, { from, to })

  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="kpi-review-${from}_to_${to}.xlsx"`,
    'Cache-Control': 'no-store',
  })
  return buffer
})
