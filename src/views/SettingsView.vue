<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Pengaturan Sistem</h1>
        <p class="page-subtitle">Konfigurasi sistem, penomoran dokumen, approval matrix, dan pengguna (PRD Settings §4.10)</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-save-settings" @click="saveAllSettings">💾 Simpan Perubahan</button>
    </div>
    <div class="settings-layout">
      <!-- Nav -->
      <div class="settings-nav card" id="settings-nav">
        <div v-for="s in sections" :key="s.id" :class="['settings-nav-item', activeSection === s.id && 'active']"
             @click="activeSection = s.id" :id="`settings-nav-${s.id}`">
          <span>{{ s.icon }}</span>
          <span>{{ s.label }}</span>
        </div>
      </div>
      <!-- Content -->
      <div class="settings-content">
        <!-- Umum (Sesuai PRD §4.10.2 #settings-general) -->
        <div v-if="activeSection === 'general'" class="card" id="settings-general">
          <div class="card-header"><div class="font-semibold">Konfigurasi Umum (PRD §4.10.2)</div></div>
          <div class="card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="input-group">
              <label class="input-label" for="input-company-name">Nama Perusahaan *</label>
              <input type="text" class="input" v-model="generalSettings.companyName" id="input-company-name" required />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-company-code">Kode Perusahaan (Singkatan) *</label>
              <input type="text" class="input mono" v-model="generalSettings.companyCode" id="input-company-code" required />
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label" for="input-company-address">Alamat Workshop / Kantor *</label>
              <textarea class="input" rows="2" v-model="generalSettings.address" id="input-company-address" style="height: auto; padding: 10px;" required></textarea>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-lang">Bahasa Default</label>
              <select class="select" id="input-lang" v-model="generalSettings.language">
                <option>Bahasa Indonesia</option>
                <option>English</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-theme">Tema Tampilan</label>
              <select class="select" id="input-theme" v-model="selectedTheme" @change="changeTheme">
                <option value="light">☀️ Putih Clean (Light)</option>
                <option value="dark">🌙 Dark Premium</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-timezone">Zona Waktu</label>
              <select class="select" id="input-timezone" v-model="generalSettings.timezone">
                <option>WIB (UTC+7)</option>
                <option>WITA (UTC+8)</option>
                <option>WIT (UTC+9)</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-currency">Format Mata Uang</label>
              <select class="select" id="input-currency" v-model="generalSettings.currency">
                <option>IDR (Rp)</option>
                <option>USD ($)</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-ppn">Tarif PPN Default (%) *</label>
              <input type="number" class="input" v-model.number="generalSettings.ppn" id="input-ppn" min="0" max="25" required />
            </div>
          </div>
        </div>

        <!-- Penomoran Dokumen (Sesuai PRD §4.10.3 #settings-numbering) -->
        <div v-if="activeSection === 'numbering'" class="card" id="settings-numbering">
          <div class="card-header"><div class="font-semibold">Format Penomoran Dokumen Otomatis (PRD §4.10.3)</div></div>
          <div class="card-body">
            <div class="alert alert-info" style="margin-bottom: 20px;">
              💡 Gunakan variabel pola: <code>{YYYY}</code> = tahun, <code>{MM}</code> = bulan, <code>{SEQ:N}</code> = nomor urut N digit.
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-num-qt">Penawaran (Quotation)</label>
                <input type="text" class="input mono" v-model="numberingSettings.qt" id="input-num-qt" />
                <span class="text-xs text-tertiary">Contoh: QT-2026-031</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-so">Sales Order</label>
                <input type="text" class="input mono" v-model="numberingSettings.so" id="input-num-so" />
                <span class="text-xs text-tertiary">Contoh: SO-2026-018</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-prj">Proyek Panel</label>
                <input type="text" class="input mono" v-model="numberingSettings.prj" id="input-num-prj" />
                <span class="text-xs text-tertiary">Contoh: PRJ-2026-001</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-po">Purchase Order</label>
                <input type="text" class="input mono" v-model="numberingSettings.po" id="input-num-po" />
                <span class="text-xs text-tertiary">Contoh: PO-2026-156</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-grn">Penerimaan Barang (GRN)</label>
                <input type="text" class="input mono" v-model="numberingSettings.grn" id="input-num-grn" />
                <span class="text-xs text-tertiary">Contoh: GRN-2026-089</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-wo">Work Order</label>
                <input type="text" class="input mono" v-model="numberingSettings.wo" id="input-num-wo" />
                <span class="text-xs text-tertiary">Contoh: WO-2026-001</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-ncr">Non-Conformance Report (NCR)</label>
                <input type="text" class="input mono" v-model="numberingSettings.ncr" id="input-num-ncr" />
                <span class="text-xs text-tertiary">Contoh: NCR-2026-045</span>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-num-inv">Faktur Tagihan (Invoice)</label>
                <input type="text" class="input mono" v-model="numberingSettings.inv" id="input-num-inv" />
                <span class="text-xs text-tertiary">Contoh: INV-2026-088</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Approval Matrix -->
        <div v-if="activeSection === 'approval'" class="card" id="settings-approval">
          <div class="card-header"><div class="font-semibold">Approval Matrix & Batas Otorisasi</div></div>
          <div class="card-body">
            <table class="table" id="approval-matrix-table">
              <thead><tr><th>Objek Dokumen</th><th>Pengaju</th><th>Approver Berwenang</th><th>Batas Nilai Otorisasi</th></tr></thead>
              <tbody>
                <tr v-for="a in approvalMatrix" :key="a.id" :id="`am-${a.id}`">
                  <td class="font-medium text-primary text-sm">{{ a.object }}</td>
                  <td class="text-secondary text-sm">{{ a.submitter }}</td>
                  <td class="text-secondary text-sm font-semibold">{{ a.approver }}</td>
                  <td class="text-accent text-sm mono">{{ a.limit || 'Semua Nilai' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Estimasi & Kapasitas (Spesifikasi §6.1.2 & §8.8) -->
        <div v-if="activeSection === 'estimation'" class="card" id="settings-estimation">
          <div class="card-header"><div class="font-semibold">Konfigurasi Estimasi Cost-Plus &amp; Kapasitas</div></div>
          <div class="card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="input-group">
              <label class="input-label" for="input-est-workhours">Jam Kerja Efektif / Hari</label>
              <input type="number" class="input" id="input-est-workhours" v-model.number="estimationConfig.workHoursPerDay" min="1" max="14" step="0.5" />
              <span class="text-xs text-tertiary">Kapasitas minimal 1 orang saat karyawan absen semua</span>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-est-sat">Sabtu Termasuk Hari Kerja</label>
              <select class="select" id="input-est-sat" v-model="estimationConfig.saturdayWorking">
                <option :value="true">Ya — Senin–Sabtu</option>
                <option :value="false">Tidak — Senin–Jumat</option>
              </select>
              <span class="text-xs text-tertiary">Libur nasional dikelola di menu Karyawan &amp; Kapasitas</span>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-est-overhead">Overhead HPP (%)</label>
              <input type="number" class="input" id="input-est-overhead" v-model.number="estimationConfig.overheadPct" min="0" max="100" step="0.5" />
              <span class="text-xs text-tertiary">Ditambahkan ke (material + jasa) sebelum margin</span>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-est-rounding">Pembulatan Harga Jual (Rp)</label>
              <input type="number" class="input" id="input-est-rounding" v-model.number="estimationConfig.priceRounding" min="0" step="10000" />
              <span class="text-xs text-tertiary">0 = tanpa pembulatan</span>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-est-deviation">Ambang Deviasi Estimasi CRM (%)</label>
              <input type="number" class="input" id="input-est-deviation" v-model.number="estimationConfig.crmDeviationThresholdPct" min="1" max="100" step="1" />
              <span class="text-xs text-tertiary">Peringatan bila harga cost-plus menyimpang &gt; nilai ini dari estimasi CRM</span>
            </div>
            <div class="input-group" style="grid-column: 1/-1;">
              <label class="input-label">Tarif Default per Keahlian (fallback bila tidak ada karyawan aktif)</label>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                <div v-for="skill in skillList" :key="skill">
                  <span class="text-xs text-tertiary">{{ skill }}</span>
                  <input type="number" class="input" v-model.number="estimationConfig.defaultRates[skill]" min="0" step="1000" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pengguna & Hak Akses (Sesuai PRD §4.10.4 #modal-invite-user) -->
        <div v-if="activeSection === 'users'" class="card" id="settings-users">
          <div class="card-header">
            <div class="font-semibold">Pengguna & Hak Akses (PRD §4.10.4)</div>
            <button class="btn btn-primary btn-sm" id="btn-invite-user" @click="showUserModal = true">+ Undang Pengguna</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table" id="users-table">
              <thead><tr><th>Nama Lengkap</th><th>Email Korporat</th><th>Peran (Role)</th><th>Status</th><th>Login Terakhir</th><th></th></tr></thead>
              <tbody>
                <tr v-for="u in users" :key="u.id" :id="`user-${u.id}`">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="user-avatar" style="width: 28px; height: 28px; font-size: 10px;">{{ u.initials }}</div>
                      <div class="font-medium text-primary text-sm">{{ u.name }}</div>
                    </div>
                  </td>
                  <td class="text-secondary text-sm">{{ u.email }}</td>
                  <td><span class="badge badge-primary">{{ u.role }}</span></td>
                  <td><span :class="['badge', u.active ? 'badge-success' : 'badge-neutral']">{{ u.active ? 'Aktif' : 'Nonaktif' }}</span></td>
                  <td class="text-tertiary text-sm">{{ u.lastLogin }}</td>
                  <td>
                    <button class="btn btn-icon btn-secondary btn-sm" :id="`user-toggle-${u.id}`" @click="u.active = !u.active" :data-tooltip="u.active ? 'Nonaktifkan' : 'Aktifkan'">
                      {{ u.active ? '🔒' : '🔓' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Undang Pengguna Baru (Sesuai PRD §4.10.4 #modal-invite-user) -->
    <div class="modal-overlay" v-if="showUserModal" @click.self="showUserModal = false" id="modal-invite-user">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Undang Pengguna & Beri Akses Baru</span>
            <div class="text-xs text-tertiary">Pendaftaran Akun Karyawan PanelERP (PRD Settings §4.10.4)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showUserModal = false">✕</button>
        </div>
        <form @submit.prevent="submitUser">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-user-name">Nama Lengkap Karyawan *</label>
                <input
                  type="text"
                  class="input"
                  id="input-user-name"
                  v-model="userForm.name"
                  placeholder="Contoh: Hendra Setiawan"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-user-email">Email Korporat *</label>
                <input
                  type="email"
                  class="input"
                  id="input-user-email"
                  v-model="userForm.email"
                  placeholder="hendra@panelei.com"
                  required
                />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-user-role">Peran Otoritas (Role) *</label>
                <select class="select" id="input-user-role" v-model="userForm.role" required>
                  <option>Direksi</option>
                  <option>Project Manager</option>
                  <option>Sales & Estimator</option>
                  <option>Manajer Teknik</option>
                  <option>Kepala Produksi</option>
                  <option>Quality Control (QC)</option>
                  <option>Supervisor Gudang</option>
                  <option>Finance & Akuntansi</option>
                  <option>Admin Sistem</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" v-model="userForm.sendInvite" id="input-user-active" />
                  <span>Langsung aktifkan dan kirimkan email aktivasi kredensial login</span>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showUserModal = false" id="btn-cancel-user">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-user">Kirim Undangan Akses</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '../data/toastStore'
import { estimationConfig, WORKER_SKILLS } from '../data/workforceStore'

const toast = useToast()
const skillList = WORKER_SKILLS

const activeSection = ref('general')
const selectedTheme = ref(localStorage.getItem('theme') || 'light')

const changeTheme = () => {
  document.documentElement.setAttribute('data-theme', selectedTheme.value)
  localStorage.setItem('theme', selectedTheme.value)
}

onMounted(() => {
  selectedTheme.value = localStorage.getItem('theme') || 'light'
})

const sections = [
  { id: 'general', icon: '🏢', label: 'Umum' },
  { id: 'numbering', icon: '🔢', label: 'Penomoran Dokumen' },
  { id: 'approval', icon: '✅', label: 'Approval Matrix' },
  { id: 'estimation', icon: '📐', label: 'Estimasi & Kapasitas' },
  { id: 'users', icon: '👥', label: 'Pengguna & Akses' },
]

const generalSettings = ref({
  companyName: 'CV. Panel Elektrika Indonesia',
  companyCode: 'PEI',
  address: 'Jl. Industri No. 45, Kawasan Industri Terboyo, Semarang 50118',
  language: 'Bahasa Indonesia',
  timezone: 'WIB (UTC+7)',
  currency: 'IDR (Rp)',
  ppn: 12
})

const numberingSettings = ref({
  qt: 'QT-{YYYY}-{SEQ:3}',
  so: 'SO-{YYYY}-{SEQ:3}',
  prj: 'PRJ-{YYYY}-{SEQ:3}',
  po: 'PO-{YYYY}-{SEQ:3}',
  grn: 'GRN-{YYYY}-{SEQ:3}',
  wo: 'WO-{YYYY}-{SEQ:3}',
  ncr: 'NCR-{YYYY}-{SEQ:3}',
  inv: 'INV-{YYYY}-{SEQ:3}'
})

const approvalMatrix = [
  { id: 'am1', object: 'Quotation (margin < ambang)', submitter: 'Sales & Estimator', approver: 'Direksi / Manajer Sales', limit: 'Margin < 18%' },
  { id: 'am2', object: 'Sales Order Kontrak', submitter: 'Admin Proyek', approver: 'Direksi / PM', limit: '> Rp 1M' },
  { id: 'am3', object: 'BOM Final & Rilis Gambar', submitter: 'Engineer', approver: 'Manajer Teknik', limit: 'Semua Nilai' },
  { id: 'am4', object: 'Purchase Request / PO', submitter: 'Purchasing', approver: 'Direksi / PM Berjenjang', limit: '> Rp 50jt' },
  { id: 'am5', object: 'Variation Order (VO)', submitter: 'Project Manager', approver: 'Direksi + Klien', limit: 'Semua Nilai' },
  { id: 'am6', object: 'Disposisi NCR', submitter: 'Quality Control', approver: 'Manajer Teknik + Produksi', limit: 'Semua Nilai' },
]

const users = ref([
  { id: 'u1', initials: 'BS', name: 'Budi Santoso', email: 'budi@panelei.com', role: 'Project Manager', active: true, lastLogin: '06 Okt 2026' },
  { id: 'u2', initials: 'RM', name: 'Rina Mulyani', email: 'rina@panelei.com', role: 'Sales & Estimator', active: true, lastLogin: '06 Okt 2026' },
  { id: 'u3', initials: 'AW', name: 'Andi Wijaya', email: 'andi@panelei.com', role: 'Project Manager', active: true, lastLogin: '05 Okt 2026' },
  { id: 'u4', initials: 'SR', name: 'Siti Rahayu', email: 'siti@panelei.com', role: 'Admin Proyek', active: true, lastLogin: '04 Okt 2026' },
  { id: 'u5', initials: 'IH', name: 'Ir. Hartono', email: 'hartono@panelei.com', role: 'Manajer Teknik', active: true, lastLogin: '06 Okt 2026' },
])

const showUserModal = ref(false)
const userForm = ref({
  name: '',
  email: '',
  role: 'Project Manager',
  sendInvite: true
})

const submitUser = () => {
  if (!userForm.value.name || !userForm.value.email) return

  const parts = userForm.value.name.trim().split(' ')
  const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()

  const newUser = {
    id: `u${users.value.length + 1}`,
    initials,
    name: userForm.value.name,
    email: userForm.value.email,
    role: userForm.value.role,
    active: true,
    lastLogin: 'Belum pernah'
  }

  users.value.push(newUser)
  showUserModal.value = false
  toast.success('Pengguna Berhasil Diundang', `Undangan akses untuk ${newUser.name} (${newUser.role}) telah dikirimkan ke ${newUser.email}`)
}

const saveAllSettings = () => {
  toast.success('Pengaturan Tersimpan', 'Konfigurasi umum, penomoran, approval matrix, dan parameter estimasi/kapasitas telah diperbarui')
}
</script>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--space-5);
  align-items: start;
}

.settings-nav {
  position: sticky;
  top: 20px;
  padding: var(--space-2);
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-base);
}

.settings-nav-item:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.settings-nav-item.active {
  background: var(--tint-primary-bg);
  color: var(--text-accent);
}

.settings-content { min-width: 0; }

.user-avatar {
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-600), var(--accent-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
</style>
