// KPI criteria per role — pure data/config.
// Adding a role or swapping a criterion (as was done for Shamsad) should be a
// config edit only. Criterion descriptions are used verbatim in the AI prompt.

import type { TeamRole } from './teamConfig'

export interface CriterionDefinition {
  key: string // stable key, e.g. "codeQuality"
  label: string // "Code Quality"
  maxPoints: number
  description: string // full guidance text injected into the prompt
}

export interface RoleCriteriaSet {
  role: string
  totalPoints: number
  criteria: CriterionDefinition[]
}

// Criterion library — descriptions preserved verbatim from the existing manual prompt.
const codeQuality: CriterionDefinition = {
  key: 'codeQuality',
  label: 'Code Quality',
  maxPoints: 15,
  description:
    'PHP/JS standard coding practice (PSR-12 for backend, Vue 3/Nuxt 3/TS best practices for frontend); ' +
    'standard DB query coding (Eloquent, transactions, updateOrCreate etc.) or equivalent frontend data handling; ' +
    'form validation, routes, models, views, controllers, variable naming, route model binding; ' +
    'code complexity, readability, indentation, formatting, proper directory structure; ' +
    'git commit messages, code commenting, TODO keeping.',
}

const dbQueryPerformance: CriterionDefinition = {
  key: 'dbQueryPerformance',
  label: 'DB Query Performance',
  maxPoints: 5,
  description: 'No N+1 queries, no queries inside loops, proper eager loading, bulk operations.',
}

const frontendPerformance: CriterionDefinition = {
  key: 'frontendPerformance',
  label: 'Frontend Performance & Optimization',
  maxPoints: 5,
  description:
    'Avoiding unnecessary re-renders, proper computed/watch usage, lazy loading, image optimization, ' +
    'avoiding redundant API calls, efficient store usage.',
}

const architecturePerformance: CriterionDefinition = {
  key: 'architecturePerformance',
  label: 'Architecture & Performance Improvement',
  maxPoints: 5,
  description: 'Contribution to system architecture design and performance improvement.',
}

const buildSet = (role: string, criteria: CriterionDefinition[]): RoleCriteriaSet => ({
  role,
  totalPoints: criteria.reduce((sum, c) => sum + c.maxPoints, 0),
  criteria,
})

export const roleCriteria: Record<TeamRole, RoleCriteriaSet> = {
  'sr-engineer': buildSet('sr-engineer', [codeQuality, dbQueryPerformance, architecturePerformance]),
  'jr-engineer': buildSet('jr-engineer', [codeQuality, dbQueryPerformance]),
  'sr-frontend-engineer': buildSet('sr-frontend-engineer', [codeQuality, frontendPerformance, architecturePerformance]),
}

export const getCriteriaForRole = (role: TeamRole): RoleCriteriaSet => roleCriteria[role]

// Canonical column order + labels for the generic Excel summary sheet.
export const criterionOrder: string[] = ['codeQuality', 'dbQueryPerformance', 'frontendPerformance', 'architecturePerformance']

export const criterionLabels: Record<string, string> = {
  codeQuality: codeQuality.label,
  dbQueryPerformance: dbQueryPerformance.label,
  frontendPerformance: frontendPerformance.label,
  architecturePerformance: architecturePerformance.label,
}
