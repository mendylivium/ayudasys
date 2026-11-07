<script setup>
import { Head, useForm, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import FormField from '@/Components/FormField.vue'

const page = usePage()
const user = page.props.auth.user

const profile = useForm({
  name: user.name,
  email: user.email,
})

const password = useForm({
  current_password: '',
  password: '',
  password_confirmation: '',
})

function updatePassword() {
  password.put('/profile/password', {
    preserveScroll: true,
    onSuccess: () => password.reset(),
    onError: () => password.reset('current_password'),
  })
}
</script>

<template>
  <AppLayout>
    <Head title="Profile" />

    <h1 class="mb-6 text-2xl font-bold">Profile</h1>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card border border-base-300 bg-base-100">
        <form class="card-body" @submit.prevent="profile.put('/profile', { preserveScroll: true })">
          <h2 class="card-title">Profile information</h2>

          <FormField v-slot="{ invalid }" label="Name" :error="profile.errors.name">
            <input
              v-model="profile.name"
              type="text"
              class="input w-full"
              :class="{ 'input-error': invalid }"
              required
            />
          </FormField>

          <FormField v-slot="{ invalid }" label="Email" :error="profile.errors.email">
            <input
              v-model="profile.email"
              type="email"
              class="input w-full"
              :class="{ 'input-error': invalid }"
              required
            />
          </FormField>

          <div class="card-actions justify-end pt-2">
            <button type="submit" class="btn btn-primary" :disabled="profile.processing">
              Save
            </button>
          </div>
        </form>
      </div>

      <div class="card border border-base-300 bg-base-100">
        <form class="card-body" @submit.prevent="updatePassword">
          <h2 class="card-title">Update password</h2>

          <FormField
            v-slot="{ invalid }"
            label="Current password"
            :error="password.errors.current_password"
          >
            <input
              v-model="password.current_password"
              type="password"
              class="input w-full"
              :class="{ 'input-error': invalid }"
              autocomplete="current-password"
            />
          </FormField>

          <FormField v-slot="{ invalid }" label="New password" :error="password.errors.password">
            <input
              v-model="password.password"
              type="password"
              class="input w-full"
              :class="{ 'input-error': invalid }"
              autocomplete="new-password"
            />
          </FormField>

          <FormField
            v-slot="{ invalid }"
            label="Confirm password"
            :error="password.errors.password_confirmation"
          >
            <input
              v-model="password.password_confirmation"
              type="password"
              class="input w-full"
              :class="{ 'input-error': invalid }"
              autocomplete="new-password"
            />
          </FormField>

          <div class="card-actions justify-end pt-2">
            <button type="submit" class="btn btn-primary" :disabled="password.processing">
              Update password
            </button>
          </div>
        </form>
      </div>
    </div>
  </AppLayout>
</template>
