<template>
  <div class="portal-page">
    <!-- Portal Header -->
    <div class="portal-header" id="portal-header">
      <div class="portal-brand">
        <div class="portal-logo">⚡</div>
        <div>
          <div class="portal-brand-name">PanelERP</div>
          <div class="portal-brand-sub">Portal Klien</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="client-badge" id="client-user-badge">
          <span class="text-sm font-semibold">Ir. Bambang K.</span>
          <span class="text-xs text-tertiary">PT. Semen Indonesia</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-client-logout">Keluar</button>
      </div>
    </div>

    <div class="portal-content">
      <!-- Welcome -->
      <div class="portal-welcome" id="portal-welcome">
        <h1 class="portal-title">Selamat Datang, Ir. Bambang!</h1>
        <p class="portal-subtitle">Berikut ringkasan proyek Anda bersama <strong>CV. Panel Elektrika Indonesia</strong></p>
      </div>

      <!-- Project Card -->
      <div v-for="proj in clientProjects" :key="proj.id" class="portal-project-card" :id="`portal-proj-${proj.id}`">
        <!-- Project Header -->
        <div class="portal-proj-header">
          <div>
            <div class="portal-proj-title">{{ proj.name }}</div>
            <div class="text-sm text-tertiary">{{ proj.id }} | PM: {{ proj.pm }} | ☎️ {{ proj.pmPhone }}</div>
          </div>
          <span :class="['badge', proj.status === 'Produksi' ? 'badge-primary' : 'badge-success']" style="font-size: 13px; padding: 6px 12px;">{{ proj.status }}</span>
        </div>

        <!-- Overall Progress -->
        <div class="portal-progress-section" id="portal-progress-section">
          <div class="flex items-center justify-between" style="margin-bottom: 8px;">
            <span class="font-semibold text-primary">Progres Keseluruhan</span>
            <span class="text-2xl font-bold text-accent">{{ proj.progress }}%</span>
          </div>
          <div class="progress-bar" style="height: 12px; border-radius: 8px;">
            <div class="progress-fill" :style="`width: ${proj.progress}%; background: linear-gradient(90deg, var(--primary-500), var(--accent-400));`"></div>
          </div>
        </div>

        <!-- Key Dates -->
        <div class="portal-dates-row" id="portal-dates-row">
          <div class="portal-date-item">
            <div class="text-xs text-tertiary">FAT Terjadwal</div>
            <div class="font-semibold text-primary">{{ formatDate(proj.fatDate) }}</div>
          </div>
          <div class="portal-date-item">
            <div class="text-xs text-tertiary">Estimasi Pengiriman</div>
            <div class="font-semibold text-primary">{{ formatDate(proj.deliveryDate) }}</div>
          </div>
        </div>

        <!-- Tab nav -->
        <div class="tabs-nav" style="margin: 20px 0 16px; display: inline-flex; width: auto;" id="portal-tabs">
          <button :class="['tab-btn', activeTab === 'milestone' && 'active']" @click="activeTab = 'milestone'" id="portal-tab-milestone">Milestone</button>
          <button :class="['tab-btn', activeTab === 'docs' && 'active']" @click="activeTab = 'docs'" id="portal-tab-docs">
            Persetujuan Dokumen
            <span v-if="proj.pendingApprovals.length" class="nav-badge" style="margin-left: 4px;">{{ proj.pendingApprovals.length }}</span>
          </button>
          <button :class="['tab-btn', activeTab === 'photos' && 'active']" @click="activeTab = 'photos'" id="portal-tab-photos">Foto Progres</button>
          <button :class="['tab-btn', activeTab === 'invoice' && 'active']" @click="activeTab = 'invoice'" id="portal-tab-invoice">Invoice & Pembayaran</button>
        </div>

        <!-- Milestone Timeline -->
        <div v-if="activeTab === 'milestone'" class="milestone-timeline" id="portal-milestone-timeline">
          <div v-for="(ms, idx) in proj.milestones" :key="idx" class="milestone-item" :class="{ done: ms.done, active: !ms.done && proj.milestones[idx-1]?.done }" :id="`portal-ms-${idx}`">
            <div class="milestone-icon">
              <span v-if="ms.done">✅</span>
              <span v-else-if="!ms.done && proj.milestones[idx-1]?.done">🔄</span>
              <span v-else>⏳</span>
            </div>
            <div class="milestone-content">
              <div class="milestone-name" :class="ms.done ? 'text-success' : 'text-primary'">{{ ms.name }}</div>
              <div class="milestone-date">{{ ms.date ? formatDate(ms.date) : 'Belum dijadwalkan' }}</div>
            </div>
          </div>
        </div>

        <!-- Document Approvals -->
        <div v-if="activeTab === 'docs'" id="portal-docs-section">
          <div v-if="proj.pendingApprovals.length === 0" class="empty-state" style="padding: 40px;">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">Tidak ada dokumen menunggu persetujuan</div>
          </div>
          <div v-for="doc in proj.pendingApprovals" :key="doc.id" class="doc-approval-card" :id="`portal-doc-${doc.id}`">
            <div class="flex items-center gap-3">
              <div class="doc-icon">📐</div>
              <div class="flex-1">
                <div class="font-semibold text-primary">{{ doc.name }}</div>
                <div class="text-xs text-tertiary">{{ doc.type }} | Diunggah {{ formatDate(doc.uploadDate) }}</div>
              </div>
              <span :class="['badge', doc.status === 'Pending' ? 'badge-warning' : 'badge-success']">{{ doc.status }}</span>
            </div>
            <div class="flex gap-2" style="margin-top: 12px;">
              <button class="btn btn-secondary btn-sm" :id="`portal-doc-view-${doc.id}`">👁️ Lihat Dokumen</button>
              <button class="btn btn-primary btn-sm" :id="`portal-doc-approve-${doc.id}`">✅ Setujui</button>
              <button class="btn btn-danger btn-sm" :id="`portal-doc-reject-${doc.id}`">✕ Revisi</button>
            </div>
          </div>
        </div>

        <!-- Photos -->
        <div v-if="activeTab === 'photos'" id="portal-photos-section">
          <div class="grid-2" style="gap: 12px;">
            <div v-for="(photo, idx) in proj.recentPhotos" :key="idx" class="photo-card" :id="`portal-photo-${idx}`">
              <div class="photo-placeholder">📷</div>
              <div class="photo-caption">{{ photo.caption }}</div>
              <div class="photo-date">{{ formatDate(photo.date) }}</div>
            </div>
          </div>
        </div>

        <!-- Invoice -->
        <div v-if="activeTab === 'invoice'" id="portal-invoice-section">
          <div class="table-container">
            <table class="table" id="portal-invoice-table">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Termin</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Tgl Bayar / Jatuh Tempo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in proj.invoices" :key="inv.id" :id="`portal-inv-${inv.id}`">
                  <td class="mono text-sm font-semibold text-accent">{{ inv.id }}</td>
                  <td class="text-secondary">{{ inv.termin }}</td>
                  <td class="font-semibold">{{ formatCurrency(inv.amount) }}</td>
                  <td><span :class="['badge', inv.status === 'Paid' ? 'badge-success' : 'badge-warning']">{{ inv.status }}</span></td>
                  <td class="text-secondary text-sm">{{ inv.status === 'Paid' ? formatDate(inv.paidDate || '') : formatDate(inv.dueDate || '') }}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" :id="`portal-inv-dl-${inv.id}`">📄 Unduh</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div><!-- end project card -->

      <!-- Help Card -->
      <div class="card" style="padding: 20px; margin-top: 16px;" id="portal-help-card">
        <div class="flex items-center gap-4">
          <div class="stat-icon" style="background: rgba(59,85,168,0.1); flex-shrink: 0;">💬</div>
          <div class="flex-1">
            <div class="font-semibold text-primary">Butuh bantuan atau ajukan tiket garansi?</div>
            <div class="text-sm text-tertiary">Hubungi PM atau kirimkan tiket servis melalui portal ini.</div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-portal-ticket" @click="showTicketModal = true">📩 Buat Tiket</button>
        </div>
      </div>
    </div>

    <!-- Modal Form Tiket Servis / Garansi Klien (Sesuai PRD §4.9.1 #modal-client-ticket) -->
    <div class="modal-overlay" v-if="showTicketModal" @click.self="showTicketModal = false" id="modal-client-ticket">
      <div class="modal" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Buat Tiket Servis / Garansi Panel</span>
            <div class="text-xs text-tertiary">Layanan Purna Jual & Kendala Operasional (PRD M10 §4.9.1)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showTicketModal = false">✕</button>
        </div>
        <form @submit.prevent="submitTicket">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label">Proyek Terkait</label>
                <input
                  type="text"
                  class="input"
                  id="input-ticket-proj"
                  value="PRJ-2026-001 (LVMDP Pabrik Tuban IV)"
                  readonly
                  style="background: var(--bg-glass);"
                />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-ticket-panel">Panel Terkendala *</label>
                <select class="select" id="input-ticket-panel" v-model="ticketForm.panel" required>
                  <option>LVMDP-01 (Incoming)</option>
                  <option>LVMDP-02 (Outgoing A)</option>
                  <option>MCC-01 (Motor Control)</option>
                  <option>SDP-01 (Sub Distribution)</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ticket-title">Judul Kendala / Keluhan *</label>
                <input
                  type="text"
                  class="input"
                  id="input-ticket-title"
                  v-model="ticketForm.title"
                  placeholder="Contoh: Alarm indikator trip pada ACB Feeder 2"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ticket-cat">Kategori Masalah *</label>
                <select class="select" id="input-ticket-cat" v-model="ticketForm.category" required>
                  <option>Kendala Operasional</option>
                  <option>Klaim Garansi Komponen</option>
                  <option>Permintaan Sparepart Tambahan</option>
                  <option>Konsultasi Setting Relay</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ticket-desc">Deskripsi Detail Masalah *</label>
                <textarea
                  class="input"
                  rows="3"
                  id="input-ticket-desc"
                  v-model="ticketForm.description"
                  placeholder="Jelaskan kondisi beban saat trip, kode alarm pada layar meter, atau kronologi kendala..."
                  style="height: auto; padding: 10px;"
                  required
                ></textarea>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-ticket-file">Lampirkan Foto / Video Indikator (Opsional)</label>
                <input type="file" class="input" id="input-ticket-file" accept="image/*,video/*" style="padding: 8px;" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showTicketModal = false" id="btn-cancel-ticket">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-ticket">Kirim Tiket ke Project Manager</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mockClientProjects } from '../../data/mockDataExtended'
import { formatDate, formatCurrency } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const activeTab = ref('milestone')
const clientProjects = mockClientProjects

const showTicketModal = ref(false)
const ticketForm = ref({
  panel: 'LVMDP-01 (Incoming)',
  title: '',
  category: 'Kendala Operasional',
  description: ''
})

const submitTicket = () => {
  if (!ticketForm.value.title || !ticketForm.value.description) return
  showTicketModal.value = false
  toast.success('Tiket Berhasil Dikirim', `Tiket "${ticketForm.value.title}" telah diterima oleh PM Budi Santoso`)
}
</script>

<style scoped>
.portal-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

.portal-header {
  height: 64px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-8);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: var(--shadow-sm);
}

.portal-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.portal-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(59,85,168,0.4);
}

.portal-brand-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.portal-brand-sub {
  font-size: 11px;
  color: var(--text-tertiary);
}

.client-badge {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.portal-content {
  max-width: 860px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}

.portal-welcome {
  margin-bottom: 24px;
}

.portal-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.portal-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.portal-project-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: 20px;
  backdrop-filter: blur(16px);
}

.portal-proj-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.portal-proj-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.portal-progress-section {
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: 16px;
}

.portal-dates-row {
  display: flex;
  gap: 32px;
  margin-bottom: 8px;
}

.portal-date-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Milestone */
.milestone-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.milestone-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  position: relative;
}

.milestone-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 42px;
  width: 2px;
  height: calc(100% - 12px);
  background: var(--border-default);
}

.milestone-item.done::after {
  background: var(--success-500);
}

.milestone-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-glass);
  border: 2px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  z-index: 1;
}

.milestone-item.done .milestone-icon {
  border-color: var(--success-500);
  background: rgba(16, 185, 129, 0.1);
}

.milestone-item.active .milestone-icon {
  border-color: var(--primary-500);
  background: rgba(59, 85, 168, 0.1);
  animation: pulse 2s infinite;
}

.milestone-name { font-weight: 600; font-size: 14px; }
.milestone-date { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

/* Doc card */
.doc-approval-card {
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 12px;
}

.doc-icon {
  width: 40px;
  height: 40px;
  background: rgba(59, 85, 168, 0.1);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

/* Photo card */
.photo-card {
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.photo-placeholder {
  height: 140px;
  background: var(--bg-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  opacity: 0.5;
}

.photo-caption {
  padding: 10px 12px 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.photo-date {
  padding: 0 12px 10px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.nav-badge {
  background: var(--primary-600);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
}
</style>
