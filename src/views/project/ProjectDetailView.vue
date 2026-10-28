<template>
  <div v-if="project">
    <!-- Header: Breadcrumb rantai -->
    <div class="chain-breadcrumb" id="chain-breadcrumb">
      <router-link to="/sales/quotations" class="crumb-link">{{ soData?.source_id || 'QT-…' }}</router-link>
      <span class="crumb-sep">›</span>
      <router-link to="/sales/orders" class="crumb-link">{{ project.so_id }}</router-link>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">{{ project.id }}</span>
    </div>

    <!-- Page Header -->
    <div class="page-header" style="margin-top: 8px;">
      <div class="flex items-center gap-4">
        <button class="btn btn-secondary btn-sm btn-icon" @click="$router.back()" id="btn-back">←</button>
        <div>
          <div class="flex items-center gap-3">
            <span class="mono text-sm text-tertiary">{{ project.id }}</span>
            <span :class="['badge', statusBadgeClass(project.status)]">{{ statusLabel(project.status) }}</span>
          </div>
          <h1 class="page-title" style="margin-top: 2px;">{{ project.name }}</h1>
          <p class="page-subtitle">{{ project.customer }} · PM: {{ project.pm }} · {{ project.panels.length }} panel</p>
        </div>
      </div>
      <div class="flex gap-3">
        <router-link :to="`/sales/orders`" class="btn btn-secondary btn-sm" id="btn-view-so">📝 Lihat SO</router-link>
        <button class="btn btn-secondary btn-sm" id="btn-add-vo" @click="showVOModal = true"
                v-if="['ENGINEERING','SIAP_PRODUKSI','PRODUKSI','QC_FAT'].includes(project.status)">
          📋 Variation Order
        </button>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="kpi-contract-value">
        <div class="stat-label">Nilai Kontrak</div>
        <div class="stat-value text-accent" style="font-size: 22px;">{{ formatCurrencyChain(project.contract_value) }}</div>
        <div class="text-xs text-tertiary">+ VO: {{ formatCurrencyChain(project.variation_orders.reduce((s,v) => s + v.delta_amount, 0)) }}</div>
      </div>
      <div class="stat-card" id="kpi-progress">
        <div class="stat-label">Progres Keseluruhan</div>
        <div class="stat-value" style="font-size: 22px;">{{ overallProgress }}%</div>
        <div class="progress-bar" style="margin-top: 8px;">
          <div class="progress-fill" :class="overallProgress >= 80 ? 'success' : overallProgress < 30 ? 'warning' : ''"
               :style="`width: ${overallProgress}%`"></div>
        </div>
      </div>
      <div class="stat-card" id="kpi-termin">
        <div class="stat-label">Termin Siap Ditagih</div>
        <div class="stat-value text-warning" style="font-size: 22px;">{{ siapDitagihCount }}</div>
        <div class="text-xs text-tertiary">dari {{ project.payment_terms.length }} termin</div>
      </div>
      <div class="stat-card" id="kpi-panels">
        <div class="stat-label">Panel / Unit</div>
        <div class="stat-value" style="font-size: 22px;">{{ project.panels.length }}</div>
        <div class="text-xs text-tertiary">{{ panelStats }}</div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         STEPPER ALUR PROYEK (spec 13.2)
    ═══════════════════════════════════════════════════════════════ -->
    <div class="chain-stepper" id="chain-stepper">
      <div v-for="(step, idx) in projectSteps" :key="step.id"
           :class="['stepper-step', step.state]" :id="`step-${step.id}`">
        <div class="step-connector-left" v-if="idx > 0"></div>
        <div class="step-node">
          <div class="step-icon">
            <span v-if="step.state === 'SELESAI'">✓</span>
            <span v-else-if="step.state === 'AKTIF'">●</span>
            <span v-else-if="step.state === 'TERBLOKIR'">🔒</span>
            <span v-else-if="step.state === 'PERLU_TINJAU'">⚠</span>
            <span v-else>○</span>
          </div>
        </div>
        <div class="step-label">{{ step.label }}</div>
        <div class="step-reason text-xs" v-if="step.reason">{{ step.reason }}</div>
        <div class="step-connector-right" v-if="idx < projectSteps.length - 1"></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px;" id="project-detail-tabs">
      <button v-for="t in tabs" :key="t.id" :class="['tab-btn', activeTab === t.id && 'active']"
              @click="activeTab = t.id" :id="`tab-${t.id}`">{{ t.label }}</button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         TAB: PANEL (pusat kerja per panel)
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'panels'" class="tab-content" id="tab-content-panels">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="font-semibold">Tabel Panel — Aksi per Unit</div>
            <div class="text-xs text-tertiary">Klik aksi di baris panel: <strong>Item BOM</strong> untuk mengisi material → Ajukan/Setujui BOM → Dokumen → Rilis → WO → FAT</div>
          </div>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="table" id="table-panels">
            <thead>
              <tr>
                <th>Panel</th>
                <th>BOM</th>
                <th>Dok. Teknis</th>
                <th>Work Order</th>
                <th>FAT</th>
                <th>Status</th>
                <th>Aksi Rantai</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="panel in project.panels" :key="panel.id" :id="`row-panel-${panel.id}`">
                <td>
                  <div class="font-medium text-primary">{{ panel.name }}</div>
                  <div class="text-xs text-tertiary mono">{{ panel.id }}</div>
                  <div class="text-xs text-tertiary">SN: {{ panel.serial }}</div>
                </td>
                <td>
                  <span :class="['badge', statusBadgeClass(panel.bom_status)]">{{ panel.bom_rev }} · {{ statusLabel(panel.bom_status) }}</span>
                  <div v-if="revHint(panel.id)" class="text-xs text-warning" style="margin-top:2px;">
                    ⤴ {{ revHint(panel.id) }}
                  </div>
                  <div class="text-xs text-tertiary" style="margin-top:2px;">
                    {{ bomItemCount(panel.id) }} item · {{ bomLongLeadCount(panel.id) }} LL
                  </div>
                </td>
                <td>
                  <div class="doc-status-list">
                    <div v-for="(status, type) in panel.docs_status" :key="type" class="doc-status-row">
                      <span class="text-xs text-tertiary">{{ type }}</span>
                      <span :class="['badge', statusBadgeClass(status)]" style="font-size:9px;">{{ statusLabel(status) }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['badge', statusBadgeClass(panel.wo_status)]">{{ statusLabel(panel.wo_status) }}</span>
                </td>
                <td>
                  <span v-if="panel.fat_status" :class="['badge', statusBadgeClass(panel.fat_status)]">{{ statusLabel(panel.fat_status) }}</span>
                  <span v-else class="text-xs text-tertiary">—</span>
                </td>
                <td>
                  <span :class="['badge', panelStatusBadge(panel.status)]">{{ panel.status }}</span>
                  <div class="mini-progress">
                    <div class="progress-bar" style="width:60px;margin-top:4px;">
                      <div class="progress-fill" :style="`width:${panel.progress}%`"></div>
                    </div>
                    <span class="text-xs">{{ panel.progress }}%</span>
                  </div>
                </td>
                <td>
                  <div class="panel-actions">
                    <!-- BOM: Editor item (input material per panel) -->
                    <button class="btn btn-xs btn-secondary" :id="`panel-bom-items-${panel.id}`"
                            @click="openBomEditor(panel.id)">
                      🧮 Item BOM ({{ bomItemCount(panel.id) }})
                    </button>

                    <!-- BOM: Ajukan Review (G04) — bila ada revisi Draft -->
                    <button v-if="hasEditableBom(panel.id)"
                            class="btn btn-xs btn-secondary" :id="`panel-bom-ajukan-${panel.id}`"
                            @click="doAjukanBOM(panel.id)">
                      📋 Ajukan {{ latestBomRev(panel.id) }} Review
                    </button>
                    <!-- BOM: Setujui (G05) — bila ada yang IN_REVIEW -->
                    <button v-if="hasReviewBom(panel.id)"
                            class="btn btn-xs btn-success-ghost" :id="`panel-bom-setujui-${panel.id}`"
                            @click="doSetujuiBOM(panel.id)">
                      ✓ Setujui {{ reviewBomRev(panel.id) }}
                    </button>

                    <!-- Dokumen: Setujui AFC -->
                    <div v-if="panel.bom_status === 'APPROVED'" class="doc-actions">
                      <div v-for="(status, type) in panel.docs_status" :key="type">
                        <button v-if="status !== 'AFC'"
                                class="btn btn-xs btn-secondary" :id="`panel-doc-${type}-${panel.id}`"
                                @click="doSetujuiDoc(panel.id, type)">
                          📄 AFC {{ type }}
                        </button>
                      </div>
                    </div>

                    <!-- RILIS KE PRODUKSI (G06) -->
                    <div class="action-gate-wrapper" v-if="panel.bom_status === 'APPROVED'">
                      <button
                        class="btn btn-xs btn-primary"
                        :class="{ 'btn-disabled': !canReleaseToProduction(panel).ok }"
                        :disabled="!canReleaseToProduction(panel).ok"
                        :id="`panel-rilis-${panel.id}`"
                        :title="canReleaseToProduction(panel).reason"
                        @click="doRilis(panel.id)"
                      >🚀 Rilis ke Produksi</button>
                      <div v-if="!canReleaseToProduction(panel).ok" class="gate-reason">
                        {{ canReleaseToProduction(panel).reason }}
                      </div>
                    </div>

                    <!-- WO: Mulai FAT setelah WO selesai -->
                    <button v-if="panel.wo_status === 'SELESAI' && !panel.fat_status"
                            class="btn btn-xs btn-primary" :id="`panel-fat-${panel.id}`"
                            @click="doMulaiFAT(panel.id)">
                      🔬 Mulai FAT
                    </button>

                    <!-- FAT: Tetapkan Lulus -->
                    <button v-if="panel.fat_status === 'BERJALAN'"
                            class="btn btn-xs btn-success-ghost" :id="`panel-fat-lulus-${panel.id}`"
                            @click="doFATLulus(panel.id)">
                      ✓ Tetapkan Lulus
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         TAB: TERMIN & INVOICE
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'termin'" class="tab-content" id="tab-content-termin">
      <div class="card">
        <div class="card-header">
          <div class="font-semibold">Jadwal Termin &amp; Invoice</div>
          <div class="text-xs text-tertiary">Invoice dibuat dari termin yang berstatus Siap Ditagih (pemicu milestone otomatis)</div>
        </div>
        <div class="card-body" style="padding: 0;">
          <table class="table" id="table-termin">
            <thead>
              <tr>
                <th>Nama Termin</th>
                <th>Persentase</th>
                <th>Nilai</th>
                <th>Pemicu</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="term in project.payment_terms" :key="term.id" :id="`row-term-${term.id}`"
                  :class="{ 'row-siap': term.status === 'SIAP_DITAGIH' }">
                <td class="font-medium">{{ term.name }}</td>
                <td class="text-accent font-semibold">{{ term.percentage }}%</td>
                <td class="font-semibold">{{ formatCurrencyChain(term.amount) }}</td>
                <td>
                  <span class="badge badge-neutral" style="font-size:10px;">{{ triggerLabel(term.trigger_event) }}</span>
                </td>
                <td>
                  <span :class="['badge', statusBadgeClass(term.status)]">{{ statusLabel(term.status) }}</span>
                </td>
                <td>
                  <!-- G12: Terbitkan Invoice -->
                  <button
                    v-if="term.status === 'SIAP_DITAGIH'"
                    class="btn btn-sm btn-primary"
                    :id="`btn-invoice-${term.id}`"
                    @click="doTerbitkanInvoice(term)"
                  >💳 Terbitkan Invoice</button>
                  <span v-else-if="term.status === 'BELUM_JATUH_TEMPO'" class="text-xs text-tertiary">Menunggu pemicu</span>
                  <span v-else-if="term.status === 'DITAGIH'" class="badge badge-primary">Ditagih</span>
                  <span v-else-if="term.status === 'LUNAS'" class="badge badge-success">✓ Lunas</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         TAB: DOKUMEN TERKAIT
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'documents'" class="tab-content" id="tab-content-documents">
      <div class="card">
        <div class="card-header">
          <div class="font-semibold">Dokumen Terkait — Rantai Dokumen</div>
        </div>
        <div class="card-body">
          <div class="doc-chain-grid">
            <div class="doc-chain-item">
              <div class="doc-chain-label">Prospek</div>
              <div class="doc-chain-ref">{{ soData?.source_id }}</div>
            </div>
            <div class="chain-arrow">→</div>
            <div class="doc-chain-item">
              <div class="doc-chain-label">Quotation</div>
              <div class="doc-chain-ref">{{ soData?.source_id }}</div>
            </div>
            <div class="chain-arrow">→</div>
            <div class="doc-chain-item">
              <div class="doc-chain-label">Sales Order</div>
              <div class="doc-chain-ref">{{ project.so_id }}</div>
              <span :class="['badge', statusBadgeClass(soData?.status || '')]" v-if="soData">{{ statusLabel(soData.status) }}</span>
            </div>
            <div class="chain-arrow">→</div>
            <div class="doc-chain-item current">
              <div class="doc-chain-label">Proyek</div>
              <div class="doc-chain-ref">{{ project.id }}</div>
              <span :class="['badge', statusBadgeClass(project.status)]">{{ statusLabel(project.status) }}</span>
            </div>
          </div>

          <!-- Panel documents -->
          <div style="margin-top: 24px;">
            <div class="font-semibold text-sm" style="margin-bottom: 12px;">Dokumen per Panel</div>
            <div v-for="panel in project.panels" :key="panel.id" class="panel-doc-card">
              <div class="panel-doc-header">
                <span class="font-medium text-sm">{{ panel.name }}</span>
                <span class="mono text-xs text-tertiary">{{ panel.id }}</span>
              </div>
              <div class="panel-doc-items">
                <div class="doc-item">
                  <span class="text-xs text-tertiary">BOM {{ panel.bom_rev }}</span>
                  <span :class="['badge', statusBadgeClass(panel.bom_status)]" style="font-size:10px;">{{ statusLabel(panel.bom_status) }}</span>
                </div>
                <div v-for="(status, type) in panel.docs_status" :key="type" class="doc-item">
                  <span class="text-xs text-tertiary">{{ type }}</span>
                  <span :class="['badge', statusBadgeClass(status)]" style="font-size:10px;">{{ statusLabel(status) }}</span>
                </div>
                <div class="doc-item">
                  <span class="text-xs text-tertiary">Work Order</span>
                  <span :class="['badge', statusBadgeClass(panel.wo_status)]" style="font-size:10px;">{{ statusLabel(panel.wo_status) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         TAB: LOG AKTIVITAS
    ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'log'" class="tab-content" id="tab-content-log">
      <div class="card">
        <div class="card-header">
          <div class="font-semibold">Timeline Status (status_log)</div>
        </div>
        <div class="activity-feed">
          <div v-if="projectLogs.length === 0" class="empty-state" style="padding: 32px;">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">Belum ada log aktivitas</div>
          </div>
          <div v-for="log in projectLogs" :key="log.id" class="log-item">
            <div class="log-dot"></div>
            <div class="log-content">
              <div class="text-sm">
                <span class="font-medium">{{ log.doc_type }}</span>
                <span class="mono text-xs text-tertiary"> · {{ log.doc_id }}</span>
              </div>
              <div class="text-sm text-primary">
                <span :class="['badge', 'badge-neutral']" style="font-size:10px;">{{ log.from_status || '—' }}</span>
                <span class="text-tertiary"> → </span>
                <span class="badge badge-primary" style="font-size:10px;">{{ log.to_status }}</span>
                <span class="text-tertiary text-xs"> · {{ log.action }}</span>
              </div>
              <div class="text-xs text-tertiary">{{ log.by_user }} · {{ log.at }}</div>
              <div v-if="log.reason" class="text-xs text-warning">Alasan: {{ log.reason }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal VO -->
    <div class="modal-overlay" v-if="showVOModal" @click.self="showVOModal = false" id="modal-add-vo">
      <div class="modal" style="max-width: 560px;">
        <div class="modal-header">
          <span class="font-semibold">Ajukan Variation Order — {{ project.id }}</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showVOModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:grid;gap:12px;">
            <div class="input-group">
              <label class="input-label">Judul Perubahan *</label>
              <input type="text" class="input" v-model="voForm.title" placeholder="Tambahan panel MCC-05" />
            </div>
            <div class="input-group">
              <label class="input-label">Justifikasi *</label>
              <textarea class="input" rows="3" v-model="voForm.reason" style="height:auto;padding:10px;"></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="input-group">
                <label class="input-label">Selisih Harga (Rp)</label>
                <input type="number" class="input" v-model.number="voForm.delta_amount" step="1000000" />
              </div>
              <div class="input-group">
                <label class="input-label">Selisih Hari</label>
                <input type="number" class="input" v-model.number="voForm.delta_days" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showVOModal = false">Batal</button>
          <button class="btn btn-primary" @click="submitVO" :disabled="!voForm.title">Ajukan VO</button>
        </div>
      </div>
    </div>
    <!-- Editor BOM per panel -->
    <BomEditor v-if="bomEditorPanel && project"
               :project-id="project.id" :panel-id="bomEditorPanel"
               @close="bomEditorPanel = ''" />
  </div>

  <div v-else class="empty-state" id="project-not-found">
    <div class="empty-state-icon">🔍</div>
    <div class="empty-state-title">Proyek tidak ditemukan</div>
    <button class="btn btn-secondary" @click="$router.push('/projects')">← Kembali</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  proyekList, salesOrders, statusLog,
  canReleaseToProduction,
  ajukanReviewBOM, setujuiBOM, setujuiDokumen, rilisKeProduksi,
  latestBom, draftBom, effectiveBom, getBomsForPanel,
  formatCurrencyChain, statusBadgeClass, statusLabel,
  type PanelItem, type PaymentTerm,
} from '../../data/chainStore'
import BomEditor from '../../components/BomEditor.vue'
import { useToast } from '../../data/toastStore'

const route = useRoute()
const toast = useToast()

const showVOModal = ref(false)
const voForm = ref({ title: '', reason: '', delta_amount: 0, delta_days: 0 })

const project = computed(() => proyekList.value.find(p => p.id === route.params.id))
const soData = computed(() => project.value ? salesOrders.value.find(s => s.id === project.value?.so_id) : undefined)

const activeTab = ref('panels')

const tabs = [
  { id: 'panels', label: '📐 Panel & Alur' },
  { id: 'termin', label: '💳 Termin & Invoice' },
  { id: 'documents', label: '📄 Dokumen Terkait' },
  { id: 'log', label: '📋 Log Aktivitas' },
]

// ─── Editor item BOM per panel ───────────────────────────────────────────────
const bomEditorPanel = ref('')
const openBomEditor = (panelId: string) => { bomEditorPanel.value = panelId }
const bomItemCount = (panelId: string) => latestBom(panelId)?.items.length ?? 0
const bomLongLeadCount = (panelId: string) =>
  (latestBom(panelId)?.items.filter(l => l.is_long_lead).length ?? 0)

const hasEditableBom = (panelId: string) => draftBom(panelId)?.status === 'DRAFT'
const hasReviewBom = (panelId: string) => getBomsForPanel(panelId).some(b => b.status === 'IN_REVIEW')
const latestBomRev = (panelId: string) => draftBom(panelId)?.rev || 'BOM'
const reviewBomRev = (panelId: string) =>
  [...getBomsForPanel(panelId)].filter(b => b.status === 'IN_REVIEW').sort((a, b) => b.version - a.version)[0]?.rev || 'BOM'
/** Tanda bila ada revisi lebih baru dari BOM yang sedang berlaku */
const revHint = (panelId: string) => {
  const eff = effectiveBom(panelId)
  const lat = latestBom(panelId)
  if (!eff || !lat || lat.id === eff.id || lat.status === eff.status) return ''
  return `Revisi ${lat.rev} ${statusLabel(lat.status)} menunggu (BOM berlaku: ${eff.rev})`
}

const overallProgress = computed(() => {
  if (!project.value || project.value.panels.length === 0) return 0
  const avg = project.value.panels.reduce((s, p) => s + p.progress, 0) / project.value.panels.length
  return Math.round(avg)
})

const siapDitagihCount = computed(() =>
  project.value?.payment_terms.filter(t => t.status === 'SIAP_DITAGIH').length || 0
)

const panelStats = computed(() => {
  if (!project.value) return ''
  const prod = project.value.panels.filter(p => p.status === 'PRODUKSI').length
  const done = project.value.panels.filter(p => ['SIAP_KIRIM','TERKIRIM'].includes(p.status)).length
  return `${prod} produksi · ${done} selesai`
})

// ─── Stepper Proyek ───────────────────────────────────────────────────────────

interface StepInfo {
  id: string; label: string
  state: 'SELESAI'|'AKTIF'|'MENUNGGU'|'TERBLOKIR'|'PERLU_TINJAU'
  reason?: string
}

const projectSteps = computed((): StepInfo[] => {
  const prj = project.value
  if (!prj) return []
  const panels = prj.panels

  const allP = (fn: (p: PanelItem) => boolean) => panels.length > 0 && panels.every(fn)
  const anyP = (fn: (p: PanelItem) => boolean) => panels.some(fn)

  const bomApproved = allP(p => p.bom_status === 'APPROVED')
  const bomActive = anyP(p => p.bom_status !== 'APPROVED')
  const docAFC = allP(p => Object.values(p.docs_status).every(s => s === 'AFC'))
  const docActive = anyP(p => Object.values(p.docs_status).some(s => s !== 'AFC'))
  const rilisOk = bomApproved && docAFC
  const woStarted = anyP(p => ['BERJALAN','SELESAI'].includes(p.wo_status))
  const woAll = allP(p => p.wo_status === 'SELESAI')
  const fatStarted = anyP(p => p.fat_status !== null)
  const fatAll = allP(p => ['LULUS','LULUS_DENGAN_CATATAN'].includes(p.fat_status || ''))
  const delivered = ['TERKIRIM','BAST','GARANSI','DITUTUP'].includes(prj.status)
  const invoiced = prj.payment_terms.every(t => t.status === 'LUNAS')

  return [
    { id: 'qt', label: 'Quotation', state: 'SELESAI' },
    { id: 'so', label: 'Sales Order', state: 'SELESAI' },
    {
      id: 'bom', label: 'BOM',
      state: bomApproved ? 'SELESAI' : bomActive ? 'AKTIF' : 'MENUNGGU'
    },
    {
      id: 'dok', label: 'Dok. Teknis',
      state: docAFC ? 'SELESAI' : docActive ? 'AKTIF' : 'MENUNGGU'
    },
    {
      id: 'rilis', label: 'Rilis',
      state: woStarted ? 'SELESAI' : rilisOk ? 'AKTIF' : 'TERBLOKIR',
      reason: !rilisOk ? (!bomApproved ? 'BOM belum Approved' : !docAFC ? 'Dokumen belum AFC' : '') : undefined
    },
    {
      id: 'wo', label: 'Produksi',
      state: woAll ? 'SELESAI' : woStarted ? 'AKTIF' : 'MENUNGGU'
    },
    {
      id: 'fat', label: 'QC/FAT',
      state: fatAll ? 'SELESAI' : fatStarted ? 'AKTIF' : 'MENUNGGU'
    },
    { id: 'kirim', label: 'Kirim/BAST', state: delivered ? 'SELESAI' : 'MENUNGGU' },
    { id: 'inv', label: 'Invoice', state: invoiced ? 'SELESAI' : 'MENUNGGU' },
  ]
})

// ─── Aksi Panel ───────────────────────────────────────────────────────────────

const doAjukanBOM = (panelId: string) => {
  if (!project.value) return
  ajukanReviewBOM(project.value.id, panelId)
}
const doSetujuiBOM = (panelId: string) => {
  if (!project.value) return
  setujuiBOM(project.value.id, panelId)
}
const doSetujuiDoc = (panelId: string, docType: string) => {
  if (!project.value) return
  setujuiDokumen(project.value.id, panelId, docType)
}
const doRilis = (panelId: string) => {
  if (!project.value) return
  rilisKeProduksi(project.value.id, panelId)
}
const doMulaiFAT = (panelId: string) => {
  const panel = project.value?.panels.find(p => p.id === panelId)
  if (!panel) return
  panel.fat_status = 'BERJALAN'
  toast.info('FAT Dimulai', `${panel.name} dalam proses pengujian`)
}
const doFATLulus = (panelId: string) => {
  const panel = project.value?.panels.find(p => p.id === panelId)
  if (!panel) return
  panel.fat_status = 'LULUS'
  panel.status = 'SIAP_KIRIM'
  panel.progress = 100
  // Trigger FAT payment term
  const fatTerm = project.value?.payment_terms.find(t => t.trigger_event === 'FAT_PASSED' && t.status === 'BELUM_JATUH_TEMPO')
  if (fatTerm) {
    fatTerm.status = 'SIAP_DITAGIH'
    toast.success('FAT Lulus! 🎉', `${panel.name} lulus FAT. Termin FAT siap ditagih!`)
  } else {
    toast.success('FAT Lulus! 🎉', `${panel.name} lulus FAT dan siap dikirim.`)
  }
}

// ─── Aksi Invoice ─────────────────────────────────────────────────────────────

const doTerbitkanInvoice = (term: PaymentTerm) => {
  term.status = 'DITAGIH'
  toast.success('Invoice Diterbitkan', `Invoice untuk ${term.name} sebesar ${formatCurrencyChain(term.amount)} berhasil diterbitkan`)
}

// ─── Variation Order ─────────────────────────────────────────────────────────

const submitVO = () => {
  if (!project.value || !voForm.value.title) return
  project.value.contract_value += voForm.value.delta_amount
  project.value.variation_orders.push({
    id: `${project.value.id}-VO${String(project.value.variation_orders.length + 1).padStart(2, '0')}`,
    so_id: project.value.so_id, project_id: project.value.id,
    title: voForm.value.title, reason: voForm.value.reason,
    delta_amount: voForm.value.delta_amount, delta_days: voForm.value.delta_days,
    status: 'DRAFT',
    created_at: new Date().toISOString().split('T')[0],
    created_by: 'Budi Santoso',
  })
  showVOModal.value = false
  toast.success('VO Diajukan', `${project.value.id}-VO${project.value.variation_orders.length}`)
}

// ─── Log ──────────────────────────────────────────────────────────────────────

const projectLogs = computed(() => {
  if (!project.value) return []
  return statusLog.value.filter(l =>
    l.doc_id.includes(project.value!.id) ||
    l.doc_id === project.value!.so_id ||
    project.value!.panels.some(p => l.doc_id === p.id || l.doc_id.startsWith(p.id))
  )
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const panelStatusBadge = (s: string) => ({
  ENGINEERING: 'badge-neutral',
  SIAP_PRODUKSI: 'badge-warning',
  PRODUKSI: 'badge-primary',
  SIAP_QC: 'badge-info',
  SIAP_KIRIM: 'badge-warning',
  TERKIRIM: 'badge-success',
}[s] || 'badge-neutral')

const triggerLabel = (ev: string) => ({
  SO_CONFIRMED: 'SO Confirmed',
  FAT_PASSED: 'FAT Lulus',
  DELIVERED: 'Pengiriman',
  BAST_SIGNED: 'BAST Ditandatangani',
  WARRANTY_END: 'Akhir Garansi',
  TANGGAL_TETAP: 'Tanggal Tetap',
}[ev] || ev)
</script>

<style scoped>
/* Chain Breadcrumb */
.chain-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 4px 0;
}
.crumb-link { color: var(--text-accent); text-decoration: none; font-family: var(--font-mono); }
.crumb-link:hover { color: var(--text-primary); text-decoration: underline; }
.crumb-sep { color: var(--text-tertiary); }
.crumb-current { color: var(--text-primary); font-family: var(--font-mono); font-weight: 700; }

/* ─── Chain Stepper ─── */
.chain-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  margin-bottom: 28px;
  padding: 20px 0;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.stepper-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  min-width: 80px;
}

.step-node {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  border: 2px solid var(--border-default);
  background: var(--bg-glass);
  color: var(--text-tertiary);
  position: relative;
  z-index: 1;
  transition: all var(--transition-base);
}

.stepper-step.SELESAI .step-node {
  background: var(--success-700);
  border-color: var(--success-500);
  color: white;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
}

.stepper-step.AKTIF .step-node {
  background: var(--primary-700);
  border-color: var(--primary-400);
  color: #ffffff;
  box-shadow: 0 0 0 4px rgba(59,85,168,0.25);
  animation: stepper-pulse 2s infinite;
}

.stepper-step.TERBLOKIR .step-node {
  background: rgba(239,68,68,0.12);
  border-color: var(--danger-500);
  color: var(--text-danger);
}

.stepper-step.PERLU_TINJAU .step-node {
  background: rgba(245,158,11,0.15);
  border-color: var(--warning-500);
  color: var(--text-warning);
}

@keyframes stepper-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(59,85,168,0.25); }
  50% { box-shadow: 0 0 0 7px rgba(59,85,168,0.1); }
}

/* Connector lines between steps */
.stepper-step::before,
.stepper-step::after {
  content: '';
  position: absolute;
  top: 18px;
  height: 2px;
  width: 50%;
  background: var(--border-default);
  z-index: 0;
}
.stepper-step::before { left: 0; }
.stepper-step::after { right: 0; }
.stepper-step:first-child::before { display: none; }
.stepper-step:last-child::after { display: none; }

.stepper-step.SELESAI::before,
.stepper-step.SELESAI::after { background: var(--success-600); }
.stepper-step.AKTIF::before { background: var(--success-600); }

.step-label {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-align: center;
}
.stepper-step.AKTIF .step-label { color: var(--text-accent); }
.stepper-step.SELESAI .step-label { color: var(--text-success); }
.stepper-step.TERBLOKIR .step-label { color: var(--text-danger); }

.step-reason {
  margin-top: 3px;
  font-size: 9px;
  color: var(--text-danger);
  text-align: center;
  max-width: 80px;
}

/* ─── Panel Table ─── */
.doc-status-list { display: flex; flex-direction: column; gap: 3px; }
.doc-status-row { display: flex; align-items: center; gap: 5px; }

.panel-actions { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.doc-actions { display: flex; flex-direction: column; gap: 3px; }

.action-gate-wrapper { display: flex; flex-direction: column; gap: 3px; }
.gate-reason { font-size: 10px; color: var(--text-danger); max-width: 160px; }
.btn-disabled { opacity: 0.5; cursor: not-allowed; }

.btn-xs {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--border-default);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-success-ghost {
  background: rgba(16,185,129,0.12);
  color: var(--text-success);
  border: 1px solid rgba(16,185,129,0.2);
}
.btn-success-ghost:hover { background: rgba(16,185,129,0.22); }

.mini-progress { display: flex; align-items: center; gap: 5px; }

.row-siap { background: rgba(245,158,11,0.05); }

/* ─── Termin ─── */

/* ─── Log ─── */
.activity-feed { padding: 0; }
.log-item {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
}
.log-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--primary-500);
  flex-shrink: 0;
  margin-top: 5px;
}
.log-content { flex: 1; display: flex; flex-direction: column; gap: 3px; }

/* ─── Doc Chain ─── */
.doc-chain-grid {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.doc-chain-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 16px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.doc-chain-item.current {
  border-color: var(--primary-600);
  background: rgba(59,85,168,0.1);
}
.doc-chain-label { font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
.doc-chain-ref { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--text-primary); }
.chain-arrow { color: var(--text-tertiary); font-size: 18px; }

.panel-doc-card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 10px;
}
.panel-doc-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--bg-glass);
  border-bottom: 1px solid var(--border-subtle);
}
.panel-doc-items {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  flex-wrap: wrap;
}
.doc-item { display: flex; align-items: center; gap: 5px; }
</style>
