import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeMonthlyLanguages } from '../src/analytics.js'

const now = new Date('2026-10-05T12:00:00.000Z')

test('monthly language summary counts current-month stars and excludes other months', () => {
  const repos = [
    { language: 'TypeScript', starred_at: '2026-10-01T00:00:00.000Z' },
    { language: 'TypeScript', starred_at: '2026-10-03T11:00:00.000Z' },
    { language: 'JavaScript', starred_at: '2026-10-04T08:00:00.000Z' },
    { language: null, starred_at: '2026-10-04T09:00:00.000Z' },
    { language: 'Python', starred_at: '2026-09-30T23:59:59.000Z' },
    { language: 'Rust', starred_at: '2026-10-05T12:00:01.000Z' },
    { language: 'Go', starred_at: null },
  ]
  const result = summarizeMonthlyLanguages(repos, now)
  assert.equal(result.year, 2026)
  assert.equal(result.month, 10)
  assert.equal(result.monthStart, Date.UTC(2026, 9, 1))
  assert.equal(result.totalRepos, 4)
  assert.equal(result.classifiedRepos, 3)
  assert.deepEqual(result.languages, [
    { language: 'TypeScript', count: 2, share: 67 },
    { language: 'JavaScript', count: 1, share: 33 },
  ])
})

test('monthly language summary sorts ties alphabetically, limits results and handles empty datasets', () => {
  const repos = [
    { language: 'Rust', starred_at: '2026-10-01T00:00:00Z' },
    { language: 'Go', starred_at: '2026-10-02T00:00:00Z' },
    { language: 'C', starred_at: '2026-10-03T00:00:00Z' },
  ]
  assert.deepEqual(summarizeMonthlyLanguages(repos, now, 2).languages, [
    { language: 'C', count: 1, share: 33 },
    { language: 'Go', count: 1, share: 33 },
  ])
  assert.deepEqual(summarizeMonthlyLanguages([], now).languages, [])
})
