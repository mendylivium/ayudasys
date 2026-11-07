<script setup>
import { Head, Link, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import { excerpt, formatDate } from '@/lib/format'

defineProps({
  posts: { type: Array, default: () => [] },
})

const page = usePage()
</script>

<template>
  <AppLayout>
    <Head title="Welcome" />

    <section class="hero rounded-box bg-base-100 py-12">
      <div class="hero-content text-center">
        <div class="max-w-xl">
          <h1 class="text-4xl font-bold sm:text-5xl">Go MVC, the Laravel way.</h1>
          <p class="py-6 text-base-content/70">
            Fiber v3 on the backend, Vue 3 + Inertia on the frontend, styled with DaisyUI.
            Controllers return pages — no separate SPA router, no token juggling.
          </p>
          <div class="flex justify-center gap-2">
            <Link v-if="page.props.auth.user" href="/dashboard" class="btn btn-primary"
              >Go to dashboard</Link
            >
            <Link v-else href="/register" class="btn btn-primary">Get started</Link>
            <Link href="/posts" class="btn btn-ghost">Browse posts</Link>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="mb-4 text-xl font-semibold">Latest posts</h2>
      <div v-if="posts.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          v-for="post in posts"
          :key="post.id"
          :href="`/posts/${post.id}`"
          class="card border border-base-300 bg-base-100 transition hover:shadow-md"
        >
          <div class="card-body">
            <h3 class="card-title text-base">{{ post.title }}</h3>
            <p class="text-sm text-base-content/70">{{ excerpt(post.body, 100) }}</p>
            <p class="text-xs text-base-content/50">
              {{ post.user?.name }} · {{ formatDate(post.created_at) }}
            </p>
          </div>
        </Link>
      </div>
      <p v-else class="text-base-content/60">No posts yet.</p>
    </section>
  </AppLayout>
</template>
