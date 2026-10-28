<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Stok & Gudang</h1>
        <p class="page-subtitle">Kelola inventaris, reservasi, dan mutasi pergerakan stok (PRD M5 §4.4)</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-stock-opname" @click="openAdjustmentModal(null, 'Hasil Stock Opname')">📋 Opname</button>
        <button class="btn btn-secondary btn-sm" id="btn-adjust-stock" @click="openAdjustmentModal(allItems[0])">🔧 Penyesuaian</button>
        <button class="btn btn-primary btn-sm" id="btn-transfer-stock" @click="showTransferModal = true">↔ Transfer Stok</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-total-sku">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">📦</div>
        <div class="stat-value">{{ allItems.length }}</div>
        <div class="stat-label">Total SKU Aktif</div>
      </div>
      <div class="stat-card" id="stat-stock-value">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">💵</div>
        <div class="stat-value" style="font-size: 20px;">{{ stockValueLabel }}</div>
        <div class="stat-label">Nilai Persediaan</div>
      </div>
      <div class="stat-card" id="stat-low-stock">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⚠️</div>
        <div class="stat-value text-warning">{{ lowStockCount }}</div>
        <div class="stat-label">Di Bawah Reorder Point</div>
      </div>
      <div class="stat-card" id="stat-reserved">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">🔒</div>
        <div class="stat-value">{{ activeReservations }}</div>
        <div class="stat-label">Reservasi Belum Selesai</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px; max-width: 480px;" id="inventory-tabs">
      <button :class="['tab-btn', tab === 'stock' && 'active']" @click="setTab('stock')" id="tab-stock">Kartu Stok</button>
      <button :class="['tab-btn', tab === 'reserved' && 'active']" @click="setTab('reserved')" id="tab-reserved">Reservasi Proyek</button>
      <button :class="['tab-btn', tab === 'movements' && 'active']" @click="setTab('movements')" id="tab-movements">Mutasi Stok</button>
    </div>

    <!-- Filters -->
    <div class="card" style="padding: 14px 20px; margin-bottom: 20px;" id="inventory-filters">
      <div class="flex gap-3 flex-wrap items-center">
        <div class="input-with-icon flex-1" style="min-width: 200px;">
          <span class="input-icon">🔍</span>
          <input type="text" class="input" placeholder="Cari item, kode, merek..." v-model="search" id="search-stock" />
        </div>
        <select class="select" style="width: 180px;" v-model="filterStatus" id="filter-stock-status">
          <option value="">Semua Status</option>
          <option value="Tersedia">Tersedia</option>
          <option value="Dicadangkan">Dicadangkan</option>
        </select>
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" v-model="showLowOnly" id="check-low-stock" />
          <span>Hanya stok rendah</span>
        </label>
      </div>
    </div>

    <!-- Stock Table -->
    <div class="card" v-if="tab === 'stock'" id="stock-table-card">
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="stock-table">
          <thead>
            <tr>
              <th>Kode Item</th>
              <th>Nama / Deskripsi</th>
              <th>Tersedia</th>
              <th>Dicadangkan</th>
              <th>Total</th>
              <th>Reorder</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredStock" :key="item.id" :id="`row-stock-${item.id}`">
              <td><span class="mono text-xs badge badge-neutral">{{ item.code }}</span></td>
              <td>
                <div class="font-medium text-primary">{{ item.name }}</div>
                <div class="text-xs text-tertiary">{{ item.category }}</div>
              </td>
              <td>
                <span class="font-semibold text-success">{{ availableFor(item).toLocaleString() }}</span>
                <span class="text-xs text-tertiary"> {{ item.uom }}</span>
              </td>
              <td>
                <span class="font-medium text-accent">{{ reservedFor(item).toLocaleString() }}</span>
                <span class="text-xs text-tertiary"> {{ item.uom }}</span>
              </td>
              <td class="font-semibold">{{ item.stock.toLocaleString() }}</td>
              <td>
                <span class="text-tertiary text-sm">{{ item.reorder }}</span>
              </td>
              <td>
                <span v-if="item.stock <= item.reorder" class="badge badge-danger">⚠ Rendah</span>
                <span v-else-if="item.stock <= item.reorder * 1.5" class="badge badge-warning">Mendekati</span>
                <span v-else class="badge badge-success">Normal</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`stock-history-${item.id}`" data-tooltip="Riwayat Mutasi" aria-label="Lihat riwayat mutasi" @click="setTab('movements')">📊</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`stock-adjust-${item.id}`" data-tooltip="Sesuaikan Stok" aria-label="Sesuaikan stok" @click="openAdjustmentModal(item)">🔧</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer flex items-center justify-between">
        <span class="text-sm text-tertiary">{{ filteredStock.length }} item ditampilkan</span>
        <button class="btn btn-secondary btn-sm" id="btn-export-stock" @click="toast.notReady('Export Kartu Stok')">📊 Export Kartu Stok</button>
      </div>
    </div>

    <!-- Reservations Tab -->
    <div class="card" v-if="tab === 'reserved'" id="reservation-card">
      <div class="card-header">
        <div class="font-semibold">Stok Tercadang per Proyek (Reservasi)</div>
        <span class="badge badge-primary">{{ reservedProjects }} Proyek Aktif</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <table class="table" id="reservation-table">
          <thead>
            <tr>
              <th>Proyek</th>
              <th>Panel / Kubikel</th>
              <th>Item</th>
              <th>Qty Cadang</th>
              <th>Qty Picked</th>
              <th>Status</th>
              <th>Tanggal Cadang</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reservations" :key="r.id" :id="`res-row-${r.id}`">
              <td><span class="text-accent text-sm mono font-semibold">{{ r.project }}</span></td>
              <td class="text-secondary text-sm">{{ r.panel }}</td>
              <td>
                <div class="text-sm font-medium">{{ r.item }}</div>
                <div class="text-xs text-tertiary mono">{{ r.code }}</div>
              </td>
              <td class="font-semibold">{{ r.qty }} <span class="text-xs text-tertiary">{{ r.uom }}</span></td>
              <td>
                <span :class="r.picked === r.qty ? 'text-success font-semibold' : r.picked > 0 ? 'text-warning font-semibold' : 'text-tertiary'">
                  {{ r.picked }} {{ r.uom }}
                </span>
              </td>
              <td>
                <span :class="['badge', r.picked === r.qty ? 'badge-success' : r.picked > 0 ? 'badge-warning' : 'badge-primary']">
                  {{ r.picked === r.qty ? 'Selesai' : r.picked > 0 ? 'Partial' : 'Dicadangkan' }}
                </span>
              </td>
              <td class="text-tertiary text-sm">{{ r.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Movements Tab -->
    <div class="card" v-if="tab === 'movements'" id="movements-card">
      <div class="card-header">
        <div class="font-semibold">Mutasi Stok Terkini</div>
        <span class="badge badge-info">{{ movements.length }} Transaksi Tercatat</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <table class="table" id="movements-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Jenis</th>
              <th>Item Komponen</th>
              <th>Qty</th>
              <th>Referensi Dokumen</th>
              <th>Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mv in movements" :key="mv.id" :id="`mv-row-${mv.id}`">
              <td class="text-tertiary text-xs mono">{{ mv.time }}</td>
              <td>
                <span :class="['badge', mvBadge(mv.type)]">
                  {{ mvIcon(mv.type) }} {{ mv.type }}
                </span>
              </td>
              <td>
                <div class="text-sm font-medium">{{ mv.item }}</div>
                <div class="text-xs text-tertiary mono">{{ mv.code }}</div>
              </td>
              <td>
                <span :class="mv.qty > 0 ? 'text-success' : 'text-danger'" class="font-semibold">
                  {{ mv.qty > 0 ? '+' : '' }}{{ mv.qty }} {{ mv.uom }}
                </span>
              </td>
              <td><span class="text-accent text-sm mono font-semibold">{{ mv.ref }}</span></td>
              <td class="text-secondary text-sm">{{ mv.by }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Transfer / Pengeluaran Stok (Sesuai PRD §4.4.1 #modal-transfer-stock) -->
    <div class="modal-overlay" v-if="showTransferModal" @click.self="showTransferModal = false" id="modal-transfer-stock">
      <div class="modal" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Transfer / Pengeluaran Material Stok</span>
            <div class="text-xs text-tertiary">Mutasi Rak Gudang & Pengeluaran ke Work Order (PRD M5 §4.4.1)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showTransferModal = false">✕</button>
        </div>
        <form @submit.prevent="submitTransfer">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-trf-type">Jenis Mutasi *</label>
                <select class="select" id="input-trf-type" v-model="transferForm.type" required>
                  <option>Pengeluaran (Issue ke WO)</option>
                  <option>Transfer Antar Rak</option>
                  <option>Pengembalian (Return dari WO)</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-trf-item">Item Komponen *</label>
                <select class="select" id="input-trf-item" v-model="transferForm.itemId" required>
                  <option value="" disabled>Pilih Komponen...</option>
                  <option v-for="itm in allItems" :key="itm.id" :value="itm.id">
                    {{ itm.name }} ({{ itm.code }}) — Stok Tersedia: {{ itm.stock }} {{ itm.uom }}
                  </option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-trf-from">Lokasi Asal *</label>
                <select class="select" id="input-trf-from" v-model="transferForm.fromLocation" required>
                  <option>Gudang Utama</option>
                  <option>Gudang B2</option>
                  <option>Area Produksi</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-trf-to">Lokasi Tujuan *</label>
                <select class="select" id="input-trf-to" v-model="transferForm.toLocation" required>
                  <option>Area Produksi (Workshop)</option>
                  <option>Gudang Utama</option>
                  <option>Gudang B2</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-trf-qty">Jumlah Qty *</label>
                <input
                  type="number"
                  class="input"
                  id="input-trf-qty"
                  v-model.number="transferForm.qty"
                  min="1"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-trf-ref">Ref Work Order / Proyek *</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-trf-ref"
                  v-model="transferForm.reference"
                  placeholder="WO-2026-001-01"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-trf-sn">Serial Number / Lot Number (Jika Item Tracked)</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-trf-sn"
                  v-model="transferForm.serialOrLot"
                  placeholder="Contoh: SN-2026-9921 atau LOT-CU-883"
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-trf-notes">Catatan Petugas</label>
                <textarea
                  class="input"
                  rows="2"
                  id="input-trf-notes"
                  v-model="transferForm.notes"
                  placeholder="Keperluan perakitan feeder breaker..."
                  style="height: auto; padding: 10px;"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showTransferModal = false" id="btn-cancel-trf">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-trf">Eksekusi Mutasi Stok</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Penyesuaian Stok / Stock Adjustment (Sesuai PRD §4.4.2 #modal-adjust-stock) -->
    <div class="modal-overlay" v-if="showAdjustModal" @click.self="showAdjustModal = false" id="modal-adjust-stock">
      <div class="modal" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Penyesuaian Stok (Stock Adjustment)</span>
            <div class="text-xs text-tertiary">Sinkronisasi Saldo Fisik & Sistem Opname (PRD M5 §4.4.2)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showAdjustModal = false">✕</button>
        </div>
        <form @submit.prevent="submitAdjustment">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label">Item Komponen</label>
                <input
                  type="text"
                  class="input"
                  id="input-adj-item"
                  :value="selectedAdjustItem ? `${selectedAdjustItem.name} (${selectedAdjustItem.code})` : ''"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label">Saldo Sistem Saat Ini</label>
                <input
                  type="text"
                  class="input font-semibold"
                  id="input-adj-current"
                  :value="`${selectedAdjustItem?.stock || 0} ${selectedAdjustItem?.uom || ''}`"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-adj-actual">Jumlah Fisik Aktual *</label>
                <input
                  type="number"
                  class="input font-semibold"
                  id="input-adj-actual"
                  v-model.number="adjustForm.actualStock"
                  min="0"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label">Selisih Mutasi Penyesuaian</label>
                <div class="p-3 bg-glass rounded border border-subtle flex items-center justify-between">
                  <span class="text-sm text-secondary">Selisih Fisik vs Sistem:</span>
                  <span :class="adjustDiff >= 0 ? 'text-success font-bold' : 'text-danger font-bold'">
                    {{ adjustDiff >= 0 ? '+' : '' }}{{ adjustDiff }} {{ selectedAdjustItem?.uom }}
                  </span>
                </div>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-adj-reason">Alasan Penyesuaian *</label>
                <select class="select" id="input-adj-reason" v-model="adjustForm.reason" required>
                  <option>Hasil Stock Opname</option>
                  <option>Barang Rusak di Rak</option>
                  <option>Koreksi Salah Catat</option>
                  <option>Scrap Rusak Tercecer</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-adj-notes">Catatan Otorisasi *</label>
                <textarea
                  class="input"
                  rows="2"
                  id="input-adj-notes"
                  v-model="adjustForm.notes"
                  placeholder="Nomor Berita Acara Opname atau persetujuan supervisor..."
                  style="height: auto; padding: 10px;"
                  required
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAdjustModal = false" id="btn-cancel-adj">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-adj">Simpan Penyesuaian</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { items, type ItemMaster } from '../../data/itemStore'
import { useToast } from '../../data/toastStore'

const toast = useToast()
const route = useRoute()
const router = useRouter()

const tab = ref('stock')
const search = ref('')
const filterStatus = ref('')
const showLowOnly = ref(false)

/** Tab diikat ke URL (?tab=reserved) agar deep-link & tombol back berfungsi. */
const setTab = (next: string) => {
  tab.value = next
  router.replace({ query: { ...route.query, tab: next === 'stock' ? undefined : next } })
}
watch(
  () => route.query.tab,
  (q) => { if (typeof q === 'string' && ['stock', 'reserved', 'movements'].includes(q)) tab.value = q },
  { immediate: true }
)

/** Store Item Master bersama — mutasi stok terlihat juga di halaman Item Master & BOM */
const allItems = items

const lowStockCount = computed(() => allItems.value.filter(i => i.stock <= i.reorder).length)

const stockValue = computed(() => allItems.value.reduce((sum, i) => sum + i.stock * i.unit_price, 0))
const stockValueLabel = computed(() => {
  const v = stockValue.value
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)}M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)}jt`
  return `Rp ${v.toLocaleString('id-ID')}`
})

const reservations = ref([
  { id: 'r1', project: 'PRJ-2026-001', panel: 'LVMDP-01', item: 'ACB 4P 1600A', code: 'CB-ACB-4P-1600A-65kA', qty: 2, picked: 2, uom: 'PCS', date: '15 Sep 2026' },
  { id: 'r2', project: 'PRJ-2026-001', panel: 'LVMDP-02', item: 'MCCB 3P 250A', code: 'CB-MCCB-3P-250A-36kA', qty: 8, picked: 4, uom: 'PCS', date: '15 Sep 2026' },
  { id: 'r3', project: 'PRJ-2026-001', panel: 'MCC-01', item: 'Busbar Tembaga', code: 'BB-CU-100x10MM', qty: 45, picked: 0, uom: 'MTR', date: '16 Sep 2026' },
  { id: 'r4', project: 'PRJ-2026-003', panel: 'MCC-A', item: 'MCB 1P 16A', code: 'CB-MCB-1P-16A', qty: 48, picked: 0, uom: 'PCS', date: '02 Oct 2026' },
])

/** Qty tercadang (belum dipick) untuk sebuah item. */
const reservedFor = (item: ItemMaster): number =>
  reservations.value
    .filter(r => r.code === item.code || item.code.startsWith(r.code))
    .reduce((sum, r) => sum + Math.max(0, r.qty - r.picked), 0)

const availableFor = (item: ItemMaster): number => Math.max(0, item.stock - reservedFor(item))

const activeReservations = computed(() => reservations.value.filter(r => r.picked < r.qty).length)
const reservedProjects = computed(() => new Set(reservations.value.map(r => r.project)).size)

const filteredStock = computed(() => allItems.value.filter(item => {
  const q = search.value.toLowerCase()
  const match = !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  const low = !showLowOnly.value || item.stock <= item.reorder
  const reserved = reservedFor(item) > 0
  const statusOk = !filterStatus.value
    || (filterStatus.value === 'Dicadangkan' ? reserved : !reserved)
  return match && low && statusOk
}))

const movements = ref([
  { id: 'm1', time: '06/10/2026 14:32', type: 'GRN', item: 'MCCB 3P 250A', code: 'CB-MCCB-3P-250A', qty: 10, uom: 'PCS', ref: 'GRN-2026-089', by: 'Wahyu' },
  { id: 'm2', time: '06/10/2026 10:15', type: 'Issue', item: 'Kabel NYY 4x16mm²', code: 'KBL-NYY-4x16MM', qty: -120, uom: 'MTR', ref: 'WO-001-LVMDP-01', by: 'Gudang: Slamet' },
  { id: 'm3', time: '05/10/2026 16:20', type: 'Return', item: 'Busbar Tembaga', code: 'BB-CU-100x10MM', qty: 5, uom: 'MTR', ref: 'WO-001-MCC-01', by: 'Teknisi: Joko' },
  { id: 'm4', time: '04/10/2026 09:00', type: 'GRN', item: 'Kabel NYFGBY 3x2.5', code: 'KBL-NYFGBY-3x2.5', qty: 500, uom: 'MTR', ref: 'GRN-2026-088', by: 'Wahyu' },
])

const mvBadge = (t: string) => ({ 'GRN': 'badge-success', 'Issue': 'badge-danger', 'Return': 'badge-info', 'Transfer': 'badge-warning', 'Adjustment': 'badge-primary' }[t] || 'badge-neutral')
const mvIcon = (t: string) => ({ 'GRN': '📥', 'Issue': '📤', 'Return': '↩', 'Transfer': '↔', 'Adjustment': '🔧' }[t] || '•')

// Modal Transfer State
const showTransferModal = ref(false)
const transferForm = ref({
  type: 'Pengeluaran (Issue ke WO)',
  itemId: allItems.value[0]?.id || '',
  fromLocation: 'Gudang Utama',
  toLocation: 'Area Produksi (Workshop)',
  qty: 1,
  reference: 'WO-2026-001-01',
  serialOrLot: '',
  notes: ''
})

const submitTransfer = () => {
  const item = allItems.value.find(i => i.id === transferForm.value.itemId)
  if (!item) return

  const isIssue = transferForm.value.type.startsWith('Pengeluaran')
  const delta = isIssue ? -transferForm.value.qty : transferForm.value.qty

  if (isIssue && item.stock < transferForm.value.qty) {
    toast.error('Stok Tidak Cukup', `Stok ${item.name} hanya tersisa ${item.stock} ${item.uom}`)
    return
  }

  item.stock += delta

  movements.value.unshift({
    id: `m${Date.now()}`,
    time: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    type: isIssue ? 'Issue' : 'Transfer',
    item: item.name,
    code: item.code,
    qty: delta,
    uom: item.uom,
    ref: transferForm.value.reference,
    by: 'Petugas Gudang'
  })

  showTransferModal.value = false
  toast.success('Mutasi Stok Berhasil', `Item ${item.name} (${Math.abs(delta)} ${item.uom}) telah dipindahkan ke ${transferForm.value.toLocation}`)
}

// Modal Adjustment State
const showAdjustModal = ref(false)
const selectedAdjustItem = ref<typeof allItems.value[0] | null>(null)
const adjustForm = ref({
  actualStock: 0,
  reason: 'Hasil Stock Opname',
  notes: ''
})

const adjustDiff = computed(() => {
  if (!selectedAdjustItem.value) return 0
  return adjustForm.value.actualStock - selectedAdjustItem.value.stock
})

const openAdjustmentModal = (item: typeof allItems.value[0] | null, defaultReason = 'Koreksi Salah Catat') => {
  selectedAdjustItem.value = item || allItems.value[0]
  if (selectedAdjustItem.value) {
    adjustForm.value = {
      actualStock: selectedAdjustItem.value.stock,
      reason: defaultReason,
      notes: ''
    }
    showAdjustModal.value = true
  }
}

const submitAdjustment = () => {
  if (!selectedAdjustItem.value) return
  const item = selectedAdjustItem.value
  const diff = adjustDiff.value
  item.stock = adjustForm.value.actualStock

  movements.value.unshift({
    id: `m${Date.now()}`,
    time: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    type: 'Adjustment',
    item: item.name,
    code: item.code,
    qty: diff,
    uom: item.uom,
    ref: 'OPNAME-2026',
    by: 'Supervisor Gudang'
  })

  showAdjustModal.value = false
  toast.success('Penyesuaian Stok Disimpan', `Saldo ${item.name} diperbarui menjadi ${item.stock} ${item.uom} (Selisih: ${diff >= 0 ? '+' : ''}${diff})`)
}
</script>
