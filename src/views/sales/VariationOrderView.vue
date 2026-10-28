<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Variation Order</h1>
        <p class="page-subtitle">Perubahan lingkup, qty, atau harga setelah SO Confirmed — lintas proyek (Spesifikasi §8.7)</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-primary btn-sm" id="btn-new-vo" @click="showVOModal = true">+ Ajukan VO dari SO</button>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="vo-chain-hint">
      ℹ️ VO adalah <strong>satu-satunya cara</strong> mengubah lingkup/qty/harga setelah SO Confirmed. Dibuat dari SO, disetujui klien, lalu diterapkan (gate G14).
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-vo-total">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">🔄</div>
        <div class="stat-value">{{ vos.length }}</div>
        <div class="stat-label">Total VO</div>
      </div>
      <div class="stat-card" id="stat-vo-pending">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⏳</div>
        <div class="stat-value text-warning">{{ pendingVOs }}</div>
        <div class="stat-label">Menunggu Persetujuan</div>
      </div>
      <div class="stat-card" id="stat-vo-applied">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ appliedVOs }}</div>
        <div class="stat-label">Diterapkan</div>
      </div>
      <div class="stat-card" id="stat-vo-value">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">💰</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(totalDelta) }}</div>
        <div class="stat-label">Selisih Nilai Kontrak (VO Diterapkan)</div>
      </div>
    </div>

    <!-- Table -->
    <div class="card" id="vo-table-card">
      <div class="card-header">
        <div class="font-semibold">Daftar Variation Order</div>
        <div class="flex gap-2">
          <select class="select" style="width: 180px;" v-model="filterStatus" id="filter-vo-status">
            <option value="">Semua Status</option>
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'" @click="filterMine = !filterMine" id="filter-vo-mine">⏳ Menunggu Tindakan Saya</button>
        </div>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="vo-table">
          <thead>
            <tr>
              <th>No. VO</th>
              <th>Sumber SO</th>
              <th>Proyek</th>
              <th>Alasan</th>
              <th>Jenis Perubahan</th>
              <th>Selisih Harga</th>
              <th>Selisih Jadwal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vo in filteredVOs" :key="vo.id" :id="`row-vo-${vo.id}`">
              <td><span class="mono text-sm font-semibold text-accent">{{ vo.id }}</span></td>
              <td><span class="badge badge-neutral text-xs">{{ vo.soNo }}</span></td>
              <td><span class="badge badge-primary text-xs">{{ vo.project }}</span></td>
              <td class="text-secondary text-sm" style="max-width: 220px;"><div class="truncate">{{ vo.reason }}</div></td>
              <td><span class="badge badge-info text-xs">{{ vo.changeType }}</span></td>
              <td class="font-semibold" :class="vo.priceDelta >= 0 ? 'text-success' : 'text-danger'">
                {{ vo.priceDelta >= 0 ? '+' : '' }}{{ formatCurrency(vo.priceDelta) }}
              </td>
              <td class="text-secondary text-sm">{{ vo.scheduleDelta }}</td>
              <td><span :class="['badge', statusBadge(vo.status)]">{{ vo.status }}</span></td>
              <td>
                <div class="flex gap-1">
                  <button
                    v-if="vo.status === 'DISETUJUI'"
                    class="btn btn-primary btn-sm"
                    :id="`vo-apply-${vo.id}`"
                    @click="applyVO(vo)"
                  >Terapkan</button>
                  <button v-else class="btn btn-icon btn-secondary btn-sm" :id="`vo-view-${vo.id}`" data-tooltip="Detail">👁️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Ajukan VO -->
    <div class="modal-overlay" v-if="showVOModal" @click.self="showVOModal = false" id="modal-new-vo">
      <div class="modal" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Ajukan Variation Order</span>
            <div class="text-xs text-tertiary">Perubahan lingkup/qty/harga setelah SO Confirmed (Spesifikasi §8.7)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showVOModal = false">✕</button>
        </div>
        <form @submit.prevent="submitVO">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-vo-so">Sumber Sales Order *</label>
                <select class="select" id="input-vo-so" v-model="voForm.soNo" required>
                  <option value="" disabled>Pilih SO (Confirmed/Berjalan)...</option>
                  <option v-for="so in soOptions" :key="so.no" :value="so.no">{{ so.no }} — {{ so.project }} ({{ so.customer }})</option>
                </select>
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-vo-reason">Alasan Perubahan *</label>
                <textarea class="input" rows="2" id="input-vo-reason" v-model="voForm.reason" placeholder="Contoh: Klien menambah 1 feeder MCC sesuai addendum kontrak..." style="height:auto;padding:10px;" required></textarea>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-vo-type">Jenis Perubahan *</label>
                <select class="select" id="input-vo-type" v-model="voForm.changeType" required>
                  <option>Tambah Panel</option>
                  <option>Ubah Spesifikasi</option>
                  <option>Hapus Item</option>
                  <option>Perubahan Jadwal</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-vo-delta">Selisih Harga (Rp) *</label>
                <input type="number" class="input font-semibold" id="input-vo-delta" v-model.number="voForm.priceDelta" step="1000000" required />
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-vo-sched">Selisih Jadwal</label>
                <input type="text" class="input" id="input-vo-sched" v-model="voForm.scheduleDelta" placeholder="Contoh: +2 minggu pengiriman" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showVOModal = false" id="btn-cancel-vo">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-vo">Ajukan VO</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatCurrency } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

type VOStatus = 'DRAFT' | 'MENUNGGU_APPROVAL_INTERNAL' | 'DIKIRIM_KLIEN' | 'DISETUJUI' | 'DITERAPKAN' | 'DITOLAK' | 'DIBATALKAN'

type VariationOrder = {
  id: string; soNo: string; project: string; reason: string
  changeType: string; priceDelta: number; scheduleDelta: string; status: VOStatus
}

const vos = ref<VariationOrder[]>([
  { id: 'SO-2026-018-VO01', soNo: 'SO-2026-018', project: 'PRJ-2026-001', reason: 'Klien menambah feeder MCC cadangan', changeType: 'Tambah Panel', priceDelta: 450_000_000, scheduleDelta: '+2 minggu', status: 'DISETUJUI' },
  { id: 'SO-2026-018-VO02', soNo: 'SO-2026-018', project: 'PRJ-2026-001', reason: 'Penyesuaian rating ACB incomer ke 2000A', changeType: 'Ubah Spesifikasi', priceDelta: 180_000_000, scheduleDelta: '+1 minggu', status: 'DIKIRIM_KLIEN' },
  { id: 'SO-2026-011-VO01', soNo: 'SO-2026-011', project: 'PRJ-2026-003', reason: 'Pengurangan 1 unit SDP sesuai addendum', changeType: 'Hapus Item', priceDelta: -125_000_000, scheduleDelta: '-', status: 'DITERAPKAN' },
  { id: 'SO-2026-014-VO01', soNo: 'SO-2026-014', project: 'PRJ-2026-002', reason: 'Draft internal, menunggu kelengkapan data', changeType: 'Perubahan Jadwal', priceDelta: 0, scheduleDelta: '+3 minggu', status: 'DRAFT' },
])

const statusOptions: VOStatus[] = ['DRAFT', 'MENUNGGU_APPROVAL_INTERNAL', 'DIKIRIM_KLIEN', 'DISETUJUI', 'DITERAPKAN', 'DITOLAK', 'DIBATALKAN']

const filterStatus = ref('')
const filterMine = ref(false)
const showVOModal = ref(false)

const soOptions = [
  { no: 'SO-2026-018', project: 'PRJ-2026-001', customer: 'PT. Semen Indonesia' },
  { no: 'SO-2026-011', project: 'PRJ-2026-003', customer: 'PT. Tjiwi Kimia' },
  { no: 'SO-2026-014', project: 'PRJ-2026-002', customer: 'PT. PLN (Persero)' },
]

const voForm = ref({
  soNo: '',
  reason: '',
  changeType: 'Tambah Panel',
  priceDelta: 0,
  scheduleDelta: ''
})

const pendingVOs = computed(() => vos.value.filter(v => ['DRAFT', 'MENUNGGU_APPROVAL_INTERNAL', 'DIKIRIM_KLIEN', 'DISETUJUI'].includes(v.status)).length)
const appliedVOs = computed(() => vos.value.filter(v => v.status === 'DITERAPKAN').length)
const totalDelta = computed(() => vos.value.filter(v => v.status === 'DITERAPKAN').reduce((a, v) => a + v.priceDelta, 0))

const filteredVOs = computed(() => {
  return vos.value.filter(v => {
    const matchStatus = !filterStatus.value || v.status === filterStatus.value
    const matchMine = !filterMine.value || v.status === 'DISETUJUI' || v.status === 'DRAFT'
    return matchStatus && matchMine
  })
})

const statusBadge = (s: VOStatus) => {
  if (s === 'DITERAPKAN') return 'badge-success'
  if (s === 'DISETUJUI') return 'badge-primary'
  if (s === 'DITOLAK' || s === 'DIBATALKAN') return 'badge-danger'
  if (s === 'DRAFT') return 'badge-neutral'
  return 'badge-warning'
}

let voSeq = 3

const submitVO = () => {
  const so = soOptions.find(s => s.no === voForm.value.soNo)
  if (!so || !voForm.value.reason) return

  const newVO: VariationOrder = {
    id: `${so.no}-VO0${voSeq++}`,
    soNo: so.no,
    project: so.project,
    reason: voForm.value.reason,
    changeType: voForm.value.changeType,
    priceDelta: voForm.value.priceDelta,
    scheduleDelta: voForm.value.scheduleDelta || '-',
    status: 'DRAFT'
  }
  vos.value.unshift(newVO)
  showVOModal.value = false
  voForm.value = { soNo: '', reason: '', changeType: 'Tambah Panel', priceDelta: 0, scheduleDelta: '' }
  toast.success('VO Dibuat', `${newVO.id} dibuat dari ${so.no}. Lengkapi dan ajukan untuk approval internal.`)
}

const applyVO = (vo: VariationOrder) => {
  if (vo.status !== 'DISETUJUI') {
    toast.error('Ditolak (G14)', 'Variation Order belum disetujui klien.')
    return
  }
  vo.status = 'DITERAPKAN'
  toast.success('VO Diterapkan', `${vo.id} diterapkan — nilai kontrak diperbarui, panel terdampak mendapat tugas BOM Rev baru, termin diperbarui.`)
}
</script>
