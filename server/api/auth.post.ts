import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { pin } = await readBody(event)
  const authPin = process.env.AUTH_PIN

  if (!authPin) return { error: 'AUTH_PIN not configured' }
  if (!pin || pin !== authPin) return { error: 'Invalid PIN' }

  return { ok: true }
})
