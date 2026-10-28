<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Bill of Materials</h1>
        <p class="page-subtitle">Rincian item material per panel &amp; per proyek (PRD M3 §4.3.3 · Spesifikasi §7.1)</p>
      </div>
      <div class="flex gap-3">
        <router-link :to="firstDraft ? `/projects/${firstDraft.project_id}` : '/projects'"
                     class="btn btn-secondary btn-sm" id="btn-goto-project">🧩 Buka dari Halaman Proyek</router-link>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="bom-chain-hint">
      ℹ️ BOM dibuat <strong>otomatis per panel</strong> saat Sales Order Confirmed (Rev A Draft, terisi template
      material). <strong>Klik baris untuk membuka editor item</strong> — pilih komponen dari Item Master, isi qty,
      designator, dan penanda long-lead. Tidak ada tombol "+ BOM Baru".
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-bom-total">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">⚙️</div>
        <div class="stat-value">{{ rows.length }}</div>
        <div class="stat-label">Total BOM Terdaftar</div>
      </div>
      <div class="stat-card" id="stat-bom-approved">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ rows.filter(r => r.bom.status === 'APPROVED').length }}</div>
        <div class="stat-label">BOM Approved (Produksi)</div>
      </div>
      <div class="stat-card" id="stat-bom-review">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⏳</div>
        <div class="stat-value text-warning">{{ rows.filter(r => r.bom.status === 'IN_REVIEW').length }}</div>
        <div class="stat-label">Menunggu Review Teknik</div>
      </div>
      <div class="stat-card" id="stat-bom-longlead">
        <div class="stat-icon" style="background: rgba(239,68,68,0.15);">🚨</div>
        <div class="stat-value text-danger">{{ totalLongLeadLines }}</div>
        <div class="stat-label">Baris Long-Lead Terpantau</div>
      </div>
    </div>

    <!-- List & Filter -->
    <div class="card" id="bom-list-card">
      <div class="card-header">
        <div class="input-with-icon" style="width: 280px;">
          <span class="input-icon">🔍</span>
          <input class="input" placeholder="Cari proyek, panel, kode item..." v-model="search" id="search-bom" />
        </div>
        <select class="select" style="width: 160px;" v-model="filterStatus" id="filter-bom-status">
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="SUPERSEDED">Superseded</option>
        </select>
        <div class="flex gap-2">
          <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'"
                  @click="filterMine = !filterMine" id="filter-bom-mine">⏳ Menunggu Tindakan Saya</button>
          <button class="btn btn-sm" :class="filterBlocked ? 'btn-danger' : 'btn-secondary'"
                  @click="filterBlocked = !filterBlocked" id="filter-bom-blocked">🔒 Terkunci</button>
        </div>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="bom-table">
          <thead>
            <tr>
              <th>ID BOM</th>
              <th>Proyek / Panel</th>
              <th>Tipe</th>
              <th>Rev</th>
              <th>Jml Item</th>
              <th>Estimasi Material</th>
              <th>Long-Lead</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Disetujui Oleh</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRows" :key="r.bom.id" :id="`row-bom-${r.bom.id}`"
                class="table-clickable" @click="openEditor(r.bom)">
              <td><span class="mono text-xs text-tertiary">{{ r.bom.id }}</span></td>
              <td>
                <div class="font-medium text-primary">{{ r.projectName }}</div>
                <div class="text-xs text-accent font-semibold">{{ r.bom.panel_name }}</div>
              </td>
              <td><span class="badge badge-neutral">{{ r.bom.bom_type === 'ESTIMASI' ? 'Estimasi' : 'Produksi' }}</span></td>
              <td><span class="text-accent font-semibold">{{ r.bom.rev }}</span></td>
              <td class="text-secondary">{{ r.bom.items.length }} item</td>
              <td class="text-secondary text-sm">{{ formatCurrencyChain(r.value) }}</td>
              <td>
                <span v-if="r.longLead > 0" class="badge badge-danger">{{ r.longLead }} LL</span>
                <span v-else class="text-xs text-tertiary">—</span>
              </td>
              <td>
                <span :class="['badge', statusBadgeClass(r.bom.status)]">{{ statusLabel(r.bom.status) }}</span>
                <div v-if="r.blockedReason" class="text-xs text-warning" style="margin-top: 2px;">🔒 {{ r.blockedReason }}</div>
              </td>
              <td class="text-tertiary text-sm">{{ fmtDate(r.bom.created_at) }}</td>
              <td class="text-secondary text-sm">{{ r.bom.approved_by || '—' }}</td>
              <td @click.stop>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`bom-view-${r.bom.id}`"
                          @click="openEditor(r.bom)" data-tooltip="Buka Editor Item BOM">🧮</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="11">
                <div class="empty-state" style="padding: 28px;">
                  <div class="empty-state-icon">🧱</div>
                  <div class="empty-state-title">Tidak ada BOM cocok dengan filter</div>
                  <div class="empty-state-desc">BOM muncul otomatis di sini setelah Sales Order di-Confirm.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer">
        <span class="text-sm text-tertiary">{{ filteredRows.length }} dari {{ rows.length }} BOM ·
          total {{ totalItems }} baris item</span>
      </div>
    </div>

    <!-- Editor BOM -->
    <BomEditor v-if="editorProject && editorPanel"
               :project-id="editorProject" :panel-id="editorPanel"
               @close="closeEditor" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BomEditor from '../../components/BomEditor.vue'
import {
  bomHeaders, proyekList, isBomEditable,
  formatCurrencyChain, statusBadgeClass, statusLabel,
  type BomHeader,
} from '../../data/chainStore'

interface BomRow {
  bom: BomHeader
  projectName: string
  value: number
  longLead: number
  blockedReason?: string
}

const rows = computed<BomRow[]>(() =>
  [...bomHeaders.value]
    .sort((a, b) => b.id.localeCompare(a.id))
    .map(bom => {
      const project = proyekList.value.find(p => p.id === bom.project_id)
      let blockedReason: string | undefined
      if (bom.status === 'IN_REVIEW') blockedReason = 'Menunggu Manajer Teknik'
      else if (bom.status === 'SUPERSEDED') blockedReason = 'Digantikan revisi baru'
      else if (bom.status === 'APPROVED') blockedReason = 'Terkunci — butuh Buat Revisi'
      return {
        bom,
        projectName: project ? `${bom.project_id} ${project.name}` : bom.project_id,
        value: bom.items.reduce((s, l) => s + l.required_qty * l.unit_price, 0),
        longLead: bom.items.filter(l => l.is_long_lead).length,
        blockedReason: isBomEditable(bom) ? undefined : blockedReason,
      }
    })
)

const totalItems = computed(() => rows.value.reduce((s, r) => s + r.bom.items.length, 0))
const totalLongLeadLines = computed(() => rows.value.reduce((s, r) => s + r.longLead, 0))
const firstDraft = computed(() => bomHeaders.value.find(b => isBomEditable(b)))

const search = ref('')
const filterStatus = ref('')
const filterMine = ref(false)
const filterBlocked = ref(false)

const filteredRows = computed(() => rows.value.filter(r => {
  const s = search.value.toLowerCase()
  const matchSearch = !s ||
    r.bom.id.toLowerCase().includes(s) ||
    r.projectName.toLowerCase().includes(s) ||
    r.bom.panel_name.toLowerCase().includes(s) ||
    r.bom.items.some(i => i.item_code.toLowerCase().includes(s) || i.item_name.toLowerCase().includes(s))
  const matchStatus = !filterStatus.value || r.bom.status === filterStatus.value
  const matchMine = !filterMine.value || r.bom.status === 'IN_REVIEW'
  const matchBlocked = !filterBlocked.value || !!r.blockedReason
  return matchSearch && matchStatus && matchMine && matchBlocked
}))

const fmtDate = (d?: string) => {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Editor ──────────────────────────────────────────────────────────────────
const editorProject = ref('')
const editorPanel = ref('')
const openEditor = (bom: BomHeader) => {
  editorProject.value = bom.project_id
  editorPanel.value = bom.panel_id
}
const closeEditor = () => {
  editorProject.value = ''
  editorPanel.value = ''
}
</script>
