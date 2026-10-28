<template>
  <div
    v-if="modelValue && doc"
    class="modal-overlay"
    id="modal-doc-viewer"
    @click.self="close"
  >
    <div class="modal doc-viewer">
      <!-- Header -->
      <div class="modal-header viewer-header">
        <div class="flex items-center gap-3 min-w-0">
          <span class="viewer-file-icon">{{ fileIcon(selected.ext) }}</span>
          <div class="min-w-0">
            <div class="font-semibold text-base truncate">{{ doc.name }}</div>
            <div class="flex items-center gap-2 flex-wrap" style="margin-top:2px;">
              <span class="mono text-xs text-tertiary">{{ selected.filename }}</span>
              <span class="badge" :class="statusBadgeClass(doc.status)">{{ statusLabel(doc.status) }}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-icon btn-secondary btn-sm" id="btn-close-viewer" @click="close">✕</button>
      </div>

      <!-- Toolbar -->
      <div class="viewer-toolbar">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-tertiary">Versi</span>
          <select class="select" style="width:auto;height:30px;" v-model="selectedVersionId" id="select-viewer-version">
            <option v-for="v in doc.versions" :key="v.id" :value="v.id">
              {{ v.version }} · {{ v.filename }}
            </option>
          </select>
          <span v-if="selected.isCurrent" class="badge badge-success" style="font-size:10px;">Terbaru</span>
          <span v-else class="badge badge-neutral" style="font-size:10px;">Arsip</span>
          <span class="text-xs text-tertiary">·</span>
          <span class="text-xs text-tertiary">{{ selected.size }} · {{ selected.uploadedBy }} · {{ selected.uploadedAt }}</span>
        </div>
        <div class="flex items-center gap-2">
          <template v-if="category === 'image'">
            <button class="btn btn-icon btn-secondary btn-sm" data-tooltip="Perkecil" @click="zoom = Math.max(0.25, zoom - 0.25)">➖</button>
            <span class="text-xs mono" style="min-width:44px;text-align:center;">{{ Math.round(zoom * 100) }}%</span>
            <button class="btn btn-icon btn-secondary btn-sm" data-tooltip="Perbesar" @click="zoom = Math.min(4, zoom + 0.25)">➕</button>
            <button class="btn btn-icon btn-secondary btn-sm" data-tooltip="Reset" @click="zoom = 1">⟳</button>
          </template>
          <button class="btn btn-secondary btn-sm" id="btn-viewer-newtab" @click="openNewTab" :disabled="!selected.url">🗗 Buka Tab</button>
          <button class="btn btn-primary btn-sm" id="btn-viewer-download" @click="download" :disabled="!selected.url">⬇️ Unduh</button>
        </div>
      </div>

      <!-- Body -->
      <div class="viewer-body">
        <div class="viewer-preview">
          <iframe
            v-if="category === 'pdf' && selected.url"
            class="viewer-frame"
            :src="selected.url"
            :title="selected.filename"
          ></iframe>

          <div v-else-if="category === 'image' && selected.url" class="viewer-image-wrap">
            <img :src="selected.url" :alt="selected.filename" class="viewer-image" :style="{ transform: `scale(${zoom})` }" />
          </div>

          <pre v-else-if="category === 'text' && selected.url" class="viewer-text">{{ textContent }}</pre>

          <div v-else class="viewer-fallback">
            <div class="viewer-fallback-icon">{{ fileIcon(selected.ext) }}</div>
            <div class="empty-state-title">
              {{ selected.url ? `Pratinjau tidak tersedia untuk .${selected.ext}` : 'Berkas tidak tersimpan' }}
            </div>
            <div class="empty-state-desc">
              {{ selected.url
                ? 'Tipe berkas ini memerlukan aplikasi khusus (mis. CAD/Excel). Berkas tetap dapat diunduh dan dibuka dengan perangkat lunak terkait.'
                : 'Versi arsip ini hanya menyimpan metadata dan catatan revisi; berkas fisik tidak tersedia di repositori.' }}
            </div>
            <button class="btn btn-primary" style="margin-top:16px;" @click="download" :disabled="!selected.url">
              {{ selected.url ? `⬇️ Unduh ${selected.filename}` : 'Berkas tidak tersedia' }}
            </button>
          </div>
        </div>

        <!-- Side panel -->
        <aside class="viewer-side">
          <div class="viewer-meta">
            <div class="viewer-meta-title">Informasi Dokumen</div>
            <div class="meta-row"><span class="meta-key">Tipe</span><span class="meta-val">{{ doc.type }}</span></div>
            <div class="meta-row"><span class="meta-key">Proyek</span><span class="meta-val mono text-accent">{{ doc.project }}</span></div>
            <div class="meta-row" v-if="doc.panel"><span class="meta-key">Panel</span><span class="meta-val">{{ doc.panel }}</span></div>
            <div class="meta-row"><span class="meta-key">Ukuran</span><span class="meta-val">{{ selected.size }}</span></div>
            <div class="meta-row"><span class="meta-key">Pengunggah</span><span class="meta-val">{{ selected.uploadedBy }}</span></div>
            <div class="meta-row"><span class="meta-key">Tanggal</span><span class="meta-val">{{ selected.uploadedAt }}</span></div>
            <div class="meta-row" v-if="doc.tags.length"><span class="meta-key">Tag</span>
              <span class="meta-val flex gap-1 flex-wrap">
                <span v-for="t in doc.tags" :key="t" class="badge badge-neutral" style="font-size:10px;">{{ t }}</span>
              </span>
            </div>
            <p v-if="doc.description" class="viewer-desc">{{ doc.description }}</p>
          </div>

          <div class="viewer-meta" style="flex:1; overflow:auto;">
            <div class="viewer-meta-title">Riwayat Versi ({{ doc.versions.length }})</div>
            <div class="version-list">
              <button
                v-for="v in doc.versions"
                :key="v.id"
                class="version-item"
                :class="{ active: v.id === selectedVersionId }"
                @click="selectedVersionId = v.id"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-sm">{{ v.version }}</span>
                  <span v-if="v.isCurrent" class="dot dot-success"></span>
                </div>
                <div class="text-xs text-tertiary truncate">{{ v.filename }}</div>
                <div v-if="v.note" class="text-xs text-secondary" style="margin-top:2px;">{{ v.note }}</div>
                <div class="text-xs text-tertiary" style="margin-top:2px;">{{ v.uploadedBy }} · {{ v.uploadedAt }}</div>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  type TechDoc, type DocVersion,
  fileIcon, fileCategory, statusBadgeClass, statusLabel, downloadVersion,
} from '../data/documentStore'

const props = defineProps<{
  modelValue: boolean
  doc: TechDoc | null
  initialVersionId?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const selectedVersionId = ref('')
const zoom = ref(1)
const textContent = ref('')

const selected = computed<DocVersion>(() => {
  if (!props.doc) return { id: '', version: '', filename: '', ext: '', size: '', sizeBytes: 0, uploadedBy: '', uploadedAt: '', status: 'Draft', isCurrent: false }
  return props.doc.versions.find(v => v.id === selectedVersionId.value) || props.doc.versions[0]
})

const category = computed(() => fileCategory(selected.value.ext))

watch(
  () => [props.modelValue, props.doc?.id, props.initialVersionId] as const,
  () => {
    if (!props.doc) return
    const initial = props.initialVersionId && props.doc.versions.some(v => v.id === props.initialVersionId)
      ? props.initialVersionId
      : (props.doc.versions.find(v => v.isCurrent)?.id || props.doc.versions[0]?.id || '')
    selectedVersionId.value = initial
    zoom.value = 1
  },
  { immediate: true }
)

watch(selected, async (v) => {
  zoom.value = 1
  textContent.value = ''
  if (v && fileCategory(v.ext) === 'text' && v.url) {
    try {
      textContent.value = await (await fetch(v.url)).text()
    } catch {
      textContent.value = 'Gagal memuat pratinjau teks.'
    }
  }
})

const close = () => emit('update:modelValue', false)

const openNewTab = () => {
  if (selected.value.url) window.open(selected.value.url, '_blank')
}

const download = () => {
  downloadVersion(selected.value)
}
</script>

<style scoped>
.doc-viewer {
  max-width: 1120px;
  width: 100%;
  height: 88vh;
  max-height: 88vh;
  padding: 0;
  overflow: hidden;
}

.viewer-header { gap: 12px; }

.viewer-file-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-glass);
  flex-wrap: wrap;
}

.viewer-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.viewer-preview {
  flex: 1;
  min-width: 0;
  background: repeating-conic-gradient(var(--neutral-800) 0% 25%, var(--neutral-900) 0% 50%) 50% / 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  position: relative;
}

[data-theme="light"] .viewer-preview {
  background: #e9edf3;
}

.viewer-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.viewer-image-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 20px;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  transition: transform 150ms ease;
  transform-origin: center center;
  box-shadow: var(--shadow-lg);
  background: #fff;
}

.viewer-text {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 24px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.viewer-fallback {
  text-align: center;
  padding: 48px;
  max-width: 420px;
  color: var(--text-secondary);
}

.viewer-fallback-icon {
  font-size: 56px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.viewer-side {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.viewer-meta {
  padding: 16px;
  border-bottom: 1px solid var(--border-subtle);
  overflow: auto;
}

.viewer-meta-title {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  font-size: var(--text-sm);
}

.meta-key { color: var(--text-tertiary); flex-shrink: 0; }
.meta-val { color: var(--text-primary); text-align: right; }

.viewer-desc {
  margin-top: 10px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  text-align: left;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-glass);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}

.version-item:hover { background: var(--bg-glass-hover); border-color: var(--border-default); }

.version-item.active {
  border-color: var(--primary-500);
  background: rgba(59, 85, 168, 0.14);
  box-shadow: var(--shadow-glow);
}

@media (max-width: 900px) {
  .viewer-body { flex-direction: column; }
  .viewer-side { width: 100%; max-height: 40%; }
}
</style>
