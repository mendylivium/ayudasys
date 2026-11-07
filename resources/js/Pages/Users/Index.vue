<script setup>
import { ref, watch } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'
import Pagination from '@/Components/Pagination.vue'
import { formatDate } from '@/lib/format'

const props = defineProps({
  users: { type: Object, required: true },
  filters: { type: Object, default: () => ({}) },
})

const page = usePage()
const search = ref(props.filters.search ?? '')

let timer
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    router.get('/users', value ? { search: value } : {}, { preserveState: true, replace: true })
  }, 300)
})

function destroy(user) {
  if (confirm(`Delete ${user.name}?`)) {
    router.delete(`/users/${user.id}`, { preserveScroll: true })
  }
}
</script>

<template>
  <AppLayout>
    <Head title="Users" />

    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">Users</h1>
      <label class="input input-sm w-full sm:w-64">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path stroke-linecap="round" d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="search" type="search" placeholder="Search name or email" />
      </label>
    </div>

    <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users.data" :key="user.id" class="hover:bg-base-200">
            <td class="font-medium">{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span
                class="badge badge-sm"
                :class="user.role === 'admin' ? 'badge-primary' : 'badge-ghost'"
              >
                {{ user.role }}
              </span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td class="text-right">
              <button
                v-if="user.id !== page.props.auth.user.id"
                class="btn btn-ghost btn-xs text-error"
                @click="destroy(user)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="!users.data.length">
            <td colspan="5" class="py-8 text-center text-base-content/60">No users found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-6">
      <Pagination :meta="users" />
    </div>
  </AppLayout>
</template>
