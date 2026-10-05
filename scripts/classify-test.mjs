import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyRepo } from '../src/category-engine.js'
import { classifyResponse, fetchContributorCount, fetchOpenGraphUrls, normalize } from './sync-stars.mjs'
test('whole-word classification avoids false positives', () => {
  assert.notEqual(classifyRepo({ full_name: 'ohmyzsh/ohmyzsh', name: 'ohmyzsh', description: 'shell framework' }), 'ai-ml')
  assert.notEqual(classifyRepo({ full_name: 'torvalds/linux', name: 'linux', description: 'kernel' }), 'design-creative')
  assert.equal(classifyRepo({ full_name: 'x/y', name: 'y', topics: ['kernelsu'] }), 'android-modding')
  assert.notEqual(classifyRepo({ name: 'html parser', language: 'HTML' }), 'ai-ml')
  assert.equal(classifyRepo({ full_name: 'x/y', name: 'y' }, { 'x/y': 'security' }), 'security')
})
test('normalization keeps the v2 data contract', () => {
  const repo = normalize({ starred_at: '2025-01-01T00:00:00Z', repo: { id: 1, full_name: 'x/y', name: 'y', owner: { login: 'x' }, html_url: 'https://github.com/x/y', homepage: 'javascript:alert(1)', topics: ['cli'], stargazers_count: 2, forks_count: 1 } })
  assert.equal(repo.homepage, ''); assert.equal(repo.starred_at, '2025-01-01T00:00:00Z'); assert.equal(repo.owner, 'x'); assert.ok(!('updated_at' in repo))
})
test('rate limit classifier distinguishes generic forbidden responses', () => {
  assert.equal(classifyResponse(new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })), 'rate_limited')
  assert.equal(classifyResponse(new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '4' } })), 'error')
  assert.equal(classifyResponse(new Response('', { status: 429 })), 'rate_limited')
})

test('contributor count uses the last pagination page without fetching every contributor', async () => {
  const result = await fetchContributorCount('x/y', async (url, options) => {
    assert.match(url, /\/repos\/x\/y\/contributors\?per_page=1&anon=true$/)
    assert.equal(options.headers.Accept, 'application/vnd.github+json')
    return new Response(JSON.stringify([{ login: 'alice' }]), {
      headers: { link: '<https://api.github.com/repos/x/y/contributors?per_page=1&page=42>; rel="last"' },
    })
  })
  assert.deepEqual(result, { count: 42, rateLimited: false })
})

test('contributor count handles one-page, empty and rate-limited responses', async () => {
  const one = await fetchContributorCount('x/y', async () => new Response(JSON.stringify([{ login: 'alice' }])))
  const empty = await fetchContributorCount('x/y', async () => new Response('[]'))
  const limited = await fetchContributorCount('x/y', async () => new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } }))
  assert.deepEqual(one, { count: 1, rateLimited: false })
  assert.deepEqual(empty, { count: 0, rateLimited: false })
  assert.deepEqual(limited, { count: null, rateLimited: true })
})

test('repository image metadata is fetched in a batched GraphQL request', async () => {
  const urls = await fetchOpenGraphUrls([{ full_name: 'example/first' }, { full_name: 'example/second' }], async (url, options) => {
    assert.equal(url, 'https://api.github.com/graphql')
    const request = JSON.parse(options.body)
    assert.equal(request.variables.owner0, 'example')
    assert.equal(request.variables.name1, 'second')
    assert.match(request.query, /openGraphImageUrl/)
    return new Response(JSON.stringify({ data: {
      repo0: { nameWithOwner: 'example/first', openGraphImageUrl: 'https://images.test/first.png' },
      repo1: { nameWithOwner: 'example/second', openGraphImageUrl: 'https://images.test/second.png' },
    } }))
  })
  assert.equal(urls.get('example/first'), 'https://images.test/first.png')
  assert.equal(urls.get('example/second'), 'https://images.test/second.png')
})
