<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Produksi & Work Order</h1>
        <p class="page-subtitle">Pantau Work Order, jadwal workshop, timesheet, dan progres perakitan panel (PRD M7 §4.6)</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-gantt-view" @click="activeTab = 'kanban'">📅 Gantt / Kanban</button>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="wo-chain-hint">
      ℹ️ Work Order dibuat <strong>otomatis dari Paket Rilis</strong> (BOM Approved + dokumen AFC). Tidak ada tombol "+ Work Order" — WO baru muncul di sini setelah panel dirilis ke produksi.
    </div>

    <!-- KPI Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-wo-active">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">⚡</div>
        <div class="stat-value">{{ workOrders.length }}</div>
        <div class="stat-label">WO Aktif</div>
      </div>
      <div class="stat-card" id="stat-wo-ontrack">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ onTrackCount }}</div>
        <div class="stat-label">On Track</div>
      </div>
      <div class="stat-card" id="stat-wo-atrisk">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⚠️</div>
        <div class="stat-value text-warning">{{ atRiskCount }}</div>
        <div class="stat-label">At Risk / Delay</div>
        <div class="stat-trend trend-down" v-if="atRiskCount > 0">▼ Perlu perhatian</div>
      </div>
      <div class="stat-card" id="stat-manhour">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">⏱️</div>
        <div class="stat-value">{{ totalCompletedHours }}</div>
        <div class="stat-label">Man-hours Tercatat</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-3 items-center" style="margin-bottom: 20px;">
      <div class="tabs-nav" style="flex: none;">
        <button :class="['tab-btn', activeTab === 'wo' && 'active']" @click="activeTab = 'wo'" id="tab-wo">Work Orders</button>
        <button :class="['tab-btn', activeTab === 'kanban' && 'active']" @click="activeTab = 'kanban'" id="tab-kanban">Kanban Produksi</button>
        <button :class="['tab-btn', activeTab === 'timesheet' && 'active']" @click="activeTab = 'timesheet'" id="tab-timesheet">Timesheet</button>
      </div>
    </div>

    <!-- Work Orders Table -->
    <div v-if="activeTab === 'wo'" class="card" id="wo-table-card">
      <div class="card-header">
        <div class="font-semibold">Antrean Work Order</div>
        <div class="flex gap-2">
          <button class="btn btn-sm" :class="filterMine ? 'btn-primary' : 'btn-secondary'" @click="filterMine = !filterMine" id="filter-wo-mine">⏳ Menunggu Tindakan Saya</button>
          <button class="btn btn-sm" :class="filterBlocked ? 'btn-danger' : 'btn-secondary'" @click="filterBlocked = !filterBlocked" id="filter-wo-blocked">🔒 Terblokir</button>
        </div>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="wo-table">
          <thead>
            <tr>
              <th>No. WO</th>
              <th>Panel</th>
              <th>Proyek</th>
              <th>Tahap Saat Ini</th>
              <th>Progress</th>
              <th>Tim</th>
              <th>Target</th>
              <th>Man-hours</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wo in filteredWorkOrders" :key="wo.id" :id="`row-wo-${wo.id}`">
              <td><div class="mono text-sm font-semibold text-accent">{{ wo.id }}</div></td>
              <td><div class="font-semibold text-primary">{{ wo.panel }}</div></td>
              <td><span class="badge badge-primary text-xs">{{ wo.project }}</span></td>
              <td>
                <span :class="['badge', stageColors[wo.stage] || 'badge-neutral']">{{ wo.stage }}</span>
                <div v-if="blockedReasons[wo.id]" class="text-xs text-danger" style="margin-top: 2px;">🔒 {{ blockedReasons[wo.id] }}</div>
              </td>
              <td style="min-width: 140px;">
                <div class="flex items-center gap-2">
                  <div class="progress-bar" style="flex: 1;">
                    <div class="progress-fill" :class="wo.progress >= 90 ? 'success' : wo.progress >= 50 ? '' : 'warning'"
                         :style="`width: ${wo.progress}%`"></div>
                  </div>
                  <span class="text-sm font-semibold" style="min-width: 32px;">{{ wo.progress }}%</span>
                </div>
              </td>
              <td class="text-secondary text-sm" style="max-width: 160px;">
                <div class="truncate">{{ wo.assignedTo }}</div>
              </td>
              <td class="text-secondary text-sm">{{ formatDate(wo.dueDate) }}</td>
              <td class="text-secondary text-sm">{{ wo.completedHours }} / {{ wo.manhours }} jam</td>
              <td>
                <span :class="['badge', wo.status === 'On Track' ? 'badge-success' : 'badge-warning']">{{ wo.status }}</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`wo-detail-${wo.id}`" data-tooltip="Detail WO">👁️</button>
                  <button class="btn btn-icon btn-secondary btn-sm" :id="`wo-update-${wo.id}`" data-tooltip="Catat Jam Kerja" @click="openTimesheetModal(wo.id, wo.stage)">⏱️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kanban -->
    <div v-if="activeTab === 'kanban'" id="kanban-board">
      <div class="kanban-board" id="kanban-production">
        <div v-for="stage in productionStages" :key="stage" class="kanban-col" :id="`kanban-col-${stage}`">
          <div class="kanban-col-header">
            <span class="kanban-col-title">{{ stage }}</span>
            <span class="kanban-col-count">{{ workOrdersByStage(stage).length }}</span>
          </div>
          <div class="kanban-col-body">
            <div v-for="wo in workOrdersByStage(stage)" :key="wo.id" class="kanban-card" :id="`kanban-wo-${wo.id}`" @click="openTimesheetModal(wo.id, wo.stage)">
              <div class="kanban-card-title">{{ wo.panel }}</div>
              <div class="text-xs text-tertiary" style="margin-bottom: 8px;">{{ wo.project }}</div>
              <div class="progress-bar" style="margin-bottom: 6px;">
                <div class="progress-fill" :style="`width: ${wo.progress}%`"></div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-tertiary">{{ wo.progress }}%</span>
                <span :class="['badge', 'text-xs', wo.status === 'On Track' ? 'badge-success' : 'badge-warning']">{{ wo.status }}</span>
              </div>
              <div class="text-xs text-tertiary" style="margin-top: 6px;">👷 {{ wo.assignedTo.split(':')[0] }}</div>
            </div>
            <div v-if="workOrdersByStage(stage).length === 0" style="padding: 16px; text-align: center; color: var(--text-tertiary); font-size: 12px;">
              Tidak ada panel
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timesheet Tab -->
    <div v-if="activeTab === 'timesheet'" class="card" id="timesheet-card">
      <div class="card-header">
        <div class="font-semibold">Timesheet — Hari Ini ({{ todayStr }})</div>
        <button class="btn btn-primary btn-sm" id="btn-add-timesheet" @click="openTimesheetModal()">+ Catat Jam Kerja</button>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table" id="timesheet-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Work Order</th>
              <th>Teknisi</th>
              <th>Tanggal</th>
              <th>Jam Kerja</th>
              <th>Tahap</th>
              <th>Catatan Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ts in timesheets" :key="ts.id" :id="`row-ts-${ts.id}`">
              <td class="mono text-xs">{{ ts.id }}</td>
              <td><span class="badge badge-primary text-xs">{{ ts.woId }}</span></td>
              <td class="font-medium text-primary text-sm">{{ ts.worker }}</td>
              <td class="text-secondary text-sm">{{ ts.date }}</td>
              <td class="font-semibold">{{ ts.hours }} jam</td>
              <td><span :class="['badge', stageColors[ts.stage] || 'badge-neutral']">{{ ts.stage }}</span></td>
              <td class="text-secondary text-sm">{{ ts.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Catat Jam Kerja / Timesheet (Sesuai PRD §4.6.2 #modal-timesheet) -->
    <div class="modal-overlay" v-if="showTimesheetModal" @click.self="showTimesheetModal = false" id="modal-timesheet">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Catat Jam Kerja Teknisi</span>
            <div class="text-xs text-tertiary">Log Harian Tenaga Kerja Workshop (PRD M7 §4.6.2)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showTimesheetModal = false">✕</button>
        </div>
        <form @submit.prevent="submitTimesheet">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ts-wo">Pilih Work Order *</label>
                <select class="select" id="input-ts-wo" v-model="tsForm.woId" required>
                  <option value="" disabled>Pilih WO Aktif...</option>
                  <option v-for="w in workOrders" :key="w.id" :value="w.id">
                    {{ w.id }} — {{ w.panel }} ({{ w.stage }})
                  </option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ts-worker">Nama Teknisi *</label>
                <select class="select" id="input-ts-worker" v-model="tsForm.worker" required>
                  <option>Joko</option>
                  <option>Slamet</option>
                  <option>Pardi</option>
                  <option>Wahyu</option>
                  <option>Anton</option>
                  <option>Hadi</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ts-date">Tanggal Kerja *</label>
                <input
                  type="date"
                  class="input"
                  id="input-ts-date"
                  v-model="tsForm.date"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ts-hours">Durasi Jam Kerja *</label>
                <input
                  type="number"
                  class="input"
                  id="input-ts-hours"
                  v-model.number="tsForm.hours"
                  min="0.5"
                  max="14"
                  step="0.5"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ts-stage">Tahap Pengerjaan *</label>
                <select class="select" id="input-ts-stage" v-model="tsForm.stage" required>
                  <option v-for="stg in productionStages" :key="stg" :value="stg">{{ stg }}</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ts-notes">Uraian Aktivitas *</label>
                <textarea
                  class="input"
                  rows="2"
                  id="input-ts-notes"
                  v-model="tsForm.notes"
                  placeholder="Contoh: Wiring terminal CT dan pengujian trip breaker..."
                  style="height: auto; padding: 10px;"
                  required
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showTimesheetModal = false" id="btn-cancel-ts">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-ts">Simpan Timesheet</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockWorkOrders, mockProductionStages, mockTimeSheets } from '../../data/mockDataExtended'
import { formatDate } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const activeTab = ref('wo')
const workOrders = ref([...mockWorkOrders])
const productionStages = mockProductionStages
const timesheets = ref([...mockTimeSheets])

const stageColors: Record<string, string> = {
  'Fabrikasi': 'badge-info',
  'Powder Coating': 'badge-neutral',
  'Rakit Mekanis': 'badge-primary',
  'Wiring': 'badge-primary',
  'QC Internal': 'badge-warning',
  'QC/FAT': 'badge-warning',
  'Packing': 'badge-success',
  'Selesai': 'badge-success',
}

const onTrackCount = computed(() => workOrders.value.filter(w => w.status === 'On Track').length)
const atRiskCount = computed(() => workOrders.value.filter(w => w.status === 'At Risk').length)
const totalCompletedHours = computed(() => timesheets.value.reduce((a, t) => a + t.hours, 0))

const filterMine = ref(false)
const filterBlocked = ref(false)
const blockedReasons: Record<string, string> = {
  'WO-2026-001-03': 'Material belum lengkap (ketersediaan merah)',
}

const filteredWorkOrders = computed(() => {
  return workOrders.value.filter(w => {
    const matchMine = !filterMine.value || w.status === 'At Risk'
    const matchBlocked = !filterBlocked.value || !!blockedReasons[w.id]
    return matchMine && matchBlocked
  })
})

const workOrdersByStage = (stage: string) => workOrders.value.filter(w => w.stage === stage)

const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const todayIso = new Date().toISOString().split('T')[0]

// Timesheet Modal State
const showTimesheetModal = ref(false)
const tsForm = ref({
  woId: workOrders.value[0]?.id || '',
  worker: 'Joko',
  date: todayIso,
  hours: 8,
  stage: 'Wiring',
  notes: ''
})

const openTimesheetModal = (woId?: string, stage?: string) => {
  tsForm.value = {
    woId: woId || workOrders.value[0]?.id || '',
    worker: 'Joko',
    date: todayIso,
    hours: 8,
    stage: stage || 'Wiring',
    notes: ''
  }
  showTimesheetModal.value = true
}

const submitTimesheet = () => {
  if (!tsForm.value.notes) return

  const newTS = {
    id: `TS-00${timesheets.value.length + 1}`,
    woId: tsForm.value.woId,
    worker: tsForm.value.worker,
    date: tsForm.value.date,
    hours: tsForm.value.hours,
    stage: tsForm.value.stage,
    notes: tsForm.value.notes
  }

  timesheets.value.unshift(newTS)

  // Update WO completed hours
  const targetWO = workOrders.value.find(w => w.id === tsForm.value.woId)
  if (targetWO) {
    targetWO.completedHours += tsForm.value.hours
    targetWO.stage = tsForm.value.stage
    targetWO.progress = Math.min(100, Math.round((targetWO.completedHours / targetWO.manhours) * 100))
  }

  showTimesheetModal.value = false
  toast.success('Timesheet Dicatat', `${tsForm.value.hours} jam kerja teknisi ${tsForm.value.worker} ditambahkan ke ${tsForm.value.woId}`)
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-col {
  min-width: 200px;
  max-width: 220px;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-glass);
}

.kanban-col-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.kanban-col-count {
  background: var(--primary-700);
  color: white;
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.kanban-col-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.kanban-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.kanban-card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.kanban-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
</style>
