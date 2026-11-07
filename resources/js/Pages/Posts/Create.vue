<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import PostForm from '@/Components/PostForm.vue'

const form = useForm({
  title: '',
  body: '',
  published: false,
})
</script>

<template>
  <AppLayout>
    <Head title="New post" />

    <div class="card mx-auto max-w-3xl border border-base-300 bg-base-100">
      <div class="card-body">
        <h1 class="card-title text-2xl">New post</h1>
        <PostForm :form="form" submit-label="Create post" @submit="form.post('/posts')">
          <template #actions>
            <Link href="/posts" class="btn btn-ghost">Cancel</Link>
          </template>
        </PostForm>
      </div>
    </div>
  </AppLayout>
</template>
