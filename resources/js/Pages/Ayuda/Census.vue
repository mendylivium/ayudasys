<script setup>
import { ref } from 'vue'
import { Head, Link, useForm } from '@inertiajs/vue3'
import { ArrowLeft, Plus, Trash2, LocateFixed, MapPin, Save } from '@lucide/vue'
import AppLayout from '@/Layouts/AppLayout.vue'
import CommunityMap from '@/Components/CommunityMap.vue'
const form = useForm({
  head: '',
  phone: '',
  address: '',
  purok: '',
  latitude: null,
  longitude: null,
  members: [],
})
const locationError = ref('')
const locating = ref(false)
function locate() {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = 'Geolocation unavailable. Pin the map manually.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (p) => {
      form.latitude = p.coords.latitude
      form.longitude = p.coords.longitude
      locating.value = false
    },
    () => {
      locationError.value = 'Could not get your location. Choose the home on the map.'
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}
</script>
<template>
  <AppLayout
    ><Head title="Register household" /><Link
      href="/households"
      class="link inline-flex items-center gap-2 mb-6"
      ><ArrowLeft :size="16" /> Household census</Link
    >
    <div class="page-heading">
      <div>
        <h1>Register a household</h1>
        <p class="muted">Record the head of family, household members, and their home location.</p>
      </div>
    </div>
    <form @submit.prevent="form.post('/households')">
      <div class="form-columns">
        <div>
          <section class="card card-border bg-base-100 form-panel">
            <h2><span class="badge">1</span> Household information</h2>
            <label
              >Head of family<input
                class="input w-full"
                v-model="form.head"
                required
                maxlength="150"
                placeholder="Full name"
            /></label>
            <div class="field-grid">
              <label
                >Purok / Sitio<input
                  class="input w-full"
                  v-model="form.purok"
                  required
                  maxlength="80"
                  placeholder="e.g. Purok 1" /></label
              ><label
                >Contact number <span class="muted">(optional)</span
                ><input
                  class="input w-full"
                  v-model="form.phone"
                  maxlength="30"
                  type="tel"
                  placeholder="09XX XXX XXXX"
              /></label>
            </div>
            <label
              >Complete address<textarea
                class="textarea w-full"
                v-model="form.address"
                required
                maxlength="300"
                rows="2"
                placeholder="House number, street, barangay, municipality"
              />
            </label>
          </section>
          <section class="card card-border bg-base-100 form-panel">
            <div class="panel-heading bare">
              <div>
                <h2><span class="badge">2</span> Family members</h2>
                <p class="muted">Add members other than the head of family.</p>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm inline-flex items-center gap-1"
                @click="form.members.push({ name: '', relationship: '', age: 0 })"
              >
                <Plus :size="16" /> Add
              </button>
            </div>
            <div v-if="!form.members.length" class="alert">
              Single-person household? You can leave this empty.
            </div>
            <div v-for="(m, i) in form.members" :key="i" class="member-row">
              <label
                >Full name<input
                  class="input w-full"
                  v-model="m.name"
                  required
                  maxlength="150" /></label
              ><label
                >Relationship<input
                  class="input w-full"
                  v-model="m.relationship"
                  required
                  maxlength="60"
                  placeholder="Spouse, child..." /></label
              ><label
                >Age<input
                  class="input w-full"
                  v-model.number="m.age"
                  type="number"
                  min="0"
                  max="120"
                  required /></label
              ><button
                type="button"
                class="btn btn-ghost btn-square btn-sm"
                :aria-label="'Remove member ' + (i + 1)"
                @click="form.members.splice(i, 1)"
              >
                <Trash2 :size="17" />
              </button>
            </div>
          </section>
        </div>
        <section class="card card-border bg-base-100 form-panel">
          <h2><span class="badge">3</span> Pin their home</h2>
          <p class="muted">Tap the map to mark the household's location.</p>
          <button
            type="button"
            class="btn btn-outline location-button"
            :disabled="locating"
            @click="locate"
          >
            <LocateFixed :size="17" />{{
              locating ? 'Locating...' : 'Use my current location'
            }}</button
          ><CommunityMap
            editable
            :latitude="form.latitude"
            :longitude="form.longitude"
            @pick="
              (p) => {
                form.latitude = p.lat
                form.longitude = p.lng
              }
            "
          />
          <div class="field-grid">
            <label
              >Latitude<input
                class="input w-full"
                v-model.number="form.latitude"
                required
                type="number"
                step="any"
                min="-90"
                max="90" /></label
            ><label
              >Longitude<input
                class="input w-full"
                v-model.number="form.longitude"
                required
                type="number"
                step="any"
                min="-180"
                max="180"
            /></label>
          </div>
          <p class="field-error">{{ locationError }}</p>
          <p class="alert">
            <MapPin :size="16" /> Check that the pin is on the correct home before saving.
          </p>
        </section>
      </div>
      <div v-if="Object.keys(form.errors).length" class="alert alert-error">
        <p v-for="(e, k) in form.errors" :key="k">{{ k }}: {{ e }}</p>
      </div>
      <div class="form-actions">
        <Link href="/households" class="btn btn-outline">Cancel</Link
        ><button class="btn" :disabled="form.processing">
          <Save :size="17" />{{ form.processing ? 'Saving...' : 'Save household' }}
        </button>
      </div>
    </form></AppLayout
  >
</template>
