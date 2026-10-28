/**
 * workforceStore.ts — Manajemen Ketersediaan Karyawan (Spesifikasi §8.8)
 * Kapasitas dasar: master karyawan (keahlian + tarif + jam/hari), absensi, kalender kerja.
 * Menyediakan: kapasitas harian per keahlian, tarif rata-rata, penanggalan hari kerja,
 * serta konfigurasi estimasi (overhead, pembulatan, threshold deviasi CRM).
 */

import { ref, computed } from 'vue'
import type { WorkerSkill } from './routingTemplates'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export type EmployeeRole = 'Teknisi' | 'Kepala Regu' | 'QC Inspector' | 'Helper'
export type AbsenceType = 'CUTI' | 'SAKIT' | 'IZIN' | 'TUGAS_LUAR'

export const WORKER_SKILLS: WorkerSkill[] = ['Fabrikasi', 'Powder Coating', 'Rakit Mekanis', 'Wiring', 'QC']

export interface Employee {
  id: string            // EMP-001
  full_name: string
  role: EmployeeRole
  skill: WorkerSkill
  hourly_rate: number   // Rp/jam — dasar services_cost
  work_hours_per_day: number
  phone_number?: string
  join_date: string
  is_active: boolean
}

export interface EmployeeAbsence {
  id: string
  employee_id: string
  absence_type: AbsenceType
  date_from: string
  date_to: string
  notes?: string
}

// ─── Konfigurasi Estimasi (di-edit dari Settings) ────────────────────────────

export const estimationConfig = ref({
  /** Jam kerja efektif default per hari (fallback karyawan tanpa data) */
  workHoursPerDay: 8,
  /** Sabtu termasuk hari kerja workshop */
  saturdayWorking: true,
  /** Overhead % ditambahkan ke HPP (0 = tanpa overhead) */
  overheadPct: 0,
  /** Pembulatan harga jual cost-plus ke kelipatan ini (Rp) */
  priceRounding: 100_000,
  /** Peringatan bila |harga cost-plus − estimasi CRM| / estimasi CRM melebihi % ini */
  crmDeviationThresholdPct: 20,
  /** Tarif default per keahlian — fallback bila tidak ada karyawan aktif */
  defaultRates: {
    'Fabrikasi': 45_000,
    'Powder Coating': 45_000,
    'Rakit Mekanis': 55_000,
    'Wiring': 60_000,
    'QC': 65_000,
  } as Record<WorkerSkill, number>,
})

// ─── Seed Data ───────────────────────────────────────────────────────────────

const seedEmployees: Employee[] = [
  { id: 'EMP-001', full_name: 'Hadi Sucipto', role: 'Kepala Regu', skill: 'Fabrikasi', hourly_rate: 50_000, work_hours_per_day: 8, phone_number: '0812-3456-7801', join_date: '2020-03-02', is_active: true },
  { id: 'EMP-002', full_name: 'Anto Wibowo', role: 'Teknisi', skill: 'Fabrikasi', hourly_rate: 45_000, work_hours_per_day: 8, phone_number: '0812-3456-7802', join_date: '2021-07-19', is_active: true },
  { id: 'EMP-003', full_name: 'Rudi Hartono', role: 'Teknisi', skill: 'Powder Coating', hourly_rate: 42_000, work_hours_per_day: 8, join_date: '2022-01-10', is_active: true },
  { id: 'EMP-004', full_name: 'Joko Prasetyo', role: 'Kepala Regu', skill: 'Rakit Mekanis', hourly_rate: 55_000, work_hours_per_day: 8, phone_number: '0812-3456-7804', join_date: '2019-05-06', is_active: true },
  { id: 'EMP-005', full_name: 'Pardi Setiawan', role: 'Teknisi', skill: 'Rakit Mekanis', hourly_rate: 48_000, work_hours_per_day: 8, join_date: '2021-11-01', is_active: true },
  { id: 'EMP-006', full_name: 'Slamet Riyadi', role: 'Kepala Regu', skill: 'Wiring', hourly_rate: 62_000, work_hours_per_day: 8, phone_number: '0812-3456-7806', join_date: '2018-08-15', is_active: true },
  { id: 'EMP-007', full_name: 'Wahyu Nugroho', role: 'Teknisi', skill: 'Wiring', hourly_rate: 55_000, work_hours_per_day: 8, join_date: '2022-04-11', is_active: true },
  { id: 'EMP-008', full_name: 'Sari Wulandari', role: 'QC Inspector', skill: 'QC', hourly_rate: 70_000, work_hours_per_day: 8, join_date: '2020-09-21', is_active: true },
]

const seedAbsences: EmployeeAbsence[] = [
  { id: 'ABS-001', employee_id: 'EMP-005', absence_type: 'CUTI', date_from: '2026-10-20', date_to: '2026-10-24', notes: 'Cuti keluarga' },
]

/** Libur nasional / hari non-kerjaa (work_calendar, PRD §3.1) */
const holidayDates = ref<string[]>([
  '2026-12-25',
  '2027-01-01',
])

// ─── State ───────────────────────────────────────────────────────────────────

export const employees = ref<Employee[]>([...seedEmployees])
export const absences = ref<EmployeeAbsence[]>([...seedAbsences])

// ─── Helper tanggal (string ISO YYYY-MM-DD) ──────────────────────────────────

const parseISO = (iso: string): Date => new Date(`${iso}T00:00:00`)
const toISO = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayISO = (): string => toISO(new Date())

export const isWorkingDay = (dateISO: string): boolean => {
  if (holidayDates.value.includes(dateISO)) return false
  const dow = parseISO(dateISO).getDay() // 0=Min..6=Sab
  if (dow === 0) return false
  if (dow === 6 && !estimationConfig.value.saturdayWorking) return false
  return true
}

export const isAbsentOn = (emp: Employee, dateISO: string): boolean =>
  absences.value.some(a =>
    a.employee_id === emp.id && dateISO >= a.date_from && dateISO <= a.date_to)

// ─── Kapasitas & Tarif ───────────────────────────────────────────────────────

export const activeEmployees = computed(() => employees.value.filter(e => e.is_active))

/** Karyawan aktif dengan keahlian tertentu */
export const employeesWithSkill = (skill: WorkerSkill): Employee[] =>
  activeEmployees.value.filter(e => e.skill === skill)

/**
 * Kapasitas harian (man-hours) sebuah keahlian pada tanggal tertentu (Spesifikasi §8.8).
 * = Σ jam kerja/hari karyawan aktif keahlian itu yang tidak absen; 0 bila bukan hari kerja.
 */
export const availableManHours = (skill: WorkerSkill, dateISO: string): number => {
  if (!isWorkingDay(dateISO)) return 0
  return employeesWithSkill(skill)
    .filter(e => !isAbsentOn(e, dateISO))
    .reduce((s, e) => s + e.work_hours_per_day, 0)
}

/** Kapasitas aman untuk estimasi: minimal 1 orang × jam default bila kapasitas riil 0 */
export const safeCapacity = (skill: WorkerSkill, dateISO: string): number =>
  Math.max(availableManHours(skill, dateISO), estimationConfig.value.workHoursPerDay)

/** True bila keahlian benar-benar punya kapasitas pada tanggal itu */
export const hasCapacity = (skill: WorkerSkill, dateISO: string): boolean =>
  availableManHours(skill, dateISO) > 0

/** Tarif rata-rata/jam keahlian (karyawan aktif); fallback tarif default konfigurasi */
export const avgHourlyRate = (skill: WorkerSkill): number => {
  const list = employeesWithSkill(skill)
  if (list.length === 0) return estimationConfig.value.defaultRates[skill]
  return list.reduce((s, e) => s + e.hourly_rate, 0) / list.length
}

/** Ringkasan kapasitas per keahlian (untuk kartu KPI & peringatan) */
export const capacitySummary = (dateISO: string = todayISO()) =>
  WORKER_SKILLS.map(skill => {
    const staff = employeesWithSkill(skill)
    const onLeave = staff.filter(e => isAbsentOn(e, dateISO)).length
    return {
      skill,
      headcount: staff.length,
      onLeave,
      manHoursPerDay: availableManHours(skill, dateISO),
      avgRate: avgHourlyRate(skill),
      isHoliday: !isWorkingDay(dateISO),
    }
  })

// ─── Penanggalan Hari Kerja ──────────────────────────────────────────────────

/**
 * Tanggal selesai bila pekerjaan butuh `days` hari kerja mulai dari `startISO`
 * (hari ke-1 = startISO bila hari kerja; loncat hari libur).
 */
export const addWorkingDays = (startISO: string, days: number): string => {
  if (days <= 0) return startISO
  let cursor = parseISO(startISO)
  let remaining = Math.ceil(days)
  // maju minimal 1 hari agar "selesai" = akhir hari kerja terakhir
  while (remaining > 0) {
    const iso = toISO(cursor)
    if (isWorkingDay(iso)) remaining--
    if (remaining > 0) cursor = new Date(cursor.getTime() + 86_400_000)
  }
  return toISO(cursor)
}

// ─── Aksi CRUD (prototype — in-memory) ───────────────────────────────────────

let empSeq = seedEmployees.length
export const saveEmployee = (data: Omit<Employee, 'id'> & { id?: string }): Employee => {
  if (data.id) {
    const idx = employees.value.findIndex(e => e.id === data.id)
    if (idx >= 0) {
      employees.value[idx] = { ...employees.value[idx], ...data }
      return employees.value[idx]
    }
  }
  empSeq++
  const emp: Employee = { ...data, id: `EMP-${String(empSeq).padStart(3, '0')}` }
  employees.value.push(emp)
  return emp
}

export const toggleEmployeeActive = (id: string) => {
  const e = employees.value.find(x => x.id === id)
  if (e) e.is_active = !e.is_active
}

let absSeq = seedAbsences.length
export const addAbsence = (data: Omit<EmployeeAbsence, 'id'>): EmployeeAbsence => {
  absSeq++
  const abs: EmployeeAbsence = { ...data, id: `ABS-${String(absSeq).padStart(3, '0')}` }
  absences.value.push(abs)
  return abs
}

export const removeAbsence = (id: string) => {
  absences.value = absences.value.filter(a => a.id !== id)
}

export const toggleHoliday = (dateISO: string) => {
  const i = holidayDates.value.indexOf(dateISO)
  if (i >= 0) holidayDates.value.splice(i, 1)
  else holidayDates.value.push(dateISO)
}

export const holidays = computed(() => holidayDates.value)

export const employeeName = (id: string): string =>
  employees.value.find(e => e.id === id)?.full_name ?? id

export const activeAbsences = computed(() =>
  [...absences.value].sort((a, b) => b.date_from.localeCompare(a.date_from)))
