import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { userId, pin } = await readBody(event)
  const authPin = process.env.AUTH_PIN
  const authUsers = (process.env.AUTH_USERS || '').split(',').map(id => id.trim()).filter(Boolean)

  if (!authPin || !authUsers.length) return { error: 'Auth not configured' }
  if (!userId || !authUsers.includes(userId)) return { error: 'Invalid user ID or PIN' }
  if (!pin || pin !== authPin) return { error: 'Invalid user ID or PIN' }

  await setUserSession(event, { user: { id: userId, authenticated: true } })

  return { ok: true }
})
