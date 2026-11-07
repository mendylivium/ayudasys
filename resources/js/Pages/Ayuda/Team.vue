<script setup>
import { ref } from 'vue'
import { Head, useForm, router, usePage } from '@inertiajs/vue3'
import { Plus, ShieldCheck, ClipboardList, ScanLine } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
defineProps({ users: Array })
const creating = ref(false)
const me = usePage().props.auth.user.id
const form = useForm({ name: '', email: '', password: '', role: 'enumerator' })
function remove(u) {
  if (window.confirm('Revoke access for ' + u.name + '?')) router.delete('/users/' + u.id)
}
</script>
<template>
  <AppLayout
    ><Head title="Team & access" />
    <div class="page-heading">
      <div>
        <h1>Team & access</h1>
        <p class="muted">Give each staff member the tools they need for their role.</p>
      </div>
      <button class="btn" @click="creating = !creating">
        <Plus :size="18" /> Add staff member
      </button>
    </div>
    <div class="program-grid role-grid">
      <article
        v-for="role in [
          {
            name: 'Administrator',
            icon: ShieldCheck,
            text: 'Manage programs, staff, census, and distribution.',
          },
          {
            name: 'Enumerator',
            icon: ClipboardList,
            text: 'Register households, map homes, and issue QR stubs.',
          },
          {
            name: 'Distributor',
            icon: ScanLine,
            text: 'Scan stubs, verify recipients, and record releases.',
          },
        ]"
        :key="role.name"
        class="card card-border bg-base-100 form-panel"
      >
        <component :is="role.icon" :size="24" />
        <h3>{{ role.name }}</h3>
        <p class="muted">{{ role.text }}</p>
      </article>
    </div>
    <form
      v-if="creating"
      class="card card-border bg-base-100 form-panel"
      @submit.prevent="
        form.post('/team', {
          onSuccess: () => {
            if (!usePage().props.flash?.error) {
              form.reset()
              creating = false
            }
          },
        })
      "
    >
      <h2>New staff account</h2>
      <div class="field-grid">
        <label
          >Full name<input
            class="input w-full"
            v-model="form.name"
            required
            maxlength="100" /></label
        ><label
          >Email address<input
            class="input w-full"
            v-model="form.email"
            type="email"
            required
            maxlength="100" /></label
        ><label
          >Initial password<input
            class="input w-full"
            v-model="form.password"
            type="password"
            minlength="12"
            maxlength="72"
            required
            autocomplete="new-password"
            placeholder="At least 12 characters" /></label
        ><label
          >Role<select class="select w-full" v-model="form.role">
            <option value="enumerator">Enumerator</option>
            <option value="distributor">Distributor</option>
            <option value="admin">Administrator</option>
          </select></label
        >
      </div>
      <p v-for="(e, k) in form.errors" :key="k" class="field-error">{{ e }}</p>
      <div class="form-actions">
        <button class="btn" :disabled="form.processing">Create staff account</button>
      </div>
    </form>
    <section class="card card-border bg-base-100 table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Staff member</th>
            <th>Email</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <div class="name-cell">
                <span
                  class="bg-neutral text-neutral-content rounded-full inline-flex items-center justify-center size-9 shrink-0"
                  >{{ u.name.charAt(0) }}</span
                ><strong>{{ u.name }}</strong>
              </div>
            </td>
            <td>{{ u.email }}</td>
            <td>
              <span class="badge">{{ u.role }}</span>
            </td>
            <td>
              <button
                v-if="u.id !== me"
                class="btn btn-ghost btn-sm inline-flex items-center gap-1 text-error"
                @click="remove(u)"
              >
                Revoke access</button
              ><span v-else class="muted">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section></AppLayout
  >
</template>
