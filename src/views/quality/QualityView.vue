<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Quality Control</h1>
        <p class="page-subtitle">Kelola IQC, NCR, FAT, dan BAST — pastikan panel sesuai standar (PRD M8 §4.7)</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-export-qc">📊 Export QC</button>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="qc-chain-hint">
      ℹ️ IQC dibuat dari baris GRN berflag, FAT dibuat dari WO selesai ("Mulai FAT"), dan NCR dibuat dari butir pemeriksaan yang gagal — tidak ada tombol pembuatan mandiri.
    </div>

    <!-- KPI Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-ncr-open">
        <div class="stat-icon" style="background: rgba(239,68,68,0.15);">🚨</div>
        <div class="stat-value text-danger">{{ openNCRs.length }}</div>
        <div class="stat-label">NCR Open (Perlu Disposisi)</div>
        <div class="stat-trend trend-down" v-if="openNCRs.length > 0">▼ Perlu tindakan segera</div>
      </div>
      <div class="stat-card" id="stat-iqc-pending">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">🔍</div>
        <div class="stat-value text-warning">{{ iqcRecords.length }}</div>
        <div class="stat-label">Total Uji IQC Material</div>
      </div>
      <div class="stat-card" id="stat-fat-planned">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">🎯</div>
        <div class="stat-value text-success">{{ fatPlans.length }}</div>
        <div class="stat-label">FAT Dijadwalkan</div>
      </div>
      <div class="stat-card" id="stat-first-pass">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">📈</div>
        <div class="stat-value">91.2%</div>
        <div class="stat-label">First-Pass Quality Rate</div>
        <div class="stat-trend trend-up">▲ Target 95%</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px; display: inline-flex; width: auto;">
      <button :class="['tab-btn', activeTab === 'ncr' && 'active']" @click="activeTab = 'ncr'" id="tab-ncr">NCR (Non-Conformance)</button>
      <button :class="['tab-btn', activeTab === 'iqc' && 'active']" @click="activeTab = 'iqc'" id="tab-iqc">IQC Material Masuk</button>
      <button :class="['tab-btn', activeTab === 'fat' && 'active']" @click="activeTab = 'fat'" id="tab-fat">FAT & BAST Pengujian</button>
    </div>

    <!-- NCR Tab -->
    <div v-if="activeTab === 'ncr'" id="ncr-section">
      <div class="card" id="ncr-table-card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="font-semibold">Non-Conformance Reports (Laporan Ketidaksesuaian)</span>
            <span class="text-xs text-tertiary">Dibuat dari butir pemeriksaan FAT/IPQC yang gagal</span>
          </div>
          <div class="flex gap-2">
            <select class="select" style="width: 140px;" v-model="ncrFilter" id="filter-ncr-status">
              <option value="">Semua Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table table-clickable" id="ncr-table">
            <thead>
              <tr>
                <th>No. NCR</th>
                <th>Proyek</th>
                <th>Panel</th>
                <th>Tipe Cacat</th>
                <th>Deskripsi</th>
                <th>Severity</th>
                <th>Ditemukan Oleh</th>
                <th>Tanggal</th>
                <th>Disposisi</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ncr in filteredNCRs" :key="ncr.id" :id="`row-ncr-${ncr.id}`">
                <td><div class="mono text-sm font-semibold text-accent">{{ ncr.id }}</div></td>
                <td><span class="badge badge-primary text-xs">{{ ncr.project }}</span></td>
                <td class="font-medium text-primary text-sm">{{ ncr.panel }}</td>
                <td class="text-secondary text-sm">{{ ncr.type }}</td>
                <td class="text-secondary text-sm" style="max-width: 200px;"><div class="truncate">{{ ncr.description }}</div></td>
                <td>
                  <span :class="['badge', ncr.severity === 'Major' ? 'badge-danger' : ncr.severity === 'Critical' ? 'badge-danger font-bold' : 'badge-warning']">
                    {{ ncr.severity }}
                  </span>
                </td>
                <td class="text-secondary text-sm">{{ ncr.foundBy }}</td>
                <td class="text-secondary text-sm">{{ formatDate(ncr.foundDate) }}</td>
                <td>
                  <span v-if="ncr.disposisi" :class="['badge', ncr.disposisi === 'Rework' ? 'badge-warning' : 'badge-neutral']">{{ ncr.disposisi }}</span>
                  <span v-else class="text-tertiary text-xs">Menunggu</span>
                </td>
                <td>
                  <span :class="['badge', ncr.status === 'Closed' ? 'badge-success' : 'badge-danger']">{{ ncr.status }}</span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-icon btn-secondary btn-sm" :id="`ncr-photo-${ncr.id}`" data-tooltip="Foto Bukti">📷</button>
                    <button class="btn btn-icon btn-secondary btn-sm" :id="`ncr-disposisi-${ncr.id}`" @click="openDispositionModal(ncr)" data-tooltip="Tentukan Disposisi">✅</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- IQC Tab -->
    <div v-if="activeTab === 'iqc'" id="iqc-section">
      <div class="card" id="iqc-table-card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="font-semibold">Incoming Quality Control (IQC) — Inspeksi Material Masuk</span>
            <span class="text-xs text-tertiary">Dibuat otomatis dari baris GRN berflag</span>
          </div>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table" id="iqc-table">
            <thead>
              <tr>
                <th>No. IQC</th>
                <th>Ref GRN</th>
                <th>Item</th>
                <th>Qty Terima</th>
                <th>Qty Inspeksi</th>
                <th>Pass</th>
                <th>Fail</th>
                <th>Hasil</th>
                <th>Inspeksi Oleh</th>
                <th>Tanggal</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="iqc in iqcRecords" :key="iqc.id" :id="`row-iqc-${iqc.id}`">
                <td class="mono text-xs">{{ iqc.id }}</td>
                <td><span class="badge badge-info text-xs">{{ iqc.grnId }}</span></td>
                <td class="font-medium text-primary text-sm">{{ iqc.item }}</td>
                <td class="text-secondary text-sm">{{ iqc.qty }}</td>
                <td class="text-secondary text-sm">{{ iqc.inspectedQty }}</td>
                <td class="text-success font-semibold">{{ iqc.passQty }}</td>
                <td :class="iqc.failQty > 0 ? 'text-danger font-semibold' : 'text-tertiary'">{{ iqc.failQty }}</td>
                <td>
                  <span :class="['badge', iqc.result === 'Pass' ? 'badge-success' : iqc.result === 'Partial' ? 'badge-warning' : 'badge-danger']">
                    {{ iqc.result }}
                  </span>
                </td>
                <td class="text-secondary text-sm">{{ iqc.inspectedBy }}</td>
                <td class="text-secondary text-sm">{{ formatDate(iqc.date) }}</td>
                <td class="text-tertiary text-xs">{{ iqc.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FAT Tab -->
    <div v-if="activeTab === 'fat'" id="fat-section">
      <!-- Antrean Siap FAT: dari WO SELESAI -->
      <div class="card" id="fat-queue-card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="font-semibold">🏁 Antrean "Siap FAT"</span>
            <span class="text-xs text-tertiary">Panel dari Work Order yang sudah selesai — FAT dibuat dari sini, bukan tombol mandiri</span>
          </div>
          <span class="badge badge-warning" id="fat-queue-count">{{ readyForFAT.length }} panel</span>
        </div>
        <div v-if="readyForFAT.length" class="table-container" style="border: none;">
          <table class="table" id="fat-queue-table">
            <thead>
              <tr>
                <th>WO</th>
                <th>Panel</th>
                <th>Proyek</th>
                <th>Progress</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="wo in readyForFAT" :key="wo.id" :id="`row-fat-queue-${wo.id}`">
                <td><span class="mono text-xs text-accent">{{ wo.id }}</span></td>
                <td class="font-semibold text-primary">{{ wo.panel }}</td>
                <td><span class="badge badge-primary text-xs">{{ wo.project }}</span></td>
                <td><span class="text-success font-semibold">{{ wo.progress }}%</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" :id="`btn-start-fat-${wo.id}`" @click="startFATFromWO(wo)">▶ Mulai FAT</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state" style="padding: 20px;">
          <div class="empty-state-title">Belum ada panel siap FAT</div>
          <div class="empty-state-desc">Selesaikan Work Order terlebih dahulu.</div>
        </div>
      </div>

      <div class="flex justify-between items-center" style="margin-bottom: 16px;">
        <span class="text-sm text-tertiary">Jadwal & Checklist Pengujian Pabrik (FAT) Bersama Klien</span>
      </div>
      <div class="grid-2" style="align-items: start;">
        <div v-for="fat in fatPlans" :key="fat.id" class="card" :id="`fat-card-${fat.id}`">
          <div class="card-header">
            <div>
              <div class="font-semibold">{{ fat.id }}</div>
              <div class="text-xs text-tertiary">{{ fat.project }} — {{ fat.panel }}</div>
            </div>
            <span :class="['badge', fat.status === 'Done' ? 'badge-success' : 'badge-primary']">{{ fat.status }}</span>
          </div>
          <div class="card-body" style="display: grid; gap: 12px;">
            <div class="flex items-center justify-between">
              <span class="text-sm text-tertiary">Pelanggan</span>
              <span class="text-sm font-medium text-primary">{{ fat.customer }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-tertiary">Jadwal FAT</span>
              <span class="text-sm font-semibold" :class="fat.status === 'Done' ? 'text-success' : 'text-primary'">{{ formatDate(fat.scheduledDate) }}</span>
            </div>
            <div>
              <div class="text-sm text-tertiary" style="margin-bottom: 6px;">Saksi Pengujian (Witnesses)</div>
              <div class="flex flex-wrap gap-1">
                <span v-for="w in fat.witnesses" :key="w" class="badge badge-neutral text-xs">{{ w }}</span>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between" style="margin-bottom: 6px;">
                <span class="text-sm text-tertiary">Checklist Poin Uji Fungsi</span>
                <span class="text-sm font-semibold">{{ fat.completed }}/{{ fat.checklist }} Poin</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :class="fat.completed === fat.checklist ? 'success' : ''" :style="`width: ${fat.checklist ? (fat.completed/fat.checklist)*100 : 0}%`"></div>
              </div>
            </div>
            <div class="flex gap-2" style="margin-top: 4px;">
              <button class="btn btn-secondary btn-sm flex-1" :id="`fat-checklist-${fat.id}`">📋 Checklist Uji</button>
              <button class="btn btn-secondary btn-sm flex-1" :id="`fat-ncr-${fat.id}`" v-if="fat.status !== 'Done'" @click="openNCRForFAT(fat)">🚩 Laporkan NCR</button>
              <button class="btn btn-primary btn-sm flex-1" :id="`fat-invite-${fat.id}`" v-if="fat.status !== 'Done'" @click="inviteClient(fat)">📧 Undang Klien</button>
              <button class="btn btn-secondary btn-sm flex-1" :id="`fat-ba-${fat.id}`" v-if="fat.status === 'Done'">📄 Berita Acara (BA)</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Buka NCR Baru (Sesuai PRD §4.7.1 #modal-ncr) -->
    <div class="modal-overlay" v-if="showNCRModal" @click.self="showNCRModal = false" id="modal-ncr">
      <div class="modal" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Buka Laporan Ketidaksesuaian (NCR)</span>
            <div class="text-xs text-tertiary">Pencatatan Temuan Cacat Panel (PRD M8 §4.7.1)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showNCRModal = false">✕</button>
        </div>
        <form @submit.prevent="submitNCR">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-ncr-project">Proyek *</label>
                <select class="select" id="input-ncr-project" v-model="ncrForm.project" required>
                  <option>PRJ-2026-001</option>
                  <option>PRJ-2026-002</option>
                  <option>PRJ-2026-003</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ncr-panel">Panel *</label>
                <select class="select" id="input-ncr-panel" v-model="ncrForm.panel" required>
                  <option>LVMDP-01</option>
                  <option>LVMDP-02</option>
                  <option>MCC-01</option>
                  <option>SDP-01</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ncr-type">Tipe Cacat *</label>
                <select class="select" id="input-ncr-type" v-model="ncrForm.type" required>
                  <option>Cacat Eksternal</option>
                  <option>Wiring Error</option>
                  <option>Dimensional</option>
                  <option>Komponen Rusak</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ncr-severity">Tingkat Keparahan (Severity) *</label>
                <select class="select" id="input-ncr-severity" v-model="ncrForm.severity" required>
                  <option>Minor</option>
                  <option>Major</option>
                  <option>Critical</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ncr-desc">Deskripsi Cacat Ketidaksesuaian *</label>
                <textarea
                  class="input"
                  rows="3"
                  id="input-ncr-desc"
                  v-model="ncrForm.description"
                  placeholder="Jelaskan secara spesifik letak kerusakan, nomor terminal, atau cacat visual..."
                  style="height: auto; padding: 10px;"
                  required
                ></textarea>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ncr-photo">Lampirkan Bukti Foto (Opsional)</label>
                <input type="file" class="input" accept="image/*" multiple id="input-ncr-photo" style="padding: 8px;" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showNCRModal = false" id="btn-cancel-ncr">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-ncr">Buka NCR & Kirim Notifikasi</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Disposisi NCR (Sesuai PRD §4.7.2 #modal-ncr-disposisi) -->
    <div class="modal-overlay" v-if="showDispModal" @click.self="showDispModal = false" id="modal-ncr-disposisi">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Disposisi Tindakan NCR</span>
            <div class="text-xs text-tertiary">Otorisasi Solusi Perbaikan Teknis (PRD M8 §4.7.2)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showDispModal = false">✕</button>
        </div>
        <form @submit.prevent="submitDisposition">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label">No. NCR</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-disp-ncr-id"
                  :value="selectedNCR?.id"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-disp-action">Keputusan Disposisi *</label>
                <select class="select" id="input-disp-action" v-model="dispForm.disposition" required>
                  <option>Rework</option>
                  <option>Accept As-Is</option>
                  <option>Scrap</option>
                  <option>Return to Vendor</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-disp-corrective">Tindakan Perbaikan yang Harus Dilakukan *</label>
                <textarea
                  class="input"
                  rows="2"
                  id="input-disp-corrective"
                  v-model="dispForm.corrective"
                  placeholder="Perbaiki wiring kabel CT feeder 3 sesuai gambar revisi dan uji ulang..."
                  style="height: auto; padding: 10px;"
                  required
                ></textarea>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-disp-pic">PIC Tindakan Perbaikan *</label>
                <select class="select" id="input-disp-pic" v-model="dispForm.pic" required>
                  <option>Teknisi: Joko</option>
                  <option>Teknisi: Slamet</option>
                  <option>Subkontraktor Cat</option>
                  <option>Manajer Produksi</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-disp-due">Target Selesai Rework *</label>
                <input
                  type="date"
                  class="input"
                  id="input-disp-due"
                  v-model="dispForm.dueDate"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDispModal = false" id="btn-cancel-disp">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-disp">Simpan Disposisi</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Penjadwalan FAT (Sesuai PRD §4.7.4 #modal-schedule-fat) -->
    <div class="modal-overlay" v-if="showFATModal" @click.self="showFATModal = false" id="modal-schedule-fat">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Jadwalkan Factory Acceptance Test (FAT)</span>
            <div class="text-xs text-tertiary">Uji Fungsi Resmi Bersama Klien di Pabrik (PRD M8 §4.7.4)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showFATModal = false">✕</button>
        </div>
        <form @submit.prevent="submitFAT">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-fat-project">Proyek *</label>
                <select class="select" id="input-fat-project" v-model="fatForm.project" required>
                  <option>PRJ-2026-001 (PT. Semen Indonesia)</option>
                  <option>PRJ-2026-002 (PT. PLN)</option>
                  <option>PRJ-2026-003 (PT. Tjiwi Kimia)</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-fat-panel">Panel yang Diuji *</label>
                <input
                  type="text"
                  class="input"
                  id="input-fat-panel"
                  v-model="fatForm.panel"
                  placeholder="LVMDP-02 / MCC-01"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-fat-date">Tanggal Pengujian FAT *</label>
                <input
                  type="date"
                  class="input"
                  id="input-fat-date"
                  v-model="fatForm.scheduledDate"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-fat-template">Template Checklist Standar *</label>
                <select class="select" id="input-fat-template" v-model="fatForm.template" required>
                  <option>Standard LVMDP IEC 61439 (18 Poin)</option>
                  <option>Standard MCC Starter Test (14 Poin)</option>
                  <option>High Voltage Switchgear 20kV (24 Poin)</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-fat-witnesses">Daftar Saksi yang Hadir (Klien / Konsultan) *</label>
                <input
                  type="text"
                  class="input"
                  id="input-fat-witnesses"
                  v-model="fatForm.witnesses"
                  placeholder="Contoh: Ir. Bambang K., Konsultan PT. Tri Daya, PM: Budi"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showFATModal = false" id="btn-cancel-fat">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-fat">Jadwalkan & Kirim Undangan</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockNCRs, mockIQCRecords, mockFATPlans, mockWorkOrders } from '../../data/mockDataExtended'
import { formatDate } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const activeTab = ref('ncr')
const ncrFilter = ref('')

const allNCRs = ref([...mockNCRs])
const iqcRecords = ref([...mockIQCRecords])
const fatPlans = ref([...mockFATPlans])

const filteredNCRs = computed(() => {
  return allNCRs.value.filter(n => !ncrFilter.value || n.status === ncrFilter.value)
})

const openNCRs = computed(() => allNCRs.value.filter(n => n.status === 'Open'))

const todayIso = new Date().toISOString().split('T')[0]
const nextMonthIso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]

// Antrean Siap FAT — WO yang sudah selesai (pembuatan FAT berantai, bukan mandiri)
type WorkOrderLite = { id: string; project: string; panel: string; stage: string; progress: number }
const readyForFAT = computed(() =>
  mockWorkOrders.filter((w: WorkOrderLite) => w.progress >= 95 && !fatPlans.value.some(f => f.panel === w.panel && f.status !== 'Done'))
)

// NCR Modal Form — dibuka dari kartu FAT (butir pemeriksaan gagal)
const showNCRModal = ref(false)
const ncrForm = ref({
  project: 'PRJ-2026-001',
  panel: 'LVMDP-02',
  type: 'Wiring Error',
  severity: 'Minor',
  description: ''
})

const openNCRForFAT = (fat: typeof fatPlans.value[0]) => {
  ncrForm.value = {
    project: fat.project,
    panel: fat.panel === 'All Panels' ? 'LVMDP-01' : fat.panel,
    type: 'Wiring Error',
    severity: 'Minor',
    description: ''
  }
  showNCRModal.value = true
}

const submitNCR = () => {
  if (!ncrForm.value.description) return

  const nextSeq = allNCRs.value.length + 46
  const newNCR = {
    id: `NCR-2026-0${nextSeq}`,
    project: ncrForm.value.project,
    panel: ncrForm.value.panel,
    woId: 'WO-2026-001-02',
    type: ncrForm.value.type,
    description: ncrForm.value.description,
    severity: ncrForm.value.severity,
    foundBy: 'Sari (QC)',
    foundDate: todayIso,
    status: 'Open',
    disposisi: '',
    photos: 1
  }

  allNCRs.value.unshift(newNCR)
  showNCRModal.value = false
  toast.error('NCR Baru Dibuka', `${newNCR.id} pada panel ${newNCR.panel} memerlukan tindak lanjut disposisi Manajer Teknik`)
}

// NCR Disposition Modal Form
const showDispModal = ref(false)
const selectedNCR = ref<typeof allNCRs.value[0] | null>(null)
const dispForm = ref({
  disposition: 'Rework',
  corrective: '',
  pic: 'Teknisi: Joko',
  dueDate: todayIso
})

const openDispositionModal = (ncr: typeof allNCRs.value[0]) => {
  selectedNCR.value = ncr
  dispForm.value = {
    disposition: ncr.disposisi || 'Rework',
    corrective: '',
    pic: 'Teknisi: Joko',
    dueDate: todayIso
  }
  showDispModal.value = true
}

const submitDisposition = () => {
  if (!selectedNCR.value) return
  selectedNCR.value.disposisi = dispForm.value.disposition
  if (dispForm.value.disposition === 'Accept As-Is') {
    selectedNCR.value.status = 'Closed'
  }
  showDispModal.value = false
  toast.success('Disposisi NCR Disimpan', `${selectedNCR.value.id} ditetapkan "${dispForm.value.disposition}". PIC: ${dispForm.value.pic}`)
}

// FAT Modal Form — dibuka dari antrean "Siap FAT" (WO selesai)
const showFATModal = ref(false)
const fatForm = ref({
  project: 'PRJ-2026-001 (PT. Semen Indonesia)',
  panel: 'LVMDP-02',
  scheduledDate: nextMonthIso,
  template: 'Standard LVMDP IEC 61439 (18 Poin)',
  witnesses: 'Ir. Bambang Kurniawan, Konsultan PT. Tri Daya, PM: Budi'
})

const startFATFromWO = (wo: WorkOrderLite) => {
  fatForm.value = {
    project: `${wo.project}`,
    panel: wo.panel,
    scheduledDate: nextMonthIso,
    template: 'Standard LVMDP IEC 61439 (18 Poin)',
    witnesses: 'Ir. Bambang Kurniawan, Konsultan PT. Tri Daya, PM: Budi'
  }
  showFATModal.value = true
}

const submitFAT = () => {
  const newFAT = {
    id: `FAT-2026-00${fatPlans.value.length + 1}`,
    project: fatForm.value.project.split(' ')[0],
    panel: fatForm.value.panel,
    scheduledDate: fatForm.value.scheduledDate,
    customer: 'PT. Semen Indonesia',
    witnesses: fatForm.value.witnesses.split(',').map(s => s.trim()),
    status: 'Scheduled',
    checklist: 18,
    completed: 0
  }

  fatPlans.value.unshift(newFAT)
  showFATModal.value = false
  toast.success('Jadwal FAT Dibuat', `${newFAT.id} untuk panel ${newFAT.panel} dijadwalkan pada ${formatDate(newFAT.scheduledDate)}`)
}

const inviteClient = (fat: typeof fatPlans.value[0]) => {
  toast.info('Undangan Terkirim', `Notifikasi jadwal FAT ${fat.id} telah dikirim ke portal klien dan email saksi`)
}
</script>
