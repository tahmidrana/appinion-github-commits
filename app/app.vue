<template>
  <div>
    <NuxtRouteAnnouncer />
    <nav class="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto flex max-w-5xl gap-1 px-4 py-2 sm:px-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="$route.path === '/' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
        >
          Contributors
        </NuxtLink>
        <NuxtLink
          to="/repos"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="$route.path === '/repos' ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
        >
          Repositories
        </NuxtLink>
      </div>
    </nav>
    <NuxtPage />
  </div>
</template>
