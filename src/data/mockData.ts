// Mock data store for PanelERP
export const mockProjects = [
  {
    id: 'PRJ-2026-001',
    name: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV',
    customer: 'PT. Semen Indonesia',
    status: 'Produksi',
    progress: 72,
    pm: 'Budi Santoso',
    contractValue: 4_850_000_000,
    startDate: '2026-03-01',
    fatDate: '2026-11-15',
    deliveryDate: '2026-12-10',
    panels: [
      { id: 'LVMDP-01', name: 'LVMDP-01 (Incoming)', status: 'QC/FAT', progress: 95, serial: 'SN-2026-001-01' },
      { id: 'LVMDP-02', name: 'LVMDP-02 (Outgoing A)', status: 'Wiring', progress: 70, serial: 'SN-2026-001-02' },
      { id: 'MCC-01', name: 'MCC-01 (Motor Control)', status: 'Rakit Mekanis', progress: 55, serial: 'SN-2026-001-03' },
      { id: 'SDP-01', name: 'SDP-01 (Sub Distribution)', status: 'Fabrikasi', progress: 30, serial: 'SN-2026-001-04' },
    ],
    milestone: { submittal: 'Disetujui', materialReady: '2026-05-20', prodStart: '2026-05-28', fat: '2026-11-15', delivery: '2026-12-10', bast: '' }
  },
  {
    id: 'PRJ-2026-002',
    name: 'Switchgear 20kV PLTU Suralaya Unit 9',
    customer: 'PT. PLN (Persero)',
    status: 'Engineering',
    progress: 35,
    pm: 'Andi Wijaya',
    contractValue: 12_200_000_000,
    startDate: '2026-05-15',
    fatDate: '2027-02-20',
    deliveryDate: '2027-03-15',
    panels: [],
    milestone: { submittal: 'Revise & Resubmit', materialReady: '', prodStart: '', fat: '2027-02-20', delivery: '2027-03-15', bast: '' }
  },
  {
    id: 'PRJ-2026-003',
    name: 'Panel MCC Pabrik Kertas Tjiwi Kimia',
    customer: 'PT. Tjiwi Kimia',
    status: 'Siap Produksi',
    progress: 20,
    pm: 'Siti Rahayu',
    contractValue: 2_150_000_000,
    startDate: '2026-07-01',
    fatDate: '2026-12-05',
    deliveryDate: '2026-12-20',
    panels: [],
    milestone: { submittal: 'Disetujui', materialReady: '2026-09-10', prodStart: '2026-09-20', fat: '2026-12-05', delivery: '2026-12-20', bast: '' }
  },
  {
    id: 'PRJ-2025-045',
    name: 'Distribution Board RS Hermina Banyumanik',
    customer: 'RS Hermina Group',
    status: 'BAST',
    progress: 100,
    pm: 'Budi Santoso',
    contractValue: 875_000_000,
    startDate: '2025-08-01',
    fatDate: '2025-12-10',
    deliveryDate: '2025-12-28',
    panels: [],
    milestone: { submittal: 'Disetujui', materialReady: '2025-09-15', prodStart: '2025-09-25', fat: '2025-12-10', delivery: '2025-12-28', bast: '2026-01-15' }
  },
]

// Catatan: katalog komponen (Item Master) pindah ke data/itemStore.ts
// sebagai single source of truth untuk Item Master, Inventaris, dan BOM.

export const mockVendors = [
  { id: 'VND-001', code: 'VND-SCH', name: 'PT. Schneider Electric Indonesia', category: 'Pemasok', contact: 'Dian Pratiwi', phone: '021-5555-1234', city: 'Jakarta', currency: 'IDR', paymentTerm: '30 hari', leadTime: 45, rating: 4.8, status: 'Aktif' },
  { id: 'VND-002', code: 'VND-ABB', name: 'PT. ABB Sakti Industri', category: 'Pemasok', contact: 'Reza Firmansyah', phone: '021-5555-5678', city: 'Jakarta', currency: 'IDR', paymentTerm: '45 hari', leadTime: 60, rating: 4.6, status: 'Aktif' },
  { id: 'VND-003', code: 'VND-SUP', name: 'PT. Supreme Cable', category: 'Pemasok', contact: 'Wulandari', phone: '021-7890-1234', city: 'Jakarta', currency: 'IDR', paymentTerm: '30 hari', leadTime: 14, rating: 4.7, status: 'Aktif' },
  { id: 'VND-004', code: 'VND-PC', name: 'CV. Maju Jaya Powder Coat', category: 'Subkontraktor', contact: 'Supardi', phone: '024-7654-3210', city: 'Semarang', currency: 'IDR', paymentTerm: '14 hari', leadTime: 7, rating: 4.2, status: 'Aktif' },
  { id: 'VND-005', code: 'VND-LC', name: 'PT. Laser Cut Presisi', category: 'Subkontraktor', contact: 'Hendri', phone: '024-1234-5678', city: 'Semarang', currency: 'IDR', paymentTerm: '14 hari', leadTime: 5, rating: 4.5, status: 'Aktif' },
]

export const mockCustomers = [
  { id: 'CST-001', code: 'CST-SEMEN', name: 'PT. Semen Indonesia (Persero) Tbk', type: 'BUMN', contact: 'Ir. Bambang Kurniawan', phone: '031-3981-732', city: 'Gresik', status: 'Aktif', totalProjects: 5, totalValue: 24_500_000_000 },
  { id: 'CST-002', code: 'CST-PLN', name: 'PT. PLN (Persero)', type: 'BUMN', contact: 'Agus Permana', phone: '021-7261-261', city: 'Jakarta', status: 'Aktif', totalProjects: 3, totalValue: 35_200_000_000 },
  { id: 'CST-003', code: 'CST-TJWI', name: 'PT. Tjiwi Kimia Tbk', type: 'Swasta', contact: 'Steven Hartono', phone: '031-9912-3456', city: 'Sidoarjo', status: 'Aktif', totalProjects: 8, totalValue: 12_400_000_000 },
  { id: 'CST-004', code: 'CST-HRM', name: 'RS Hermina Group', type: 'Swasta', contact: 'dr. Hanna Wijaya', phone: '021-8446-7890', city: 'Jakarta', status: 'Aktif', totalProjects: 2, totalValue: 1_800_000_000 },
]

export const mockQuotations = [
  { id: 'QT-2026-031', version: 'v3', project: 'Panel Distribusi Gedung Perkantoran Thamrin City', customer: 'PT. Nusa Indah Propertindo', value: 3_250_000_000, date: '2026-09-15', validUntil: '2026-10-15', status: 'Menunggu', preparedBy: 'Rina Mulyani', margin: 18.5 },
  { id: 'QT-2026-028', version: 'v2', project: 'MCC Pabrik Gula PG Krebet', customer: 'PT. PG Rajawali Nusantara', value: 5_800_000_000, date: '2026-09-01', validUntil: '2026-10-01', status: 'Menang', preparedBy: 'Budi Santoso', margin: 22.1 },
  { id: 'QT-2026-025', version: 'v1', project: 'Switchgear LV Hotel Pullman Jakarta', customer: 'PT. Accor Hotels Indonesia', value: 1_450_000_000, date: '2026-08-20', validUntil: '2026-09-20', status: 'Kalah', preparedBy: 'Rina Mulyani', margin: 14.2 },
  { id: 'QT-2026-032', version: 'v1', project: 'Panel LVMDP Pabrik Semen Rembang II', customer: 'PT. Semen Gresik', value: 7_100_000_000, date: '2026-09-25', validUntil: '2026-10-25', status: 'Draft', preparedBy: 'Andi Wijaya', margin: 20.0 },
]

export const mockGRN = [
  { id: 'GRN-2026-089', poRef: 'PO-2026-156', vendor: 'PT. Schneider Electric Indonesia', date: '2026-10-02', items: 3, totalQty: 15, status: 'IQC Pending', receivedBy: 'Wahyu' },
  { id: 'GRN-2026-088', poRef: 'PO-2026-150', vendor: 'PT. Supreme Cable', date: '2026-09-28', items: 2, totalQty: 2000, status: 'Selesai', receivedBy: 'Wahyu' },
  { id: 'GRN-2026-085', poRef: 'PO-2026-141', vendor: 'PT. ABB Sakti Industri', date: '2026-09-20', items: 5, totalQty: 48, status: 'Selesai', receivedBy: 'Slamet' },
]

export const mockDashboardStats = {
  activeProjects: 12,
  pendingApprovals: 7,
  stockAlerts: 3,
  openPOs: 18,
  totalRevenue: 48_750_000_000,
  productionOnTime: 84.5,
  qualityFirstPass: 91.2,
  avgMargin: 19.8,
}

export const mockRecentActivities = [
  { id: 1, type: 'approval', message: 'Quotation QT-2026-031 menunggu persetujuan Direktur', user: 'Rina Mulyani', time: '10 menit lalu', icon: '📋', urgent: true },
  { id: 2, type: 'production', message: 'WO WO-001-LVMDP-01 selesai tahap Wiring', user: 'Teknisi: Joko', time: '1 jam lalu', icon: '⚡', urgent: false },
  { id: 3, type: 'grn', message: 'GRN-2026-089 diterima, menunggu IQC', user: 'Wahyu', time: '2 jam lalu', icon: '📥', urgent: false },
  { id: 4, type: 'ncr', message: 'NCR-045 dibuka pada Panel LVMDP-02 (cacat cat)', user: 'QC: Sari', time: '3 jam lalu', icon: '⚠️', urgent: true },
  { id: 5, type: 'milestone', message: 'Milestone FAT PRJ-2026-001 dijadwalkan 15 Nov 2026', user: 'PM: Budi', time: '5 jam lalu', icon: '🎯', urgent: false },
  { id: 6, type: 'stock', message: 'Stok Busbar Tembaga 100x10mm mendekati reorder point', user: 'Sistem', time: '6 jam lalu', icon: '📦', urgent: true },
]

export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}jt`
  return `Rp ${value.toLocaleString('id-ID')}`
}

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const statusColors: Record<string, string> = {
  'Draft': 'badge-neutral',
  'Pending': 'badge-warning',
  'Approved': 'badge-success',
  'Rejected': 'badge-danger',
  'PO Dibuat': 'badge-info',
  'Menunggu': 'badge-warning',
  'Menang': 'badge-success',
  'Kalah': 'badge-danger',
  'Lead': 'badge-neutral',
  'Quotation': 'badge-info',
  'Engineering': 'badge-primary',
  'Siap Produksi': 'badge-warning',
  'Produksi': 'badge-primary',
  'QC/FAT': 'badge-info',
  'Siap Kirim': 'badge-warning',
  'Terkirim': 'badge-success',
  'BAST': 'badge-success',
  'Ditutup': 'badge-neutral',
  'Aktif': 'badge-success',
  'Tidak Aktif': 'badge-neutral',
  'Selesai': 'badge-success',
  'IQC Pending': 'badge-warning',
  'In Review': 'badge-warning',
  'Wiring': 'badge-primary',
  'Fabrikasi': 'badge-info',
  'Rakit Mekanis': 'badge-primary',
}
