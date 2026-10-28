<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Pengiriman & BAST</h1>
        <p class="page-subtitle">Antrean panel siap kirim, Surat Jalan, dan Berita Acara Serah Terima (Spesifikasi §8.4)</p>
      </div>
      <div></div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="del-chain-hint">
      ℹ️ Surat Jalan hanya dibuat untuk panel yang <strong>FAT Lulus</strong> (gate G11). BAST diterbitkan dari Surat Jalan berstatus Diterima dan memicu termin BAST_SIGNED.
    </div>

    <!-- KPI -->
    <div class="grid-3" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-siap-kirim">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">📦</div>
        <div class="stat-value text-warning">{{ readyToShip.length }}</div>
        <div class="stat-label">Panel Siap Kirim (FAT Lulus)</div>
      </div>
      <div class="stat-card" id="stat-surat-jalan">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">🚚</div>
        <div class="stat-value">{{ deliveryNotes.length }}</div>
        <div class="stat-label">Surat Jalan</div>
      </div>
      <div class="stat-card" id="stat-bast">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ deliveryNotes.filter(d => d.bastSigned).length }}</div>
        <div class="stat-label">BAST Ditandatangani</div>
      </div>
    </div>

    <!-- Antrean Siap Kirim -->
    <div class="card" id="ship-queue-card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="font-semibold">🏁 Antrean "Siap Kirim"</div>
        <span class="badge badge-warning" id="ship-queue-count">{{ readyToShip.length }} panel</span>
      </div>
      <div v-if="readyToShip.length" class="table-container" style="border: none;">
        <table class="table" id="ship-queue-table">
          <thead>
            <tr>
              <th>Panel</th>
              <th>Proyek</th>
              <th>Nomor Seri</th>
              <th>Hasil FAT</th>
              <th>Punch List Kritis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in readyToShip" :key="p.id" :id="`row-ship-queue-${p.id}`">
              <td class="font-semibold text-primary">{{ p.id }}</td>
              <td><span class="badge badge-primary text-xs">{{ p.project }}</span></td>
              <td class="mono text-xs text-accent">{{ p.serial }}</td>
              <td><span class="badge badge-success">{{ p.fatResult }}</span></td>
              <td>
                <span v-if="p.criticalPunchlist" class="badge badge-danger">🔒 {{ p.punchlistNote }}</span>
                <span v-else class="badge badge-success">✓ Selesai</span>
              </td>
              <td>
                <button
                  class="btn btn-primary btn-sm"
                  :id="`btn-create-sj-${p.id}`"
                  :disabled="p.criticalPunchlist"
                  :title="p.criticalPunchlist ? 'Punch list kritis belum selesai (G11)' : undefined"
                  @click="createDeliveryNote(p)"
                >Buat Surat Jalan</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state" style="padding: 20px;">
        <div class="empty-state-title">Tidak ada panel menunggu kirim</div>
      </div>
    </div>

    <!-- Daftar Surat Jalan -->
    <div class="card" id="sj-table-card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="font-semibold">🚚 Surat Jalan</div>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="sj-table">
          <thead>
            <tr>
              <th>No. Surat Jalan</th>
              <th>Proyek</th>
              <th>Panels</th>
              <th>Tanggal Kirim</th>
              <th>Penerima</th>
              <th>Status</th>
              <th>BAST</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in deliveryNotes" :key="d.id" :id="`row-sj-${d.id}`">
              <td><span class="mono text-sm font-semibold text-accent">{{ d.id }}</span></td>
              <td><span class="badge badge-primary text-xs">{{ d.project }}</span></td>
              <td class="text-secondary text-sm">{{ d.panels.join(', ') }}</td>
              <td class="text-secondary text-sm">{{ formatDate(d.shipDate) }}</td>
              <td class="text-secondary text-sm">{{ d.receivedBy || '—' }}</td>
              <td>
                <span :class="['badge', d.status === 'DITERIMA' ? 'badge-success' : d.status === 'DIKIRIM' ? 'badge-primary' : 'badge-neutral']">{{ d.status }}</span>
              </td>
              <td>
                <span v-if="d.bastSigned" class="badge badge-success">✓ {{ d.bastNo }}</span>
                <span v-else class="text-tertiary text-xs">—</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button v-if="d.status === 'DRAFT'" class="btn btn-secondary btn-sm" :id="`sj-ship-${d.id}`" @click="markShipped(d)">Kirim</button>
                  <button v-if="d.status === 'DIKIRIM'" class="btn btn-secondary btn-sm" :id="`sj-receive-${d.id}`" @click="markReceived(d)">Terima</button>
                  <button v-if="d.status === 'DITERIMA' && !d.bastSigned" class="btn btn-primary btn-sm" :id="`sj-bast-${d.id}`" @click="signBAST(d)">✍ Tanda Tangan BAST</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatDate } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

type ShipPanel = {
  id: string; project: string; serial: string
  fatResult: 'LULUS' | 'LULUS_DENGAN_CATATAN'
  criticalPunchlist: boolean; punchlistNote: string
}

const readyToShip = ref<ShipPanel[]>([
  { id: 'PRJ-2026-001-P01', project: 'PRJ-2026-001', serial: 'SN-LVMDP01-2026', fatResult: 'LULUS', criticalPunchlist: false, punchlistNote: '' },
  { id: 'PRJ-2026-001-P02', project: 'PRJ-2026-001', serial: 'SN-LVMDP02-2026', fatResult: 'LULUS_DENGAN_CATATAN', criticalPunchlist: true, punchlistNote: 'Pintu bawah belum dicat ulang' },
  { id: 'PRJ-2026-003-P01', project: 'PRJ-2026-003', serial: 'SN-MCCA1-2026', fatResult: 'LULUS', criticalPunchlist: false, punchlistNote: '' },
])

type DeliveryNote = {
  id: string; project: string; panels: string[]
  shipDate: string; receivedBy: string
  status: 'DRAFT' | 'DIKIRIM' | 'DITERIMA'
  bastSigned: boolean; bastNo: string
}

const deliveryNotes = ref<DeliveryNote[]>([
  { id: 'SJ-2026-021', project: 'PRJ-2026-001', panels: ['PRJ-2026-001-P01'], shipDate: '2026-10-08', receivedBy: 'Ir. Bambang (Klien)', status: 'DITERIMA', bastSigned: false, bastNo: '' },
  { id: 'SJ-2026-018', project: 'PRJ-2026-003', panels: ['PRJ-2026-003-P01', 'PRJ-2026-003-P02'], shipDate: '2026-09-22', receivedBy: 'Site Engineer Tjiwi', status: 'DITERIMA', bastSigned: true, bastNo: 'BAST-2026-014' },
])

let sjSeq = 22
let bastSeq = 15

const createDeliveryNote = (p: ShipPanel) => {
  if (p.criticalPunchlist) {
    toast.error('Ditolak (G11)', 'Punch list kritis belum selesai — hanya panel lulus FAT dengan punch list selesai yang dapat dikirim.')
    return
  }
  const newSJ: DeliveryNote = {
    id: `SJ-2026-0${sjSeq++}`,
    project: p.project,
    panels: [p.id],
    shipDate: new Date().toISOString().split('T')[0],
    receivedBy: '',
    status: 'DRAFT',
    bastSigned: false,
    bastNo: ''
  }
  deliveryNotes.value.unshift(newSJ)
  readyToShip.value = readyToShip.value.filter(x => x.id !== p.id)
  toast.success('Surat Jalan Dibuat', `${newSJ.id} untuk panel ${p.id} siap dikirim.`)
}

const markShipped = (d: DeliveryNote) => {
  d.status = 'DIKIRIM'
  toast.info('Pengiriman Dicatat', `${d.id} sedang dalam perjalanan.`)
}

const markReceived = (d: DeliveryNote) => {
  d.status = 'DITERIMA'
  if (!d.receivedBy) d.receivedBy = 'Penerima di lokasi proyek'
  toast.success('Barang Diterima Klien', `${d.id} diterima. Lanjutkan penandatanganan BAST.`)
}

const signBAST = (d: DeliveryNote) => {
  d.bastSigned = true
  d.bastNo = `BAST-2026-0${bastSeq++}`
  toast.success('BAST Ditandatangani', `${d.bastNo} terbit — termin BAST_SIGNED siap ditagih dan masa garansi dimulai.`)
}
</script>
