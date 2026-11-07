<script setup>
import { ref, computed, watch } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import { Plus, Search, Map, List, ArrowUpRight, House, RefreshCw } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import CommunityMap from '@/Components/CommunityMap.vue'
const props = defineProps({
  households: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  programs: { type: Array, default: () => [] },
  // This name matches the existing Inertia response and query parameter.
  // eslint-disable-next-line vue/prop-name-casing
  program_id: { type: Number, default: 0 },
})
const query = ref(props.search || '')
const program = ref(props.program_id || '')
const status = ref('all')
const loading = ref(false)
watch(
  () => [props.search, props.program_id],
  ([search, id]) => {
    query.value = search || ''
    program.value = id || ''
  },
)
const filtered = computed(() => Boolean(props.search) || status.value !== 'all')
function clearFilters() {
  query.value = ''
  status.value = 'all'
  applySearch()
}
const labels = {
  claimed: 'Nabigyan na',
  pending: 'Hindi pa nabibigyan',
  not_enrolled: 'Hindi naka-enroll',
  no_program: 'Walang program',
}
const visibleHouseholds = computed(() =>
  props.households.filter((h) => status.value === 'all' || h.claim_status === status.value),
)
const mode = ref('list')
const total = computed(() =>
  props.households.reduce((sum, h) => sum + 1 + (h.members?.length || 0), 0),
)
function applySearch() {
  router.get(
    '/households',
    { search: query.value, program_id: program.value || undefined },
    {
      preserveState: true,
      replace: true,
      onStart: () => (loading.value = true),
      onFinish: () => (loading.value = false),
    },
  )
}
</script>
<template>
  <AppLayout
    ><Head title="Household census" />
    <div class="page-heading">
      <div>
        <h1>Household census</h1>
        <p class="muted">Find household records, locate homes, and track assistance status.</p>
      </div>
      <Link href="/households/create" class="btn"><Plus :size="17" />Register household</Link>
    </div>
    <section class="card card-border bg-base-100 overflow-hidden" :aria-busy="loading">
      <div class="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-base-200">
        <form
          class="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md"
          @submit.prevent="applySearch"
        >
          <label class="input flex items-center gap-2 flex-1 min-w-0 m-0!"
            ><Search :size="17" class="text-base-content/40 shrink-0" /><input
              v-model="query"
              class="grow min-w-0"
              placeholder="Search name, purok, or address"
              aria-label="Search households" /></label
          ><button class="btn" :disabled="loading">Search</button>
        </form>
        <div class="join">
          <button
            class="btn join-item"
            :class="{ 'btn-active': mode === 'list' }"
            :aria-pressed="mode === 'list'"
            @click="mode = 'list'"
          >
            <List :size="17" />List</button
          ><button
            class="btn join-item"
            :class="{ 'btn-active': mode === 'map' }"
            :aria-pressed="mode === 'map'"
            @click="mode = 'map'"
          >
            <Map :size="17" />Map
          </button>
        </div>
      </div>
      <div
        class="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 p-5 bg-base-200/30 items-end"
      >
        <fieldset class="fieldset p-0 min-w-0">
          <label for="census-program" class="fieldset-legend py-0 mb-2">Ayuda program</label
          ><select
            id="census-program"
            v-model="program"
            class="select w-full"
            :disabled="!programs.length"
            @change="applySearch"
          >
            <option v-if="!programs.length" value="">Wala pang program</option>
            <option v-for="p in programs" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.status }})
            </option>
          </select>
        </fieldset>
        <fieldset class="fieldset p-0">
          <label for="census-status" class="fieldset-legend py-0 mb-2">Claim status</label
          ><select
            id="census-status"
            v-model="status"
            class="select w-full"
            aria-label="Claim status"
            :disabled="!programs.length"
          >
            <option value="all">Lahat ng household</option>
            <option value="claimed">Nabigyan na</option>
            <option value="pending">Hindi pa nabibigyan</option>
            <option value="not_enrolled">Hindi naka-enroll</option>
          </select>
        </fieldset>
        <button class="btn" :disabled="loading" @click="applySearch">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />{{
            loading ? 'Refreshing…' : 'Refresh status'
          }}
        </button>
      </div>
      <div
        v-if="program_id"
        class="flex flex-wrap gap-x-5 gap-y-2 px-5 pb-4 bg-base-200/30 text-xs text-base-content/70"
      >
        <span
          v-for="key in ['claimed', 'pending', 'not_enrolled']"
          :key="key"
          class="inline-flex items-center gap-2"
          ><i :class="'legend-dot status-' + key"></i>{{ labels[key] }}
          <strong class="font-semibold">{{
            households.filter((h) => h.claim_status === key).length
          }}</strong></span
        >
      </div>
      <div
        class="px-5 py-3 border-y border-base-200 flex flex-wrap justify-between gap-2 text-xs text-base-content/50"
      >
        <span role="status"
          >{{ visibleHouseholds.length }} households shown · {{ total }} residents in search
          results</span
        >
        <button v-if="filtered" class="link" :disabled="loading" @click="clearFilters">
          Clear search & status
        </button>
      </div>
      <template v-if="mode === 'map'"
        ><p v-if="!visibleHouseholds.length" class="px-5 py-4 text-sm text-base-content/60">
          Walang household sa napiling filters.
        </p>
        <CommunityMap :points="visibleHouseholds" class="min-h-112 rounded-none" />
        <p class="px-5 py-3 text-xs text-base-content/50">
          Select a pin to view its household and claim status. Refresh to see new releases.
        </p></template
      >
      <div v-else-if="!visibleHouseholds.length" class="empty-state">
        <span class="p-4 rounded-box bg-base-200"><House :size="28" stroke-width="1.5" /></span>
        <h3>{{ filtered ? 'No matching households' : 'No households registered yet' }}</h3>
        <p>
          {{
            filtered
              ? 'Try another name or purok, or clear the search and claim status.'
              : 'Register a household to start the census and locate its home on the map.'
          }}
        </p>
        <button v-if="filtered" class="btn btn-sm" @click="clearFilters">
          Clear search & status
        </button>
        <Link v-else href="/households/create" class="btn btn-sm"
          ><Plus :size="16" />Register household</Link
        >
      </div>
      <template v-else>
        <ul class="divide-y divide-base-200 md:hidden" aria-label="Household records">
          <li v-for="h in visibleHouseholds" :key="h.id" class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <Link
                  :href="'/households/' + h.id"
                  class="link link-hover font-semibold break-words"
                  >{{ h.head }}</Link
                >
                <p class="text-xs text-base-content/60 mt-1">
                  HH-{{ String(h.id).padStart(5, '0') }} ·
                  {{ 1 + (h.members?.length || 0) }} members
                </p>
              </div>
              <Link
                :href="'/households/' + h.id"
                class="btn btn-ghost btn-square btn-sm shrink-0"
                :aria-label="'View ' + h.head"
                ><ArrowUpRight :size="18"
              /></Link>
            </div>
            <p class="text-sm mt-3 font-medium break-words">{{ h.purok }}</p>
            <p class="text-sm text-base-content/70 mt-1 break-words">{{ h.address }}</p>
            <span
              class="badge badge-soft mt-3"
              :class="
                h.claim_status === 'claimed'
                  ? 'badge-success'
                  : h.claim_status === 'pending'
                    ? 'badge-warning'
                    : ''
              "
              >{{ labels[h.claim_status] }}</span
            >
          </li>
        </ul>
        <div class="hidden md:block overflow-x-auto">
          <table class="table">
            <thead class="bg-base-200/30">
              <tr>
                <th>Head of family</th>
                <th>Purok / Sitio</th>
                <th>Address</th>
                <th>Members</th>
                <th>Claim status</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in visibleHouseholds" :key="h.id">
                <td>
                  <div class="flex items-center gap-3">
                    <span class="avatar avatar-placeholder"
                      ><span class="bg-base-200 rounded-full size-9"
                        ><span class="text-sm">{{ h.head.charAt(0) }}</span></span
                      ></span
                    >
                    <div>
                      <strong class="font-medium whitespace-nowrap">{{ h.head }}</strong
                      ><small>HH-{{ String(h.id).padStart(5, '0') }}</small>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap">{{ h.purok }}</td>
                <td class="min-w-40 max-w-64 text-base-content/70">{{ h.address }}</td>
                <td>{{ 1 + (h.members?.length || 0) }}</td>
                <td>
                  <span
                    class="badge badge-soft whitespace-nowrap"
                    :class="
                      h.claim_status === 'claimed'
                        ? 'badge-success'
                        : h.claim_status === 'pending'
                          ? 'badge-warning'
                          : ''
                    "
                    >{{ labels[h.claim_status] }}</span
                  >
                </td>
                <td>
                  <Link
                    :href="'/households/' + h.id"
                    class="btn btn-ghost btn-sm"
                    :aria-label="'View ' + h.head"
                    >View<ArrowUpRight :size="15"
                  /></Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </AppLayout>
</template>
