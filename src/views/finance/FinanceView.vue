<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Keuangan (Finance)</h1>
        <p class="page-subtitle">Invoice penagihan, AR/AP, dan arus kas proyek (PRD M9 §4.8)</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-export-finance">📊 Export Excel</button>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 16px;" id="fin-chain-hint">
      ℹ️ Invoice dibuat <strong>dari jadwal termin di SO</strong> yang berstatus "Siap Ditagih" (terpicu milestone) — tidak ada tombol "+ Invoice Baru".
    </div>

    <!-- Antrean Termin Siap Ditagih -->
    <div class="card" id="termin-queue-card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="font-semibold">💳 Termin Siap Ditagih</div>
        <span class="badge badge-warning" id="termin-queue-count">{{ readyTerms.length }} termin</span>
      </div>
      <div v-if="readyTerms.length" class="table-container" style="border: none;">
        <table class="table" id="termin-queue-table">
          <thead>
            <tr>
              <th>Termin</th>
              <th>Proyek</th>
              <th>Pelanggan</th>
              <th>Pemicu Milestone</th>
              <th>% </th>
              <th>Nilai Tagihan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in readyTerms" :key="t.id" :id="`row-termin-${t.id}`">
              <td class="font-semibold text-primary text-sm">{{ t.name }}</td>
              <td><span class="badge badge-primary text-xs">{{ t.project }}</span></td>
              <td class="text-secondary text-sm">{{ t.customer }}</td>
              <td><span class="badge badge-info text-xs">{{ t.trigger }}</span></td>
              <td class="font-semibold">{{ t.percent }}%</td>
              <td class="font-semibold">{{ formatCurrency(t.amount) }}</td>
              <td>
                <button class="btn btn-primary btn-sm" :id="`btn-bill-${t.id}`" @click="openInvoiceFromTerm(t)">Terbitkan Invoice</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state" style="padding: 20px;">
        <div class="empty-state-title">Tidak ada termin menunggu penagihan</div>
        <div class="empty-state-desc">Termin menjadi "Siap Ditagih" saat milestone (SO Confirmed, FAT Lulus, BAST) tercapai.</div>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-ar-outstanding">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">💳</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(totalAROutstanding) }}</div>
        <div class="stat-label">AR Outstanding (Piutang)</div>
        <div class="stat-trend trend-up">{{ outstandingCount }} invoice</div>
      </div>
      <div class="stat-card" id="stat-ar-overdue">
        <div class="stat-icon" style="background: rgba(239,68,68,0.15);">⚠️</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(totalAROverdue) }}</div>
        <div class="stat-label">AR Overdue (Jatuh Tempo)</div>
        <div class="stat-trend trend-down" v-if="totalAROverdue > 0">▼ Perlu tindakan segera</div>
      </div>
      <div class="stat-card" id="stat-ap-due">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">📤</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(totalAPDue) }}</div>
        <div class="stat-label">AP Vendor Jatuh Tempo</div>
      </div>
      <div class="stat-card" id="stat-net-cashflow">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">📈</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrency(netCashflow) }}</div>
        <div class="stat-label">Net Cash Flow (Okt)</div>
        <div class="stat-trend trend-up">▲ Surplus Positif</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav" style="margin-bottom: 20px; display: inline-flex; width: auto;">
      <button :class="['tab-btn', activeTab === 'ar' && 'active']" @click="activeTab = 'ar'" id="tab-ar">Invoice / Piutang (AR)</button>
      <button :class="['tab-btn', activeTab === 'ap' && 'active']" @click="activeTab = 'ap'" id="tab-ap">Hutang Usaha (AP)</button>
      <button :class="['tab-btn', activeTab === 'cashflow' && 'active']" @click="activeTab = 'cashflow'" id="tab-cashflow">Proyeksi Arus Kas</button>
    </div>

    <!-- AR / Invoice Tab -->
    <div v-if="activeTab === 'ar'" id="ar-section">
      <div class="card" id="invoice-table-card">
        <div class="card-header">
          <div class="font-semibold">Faktur Penagihan Klien (Invoice & AR)</div>
          <div class="flex gap-2">
            <select class="select" style="width: 160px;" v-model="arFilter" id="filter-ar-status">
              <option value="">Semua Status</option>
              <option value="Paid">Paid</option>
              <option value="Outstanding">Outstanding</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table table-clickable" id="invoice-table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Proyek</th>
                <th>Pelanggan</th>
                <th>Termin</th>
                <th>Jumlah Net</th>
                <th>Tgl Terbit</th>
                <th>Jatuh Tempo</th>
                <th>Tgl Bayar</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in filteredInvoices" :key="inv.id" :id="`row-inv-${inv.id}`">
                <td><div class="mono text-sm font-semibold text-accent">{{ inv.id }}</div></td>
                <td><span class="badge badge-primary text-xs">{{ inv.project }}</span></td>
                <td class="text-secondary text-sm font-medium">{{ inv.customer }}</td>
                <td class="text-secondary text-sm">{{ inv.termin }}</td>
                <td class="font-semibold">{{ formatCurrency(inv.amount) }}</td>
                <td class="text-secondary text-sm">{{ formatDate(inv.issueDate) }}</td>
                <td>
                  <span :class="inv.status === 'Overdue' ? 'text-danger font-semibold text-sm' : 'text-secondary text-sm'">
                    {{ formatDate(inv.dueDate) }}
                  </span>
                </td>
                <td class="text-secondary text-sm">{{ inv.paidDate ? formatDate(inv.paidDate) : '—' }}</td>
                <td>
                  <span :class="['badge', invoiceStatusColors[inv.status] || 'badge-neutral']">{{ inv.status }}</span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-icon btn-secondary btn-sm" :id="`inv-pdf-${inv.id}`" data-tooltip="Cetak Faktur PDF">📄</button>
                    <button class="btn btn-icon btn-secondary btn-sm" :id="`inv-pay-${inv.id}`" v-if="inv.status !== 'Paid'" @click="openPaymentModal(inv)" data-tooltip="Catat Pembayaran Masuk">✅</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- AP Tab -->
    <div v-if="activeTab === 'ap'" id="ap-section">
      <div class="card" id="ap-table-card">
        <div class="card-header">
          <div class="font-semibold">Hutang Usaha (AP) — Pembayaran ke Vendor</div>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table" id="ap-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Vendor</th>
                <th>Ref PO</th>
                <th>Jumlah Hutang</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ap in apItems" :key="ap.id" :id="`row-ap-${ap.id}`">
                <td class="mono text-xs">{{ ap.id }}</td>
                <td class="font-medium text-primary">{{ ap.vendor }}</td>
                <td><span class="badge badge-info text-xs">{{ ap.poId }}</span></td>
                <td class="font-semibold">{{ formatCurrency(ap.amount) }}</td>
                <td>
                  <span :class="ap.status === 'Overdue' ? 'text-danger font-semibold text-sm' : 'text-secondary text-sm'">
                    {{ formatDate(ap.dueDate) }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', ap.status === 'Overdue' ? 'badge-danger' : ap.status === 'Lunas' ? 'badge-success' : 'badge-warning']">{{ ap.status }}</span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" :id="`ap-pay-${ap.id}`" v-if="ap.status !== 'Lunas'" @click="payAP(ap)">Bayar Transfer</button>
                  <span v-else class="text-xs text-success font-semibold">✓ Lunas</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Cash Flow Tab -->
    <div v-if="activeTab === 'cashflow'" id="cashflow-section">
      <div class="card" id="cashflow-card">
        <div class="card-header">
          <div class="font-semibold">Proyeksi Arus Kas — 6 Bulan</div>
          <button class="btn btn-secondary btn-sm" id="btn-cashflow-detail">Detail per Proyek</button>
        </div>
        <div class="card-body">
          <!-- Bar Chart Visual -->
          <div class="cashflow-chart" id="cashflow-chart">
            <div v-for="m in cashFlowData" :key="m.month" class="cashflow-bar-group" :id="`cf-${m.month}`">
              <div class="cashflow-bars">
                <div class="cf-bar-wrap">
                  <div class="cf-bar cf-inflow" :style="`height: ${(m.inflow / maxCF) * 140}px`" :data-tooltip="`Masuk: ${formatCurrency(m.inflow)}`"></div>
                </div>
                <div class="cf-bar-wrap">
                  <div class="cf-bar cf-outflow" :style="`height: ${(m.outflow / maxCF) * 140}px`" :data-tooltip="`Keluar: ${formatCurrency(m.outflow)}`"></div>
                </div>
              </div>
              <div class="cf-month">{{ m.month }}</div>
              <div class="cf-net" :class="m.inflow - m.outflow >= 0 ? 'text-success' : 'text-danger'">
                {{ m.inflow - m.outflow >= 0 ? '+' : '' }}{{ formatCurrency(m.inflow - m.outflow) }}
              </div>
            </div>
          </div>
          <!-- Legend -->
          <div class="flex gap-6 items-center" style="margin-top: 20px; justify-content: center;">
            <div class="flex items-center gap-2">
              <div style="width: 16px; height: 16px; background: var(--success-500); border-radius: 4px;"></div>
              <span class="text-sm text-secondary">Penerimaan (Inflow)</span>
            </div>
            <div class="flex items-center gap-2">
              <div style="width: 16px; height: 16px; background: var(--danger-500); border-radius: 4px;"></div>
              <span class="text-sm text-secondary">Pengeluaran (Outflow)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Penerbitan Invoice Baru (Sesuai PRD §4.8.1 #modal-invoice) -->
    <div class="modal-overlay" v-if="showInvoiceModal" @click.self="showInvoiceModal = false" id="modal-invoice">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Penerbitan Invoice Penagihan Klien</span>
            <div class="text-xs text-tertiary">Faktur Termin Proyek & Piutang Dagang (PRD M9 §4.8.1)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showInvoiceModal = false">✕</button>
        </div>
        <form @submit.prevent="submitInvoice">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-inv-project">Proyek *</label>
                <select class="select" id="input-inv-project" v-model="invForm.project" @change="onSelectInvProject" required>
                  <option value="" disabled>Pilih Proyek...</option>
                  <option value="PRJ-2026-001">PRJ-2026-001 (PT. Semen Indonesia)</option>
                  <option value="PRJ-2026-002">PRJ-2026-002 (PT. PLN Persero)</option>
                  <option value="PRJ-2026-003">PRJ-2026-003 (PT. Tjiwi Kimia)</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">Pelanggan</label>
                <input
                  type="text"
                  class="input"
                  id="input-inv-customer"
                  :value="invForm.customer"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-inv-termin">Termin Penagihan *</label>
                <select class="select" id="input-inv-termin" v-model="invForm.termin" required>
                  <option v-if="!terminOptions.includes(invForm.termin)" :value="invForm.termin">{{ invForm.termin }} (dari jadwal termin SO)</option>
                  <option v-for="t in terminOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-inv-amount">Jumlah Pokok Net (Rp) *</label>
                <input
                  type="number"
                  class="input font-semibold"
                  id="input-inv-amount"
                  v-model.number="invForm.amount"
                  min="1000000"
                  step="1000000"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label">PPN (12%)</label>
                <input
                  type="text"
                  class="input"
                  :value="formatCurrency(invForm.amount * 0.12)"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label">Total Tagihan Bruto</label>
                <input
                  type="text"
                  class="input font-bold text-accent"
                  :value="formatCurrency(invForm.amount * 1.12)"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-inv-date">Tanggal Terbit *</label>
                <input
                  type="date"
                  class="input"
                  id="input-inv-date"
                  v-model="invForm.issueDate"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-inv-due">Tanggal Jatuh Tempo *</label>
                <input
                  type="date"
                  class="input"
                  id="input-inv-due"
                  v-model="invForm.dueDate"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showInvoiceModal = false" id="btn-cancel-invoice">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-invoice">Terbitkan Faktur Invoice</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Form Pencatatan Pembayaran Invoice (Sesuai PRD §4.8.2 #modal-record-payment) -->
    <div class="modal-overlay" v-if="showPaymentModal" @click.self="showPaymentModal = false" id="modal-record-payment">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Catat Pelunasan Pembayaran Klien</span>
            <div class="text-xs text-tertiary">Penerimaan Mutasi Rekening Bank (PRD M9 §4.8.2)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showPaymentModal = false">✕</button>
        </div>
        <form @submit.prevent="submitPayment">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label">No. Invoice</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-pay-inv-id"
                  :value="selectedInv?.id"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label">Total Tagihan</label>
                <input
                  type="text"
                  class="input font-semibold"
                  id="input-pay-inv-total"
                  :value="selectedInv ? formatCurrency(selectedInv.amount) : ''"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-pay-date">Tanggal Terima Pembayaran *</label>
                <input
                  type="date"
                  class="input"
                  id="input-pay-date"
                  v-model="payForm.payDate"
                  required
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-pay-bank">Rekening Kas / Bank Penerima *</label>
                <select class="select" id="input-pay-bank" v-model="payForm.bank" required>
                  <option>BCA Giro Operasional (024-8899)</option>
                  <option>Mandiri Rekening Penampung (135-001)</option>
                  <option>BNI Operasional Proyek</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-pay-ref">Nomor Referensi Bank / Kliring *</label>
                <input
                  type="text"
                  class="input mono"
                  id="input-pay-ref"
                  v-model="payForm.reference"
                  placeholder="TRF-BCA-20261011-9921"
                  required
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showPaymentModal = false" id="btn-cancel-pay">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-pay">Konfirmasi Lunas</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockInvoices, mockCashFlow, mockAPItems } from '../../data/mockDataExtended'
import { formatCurrency, formatDate } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const activeTab = ref('ar')
const showInvoiceModal = ref(false)
const showPaymentModal = ref(false)
const arFilter = ref('')

const invoices = ref([...mockInvoices])
const apItems = ref([...mockAPItems])
const cashFlowData = mockCashFlow

// Jadwal termin dari SO — yang berstatus SIAP_DITAGIH (terpicu milestone)
type PaymentTerm = {
  id: string; name: string; project: string; customer: string
  trigger: string; percent: number; amount: number
}
const paymentTerms = ref<PaymentTerm[]>([
  { id: 'TRM-001', name: 'Termin DP 30%', project: 'PRJ-2026-002', customer: 'PT. PLN (Persero)', trigger: 'SO_CONFIRMED', percent: 30, amount: 3_660_000_000 },
  { id: 'TRM-002', name: 'Termin FAT 50%', project: 'PRJ-2026-001', customer: 'PT. Semen Indonesia', trigger: 'FAT_PASSED', percent: 50, amount: 2_425_000_000 },
  { id: 'TRM-003', name: 'Termin Kirim 20%', project: 'PRJ-2026-003', customer: 'PT. Tjiwi Kimia', trigger: 'DELIVERED', percent: 20, amount: 860_000_000 },
])

const readyTerms = computed(() => paymentTerms.value)

const openInvoiceFromTerm = (term: PaymentTerm) => {
  invForm.value = {
    project: term.project,
    customer: term.customer,
    termin: term.name,
    amount: term.amount,
    issueDate: todayIso,
    dueDate: nextMonthIso
  }
  activeTab.value = 'ar'
  showInvoiceModal.value = true
}

const invoiceStatusColors: Record<string, string> = {
  'Paid': 'badge-success',
  'Outstanding': 'badge-warning',
  'Overdue': 'badge-danger',
}

const filteredInvoices = computed(() => {
  return invoices.value.filter(i => !arFilter.value || i.status === arFilter.value)
})

const totalAROutstanding = computed(() => invoices.value.filter(i => i.status === 'Outstanding').reduce((a, i) => a + i.amount, 0))
const totalAROverdue = computed(() => invoices.value.filter(i => i.status === 'Overdue').reduce((a, i) => a + i.amount, 0))
const totalAPDue = computed(() => apItems.value.filter(a => a.status !== 'Lunas').reduce((a, ap) => a + ap.amount, 0))
const outstandingCount = computed(() => invoices.value.filter(i => i.status !== 'Paid').length)
const netCashflow = computed(() => {
  const okt = cashFlowData.find(m => m.month === 'Okt')
  return okt ? okt.inflow - okt.outflow : 0
})
const maxCF = computed(() => Math.max(...cashFlowData.map(m => Math.max(m.inflow, m.outflow))))

const todayIso = new Date().toISOString().split('T')[0]
const nextMonthIso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]

// Invoice Form State
const terminOptions = ['Termin DP 30%', 'Termin FAT 50%', 'Termin Kirim 20%', 'Retensi 5%']
const invForm = ref({
  project: 'PRJ-2026-001',
  customer: 'PT. Semen Indonesia',
  termin: 'Progress 60%',
  amount: 1455000000,
  issueDate: todayIso,
  dueDate: nextMonthIso
})

const onSelectInvProject = () => {
  if (invForm.value.project === 'PRJ-2026-001') invForm.value.customer = 'PT. Semen Indonesia'
  else if (invForm.value.project === 'PRJ-2026-002') invForm.value.customer = 'PT. PLN (Persero)'
  else if (invForm.value.project === 'PRJ-2026-003') invForm.value.customer = 'PT. Tjiwi Kimia'
}

const submitInvoice = () => {
  const nextSeq = invoices.value.length + 100
  const newInv = {
    id: `INV-2026-${nextSeq}`,
    project: invForm.value.project,
    customer: invForm.value.customer,
    termin: invForm.value.termin,
    amount: invForm.value.amount,
    issueDate: invForm.value.issueDate,
    dueDate: invForm.value.dueDate,
    paidDate: '',
    status: 'Outstanding'
  }

  invoices.value.unshift(newInv)
  showInvoiceModal.value = false
  toast.success('Invoice Berhasil Diterbitkan', `${newInv.id} sebesar ${formatCurrency(newInv.amount)} telah diterbitkan ke ${newInv.customer}`)
}

// Payment Form State
const selectedInv = ref<typeof invoices.value[0] | null>(null)
const payForm = ref({
  payDate: todayIso,
  bank: 'BCA Giro Operasional (024-8899)',
  reference: ''
})

const openPaymentModal = (inv: typeof invoices.value[0]) => {
  selectedInv.value = inv
  payForm.value = {
    payDate: todayIso,
    bank: 'BCA Giro Operasional (024-8899)',
    reference: `TRF-${inv.id.replace('INV-', '')}`
  }
  showPaymentModal.value = true
}

const submitPayment = () => {
  if (!selectedInv.value) return
  selectedInv.value.status = 'Paid'
  selectedInv.value.paidDate = payForm.value.payDate
  showPaymentModal.value = false
  toast.success('Pembayaran Diterima', `${selectedInv.value.id} senilai ${formatCurrency(selectedInv.value.amount)} telah dinyatakan LUNAS`)
}

const payAP = (ap: typeof apItems.value[0]) => {
  ap.status = 'Lunas'
  toast.success('Hutang Dibayar', `Pembayaran ${ap.id} senilai ${formatCurrency(ap.amount)} ke ${ap.vendor} telah ditransfer`)
}
</script>

<style scoped>
.cashflow-chart {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  padding: 20px 0 8px;
  justify-content: center;
}

.cashflow-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.cashflow-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 140px;
}

.cf-bar-wrap {
  display: flex;
  align-items: flex-end;
  height: 140px;
}

.cf-bar {
  width: 28px;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.cf-bar:hover { opacity: 0.8; }

.cf-inflow { background: var(--success-500); }
.cf-outflow { background: var(--danger-500); }

.cf-month {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.cf-net {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
