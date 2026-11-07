<script setup>
import { Head, Link, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import Pagination from '@/Components/Pagination.vue'
import { excerpt, formatDate } from '@/lib/format'

defineProps({
  posts: { type: Object, required: true },
  filters: { type: Object, default: () => ({}) },
})

const page = usePage()
</script>

<template>
  <AppLayout>
    <Head title="Posts" />

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">Posts</h1>
      <div class="flex items-center gap-2">
        <div v-if="page.props.auth.user" role="tablist" class="tabs tabs-box tabs-sm">
          <Link href="/posts" role="tab" class="tab" :class="{ 'tab-active': !filters.mine }"
            >Published</Link
          >
          <Link href="/posts?mine=1" role="tab" class="tab" :class="{ 'tab-active': filters.mine }"
            >Mine</Link
          >
        </div>
        <Link v-if="page.props.auth.user" href="/posts/create" class="btn btn-primary btn-sm"
          >New post</Link
        >
      </div>
    </div>

    <div v-if="posts.data.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        v-for="post in posts.data"
        :key="post.id"
        :href="`/posts/${post.id}`"
        class="card border border-base-300 bg-base-100 transition hover:shadow-md"
      >
        <div class="card-body">
          <div class="flex items-start justify-between gap-2">
            <h2 class="card-title text-base">{{ post.title }}</h2>
            <span v-if="!post.published" class="badge badge-warning badge-sm">Draft</span>
          </div>
          <p class="text-sm text-base-content/70">{{ excerpt(post.body) }}</p>
          <p class="text-xs text-base-content/50">
            {{ post.user?.name }} · {{ formatDate(post.created_at) }}
          </p>
        </div>
      </Link>
    </div>
    <div
      v-else
      class="rounded-box border border-dashed border-base-300 p-10 text-center text-base-content/60"
    >
      No posts found.
    </div>

    <div class="mt-6">
      <Pagination :meta="posts" />
    </div>
  </AppLayout>
</template>
