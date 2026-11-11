import assert from 'node:assert/strict'
import test from 'node:test'
import app from '../src/app.js'

test('POST /api/auth/login is mounted and validates required credentials', async () => {
  const server = app.listen(0)

  try {
    await new Promise((resolve) => server.once('listening', resolve))
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    assert.equal(response.status, 400)
    assert.equal((await response.json()).message, 'Email and password are required')
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
})
