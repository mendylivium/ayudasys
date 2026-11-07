<script setup>
defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<!-- Wraps an input with a DaisyUI fieldset, label and validation message. -->
<template>
  <fieldset class="fieldset">
    <legend class="fieldset-legend">{{ label }}</legend>
    <slot :invalid="!!error" />
    <p v-if="error" class="label text-error">{{ error }}</p>
    <p v-else-if="hint" class="label">{{ hint }}</p>
  </fieldset>
</template>
