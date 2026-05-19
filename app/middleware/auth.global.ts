export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  if (import.meta.client && localStorage.getItem('app-auth') !== 'true') {
    return navigateTo('/login')
  }
})
