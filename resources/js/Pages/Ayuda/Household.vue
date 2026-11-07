<script setup>
import { ref, watch } from 'vue'
import { Head, Link, useForm } from '@inertiajs/vue3'
import QRCode from 'qrcode'
import { ArrowLeft, Printer, Ticket, MapPin } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import CommunityMap from '@/Components/CommunityMap.vue'
const props = defineProps({ household: Object, programs: Array, enrollments: Array })
const form = useForm({ household_id: props.household.id, program_id: '' })
const codes = ref({})
watch(
  () => props.enrollments,
  async (rows) => {
    for (const e of rows)
      codes.value[e.id] = await QRCode.toDataURL(e.token, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
  },
  { immediate: true },
)
const print = () => window.print()
</script>
<template>
  <AppLayout
    ><Head :title="household.head" /><Link
      href="/households"
      class="link inline-flex items-center gap-2 mb-6 no-print"
      ><ArrowLeft :size="16" /> Household census</Link
    >
    <div class="page-heading no-print">
      <div>
        <p class="eyebrow">HH-{{ String(household.id).padStart(5, '0') }}</p>
        <h1>{{ household.head }}</h1>
        <p class="muted">{{ household.purok }} · {{ household.address }}</p>
      </div>
      <button v-if="enrollments.length" class="btn" @click="print">
        <Printer :size="17" /> Print QR stubs
      </button>
    </div>
    <div class="dashboard-columns no-print">
      <section class="card card-border bg-base-100 form-panel">
        <h2>Household record</h2>
        <div class="detail-grid">
          <div>
            <small>CONTACT</small><strong>{{ household.phone || 'Not provided' }}</strong>
          </div>
          <div>
            <small>HOUSEHOLD SIZE</small
            ><strong>{{ 1 + (household.members?.length || 0) }} members</strong>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Relationship</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ household.head }}</td>
              <td>Head of family</td>
              <td>-</td>
            </tr>
            <tr v-for="m in household.members" :key="m.id">
              <td>{{ m.name }}</td>
              <td>{{ m.relationship }}</td>
              <td>{{ m.age }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="card card-border bg-base-100 form-panel">
        <h2><MapPin :size="19" /> Home location</h2>
        <CommunityMap :latitude="household.latitude" :longitude="household.longitude" />
      </section>
    </div>
    <section class="card card-border bg-base-100 form-panel no-print">
      <h2><Ticket :size="20" /> Program enrollment</h2>
      <p class="muted">Confirm eligibility before enrolling. Each program gets its own QR stub.</p>
      <form class="inline-form" @submit.prevent="form.post('/enrollments')">
        <select
          class="select w-full"
          v-model.number="form.program_id"
          required
          aria-label="Select assistance program"
        >
          <option disabled value="">Select an open program</option>
          <option
            v-for="p in programs.filter((p) => !enrollments.some((e) => e.program_id === p.id))"
            :key="p.id"
            :value="p.id"
          >
            {{ p.name }} · {{ p.date }}
          </option></select
        ><button class="btn" :disabled="form.processing">Enroll & issue stub</button>
      </form>
      <p v-for="(e, k) in form.errors" :key="k" class="field-error">{{ e }}</p>
    </section>
    <div class="stub-grid">
      <article v-for="e in enrollments" :key="e.id" class="qr-stub">
        <div class="stub-header">
          <strong>AyudaSys</strong><span>CLAIM STUB · #{{ e.id }}</span>
        </div>
        <div class="stub-body">
          <div>
            <span class="eyebrow">{{ e.program.name }}</span>
            <h2>{{ household.head }}</h2>
            <p>{{ household.purok }} · HH-{{ String(household.id).padStart(5, '0') }}</p>
            <dl>
              <dt>ASSISTANCE</dt>
              <dd>{{ e.program.assistance }}</dd>
              <dt>DATE & VENUE</dt>
              <dd>{{ e.program.date }} · {{ e.program.venue }}</dd>
            </dl>
          </div>
          <img
            :src="codes[e.id]"
            alt="QR code for this program enrollment"
            width="180"
            height="180"
          />
        </div>
        <p class="stub-instruction">
          Bring this stub and valid identification on distribution day. Subject to staff
          verification.
        </p>
        <p class="stub-token">{{ e.token }}</p>
      </article>
    </div></AppLayout
  >
</template>
