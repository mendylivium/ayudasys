<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import PostForm from '@/Components/PostForm.vue'

const props = defineProps({
  post: { type: Object, required: true },
})

const form = useForm({
  title: props.post.title,
  body: props.post.body,
  published: props.post.published,
})
</script>

<template>
  <AppLayout>
    <Head :title="`Edit: ${post.title}`" />

    <div class="card mx-auto max-w-3xl border border-base-300 bg-base-100">
      <div class="card-body">
        <h1 class="card-title text-2xl">Edit post</h1>
        <PostForm :form="form" submit-label="Save changes" @submit="form.put(`/posts/${post.id}`)">
          <template #actions>
            <Link :href="`/posts/${post.id}`" class="btn btn-ghost">Cancel</Link>
          </template>
        </PostForm>
      </div>
    </div>
  </AppLayout>
</template>
