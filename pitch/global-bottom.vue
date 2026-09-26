<template>
  <footer v-if="$nav.currentPage > 1" class="absolute bottom-2 right-4 text-sm opacity-60">
    {{ $nav.currentPage - 1 }}
  </footer>
</template>
