<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">CRM & Prospek</h1>
        <p class="page-subtitle">Kelola prospek &amp; peluang bisnis. Drag kartu untuk memindah tahap — guard pipeline yang menegakkan aturan, bukan tulis tangan.</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-lead" @click="() => openAddLeadModal()">+ Prospek / Lead Baru</button>
    </div>

    <!-- Pipeline Stats Bar -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-crm-total">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">🎯</div>
        <div class="stat-value">{{ activeLeads.length }}</div>
        <div class="stat-label">Total Peluang Aktif</div>
      </div>
      <div class="stat-card" id="stat-crm-value">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">💰</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(activeValue) }}</div>
        <div class="stat-label">Estimasi Nilai Pipeline</div>
      </div>
      <div class="stat-card" id="stat-crm-urgent">
        <div class="stat-icon" style="background: rgba(239,68,68,0.15);">🔥</div>
        <div class="stat-value text-danger">{{ urgentLeadsCount }}</div>
        <div class="stat-label">Peluang Urgent</div>
      </div>
      <div class="stat-card" id="stat-crm-won">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">🏆</div>
        <div class="stat-value text-success">{{ wonLeads.length }} · {{ formatCurrency(wonValue) }}</div>
        <div class="stat-label">Deal Menang</div>
      </div>
    </div>

    <!-- Pipeline Kanban Board -->
    <div class="crm-pipeline" id="crm-pipeline">
      <div
        v-for="col in pipelineData" :key="col.stage"
        class="pipeline-col"
        :class="{ 'col-drop-target': dragOverStage === col.stage }"
        :id="`pipeline-${col.stage}`"
        @dragover.prevent="dragOverStage = col.stage"
        @dragleave="dragOverStage = null"
        @drop.prevent="onDrop(col.stage)"
      >
        <div class="pipeline-header">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm">{{ col.stage }}</span>
            <span class="badge badge-neutral text-xs">{{ col.cards.length }}</span>
          </div>
          <span class="text-xs text-accent font-semibold">{{ formatCurrency(col.cards.reduce((sum, c) => sum + c.value, 0)) }}</span>
        </div>
        <div class="pipeline-cards">
          <div
            v-for="card in col.cards" :key="card.id"
            class="pipeline-card card"
            :class="{ 'is-dragging': dragId === card.id }"
            :id="`lead-${card.id}`"
            draggable="true"
            @dragstart="onDragStart(card.id)"
            @dragend="dragId = null; dragOverStage = null"
          >
            <div class="flex justify-between items-start" style="margin-bottom: 8px;">
              <span :class="['badge', priorityBadge(card.priority)]">
                {{ card.priority === 'Urgent' ? '🔥 Urgent' : card.priority === 'Medium' ? '⚡ Medium' : '• Normal' }}
              </span>
              <span class="text-xs text-tertiary">{{ formatDate(card.updated_at) }}</span>
            </div>
            <div class="font-medium text-sm text-primary" style="margin-bottom: 4px; line-height: 1.3;">{{ card.name }}</div>
            <div class="text-xs text-tertiary" style="margin-bottom: 6px;">🏢 {{ card.customer }}</div>
            <div class="text-xs" :class="stageAgeClass(card)" style="margin-bottom: 8px;">
              ⏱ {{ stageAgeDays(card) }} hari di tahap
              <span v-if="closingOverdue(card)" class="text-danger"> · ⚠ closing lewat {{ formatDate(card.expected_closing_date) }}</span>
            </div>
            <div class="flex justify-between items-center" style="padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <span class="font-semibold text-accent text-sm">{{ formatCurrency(card.value) }}</span>
              <span class="text-xs text-secondary bg-glass px-2 py-0.5 rounded">👤 {{ card.owner }}</span>
            </div>
            <div class="flex justify-between items-center" style="margin-top: 6px; gap: 6px;">
              <span class="text-xs text-tertiary" v-if="linkedQtCount(card.id) > 0">📋 {{ linkedQtCount(card.id) }} Quotation</span>
              <span class="text-xs text-tertiary" v-else>📋 belum ada QT</span>
              <span class="card-nav">
                <button v-if="canGoBack(card)" class="nav-btn" :id="`lead-move-back-${card.id}`"
                        title=" Mundur satu tahap" @click.stop="requestMove(card.id, prevStage(card.stage))">←</button>
                <button v-if="canGoFwd(card)" class="nav-btn nav-btn-fwd" :id="`lead-move-fwd-${card.id}`"
                        title=" Maju satu tahap" @click.stop="requestMove(card.id, nextStage(card.stage))">→</button>
              </span>
            </div>
            <!-- Aksi rantai: Buat Quotation dari Prospek (hanya tahap aktif berdokumen) -->
            <div style="margin-top: 8px;" v-if="['Penawaran', 'Negosiasi'].includes(card.stage)">
              <button
                class="chain-action-btn"
                :id="`lead-qt-${card.id}`"
                @click.stop="createQuotationFromLead(card)"
              >📋 Buat Quotation →</button>
            </div>
            <!-- Terminal: alasan outcome tampil -->
            <div v-if="card.stage === 'Kalah'" class="text-xs text-danger" style="margin-top: 8px;">
              ✖ {{ card.outcome_reason }}<span v-if="card.competitor"> · kompetitor: {{ card.competitor }}</span>
            </div>
            <div v-if="card.stage === 'Menang'" class="text-xs text-success" style="margin-top: 8px;">
              ✓ Deal menang
            </div>
          </div>
          <div v-if="col.cards.length === 0" style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 12px;">
            Belum ada lead
          </div>
        </div>
        <button class="pipeline-add-btn" :id="`add-lead-${col.stage}`" @click="openAddLeadModal(col.stage)">+ Tambah ke {{ col.stage }}</button>
      </div>
    </div>

    <!-- Modal Form Tambah Lead Baru (Sesuai PRD §4.2.1 #modal-add-lead) -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" id="modal-add-lead">
      <div class="modal" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Tambah Lead Prospek Baru</span>
            <div class="text-xs text-tertiary">Peluang Tender & Kebutuhan Panel (PRD M1 §4.2.1)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="submitLead">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-lead-name">Nama Proyek Tender *</label>
                <input
                  type="text"
                  class="input"
                  id="input-lead-name"
                  v-model="form.name"
                  placeholder="Contoh: Tender Panel Gedung Kantor Sudirman"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-cust">Pelanggan / Calon Klien *</label>
                <select class="select" id="input-lead-cust" v-model="form.customer_id" required>
                  <option value="" disabled>Pilih Pelanggan...</option>
                  <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-val">Estimasi Nilai Potensi (Rp) *</label>
                <input
                  type="number"
                  class="input"
                  id="input-lead-val"
                  v-model.number="form.value"
                  placeholder="Contoh: 1500000000"
                  min="0"
                  step="10000000"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-stage">Tahap Pipeline *</label>
                <select class="select" id="input-lead-stage" v-model="form.stage" required>
                  <option>Lead</option>
                  <option>Kualifikasi</option>
                  <option>Penawaran</option>
                  <option>Negosiasi</option>
                </select>
                <div class="text-xs text-tertiary" style="margin-top: 4px;">
                  Lead baru tidak bisa langsung Menang/Kalah — pindahkan setelah ada Quotation.
                </div>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-prio">Prioritas</label>
                <select class="select" id="input-lead-prio" v-model="form.priority">
                  <option value="Normal">Normal</option>
                  <option value="Medium">Medium</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-owner">Sales In Charge</label>
                <select class="select" id="input-lead-owner" v-model="form.owner">
                  <option>Rina Mulyani</option>
                  <option>Budi Santoso</option>
                  <option>Andi Wijaya</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-lead-closing">Target Tanggal Closing</label>
                <input
                  type="date"
                  class="input"
                  id="input-lead-closing"
                  v-model="form.expected_closing_date"
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-lead-notes">Catatan & Lingkup Panel</label>
                <textarea
                  class="input"
                  rows="3"
                  id="input-lead-notes"
                  v-model="form.notes"
                  placeholder="Spesifikasi kubikel, kebutuhan MCC/LVMDP, preferensi merk (Schneider/ABB)..."
                  style="height: auto; padding: 10px;"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false" id="btn-cancel-lead">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-lead">Simpan Lead</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal konfirmasi Menang (#modal-win-lead) -->
    <div class="modal-overlay" v-if="winModal" @click.self="closeWinModal" id="modal-win-lead">
      <div class="modal" style="max-width: 480px;">
        <div class="modal-header">
          <span class="font-semibold text-lg">🏆 Tandai Menang</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="closeWinModal">✕</button>
        </div>
        <div class="modal-body" v-if="winTarget">
          <p class="text-sm" style="margin-bottom: 12px;">
            <strong>{{ winTarget.name }}</strong> — {{ winTarget.customer }} · {{ formatCurrency(winTarget.value) }}
          </p>
          <p class="text-xs text-tertiary" style="margin-bottom: 12px;">
            Tahap ini terminal. Pastikan Quotation sudah terbit; setelah Menang, langkah berikutnya adalah konversi ke Sales Order di modul Quotation.
          </p>
          <div class="input-group">
            <label class="input-label" for="input-win-note">Catatan (opsional)</label>
            <input type="text" class="input" id="input-win-note" v-model="winNote" placeholder="Contoh: PO diterima 14 Okt 2026" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeWinModal">Batal</button>
          <button class="btn btn-success" id="btn-confirm-win" @click="confirmWin">Konfirmasi Menang</button>
        </div>
      </div>
    </div>

    <!-- Modal alasan Kalah (#modal-loss-lead) -->
    <div class="modal-overlay" v-if="lossModal" @click.self="closeLossModal" id="modal-loss-lead">
      <div class="modal" style="max-width: 480px;">
        <div class="modal-header">
          <span class="font-semibold text-lg">✖ Tandai Kalah</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="closeLossModal">✕</button>
        </div>
        <div class="modal-body" v-if="lossTarget">
          <p class="text-sm" style="margin-bottom: 12px;">
            <strong>{{ lossTarget.name }}</strong> — {{ lossTarget.customer }} · {{ formatCurrency(lossTarget.value) }}
          </p>
          <div class="input-group" style="margin-bottom: 12px;">
            <label class="input-label" for="input-loss-reason">Alasan Kalah * (dipakai untuk laporan win-loss)</label>
            <select class="select" id="input-loss-reason" v-model="lossReason" required>
              <option value="" disabled>Pilih alasan...</option>
              <option v-for="r in KALAH_REASONS" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label" for="input-loss-competitor">Kompetitor Pemenang (opsional)</label>
            <input type="text" class="input" id="input-loss-competitor" v-model="lossCompetitor" placeholder="Contoh: PT. Panca Listrindo" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeLossModal">Batal</button>
          <button class="btn btn-danger" id="btn-confirm-loss" :disabled="!lossReason" @click="confirmLoss">Konfirmasi Kalah</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatCurrency, mockCustomers } from '../../data/mockData'
import {
  prospekList, createProspek, moveProspek, linkedQuotations,
  PROSPEK_STAGES, KALAH_REASONS,
  type Prospek, type ProspekStage, type ProspekPriority,
} from '../../data/chainStore'
import { useToast } from '../../data/toastStore'

const router = useRouter()
const toast = useToast()

const customerOptions = computed(() =>
  mockCustomers.map(c => ({ id: c.id, name: c.name })))

const formatDate = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Kanban dari store tunggal (bukan mock lokal) ────────────────────────────
const cardsFor = (stage: ProspekStage) =>
  prospekList.value
    .filter(p => p.stage === stage)
    .map(p => ({ ...p, value: p.value }))

const pipelineData = computed(() =>
  PROSPEK_STAGES.map(stage => ({ stage, cards: cardsFor(stage) })))

const activeLeads = computed(() => prospekList.value.filter(p => !['Menang', 'Kalah'].includes(p.stage)))
const activeValue = computed(() => activeLeads.value.reduce((s, p) => s + p.value, 0))
const urgentLeadsCount = computed(() => activeLeads.value.filter(p => p.priority === 'Urgent').length)
const wonLeads = computed(() => prospekList.value.filter(p => p.stage === 'Menang'))
const wonValue = computed(() => wonLeads.value.reduce((s, p) => s + p.value, 0))

const linkedQtCount = (id: string) => linkedQuotations(id).filter(q => q.status !== 'DIGANTIKAN').length

// ─── Navigasi tahap ──────────────────────────────────────────────────────────
const nextStage = (s: ProspekStage): ProspekStage =>
  PROSPEK_STAGES[PROSPEK_STAGES.indexOf(s) + 1] || s
const prevStage = (s: ProspekStage): ProspekStage =>
  PROSPEK_STAGES[PROSPEK_STAGES.indexOf(s) - 1] || s
const canGoFwd = (card: Prospek) => card.stage !== 'Kalah' && card.stage !== 'Menang'
const canGoBack = (card: Prospek) => card.stage !== 'Lead'

const stageAgeDays = (card: Prospek) => {
  const start = new Date(card.updated_at || card.created_at).getTime()
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000))
}
const stageAgeClass = (card: Prospek) => stageAgeDays(card) > 14 ? 'text-warning' : 'text-tertiary'
const closingOverdue = (card: Prospek) =>
  !!card.expected_closing_date && !['Menang', 'Kalah'].includes(card.stage) &&
  new Date(card.expected_closing_date) < new Date()

const priorityBadge = (p: string) => {
  if (p === 'Urgent') return 'badge-danger'
  if (p === 'Medium') return 'badge-warning'
  return 'badge-neutral'
}

// ─── Drag & drop + tombol Maju/Mundur ────────────────────────────────────────
const dragId = ref<string | null>(null)
const dragOverStage = ref<ProspekStage | null>(null)
const onDragStart = (id: string) => { dragId.value = id }
const onDrop = (stage: ProspekStage) => {
  const id = dragId.value
  dragId.value = null
  dragOverStage.value = null
  if (id) requestMove(id, stage)
}

/** Titik masuk tunggal pindah tahap: terminal → modal, selain itu → langsung. */
const requestMove = (id: string, to: ProspekStage) => {
  if (to === 'Kalah') { openLossModal(id); return }
  if (to === 'Menang') { openWinModal(id); return }
  const res = moveProspek(id, to)
  if (res.ok) toast.success('Tahap Diperbarui', res.message)
  else toast.error('Pindah Tahap Ditolak', res.message)
}

// ─── Modal Menang ────────────────────────────────────────────────────────────
const winModal = ref(false)
const winTargetId = ref('')
const winNote = ref('')
const winTarget = computed(() => prospekList.value.find(p => p.id === winTargetId.value))
const openWinModal = (id: string) => {
  const p = prospekList.value.find(x => x.id === id)
  if (!p) return
  if (linkedQuotations(id).filter(q => q.status !== 'DIGANTIKAN' && q.status !== 'KALAH').length === 0) {
    toast.error('Pindah Tahap Ditolak', 'Tahap Menang mensyaratkan minimal 1 Quotation terbit. Buat Quotation dulu dari prospek ini.')
    return
  }
  winTargetId.value = id
  winNote.value = ''
  winModal.value = true
}
const closeWinModal = () => { winModal.value = false; winTargetId.value = '' }
const confirmWin = () => {
  const res = moveProspek(winTargetId.value, 'Menang', { reason: winNote.value || undefined })
  closeWinModal()
  if (res.ok) toast.success('Deal Menang! 🏆', res.message)
  else toast.error('Gagal', res.message)
}

// ─── Modal Kalah ─────────────────────────────────────────────────────────────
const lossModal = ref(false)
const lossTargetId = ref('')
const lossReason = ref('')
const lossCompetitor = ref('')
const lossTarget = computed(() => prospekList.value.find(p => p.id === lossTargetId.value))
const openLossModal = (id: string) => {
  lossTargetId.value = id
  lossReason.value = ''
  lossCompetitor.value = ''
  lossModal.value = true
}
const closeLossModal = () => { lossModal.value = false; lossTargetId.value = '' }
const confirmLoss = () => {
  if (!lossReason.value) return
  const res = moveProspek(lossTargetId.value, 'Kalah', { reason: lossReason.value, competitor: lossCompetitor.value })
  closeLossModal()
  if (res.ok) toast.warning('Ditandai Kalah', res.message)
  else toast.error('Gagal', res.message)
}

// ─── Form tambah lead ────────────────────────────────────────────────────────
const showModal = ref(false)
const form = ref({
  name: '', customer_id: '', value: 1_000_000_000,
  stage: 'Lead' as ProspekStage, priority: 'Normal' as ProspekPriority,
  owner: 'Rina Mulyani', expected_closing_date: '', notes: '',
})

const openAddLeadModal = (stageTarget: string = 'Lead') => {
  const stage = (PROSPEK_STAGES as string[]).includes(stageTarget) && !['Menang', 'Kalah'].includes(stageTarget)
    ? stageTarget as ProspekStage
    : 'Lead'
  form.value = {
    name: '', customer_id: '', value: 1_000_000_000,
    stage, priority: 'Normal', owner: 'Rina Mulyani', expected_closing_date: '', notes: '',
  }
  showModal.value = true
}

const submitLead = () => {
  const cust = mockCustomers.find(c => c.id === form.value.customer_id)
  const res = createProspek({
    name: form.value.name,
    customer: cust?.name || '',
    customer_id: form.value.customer_id,
    value: form.value.value,
    stage: form.value.stage,
    priority: form.value.priority,
    owner: form.value.owner,
    expected_closing_date: form.value.expected_closing_date,
    notes: form.value.notes,
  })
  if (res.ok) {
    showModal.value = false
    toast.success('Lead Berhasil Dibuat', res.message)
  } else {
    toast.error('Gagal Membuat Lead', res.message)
  }
}

// ─── Aksi: Buat Quotation dari Prospek ───────────────────────────────────────
const createQuotationFromLead = (card: Prospek) => {
  // Prospek sudah ada di store (sumber kebenaran) — cukup bawa konteks ke modul Quotation.
  toast.info('Buat Quotation', `Membuka Quotation — data pelanggan & nilai "${card.name}" (${card.customer}) akan dirujuk (source: ${card.id}).`)
  router.push({ path: '/sales/quotations', query: { prospek: card.id } })
}
</script>

<style scoped>
.chain-action-btn {
  display: inline-block;
  width: 100%;
  text-align: center;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--tint-primary-bg);
  border: 1px solid var(--tint-primary-border);
  border-radius: var(--radius-sm);
  color: var(--text-accent);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.chain-action-btn:hover {
  background: var(--tint-primary-border);
  color: var(--text-primary);
}

.crm-pipeline {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  padding-bottom: var(--space-4);
}

.pipeline-col {
  min-width: 250px;
  max-width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-fast);
}
.pipeline-col.col-drop-target {
  box-shadow: 0 0 0 2px var(--primary-500);
}

.pipeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border-bottom: 2px solid var(--primary-600);
}

.pipeline-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-dim-soft);
  min-height: 220px;
  flex: 1;
}

.pipeline-card {
  padding: var(--space-4);
  cursor: grab;
  transition: all var(--transition-base);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
}
.pipeline-card:active { cursor: grabbing; }
.pipeline-card.is-dragging { opacity: 0.5; }

.pipeline-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-default);
}

.card-nav { display: inline-flex; gap: 4px; }
.nav-btn {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-glass);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
}
.nav-btn:hover { color: var(--text-primary); border-color: var(--primary-500); }
.nav-btn-fwd:hover { background: rgba(59,85,168,0.2); }

.pipeline-add-btn {
  width: 100%;
  padding: 10px;
  background: var(--bg-glass);
  border: 1px dashed var(--border-default);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.pipeline-add-btn:hover {
  color: var(--text-primary);
  background: var(--bg-glass-hover);
  border-color: var(--primary-500);
}
</style>
