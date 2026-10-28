<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Dokumen Teknis</h1>
        <p class="page-subtitle">Repositori terpusat: gambar, SLD, wiring diagram, BOM & dokumen proyek dengan kontrol versi (PRD M3 §4.3.4)</p>
      </div>
      <div></div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="doc-chain-hint">
      ℹ️ Shell dokumen (SLD, Layout/GA, Wiring Diagram) dibuat <strong>otomatis per panel</strong> saat SO Confirmed. Unggah berkas pada shell yang sudah ada, lalu jalur review → AFC.
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-doc-total"><div class="stat-value">{{ documents.length }}</div><div class="stat-label">Total Dokumen</div></div>
      <div class="stat-card" id="stat-doc-afc"><div class="stat-value text-success">{{ countBy('Approved for Construction') }}</div><div class="stat-label">AFC (Siap Produksi)</div></div>
      <div class="stat-card" id="stat-doc-review"><div class="stat-value text-warning">{{ countBy('Issued for Review') }}</div><div class="stat-label">Dalam Review Klien</div></div>
      <div class="stat-card" id="stat-doc-revision"><div class="stat-value text-info">{{ totalVersions }}</div><div class="stat-label">Total Versi Tersimpan</div></div>
    </div>

    <!-- List Card -->
    <div class="card" id="doc-list-card">
      <div class="card-header">
        <div class="flex gap-3 flex-wrap">
          <div class="input-with-icon" style="width: 280px;">
            <span class="input-icon">🔍</span>
            <input class="input" placeholder="Cari dokumen, proyek, file..." v-model="search" id="search-doc" />
          </div>
          <select class="select" style="width: 160px;" v-model="filterType" id="filter-doc-type">
            <option value="">Semua Tipe</option>
            <option v-for="t in docTypeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
          <select class="select" style="width: 200px;" v-model="filterStatus" id="filter-doc-status">
            <option value="">Semua Status</option>
            <option v-for="s in docStatusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <select class="select" style="width: 170px;" v-model="filterProject" id="filter-doc-project">
            <option value="">Semua Proyek</option>
            <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
          </select>
          <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'" @click="filterMine = !filterMine" id="filter-doc-mine">⏳ Menunggu Tindakan Saya</button>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-icon btn-secondary btn-sm" :class="{ 'view-toggle-active': viewMode === 'table' }" @click="viewMode = 'table'" data-tooltip="Tampilan Tabel">☰</button>
          <button class="btn btn-icon btn-secondary btn-sm" :class="{ 'view-toggle-active': viewMode === 'grid' }" @click="viewMode = 'grid'" data-tooltip="Tampilan Kartu">▦</button>
        </div>
      </div>

      <!-- Table view -->
      <div v-if="viewMode === 'table'" class="table-container" style="border: none;">
        <table class="table table-clickable" id="doc-table" v-if="filteredDocs.length">
          <thead>
            <tr>
              <th>Dokumen</th>
              <th>Proyek / Panel</th>
              <th>Tipe</th>
              <th>Versi</th>
              <th>Status</th>
              <th>Di-upload</th>
              <th>Ukuran</th>
              <th style="text-align:right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocs" :key="doc.id" :id="`row-doc-${doc.id}`" @click="openViewer(doc)">
              <td>
                <div class="flex items-center gap-2">
                  <span style="font-size: 20px;">{{ fileIcon(doc.ext) }}</span>
                  <div class="min-w-0">
                    <div class="font-medium text-primary text-sm truncate">{{ doc.name }}</div>
                    <div class="text-xs text-tertiary mono">{{ doc.docNo }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="text-accent text-sm mono font-semibold">{{ doc.project }}</div>
                <div class="text-xs text-tertiary" v-if="doc.panel">{{ doc.panel }}</div>
              </td>
              <td><span class="badge badge-neutral">{{ doc.type }}</span></td>
              <td>
                <span class="font-semibold text-sm text-accent">{{ doc.version }}</span>
                <span class="text-xs text-tertiary" v-if="doc.versions.length > 1"> · {{ doc.versions.length }} versi</span>
              </td>
              <td><span class="badge" :class="statusBadgeClass(doc.status)">{{ statusLabel(doc.status) }}</span></td>
              <td>
                <div class="text-xs">{{ doc.uploadedBy }}</div>
                <div class="text-xs text-tertiary">{{ doc.date }}</div>
              </td>
              <td class="text-tertiary text-sm">{{ doc.size }}</td>
              <td @click.stop>
                <div class="flex gap-1 justify-end">
                  <button v-if="workflowAction(doc)" class="btn btn-secondary btn-sm" :id="`doc-flow-${doc.id}`" @click="applyWorkflow(doc)" data-tooltip="Ubah Status">{{ workflowAction(doc)?.label }}</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`doc-preview-${doc.id}`" @click="openViewer(doc)" data-tooltip="Pratinjau">👁️</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`doc-dl-${doc.id}`" @click="downloadCurrent(doc)" data-tooltip="Unduh">⬇️</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`doc-revise-${doc.id}`" @click="openRevise(doc)" data-tooltip="Revisi Versi">✏️</button>
                  <button class="btn btn-icon btn-danger btn-sm" :id="`doc-del-${doc.id}`" @click="removeDocument(doc.id)" data-tooltip="Hapus">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid view -->
      <div v-else class="doc-grid">
        <div v-for="doc in filteredDocs" :key="doc.id" class="doc-card card card-hover" :id="`card-doc-${doc.id}`" @click="openViewer(doc)">
          <div class="flex items-start justify-between gap-2">
            <span style="font-size: 30px;">{{ fileIcon(doc.ext) }}</span>
            <span class="badge" :class="statusBadgeClass(doc.status)">{{ statusLabel(doc.status) }}</span>
          </div>
          <div class="font-medium text-sm" style="margin-top:10px;">{{ doc.name }}</div>
          <div class="text-xs text-tertiary mono">{{ doc.docNo }}</div>
          <div class="flex items-center gap-2 flex-wrap" style="margin-top:10px;">
            <span class="badge badge-neutral">{{ doc.type }}</span>
            <span class="text-xs text-accent mono">{{ doc.project }}</span>
          </div>
          <div class="flex items-center justify-between" style="margin-top:12px;">
            <span class="text-xs text-tertiary">{{ doc.version }} · {{ doc.size }}</span>
            <span class="text-xs text-tertiary">{{ doc.date }}</span>
          </div>
          <div class="flex gap-1" style="margin-top:12px;" @click.stop>
            <button class="btn btn-secondary btn-sm flex-1" @click="openViewer(doc)">👁️ Pratinjau</button>
            <button class="btn btn-secondary btn-sm" @click="downloadCurrent(doc)" data-tooltip="Unduh">⬇️</button>
            <button class="btn btn-secondary btn-sm" @click="openRevise(doc)" data-tooltip="Revisi">✏️</button>
          </div>
        </div>
      </div>

      <div v-if="!filteredDocs.length" class="empty-state" id="doc-empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">Tidak ada dokumen ditemukan</div>
        <div class="empty-state-desc">Sesuaikan pencarian/filter. Dokumen baru dibuat dari panel (shell otomatis saat SO Confirmed).</div>
      </div>
    </div>


    <!-- ═══ Modal Revisi Versi ═══ -->
    <div class="modal-overlay" v-if="showReviseModal && reviseDoc" @click.self="showReviseModal = false" id="modal-revise-doc">
      <div class="modal" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Revisi Versi Dokumen</span>
            <div class="text-xs text-tertiary">{{ reviseDoc.name }} · saat ini {{ reviseDoc.version }}</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showReviseModal = false">✕</button>
        </div>
        <form @submit.prevent="submitRevision">
          <div class="modal-body">
            <div class="alert alert-info" style="margin-bottom:16px;">
              ℹ️ Revisi membuat versi baru dan menyimpan versi lama sebagai arsip. Dokumen AFC tetap dapat dipertahankan untuk jejak audit.
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-rev-version">Versi Baru *</label>
                <input type="text" class="input mono" id="input-rev-version" v-model="revForm.version" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-rev-status">Status Rilis *</label>
                <select class="select" id="input-rev-status" v-model="revForm.status" required>
                  <option v-for="s in docStatusOptions.filter(x => x !== 'Superseded')" :key="s">{{ s }}</option>
                </select>
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-rev-note">Alasan / Catatan Revisi *</label>
                <textarea class="input" id="input-rev-note" v-model="revForm.note" rows="2" style="height:auto;padding:10px;" placeholder="Contoh: Penyesuaian rating busbar sesuai komentar klien" required></textarea>
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-rev-file">Berkas Revisi *</label>
                <input type="file" class="input" id="input-rev-file" @change="onRevFileChange" accept=".pdf,.dwg,.dxf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.svg" style="padding: 8px;" required />
                <span v-if="revFileError" class="text-xs text-danger">{{ revFileError }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showReviseModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-rev">Simpan Revisi</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ═══ Penampil Dokumen ═══ -->
    <DocumentViewer v-model="showViewer" :doc="activeDoc" :initial-version-id="activeVersionId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DocumentViewer from '../../components/DocumentViewer.vue'
import {
  techDocs, projectOptions, docTypeOptions, docStatusOptions,
  addRevision, downloadCurrent, removeDocument, setStatus,
  fileIcon, statusBadgeClass, statusLabel,
  type TechDoc, type TechDocStatus,
} from '../../data/documentStore'

const documents = techDocs

const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const filterProject = ref('')
const filterMine = ref(false)
const viewMode = ref<'table' | 'grid'>('table')

const showReviseModal = ref(false)
const showViewer = ref(false)
const activeDoc = ref<TechDoc | null>(null)
const activeVersionId = ref<string | undefined>(undefined)

const revFileError = ref('')

const revForm = ref({ version: 'v2', status: 'Issued for Review' as TechDocStatus, note: '', filename: '', file: null as File | null })

const MAX_BYTES = 50 * 1024 * 1024

const filteredDocs = computed(() => {
  const s = search.value.toLowerCase()
  return documents.value.filter(d => {
    const matchSearch = !s ||
      d.name.toLowerCase().includes(s) ||
      d.project.toLowerCase().includes(s) ||
      d.docNo.toLowerCase().includes(s) ||
      (d.panel || '').toLowerCase().includes(s) ||
      d.versions.some(v => v.filename.toLowerCase().includes(s))
    const matchType = !filterType.value || d.type === filterType.value
    const matchStatus = !filterStatus.value || d.status === filterStatus.value
    const matchProject = !filterProject.value || d.project === filterProject.value
    const matchMine = !filterMine.value || d.status === 'Draft' || d.status === 'Issued for Review'
    return matchSearch && matchType && matchStatus && matchProject && matchMine
  })
})

const totalVersions = computed(() => documents.value.reduce((s, d) => s + d.versions.length, 0))
const countBy = (status: TechDocStatus) => documents.value.filter(d => d.status === status).length

const onRevFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.size > MAX_BYTES) {
      revFileError.value = 'Ukuran berkas melebihi 50MB.'
      revForm.value.file = null
      return
    }
    revFileError.value = ''
    revForm.value.file = file
    revForm.value.filename = file.name
  }
}

const nextVersion = (current: string): string => {
  const v = current.trim()
  const vMatch = v.match(/^v(\d+)$/i)
  if (vMatch) return `v${parseInt(vMatch[1], 10) + 1}`
  const revMatch = v.match(/^rev\.?\s*([A-Z])$/i)
  if (revMatch) return `Rev ${String.fromCharCode(revMatch[1].toUpperCase().charCodeAt(0) + 1)}`
  return 'v2'
}

const openRevise = (doc: TechDoc) => {
  revForm.value = {
    version: nextVersion(doc.version),
    status: 'Issued for Review',
    note: '',
    filename: '',
    file: null,
  }
  revFileError.value = ''
  activeDoc.value = doc
  showReviseModal.value = true
}

const reviseDoc = computed(() => activeDoc.value)

const submitRevision = () => {
  if (!activeDoc.value || !revForm.value.file) {
    if (!revForm.value.file) revFileError.value = 'Lampirkan berkas revisi.'
    return
  }
  addRevision(activeDoc.value.id, {
    version: revForm.value.version,
    status: revForm.value.status,
    note: revForm.value.note,
    file: revForm.value.file,
    uploadedBy: 'Surya (Eng)',
  })
  showReviseModal.value = false
}

const openViewer = (doc: TechDoc, versionId?: string) => {
  activeDoc.value = doc
  activeVersionId.value = versionId
  showViewer.value = true
}

const workflowAction = (doc: TechDoc): { label: string; next: TechDocStatus } | null => {
  if (doc.status === 'Draft') return { label: 'Ajukan', next: 'Issued for Review' }
  if (doc.status === 'Issued for Review') return { label: 'Setujui AFC', next: 'Approved for Construction' }
  if (doc.status === 'Approved for Construction') return { label: 'As-Built', next: 'As-Built' }
  return null
}

const applyWorkflow = (doc: TechDoc) => {
  const action = workflowAction(doc)
  if (action) setStatus(doc.id, action.next)
}
</script>

<style scoped>
.view-toggle-active {
  border-color: var(--primary-500);
  color: var(--text-accent);
  background: var(--tint-primary-bg);
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-5);
}

.doc-card {
  padding: var(--space-5);
  cursor: pointer;
}

@media (max-width: 900px) {
  .doc-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
}
</style>
