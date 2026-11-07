<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3'
import GuestLayout from '@/Layouts/GuestLayout.vue'
import FormField from '@/Components/FormField.vue'

const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

function submit() {
  form.post('/register', {
    onFinish: () => form.reset('password', 'password_confirmation'),
  })
}
</script>

<template>
  <GuestLayout title="Create an account">
    <Head title="Register" />

    <form class="space-y-1" @submit.prevent="submit">
      <FormField v-slot="{ invalid }" label="Name" :error="form.errors.name">
        <input
          v-model="form.name"
          type="text"
          class="input w-full"
          :class="{ 'input-error': invalid }"
          autocomplete="name"
          autofocus
          required
        />
      </FormField>

      <FormField v-slot="{ invalid }" label="Email" :error="form.errors.email">
        <input
          v-model="form.email"
          type="email"
          class="input w-full"
          :class="{ 'input-error': invalid }"
          autocomplete="username"
          required
        />
      </FormField>

      <FormField
        v-slot="{ invalid }"
        label="Password"
        :error="form.errors.password"
        hint="At least 8 characters."
      >
        <input
          v-model="form.password"
          type="password"
          class="input w-full"
          :class="{ 'input-error': invalid }"
          autocomplete="new-password"
          required
        />
      </FormField>

      <FormField
        v-slot="{ invalid }"
        label="Confirm password"
        :error="form.errors.password_confirmation"
      >
        <input
          v-model="form.password_confirmation"
          type="password"
          class="input w-full"
          :class="{ 'input-error': invalid }"
          autocomplete="new-password"
          required
        />
      </FormField>

      <button type="submit" class="btn btn-primary mt-4 w-full" :disabled="form.processing">
        <span v-if="form.processing" class="loading loading-spinner loading-sm" />
        Register
      </button>
    </form>

    <template #footer>
      <p class="text-sm">
        Already registered?
        <Link href="/login" class="link link-primary">Log in</Link>
      </p>
    </template>
  </GuestLayout>
</template>
