// Extended Mock Data — M6 through M11
import { ref } from 'vue'

// M6 – Purchase Orders
export const mockPurchaseRequests = ref([
  { id: 'PR-2026-088', project: 'PRJ-2026-001', item: 'ACB 4P 1600A Schneider', qty: 2, uom: 'PCS', estimatedValue: 90_000_000, requestedBy: 'Budi Santoso', date: '2026-09-28', status: 'Approved', priority: 'High' },
  { id: 'PR-2026-089', project: 'PRJ-2026-001', item: 'Busbar Cu 100x10mm', qty: 120, uom: 'MTR', estimatedValue: 42_000_000, requestedBy: 'Siti Rahayu', date: '2026-09-30', status: 'Pending', priority: 'Medium' },
  { id: 'PR-2026-090', project: 'PRJ-2026-003', item: 'Enclosure Besi 2000x800x600', qty: 4, uom: 'PCS', estimatedValue: 48_000_000, requestedBy: 'Siti Rahayu', date: '2026-10-01', status: 'Draft', priority: 'High' },
  { id: 'PR-2026-091', project: 'PRJ-2026-002', item: 'MCCB 3P 250A ABB', qty: 16, uom: 'PCS', estimatedValue: 136_000_000, requestedBy: 'Andi Wijaya', date: '2026-10-02', status: 'Rejected', priority: 'Low' },
  { id: 'PR-2026-092', project: 'PRJ-2026-001', item: 'CT 5/1A 15VA', qty: 30, uom: 'PCS', estimatedValue: 36_000_000, requestedBy: 'Budi Santoso', date: '2026-10-04', status: 'Pending', priority: 'Medium' },
])
export const mockPurchaseOrders = ref([
  { id: 'PO-2026-156', vendor: 'PT. Schneider Electric Indonesia', project: 'PRJ-2026-001', items: 3, totalValue: 130_000_000, orderDate: '2026-09-29', eta: '2026-11-13', status: 'Partial GRN', paymentTerm: '30 hari', currency: 'IDR' },
  { id: 'PO-2026-150', vendor: 'PT. Supreme Cable', project: 'PRJ-2026-001', items: 2, totalValue: 52_000_000, orderDate: '2026-09-15', eta: '2026-09-29', status: 'GRN Selesai', paymentTerm: '30 hari', currency: 'IDR' },
  { id: 'PO-2026-141', vendor: 'PT. ABB Sakti Industri', project: 'PRJ-2026-001', items: 5, totalValue: 175_500_000, orderDate: '2026-09-05', eta: '2026-11-04', status: 'GRN Selesai', paymentTerm: '45 hari', currency: 'IDR' },
  { id: 'PO-2026-160', vendor: 'CV. Maju Jaya Powder Coat', project: 'PRJ-2026-003', items: 1, totalValue: 24_000_000, orderDate: '2026-10-02', eta: '2026-10-12', status: 'Open', paymentTerm: '14 hari', currency: 'IDR' },
  { id: 'PO-2026-162', vendor: 'PT. Laser Cut Presisi', project: 'PRJ-2026-003', items: 2, totalValue: 18_500_000, orderDate: '2026-10-04', eta: '2026-10-10', status: 'Open', paymentTerm: '14 hari', currency: 'IDR' },
])
// M7 – Work Orders / Production
export const mockWorkOrders = [
  { id: 'WO-2026-001-01', project: 'PRJ-2026-001', panel: 'LVMDP-01', stage: 'QC/FAT', progress: 95, assignedTo: 'Tim A: Joko, Pardi', startDate: '2026-06-01', dueDate: '2026-10-30', status: 'On Track', manhours: 240, completedHours: 228 },
  { id: 'WO-2026-001-02', project: 'PRJ-2026-001', panel: 'LVMDP-02', stage: 'Wiring', progress: 70, assignedTo: 'Tim B: Slamet, Wahyu', startDate: '2026-07-01', dueDate: '2026-11-01', status: 'On Track', manhours: 280, completedHours: 196 },
  { id: 'WO-2026-001-03', project: 'PRJ-2026-001', panel: 'MCC-01', stage: 'Rakit Mekanis', progress: 55, assignedTo: 'Tim A: Joko, Anton', startDate: '2026-08-01', dueDate: '2026-11-10', status: 'At Risk', manhours: 220, completedHours: 121 },
  { id: 'WO-2026-001-04', project: 'PRJ-2026-001', panel: 'SDP-01', stage: 'Fabrikasi', progress: 30, assignedTo: 'Tim C: Hadi, Rudi', startDate: '2026-09-01', dueDate: '2026-11-20', status: 'On Track', manhours: 180, completedHours: 54 },
  { id: 'WO-2026-003-01', project: 'PRJ-2026-003', panel: 'MCC-A1', stage: 'Fabrikasi', progress: 15, assignedTo: 'Tim C: Hadi', startDate: '2026-10-05', dueDate: '2026-11-25', status: 'On Track', manhours: 160, completedHours: 24 },
]

export const mockProductionStages = ['Fabrikasi', 'Powder Coating', 'Rakit Mekanis', 'Wiring', 'QC Internal', 'QC/FAT', 'Packing', 'Selesai']

export const mockTimeSheets = [
  { id: 'TS-001', woId: 'WO-2026-001-01', worker: 'Joko', date: '2026-10-06', hours: 8, stage: 'QC/FAT', notes: 'Testing breaker trip' },
  { id: 'TS-002', woId: 'WO-2026-001-02', worker: 'Slamet', date: '2026-10-06', hours: 8, stage: 'Wiring', notes: 'Control wiring selesai 70%' },
  { id: 'TS-003', woId: 'WO-2026-001-01', worker: 'Pardi', date: '2026-10-06', hours: 8, stage: 'QC/FAT', notes: 'Insulation resistance test' },
]

// M8 – Quality Control
export const mockNCRs = [
  { id: 'NCR-2026-045', project: 'PRJ-2026-001', panel: 'LVMDP-02', woId: 'WO-2026-001-02', type: 'Cacat Eksternal', description: 'Cat powder coat tidak merata pada bagian pintu bawah', severity: 'Minor', foundBy: 'Sari (QC)', foundDate: '2026-10-04', status: 'Open', disposisi: '', photos: 2 },
  { id: 'NCR-2026-041', project: 'PRJ-2026-001', panel: 'LVMDP-01', woId: 'WO-2026-001-01', type: 'Wiring Error', description: 'Kabel CT terminal terbalik pada feeder 3', severity: 'Major', foundBy: 'Sari (QC)', foundDate: '2026-09-28', status: 'Closed', disposisi: 'Rework', photos: 1 },
  { id: 'NCR-2026-039', project: 'PRJ-2026-001', panel: 'MCC-01', woId: 'WO-2026-001-03', type: 'Dimensional', description: 'Posisi mounting MCCB meleset 5mm dari gambar', severity: 'Minor', foundBy: 'IH (Eng)', foundDate: '2026-09-20', status: 'Closed', disposisi: 'Accept As-Is', photos: 3 },
]

export const mockIQCRecords = [
  { id: 'IQC-2026-089', grnId: 'GRN-2026-089', item: 'ACB 4P 1600A Masterpact NW16H1', qty: 2, inspectedQty: 2, passQty: 2, failQty: 0, result: 'Pass', inspectedBy: 'Sari', date: '2026-10-03', notes: 'Sertifikat type test sesuai' },
  { id: 'IQC-2026-088', grnId: 'GRN-2026-088', item: 'Kabel NYY 4x16mm²', qty: 1000, inspectedQty: 100, passQty: 100, failQty: 0, result: 'Pass', inspectedBy: 'Sari', date: '2026-09-29', notes: 'Sampling OK' },
  { id: 'IQC-2026-085', grnId: 'GRN-2026-085', item: 'MCCB 3P 250A Tmax T4S', qty: 12, inspectedQty: 12, passQty: 11, failQty: 1, result: 'Partial', inspectedBy: 'Hendra', date: '2026-09-21', notes: '1 unit handle rusak, retur ke ABB' },
]

export const mockFATPlans = [
  { id: 'FAT-2026-001', project: 'PRJ-2026-001', panel: 'LVMDP-01', scheduledDate: '2026-11-15', customer: 'PT. Semen Indonesia', witnesses: ['Ir. Bambang K.', 'Konsultan: PT. Tri Daya'], status: 'Scheduled', checklist: 18, completed: 0 },
  { id: 'FAT-2025-045', project: 'PRJ-2025-045', panel: 'All Panels', scheduledDate: '2025-12-10', customer: 'RS Hermina Group', witnesses: ['dr. Hanna Wijaya'], status: 'Done', checklist: 14, completed: 14 },
]

// M9 – Finance
export const mockInvoices = [
  { id: 'INV-2026-088', project: 'PRJ-2026-001', customer: 'PT. Semen Indonesia', termin: 'DP 30%', amount: 1_455_000_000, issueDate: '2026-03-05', dueDate: '2026-04-04', paidDate: '2026-04-02', status: 'Paid' },
  { id: 'INV-2026-095', project: 'PRJ-2026-001', customer: 'PT. Semen Indonesia', termin: 'Progress 60%', amount: 2_910_000_000, issueDate: '2026-10-01', dueDate: '2026-10-31', paidDate: '', status: 'Outstanding' },
  { id: 'INV-2026-090', project: 'PRJ-2026-003', customer: 'PT. Tjiwi Kimia', termin: 'DP 30%', amount: 645_000_000, issueDate: '2026-07-05', dueDate: '2026-08-04', paidDate: '2026-08-10', status: 'Paid' },
  { id: 'INV-2026-099', project: 'PRJ-2026-002', customer: 'PT. PLN (Persero)', termin: 'DP 30%', amount: 3_660_000_000, issueDate: '2026-10-05', dueDate: '2026-11-04', paidDate: '', status: 'Outstanding' },
  { id: 'INV-2025-210', project: 'PRJ-2025-045', customer: 'RS Hermina Group', termin: 'BAST 10%', amount: 87_500_000, issueDate: '2026-01-20', dueDate: '2026-02-19', paidDate: '', status: 'Overdue' },
]

export const mockCashFlow = [
  { month: 'Jun', inflow: 1_455_000_000, outflow: 890_000_000 },
  { month: 'Jul', inflow: 645_000_000, outflow: 1_200_000_000 },
  { month: 'Agu', inflow: 300_000_000, outflow: 980_000_000 },
  { month: 'Sep', inflow: 2_100_000_000, outflow: 1_450_000_000 },
  { month: 'Okt', inflow: 6_570_000_000, outflow: 2_100_000_000 },
  { month: 'Nov', inflow: 1_200_000_000, outflow: 1_800_000_000 },
]

export const mockAPItems = [
  { id: 'AP-001', vendor: 'PT. Schneider Electric Indonesia', poId: 'PO-2026-156', amount: 130_000_000, dueDate: '2026-11-28', status: 'Belum Bayar' },
  { id: 'AP-002', vendor: 'PT. ABB Sakti Industri', poId: 'PO-2026-141', amount: 175_500_000, dueDate: '2026-11-04', status: 'Belum Bayar' },
  { id: 'AP-003', vendor: 'CV. Maju Jaya Powder Coat', poId: 'PO-2026-160', amount: 24_000_000, dueDate: '2026-10-26', status: 'Overdue' },
]

// M10 – Client Portal
export const mockClientProjects = [
  {
    id: 'PRJ-2026-001',
    name: 'LVMDP Pabrik Tuban IV',
    progress: 72,
    status: 'Produksi',
    fatDate: '2026-11-15',
    deliveryDate: '2026-12-10',
    pm: 'Budi Santoso',
    pmPhone: '081234567890',
    milestones: [
      { name: 'Kontrak', date: '2026-03-01', done: true },
      { name: 'Submittal Disetujui', date: '2026-04-15', done: true },
      { name: 'Material Ready', date: '2026-05-20', done: true },
      { name: 'Mulai Produksi', date: '2026-05-28', done: true },
      { name: 'FAT', date: '2026-11-15', done: false },
      { name: 'Pengiriman', date: '2026-12-10', done: false },
      { name: 'BAST', date: '', done: false },
    ],
    recentPhotos: [
      { caption: 'Wiring LVMDP-02 tahap akhir', date: '2026-10-04' },
      { caption: 'Pemasangan busbar MCC-01', date: '2026-09-28' },
    ],
    pendingApprovals: [
      { id: 'DOC-SLD-003', name: 'SLD Rev.3 LVMDP-01', type: 'Shop Drawing', uploadDate: '2026-10-01', status: 'Pending' },
    ],
    invoices: [
      { id: 'INV-2026-088', termin: 'DP 30%', amount: 1_455_000_000, status: 'Paid', paidDate: '2026-04-02' },
      { id: 'INV-2026-095', termin: 'Progress 60%', amount: 2_910_000_000, status: 'Outstanding', dueDate: '2026-10-31' },
    ]
  }
]

// M11 – Audit Trail & Notifications
export const mockAuditTrail = [
  { id: 'AUD-001', entity: 'Quotation', entityId: 'QT-2026-031', action: 'Update', field: 'status', oldValue: 'Draft', newValue: 'Menunggu', user: 'Rina Mulyani', timestamp: '2026-10-06 09:15:22', reason: 'Submit untuk approval' },
  { id: 'AUD-002', entity: 'Work Order', entityId: 'WO-2026-001-02', action: 'Update', field: 'stage', oldValue: 'Rakit Mekanis', newValue: 'Wiring', user: 'Joko (Teknisi)', timestamp: '2026-10-06 08:30:00', reason: 'Update stage via tablet' },
  { id: 'AUD-003', entity: 'Purchase Order', entityId: 'PO-2026-162', action: 'Create', field: '—', oldValue: '—', newValue: 'PO baru dibuat', user: 'Siti Rahayu', timestamp: '2026-10-05 14:22:10', reason: '' },
  { id: 'AUD-004', entity: 'Item Master', entityId: 'ITM-001', action: 'Update', field: 'unit_price', oldValue: '42.000.000', newValue: '45.000.000', user: 'Admin', timestamp: '2026-10-04 10:00:00', reason: 'Update harga dari price list Schneider Q4-2026' },
  { id: 'AUD-005', entity: 'NCR', entityId: 'NCR-2026-041', action: 'Update', field: 'status', oldValue: 'Open', newValue: 'Closed', user: 'Sari (QC)', timestamp: '2026-10-03 16:45:00', reason: 'Rework selesai, verified by Manajer Teknik' },
]

export const mockNotifications = [
  { id: 'N-001', type: 'approval', title: 'Quotation Menunggu Approval', message: 'QT-2026-031 senilai Rp 3.25M perlu persetujuan Direktur', time: '10 menit lalu', read: false, urgent: true, channel: 'app', link: '/sales/quotations' },
  { id: 'N-002', type: 'production', title: 'WO Selesai Tahap Wiring', message: 'WO-2026-001-02 (LVMDP-02) telah selesai tahap Wiring', time: '1 jam lalu', read: false, urgent: false, channel: 'app', link: '/production/work-orders' },
  { id: 'N-003', type: 'stock', title: 'Stok Hampir Habis', message: 'Busbar Cu 100x10mm tersisa 250m — reorder point 300m', time: '2 jam lalu', read: false, urgent: true, channel: 'app', link: '/inventory' },
  { id: 'N-004', type: 'grn', title: 'GRN Menunggu IQC', message: 'GRN-2026-089 dari Schneider (3 item, 15 pcs) perlu inspeksi', time: '2 jam lalu', read: true, urgent: false, channel: 'app', link: '/inventory/grn' },
  { id: 'N-005', type: 'finance', title: 'Invoice Jatuh Tempo', message: 'INV-2025-210 (RS Hermina) overdue sejak 19 Feb 2026', time: '1 hari lalu', read: true, urgent: true, channel: 'email', link: '/finance/invoices' },
  { id: 'N-006', type: 'ncr', title: 'NCR Baru Dibuka', message: 'NCR-2026-045 dibuka pada LVMDP-02: cat powder coat tidak merata', time: '3 jam lalu', read: false, urgent: false, channel: 'app', link: '/quality/ncr' },
]

/** Antrean approval dibagikan lintas Dashboard, Platform, dan badge sidebar. */
export const mockApprovalQueue = ref([
  { id: 'APQ-001', type: 'Quotation', ref: 'QT-2026-031', description: 'Panel Distribusi Thamrin City', requestedBy: 'Rina Mulyani', amount: 3_250_000_000, date: '2026-10-06', status: 'Pending', approver: 'Direktur' },
  { id: 'APQ-002', type: 'Purchase Order', ref: 'PO-2026-156', description: 'ACB + MCCB Schneider PRJ-001', requestedBy: 'Siti Rahayu', amount: 130_000_000, date: '2026-09-29', status: 'Pending', approver: 'Direksi' },
  { id: 'APQ-003', type: 'BOM Final', ref: 'BOM-PRJ-003', description: 'BOM Final Panel MCC Tjiwi Kimia', requestedBy: 'Ir. Hartono', amount: 0, date: '2026-10-02', status: 'Pending', approver: 'Manajer Teknik' },
])
export const mockRoleDashboards = [
  { role: 'Direksi', icon: '👔', metrics: ['Revenue YTD', 'Margin Rata-rata', 'Proyek Aktif', 'AR Outstanding', 'Win Rate'] },
  { role: 'Project Manager', icon: '🏗️', metrics: ['Proyek Saya', 'Deadline Panel', 'NCR Open', 'Approval Pending', 'Manhour Usage'] },
  { role: 'Produksi', icon: '⚡', metrics: ['WO Aktif', 'Panel On Track', 'Kapasitas Tim', 'Timesheet Hari Ini', 'Delay Alert'] },
  { role: 'Gudang', icon: '🏪', metrics: ['Stock Alert', 'GRN Pending IQC', 'Reservasi Pending', 'PO ETA Minggu Ini', 'Pergerakan Hari Ini'] },
  { role: 'Finance', icon: '💰', metrics: ['AR Outstanding', 'AP Jatuh Tempo', 'Proyeksi Cash Flow', 'Invoice Bulan Ini', 'Overdue > 30 hari'] },
]

export const mockReportTemplates = [
  { id: 'RPT-001', name: 'Laporan Progres Produksi', category: 'Produksi', lastRun: '2026-10-05', format: 'Excel' },
  { id: 'RPT-002', name: 'Rekapitulasi Margin per Proyek', category: 'Finance', lastRun: '2026-10-01', format: 'PDF' },
  { id: 'RPT-003', name: 'Aging Piutang (AR)', category: 'Finance', lastRun: '2026-10-06', format: 'Excel' },
  { id: 'RPT-004', name: 'Stock Opname Periodik', category: 'Inventaris', lastRun: '2026-09-30', format: 'Excel' },
  { id: 'RPT-005', name: 'Rekap Pembelian per Vendor', category: 'Purchasing', lastRun: '2026-10-01', format: 'Excel' },
  { id: 'RPT-006', name: 'NCR Summary per Proyek', category: 'Quality', lastRun: '2026-10-04', format: 'PDF' },
]
