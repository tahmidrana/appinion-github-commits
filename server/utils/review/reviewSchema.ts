// Structured output schema shared by the AI client and validator.
import { z } from 'zod'

export const ReviewScoreSchema = z.object({
  criterionKey: z.string(),
  score: z.number(),
  maxPoints: z.number(),
  comment: z.string(),
})

export const ReviewResultSchema = z.object({
  memberId: z.string(),
  scores: z.array(ReviewScoreSchema),
  totalScore: z.number(),
  totalMaxPoints: z.number(),
  summaryFeedback: z.string(),
  commitsReviewed: z.array(z.string()),
  commitsSkippedAsTrivial: z.array(z.string()),
})

export type ReviewResult = z.infer<typeof ReviewResultSchema>
export type ReviewScore = z.infer<typeof ReviewScoreSchema>
