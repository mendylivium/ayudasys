<script setup>
import { Head, useForm } from '@inertiajs/vue3'
import { Sprout, House, MapPin, ScanLine, ArrowRight, ShieldCheck } from '@lucide/vue'
const form = useForm({ email: '', password: '' })
</script>
<template>
  <Head title="Sign in" />
  <div class="min-h-screen grid lg:grid-cols-2 bg-base-100">
    <section class="bg-base-200/60 px-6 py-7 lg:p-14 flex flex-col justify-between gap-10">
      <div class="flex items-center gap-3">
        <span
          class="bg-neutral text-neutral-content rounded-box size-10 inline-flex items-center justify-center"
          ><Sprout :size="24" /></span
        ><span class="text-2xl font-bold tracking-tight">AyudaSys</span>
      </div>
      <div class="hidden lg:block max-w-md self-center w-full py-14">
        <h1 class="text-4xl font-semibold leading-tight tracking-tight">
          Community assistance,<br />from census to claim.
        </h1>
        <p class="text-base text-base-content/60 leading-relaxed mt-5 mb-10">
          A shared workspace for the people who register families and deliver assistance.
        </p>
        <div class="space-y-7">
          <div
            v-for="item in [
              {
                icon: House,
                title: 'Register each household',
                text: 'Keep family records organized and easy to find.',
              },
              {
                icon: MapPin,
                title: 'Know who still needs assistance',
                text: 'See household locations and claim status on the map.',
              },
              {
                icon: ScanLine,
                title: 'Make distribution faster',
                text: 'Scan a QR stub, verify the recipient, and record the release.',
              },
            ]"
            :key="item.title"
            class="flex gap-4"
          >
            <span
              class="bg-base-100 border border-base-300 rounded-box size-11 shrink-0 flex items-center justify-center"
              ><component :is="item.icon" :size="21" stroke-width="1.6"
            /></span>
            <div>
              <h2 class="text-sm font-semibold">{{ item.title }}</h2>
              <p class="text-sm text-base-content/60 mt-1 leading-relaxed">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </div>
      <p class="hidden lg:block text-xs text-base-content/40">
        Built for barangay census and assistance teams.
      </p>
    </section>
    <section class="flex items-center justify-center px-6 py-12 lg:p-14">
      <div class="w-full max-w-sm">
        <h2 class="text-3xl font-semibold tracking-tight">Welcome back</h2>
        <p class="text-sm text-base-content/60 mt-3 mb-8">
          Sign in with your assigned staff account.
        </p>
        <form
          @submit.prevent="form.post('/login', { onFinish: () => form.reset('password') })"
          class="space-y-5"
        >
          <fieldset class="fieldset p-0">
            <label for="login-email" class="fieldset-legend py-0 mb-2">Email address</label
            ><input
              id="login-email"
              v-model="form.email"
              class="input w-full"
              :class="{ 'input-error': form.errors.email }"
              type="email"
              autocomplete="username"
              required
              placeholder="you@barangay.gov.ph"
            />
          </fieldset>
          <fieldset class="fieldset p-0">
            <label for="login-password" class="fieldset-legend py-0 mb-2">Password</label
            ><input
              id="login-password"
              v-model="form.password"
              class="input w-full"
              type="password"
              autocomplete="current-password"
              required
              placeholder="Enter your password"
            />
          </fieldset>
          <p v-for="(e, k) in form.errors" :key="k" class="text-sm text-error" role="alert">
            {{ e }}
          </p>
          <button class="btn w-full mt-2" :disabled="form.processing">
            {{ form.processing ? 'Signing in...' : 'Sign in to workspace'
            }}<ArrowRight :size="17" />
          </button>
        </form>
        <div class="flex gap-3 border-t border-base-200 pt-6 mt-8">
          <ShieldCheck :size="19" class="text-base-content/40 shrink-0 mt-0.5" />
          <p class="text-xs text-base-content/50 leading-relaxed">
            Need access? Ask your barangay administrator to create a staff account for you.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
