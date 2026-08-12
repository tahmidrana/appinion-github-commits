// Builds the two-sheet .xlsx workbook, generic over whatever criteria keys are
// present across the member results (no hardcoded column set).

import ExcelJS from 'exceljs'
import type { TeamMember, TeamRole } from './teamConfig'
import { getCriteriaForRole, criterionOrder, criterionLabels } from './criteriaConfig'
import type { ReviewResult } from './reviewSchema'

export interface MemberReview {
  member: TeamMember
  result: ReviewResult | null
  error?: string
  commitCount: number
}

const BOLD = { bold: true } as const

export const generateWorkbook = async (reviews: MemberReview[], range: { from: string; to: string }): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Automated KPI Review'
  workbook.created = new Date()

  // ---------- Sheet 1: Detailed Report ----------
  const detail = workbook.addWorksheet('Detailed Report')
  detail.columns = [{ width: 36 }, { width: 14 }, { width: 90 }]

  const titleRow = detail.addRow([`KPI Code Review — ${range.from} to ${range.to}`])
  titleRow.font = { bold: true, size: 14 }
  detail.addRow([])

  for (const review of reviews) {
    const { member, result, error, commitCount } = review

    const section = detail.addRow([`${member.displayName} — ${member.role}`])
    section.font = { bold: true, size: 12 }
    section.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2FB' } }
    })

    if (!result) {
      detail.addRow([`No review: ${error || 'unknown reason'}`])
      detail.addRow([])
      continue
    }

    detail.addRow([`Commits reviewed: ${result.commitsReviewed.length} · skipped as trivial: ${result.commitsSkippedAsTrivial.length} · fetched: ${commitCount}`])

    const head = detail.addRow(['Criterion', 'Score', 'Comment'])
    head.font = BOLD

    for (const s of result.scores) {
      const label = criterionLabels[s.criterionKey] || s.criterionKey
      const row = detail.addRow([label, `${s.score} / ${s.maxPoints}`, s.comment])
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
    }

    const totalRow = detail.addRow(['Total', `${result.totalScore} / ${result.totalMaxPoints}`, ''])
    totalRow.font = BOLD

    const summaryRow = detail.addRow(['Summary', result.summaryFeedback])
    summaryRow.getCell(1).font = BOLD
    detail.mergeCells(`B${summaryRow.number}:C${summaryRow.number}`)
    summaryRow.getCell(2).alignment = { wrapText: true, vertical: 'top' }

    detail.addRow([])
  }

  // ---------- Sheet 2: Summary ----------
  const summary = workbook.addWorksheet('Summary')

  // Distinct criterion keys present across all members' roles, in canonical order.
  const presentKeys = new Set<string>()
  for (const review of reviews) {
    for (const c of getCriteriaForRole(review.member.role as TeamRole).criteria) presentKeys.add(c.key)
  }
  const orderedKeys = criterionOrder.filter((k) => presentKeys.has(k))

  const headerLabels = ['Name', 'Role', ...orderedKeys.map((k) => criterionLabels[k] || k), 'Total', 'Summary Feedback']
  summary.columns = headerLabels.map((_, i) => {
    if (i === 0) return { width: 24 }
    if (i === 1) return { width: 22 }
    if (i === headerLabels.length - 1) return { width: 70 }
    return { width: 22 }
  })

  const headerRow = summary.addRow(headerLabels)
  headerRow.font = BOLD
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2FB' } }
  })

  for (const review of reviews) {
    const { member, result, error } = review
    const roleKeys = new Set(getCriteriaForRole(member.role as TeamRole).criteria.map((c) => c.key))
    const scoreByKey = new Map<string, { score: number; maxPoints: number }>()
    if (result) for (const s of result.scores) scoreByKey.set(s.criterionKey, { score: s.score, maxPoints: s.maxPoints })

    const cells: (string | number)[] = [member.displayName, member.role]
    for (const key of orderedKeys) {
      if (!roleKeys.has(key)) {
        cells.push('N/A') // role doesn't include this criterion
      } else if (result && scoreByKey.has(key)) {
        const s = scoreByKey.get(key)!
        cells.push(`${s.score} / ${s.maxPoints}`)
      } else {
        cells.push('—')
      }
    }
    cells.push(result ? `${result.totalScore} / ${result.totalMaxPoints}` : 'ERROR')
    cells.push(result ? result.summaryFeedback : `No review: ${error || 'unknown reason'}`)

    const row = summary.addRow(cells)
    row.getCell(headerLabels.length).alignment = { wrapText: true, vertical: 'top' }
  }

  const out = await workbook.xlsx.writeBuffer()
  return Buffer.from(out)
}
