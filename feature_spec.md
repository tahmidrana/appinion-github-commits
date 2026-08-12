# Feature Spec: Automated Monthly Code Review / KPI Scoring

## Context

The Nuxt app (`dev-commits`, currently hosted on Netlify) fetches GitHub commits for team
members between two dates, with no database — commits are fetched live from the GitHub
API and cached in browser localStorage.

Today, monthly KPI code reviews are done **manually**: a human opens each commit's GitHub
diff link and uses the Claude in Chrome extension with a fixed prompt to score each team
member against a KPI rubric, then manually triggers a JS download of an Excel report.

**Goal:** Replace the manual Claude-in-Chrome workflow with a **server-side automated
pipeline** triggered by a button click in the existing dashboard. No database, no stored
history — every run is stateless and produces a downloadable Excel file on demand.

**Hosting note:** This will run on a VPS (not Netlify), as part of the existing Nuxt app's
server routes, so there are no serverless execution time limits to worry about.

---

## Design Principles (must hold)

1. **Engine is reusable across teams/projects.** Team membership and KPI criteria are pure
   data/config, never hardcoded into pipeline logic. Swapping in a different team or rubric
   should require zero code changes — only config edits.
2. **No persistence.** No DB, no stored review history. Each run is in-memory only, ending
   in a generated `.xlsx` file streamed back as a download.
3. **One AI call per team member** (batched), not one call per commit. All of a member's
   significant diffs for the date range go into a single prompt; the AI decides what's
   trivial (per criteria in the prompt) and returns one structured JSON result per member.
4. **Structured output only.** The AI must return JSON matching a defined schema — never
   free text — so the Excel generator can be generic and deterministic.
5. **Confirm before destructive/structural changes.** This is being implemented by Claude
   Code working in the user's real repo. Before modifying existing files (vs. adding new
   ones), or before changing the existing commit-fetching logic, **stop and confirm with
   the user.** New, isolated files under `server/utils/review/` can be created without
   asking, but wiring them into existing routes/UI should be confirmed first.

---

## Team Configuration (data, not code)

File: `server/utils/review/teamConfig.ts`

Each team member has one or more GitHub identities merged into a single report, plus a role
that determines which KPI criteria set applies.

```ts
export interface TeamMember {
  id: string;                 // stable slug, e.g. "iftekher-mahmud"
  displayName: string;        // "IFTEKHER MAHMUD"
  githubLogins: string[];     // ["iftekhermahmud"] - may have multiple aliases
  role: 'sr-engineer' | 'jr-engineer' | 'sr-frontend-engineer';
}

export const teamMembers: TeamMember[] = [
  { id: 'iftekher-mahmud', displayName: 'IFTEKHER MAHMUD', githubLogins: ['iftekhermahmud'], role: 'sr-engineer' },
  { id: 'shahriar-sagor', displayName: 'Shahriar Sagor', githubLogins: ['shahriarsagor'], role: 'sr-engineer' },
  { id: 'riad-appinion', displayName: 'Riad', githubLogins: ['riad-appinion'], role: 'jr-engineer' },
  { id: 'shoron', displayName: 'Shoron', githubLogins: ['shoron00'], role: 'jr-engineer' },
  { id: 'rahat-rar', displayName: 'Rahat', githubLogins: ['rahatrar'], role: 'sr-engineer' },
  { id: 'shamsad-anam', displayName: 'Shamsad Anam', githubLogins: ['shamsadanam', 'shamsad'], role: 'sr-frontend-engineer' },
];
```

This list must be easy to extend (add/remove members, add new roles) without touching
pipeline logic.

---

## Criteria Configuration (data, not code)

File: `server/utils/review/criteriaConfig.ts`

Each role maps to an ordered list of criteria. Total points = sum of criterion `maxPoints`.

```ts
export interface CriterionDefinition {
  key: string;               // stable key, e.g. "codeQuality"
  label: string;              // "Code Quality"
  maxPoints: number;
  description: string;        // full guidance text injected into the prompt
}

export interface RoleCriteriaSet {
  role: string;
  totalPoints: number;
  criteria: CriterionDefinition[];
}
```

Role definitions (derived directly from the existing manual prompt):

- **sr-engineer** (25 pts total): Code Quality (15), DB Query Performance (5),
  Architecture & Performance Improvement (5)
- **jr-engineer** (20 pts total): Code Quality (15), DB Query Performance (5)
  — Architecture criterion is skipped entirely for Jr. engineers.
- **sr-frontend-engineer** (25 pts total): Code Quality (15), Frontend Performance &
  Optimization (5) — *replaces* DB Query Performance, Architecture & Performance
  Improvement (5)

Full criterion descriptions to preserve from the existing prompt (used verbatim in the
`description` field, then injected into the AI prompt):

- **Code Quality (15 pts):** PHP/JS standard coding practice (PSR-12 for backend, Vue
  3/Nuxt 3/TS best practices for frontend); standard DB query coding (Eloquent,
  transactions, updateOrCreate etc.) or equivalent frontend data handling; form validation,
  routes, models, views, controllers, variable naming, route model binding; code
  complexity, readability, indentation, formatting, proper directory structure; git commit
  messages, code commenting, TODO keeping.
- **DB Query Performance (5 pts):** no N+1 queries, no queries inside loops, proper eager
  loading, bulk operations.
- **Frontend Performance & Optimization (5 pts, Shamsad only):** avoiding unnecessary
  re-renders, proper computed/watch usage, lazy loading, image optimization, avoiding
  redundant API calls, efficient store usage.
- **Architecture & Performance Improvement (5 pts, Sr. only):** contribution to system
  architecture design and performance improvement.

This structure must allow adding a new role or swapping a criterion (as was done for
Shamsad) via config edits only.

---

## GitHub Diff Fetching

File: `server/utils/review/githubClient.ts`

- Reuse/extend the existing GitHub API integration already used by the commit-list feature
  — **do not duplicate auth/token handling logic; confirm with the user where the existing
  GitHub API client/token lives before adding a new one.**
- For a given team member (all `githubLogins`) and date range, fetch all commits authored
  by them (not PR review comments authored by others — filter by commit author, not PR
  participant).
- For each commit, fetch the diff/patch content via the GitHub API (not by scraping the
  HTML diff page).
- Exclude clearly non-review-worthy files before sending to the AI: lockfiles
  (`package-lock.json`, `composer.lock`, `yarn.lock`), build artifacts, vendor/node_modules
  paths, and migration files with no business logic (confirm exact exclusion list with user
  during implementation — don't guess silently).
- **Context budget handling:** if a member's combined diffs for the period are very large,
  truncate per-file diffs (favor keeping the most substantive files) rather than dropping
  whole commits. Define and confirm a rough token/character budget before implementing this
  truncation logic.

Output: for each team member, an ordered list of `{ sha, message, url, diff, filesChanged,
additions, deletions }` objects, with merged identities already collapsed into one list per
person.

---

## Prompt Building

File: `server/utils/review/promptBuilder.ts`

- One prompt per team member, built dynamically from:
  - The member's role's `RoleCriteriaSet` (criteria, points, descriptions)
  - The member's full list of commit diffs for the period
  - Instructions to **skip trivial commits** (typo fixes, single-line changes, label
    updates, merge commits) — the AI decides this per-commit as part of the same prompt,
    per the original manual workflow
  - Instructction to review actual diffs, not commit messages alone
- The prompt must instruct the AI to return **only valid JSON** matching the schema below —
  no prose, no markdown fences.

Required JSON response schema per member:

```json
{
  "memberId": "iftekher-mahmud",
  "scores": [
    { "criterionKey": "codeQuality", "score": 13, "maxPoints": 15, "comment": "..." },
    { "criterionKey": "dbQueryPerformance", "score": 4, "maxPoints": 5, "comment": "..." },
    { "criterionKey": "architecturePerformance", "score": 4, "maxPoints": 5, "comment": "..." }
  ],
  "totalScore": 21,
  "totalMaxPoints": 25,
  "summaryFeedback": "1-2 line overall summary",
  "commitsReviewed": ["sha1", "sha2"],
  "commitsSkippedAsTrivial": ["sha3"]
}
```

`scores` array length/keys must match the member's role criteria set exactly (e.g. Jr.
engineers have no `architecturePerformance` entry).

---

## AI Review Client

File: `server/utils/review/claudeReviewClient.ts`

- Calls the Claude API (model: confirm which model/version to use — do not hardcode an
  assumption; check current available models before implementing) with the built prompt.
- Validates the response against the expected JSON schema (e.g. with `zod`). If validation
  fails, retry once with an explicit "your last response was invalid JSON, return only
  valid JSON matching this schema" follow-up before failing the run for that member.
- Must not leak API keys to the client/browser — server-side only, key from environment
  variable.

---

## Orchestration

File: `server/utils/review/reviewOrchestrator.ts`
Endpoint: `server/api/review/run.post.ts`

Flow:
1. Accept `{ startDate, endDate }` from the request body (same date range UX as the
   existing commit list feature).
2. For each `teamMembers` entry:
   a. Fetch commits + diffs via `githubClient`
   b. Build prompt via `promptBuilder`
   c. Call `claudeReviewClient`, get validated structured result
3. Collect all member results in memory.
4. Pass results to `excelGenerator` to build the two-sheet workbook.
5. Stream the `.xlsx` file back as the HTTP response (`Content-Disposition: attachment`),
   nothing written to disk/DB.

Consider: should member processing run sequentially or in parallel (`Promise.all`)?
Parallel is faster but increases simultaneous Claude API + GitHub API load — **confirm rate
limit / cost tolerance with user before deciding** during implementation.

---

## Excel Generation

File: `server/utils/review/excelGenerator.ts`

Library: `exceljs` (confirm available/installable in the project before adding).

Two sheets, generic over whatever criteria keys are present in the results (do not hardcode
column names to the current 3-criteria setup, since roles can have different criteria
sets):

**Sheet 1: "Detailed Report"**
- One section per team member
- Table: Criterion | Score | Comment, then a Total row, then 1-2 line summary feedback

**Sheet 2: "Summary"**
- One row per team member
- Columns: Name, Role, [one column per distinct criterion key encountered across all
  members, e.g. "Code Quality", "DB Query Performance / Frontend Performance", "Architecture
  & Performance"], Total, Summary Feedback
- Where a member's role doesn't include a given criterion (e.g. Jr. engineers and
  Architecture), leave that cell blank or "N/A"

---

## Dashboard UI Changes

- Add a "Run KPI Review" button to the existing dashboard, using the same date range
  already selected for commit fetching.
- On click: POST to `/api/review/run`, show a loading state (this may take a while —
  multiple sequential/parallel AI calls), then trigger the file download when the response
  arrives.
- **Confirm with user before modifying existing dashboard components** — prefer adding a
  new isolated component/button rather than restructuring existing UI, unless the user
  directs otherwise.

---

## File Structure Summary

```
server/
  api/
    review/
      run.post.ts            -- orchestration endpoint
  utils/
    review/
      teamConfig.ts           -- team members + roles (data)
      criteriaConfig.ts        -- KPI criteria per role (data)
      githubClient.ts          -- fetch commits + diffs from GitHub
      promptBuilder.ts          -- builds per-member AI prompt from config + diffs
      claudeReviewClient.ts      -- calls Claude API, validates structured response
      excelGenerator.ts          -- builds the 2-sheet .xlsx, generic over criteria
      reviewOrchestrator.ts       -- ties the above together
```

---

## Open Questions to Resolve Before/During Implementation

These were deliberately left open and should be confirmed with the user (not assumed):

1. Where does the existing GitHub API client/token live in the current codebase — reuse it,
   don't duplicate.
2. Exact file-exclusion list for diffs sent to the AI (lockfiles, migrations, etc.).
3. Diff size/token budget and truncation strategy for large members.
4. Which Claude model to call from the server (verify current available models, don't
   assume from training data).
5. Sequential vs. parallel processing of team members (cost/rate-limit tradeoff).
6. Exact landing spot for the new "Run KPI Review" button in the existing dashboard UI.

## Working Agreement

Per the user's stated preference: **consult before changing any existing file.** New files
under `server/utils/review/` and the new API route can be created directly. Any change to
existing files (GitHub client reuse, dashboard UI, package.json dependencies) should be
proposed and confirmed first.