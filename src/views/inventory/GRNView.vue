<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Penerimaan Barang (GRN)</h1>
        <p class="page-subtitle">Catat dan verifikasi penerimaan fisik barang dari vendor (PRD M6 §4.5.3)</p>
      </div>
      <div></div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="grn-chain-hint">
      ℹ️ GRN <strong>hanya dibuat dari PO</strong> melalui antrean "PO Menunggu Diterima" di bawah — tidak ada tombol "+ GRN Baru".
    </div>

    <!-- Summary KPI -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-grn-count">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">📥</div>
        <div class="stat-value">{{ grns.length }}</div>
        <div class="stat-label">Total Dokumen GRN</div>
      </div>
      <div class="stat-card" id="stat-grn-iqc-pending">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">🔍</div>
        <div class="stat-value text-warning">{{ grns.filter(g => g.status === 'IQC Pending').length }}</div>
        <div class="stat-label">Menunggu IQC Quality</div>
      </div>
      <div class="stat-card" id="stat-grn-done">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ grns.filter(g => g.status === 'Selesai').length }}</div>
        <div class="stat-label">Selesai Masuk Stok</div>
      </div>
      <div class="stat-card" id="stat-grn-qty">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">📦</div>
        <div class="stat-value">{{ grns.reduce((a, g) => a + g.totalQty, 0).toLocaleString() }}</div>
        <div class="stat-label">Total Unit Fisik Diterima</div>
      </div>
    </div>

    <!-- Antrean: PO Menunggu Diterima -->
    <div class="card" id="grn-po-queue-card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="font-semibold">📥 PO Menunggu Diterima</div>
        <span class="badge badge-warning" id="grn-queue-count">{{ pendingPOs.length }} PO</span>
      </div>
      <div v-if="pendingPOs.length" class="table-container" style="border: none;">
        <table class="table" id="grn-po-queue-table">
          <thead>
            <tr>
              <th>No. PO</th>
              <th>Vendor</th>
              <th>Proyek</th>
              <th>Items</th>
              <th>ETA</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="po in pendingPOs" :key="po.id" :id="`row-po-queue-${po.id}`">
              <td><span class="mono text-sm font-semibold text-accent">{{ po.id }}</span></td>
              <td class="font-medium text-primary text-sm">{{ po.vendor }}</td>
              <td><span class="badge badge-primary text-xs">{{ po.project }}</span></td>
              <td class="text-secondary text-sm">{{ po.items }} item</td>
              <td class="text-secondary text-sm">{{ formatDate(po.eta) }}</td>
              <td><span :class="['badge', po.status === 'Partial GRN' ? 'badge-warning' : 'badge-primary']">{{ po.status }}</span></td>
              <td>
                <button class="btn btn-primary btn-sm" :id="`btn-receive-${po.id}`" @click="openGRNFromPO(po.id)">Terima Barang</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state" style="padding: 24px;">
        <div class="empty-state-title">Tidak ada PO menunggu penerimaan</div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="card" id="grn-table-card">
      <div class="card-header">
        <div class="input-with-icon" style="width: 280px;">
          <span class="input-icon">🔍</span>
          <input class="input" placeholder="Cari GRN, PO, vendor..." v-model="search" id="search-grn" />
        </div>
        <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'" @click="filterMine = !filterMine" id="filter-grn-mine">⏳ Menunggu Tindakan Saya</button>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="grn-table">
          <thead>
            <tr>
              <th>No. GRN</th>
              <th>No. PO Ref</th>
              <th>Surat Jalan Vendor</th>
              <th>Vendor</th>
              <th>Tanggal Terima</th>
              <th>Jml Item</th>
              <th>Total Qty</th>
              <th>Status</th>
              <th>Diterima Oleh</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in filteredGRNs" :key="g.id" :id="`row-grn-${g.id}`">
              <td><span class="mono text-sm font-semibold text-accent">{{ g.id }}</span></td>
              <td><span class="mono text-xs text-primary font-semibold">{{ g.poRef }}</span></td>
              <td><span class="text-secondary text-sm mono">{{ g.doNo || 'SJ-VND-2026/09' }}</span></td>
              <td class="text-secondary text-sm font-medium">{{ g.vendor }}</td>
              <td class="text-secondary text-sm">{{ g.date }}</td>
              <td class="text-secondary">{{ g.items }} item</td>
              <td class="font-semibold">{{ g.totalQty.toLocaleString() }}</td>
              <td>
                <span :class="['badge', g.status === 'Selesai' ? 'badge-success' : 'badge-warning']">
                  {{ g.status }}
                </span>
              </td>
              <td class="text-secondary text-sm">{{ g.receivedBy }}</td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`grn-view-${g.id}`" data-tooltip="Lihat Rincian">👁️</button>
                  <router-link to="/quality" class="btn btn-icon btn-secondary btn-sm" :id="`grn-iqc-${g.id}`" v-if="g.status !== 'Selesai'" data-tooltip="Mulai Inspeksi IQC">🔍</router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Penerimaan Barang Baru (Sesuai PRD §4.5.3 #modal-new-grn) -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" id="modal-new-grn">
      <div class="modal" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Catat Penerimaan Barang (GRN) Baru</span>
            <div class="text-xs text-tertiary">Verifikasi Surat Jalan Vendor vs Purchase Order (PRD M6 §4.5.3)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="submitGRN">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-grn-po">Nomor Ref PO *</label>
                <select class="select" id="input-grn-po" v-model="form.poRef" @change="onSelectPO" required>
                  <option value="" disabled>Pilih Purchase Order Aktif...</option>
                  <option v-for="po in mockPurchaseOrders" :key="po.id" :value="po.id">
                    {{ po.id }} — {{ po.vendor }}
                  </option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">Vendor Pengirim</label>
                <input
                  type="text"
                  class="input"
                  :value="form.vendor"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-grn-do-no">No. Surat Jalan (DO) Vendor *</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-grn-do-no"
                  v-model="form.doNo"
                  placeholder="SJ-SCH-2026/10/002"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-grn-date">Tanggal Terima Fisik *</label>
                <input
                  type="date"
                  class="input"
                  id="input-grn-date"
                  v-model="form.date"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-grn-items">Jumlah Item Barang *</label>
                <input
                  type="number"
                  class="input"
                  id="input-grn-items"
                  v-model.number="form.items"
                  min="1"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-grn-qty">Total Kuantitas Fisik *</label>
                <input
                  type="number"
                  class="input"
                  id="input-grn-qty"
                  v-model.number="form.totalQty"
                  min="1"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-grn-receiver">Petugas Penerima Gudang *</label>
                <input
                  type="text"
                  class="input"
                  id="input-grn-receiver"
                  v-model="form.receivedBy"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false" id="btn-cancel-grn">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-grn">Simpan GRN & Teruskan ke IQC</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockPurchaseOrders } from '../../data/mockDataExtended'
import { formatDate } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

interface GRNItem {
  id: string
  poRef: string
  doNo?: string
  vendor: string
  date: string
  items: number
  totalQty: number
  status: 'IQC Pending' | 'Selesai' | 'Retur Parsial'
  receivedBy: string
}

const grns = ref<GRNItem[]>([
  { id: 'GRN-2026-089', poRef: 'PO-2026-156', doNo: 'SJ-SCH-2026/09/88', vendor: 'PT. Schneider Electric Indonesia', date: '02 Okt 2026', items: 3, totalQty: 15, status: 'IQC Pending', receivedBy: 'Wahyu' },
  { id: 'GRN-2026-088', poRef: 'PO-2026-150', doNo: 'SJ-SUP-2026/09/12', vendor: 'PT. Supreme Cable', date: '28 Sep 2026', items: 2, totalQty: 2000, status: 'Selesai', receivedBy: 'Wahyu' },
  { id: 'GRN-2026-085', poRef: 'PO-2026-141', doNo: 'SJ-ABB-2026/09/33', vendor: 'PT. ABB Sakti Industri', date: '20 Sep 2026', items: 5, totalQty: 48, status: 'Selesai', receivedBy: 'Slamet' },
])

const search = ref('')
const showModal = ref(false)
const filterMine = ref(false)

const pendingPOs = computed(() =>
  mockPurchaseOrders.filter(po =>
    (po.status === 'Open' || po.status === 'Partial GRN') &&
    !grns.value.some(g => g.poRef === po.id && g.status !== 'Retur Parsial')
  )
)

const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  poRef: mockPurchaseOrders[0]?.id || '',
  vendor: mockPurchaseOrders[0]?.vendor || '',
  doNo: '',
  date: todayStr,
  items: 3,
  totalQty: 15,
  receivedBy: 'Wahyu (Gudang)'
})

const onSelectPO = () => {
  const match = mockPurchaseOrders.find(p => p.id === form.value.poRef)
  if (match) {
    form.value.vendor = match.vendor
    form.value.items = match.items
  }
}

const openGRNFromPO = (poId: string) => {
  form.value.poRef = poId
  onSelectPO()
  showModal.value = true
}

const filteredGRNs = computed(() => {
  return grns.value.filter(g => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || g.id.toLowerCase().includes(s) || g.poRef.toLowerCase().includes(s) || g.vendor.toLowerCase().includes(s)
    const matchMine = !filterMine.value || g.status === 'IQC Pending'
    return matchSearch && matchMine
  })
})

const submitGRN = () => {
  if (!form.value.poRef || !form.value.doNo) return

  const nextSeq = grns.value.length + 90
  const newGRN: GRNItem = {
    id: `GRN-2026-0${nextSeq}`,
    poRef: form.value.poRef,
    doNo: form.value.doNo,
    vendor: form.value.vendor,
    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    items: form.value.items,
    totalQty: form.value.totalQty,
    status: 'IQC Pending',
    receivedBy: form.value.receivedBy
  }

  grns.value.unshift(newGRN)
  showModal.value = false
  toast.success('Penerimaan GRN Berhasil', `${newGRN.id} dicatat. Silakan lakukan inspeksi incoming QC sebelum masuk saldo bebas stok.`)
}
</script>
