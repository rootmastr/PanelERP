<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Karyawan &amp; Kapasitas</h1>
        <p class="page-subtitle">
          Master tenaga kerja workshop — keahlian &amp; tarif jasa menjadi dasar estimasi
          biaya jasa produksi; absensi &amp; kalender kerja menentukan estimasi selesai perakitan (Spesifikasi §8.8).
        </p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="btn-add-absence" @click="openAbsenceModal">+ Catat Absensi</button>
        <button class="btn btn-primary btn-sm" id="btn-add-employee" @click="openEmployeeModal()">+ Karyawan Baru</button>
      </div>
    </div>

    <!-- Kapasitas hari ini -->
    <div class="grid-4" style="margin-bottom: 24px;" id="capacity-cards">
      <div v-for="c in capacity" :key="c.skill" class="stat-card" :id="`cap-${slug(c.skill)}`">
        <div class="stat-icon" :style="{ background: c.manHoursPerDay > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }">
          {{ skillIcon(c.skill) }}
        </div>
        <div class="stat-value">{{ c.manHoursPerDay }}<span class="text-sm text-tertiary"> jh</span></div>
        <div class="stat-label">
          {{ c.skill }} — {{ c.headcount }} org
          <span v-if="c.onLeave" class="text-warning">({{ c.onLeave }} absen)</span>
        </div>
        <div class="text-xs text-tertiary" style="margin-top:4px;">
          Tarif rata-rata {{ formatRp(c.avgRate) }}/jam
          <span v-if="c.isHoliday"> · libur</span>
          <span v-else-if="c.manHoursPerDay === 0" class="text-danger"> · kapasitas nol!</span>
        </div>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 20px;" id="capacity-hint">
      📅 Kalender: <b>{{ isWorkingDay(today) ? 'hari kerja' : 'libur' }}</b> ({{ today }}) ·
      Sabtu kerja: <b>{{ estimationConfig.saturdayWorking ? 'Ya' : 'Tidak' }}</b> ·
      Libur terdaftar: {{ holidays.length }} tanggal ·
      Kapasitas dipakai otomatis oleh kalkulator quotation cost-plus.
    </div>

    <div class="grid-2">
      <!-- Tabel karyawan -->
      <div class="card" id="employee-table-card">
        <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);">
          <span class="font-semibold">👤 Daftar Karyawan</span>
          <span class="text-xs text-tertiary">{{ activeEmployees.length }} aktif / {{ employees.length }} total</span>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table" id="employee-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Keahlian</th>
                <th>Tarif/jam</th>
                <th>Jam/Hari</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in employees" :key="e.id" :id="`row-emp-${e.id}`" :class="{ 'row-inactive': !e.is_active }">
                <td>
                  <div class="font-medium text-sm">{{ e.full_name }}</div>
                  <div class="text-xs text-tertiary">{{ e.id }} · {{ e.role }}</div>
                </td>
                <td><span class="badge badge-primary">{{ e.skill }}</span></td>
                <td class="text-sm">{{ formatRp(e.hourly_rate) }}</td>
                <td class="text-sm">{{ e.work_hours_per_day }}</td>
                <td>
                  <button :class="['badge', e.is_active ? 'badge-success' : 'badge-neutral']" style="cursor:pointer;border:none;"
                    :id="`toggle-emp-${e.id}`" @click="toggleEmployeeActive(e.id)">
                    {{ e.is_active ? 'Aktif' : 'Nonaktif' }}
                  </button>
                </td>
                <td>
                  <button class="btn btn-icon btn-secondary btn-sm" @click="openEmployeeModal(e.id)" title="Edit">✎</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Absensi + kalender -->
      <div class="card" id="absence-card">
        <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);">
          <span class="font-semibold">📅 Absensi (Cuti/Sakit/Izin)</span>
          <span class="text-xs text-tertiary">{{ absences.length }} record</span>
        </div>
        <div class="table-container" style="border: none;">
          <table class="table" id="absence-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in activeAbsences" :key="a.id" :id="`row-abs-${a.id}`">
                <td class="text-sm">{{ employeeName(a.employee_id) }}</td>
                <td><span class="badge badge-warning">{{ a.absence_type }}</span></td>
                <td class="text-sm">{{ a.date_from }} → {{ a.date_to }}</td>
                <td>
                  <button class="btn btn-icon btn-secondary btn-sm" @click="removeAbsence(a.id)" title="Hapus">✕</button>
                </td>
              </tr>
              <tr v-if="absences.length === 0">
                <td colspan="4" class="text-center text-tertiary text-sm" style="padding:16px;">Belum ada absensi.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="padding: 12px 20px; border-top: 1px solid var(--border-subtle);">
          <div class="text-xs text-tertiary" style="margin-bottom: 6px;">Libur nasional / hari non-kerja</div>
          <div class="flex gap-2 flex-wrap">
            <span v-for="h in holidays" :key="h" class="badge badge-danger" style="cursor:pointer;" :title="'Klik untuk mengaktifkan hari ini kembali'" @click="toggleHoliday(h)">
              {{ h }} ✕
            </span>
            <button class="btn btn-secondary btn-sm" id="btn-add-holiday" @click="addHoliday">+ Libur</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Karyawan (#modal-add-employee) -->
    <div class="modal-overlay" v-if="showEmpModal" @click.self="showEmpModal = false" id="modal-add-employee">
      <div class="modal" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">{{ editingId ? 'Edit Karyawan' : 'Tambah Karyawan' }}</span>
            <div class="text-xs text-tertiary">Keahlian &amp; tarif menjadi dasar estimasi biaya jasa (PRD §4.1.4)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showEmpModal = false">✕</button>
        </div>
        <form @submit.prevent="submitEmployee">
          <div class="modal-body">
            <div class="emp-form-grid">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-emp-name">Nama Lengkap *</label>
                <input class="input" id="input-emp-name" v-model="empForm.full_name" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-role">Jabatan *</label>
                <select class="select" id="input-emp-role" v-model="empForm.role" required>
                  <option>Teknisi</option>
                  <option>Kepala Regu</option>
                  <option>QC Inspector</option>
                  <option>Helper</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-skill">Keahlian Operasi *</label>
                <select class="select" id="input-emp-skill" v-model="empForm.skill" required>
                  <option v-for="s in WORKER_SKILLS" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-rate">Tarif Jasa (/jam) *</label>
                <input class="input" type="number" id="input-emp-rate" v-model.number="empForm.hourly_rate" min="0" step="1000" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-hours">Jam Kerja/Hari *</label>
                <input class="input" type="number" id="input-emp-hours" v-model.number="empForm.work_hours_per_day" min="1" max="14" step="0.5" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-phone">No. Telepon</label>
                <input class="input" id="input-emp-phone" v-model="empForm.phone_number" placeholder="0812-..." />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-emp-join">Tanggal Bergabung *</label>
                <input class="input" type="date" id="input-emp-join" v-model="empForm.join_date" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showEmpModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-emp">Simpan Karyawan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Absensi (#modal-add-absence) -->
    <div class="modal-overlay" v-if="showAbsModal" @click.self="showAbsModal = false" id="modal-add-absence">
      <div class="modal" style="max-width: 480px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Catat Absensi</span>
            <div class="text-xs text-tertiary">Karyawan absen tidak dihitung dalam kapasitas harian (§8.8)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showAbsModal = false">✕</button>
        </div>
        <form @submit.prevent="submitAbsence">
          <div class="modal-body">
            <div class="emp-form-grid">
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-abs-emp">Karyawan *</label>
                <select class="select" id="input-abs-emp" v-model="absForm.employee_id" required>
                  <option value="" disabled>Pilih karyawan...</option>
                  <option v-for="e in activeEmployees" :key="e.id" :value="e.id">{{ e.full_name }} ({{ e.skill }})</option>
                </select>
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-abs-type">Jenis *</label>
                <select class="select" id="input-abs-type" v-model="absForm.absence_type" required>
                  <option>CUTI</option>
                  <option>SAKIT</option>
                  <option>IZIN</option>
                  <option>TUGAS_LUAR</option>
                </select>
              </div>
              <div class="input-group">
                <label class="input-label" for="input-abs-from">Tanggal Mulai *</label>
                <input class="input" type="date" id="input-abs-from" v-model="absForm.date_from" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="input-abs-to">Tanggal Selesai *</label>
                <input class="input" type="date" id="input-abs-to" v-model="absForm.date_to" :min="absForm.date_from" required />
              </div>
              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-abs-notes">Keterangan</label>
                <input class="input" id="input-abs-notes" v-model="absForm.notes" placeholder="Cuti tahunan..." />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAbsModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-abs" :disabled="!absFormValid">Simpan Absensi</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  employees, absences, activeEmployees, activeAbsences, capacitySummary, holidays,
  estimationConfig, isWorkingDay, todayISO, employeeName,
  saveEmployee, toggleEmployeeActive, addAbsence, removeAbsence, toggleHoliday,
  WORKER_SKILLS,
  type Employee, type EmployeeRole, type AbsenceType,
} from '../../data/workforceStore'
import { formatRp } from '../../data/costEstimator'
import { useToast } from '../../data/toastStore'

const toast = useToast()
const today = todayISO()
const capacity = computed(() => capacitySummary(today))

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const skillIcon = (s: string) =>
  s === 'Fabrikasi' ? '🔧' : s === 'Powder Coating' ? '🎨' : s === 'Rakit Mekanis' ? '⚙️' : s === 'Wiring' ? '🔌' : '🔍'

// ─── Modal karyawan ──────────────────────────────────────────────────────────
const showEmpModal = ref(false)
const editingId = ref<string | null>(null)
const empForm = ref<Omit<Employee, 'id'>>({
  full_name: '', role: 'Teknisi' as EmployeeRole, skill: WORKER_SKILLS[0],
  hourly_rate: 50_000, work_hours_per_day: 8, phone_number: '', join_date: today, is_active: true,
})

const openEmployeeModal = (id?: string) => {
  editingId.value = id ?? null
  if (id) {
    const e = employees.value.find(x => x.id === id)
    if (e) empForm.value = { ...e }
  } else {
    empForm.value = {
      full_name: '', role: 'Teknisi', skill: 'Rakit Mekanis',
      hourly_rate: estimationConfig.value.defaultRates['Rakit Mekanis'],
      work_hours_per_day: estimationConfig.value.workHoursPerDay,
      phone_number: '', join_date: today, is_active: true,
    }
  }
  showEmpModal.value = true
}

const submitEmployee = () => {
  if (!empForm.value.full_name) return
  const saved = saveEmployee({ ...empForm.value, id: editingId.value ?? undefined })
  showEmpModal.value = false
  toast.success(editingId.value ? 'Karyawan Diperbarui' : 'Karyawan Ditambahkan',
    `${saved.full_name} (${saved.skill}) — tarif ${formatRp(saved.hourly_rate)}/jam`)
}

// ─── Modal absensi ───────────────────────────────────────────────────────────
const showAbsModal = ref(false)
const absForm = ref({ employee_id: '', absence_type: 'CUTI' as AbsenceType, date_from: today, date_to: today, notes: '' })
const absFormValid = computed(() => !!absForm.value.employee_id && !!absForm.value.date_from && !!absForm.value.date_to && absForm.value.date_to >= absForm.value.date_from)

const openAbsenceModal = () => {
  absForm.value = { employee_id: '', absence_type: 'CUTI', date_from: today, date_to: today, notes: '' }
  showAbsModal.value = true
}

const submitAbsence = () => {
  if (!absFormValid.value) return
  const a = addAbsence({ ...absForm.value })
  showAbsModal.value = false
  toast.info('Absensi Dicatat', `${employeeName(a.employee_id)} — ${a.absence_type} ${a.date_from} s/d ${a.date_to}. Kapasitas & estimasi durasi menyesuaikan otomatis.`)
}

// ─── Libur kalender ──────────────────────────────────────────────────────────
const addHoliday = () => {
  const input = prompt('Tanggal libur (YYYY-MM-DD):', today)
  if (!input) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    toast.error('Format Salah', 'Gunakan format YYYY-MM-DD')
    return
  }
  toggleHoliday(input)
  toast.success('Libur Ditambahkan', `${input} ditandai sebagai hari non-kerja.`)
}
</script>

<style scoped>
.row-inactive { opacity: 0.55; }
.emp-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
