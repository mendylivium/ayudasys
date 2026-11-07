<script setup>
import { ref } from 'vue'
import { Head, useForm, usePage, router } from '@inertiajs/vue3'
import { Plus, Package, CalendarDays, MapPin, X } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
defineProps({ programs: Array })
const admin = usePage().props.auth.user.role === 'admin'
const creating = ref(false)
const form = useForm({ name: '', assistance: '', date: '', venue: '' })
function close(p) {
  if (window.confirm('Close ' + p.name + '? This stops new enrollments and claims.'))
    router.post('/programs/' + p.id + '/close')
}
</script>
<template>
  <AppLayout
    ><Head title="Assistance programs" />
    <div class="page-heading">
      <div>
        <h1>Assistance programs</h1>
        <p class="muted">Organize each distribution, from registration to release.</p>
      </div>
      <button v-if="admin" class="btn" @click="creating = !creating">
        <Plus :size="18" /> Create program
      </button>
    </div>
    <section v-if="creating" class="card card-border bg-base-100 form-panel">
      <div class="panel-heading bare">
        <h2>New assistance program</h2>
        <button
          class="btn btn-ghost btn-square btn-sm"
          aria-label="Close form"
          @click="creating = false"
        >
          <X :size="18" />
        </button>
      </div>
      <form
        @submit.prevent="
          form.post('/programs', {
            onSuccess: () => {
              form.reset()
              creating = false
            },
          })
        "
      >
        <div class="field-grid">
          <label
            >Program name<input
              class="input w-full"
              v-model="form.name"
              required
              maxlength="150"
              placeholder="e.g. Community food assistance" /></label
          ><label
            >Assistance per household<input
              class="input w-full"
              v-model="form.assistance"
              required
              maxlength="200"
              placeholder="e.g. 5 kg rice + 1 grocery pack" /></label
          ><label
            >Distribution date<input
              class="input w-full"
              v-model="form.date"
              type="date"
              required /></label
          ><label
            >Distribution venue<input
              class="input w-full"
              v-model="form.venue"
              required
              maxlength="200"
              placeholder="e.g. Barangay covered court"
          /></label>
        </div>
        <p v-for="(e, k) in form.errors" :key="k" class="field-error">{{ e }}</p>
        <div class="form-actions">
          <button class="btn" :disabled="form.processing">Create program</button>
        </div>
      </form>
    </section>
    <div v-if="!programs.length" class="card card-border bg-base-100 empty-state">
      <Package />
      <h3>Ready to make a difference?</h3>
      <p>Your assistance programs will appear here.</p>
    </div>
    <div class="program-grid">
      <article v-for="p in programs" :key="p.id" class="card card-border bg-base-100 program-card">
        <div class="panel-heading bare">
          <span
            class="bg-base-200 rounded-box inline-flex items-center justify-center size-12 shrink-0"
            ><Package :size="25" /></span
          ><span class="badge" :class="p.status === 'open' ? 'badge-success' : 'badge-neutral'">{{
            p.status
          }}</span>
        </div>
        <h2>{{ p.name }}</h2>
        <p>{{ p.assistance }}</p>
        <div class="program-details">
          <span><CalendarDays :size="17" />{{ p.date }}</span
          ><span><MapPin :size="17" />{{ p.venue }}</span>
        </div>
        <p class="alert">
          {{
            p.status === 'open'
              ? 'Open for household enrollment and verified claims.'
              : 'Enrollment and claiming are closed.'
          }}
        </p>
        <button
          v-if="admin && p.status === 'open'"
          class="btn btn-ghost btn-sm inline-flex items-center gap-1 text-error"
          @click="close(p)"
        >
          Close program
        </button>
      </article>
    </div></AppLayout
  >
</template>
