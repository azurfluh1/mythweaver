<script lang="ts" setup>
import { Character } from '@/api/characters.ts';
import LightboxImage from '@/components/LightboxImage.vue';

defineProps<{
  character: Character;
}>();

const emit = defineEmits(['back', 'complete']);
</script>

<template>
  <div class="mt-8 w-full overflow-x-hidden">
    <div class="md:flex">
      <LightboxImage
        :src="character.imageUri"
        class="w-full md:w-[15rem] rounded-[10px]"
      />
      <div
        class="self-center mt-4 md:mt-0 md:ml-6 w-full grid grid-cols-2 3xl:grid-cols-4 gap-4"
      >
        <div>
          <div class="text-md text-neutral-500">Name</div>
          <div class="text-2xl">{{ character.name }}</div>
        </div>
        <div>
          <div class="text-md text-neutral-500">Age</div>
          <div class="text-2xl">
            {{ !!character.age ? character.age : 'Age not provided' }}
          </div>
        </div>
        <div>
          <div class="text-md text-neutral-500">Race</div>
          <div class="text-2xl">
            {{ character.race?.length ? character.race : 'Race not provided' }}
          </div>
        </div>
        <div>
          <div class="text-md text-neutral-500">Class</div>
          <div class="text-2xl">
            {{
              character.class?.length ? character.class : 'Class not provided'
            }}
          </div>
        </div>
      </div>
    </div>
    <div class="w-full">
      <div class="mt-6 grid md:grid-cols-2 gap-8">
        <div>
          <div class="text-md text-neutral-500">Backstory</div>
          <div class="text-lg">
            {{
              character.backstory?.length
                ? character.backstory
                : 'Backstory not provided'
            }}
          </div>
        </div>
        <div>
          <div class="text-md text-neutral-500">Personality</div>
          <div class="text-lg">
            {{
              character.personality?.length
                ? character.personality
                : 'Personality not provided'
            }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-8 flex justify-between">
    <button
      class="bg-neutral-800 mr-2 mb-4 rounded-md py-2 px-4"
      @click="emit('back')"
    >
      Back
    </button>
    <button
      class="bg-neutral-800 mr-2 mb-4 rounded-md py-2 px-4 bg-gradient-to-r from-fuchsia-500 flex to-blue-400"
      @click="emit('complete')"
    >
      Save Character
    </button>
  </div>
</template>
