<template>
  <div class="item-master">
    <div class="page-header">
      <div>
        <h1 class="page-title">Item Master</h1>
        <p class="page-subtitle">Kelola seluruh komponen, material, dan kabel yang digunakan</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-import-items" @click="importExcel">📥 Import Excel</button>
        <button class="btn btn-primary btn-sm" id="btn-add-item" @click="openAdd">+ Tambah Item</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
      <div class="flex gap-3 flex-wrap items-center">
        <div class="input-with-icon flex-1" style="min-width: 240px;">
          <span class="input-icon">🔍</span>
          <input type="text" class="input" placeholder="Cari kode, nama, merek, tipe..." v-model="search" id="search-items" />
        </div>
        <select class="select" style="width: 160px;" v-model="filterCategory" id="filter-category">
          <option value="">Semua Kategori</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select class="select" style="width: 160px;" v-model="filterTracking" id="filter-tracking">
          <option value="">Semua Tracking</option>
          <option value="serial">Serial Number</option>
          <option value="lot">Lot Number</option>
          <option value="none">Tanpa Tracking</option>
        </select>
        <select class="select" style="width: 140px;" v-model="filterStatus" id="filter-status">
          <option value="">Semua Status</option>
          <option value="Aktif">Aktif</option>
          <option value="Obsolete">Obsolete</option>
        </select>
        <div class="flex gap-1">
          <button class="btn btn-icon btn-secondary btn-sm" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'" id="btn-view-table">⊟</button>
          <button class="btn btn-icon btn-secondary btn-sm" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'" id="btn-view-card">⊞</button>
        </div>
      </div>
    </div>

    <!-- Summary Badges -->
    <div class="flex gap-3 flex-wrap" style="margin-bottom: 16px;">
      <div class="summary-chip" id="chip-total">
        <span class="chip-value">{{ filteredItems.length }}</span>
        <span class="chip-label">Total Item</span>
      </div>
      <div class="summary-chip" id="chip-active">
        <span class="chip-value text-success">{{ filteredItems.filter(i => i.status === 'Aktif').length }}</span>
        <span class="chip-label">Aktif</span>
      </div>
      <div class="summary-chip" id="chip-low-stock">
        <span class="chip-value text-warning">{{ lowStockItems.length }}</span>
        <span class="chip-label">Stok Rendah</span>
      </div>
      <div class="summary-chip" id="chip-serial">
        <span class="chip-value text-accent">{{ filteredItems.filter(i => i.tracking === 'serial').length }}</span>
        <span class="chip-label">Tracked Serial</span>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="card bulk-bar" v-if="selected.length" id="bulk-actions">
      <span class="text-sm font-medium">{{ selected.length }} item dipilih</span>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" id="btn-bulk-clear" @click="selected = []">Batalkan Pilihan</button>
        <button class="btn btn-danger btn-sm" id="btn-bulk-obsolete" @click="bulkObsolete">Tandai Obsolete</button>
      </div>
    </div>

    <!-- Table View -->
    <div class="card" v-if="viewMode === 'table'" id="item-table-container">
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="items-table">
          <thead>
            <tr>
              <th style="width: 40px;"><input type="checkbox" @change="toggleAll" :checked="allSelected" /></th>
              <th>Kode Item</th>
              <th>Nama / Deskripsi</th>
              <th>Kategori</th>
              <th>Merek / Tipe</th>
              <th>UoM</th>
              <th>Stok</th>
              <th>Harga Satuan</th>
              <th>Tracking</th>
              <th>Status</th>
              <th style="width: 80px;"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedItems" :key="item.id" @click="openItem(item)" :id="`row-item-${item.id}`">
              <td @click.stop><input type="checkbox" v-model="selected" :value="item.id" :aria-label="`Pilih ${item.name}`" /></td>
              <td>
                <span class="mono text-xs badge badge-neutral">{{ item.code }}</span>
              </td>
              <td>
                <div class="font-medium text-primary">{{ item.name }}</div>
              </td>
              <td><span class="text-secondary text-sm">{{ item.category }}</span></td>
              <td>
                <div class="text-sm font-medium">{{ item.brand }}</div>
                <div class="text-xs text-tertiary">{{ item.type }}</div>
              </td>
              <td><span class="badge badge-neutral">{{ item.uom }}</span></td>
              <td>
                <div :class="['font-semibold text-sm', item.stock <= item.reorder ? 'text-warning' : 'text-primary']">
                  {{ item.stock.toLocaleString() }}
                </div>
                <div class="text-xs text-tertiary">Min: {{ item.reorder }}</div>
              </td>
              <td>
                <span class="font-medium text-sm">{{ formatPrice(item.unit_price) }}</span>
              </td>
              <td>
                <span :class="['badge', trackingBadge(item.tracking)]">{{ trackingLabel(item.tracking) }}</span>
              </td>
              <td>
                <span :class="['badge', item.status === 'Aktif' ? 'badge-success' : 'badge-neutral']">{{ item.status }}</span>
              </td>
              <td @click.stop>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" @click="openItem(item)" :id="`edit-item-${item.id}`" :aria-label="`Ubah ${item.name}`" data-tooltip="Ubah Item">✏️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer flex items-center justify-between">
        <span class="text-sm text-tertiary">
          Menampilkan {{ pageStart }}–{{ pageEnd }} dari {{ filteredItems.length }} item
        </span>
        <div class="flex gap-2 items-center">
          <button class="btn btn-secondary btn-sm" id="btn-prev-page" :disabled="page <= 1" @click="page--">← Prev</button>
          <span class="text-sm">Hal {{ page }} / {{ totalPages }}</span>
          <button class="btn btn-secondary btn-sm" id="btn-next-page" :disabled="page >= totalPages" @click="page++">Next →</button>
        </div>
      </div>
    </div>

    <!-- Card View -->
    <div v-if="viewMode === 'card'" id="item-card-container">
      <div class="grid-4">
        <div v-for="item in pagedItems" :key="item.id" class="card card-hover item-card"
             @click="openItem(item)" :id="`card-item-${item.id}`">
        <div class="card-body">
          <div class="flex justify-between items-start" style="margin-bottom: 12px;">
            <span :class="['badge', item.status === 'Aktif' ? 'badge-success' : 'badge-neutral']">{{ item.status }}</span>
            <span :class="['badge', trackingBadge(item.tracking)]">{{ trackingLabel(item.tracking) }}</span>
          </div>
          <div class="mono text-xs text-tertiary" style="margin-bottom: 4px;">{{ item.code }}</div>
          <div class="font-semibold text-md" style="margin-bottom: 4px; line-height: 1.3;">{{ item.name }}</div>
          <div class="text-xs text-tertiary" style="margin-bottom: 12px;">{{ item.brand }} · {{ item.type }}</div>
          <div class="flex justify-between items-end">
            <div>
              <div class="text-xs text-tertiary">Stok</div>
              <div :class="['text-lg font-bold', item.stock <= item.reorder ? 'text-warning' : 'text-primary']">
                {{ item.stock.toLocaleString() }} <span class="text-xs font-normal text-tertiary">{{ item.uom }}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-tertiary">Harga</div>
              <div class="text-sm font-semibold text-accent">{{ formatPrice(item.unit_price) }}</div>
            </div>
          </div>
          <div class="progress-bar" style="margin-top: 10px;">
            <div class="progress-fill" :class="item.stock <= item.reorder ? 'warning' : ''"
                 :style="`width: ${Math.min(100, (item.stock / (item.reorder * 3)) * 100)}%`"></div>
          </div>
        </div>
      </div>
      </div>
      <div class="card" style="margin-top: 16px;">
        <div class="card-footer flex items-center justify-between">
          <span class="text-sm text-tertiary">
            Menampilkan {{ pageStart }}–{{ pageEnd }} dari {{ filteredItems.length }} item
          </span>
          <div class="flex gap-2 items-center">
            <button class="btn btn-secondary btn-sm" id="btn-prev-page-card" :disabled="page <= 1" @click="page--">← Prev</button>
            <span class="text-sm">Hal {{ page }} / {{ totalPages }}</span>
            <button class="btn btn-secondary btn-sm" id="btn-next-page-card" :disabled="page >= totalPages" @click="page++">Next →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Item Modal -->
    <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false" id="modal-add-item">
      <div class="modal" style="max-width: 700px;">
        <div class="modal-header">
          <span class="font-semibold text-lg">{{ editingId ? 'Ubah Item' : 'Tambah Item Baru' }}</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showAddModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="grid-2" style="gap: 16px;">
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label">Kode Item *</label>
              <input type="text" class="input mono" placeholder="CB-ACB-4P-1600A" id="input-item-code"
                     v-model="form.code" />
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label">Nama / Deskripsi *</label>
              <input type="text" class="input" placeholder="Air Circuit Breaker 4 Pole 1600A" id="input-item-name"
                     v-model="form.name" />
            </div>
            <div class="input-group">
              <label class="input-label">Kategori *</label>
              <select class="select" id="input-item-category" v-model="form.category">
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">UoM Dasar *</label>
              <select class="select" id="input-item-uom" v-model="form.uom">
                <option v-for="u in uoms" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Merek</label>
              <input type="text" class="input" placeholder="Schneider Electric" id="input-item-brand"
                     v-model="form.brand" />
            </div>
            <div class="input-group">
              <label class="input-label">Tipe / Model</label>
              <input type="text" class="input" placeholder="Masterpact NW16H1" id="input-item-type"
                     v-model="form.type" />
            </div>
            <div class="input-group">
              <label class="input-label">Harga Estimasi (Rp)</label>
              <input type="number" min="0" class="input" placeholder="45000000" id="input-item-price"
                     v-model.number="form.unit_price" />
            </div>
            <div class="input-group">
              <label class="input-label">Lead Time Pengadaan (hari)</label>
              <input type="number" min="0" class="input" placeholder="45" id="input-item-leadtime"
                     v-model.number="form.lead_time_days" />
              <span class="text-xs text-tertiary">≥ 45 hari dianggap kandidat long-lead di BOM</span>
            </div>
            <div class="input-group">
              <label class="input-label">Tracking</label>
              <select class="select" id="input-item-tracking" v-model="form.tracking">
                <option value="none">Tanpa Tracking</option>
                <option value="lot">Lot Number</option>
                <option value="serial">Serial Number</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Stok {{ editingId ? 'Saat Ini' : 'Awal' }}</label>
              <input type="number" min="0" class="input" placeholder="0" id="input-item-stock"
                     v-model.number="form.stock" />
            </div>
            <div class="input-group">
              <label class="input-label">Minimum Reorder</label>
              <input type="number" min="0" class="input" placeholder="0" id="input-item-reorder"
                     v-model.number="form.reorder" />
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label">Catatan / Spesifikasi Teknis</label>
              <textarea class="input" rows="3" placeholder="Spesifikasi, catatan khusus..." id="input-item-notes"
                        v-model="form.notes" style="height: auto; padding: 10px;"></textarea>
            </div>
          </div>
          <div v-if="formError" class="alert alert-danger" style="margin-top: 12px;" id="item-form-error">
            <span>⚠️</span><div>{{ formError }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddModal = false" id="btn-cancel-item">Batal</button>
          <button class="btn btn-primary" id="btn-save-item" @click="save"
                  :disabled="!form.code.trim() || !form.name.trim()">
            {{ editingId ? 'Simpan Perubahan' : 'Simpan Item' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  items, itemCategories, itemUoms, saveItem, setItemStatus,
  type ItemMaster, type ItemTracking,
} from '../../data/itemStore'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const allItems = items
const search = ref('')
const filterCategory = ref('')
const filterTracking = ref('')
const filterStatus = ref('')
const viewMode = ref<'table'|'card'>('table')
const showAddModal = ref(false)
const selected = ref<string[]>([])

const categories = itemCategories
const uoms = itemUoms
const lowStockItems = computed(() => allItems.value.filter(i => i.stock <= i.reorder))

const filteredItems = computed(() => allItems.value.filter(item => {
  const q = search.value.toLowerCase()
  const matchSearch = !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q)
  const matchCat = !filterCategory.value || item.category === filterCategory.value
  const matchTrack = !filterTracking.value || item.tracking === filterTracking.value
  const matchStatus = !filterStatus.value || item.status === filterStatus.value
  return matchSearch && matchCat && matchTrack && matchStatus
}))

// ─── Pagination nyata ────────────────────────────────────────────────────────
const pageSize = 15
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)))
const pageStart = computed(() => (filteredItems.value.length === 0) ? 0 : (page.value - 1) * pageSize + 1)
const pageEnd = computed(() => Math.min(page.value * pageSize, filteredItems.value.length))
const pagedItems = computed(() => filteredItems.value.slice(pageStart.value - 1, pageEnd.value))

watch([search, filterCategory, filterTracking, filterStatus], () => { page.value = 1 })
watch(totalPages, (max) => { if (page.value > max) page.value = max })

const allSelected = computed(() =>
  pagedItems.value.length > 0 && pagedItems.value.every(i => selected.value.includes(i.id)))

const toggleAll = () => {
  const pageIds = pagedItems.value.map(i => i.id)
  if (allSelected.value) selected.value = selected.value.filter(id => !pageIds.includes(id))
  else selected.value = [...new Set([...selected.value, ...pageIds])]
}

const bulkObsolete = () => {
  const count = setItemStatus([...selected.value], 'Obsolete')
  selected.value = []
  toast.warning('Item Ditandai Obsolete', `${count} item tidak lagi dipakai untuk BOM & pengadaan baru`)
}

// ─── Form tambah / ubah item (PRD §4.1) ─────────────────────────────────────
interface ItemForm {
  code: string
  name: string
  category: string
  uom: string
  brand: string
  type: string
  unit_price: number
  stock: number
  reorder: number
  tracking: ItemTracking
  lead_time_days: number
  notes: string
}

const emptyForm = (): ItemForm => ({
  code: '', name: '', category: itemCategories[0], uom: 'PCS',
  brand: '', type: '', unit_price: 0, stock: 0, reorder: 0,
  tracking: 'none', lead_time_days: 14, notes: '',
})

const editingId = ref<string | null>(null)
const form = ref<ItemForm>(emptyForm())
const formError = ref('')

const openAdd = () => {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showAddModal.value = true
}

const openItem = (item: ItemMaster) => {
  editingId.value = item.id
  form.value = {
    code: item.code, name: item.name, category: item.category, uom: item.uom,
    brand: item.brand, type: item.type, unit_price: item.unit_price,
    stock: item.stock, reorder: item.reorder, tracking: item.tracking,
    lead_time_days: item.lead_time_days, notes: item.notes || '',
  }
  formError.value = ''
  showAddModal.value = true
}

const save = () => {
  const res = saveItem({ ...form.value }, editingId.value ?? undefined)
  if (res.ok) {
    showAddModal.value = false
    formError.value = ''
  } else {
    formError.value = res.message
    toast.error('Item Tidak Tersimpan', res.message)
  }
}

const importExcel = () => {
  toast.info('Import Excel', 'Belum tersedia di prototipe — gunakan tombol + Tambah Item, atau impor CSV dari halaman BOM.')
}

const trackingLabel = (t: string) => ({ none: 'Tidak', lot: 'Lot', serial: 'Serial' }[t] || t)
const trackingBadge = (t: string) => ({ none: 'badge-neutral', lot: 'badge-info', serial: 'badge-primary' }[t] || 'badge-neutral')

const formatPrice = (v: number) => {
  if (v >= 1_000_000) return `Rp ${(v/1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `Rp ${(v/1_000).toFixed(0)}rb`
  return `Rp ${v.toLocaleString()}`
}
</script>

<style scoped>
.item-card { cursor: pointer; }
.summary-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
}
.chip-value { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
.chip-label { font-size: var(--text-xs); color: var(--text-tertiary); }
.btn.active { background: var(--primary-700); color: #ffffff; border-color: var(--primary-500); }
.bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  margin-bottom: 16px;
  border-color: var(--primary-500);
  background: var(--tint-primary-bg);
}
</style>
