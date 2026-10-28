<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Semua Proyek</h1>
        <p class="page-subtitle">Proyek dibuat otomatis saat SO Confirmed. Klik proyek untuk melihat stepper alur & aksi.</p>
      </div>
      <!-- TIDAK ADA tombol "+ Proyek Baru" — ganti dengan shortcut ke Prospek/QT -->
      <div class="flex gap-3">
        <router-link to="/sales/crm" class="btn btn-primary btn-sm" id="btn-new-prospek-qt">
          + Prospek / Quotation Baru
        </router-link>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px; max-width: 560px;" id="project-tabs">
      <button :class="['tab-btn', tab === 'all' && 'active']" @click="tab = 'all'" id="tab-all">Semua ({{ allProjects.length }})</button>
      <button :class="['tab-btn', tab === 'active' && 'active']" @click="tab = 'active'" id="tab-active">Aktif ({{ activeCount }})</button>
      <button :class="['tab-btn', tab === 'production' && 'active']" @click="tab = 'production'" id="tab-production">Produksi</button>
      <button :class="['tab-btn', tab === 'done' && 'active']" @click="tab = 'done'" id="tab-done">Selesai</button>
    </div>

    <!-- Project Cards -->
    <div class="projects-grid" id="project-grid">
      <div v-for="project in filteredProjects" :key="project.id"
           class="project-card card card-hover" @click="$router.push(`/projects/${project.id}`)"
           :id="`card-project-${project.id}`">
        <!-- Header -->
        <div class="project-card-header">
          <div class="project-id mono text-xs">{{ project.id }}</div>
          <span :class="['badge', statusBadgeClass(project.status)]">{{ statusLabel(project.status) }}</span>
        </div>
        <!-- Title -->
        <div class="project-title">{{ project.name }}</div>
        <div class="project-customer text-secondary text-sm">🏢 {{ project.customer }} · PM: {{ project.pm }}</div>

        <!-- Mini Stepper Alur -->
        <div class="mini-stepper">
          <div v-for="step in getProjectSteps(project)" :key="step.id"
               :class="['step-dot', step.state]"
               :title="step.label + ': ' + step.state">
            <span v-if="step.state === 'SELESAI'">✓</span>
            <span v-else-if="step.state === 'AKTIF'">●</span>
            <span v-else-if="step.state === 'TERBLOKIR'">🔒</span>
            <span v-else>○</span>
          </div>
          <div class="step-labels">
            <span v-for="step in getProjectSteps(project)" :key="step.id" class="step-label-text"
                  :class="{ 'active-label': step.state === 'AKTIF' }">{{ step.short }}</span>
          </div>
        </div>

        <!-- Progress -->
        <div class="project-progress">
          <div class="flex justify-between items-center" style="margin-bottom: 6px;">
            <span class="text-xs text-tertiary">Progres Keseluruhan</span>
            <span class="text-sm font-bold" :class="progressTextColor(project.progress)">{{ project.progress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :class="progressClass(project.progress)"
                 :style="`width: ${project.progress}%`"></div>
          </div>
        </div>

        <!-- Panel chips -->
        <div class="panel-chips" v-if="project.panels.length > 0">
          <span v-for="panel in project.panels.slice(0,4)" :key="panel.id"
                class="panel-chip" :class="`panel-status-${panel.status.toLowerCase()}`">
            {{ panel.panel_no }}
          </span>
          <span class="panel-chip" v-if="project.panels.length > 4">+{{ project.panels.length - 4 }} lagi</span>
        </div>

        <!-- Footer -->
        <div class="project-card-footer">
          <div>
            <div class="text-xs text-tertiary">Nilai Kontrak</div>
            <div class="font-semibold text-accent">{{ formatCurrencyChain(project.contract_value) }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-tertiary">Target FAT</div>
            <div class="text-sm font-medium">{{ project.fat_date || '—' }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-tertiary">Panel</div>
            <div class="text-sm">{{ project.panels.length }} unit</div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredProjects.length === 0" class="empty-card">
        <div class="empty-state">
          <div class="empty-state-icon">🏗️</div>
          <div class="empty-state-title">Belum ada proyek</div>
          <div class="empty-state-desc">Proyek dibuat otomatis saat SO di-confirm. Mulai dari Prospek/Quotation.</div>
          <router-link to="/sales/crm" class="btn btn-primary">→ Buat Prospek / Quotation</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  proyekList,
  formatCurrencyChain,
  statusBadgeClass,
  statusLabel,
  type Proyek,
  type PanelItem,
} from '../../data/chainStore'

const tab = ref('all')
const allProjects = proyekList

const activeStatuses = ['ENGINEERING', 'SIAP_PRODUKSI', 'PRODUKSI', 'QC_FAT', 'SIAP_KIRIM', 'TERKIRIM']
const doneStatuses = ['BAST', 'DITUTUP', 'GARANSI']
const prodStatuses = ['PRODUKSI', 'QC_FAT']

const activeCount = computed(() => allProjects.value.filter(p => activeStatuses.includes(p.status)).length)

const filteredProjects = computed(() => {
  if (tab.value === 'active') return allProjects.value.filter(p => activeStatuses.includes(p.status))
  if (tab.value === 'production') return allProjects.value.filter(p => prodStatuses.includes(p.status))
  if (tab.value === 'done') return allProjects.value.filter(p => doneStatuses.includes(p.status))
  return allProjects.value
})

// Stepper alur per proyek (dari status panel)
interface StepInfo { id: string; label: string; short: string; state: 'SELESAI'|'AKTIF'|'MENUNGGU'|'TERBLOKIR' }

const getProjectSteps = (project: Proyek): StepInfo[] => {
  const panels = project.panels
  const anyPanel = (fn: (p: PanelItem) => boolean) => panels.some(fn)
  const allPanels = (fn: (p: PanelItem) => boolean) => panels.length > 0 && panels.every(fn)

  const bomApproved = allPanels(p => p.bom_status === 'APPROVED')
  const bomInProgress = anyPanel(p => ['IN_REVIEW','DRAFT'].includes(p.bom_status))
  const docAFC = allPanels(p => Object.values(p.docs_status).every(s => s === 'AFC'))
  const docInProgress = anyPanel(p => Object.values(p.docs_status).some(s => s !== 'AFC'))
  const woStarted = anyPanel(p => ['BERJALAN','SELESAI'].includes(p.wo_status))
  const woAll = allPanels(p => p.wo_status === 'SELESAI')
  const fatDone = allPanels(p => p.fat_status === 'LULUS' || p.fat_status === 'LULUS_DENGAN_CATATAN')
  const fatInProgress = anyPanel(p => p.fat_status !== null && !['LULUS','LULUS_DENGAN_CATATAN'].includes(p.fat_status || ''))
  const delivered = project.status === 'TERKIRIM' || project.status === 'BAST'
  const invoiced = project.status === 'DITUTUP'

  return [
    { id: 'so', label: 'Sales Order', short: 'SO', state: 'SELESAI' },
    { id: 'bom', label: 'BOM', short: 'BOM', state: bomApproved ? 'SELESAI' : bomInProgress ? 'AKTIF' : 'MENUNGGU' },
    { id: 'dok', label: 'Dok. Teknis', short: 'Dok', state: docAFC ? 'SELESAI' : docInProgress ? 'AKTIF' : 'MENUNGGU' },
    { id: 'rilis', label: 'Paket Rilis', short: 'Rilis', state: project.status === 'SIAP_PRODUKSI' || woStarted ? (woStarted ? 'SELESAI' : 'AKTIF') : (bomApproved && docAFC ? 'AKTIF' : 'TERBLOKIR') },
    { id: 'wo', label: 'Work Order', short: 'WO', state: woAll ? 'SELESAI' : woStarted ? 'AKTIF' : 'MENUNGGU' },
    { id: 'fat', label: 'QC / FAT', short: 'FAT', state: fatDone ? 'SELESAI' : fatInProgress ? 'AKTIF' : 'MENUNGGU' },
    { id: 'kirim', label: 'Pengiriman', short: 'Kirim', state: delivered ? 'SELESAI' : 'MENUNGGU' },
    { id: 'inv', label: 'Invoice', short: 'INV', state: invoiced ? 'SELESAI' : 'MENUNGGU' },
  ]
}

const progressClass = (p: number) => {
  if (p >= 80) return 'success'
  if (p < 30) return 'warning'
  return ''
}

const progressTextColor = (p: number) => {
  if (p >= 80) return 'text-success'
  if (p < 30) return 'text-warning'
  return 'text-primary'
}
</script>

<style scoped>
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-5);
}

.project-card {
  cursor: pointer;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-id { color: var(--text-tertiary); }

.project-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

/* Mini Stepper */
.mini-stepper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-stepper > div:first-child {
  display: flex;
  align-items: center;
  gap: 2px;
}

.step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  border: 1.5px solid var(--border-default);
  background: var(--bg-glass);
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.step-dot.SELESAI {
  background: var(--success-700);
  border-color: var(--success-500);
  color: #ffffff;
}

.step-dot.AKTIF {
  background: var(--primary-700);
  border-color: var(--primary-400);
  color: #ffffff;
  box-shadow: 0 0 0 3px rgba(59,85,168,0.2);
  animation: pulse-ring 2s infinite;
}

.step-dot.TERBLOKIR {
  background: rgba(239,68,68,0.1);
  border-color: var(--danger-600);
  color: var(--text-danger);
  font-size: 8px;
}

.step-labels {
  display: flex;
  gap: 2px;
}

.step-label-text {
  width: 22px;
  font-size: 8px;
  text-align: center;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
}

.active-label {
  color: var(--text-accent);
  font-weight: 600;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 3px rgba(59,85,168,0.2); }
  50% { box-shadow: 0 0 0 5px rgba(59,85,168,0.1); }
  100% { box-shadow: 0 0 0 3px rgba(59,85,168,0.2); }
}

/* Panel chips */
.panel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.panel-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
}

.panel-status-produksi { border-color: var(--primary-600); color: var(--text-accent); }
.panel-status-siap_produksi { border-color: var(--warning-600); color: var(--text-warning); }
.panel-status-siap_qc { border-color: var(--success-600); color: var(--text-success); }
.panel-status-engineering { border-color: var(--border-default); }

.project-card-footer {
  display: flex;
  gap: var(--space-4);
  align-items: flex-end;
  justify-content: space-between;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  margin-top: auto;
}

.empty-card {
  grid-column: 1 / -1;
}
</style>
