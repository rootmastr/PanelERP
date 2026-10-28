<template>
  <div class="dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Selamat datang, Budi. Berikut ringkasan operasional hari ini.</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-export-dashboard" @click="toast.notReady('Export Laporan')">
          📊 Export Laporan
        </button>
        <router-link to="/sales/crm" class="btn btn-primary btn-sm" id="btn-new-prospek">
          + Prospek / Quotation Baru
        </router-link>
      </div>
    </div>

    <!-- KPI Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" v-for="stat in kpiStats" :key="stat.id" :id="`kpi-${stat.id}`"
           :style="`--glow-color: radial-gradient(ellipse at 50% 0%, ${stat.glow} 0%, transparent 60%)`">
        <div class="stat-icon" :style="`background: ${stat.iconBg};`">{{ stat.icon }}</div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-trend" :class="stat.trendUp ? 'trend-up' : 'trend-down'" v-if="stat.trend">
          <span>{{ stat.trendUp ? '↑' : '↓' }}</span>
          <span>{{ stat.trend }}</span>
          <span class="text-tertiary">vs bulan lalu</span>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
      <!-- Active Projects -->
      <div class="card" id="card-active-projects" style="grid-column: 1 / 3;">
        <div class="card-header">
          <div>
            <div class="font-semibold">Proyek Aktif</div>
            <div class="text-xs text-tertiary">Status & progres semua proyek berjalan</div>
          </div>
          <router-link to="/projects" class="btn btn-secondary btn-sm">Lihat Semua →</router-link>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-container" style="border: none; border-radius: 0;">
            <table class="table table-clickable" id="table-projects">
              <thead>
                <tr>
                  <th>ID Proyek</th>
                  <th>Nama Proyek</th>
                  <th>PM</th>
                  <th>Tahap Saat Ini</th>
                  <th>Progres</th>
                  <th>FAT</th>
                  <th>Nilai Kontrak</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in activeProjects" :key="p.id" @click="$router.push(`/projects/${p.id}`)">
                  <td><span class="mono text-xs">{{ p.id }}</span></td>
                  <td>
                    <div class="font-medium text-primary truncate" style="max-width: 260px;">{{ p.name }}</div>
                    <div class="text-xs text-tertiary">{{ p.customer }}</div>
                  </td>
                  <td class="text-secondary">{{ p.pm }}</td>
                  <td>
                    <span :class="['badge', statusBadgeClass(p.status)]">{{ statusLabel(p.status) }}</span>
                    <div class="text-xs text-tertiary" v-if="getBlockReason(p)">🔒 {{ getBlockReason(p) }}</div>
                  </td>
                  <td style="min-width: 140px;">
                    <div class="flex items-center gap-2">
                      <div class="progress-bar flex-1">
                        <div class="progress-fill" :class="progressClass(p.progress)"
                             :style="`width: ${p.progress}%`"></div>
                      </div>
                      <span class="text-xs font-medium" style="width: 32px; text-align: right;">{{ p.progress }}%</span>
                    </div>
                  </td>
                  <td class="text-secondary text-sm">{{ formatDate(p.fat_date) }}</td>
                  <td class="font-medium">{{ formatCurrency(p.contract_value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="card" id="card-activity">
        <div class="card-header">
          <div class="font-semibold">Aktivitas Terkini</div>
          <span class="badge badge-primary">{{ recentActivities.length }} item</span>
        </div>
        <div class="activity-feed">
          <div v-for="act in recentActivities" :key="act.id" class="activity-item" :class="{ urgent: act.urgent }" :id="`activity-${act.id}`">
            <div class="activity-icon">{{ act.icon }}</div>
            <div class="activity-content">
              <div class="activity-msg text-sm">{{ act.message }}</div>
              <div class="activity-meta">
                <span class="text-xs text-tertiary">{{ act.user }}</span>
                <span class="dot" style="width: 3px; height: 3px; background: var(--text-tertiary);"></span>
                <span class="text-xs text-tertiary">{{ act.time }}</span>
              </div>
            </div>
            <div class="urgent-dot" v-if="act.urgent"></div>
          </div>
        </div>
      </div>

      <!-- Project Status Chart -->
      <div class="card" id="card-status-chart">
        <div class="card-header">
          <div class="font-semibold">Status Proyek</div>
        </div>
        <div class="card-body">
          <div class="status-chart">
            <div class="status-donut" id="status-donut">
              <svg viewBox="0 0 120 120" class="donut-svg" role="img" aria-label="Distribusi status proyek">
                <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border-subtle)" stroke-width="16"/>
                <circle
                  v-for="seg in donutSegments"
                  :key="seg.label"
                  cx="60" cy="60" r="48"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="16"
                  stroke-linecap="butt"
                  :stroke-dasharray="`${seg.length} ${donutCircumference - seg.length}`"
                  :stroke-dashoffset="-seg.offset"
                />
              </svg>
              <div class="donut-center">
                <span class="donut-value">{{ allProjects.length }}</span>
                <span class="donut-label">Proyek</span>
              </div>
            </div>
            <div class="status-legend">
              <div v-for="sl in statusLegend" :key="sl.label" class="legend-item">
                <div class="dot" :style="`background: ${sl.color}`"></div>
                <span class="text-sm text-secondary">{{ sl.label }}</span>
                <span class="text-sm font-semibold text-primary" style="margin-left: auto;">{{ sl.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Approvals -->
      <div class="card" id="card-approvals">
        <div class="card-header">
          <div class="font-semibold">Perlu Persetujuan</div>
          <span class="badge badge-danger" v-if="pendingApprovals.length">{{ pendingApprovals.length }} Menunggu</span>
          <span class="badge badge-success" v-else>Kosong</span>
        </div>
        <div v-if="pendingApprovals.length === 0" class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">Tidak ada menunggu persetujuan</div>
        </div>
        <div v-else style="padding: 8px 0;">
          <div v-for="ap in pendingApprovals" :key="ap.id" class="approval-item" :id="`approval-${ap.id}`">
            <div class="approval-type-badge" :class="`type-${ap.type}`">{{ ap.typeLabel }}</div>
            <div class="approval-info">
              <div class="text-sm font-medium">{{ ap.doc }}</div>
              <div class="text-xs text-tertiary">{{ ap.from }} · {{ ap.value }}</div>
              <div class="text-xs text-warning" v-if="confirmingApproval === ap.id">Klik lagi untuk konfirmasi…</div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-success-ghost" :id="`approve-${ap.id}`"
                      :aria-label="`Setujui ${ap.ref}`" @click="approve(ap)">✓</button>
              <button class="btn btn-sm btn-danger" :id="`reject-${ap.id}`"
                      :aria-label="`Tolak ${ap.ref}`" @click="reject(ap)">✗</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Alerts -->
      <div class="card" id="card-stock-alerts">
        <div class="card-header">
          <div class="font-semibold">Alert Stok</div>
          <span class="badge badge-warning">{{ stockAlerts.length }} Item</span>
        </div>
        <div v-if="stockAlerts.length === 0" class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">Semua item di atas reorder point</div>
        </div>
        <div v-else style="padding: 8px 0;">
          <div v-for="sa in stockAlerts" :key="sa.id" class="stock-alert-item" :id="`stock-alert-${sa.id}`">
            <div class="stock-alert-indicator" :class="`level-${sa.level}`"></div>
            <div class="stock-alert-info">
              <div class="text-sm font-medium">{{ sa.name }}</div>
              <div class="text-xs text-tertiary">{{ sa.code }}</div>
            </div>
            <div class="stock-alert-numbers">
              <div class="text-sm font-semibold" :class="sa.level === 'critical' ? 'text-danger' : 'text-warning'">
                Stok: {{ sa.stock }} {{ sa.uom }}
              </div>
              <div class="text-xs text-tertiary">Min: {{ sa.reorder }} {{ sa.uom }}</div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <router-link to="/inventory" class="btn btn-secondary btn-sm w-full" style="justify-content: center;">
            Kelola Inventaris →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockRecentActivities, formatCurrency, formatDate } from '../data/mockData'
import { mockApprovalQueue, mockFATPlans, mockNCRs } from '../data/mockDataExtended'
import { proyekList, salesOrders, statusBadgeClass, statusLabel, formatCurrencyChain, type Proyek } from '../data/chainStore'
import { items } from '../data/itemStore'
import { useToast } from '../data/toastStore'

const toast = useToast()

const activeProjects = computed(() => proyekList.value.filter(p => !['BAST','DITUTUP','DIBATALKAN'].includes(p.status)))
const recentActivities = mockRecentActivities

const getBlockReason = (p: Proyek) => {
  const hasBomNotApproved = p.panels.some(panel => panel.bom_status !== 'APPROVED')
  const hasDocNotAFC = p.panels.some(panel => Object.values(panel.docs_status).some(s => s !== 'AFC'))
  if (p.status === 'ENGINEERING' && hasBomNotApproved) return 'BOM Draft/Review'
  if (p.status === 'ENGINEERING' && hasDocNotAFC) return 'Dok belum AFC'
  return ''
}

const progressClass = (p: number) => {
  if (p >= 80) return 'success'
  if (p >= 50) return ''
  return 'warning'
}

// First-Pass Yield: FAT selesai tanpa NCR pada proyek yang sama
const firstPassYield = computed(() => {
  const done = mockFATPlans.filter(f => f.status === 'Done')
  if (!done.length) return '—'
  const pass = done.filter(f => !mockNCRs.some(n => n.project === f.project)).length
  return `${Math.round((pass / done.length) * 100)}%`
})

const kpiStats = ref([
  { id: 'active-projects', icon: '🏗️', label: 'Proyek Aktif', value: computed(() => proyekList.value.filter(p => !['DITUTUP','DIBATALKAN'].includes(p.status)).length.toString()), trend: '', trendUp: true, iconBg: 'rgba(59,85,168,0.2)', glow: 'rgba(59,85,168,0.15)' },
  { id: 'revenue', icon: '💰', label: 'Total Kontrak Aktif', value: computed(() => formatCurrencyChain(salesOrders.value.filter(s => ['CONFIRMED','BERJALAN'].includes(s.status)).reduce((a,s) => a + s.contract_value + s.total_vo_amount, 0))), trend: '', trendUp: true, iconBg: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.1)' },
  { id: 'approvals', icon: '🧾', label: 'Perlu Persetujuan', value: computed(() => String(mockApprovalQueue.value.filter(a => a.status === 'Pending').length)), trend: '', trendUp: false, iconBg: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.1)' },
  { id: 'quality', icon: '✅', label: 'First-Pass Yield FAT', value: computed(() => firstPassYield.value), trend: '', trendUp: true, iconBg: 'rgba(59,130,246,0.2)', glow: 'rgba(59,130,246,0.1)' },
])

const allProjects = proyekList

/** Distribusi status proyek — dihitung dari data, bukan angka tetap. */
const statusLegend = computed(() => {
  const groups: { label: string; color: string; match: (s: string) => boolean }[] = [
    { label: 'Produksi', color: 'var(--primary-500)', match: s => s === 'PRODUKSI' },
    { label: 'Engineering', color: 'var(--accent-500)', match: s => ['ENGINEERING', 'MENUNGGU_PERSETUJUAN_GAMBAR', 'SIAP_PRODUKSI'].includes(s) },
    { label: 'QC / FAT', color: 'var(--success-500)', match: s => s === 'QC_FAT' },
  ]
  const counted = groups.map(g => ({ ...g, count: proyekList.value.filter(p => g.match(p.status)).length }))
  const used = counted.reduce((a, g) => a + g.count, 0)
  return [
    ...counted,
    { label: 'Lainnya', color: 'var(--neutral-600)', match: () => false, count: proyekList.value.length - used },
  ]
})

const donutCircumference = 2 * Math.PI * 48

const donutSegments = computed(() => {
  const total = statusLegend.value.reduce((a, s) => a + s.count, 0)
  if (!total) return []
  let offset = 0
  return statusLegend.value.filter(s => s.count > 0).map(s => {
    const length = (s.count / total) * donutCircumference
    const segment = { label: s.label, color: s.color, length, offset }
    offset += length
    return segment
  })
})

// ─── Antrean approval — bersama dengan Platform & badge sidebar ──────────────
const approvalTypeKey: Record<string, string> = {
  'Quotation': 'qt',
  'Purchase Order': 'po',
  'BOM Final': 'bom',
  'Sales Order': 'so',
}

interface ApprovalRow {
  id: string; ref: string; type: string; typeLabel: string
  doc: string; from: string; value: string
}

const pendingApprovals = computed<ApprovalRow[]>(() =>
  mockApprovalQueue.value.filter(a => a.status === 'Pending').map(a => ({
    id: a.id,
    ref: a.ref,
    type: approvalTypeKey[a.type] || 'qt',
    typeLabel: a.type,
    doc: `${a.ref} — ${a.description}`,
    from: `${a.requestedBy} → ${a.approver}`,
    value: a.amount ? formatCurrency(a.amount) : 'Tanpa nilai',
  }))
)

// Konfirmasi dua klik — mencegah persetujuan tidak sengaja
const confirmingApproval = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

const armConfirm = (id: string) => {
  confirmingApproval.value = id
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => { confirmingApproval.value = null }, 4000)
}

const settleApproval = (ap: ApprovalRow, status: 'Approved' | 'Rejected', fn: (title: string, msg: string) => void) => {
  if (confirmingApproval.value !== ap.id) {
    armConfirm(ap.id)
    return
  }
  clearTimeout(confirmTimer)
  confirmingApproval.value = null
  const row = mockApprovalQueue.value.find(a => a.id === ap.id)
  if (row) row.status = status
  fn(ap.ref, status === 'Approved'
    ? `${ap.ref} telah disetujui dan dokumen hilir dapat dilanjutkan`
    : `${ap.ref} ditolak — pengaju perlu memperbarui dokumen`)
}

const approve = (ap: ApprovalRow) => settleApproval(ap, 'Approved', toast.success)
const reject = (ap: ApprovalRow) => settleApproval(ap, 'Rejected', toast.warning)

// Alert stok dihitung dari Item Master (stok ≤ reorder point)
const stockAlerts = computed(() =>
  items.value
    .filter(i => i.stock <= i.reorder)
    .map(i => ({
      id: i.id,
      code: i.code,
      name: i.name,
      stock: i.stock,
      reorder: i.reorder,
      uom: i.uom,
      level: i.stock < i.reorder ? 'critical' : 'warning',
    }))
)
</script>

<style scoped>
.dashboard {
  max-width: 1600px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 320px;
  gap: var(--space-5);
}

/* Activity Feed */
.activity-feed {
  padding: 0;
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  transition: background var(--transition-fast);
  position: relative;
  border-bottom: 1px solid var(--border-subtle);
}

.activity-item:last-child { border-bottom: none; }
.activity-item:hover { background: var(--bg-glass); }
.activity-item.urgent { border-left: 3px solid var(--danger-500); }

.activity-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.activity-content { flex: 1; min-width: 0; }
.activity-msg { line-height: 1.4; }
.activity-meta { display: flex; align-items: center; gap: var(--space-2); margin-top: 3px; }

.urgent-dot {
  width: 8px;
  height: 8px;
  background: var(--danger-500);
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

/* Donut Chart */
.status-chart {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.status-donut {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-value {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.donut-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Approvals */
.approval-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
}

.approval-item:last-child { border-bottom: none; }
.approval-item:hover { background: var(--bg-glass); }

.approval-type-badge {
  width: 38px;
  height: 26px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.type-qt { background: rgba(59,130,246,0.2); color: var(--text-info); }
.type-bom { background: var(--tint-primary-bg); color: var(--text-accent); }
.type-pr { background: rgba(245,158,11,0.2); color: var(--text-warning); }
.type-po { background: rgba(245,158,11,0.2); color: var(--text-warning); }
.type-ncr { background: rgba(239,68,68,0.2); color: var(--text-danger); }

.approval-info { flex: 1; min-width: 0; }

.btn-success-ghost {
  background: rgba(16,185,129,0.15);
  color: var(--text-success);
  border: 1px solid rgba(16,185,129,0.25);
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-success-ghost:hover { background: rgba(16,185,129,0.25); }

/* Stock Alerts */
.stock-alert-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.stock-alert-item:last-child { border-bottom: none; }

.stock-alert-indicator {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.level-critical { background: var(--danger-500); }
.level-warning { background: var(--warning-500); }

.stock-alert-info { flex: 1; min-width: 0; }
.stock-alert-numbers { text-align: right; flex-shrink: 0; }

@media (max-width: 1300px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
  .dashboard-grid > .card:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
