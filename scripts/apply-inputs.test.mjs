import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('build workflow and input script are present', async () => {
  const workflow = await readFile(new URL('../.github/workflows/build.yml', import.meta.url), 'utf8')
  const script = await readFile(new URL('./apply-inputs.mjs', import.meta.url), 'utf8')
  assert.match(workflow, /workflow_dispatch/)
  assert.match(workflow, /apply-inputs\.mjs/)
  assert.match(workflow, /upload-pages-artifact/)
  assert.match(script, /manual_categories/)
  assert.match(script, /Invalid username/)
})
