<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Pembelian (Purchasing)</h1>
        <p class="page-subtitle">Kelola Purchase Request, Purchase Order, dan monitoring pengadaan</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-export-po" @click="toast.notReady('Export Pembelian')">📊 Export</button>
        <button class="btn btn-primary btn-sm" id="btn-new-pr" @click="showNewPRModal = true">+ PR Manual</button>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="purch-chain-hint">
      ℹ️ PR produksi dibuat <strong>otomatis dari MRP</strong> (BOM Approved). PR manual hanya untuk <strong>Stok Umum (reorder point)</strong> atau dengan acuan proyek — PO dibuat dari PR yang disetujui.
    </div>

    <!-- KPI Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-open-po">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">📦</div>
        <div class="stat-value">{{ mockPOs.length }}</div>
        <div class="stat-label">PO Aktif</div>
      </div>
      <div class="stat-card" id="stat-pending-pr">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⏳</div>
        <div class="stat-value">{{ pendingPRCount }}</div>
        <div class="stat-label">PR Menunggu Approval</div>
        <div class="stat-trend trend-up" v-if="pendingPRCount > 0">▲ Perlu tindakan</div>
      </div>
      <div class="stat-card" id="stat-po-value">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">💰</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(totalPOValue) }}</div>
        <div class="stat-label">Total Nilai PO Aktif</div>
      </div>
      <div class="stat-card" id="stat-overdue-po">
        <div class="stat-icon" style="background: rgba(239,68,68,0.15);">⚠️</div>
        <div class="stat-value" :class="latePOCount > 0 ? 'text-danger' : undefined">{{ latePOCount }}</div>
        <div class="stat-label">Vendor Terlambat (Lewat ETA)</div>
        <div class="stat-trend trend-down" v-if="latePOCount > 0">▼ Perlu pengecekan kembali</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-3 items-center" style="margin-bottom: 20px;">
      <div class="tabs-nav" style="flex: none;">
        <button :class="['tab-btn', activeTab === 'pr' && 'active']" @click="activeTab = 'pr'" id="tab-pr">Purchase Request</button>
        <button :class="['tab-btn', activeTab === 'po' && 'active']" @click="activeTab = 'po'" id="tab-po">Purchase Order</button>
      </div>
      <div class="input-with-icon flex-1">
        <span class="input-icon">🔍</span>
        <input type="text" class="input" :placeholder="activeTab === 'pr' ? 'Cari PR, item, proyek...' : 'Cari PO, vendor, proyek...'" v-model="search" id="search-purchase" />
      </div>
      <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'" @click="filterMine = !filterMine" id="filter-purch-mine">⏳ Menunggu Tindakan Saya</button>
    </div>

    <!-- PR Table -->
    <div v-if="activeTab === 'pr'" class="card" id="pr-table-card">
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="pr-table">
          <thead>
            <tr>
              <th>No. PR</th>
              <th>Proyek</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Est. Nilai</th>
              <th>Diminta Oleh</th>
              <th>Tanggal</th>
              <th>Priority</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pr in filteredPRs" :key="pr.id" :id="`row-pr-${pr.id}`">
              <td><div class="mono text-sm font-semibold text-accent">{{ pr.id }}</div></td>
              <td><span class="badge badge-primary text-xs">{{ pr.project }}</span></td>
              <td><div class="font-medium text-primary">{{ pr.item }}</div></td>
              <td class="text-secondary">{{ pr.qty }} {{ pr.uom }}</td>
              <td class="font-semibold">{{ formatCurrency(pr.estimatedValue) }}</td>
              <td class="text-secondary text-sm">{{ pr.requestedBy }}</td>
              <td class="text-secondary text-sm">{{ formatDate(pr.date) }}</td>
              <td>
                <span :class="['badge', pr.priority === 'High' ? 'badge-danger' : pr.priority === 'Medium' ? 'badge-warning' : 'badge-neutral']">{{ pr.priority }}</span>
              </td>
              <td><span :class="['badge', statusColors[pr.status] || 'badge-neutral']">{{ pr.status }}</span></td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`pr-approve-${pr.id}`"
                          v-if="pr.status === 'Pending'" data-tooltip="Approve" aria-label="Setujui PR"
                          @click="approvePR(pr)">✅</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`pr-po-${pr.id}`"
                          v-if="pr.status === 'Approved'" data-tooltip="Buat PO dari PR" aria-label="Buat PO dari PR"
                          @click="openPOFromPR(pr)">📋</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PO Table -->
    <div v-if="activeTab === 'po'" class="card" id="po-table-card">
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="po-table">
          <thead>
            <tr>
              <th>No. PO</th>
              <th>Vendor</th>
              <th>Proyek</th>
              <th>Items</th>
              <th>Total Nilai</th>
              <th>Tgl Order</th>
              <th>ETA</th>
              <th>Currency</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="po in filteredPOs" :key="po.id" :id="`row-po-${po.id}`">
              <td><div class="mono text-sm font-semibold text-accent">{{ po.id }}</div></td>
              <td>
                <div class="font-medium text-primary truncate" style="max-width: 200px;">{{ po.vendor }}</div>
                <div class="text-xs text-tertiary">{{ po.paymentTerm }}</div>
              </td>
              <td><span class="badge badge-primary text-xs">{{ po.project }}</span></td>
              <td class="text-secondary text-sm">{{ po.items }} item</td>
              <td class="font-semibold">{{ formatCurrency(po.totalValue) }}</td>
              <td class="text-secondary text-sm">{{ formatDate(po.orderDate) }}</td>
              <td>
                <span :class="isOverdue(po.eta) ? 'text-danger text-sm font-semibold' : 'text-secondary text-sm'">{{ formatDate(po.eta) }}</span>
              </td>
              <td><span class="badge badge-neutral text-xs">{{ po.currency }}</span></td>
              <td><span :class="['badge', poStatusColors[po.status] || 'badge-neutral']">{{ po.status }}</span></td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`po-view-${po.id}`"
                          data-tooltip="Detail PO" aria-label="Lihat detail PO" @click="viewPO(po)">👁️</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`po-grn-${po.id}`"
                          v-if="po.status !== 'GRN Selesai'" data-tooltip="Proses penerimaan barang (GRN)"
                          aria-label="Proses GRN" @click="goGRN(po)">📥</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New PR Modal -->
    <div class="modal-overlay" v-if="showNewPRModal" @click.self="showNewPRModal = false" id="modal-new-pr">
      <div class="modal" style="max-width: 580px;">
        <div class="modal-header">
          <span class="font-semibold text-lg">Purchase Request Baru</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showNewPRModal = false">✕</button>
        </div>
        <form @submit.prevent="submitPR">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label" for="input-pr-source">Sumber PR *</label>
              <select class="select" id="input-pr-source" v-model="prForm.source">
                <option>Stok Umum (reorder point)</option>
                <option>Proyek</option>
              </select>
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label" for="input-pr-project">Proyek *</label>
              <select class="select" id="input-pr-project" v-model="prForm.project" required>
                <option value="">Pilih proyek...</option>
                <option>PRJ-2026-001</option>
                <option>PRJ-2026-002</option>
                <option>PRJ-2026-003</option>
              </select>
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label" for="input-pr-item">Item / Material *</label>
              <input type="text" class="input" placeholder="Nama item atau kode BOM..." id="input-pr-item"
                     v-model="prForm.item" required />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-pr-qty">Kuantitas *</label>
              <input type="number" class="input" id="input-pr-qty" v-model.number="prForm.qty" min="1" required />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-pr-uom">Satuan</label>
              <select class="select" id="input-pr-uom" v-model="prForm.uom">
                <option>PCS</option><option>MTR</option><option>SET</option><option>KG</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-pr-value">Estimasi Nilai (Rp)</label>
              <input type="number" class="input" id="input-pr-value" v-model.number="prForm.value" min="0" />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-pr-priority">Priority</label>
              <select class="select" id="input-pr-priority" v-model="prForm.priority">
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label" for="input-pr-notes">Catatan / Justifikasi</label>
              <textarea class="input" rows="2" style="height: auto; padding: 10px;" id="input-pr-notes"
                        v-model="prForm.notes"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showNewPRModal = false" id="btn-cancel-pr">Batal</button>
          <button type="submit" class="btn btn-primary" id="btn-save-pr">Buat PR</button>
        </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { mockPurchaseRequests, mockPurchaseOrders } from '../../data/mockDataExtended'
import { mockVendors, formatCurrency, formatDate, statusColors } from '../../data/mockData'
import { useToast } from '../../data/toastStore'
import RecordDetailModal, { type DetailRow } from '../../components/RecordDetailModal.vue'

const toast = useToast()
const router = useRouter()

const activeTab = ref('pr')
const search = ref('')
const showNewPRModal = ref(false)
const filterMine = ref(false)
const mockPRs = mockPurchaseRequests.value
const mockPOs = mockPurchaseOrders.value

const poStatusColors: Record<string, string> = {
  'Open': 'badge-primary',
  'Partial GRN': 'badge-warning',
  'GRN Selesai': 'badge-success',
  'Cancelled': 'badge-danger',
}

const filteredPRs = computed(() => {
  const s = search.value.toLowerCase()
  return mockPRs.filter(p => {
    const matchSearch = !s || p.id.toLowerCase().includes(s) || p.item.toLowerCase().includes(s) || p.project.toLowerCase().includes(s)
    const matchMine = !filterMine.value || p.status === 'Pending'
    return matchSearch && matchMine
  })
})

const filteredPOs = computed(() => {
  const s = search.value.toLowerCase()
  return mockPOs.filter(p => {
    const matchSearch = !s || p.id.toLowerCase().includes(s) || p.vendor.toLowerCase().includes(s) || p.project.toLowerCase().includes(s)
    const matchMine = !filterMine.value || p.status === 'Open' || p.status === 'Partial GRN'
    return matchSearch && matchMine
  })
})

const pendingPRCount = computed(() => mockPRs.filter(p => p.status === 'Pending').length)
const totalPOValue = computed(() => mockPOs.filter(p => p.status !== 'GRN Selesai').reduce((a, p) => a + p.totalValue, 0))
const isOverdue = (date: string) => date && new Date(date) < new Date()

/** PO aktif yang ETA-nya sudah lewat — vendor terlambat mengirim. */
const latePOCount = computed(() =>
  mockPOs.filter(p => p.status !== 'GRN Selesai' && p.status !== 'Cancelled' && isOverdue(p.eta)).length
)

// ─── Aksi Purchase Request ───────────────────────────────────────────────────
const todayIso = new Date().toISOString().split('T')[0]

const approvePR = (pr: typeof mockPRs[number]) => {
  pr.status = 'Approved'
  toast.success('PR Disetujui', `${pr.id} — ${pr.item} (${pr.qty} ${pr.uom}) siap dijadikan PO`)
}

const showPOFromPR = ref(false)
const sourcePR = ref<(typeof mockPRs[number]) | null>(null)
const poForm = ref({ vendor: mockVendors[0]?.name || '', eta: '', value: 0 })

const openPOFromPR = (pr: typeof mockPRs[number]) => {
  sourcePR.value = pr
  poForm.value = {
    vendor: mockVendors[0]?.name || '',
    eta: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().split('T')[0],
    value: pr.estimatedValue,
  }
  showPOFromPR.value = true
}

const submitPO = () => {
  const pr = sourcePR.value
  if (!pr || !poForm.value.vendor || !poForm.value.eta) {
    toast.warning('Data PO Belum Lengkap', 'Vendor dan ETA wajib diisi')
    return
  }
  const vendor = mockVendors.find(v => v.name === poForm.value.vendor)
  const po = {
    id: `PO-2026-${170 + mockPOs.length}`,
    vendor: poForm.value.vendor,
    project: pr.project,
    items: 1,
    totalValue: poForm.value.value,
    orderDate: todayIso,
    eta: poForm.value.eta,
    status: 'Open',
    paymentTerm: vendor?.paymentTerm || '30 hari',
    currency: vendor?.currency || 'IDR',
  }
  mockPOs.unshift(po)
  pr.status = 'PO Dibuat'
  showPOFromPR.value = false
  toast.success('PO Dibuat dari PR', `${po.id} untuk ${pr.item} — ETA ${formatDate(po.eta)}`)
}

// ─── Aksi Purchase Order ─────────────────────────────────────────────────────
const detailRows = ref<DetailRow[]>([])
const showDetail = ref(false)

const viewPO = (po: typeof mockPOs[number]) => {
  detailRows.value = [
    { label: 'No. PO', value: po.id, mono: true },
    { label: 'Status', value: po.status },
    { label: 'Vendor', value: po.vendor },
    { label: 'Proyek', value: po.project, mono: true },
    { label: 'Jumlah Item', value: po.items },
    { label: 'Total Nilai', value: formatCurrency(po.totalValue) },
    { label: 'Tgl Order', value: formatDate(po.orderDate) },
    { label: 'ETA', value: formatDate(po.eta) },
    { label: 'Mata Uang', value: po.currency },
    { label: 'Termin Bayar', value: po.paymentTerm },
  ]
  showDetail.value = true
}

const goGRN = (po: typeof mockPOs[number]) => {
  router.push({ path: '/inventory/grn', query: { po: po.id } })
}

// ─── Form PR Manual ──────────────────────────────────────────────────────────
const prForm = ref({
  source: 'Stok Umum (reorder point)',
  project: '',
  item: '',
  qty: null as number | null,
  uom: 'PCS',
  value: null as number | null,
  priority: 'Medium',
  notes: '',
})

const submitPR = () => {
  if (!prForm.value.project || !prForm.value.item || !prForm.value.qty) {
    toast.warning('Data PR Belum Lengkap', 'Proyek, item, dan kuantitas wajib diisi')
    return
  }
  const pr = {
    id: `PR-2026-${93 + mockPRs.length}`,
    project: prForm.value.project,
    item: prForm.value.item,
    qty: prForm.value.qty,
    uom: prForm.value.uom,
    estimatedValue: prForm.value.value || 0,
    requestedBy: 'Budi Santoso',
    date: todayIso,
    status: 'Pending',
    priority: prForm.value.priority,
  }
  mockPRs.unshift(pr)
  showNewPRModal.value = false
  prForm.value = { source: 'Stok Umum (reorder point)', project: '', item: '', qty: null, uom: 'PCS', value: null, priority: 'Medium', notes: '' }
  toast.success('PR Dibuat', `${pr.id} — ${pr.item} masuk antrean approval`)
}
</script>
