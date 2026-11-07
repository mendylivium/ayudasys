<script setup>
import { Head, Link, router } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import { formatDate } from '@/lib/format'

const props = defineProps({
  post: { type: Object, required: true },
  can: { type: Object, default: () => ({}) },
})

function destroy() {
  if (confirm('Delete this post? This cannot be undone.')) {
    router.delete(`/posts/${props.post.id}`)
  }
}
</script>

<template>
  <AppLayout>
    <Head :title="post.title" />

    <div class="breadcrumbs mb-4 text-sm">
      <ul>
        <li><Link href="/posts">Posts</Link></li>
        <li>{{ post.title }}</li>
      </ul>
    </div>

    <article class="card border border-base-300 bg-base-100">
      <div class="card-body gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold">{{ post.title }}</h1>
            <p class="mt-1 text-sm text-base-content/60">
              By {{ post.user?.name }} · {{ formatDate(post.created_at) }}
              <span v-if="!post.published" class="badge badge-warning badge-sm ml-2">Draft</span>
            </p>
          </div>
          <div v-if="can.update || can.delete" class="flex gap-2">
            <Link v-if="can.update" :href="`/posts/${post.id}/edit`" class="btn btn-sm">Edit</Link>
            <button v-if="can.delete" class="btn btn-error btn-outline btn-sm" @click="destroy">
              Delete
            </button>
          </div>
        </div>
        <div class="divider my-0" />
        <p class="whitespace-pre-line leading-relaxed">{{ post.body }}</p>
      </div>
    </article>
  </AppLayout>
</template>
