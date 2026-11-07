<script setup>
import { computed, ref } from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
import {
  LayoutDashboard,
  House,
  Package,
  ScanLine,
  UsersRound,
  LogOut,
  Sprout,
  Menu,
  ShieldCheck,
  X,
} from '@lucide/vue'
import FlashMessages from '@/Components/FlashMessages.vue'
const page = usePage()
const user = computed(() => page.props.auth?.user)
const menu = ref(false)
const links = computed(() => [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  ...(['admin', 'enumerator'].includes(user.value?.role)
    ? [{ label: 'Household census', href: '/households', icon: House }]
    : []),
  { label: 'Assistance programs', href: '/programs', icon: Package },
  ...(['admin', 'distributor'].includes(user.value?.role)
    ? [{ label: 'Scan & distribute', href: '/distribute', icon: ScanLine }]
    : []),
  ...(user.value?.role === 'admin'
    ? [{ label: 'Team & access', href: '/team', icon: UsersRound }]
    : []),
])
const active = (href) => page.url.split('?')[0] === href || page.url.startsWith(href + '/')
const section = computed(() => links.value.find((l) => active(l.href)))
const detail = computed(() => {
  const path = page.url.split('?')[0]
  if (path === '/profile') return 'My profile'
  if (path === '/households/create') return 'Register household'
  if (/^\/households\/\d+$/.test(path)) return 'Household record'
  return ''
})
</script>
<template>
  <div class="drawer lg:drawer-open" @keydown.esc="menu = false">
    <a href="#workspace-main" class="skip-link btn">Skip to main content</a>
    <input id="workspace-drawer" v-model="menu" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content min-w-0 min-h-screen flex flex-col">
      <header class="navbar bg-base-100 border-b border-base-200 px-4 lg:px-8 min-h-18 no-print">
        <button
          type="button"
          class="btn btn-ghost btn-square lg:hidden mr-2"
          aria-label="Toggle navigation"
          aria-controls="workspace-navigation"
          :aria-expanded="menu"
          @click="menu = !menu"
        >
          <Menu :size="21" />
        </button>
        <div class="breadcrumbs text-sm min-w-0 flex-1">
          <ul>
            <li class="text-base-content/50 hidden sm:block">Community workspace</li>
            <li class="font-medium" :class="{ 'hidden sm:flex': detail && section }">
              <Link v-if="detail && section" :href="section.href">{{ section.label }}</Link>
              <span v-else>{{ detail || section?.label || 'Workspace' }}</span>
            </li>
            <li v-if="detail && section" class="font-medium">{{ detail }}</li>
          </ul>
        </div>
        <Link href="/profile" aria-label="My profile" class="btn btn-ghost h-auto py-2 gap-3"
          ><div class="hidden sm:block text-right">
            <p class="text-sm font-medium">{{ user?.name }}</p>
            <p class="text-xs font-normal text-base-content/50 capitalize">{{ user?.role }}</p>
          </div>
          <span class="avatar avatar-placeholder"
            ><span class="bg-base-200 rounded-full size-9"
              ><span class="text-sm">{{ user?.name?.slice(0, 1) }}</span></span
            ></span
          ></Link
        >
      </header>
      <main id="workspace-main" tabindex="-1" class="main-content"><slot /></main>
      <footer
        class="flex justify-between gap-4 px-5 lg:px-8 py-6 text-xs text-base-content/40 no-print"
      >
        <span>AyudaSys</span><span>Community assistance management</span>
      </footer>
    </div>
    <div class="drawer-side z-40 no-print">
      <label for="workspace-drawer" class="drawer-overlay" aria-label="Close navigation"></label>
      <aside
        id="workspace-navigation"
        class="bg-base-100 border-r border-base-200 min-h-full w-62 flex flex-col px-4 py-6"
      >
        <button
          class="btn btn-ghost btn-square btn-sm self-end lg:hidden mb-3"
          aria-label="Close navigation"
          @click="menu = false"
        >
          <X :size="18" />
        </button>
        <Link href="/dashboard" class="flex items-center gap-3 px-3 mb-9"
          ><span
            class="bg-neutral text-neutral-content rounded-box size-9 inline-flex items-center justify-center"
            ><Sprout :size="23" /></span
          ><span class="text-xl font-bold tracking-tight">AyudaSys</span></Link
        >
        <nav aria-label="Main navigation">
          <ul class="menu w-full gap-1 p-0">
            <li class="menu-title text-xs font-medium px-3 pb-3">Workspace</li>
            <li v-for="link in links" :key="link.href">
              <Link
                :href="link.href"
                class="py-3 gap-3 text-sm"
                :class="{ 'menu-active': active(link.href) }"
                :aria-current="active(link.href) ? 'page' : undefined"
                @click="menu = false"
                ><component :is="link.icon" :size="18" stroke-width="1.7" />{{ link.label }}</Link
              >
            </li>
          </ul>
        </nav>
        <div class="mt-auto pt-12">
          <div class="px-3 pb-6">
            <ShieldCheck :size="21" class="text-base-content/40 mb-3" />
            <p class="text-sm font-medium">Your community's records</p>
            <p class="text-xs text-base-content/50 leading-relaxed mt-2">
              Access is based on your assigned staff role.
            </p>
          </div>
          <div class="border-t border-base-200 pt-3">
            <Link href="/profile" class="btn btn-ghost justify-start w-full font-normal text-sm"
              ><UsersRound :size="17" />My profile</Link
            ><button
              class="btn btn-ghost justify-start w-full font-normal text-sm text-base-content/60"
              @click="router.post('/logout')"
            >
              <LogOut :size="17" />Sign out
            </button>
          </div>
        </div>
      </aside>
    </div>
    <FlashMessages />
  </div>
</template>
