<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales Order</h1>
        <p class="page-subtitle">Sales Order dibuat dari Quotation yang disetujui klien. Konfirmasi SO untuk membuat Proyek & Panel otomatis.</p>
      </div>
      <!-- TIDAK ADA tombol "+ SO Baru" — hanya dari Quotation -->
      <div class="flex gap-2 items-center">
        <span class="text-xs text-tertiary">SO dibuat via</span>
        <router-link to="/sales/quotations" class="btn btn-secondary btn-sm">📋 Konversi dari Quotation →</router-link>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-so-count">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">📝</div>
        <div class="stat-value">{{ salesOrders.length }}</div>
        <div class="stat-label">Total Sales Order</div>
      </div>
      <div class="stat-card" id="stat-so-confirmed">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value text-success">{{ confirmedCount }}</div>
        <div class="stat-label">SO Confirmed</div>
      </div>
      <div class="stat-card" id="stat-so-draft">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⏳</div>
        <div class="stat-value text-warning">{{ draftCount }}</div>
        <div class="stat-label">Draft / Perlu Tindakan</div>
      </div>
      <div class="stat-card" id="stat-so-value">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">💰</div>
        <div class="stat-value" style="font-size: 18px;">{{ formatCurrencyChain(totalValue) }}</div>
        <div class="stat-label">Total Nilai Kontrak Aktif</div>
      </div>
    </div>

    <!-- Filters & Table -->
    <div class="card" id="so-table-card">
      <div class="card-header">
        <div class="input-with-icon" style="width: 280px;">
          <span class="input-icon">🔍</span>
          <input class="input" placeholder="Cari SO, proyek, pelanggan..." v-model="search" id="search-so" />
        </div>
        <div class="flex gap-2">
          <select class="select" style="width: 160px;" v-model="filterStatus" id="filter-so-status">
            <option value="">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="BERJALAN">Berjalan</option>
            <option value="SELESAI">Selesai</option>
          </select>
        </div>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table" id="so-table">
          <thead>
            <tr>
              <th>No. SO</th>
              <th>Proyek</th>
              <th>Pelanggan</th>
              <th>Nilai Kontrak</th>
              <th>Termin</th>
              <th>PM</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="so in filteredSOs" :key="so.id" :id="`row-so-${so.id}`"
                :class="{ 'row-locked': so.is_locked }">
              <td>
                <div class="mono text-sm font-semibold text-accent">{{ so.id }}</div>
                <div class="text-xs text-tertiary">dari {{ so.source_id }}</div>
              </td>
              <td>
                <div class="font-medium text-primary" style="max-width: 200px;">{{ so.project_name }}</div>
                <div class="text-xs text-tertiary mono" v-if="so.project_id">→ {{ so.project_id }}</div>
              </td>
              <td class="text-secondary text-sm">{{ so.customer }}</td>
              <td>
                <div class="font-semibold">{{ formatCurrencyChain(so.contract_value) }}</div>
                <div class="text-xs text-tertiary" v-if="so.total_vo_amount > 0">
                  + VO {{ formatCurrencyChain(so.total_vo_amount) }}
                </div>
              </td>
              <td>
                <div class="termin-list">
                  <div v-for="t in so.payment_terms" :key="t.id" class="termin-item">
                    <span class="text-xs" :class="['badge', statusBadgeClass(t.status)]">{{ t.percentage }}%</span>
                    <span class="text-xs text-tertiary">{{ t.name.split(' ')[0] }}</span>
                    <span class="text-xs" :class="t.status === 'SIAP_DITAGIH' ? 'text-warning font-semibold' : 'text-tertiary'">
                      {{ statusLabel(t.status) }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="text-secondary text-sm">{{ so.pm || '—' }}</td>
              <td>
                <span :class="['badge', statusBadgeClass(so.status)]">{{ statusLabel(so.status) }}</span>
                <div v-if="so.is_locked" class="text-xs text-tertiary" style="margin-top: 2px;">🔒 Terkunci</div>
              </td>
              <td>
                <div class="flex flex-col gap-1" style="min-width: 160px;">
                  <!-- Draft: lengkapi data -->
                  <button
                    v-if="so.status === 'DRAFT'"
                    class="btn btn-sm btn-secondary"
                    :id="`so-edit-${so.id}`"
                    @click="openEditModal(so)"
                  >✏️ Lengkapi Data SO</button>

                  <!-- Draft: Ajukan -->
                  <div v-if="so.status === 'DRAFT'" class="action-gate-wrapper">
                    <button
                      class="btn btn-sm btn-primary"
                      :disabled="!canSubmitSO(so).ok"
                      :class="{ 'btn-disabled': !canSubmitSO(so).ok }"
                      :id="`so-submit-${so.id}`"
                      @click="doAjukanSO(so.id)"
                      :title="canSubmitSO(so).reason"
                    >Ajukan ↑</button>
                    <div v-if="!canSubmitSO(so).ok" class="gate-reason">{{ canSubmitSO(so).reason }}</div>
                  </div>

                  <!-- Menunggu Approval: Confirm -->
                  <button
                    v-if="so.status === 'MENUNGGU_APPROVAL'"
                    class="btn btn-sm btn-success-ghost"
                    :id="`so-confirm-${so.id}`"
                    @click="doConfirmSO(so.id)"
                  >🚀 Confirm SO</button>

                  <!-- Confirmed/Berjalan: Lihat Proyek -->
                  <router-link
                    v-if="so.project_id"
                    :to="`/projects/${so.project_id}`"
                    class="btn btn-sm btn-secondary"
                    :id="`so-view-prj-${so.id}`"
                  >🏗️ Lihat Proyek →</router-link>

                  <!-- Confirmed/Berjalan: Ajukan VO -->
                  <button
                    v-if="['CONFIRMED','BERJALAN'].includes(so.status)"
                    class="btn btn-sm btn-secondary"
                    :id="`so-vo-${so.id}`"
                    @click="openVOModal(so)"
                  >📝 Variation Order</button>

                  <!-- Termin Siap Ditagih: notif -->
                  <div v-if="hasTerminSiapDitagih(so)" class="badge badge-warning text-xs" style="text-align:center;">
                    ⚡ Ada termin siap ditagih
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="filteredSOs.length === 0">
              <td colspan="8">
                <div class="empty-state">
                  <div class="empty-state-icon">📝</div>
                  <div class="empty-state-title">Belum ada Sales Order</div>
                  <div class="empty-state-desc">Buat SO dari Quotation yang disetujui klien</div>
                  <router-link to="/sales/quotations" class="btn btn-primary">→ Ke Quotation</router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Lengkapi Data SO (G02) -->
    <div class="modal-overlay" v-if="showEditModal" @click.self="showEditModal = false" id="modal-edit-so">
      <div class="modal" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Lengkapi Data Sales Order</span>
            <div class="text-xs text-tertiary">{{ editTarget?.id }} — Syarat G02: PO klien, PM, termin total 100%</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showEditModal = false">✕</button>
        </div>
        <form @submit.prevent="submitEdit" v-if="editTarget">
          <div class="modal-body">
            <!-- Banner sumber -->
            <div class="chain-banner">
              <span class="chain-item">{{ editTarget.source_id }}</span>
              <span class="chain-sep">›</span>
              <span class="chain-current">{{ editTarget.id }}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top:16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label">Nama Proyek</label>
                <input type="text" class="input" v-model="editForm.project_name" readonly style="background: var(--bg-glass);" />
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label">Pelanggan</label>
                <input type="text" class="input" v-model="editForm.customer" readonly style="background: var(--bg-glass);" />
              </div>

              <div class="input-group">
                <label class="input-label" for="so-cust-po">No. PO Klien *</label>
                <input type="text" class="input mono" id="so-cust-po" v-model="editForm.customer_po" placeholder="PO-SEMEN/2026/055" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="so-po-date">Tanggal PO Klien *</label>
                <input type="date" class="input" id="so-po-date" v-model="editForm.customer_po_date" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="so-pm">Project Manager *</label>
                <select class="select" id="so-pm" v-model="editForm.pm" required>
                  <option value="">Pilih PM...</option>
                  <option>Budi Santoso</option>
                  <option>Andi Wijaya</option>
                  <option>Siti Rahayu</option>
                  <option>Rina Mulyani</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="so-delivery">Target Pengiriman *</label>
                <input type="date" class="input" id="so-delivery" v-model="editForm.delivery_date" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="so-retention">Retensi (%)</label>
                <input type="number" class="input" id="so-retention" v-model.number="editForm.retention_pct" min="0" max="15" step="0.5" />
              </div>
              <div class="input-group">
                <label class="input-label" for="so-warranty">Masa Garansi (bulan)</label>
                <input type="number" class="input" id="so-warranty" v-model.number="editForm.warranty_months" min="0" />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="so-address">Alamat Pengiriman *</label>
                <input type="text" class="input" id="so-address" v-model="editForm.shipping_address" placeholder="Jl. Pabrik, Kota, Provinsi" required />
              </div>

              <!-- Jadwal Termin (total harus 100%) -->
              <div class="input-group" style="grid-column: 1/-1;">
                <div class="flex justify-between items-center" style="margin-bottom: 8px;">
                  <label class="input-label" style="margin:0;">Jadwal Termin *</label>
                  <span :class="['badge', termTotal === 100 ? 'badge-success' : 'badge-danger']">
                    Total: {{ termTotal }}%
                  </span>
                </div>
                <div class="termin-editor">
                  <div v-for="term in editForm.payment_terms" :key="term.id" class="termin-row">
                    <input type="text" class="input" v-model="term.name" placeholder="Nama termin" style="flex:2;" />
                    <input type="number" class="input" v-model.number="term.percentage" min="0" max="100" style="width:70px;" @input="updateTermAmounts" />
                    <span class="text-tertiary text-sm">%</span>
                    <select class="select" v-model="term.trigger_event" style="flex:1.5;">
                      <option value="SO_CONFIRMED">SO Confirmed</option>
                      <option value="FAT_PASSED">FAT Lulus</option>
                      <option value="DELIVERED">Pengiriman</option>
                      <option value="BAST_SIGNED">BAST Ditandatangani</option>
                      <option value="WARRANTY_END">Akhir Garansi</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showEditModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-so-edit">Simpan &amp; Tutup</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Variation Order -->
    <div class="modal-overlay" v-if="showVOModal" @click.self="showVOModal = false" id="modal-vo-so">
      <div class="modal" style="max-width: 560px;">
        <div class="modal-header">
          <span class="font-semibold">Ajukan Variation Order — {{ voTarget?.id }}</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showVOModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert-info" style="margin-bottom:16px;">
            ℹ️ Setelah SO Confirmed, perubahan lingkup/qty/harga HANYA lewat Variation Order.
          </div>
          <div style="display:grid;gap:12px;">
            <div class="input-group">
              <label class="input-label" for="vo-title">Judul Perubahan *</label>
              <input type="text" class="input" id="vo-title" v-model="voForm.title" placeholder="Penambahan panel MCC-04" />
            </div>
            <div class="input-group">
              <label class="input-label" for="vo-reason">Justifikasi &amp; Lingkup *</label>
              <textarea class="input" rows="3" id="vo-reason" v-model="voForm.reason" style="height:auto;padding:10px;"
                placeholder="Klien meminta penambahan ..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="input-group">
                <label class="input-label" for="vo-amount">Selisih Harga (Rp)</label>
                <input type="number" class="input" id="vo-amount" v-model.number="voForm.delta_amount" step="1000000" />
              </div>
              <div class="input-group">
                <label class="input-label" for="vo-days">Selisih Waktu (Hari)</label>
                <input type="number" class="input" id="vo-days" v-model.number="voForm.delta_days" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showVOModal = false">Batal</button>
          <button class="btn btn-primary" @click="submitVO" :disabled="!voForm.title || !voForm.reason">Ajukan VO</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  salesOrders,
  canSubmitSO,
  updateSOData,
  confirmSO,
  formatCurrencyChain,
  statusBadgeClass,
  statusLabel,
  type SalesOrder,
  type PaymentTerm,
} from '../../data/chainStore'
import { useToast } from '../../data/toastStore'

const router = useRouter()
const toast = useToast()

const search = ref('')
const filterStatus = ref('')
const showEditModal = ref(false)
const showVOModal = ref(false)
const editTarget = ref<SalesOrder | null>(null)
const voTarget = ref<SalesOrder | null>(null)

const editForm = ref({
  project_name: '',
  customer: '',
  customer_po: '',
  customer_po_date: '',
  pm: '',
  delivery_date: '',
  retention_pct: 5,
  warranty_months: 12,
  shipping_address: '',
  payment_terms: [] as PaymentTerm[],
})

const voForm = ref({
  title: '',
  reason: '',
  delta_amount: 0,
  delta_days: 0,
})

const termTotal = computed(() => editForm.value.payment_terms.reduce((s, t) => s + (t.percentage || 0), 0))

const updateTermAmounts = () => {
  if (!editTarget.value) return
  const total = editTarget.value.contract_value
  editForm.value.payment_terms.forEach(t => {
    t.amount = total * (t.percentage / 100)
  })
}

const openEditModal = (so: SalesOrder) => {
  editTarget.value = so
  editForm.value = {
    project_name: so.project_name,
    customer: so.customer,
    customer_po: so.customer_po,
    customer_po_date: so.customer_po_date,
    pm: so.pm,
    delivery_date: so.delivery_date,
    retention_pct: so.retention_pct,
    warranty_months: so.warranty_months,
    shipping_address: so.shipping_address,
    payment_terms: JSON.parse(JSON.stringify(so.payment_terms)),
  }
  showEditModal.value = true
}

const submitEdit = () => {
  if (!editTarget.value) return
  updateSOData(editTarget.value.id, {
    customer_po: editForm.value.customer_po,
    customer_po_date: editForm.value.customer_po_date,
    pm: editForm.value.pm,
    delivery_date: editForm.value.delivery_date,
    retention_pct: editForm.value.retention_pct,
    warranty_months: editForm.value.warranty_months,
    shipping_address: editForm.value.shipping_address,
    payment_terms: editForm.value.payment_terms,
  })
  showEditModal.value = false
  toast.success('Data SO Disimpan', `${editTarget.value.id} berhasil diperbarui`)
}

const doAjukanSO = (id: string) => {
  const so = salesOrders.value.find(s => s.id === id)
  if (!so) return
  const guard = canSubmitSO(so)
  if (!guard.ok) { toast.error('Tidak Dapat Diajukan', guard.reason || 'Syarat tidak terpenuhi'); return }
  so.status = 'MENUNGGU_APPROVAL'
  toast.info('SO Diajukan', `${so.id} menunggu persetujuan Direksi`)
}

const doConfirmSO = (id: string) => {
  const proyek = confirmSO(id)
  if (proyek) {
    setTimeout(() => router.push(`/projects/${proyek.id}`), 1200)
  }
}

const hasTerminSiapDitagih = (so: SalesOrder) =>
  so.payment_terms.some(t => t.status === 'SIAP_DITAGIH')

const openVOModal = (so: SalesOrder) => {
  voTarget.value = so
  voForm.value = { title: '', reason: '', delta_amount: 0, delta_days: 0 }
  showVOModal.value = true
}

const submitVO = () => {
  if (!voTarget.value || !voForm.value.title) return
  const so = salesOrders.value.find(s => s.id === voTarget.value!.id)
  if (!so) return
  so.total_vo_amount += voForm.value.delta_amount
  so.variation_orders.push({
    id: `${so.id}-VO${String(so.variation_orders.length + 1).padStart(2, '0')}`,
    so_id: so.id, project_id: so.project_id || '',
    title: voForm.value.title, reason: voForm.value.reason,
    delta_amount: voForm.value.delta_amount, delta_days: voForm.value.delta_days,
    status: 'DRAFT',
    created_at: new Date().toISOString().split('T')[0],
    created_by: 'Budi Santoso',
  })
  showVOModal.value = false
  toast.success('VO Diajukan', `${voTarget.value.id}-VO${so.variation_orders.length} menunggu approval internal`)
}

const confirmedCount = computed(() => salesOrders.value.filter(s => ['CONFIRMED','BERJALAN'].includes(s.status)).length)
const draftCount = computed(() => salesOrders.value.filter(s => ['DRAFT','MENUNGGU_APPROVAL'].includes(s.status)).length)
const totalValue = computed(() => salesOrders.value
  .filter(s => ['CONFIRMED','BERJALAN'].includes(s.status))
  .reduce((a, s) => a + s.contract_value + s.total_vo_amount, 0))

const filteredSOs = computed(() => salesOrders.value.filter(so => {
  const s = search.value.toLowerCase()
  const matchSearch = !s || so.id.toLowerCase().includes(s) || so.project_name.toLowerCase().includes(s) || so.customer.toLowerCase().includes(s)
  const matchStatus = !filterStatus.value || so.status === filterStatus.value
  return matchSearch && matchStatus
}))
</script>

<style scoped>
.row-locked { opacity: 0.8; }

.termin-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.termin-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chain-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.chain-item { color: var(--text-tertiary); font-family: var(--font-mono); }
.chain-sep { color: var(--text-tertiary); }
.chain-current { color: var(--text-accent); font-family: var(--font-mono); font-weight: 600; }

.termin-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.termin-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-gate-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gate-reason {
  font-size: 10px;
  color: var(--text-danger);
  max-width: 180px;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success-ghost {
  background: rgba(16,185,129,0.12);
  color: var(--text-success);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.btn-success-ghost:hover { background: rgba(16,185,129,0.22); }

.alert-info {
  padding: 10px 14px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-info);
}
</style>
