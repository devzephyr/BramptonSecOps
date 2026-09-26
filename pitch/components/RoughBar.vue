<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { BarH } from 'rough-viz'

const props = defineProps<{ labels: string[]; values: number[]; xLabel?: string }>()
const id = `rough-${useId()}`
const box = ref<HTMLDivElement>()
let observer: ResizeObserver | undefined
let drawnWidth = 0

// roughViz sizes itself once from the container, and Slidev mounts upcoming slides while hidden,
// so draw only once the box has a real width and redraw when that width changes.
function draw() {
  const el = box.value
  if (!el || el.clientWidth === 0 || el.clientWidth === drawnWidth) return
  drawnWidth = el.clientWidth
  el.replaceChildren()
  new BarH({
    element: `#${id}`,
    data: { labels: props.labels, values: props.values },
    xLabel: props.xLabel ?? '',
    margin: { top: 10, right: 40, bottom: 60, left: 110 },
    axisFontSize: '1.1rem',
    labelFontSize: '1.1rem',
    roughness: 2,
    interactive: false,
  })
}

onMounted(() => {
  observer = new ResizeObserver(draw)
  if (box.value) observer.observe(box.value)
  draw()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div :id="id" ref="box" class="w-full h-80" />
</template>
