<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, Camera, ShieldCheck, CheckCircle2, UserRound, Search } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
const props = defineProps({ programs: Array })
const program = ref(props.programs[0]?.id || '')
const token = ref('')
const result = ref(null)
const error = ref('')
const loading = ref(false)
const camera = ref(false)
const starting = ref(false)
const form = useForm({ token: '', program_id: 0, claimant: '' })
let scanner,
  requestID = 0,
  disposed = false
async function stop() {
  if (scanner?.isScanning) await scanner.stop()
  camera.value = false
}
async function lookup() {
  const id = ++requestID
  result.value = null
  error.value = ''
  if (!program.value) {
    error.value = 'Select an open program first.'
    return
  }
  loading.value = true
  try {
    const response = await fetch(
      '/claim-lookup?' +
        new URLSearchParams({ token: token.value.trim(), program_id: program.value }),
      { headers: { Accept: 'application/json' } },
    )
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('Session expired. Refresh the page and sign in again.')
    const data = await response.json()
    if (id !== requestID) return
    if (!response.ok) throw new Error(data.message || 'Could not find this stub.')
    result.value = data
    form.token = data.enrollment.token
    form.program_id = data.enrollment.program_id
    form.claimant = data.enrollment.household.head
    form.clearErrors()
  } catch (e) {
    if (id === requestID) error.value = e.message
  } finally {
    if (id === requestID) loading.value = false
  }
}
async function start() {
  error.value = ''
  starting.value = true
  try {
    scanner ??= new Html5Qrcode('qr-reader')
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (value) => {
        if (loading.value) return
        token.value = value
        await stop()
        await lookup()
      },
      () => {},
    )
    camera.value = true
    if (disposed) await stop()
  } catch {
    error.value =
      'Camera unavailable. Allow camera access on HTTPS or localhost, or enter the stub code below.'
  } finally {
    starting.value = false
  }
}
watch([program, token], () => {
  requestID++
  result.value = null
  loading.value = false
  error.value = ''
  form.clearErrors()
})
onBeforeUnmount(() => {
  disposed = true
  requestID++
  stop().catch(() => {})
})
function release() {
  form.post('/claims', { preserveScroll: true, onSuccess: () => lookup() })
}
</script>
<template>
  <AppLayout
    ><Head title="Scan & distribute" />
    <div class="page-heading">
      <div>
        <h1>Scan. Verify. Release.</h1>
        <p class="muted">Find a household in seconds and keep every claim accounted for.</p>
      </div>
      <span class="badge badge-success"><ShieldCheck :size="15" /> Duplicate-claim protection</span>
    </div>
    <div class="scanner-columns">
      <section class="card card-border bg-base-100 form-panel">
        <h2><span class="badge">1</span> Scan a claim stub</h2>
        <label
          >Active assistance program<select class="select w-full" v-model="program" required>
            <option value="" disabled>Select a program</option>
            <option v-for="p in programs" :key="p.id" :value="p.id">
              {{ p.name }} · {{ p.date }}
            </option>
          </select></label
        >
        <p v-if="!programs.length" class="alert">
          No open programs. Ask your administrator to create one.
        </p>
        <div class="scanner-stage">
          <div id="qr-reader"></div>
          <div v-if="!camera && !starting" class="scanner-placeholder">
            <div class="text-primary"><ScanLine :size="70" stroke-width="1" /></div>
            <h3>Ready when you are</h3>
            <p>Position the QR stub inside the frame.</p>
          </div>
        </div>
        <button v-if="!camera" class="btn w-full" :disabled="!program || starting" @click="start">
          <Camera :size="18" />{{ starting ? 'Starting camera...' : 'Enable camera' }}</button
        ><button v-else class="btn btn-outline w-full" @click="stop">Stop camera</button>
        <div class="divider text-xs">OR USE A SCANNER / STUB CODE</div>
        <form @submit.prevent="lookup">
          <label
            >QR stub code<input
              class="input w-full"
              v-model="token"
              placeholder="Scan or paste the 64-character code"
              autocomplete="off"
              maxlength="64"
              required /></label
          ><button class="btn btn-outline w-full" :disabled="loading || !program">
            <Search :size="17" />{{ loading ? 'Finding household...' : 'Find household' }}
          </button>
        </form>
        <p class="field-error" role="alert">{{ error }}</p>
      </section>
      <section class="card card-border bg-base-100 form-panel verification-panel">
        <h2><span class="badge">2</span> Verify & release</h2>
        <div v-if="!result" class="verification-empty">
          <UserRound :size="48" stroke-width="1" />
          <h3>The right help, to the right family.</h3>
          <p>Scan a stub to see the household's details and eligibility for this program.</p>
          <span class="alert">No release is recorded until you confirm.</span>
        </div>
        <div v-else>
          <div class="alert mb-6" :class="result.claim.id ? 'alert-warning' : 'alert-success'">
            <CheckCircle2 :size="22" />{{
              result.claim.id ? 'Already claimed' : 'Registered for this program'
            }}
          </div>
          <h2 class="recipient-name">{{ result.enrollment.household.head }}</h2>
          <p class="muted">
            {{ result.enrollment.household.purok }} · {{ result.enrollment.household.address }}
          </p>
          <div class="detail-grid">
            <div>
              <small>HOUSEHOLD SIZE</small
              ><strong>{{ 1 + (result.enrollment.household.members?.length || 0) }} members</strong>
            </div>
            <div>
              <small>CONTACT</small
              ><strong>{{ result.enrollment.household.phone || 'Not provided' }}</strong>
            </div>
          </div>
          <div class="bg-base-200 rounded-box p-5 my-6">
            <small>ASSISTANCE TO RECEIVE</small>
            <h3>{{ result.enrollment.program.assistance }}</h3>
            <p>{{ result.enrollment.program.name }}</p>
          </div>
          <div v-if="result.claim.id" class="alert">
            Released to {{ result.claim.claimant }} by {{ result.claim.officer.name }} on
            {{
              new Date(result.claim.created_at).toLocaleString('en-PH', {
                timeZone: 'Asia/Manila',
              })
            }}. A second release is blocked.
          </div>
          <form v-else-if="result.enrollment.program.status === 'open'" @submit.prevent="release">
            <label
              >Actual claimant's full name<input
                class="input w-full"
                v-model="form.claimant"
                required
                maxlength="150" /></label
            ><label class="checkbox-label"
              ><input
                class="checkbox checkbox-primary"
                type="checkbox"
                required
                :key="result.enrollment.id"
              />
              I verified the claimant's identification and authority to receive this
              assistance.</label
            >
            <p v-for="(e, k) in form.errors" :key="k" class="field-error">{{ e }}</p>
            <button class="btn w-full" :disabled="form.processing">
              <CheckCircle2 :size="18" />{{
                form.processing ? 'Recording release...' : 'Confirm & release assistance'
              }}
            </button>
          </form>
          <p v-else class="alert alert-error">This program is closed.</p>
        </div>
      </section>
    </div></AppLayout
  >
</template>
