<script setup lang="ts">
import CustomizeConjurationImage from '@/components/Conjuration/ViewConjuration/CustomizeConjurationImage.vue';
import { Character } from '@/api/characters.ts';
import { computed, onMounted, onUnmounted } from 'vue';
import { useEventBus } from '@/lib/events.ts';
import LightboxImage from '@/components/LightboxImage.vue';

const props = defineProps<{
  modelValue: Character;
}>();

const emit = defineEmits(['update:modelValue', 'complete', 'back']);

const eventBus = useEventBus();

const value = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  },
});

onMounted(() => {
  eventBus.$on(
    'updated-conjuration-image',
    (payload: { imageUri: string; prompt: string }) => {
      setTimeout(() => {
        value.value.imageUri = payload.imageUri;
        emit('complete');
      }, 50);
    },
  );
});

onUnmounted(() => {
  eventBus.$off('updated-conjuration-image');
});
</script>

<template>
  <div class="mt-8">
    <div v-if="value.imageUri">
      <LightboxImage
        :src="value.imageUri"
        class="w-72 rounded-md"
        :alt="value.name"
      />

      <div class="mt-8 flex">
        <button
          class="bg-neutral-800 mr-2 mb-4 rounded-md py-2 px-4"
          @click="emit('back')"
        >
          Back
        </button>
        <button
          class="bg-neutral-800 mr-2 mb-4 rounded-md py-2 px-4"
          @click="emit('complete')"
        >
          Continue
        </button>
      </div>
    </div>
    <CustomizeConjurationImage
      v-else
      prompt=""
      cancel-button-text-override="Back"
      @cancel="emit('back')"
    />
  </div>
</template>
