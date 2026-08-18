const PUBLIC_API_ROUTES = new Set(['/api/auth', '/api/_auth/session'])

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]

  if (!path.startsWith('/api/') || PUBLIC_API_ROUTES.has(path)) return

  const session = await getUserSession(event)
  if (!session.user?.authenticated) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
