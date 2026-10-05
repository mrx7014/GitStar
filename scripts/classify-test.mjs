import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyRepo } from '../src/category-engine.js'
import { classifyResponse, normalize } from './sync-stars.mjs'
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
