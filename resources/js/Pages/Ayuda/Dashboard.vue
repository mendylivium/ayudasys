<script setup>
import { computed } from 'vue'
import { Head, Link, usePage } from '@inertiajs/vue3'
import {
  House,
  UsersRound,
  Ticket,
  PackageCheck,
  Plus,
  ScanLine,
  ArrowRight,
  CalendarDays,
  MapPin,
  Package,
  ClipboardList,
} from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
const props = defineProps({ stats: Object, programs: Array, recent: Array })
const role = usePage().props.auth.user.role
const activePrograms = computed(() => props.programs.filter((p) => p.status === 'open'))
const metrics = [
  { key: 'households', label: 'Households', icon: House, note: 'Registered in the census' },
  { key: 'residents', label: 'Residents', icon: UsersRound, note: 'Heads and family members' },
  { key: 'enrolled', label: 'QR stubs issued', icon: Ticket, note: 'Across all programs' },
  {
    key: 'claimed',
    label: 'Assistance released',
    icon: PackageCheck,
    note: 'Confirmed household claims',
  },
]
const pending = computed(() => Math.max(0, props.stats.enrolled - props.stats.claimed))
const progress = computed(() =>
  props.stats.enrolled ? Math.round((props.stats.claimed / props.stats.enrolled) * 100) : 0,
)
const date = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
</script>
<template>
  <AppLayout
    ><Head title="Overview" />
    <div class="page-heading">
      <div>
        <h1>Community overview</h1>
        <p class="muted">Manage household records and keep distribution moving.</p>
      </div>
      <Link v-if="role !== 'distributor'" href="/households/create" class="btn"
        ><Plus :size="17" />Register household</Link
      >
    </div>
    <section
      class="stats grid grid-flow-row grid-cols-2 xl:grid-cols-4 w-full bg-base-100 border border-base-300 mb-7"
      aria-label="Community totals"
    >
      <div v-for="m in metrics" :key="m.key" class="stat min-w-0 px-5 py-6 lg:px-6">
        <div class="flex items-center justify-between gap-2">
          <div class="stat-title text-xs sm:text-sm">{{ m.label }}</div>
          <component :is="m.icon" :size="18" class="text-base-content/40 shrink-0" />
        </div>
        <div class="stat-value text-3xl font-semibold tracking-tight my-2">
          {{ stats[m.key].toLocaleString() }}
        </div>
        <div class="stat-desc whitespace-normal">{{ m.note }}</div>
      </div>
    </section>
    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] gap-6 mb-7">
      <section class="card card-border bg-base-100 min-w-0">
        <div class="px-6 py-5 flex items-center justify-between gap-3 border-b border-base-200">
          <div class="flex items-center gap-3">
            <h2 class="text-lg">Open programs</h2>
            <span class="badge badge-sm">{{ activePrograms.length }}</span>
          </div>
          <Link href="/programs" class="btn btn-ghost btn-sm"
            >View all<ArrowRight :size="15"
          /></Link>
        </div>
        <div
          v-if="!activePrograms.length"
          class="flex flex-col items-center text-center gap-3 px-6 py-14"
        >
          <span class="bg-base-200 rounded-box p-4"><Package :size="28" stroke-width="1.5" /></span>
          <h3 class="mt-2">No open programs yet</h3>
          <p class="text-sm text-base-content/60 max-w-xs">
            {{
              role === 'admin'
                ? 'Create an assistance program to start enrolling households.'
                : 'Your administrator can create a program for the next distribution.'
            }}
          </p>
          <Link v-if="role === 'admin'" href="/programs" class="btn btn-sm mt-2"
            ><Plus :size="15" />Create a program</Link
          >
        </div>
        <div
          v-for="p in activePrograms.slice(0, 4)"
          :key="p.id"
          class="flex gap-4 px-6 py-5 border-b border-base-200 last:border-0"
        >
          <span
            class="hidden sm:flex size-11 shrink-0 items-center justify-center rounded-box bg-base-200"
            ><Package :size="21" stroke-width="1.5"
          /></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-sm font-semibold">{{ p.name }}</h3>
              <span class="badge badge-sm shrink-0">Open</span>
            </div>
            <p class="text-sm text-base-content/60 mt-1">{{ p.assistance }}</p>
            <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-base-content/60 mt-4">
              <span class="inline-flex gap-1.5 items-center"
                ><CalendarDays :size="14" />{{ date(p.date) }}</span
              ><span class="inline-flex gap-1.5 items-center"
                ><MapPin :size="14" />{{ p.venue }}</span
              >
            </div>
          </div>
        </div>
      </section>
      <div class="flex flex-col gap-5">
        <section class="card bg-primary text-primary-content">
          <div class="card-body p-6 gap-0">
            <div class="flex items-center justify-between mb-5">
              <span class="text-sm font-medium">{{
                role === 'enumerator' ? 'Census workspace' : 'Distribution desk'
              }}</span
              ><ScanLine v-if="role !== 'enumerator'" :size="25" /><ClipboardList
                v-else
                :size="25"
              />
            </div>
            <h2 class="text-2xl font-semibold tracking-tight">
              {{
                role === 'enumerator'
                  ? 'Keep every family on record.'
                  : 'Ready to release assistance?'
              }}
            </h2>
            <p class="text-sm opacity-80 leading-relaxed mt-3 mb-6">
              {{
                role === 'enumerator'
                  ? 'Register households, mark their homes, and issue a QR stub for each program.'
                  : 'Scan a QR stub, verify the claimant, and record the release in one place.'
              }}
            </p>
            <div class="card-actions">
              <Link :href="role === 'enumerator' ? '/households' : '/distribute'" class="btn w-full"
                >{{ role === 'enumerator' ? 'Open household census' : 'Open distribution desk'
                }}<ArrowRight :size="17"
              /></Link>
            </div>
          </div>
        </section>
        <section class="px-1 py-1">
          <div class="flex items-center justify-between text-sm mb-3">
            <h3 class="font-medium">Overall release progress</h3>
            <span class="font-semibold tabular-nums">{{ progress }}%</span>
          </div>
          <progress
            class="progress w-full h-2"
            :value="stats.claimed"
            :max="stats.enrolled || 1"
            aria-label="Overall release progress"
          ></progress>
          <p class="text-xs text-base-content/60 mt-2">
            {{ pending.toLocaleString() }} enrolled
            {{ pending === 1 ? 'household is' : 'households are' }} awaiting release across all
            programs.
          </p>
        </section>
      </div>
    </div>
    <section class="card card-border bg-base-100 overflow-hidden">
      <div
        class="px-6 py-5 flex flex-wrap items-center justify-between gap-3 border-b border-base-200"
      >
        <div>
          <h2 class="text-lg">Recent releases</h2>
          <p class="text-sm text-base-content/60 mt-1">
            The latest confirmed claims from your distribution team.
          </p>
        </div>
        <span class="badge">{{ stats.claimed }} total</span>
      </div>
      <div v-if="!recent.length" class="flex flex-col items-center gap-3 p-10 text-center">
        <PackageCheck :size="28" class="text-base-content/40" />
        <h3 class="text-sm">No releases recorded</h3>
        <p class="text-sm text-base-content/60">
          Confirmed claims will appear here with the releasing officer and time.
        </p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table">
          <thead class="bg-base-200/50">
            <tr>
              <th>Household</th>
              <th>Program</th>
              <th>Claimant</th>
              <th>Released by</th>
              <th>Date & time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in recent" :key="r.id">
              <td>
                <strong class="font-medium">{{ r.enrollment.household.head }}</strong
                ><small>{{ r.enrollment.household.purok }}</small>
              </td>
              <td>{{ r.enrollment.program.name }}</td>
              <td>{{ r.claimant }}</td>
              <td>{{ r.officer.name }}</td>
              <td class="whitespace-nowrap text-xs text-base-content/60">
                {{ new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </AppLayout>
</template>
