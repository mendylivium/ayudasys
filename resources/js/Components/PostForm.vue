<script setup>
import FormField from '@/Components/FormField.vue'

// `form` is an Inertia useForm() object owned by the parent page.
defineProps({
  form: { type: Object, required: true },
  submitLabel: { type: String, default: 'Save' },
})

defineEmits(['submit'])
</script>

<template>
  <form class="space-y-2" @submit.prevent="$emit('submit')">
    <FormField v-slot="{ invalid }" label="Title" :error="form.errors.title">
      <input
        v-model="form.title"
        type="text"
        class="input w-full"
        :class="{ 'input-error': invalid }"
        placeholder="My awesome post"
        autofocus
      />
    </FormField>

    <FormField v-slot="{ invalid }" label="Body" :error="form.errors.body">
      <textarea
        v-model="form.body"
        rows="10"
        class="textarea w-full"
        :class="{ 'textarea-error': invalid }"
        placeholder="Write something…"
      />
    </FormField>

    <label class="label cursor-pointer gap-3 py-2">
      <input v-model="form.published" type="checkbox" class="toggle toggle-primary" />
      <span>Published</span>
    </label>

    <div class="flex justify-end gap-2 pt-2">
      <slot name="actions" />
      <button type="submit" class="btn btn-primary" :disabled="form.processing">
        <span v-if="form.processing" class="loading loading-spinner loading-sm" />
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>
