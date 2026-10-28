<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Platform & Layanan Bersama</h1>
        <p class="page-subtitle">Approval Queue, Audit Trail, Notifikasi, dan Laporan</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-export-audit">📤 Export Audit Log</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px; display: inline-flex; width: auto;">
      <button :class="['tab-btn', activeTab === 'approval' && 'active']" @click="activeTab = 'approval'" id="tab-approval">
        Approval Queue
        <span class="nav-badge" v-if="pendingApprovals.length">{{ pendingApprovals.length }}</span>
      </button>
      <button :class="['tab-btn', activeTab === 'audit' && 'active']" @click="activeTab = 'audit'" id="tab-audit">Audit Trail</button>
      <button :class="['tab-btn', activeTab === 'notifications' && 'active']" @click="activeTab = 'notifications'" id="tab-notif">
        Notifikasi
        <span class="nav-badge" v-if="unreadCount">{{ unreadCount }}</span>
      </button>
      <button :class="['tab-btn', activeTab === 'reports' && 'active']" @click="activeTab = 'reports'" id="tab-reports">Laporan</button>
      <button :class="['tab-btn', activeTab === 'roles' && 'active']" @click="activeTab = 'roles'" id="tab-roles">Dashboard Peran</button>
    </div>

    <!-- Approval Queue Tab -->
    <div v-if="activeTab === 'approval'" id="approval-section">
      <div class="card" id="approval-queue-card">
        <div class="card-header">
          <div class="font-semibold">Antrian Approval</div>
          <span class="badge badge-warning">{{ pendingApprovals.length }} Menunggu</span>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table" id="approval-queue-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipe</th>
                <th>Referensi</th>
                <th>Deskripsi</th>
                <th>Diminta Oleh</th>
                <th>Nilai</th>
                <th>Tanggal</th>
                <th>Approver</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="apq in allApprovals" :key="apq.id" :id="`row-apq-${apq.id}`">
                <td class="mono text-xs">{{ apq.id }}</td>
                <td>
                  <span :class="['badge', typeColors[apq.type] || 'badge-neutral']">{{ apq.type }}</span>
                </td>
                <td class="mono text-sm font-semibold text-accent">{{ apq.ref }}</td>
                <td class="text-secondary text-sm" style="max-width: 180px;"><div class="truncate">{{ apq.description }}</div></td>
                <td class="text-secondary text-sm">{{ apq.requestedBy }}</td>
                <td class="font-semibold text-sm">{{ apq.amount > 0 ? formatCurrency(apq.amount) : '—' }}</td>
                <td class="text-secondary text-sm">{{ formatDate(apq.date) }}</td>
                <td class="text-secondary text-sm">{{ apq.approver }}</td>
                <td>
                  <span :class="['badge', apq.status === 'Pending' ? 'badge-warning' : 'badge-success']">{{ apq.status }}</span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-secondary btn-sm" :id="`apq-detail-${apq.id}`" data-tooltip="Lihat Detail">👁️</button>
                    <button class="btn btn-primary btn-sm" :id="`apq-approve-${apq.id}`" v-if="apq.status === 'Pending'" @click="handleApprove(apq)" data-tooltip="Setujui">✅</button>
                    <button class="btn btn-danger btn-sm" :id="`apq-reject-${apq.id}`" v-if="apq.status === 'Pending'" @click="handleReject(apq)" data-tooltip="Tolak">✕</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Audit Trail Tab -->
    <div v-if="activeTab === 'audit'" id="audit-section">
      <!-- Filter -->
      <div class="card" style="padding: 16px 20px; margin-bottom: 20px;" id="audit-filter-card">
        <div class="flex gap-3 flex-wrap">
          <div class="input-with-icon flex-1" style="min-width: 200px;">
            <span class="input-icon">🔍</span>
            <input type="text" class="input" placeholder="Cari entitas, user, aksi..." v-model="auditSearch" id="search-audit" />
          </div>
          <select class="select" style="width: 160px;" v-model="auditEntityFilter" id="filter-audit-entity">
            <option value="">Semua Entitas</option>
            <option>Quotation</option>
            <option>Work Order</option>
            <option>Purchase Order</option>
            <option>Item Master</option>
            <option>NCR</option>
          </select>
        </div>
      </div>
      <div class="card" id="audit-trail-card">
        <div class="table-container" style="border: none;">
          <table class="table" id="audit-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Entitas</th>
                <th>ID Entitas</th>
                <th>Aksi</th>
                <th>Field</th>
                <th>Nilai Lama</th>
                <th>Nilai Baru</th>
                <th>Pengguna</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in filteredAudit" :key="log.id" :id="`row-aud-${log.id}`">
                <td class="mono text-xs text-tertiary">{{ log.timestamp }}</td>
                <td><span :class="['badge', entityColors[log.entity] || 'badge-neutral']">{{ log.entity }}</span></td>
                <td class="mono text-xs font-semibold text-accent">{{ log.entityId }}</td>
                <td>
                  <span :class="['badge', log.action === 'Create' ? 'badge-success' : log.action === 'Update' ? 'badge-warning' : 'badge-danger']">{{ log.action }}</span>
                </td>
                <td class="text-secondary text-sm">{{ log.field }}</td>
                <td class="text-tertiary text-sm line-through">{{ log.oldValue }}</td>
                <td class="text-primary text-sm font-medium">{{ log.newValue }}</td>
                <td class="text-secondary text-sm">{{ log.user }}</td>
                <td class="text-tertiary text-xs" style="max-width: 160px;"><div class="truncate">{{ log.reason || '—' }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer flex items-center justify-between">
          <span class="text-sm text-tertiary">{{ filteredAudit.length }} entri log ditampilkan</span>
          <button class="btn btn-secondary btn-sm" id="btn-load-more-audit">Muat Lebih Banyak</button>
        </div>
      </div>
    </div>

    <!-- Notifications Tab -->
    <div v-if="activeTab === 'notifications'" id="notifications-section">
      <div class="flex items-center justify-between" style="margin-bottom: 12px;">
        <span class="text-sm text-tertiary">{{ unreadCount }} notifikasi belum dibaca</span>
        <button class="btn btn-secondary btn-sm" id="btn-mark-all-read" @click="markAllRead">✓ Tandai Semua Dibaca</button>
      </div>
      <div class="flex flex-col gap-3" id="notifications-list">
        <div v-for="notif in notifications" :key="notif.id"
             class="notif-full-card"
             :class="{ unread: !notif.read, urgent: notif.urgent }"
             :id="`notif-${notif.id}`"
             @click="notif.read = true">
          <div class="notif-full-icon">{{ notifIcons[notif.type] || '🔔' }}</div>
          <div class="notif-full-content">
            <div class="flex items-center gap-2">
              <div class="notif-full-title">{{ notif.title }}</div>
              <span v-if="notif.urgent" class="badge badge-danger" style="font-size: 9px;">URGENT</span>
              <span v-if="!notif.read" class="unread-dot"></span>
            </div>
            <div class="notif-full-message">{{ notif.message }}</div>
            <div class="flex items-center gap-3" style="margin-top: 6px;">
              <span class="text-xs text-tertiary">{{ notif.time }}</span>
              <span class="badge badge-neutral text-xs">{{ notif.channel === 'email' ? '📧 Email' : '🔔 In-App' }}</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="flex-shrink: 0;" :id="`notif-action-${notif.id}`">Lihat</button>
        </div>
      </div>
    </div>

    <!-- Reports Tab -->
    <div v-if="activeTab === 'reports'" id="reports-section">
      <div class="grid-3" id="report-templates-grid">
        <div v-for="rpt in reportTemplates" :key="rpt.id" class="card card-hover" style="padding: 20px;" :id="`rpt-${rpt.id}`">
          <div class="flex items-start justify-between" style="margin-bottom: 12px;">
            <div class="stat-icon" style="background: rgba(59,85,168,0.1); width: 40px; height: 40px; font-size: 18px; margin: 0;">
              {{ rpt.format === 'Excel' ? '📊' : '📄' }}
            </div>
            <span class="badge badge-neutral text-xs">{{ rpt.format }}</span>
          </div>
          <div class="font-semibold text-primary" style="margin-bottom: 4px;">{{ rpt.name }}</div>
          <div class="badge badge-primary text-xs" style="margin-bottom: 12px; display: inline-flex;">{{ rpt.category }}</div>
          <div class="text-xs text-tertiary" style="margin-bottom: 12px;">Terakhir dijalankan: {{ formatDate(rpt.lastRun) }}</div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm flex-1" :id="`rpt-run-${rpt.id}`">▶ Jalankan</button>
            <button class="btn btn-icon btn-secondary btn-sm" :id="`rpt-schedule-${rpt.id}`" data-tooltip="Jadwalkan">📅</button>
          </div>
        </div>
      </div>
      <!-- Custom Report Builder (Sesuai PRD §4.10.1 #custom-report-card) -->
      <div class="card" style="margin-top: 20px;" id="custom-report-card">
        <div class="card-header">
          <div>
            <div class="font-semibold">Buat Laporan Kustom (Report Builder)</div>
            <div class="text-xs text-tertiary">Ekspor Laporan Audit & Rekapitulasi Proyek (PRD M11 §4.10.1)</div>
          </div>
          <span class="badge badge-info">Builder</span>
        </div>
        <div class="card-body">
          <form @submit.prevent="generateCustomReport">
            <div class="grid-3" style="gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-report-module">Modul Data Sumber *</label>
                <select class="select" id="input-report-module" v-model="reportForm.module" required>
                  <option>Proyek</option>
                  <option>Keuangan</option>
                  <option>Inventaris</option>
                  <option>Produksi</option>
                  <option>Purchasing</option>
                  <option>Quality</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-report-period">Periode Waktu *</label>
                <select class="select" id="input-report-period" v-model="reportForm.period" required>
                  <option>Bulan Ini</option>
                  <option>Kuartal Ini</option>
                  <option>Tahun Ini</option>
                  <option>Rentang Kustom</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-report-format">Format Output Berkas *</label>
                <select class="select" id="input-report-format" v-model="reportForm.format" required>
                  <option>Excel (.xlsx)</option>
                  <option>PDF Dokumen</option>
                  <option>CSV Data</option>
                </select>
              </div>
            </div>

            <div class="grid-2" style="gap: 16px; margin-top: 14px;" v-if="reportForm.period === 'Rentang Kustom'">
              <div class="input-group">
                <label class="input-label" for="input-report-start">Tanggal Mulai</label>
                <input type="date" class="input" id="input-report-start" v-model="reportForm.startDate" />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-report-end">Tanggal Akhir</label>
                <input type="date" class="input" id="input-report-end" v-model="reportForm.endDate" />
              </div>
            </div>

            <div style="margin-top: 16px;">
              <button type="submit" class="btn btn-primary" id="btn-generate-report">📊 Generate & Unduh Laporan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Role Dashboards Tab -->
    <div v-if="activeTab === 'roles'" id="roles-section">
      <div class="grid-3" id="role-dashboards-grid">
        <div v-for="rd in roleDashboards" :key="rd.role" class="card" :id="`role-card-${rd.role}`" style="padding: 24px;">
          <div class="flex items-center gap-3" style="margin-bottom: 16px;">
            <div class="stat-icon" style="background: rgba(59,85,168,0.1); width: 48px; height: 48px; font-size: 24px; margin: 0; flex-shrink: 0;">{{ rd.icon }}</div>
            <div class="font-bold text-primary" style="font-size: 16px;">{{ rd.role }}</div>
          </div>
          <div class="font-semibold text-tertiary text-xs uppercase" style="margin-bottom: 8px; letter-spacing: 0.05em;">Metrik Utama</div>
          <div class="flex flex-col gap-2">
            <div v-for="metric in rd.metrics" :key="metric" class="role-metric-item">
              <span class="text-sm text-secondary">{{ metric }}</span>
              <span class="text-xs text-accent">→</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm w-full" style="margin-top: 16px;" :id="`role-access-${rd.role}`">Akses Dashboard</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockAuditTrail, mockNotifications, mockApprovalQueue, mockRoleDashboards, mockReportTemplates } from '../../data/mockDataExtended'
import { formatDate, formatCurrency } from '../../data/mockData'

const activeTab = ref('approval')
const auditSearch = ref('')
const auditEntityFilter = ref('')

const allApprovals = mockApprovalQueue.value
const auditLogs = mockAuditTrail
const notifications = ref(mockNotifications.map(n => ({ ...n })))
const roleDashboards = mockRoleDashboards
const reportTemplates = mockReportTemplates

const typeColors: Record<string, string> = {
  'Quotation': 'badge-primary',
  'Purchase Order': 'badge-warning',
  'BOM Final': 'badge-info',
  'Sales Order': 'badge-success',
}

const entityColors: Record<string, string> = {
  'Quotation': 'badge-primary',
  'Work Order': 'badge-info',
  'Purchase Order': 'badge-warning',
  'Item Master': 'badge-neutral',
  'NCR': 'badge-danger',
}

const notifIcons: Record<string, string> = {
  approval: '✅',
  production: '⚡',
  stock: '📦',
  grn: '📥',
  finance: '💰',
  ncr: '⚠️',
}

const filteredAudit = computed(() => {
  return auditLogs.filter(a => {
    const s = auditSearch.value.toLowerCase()
    const matchSearch = !s || a.entity.toLowerCase().includes(s) || a.entityId.toLowerCase().includes(s) || a.user.toLowerCase().includes(s)
    const matchEntity = !auditEntityFilter.value || a.entity === auditEntityFilter.value
    return matchSearch && matchEntity
  })
})

const pendingApprovals = computed(() => allApprovals.filter(a => a.status === 'Pending'))
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

import { useToast } from '../../data/toastStore'

const toast = useToast()

const reportForm = ref({
  module: 'Proyek',
  period: 'Bulan Ini',
  format: 'Excel (.xlsx)',
  startDate: '',
  endDate: ''
})

const generateCustomReport = () => {
  toast.success('Laporan Berhasil Dibuat', `Laporan modul "${reportForm.value.module}" (${reportForm.value.period}) berhasil di-generate dalam format ${reportForm.value.format}`)
}

const handleApprove = (apq: typeof allApprovals[0]) => {
  apq.status = 'Approved'
  toast.success('Dokumen Disetujui', `${apq.type} ${apq.ref} telah disetujui`)
}

const handleReject = (apq: typeof allApprovals[0]) => {
  apq.status = 'Rejected'
  toast.warning('Dokumen Ditolak', `${apq.type} ${apq.ref} telah ditolak`)
}

const markAllRead = () => {
  notifications.value.forEach(n => n.read = true)
  toast.info('Notifikasi Dibaca', 'Semua notifikasi ditandai sebagai telah dibaca')
}
</script>

<style scoped>
.nav-badge {
  background: var(--primary-600);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  margin-left: 4px;
}

.notif-full-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.notif-full-card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-sm);
}

.notif-full-card.unread {
  border-left: 3px solid var(--primary-500);
  background: var(--bg-card-hover);
}

.notif-full-card.urgent {
  border-left: 3px solid var(--danger-500);
}

.notif-full-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: var(--bg-glass);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-full-content { flex: 1; min-width: 0; }

.notif-full-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.notif-full-message {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 2px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--primary-500);
  border-radius: 50%;
  flex-shrink: 0;
}

.role-metric-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-glass);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}
</style>
