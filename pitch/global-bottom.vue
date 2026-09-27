<template>
  <footer v-if="$nav.currentPage > 1" class="absolute bottom-4 right-8 text-xl font-bold text-zinc-600">
    {{ $nav.currentPage - 1 }} / {{ $nav.total - 1 }}
  </footer>
</template>
