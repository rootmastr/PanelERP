<template>
  <div class="modal-overlay" v-if="open" @click.self="close" id="modal-record-detail">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      ref="dialog"
      @keydown.esc="close"
      tabindex="-1"
    >
      <div class="modal-header">
        <div>
          <span class="font-semibold text-lg">{{ title }}</span>
          <div class="text-xs text-tertiary" v-if="subtitle">{{ subtitle }}</div>
        </div>
        <button class="btn btn-icon btn-secondary btn-sm" @click="close" aria-label="Tutup detail">✕</button>
      </div>

      <div class="modal-body">
        <dl class="detail-grid">
          <div v-for="row in rows" :key="row.label" class="detail-row">
            <dt>{{ row.label }}</dt>
            <dd :class="row.mono ? 'mono' : undefined">{{ row.value }}</dd>
          </div>
        </dl>
        <div v-if="!rows.length" class="empty-state" style="padding: 24px;">
          <div class="empty-state-title">Tidak ada data untuk ditampilkan</div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close" ref="closeBtn">Tutup</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

export interface DetailRow {
  label: string
  value: string | number
  mono?: boolean
}

const props = defineProps<{
  open: boolean
  title: string
  subtitle?: string
  rows: DetailRow[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const closeBtn = ref<HTMLButtonElement | null>(null)

const close = () => emit('close')

// Fokus ke tombol tutup saat dialog terbuka + kunci fokus di dalam dialog
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    closeBtn.value?.focus()
    document.addEventListener('keydown', onKeydown, true)
  } else {
    document.removeEventListener('keydown', onKeydown, true)
  }
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
  if (e.key !== 'Tab') return
  const dialog = document.getElementById('modal-record-detail')
  const focusables = dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  if (!focusables || focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
})
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 24px;
  margin: 0;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-row dt {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-row dd {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
}

@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
