<script setup>
import { Head, Link, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import { formatDate } from '@/lib/format'

defineProps({
  stats: { type: Object, required: true },
  recentPosts: { type: Array, default: () => [] },
})

const page = usePage()
</script>

<template>
  <AppLayout>
    <Head title="Dashboard" />

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-base-content/70">Hello, {{ page.props.auth.user.name }}!</p>
      </div>
      <Link href="/posts/create" class="btn btn-primary">New post</Link>
    </div>

    <div class="stats stats-vertical w-full border border-base-300 bg-base-100 sm:stats-horizontal">
      <div class="stat">
        <div class="stat-title">My posts</div>
        <div class="stat-value">{{ stats.posts }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Published</div>
        <div class="stat-value text-success">{{ stats.published }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Drafts</div>
        <div class="stat-value text-warning">{{ stats.drafts }}</div>
      </div>
      <div v-if="page.props.auth.user.role === 'admin'" class="stat">
        <div class="stat-title">Users</div>
        <div class="stat-value">{{ stats.users }}</div>
        <div class="stat-desc"><Link href="/users" class="link">Manage users</Link></div>
      </div>
    </div>

    <div class="card mt-6 border border-base-300 bg-base-100">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title">Recently updated</h2>
          <Link href="/posts?mine=1" class="link text-sm">View all</Link>
        </div>
        <ul v-if="recentPosts.length" class="divide-y divide-base-300">
          <li
            v-for="post in recentPosts"
            :key="post.id"
            class="flex items-center justify-between gap-4 py-3"
          >
            <Link :href="`/posts/${post.id}`" class="link-hover font-medium">{{ post.title }}</Link>
            <div class="flex shrink-0 items-center gap-3">
              <span
                class="badge badge-sm"
                :class="post.published ? 'badge-success' : 'badge-warning'"
              >
                {{ post.published ? 'Published' : 'Draft' }}
              </span>
              <span class="text-xs text-base-content/60">{{ formatDate(post.updated_at) }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="text-base-content/60">
          You haven't written anything yet.
          <Link href="/posts/create" class="link link-primary">Write your first post</Link>.
        </p>
      </div>
    </div>
  </AppLayout>
</template>
