/**
 * chainStore.ts — PanelERP Document Chaining State Machine
 * Implements Spesifikasi_Alur_Proses_Berantai_PanelERP.md v1.0
 *
 * Alur: Prospek → Quotation → Sales Order → Proyek → BOM → Dok.Teknis
 *       → Paket Rilis → Work Order → QC/FAT → Pengiriman/BAST → Invoice
 */

import { ref } from 'vue'
import { useToast } from './toastStore'
import { getItemById, getItemByCode, LONG_LEAD_THRESHOLD, type ItemMaster } from './itemStore'
import { getTemplateForPanelType } from './bomTemplates'
import { buildQuotationEstimate, crmDeviationPct, type QuotationEstimate } from './costEstimator'

// ─── Tipe Status per Dokumen ─────────────────────────────────────────────────

export type QuotationStatus =
  | 'DRAFT' | 'MENUNGGU_APPROVAL' | 'SIAP_KIRIM' | 'TERKIRIM'
  | 'DISETUJUI_KLIEN' | 'MENJADI_SO' | 'KALAH' | 'KEDALUWARSA' | 'DIGANTIKAN'

export type SOStatus =
  | 'DRAFT' | 'MENUNGGU_APPROVAL' | 'CONFIRMED' | 'BERJALAN'
  | 'DITAHAN' | 'SELESAI' | 'CLOSED' | 'DIBATALKAN'

export type ProyekStatus =
  | 'ENGINEERING' | 'MENUNGGU_PERSETUJUAN_GAMBAR' | 'SIAP_PRODUKSI'
  | 'PRODUKSI' | 'QC_FAT' | 'SIAP_KIRIM' | 'TERKIRIM' | 'BAST'
  | 'GARANSI' | 'DITUTUP' | 'DITAHAN' | 'DIBATALKAN'

export type BOMStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SUPERSEDED'
export type TechDocStatus = 'DRAFT' | 'REVIEW_INTERNAL' | 'DIKIRIM_KLIEN' | 'AFC' | 'DIGANTIKAN'
export type WOStatus = 'DRAFT' | 'DIRILIS' | 'BERJALAN' | 'SELESAI' | 'DIBATALKAN'
export type FATStatus = 'DIJADWALKAN' | 'BERJALAN' | 'LULUS' | 'LULUS_DENGAN_CATATAN' | 'GAGAL'
export type TerminStatus = 'BELUM_JATUH_TEMPO' | 'SIAP_DITAGIH' | 'DITAGIH' | 'LUNAS'
export type InvoiceStatus = 'DRAFT' | 'MENUNGGU_APPROVAL' | 'TERBIT' | 'DIBAYAR_SEBAGIAN' | 'LUNAS' | 'VOID'

// ─── Model Data ──────────────────────────────────────────────────────────────

export interface StatusLog {
  id: string
  doc_type: string
  doc_id: string
  from_status: string
  to_status: string
  action: string
  by_user: string
  at: string
  reason?: string
}

export interface PanelItem {
  id: string           // e.g. PRJ-2026-003-P01
  panel_no: string     // e.g. P01
  name: string         // e.g. LVMDP-01 (Incoming)
  serial: string
  type: string         // tipe panel untuk template dokumen wajib
  bom_status: BOMStatus
  bom_rev: string      // Rev A, Rev B, ...
  docs_status: Record<string, TechDocStatus> // {SLD: 'AFC', Layout: 'DRAFT'}
  wo_status: WOStatus
  fat_status: FATStatus | null
  progress: number
  // Kolom wajib per spec 5.1
  project_id: string
  source_type: 'SO'
  source_id: string
  status: string       // ENGINEERING, SIAP_PRODUKSI, PRODUKSI, SIAP_QC, SIAP_KIRIM, TERKIRIM
  is_locked: boolean
}

export interface PaymentTerm {
  id: string
  name: string
  percentage: number
  trigger_event: 'SO_CONFIRMED' | 'FAT_PASSED' | 'DELIVERED' | 'BAST_SIGNED' | 'WARRANTY_END' | 'TANGGAL_TETAP'
  status: TerminStatus
  amount: number
  invoice_id?: string
}

export interface VariationOrder {
  id: string
  so_id: string
  project_id: string
  title: string
  reason: string
  delta_amount: number
  delta_days: number
  status: 'DRAFT' | 'MENUNGGU_APPROVAL_INTERNAL' | 'DIKIRIM_KLIEN' | 'DISETUJUI' | 'DITERAPKAN' | 'DITOLAK' | 'DIBATALKAN'
  created_at: string
  created_by: string
}

export interface SalesOrder {
  // Kolom wajib spec 5.1
  id: string           // SO-2026-018
  doc_no: string
  project_id?: string
  source_type: 'QUOTATION' | 'PO_LANGSUNG'
  source_id: string    // quotation id
  status: SOStatus
  rev: string
  is_locked: boolean
  superseded_by_id?: string
  created_by: string
  created_at: string
  approved_by?: string
  approved_at?: string
  cancel_reason?: string
  // Data SO
  customer: string
  customer_id: string
  project_name: string
  customer_po: string
  customer_po_date: string
  pm: string
  contract_value: number
  retention_pct: number
  delivery_date: string
  warranty_months: number
  require_client_doc_approval: boolean
  shipping_address: string
  // Termin
  payment_terms: PaymentTerm[]
  // Panel lines (dari quotation)
  panel_lines: { type: string; qty: number; unit_price: number; spec: string }[]
  // VO list
  variation_orders: VariationOrder[]
  // Computed
  total_vo_amount: number
}

export interface Quotation {
  // Kolom wajib spec 5.1
  id: string           // QT-2026-031
  doc_no: string
  version: number
  project_id?: string
  source_type: 'PROSPEK'
  source_id: string    // prospek id
  status: QuotationStatus
  rev: string
  is_locked: boolean
  superseded_by_id?: string
  created_by: string
  created_at: string
  approved_by?: string
  approved_at?: string
  cancel_reason?: string
  // Data Quotation
  project: string
  customer: string
  customer_id: string
  valid_until: string
  margin: number
  value: number
  payment_terms_text: string
  // Panel lines (cost-plus, Spesifikasi §6.1.2)
  panel_lines: {
    type: string
    qty: number
    unit_price: number
    spec: string
    material_cost?: number
    services_cost?: number
    est_manhours?: number
    est_days?: number
    price_overridden?: boolean
    override_reason?: string
  }[]
  // Snapshot estimasi biaya & durasi (PRD §3.2 quotations)
  total_cost?: number
  est_start_date?: string
  est_days?: number
  est_finish_date?: string
  crm_estimated_value?: number
  crm_deviation_pct?: number
  cost_snapshot_at?: string
  // Ref ke SO yang sudah dibuat
  so_id?: string
}

export interface Proyek {
  id: string           // PRJ-2026-003
  doc_no: string
  so_id: string
  name: string
  customer: string
  customer_id: string
  pm: string
  status: ProyekStatus
  progress: number
  contract_value: number
  start_date: string
  fat_date: string
  delivery_date: string
  panels: PanelItem[]
  variation_orders: VariationOrder[]
  payment_terms: PaymentTerm[]
  is_locked: boolean
  created_at: string
}

// ─── Model BOM (Bill of Materials per Panel) ─────────────────────────────────
// PRD §3.3 tabel bill_of_materials + bom_items; Spesifikasi §7.1
// BOM selalu melekat pada panel — tidak ada "BOM baru" tanpa panel.

export interface BomItem {
  id: string
  bom_id: string
  /** FK -> items.id. Kode bebas dilarang (guard §7.1). */
  item_id: string
  /** Snapshot saat baris dibuat (tampilan tidak berubah bila master diedit) */
  item_code: string
  item_name: string
  category: string
  uom: string
  unit_price: number
  /** Kebutuhan baris ini untuk 1 panel */
  required_qty: number
  /** Label penandaan gambar: Q1, KM1, Busbar R-S-T */
  designator: string
  is_long_lead: boolean
  remarks: string
  source: 'TEMPLATE' | 'MANUAL' | 'COPY' | 'IMPORT'
}

export interface BomHeader {
  id: string
  /** ID dasar per panel (tanpa suffix versi) — untuk mengelompokkan revisi */
  base_id: string
  project_id: string
  panel_id: string
  panel_no: string
  panel_name: string
  panel_type: string
  bom_type: 'ESTIMASI' | 'PRODUKSI'
  rev: string
  version: number
  status: BOMStatus
  is_locked: boolean
  superseded_by_id?: string
  created_by: string
  created_at: string
  approved_by?: string
  approved_at?: string
  /** Alasan wajib untuk: pengembalian review & revisi */
  change_reason?: string
  items: BomItem[]
}

export interface MRPLine {
  item_id: string
  code: string
  name: string
  uom: string
  gross_qty: number
  on_hand: number
  net_qty: number
  long_lead: boolean
}

// ─── Faktor BOM ──────────────────────────────────────────────────────────────

export const bomBaseId = (projectId: string, panelNo: string): string =>
  `BOM-${projectId.replace('PRJ-', '')}-${panelNo.replace(/^P/, '')}`

const revLetter = (version: number): string =>
  `Rev ${String.fromCharCode(64 + Math.min(version, 26))}`

let bomLineSeq = 0
const nextBomLineId = (bomId: string) => `${bomId}-L${String(++bomLineSeq).padStart(3, '0')}`

const snapshotLine = (
  bom: Pick<BomHeader, 'id'>,
  item: ItemMaster,
  qty: number,
  designator: string,
  longLead: boolean,
  remarks: string,
  source: BomItem['source'],
): BomItem => ({
  id: nextBomLineId(bom.id),
  bom_id: bom.id,
  item_id: item.id,
  item_code: item.code,
  item_name: item.name,
  category: item.category,
  uom: item.uom,
  unit_price: item.unit_price,
  required_qty: qty,
  designator,
  is_long_lead: longLead,
  remarks,
  source,
})

/** Isi baris dari template tipe panel (kode -> snapshot Item Master) */
const templateLinesFor = (
  bom: Pick<BomHeader, 'id'>,
  panelType: string,
  source: BomItem['source'] = 'TEMPLATE',
): BomItem[] => {
  const tpl = getTemplateForPanelType(panelType)
  const rows: BomItem[] = []
  for (const line of tpl.lines) {
    const item = getItemByCode(line.code)
    if (!item) continue
    rows.push(snapshotLine(bom, item, line.qty, line.designator || '', line.longLead || false, line.remarks || '', source))
  }
  return rows
}

function buildBomHeader(
  project: { id: string },
  panel: PanelItem,
  opts: { status?: BOMStatus; version?: number; created_by?: string; created_at?: string; change_reason?: string } = {},
): BomHeader {
  const version = opts.version ?? 1
  const base = bomBaseId(project.id, panel.panel_no)
  const status = opts.status ?? 'DRAFT'
  const bom: BomHeader = {
    id: version === 1 ? base : `${base}-v${version}`,
    base_id: base,
    project_id: project.id,
    panel_id: panel.id,
    panel_no: panel.panel_no,
    panel_name: panel.name,
    panel_type: panel.type,
    bom_type: 'PRODUKSI',
    rev: revLetter(version),
    version,
    status,
    is_locked: status === 'APPROVED' || status === 'SUPERSEDED',
    created_by: opts.created_by ?? 'Sistem (otomatis SO Confirmed)',
    created_at: opts.created_at ?? new Date().toISOString().split('T')[0],
    change_reason: opts.change_reason,
    items: [],
  }
  if (status === 'APPROVED') {
    bom.approved_by = 'Ir. Hartono'
    bom.approved_at = opts.created_at || new Date().toISOString().split('T')[0]
  }
  bom.items = templateLinesFor(bom, panel.type)
  return bom
}



// ─── Model CRM / Prospek (PRD §3.2 tabel crm_leads) ──────────────────────────

export type ProspekStage = 'Lead' | 'Kualifikasi' | 'Penawaran' | 'Negosiasi' | 'Menang' | 'Kalah'
export type ProspekPriority = 'Normal' | 'Medium' | 'Urgent'

export const PROSPEK_STAGES: ProspekStage[] = ['Lead', 'Kualifikasi', 'Penawaran', 'Negosiasi', 'Menang', 'Kalah']
/** Tahap terminal — tidak boleh dijadikan tahap awal lead baru, tanpa Quotation. */
export const TERMINAL_PROSPEK_STAGES: ProspekStage[] = ['Menang', 'Kalah']
export const PROSPEK_WEIGHT: Record<ProspekStage, number> = {
  Lead: 10, Kualifikasi: 25, Penawaran: 50, Negosiasi: 75, Menang: 100, Kalah: 0,
}
export const KALAH_REASONS = ['Harga', 'Spesifikasi/Teknis', 'Timeline', 'Kompetitor Lain', 'Kredititas', 'Tender Dibatalkan']

export interface ProspekStageEntry {
  from: string       // tahap sebelumnya ('-' bila baru dibuat)
  to: ProspekStage
  at: string         // ISO date
  by: string
  reason?: string
}

export interface Prospek {
  id: string
  name: string
  customer: string
  customer_id: string
  value: number
  stage: ProspekStage
  priority: ProspekPriority
  owner: string
  created_at: string
  updated_at: string
  expected_closing_date: string
  next_follow_up_date: string
  notes: string
  outcome_reason: string
  competitor: string
  stage_history: ProspekStageEntry[]
}

const todayISO = () => new Date().toISOString().split('T')[0]

const seedProspek = (
  id: string, name: string, customer: string, customer_id: string,
  value: number, stage: ProspekStage, priority: ProspekPriority, owner: string,
  created_at: string, extra: Partial<Prospek> = {},
): Prospek => ({
  id, name, customer, customer_id, value, stage, priority, owner,
  created_at, updated_at: created_at,
  expected_closing_date: '', next_follow_up_date: '', notes: '', outcome_reason: '', competitor: '',
  stage_history: [{ from: '-', to: stage, at: created_at, by: owner, reason: 'Data awal migrasi' }],
  ...extra,
})

const initialProspek: Prospek[] = [
  seedProspek('LD-2026-014', 'Panel Distribusi Gedung Perkantoran Thamrin City', 'PT. Nusa Indah Propertindo', 'CST-NIP', 3_250_000_000, 'Penawaran', 'Medium', 'Rina Mulyani', '2026-09-10',
    { expected_closing_date: '2026-11-15', next_follow_up_date: '2026-10-20', notes: 'DBIncoming-Out + MCC panel, merk Schneider, konsultan: PT Cipta Arsitek.' }),
  seedProspek('LD-2026-015', 'MCC Pabrik Gula PG Krebet', 'PT. PG Rajawali Nusantara', 'CST-PGR', 5_800_000_000, 'Menang', 'Urgent', 'Budi Santoso', '2026-08-15',
    { expected_closing_date: '2026-09-30', notes: 'MCC 2 kubikel + 1 MCC injeksi. Telah menjadi SO-2026-022.', competitor: 'PT. Panca Listrindo' }),
  seedProspek('LD-2026-016', 'Panel LVMDP Pabrik Semen Rembang II', 'PT. Semen Gresik', 'CST-SGS', 7_100_000_000, 'Lead', 'Normal', 'Andi Wijaya', '2026-09-20',
    { notes: 'Masih dalam pengumpulan dokumen tender (KAK).' }),
  seedProspek('LD-2026-017', 'Tender Panel Gedung Apartemen Green City Semarang', 'PT. Greenland Indonesia', 'CST-GLN', 1_800_000_000, 'Lead', 'Normal', 'Rina Mulyani', '2026-09-25',
    { expected_closing_date: '2026-12-01', next_follow_up_date: '2026-10-18', notes: 'Kubikel LVMDP 2 lantai basement, konsultan belum ditunjuk.' }),
  seedProspek('LD-2026-018', 'MCC Pabrik Baja Krakatau Steel', 'PT. Krakatau Steel', 'CST-KSI', 8_500_000_000, 'Lead', 'Urgent', 'Budi Santoso', '2026-09-15',
    { expected_closing_date: '2026-10-30', next_follow_up_date: '2026-10-16', notes: 'Kebutuhan MCC line 3 & 4, kapasitas 2500A, iklim tropis IP55.' }),
  seedProspek('LD-2026-019', 'Distribution Board RSUD Kariadi Semarang', 'RSUD Dr. Kariadi', 'CST-RSK', 650_000_000, 'Kualifikasi', 'Normal', 'Rina Mulyani', '2026-09-05',
    { expected_closing_date: '2026-11-01', next_follow_up_date: '2026-10-17', notes: 'DB distribusi 4 panel, sudah survei lokasi 28 Sep 2026.' }),
  seedProspek('LD-2026-020', 'Panel Kontrol Conveyor Pelabuhan Tanjung Emas', 'PT. Pelindo III', 'CST-PLD', 3_200_000_000, 'Penawaran', 'Medium', 'Andi Wijaya', '2026-08-28',
    { expected_closing_date: '2026-10-25', next_follow_up_date: '2026-10-18', notes: 'Panel kontrol outdoor, tahan kawasan pelabuhan (corrosion proof).' }),
  seedProspek('LD-2026-021', 'LVMDP Tower Office Surabaya', 'PT. Pakuwon Jati', 'CST-PWN', 2_100_000_000, 'Penawaran', 'Normal', 'Rina Mulyani', '2026-08-20',
    { expected_closing_date: '2026-11-10', next_follow_up_date: '2026-10-22', notes: 'LVMDP incoming + 6 outgoing, ABB Emax 2.' }),
  seedProspek('LD-2026-022', 'Switchgear LV Hotel Pullman', 'PT. Accor Hotels Indonesia', 'CST-ACC', 1_450_000_000, 'Negosiasi', 'Medium', 'Budi Santoso', '2026-08-18',
    { expected_closing_date: '2026-10-28', next_follow_up_date: '2026-10-16', notes: 'Final nego diskon 4%, minta tambah garansi 24 bulan.' }),
  seedProspek('LD-2026-023', 'Panel MCC Distribusi Hotel Mercure Bekasi', 'PT. Accor Hotels Indonesia', 'CST-ACC', 980_000_000, 'Kalah', 'Normal', 'Andi Wijaya', '2026-07-10',
    { updated_at: '2026-09-02', outcome_reason: 'Harga', competitor: 'PT. Panca Listrindo', notes: 'Kalah 6% lebih murah dari kompetitor, revisi harga 3x tidak disetujui.' }),
]

const initialQuotations: Quotation[] = [
  {
    id: 'QT-2026-031', doc_no: 'QT-2026-031-v3', version: 3,
    source_type: 'PROSPEK', source_id: 'LD-2026-014',
    status: 'DISETUJUI_KLIEN',
    rev: 'v3', is_locked: false,
    created_by: 'Rina Mulyani', created_at: '2026-09-15',
    project: 'Panel Distribusi Gedung Perkantoran Thamrin City',
    customer: 'PT. Nusa Indah Propertindo', customer_id: 'CST-NIP',
    valid_until: '2026-11-15',
    margin: 18.5, value: 3_250_000_000,
    payment_terms_text: '30% DP, 60% FAT, 10% BAST',
    panel_lines: [
      { type: 'LVMDP-Incoming', qty: 1, unit_price: 850_000_000, spec: 'ACB 3200A 65kA' },
      { type: 'LVMDP-Outgoing', qty: 2, unit_price: 950_000_000, spec: 'MCCB 800A 36kA' },
    ]
  },
  {
    id: 'QT-2026-028', doc_no: 'QT-2026-028-v2', version: 2,
    source_type: 'PROSPEK', source_id: 'LD-2026-015',
    status: 'MENJADI_SO',
    rev: 'v2', is_locked: true,
    created_by: 'Budi Santoso', created_at: '2026-09-01',
    project: 'MCC Pabrik Gula PG Krebet', customer: 'PT. PG Rajawali Nusantara', customer_id: 'CST-PGR',
    valid_until: '2026-11-01',
    margin: 22.1, value: 5_800_000_000,
    payment_terms_text: '30% DP, 50% FAT, 20% BAST',
    so_id: 'SO-2026-022',
    panel_lines: [
      { type: 'MCC-Standard', qty: 3, unit_price: 1_200_000_000, spec: 'MCC Motor Control' },
      { type: 'LVMDP-Incoming', qty: 1, unit_price: 1_200_000_000, spec: 'ACB 2500A' },
    ]
  },
  {
    id: 'QT-2026-032', doc_no: 'QT-2026-032-v1', version: 1,
    source_type: 'PROSPEK', source_id: 'LD-2026-016',
    status: 'DRAFT',
    rev: 'v1', is_locked: false,
    created_by: 'Andi Wijaya', created_at: '2026-09-25',
    project: 'Panel LVMDP Pabrik Semen Rembang II', customer: 'PT. Semen Gresik', customer_id: 'CST-SGS',
    valid_until: '2026-11-25',
    margin: 20.0, value: 7_100_000_000,
    payment_terms_text: '30% DP, 60% FAT, 10% BAST',
    panel_lines: [
      { type: 'LVMDP-Incoming', qty: 2, unit_price: 1_200_000_000, spec: 'ACB 3200A' },
      { type: 'LVMDP-Outgoing', qty: 4, unit_price: 1_175_000_000, spec: 'MCCB' },
    ]
  },
]

const initialSalesOrders: SalesOrder[] = [
  {
    id: 'SO-2026-022', doc_no: 'SO-2026-022',
    source_type: 'QUOTATION', source_id: 'QT-2026-028',
    status: 'BERJALAN', rev: '1', is_locked: true,
    project_id: 'PRJ-2026-002',
    created_by: 'Admin Proyek', created_at: '2026-09-10',
    approved_by: 'Direktur', approved_at: '2026-09-12',
    customer: 'PT. PG Rajawali Nusantara', customer_id: 'CST-PGR',
    project_name: 'MCC Pabrik Gula PG Krebet',
    customer_po: 'PO-PGR/2026/088', customer_po_date: '2026-09-08',
    pm: 'Budi Santoso',
    contract_value: 5_800_000_000,
    retention_pct: 5,
    delivery_date: '2027-03-15',
    warranty_months: 12,
    require_client_doc_approval: true,
    shipping_address: 'Jl. Raya PG Krebet, Malang',
    panel_lines: [
      { type: 'MCC-Standard', qty: 3, unit_price: 1_200_000_000, spec: 'MCC Motor Control' },
      { type: 'LVMDP-Incoming', qty: 1, unit_price: 1_200_000_000, spec: 'ACB 2500A' },
    ],
    payment_terms: [
      { id: 'PT-022-1', name: 'Down Payment 30%', percentage: 30, trigger_event: 'SO_CONFIRMED', status: 'DITAGIH', amount: 1_740_000_000 },
      { id: 'PT-022-2', name: 'Progress FAT 50%', percentage: 50, trigger_event: 'FAT_PASSED', status: 'BELUM_JATUH_TEMPO', amount: 2_900_000_000 },
      { id: 'PT-022-3', name: 'Pelunasan Pengiriman 20%', percentage: 20, trigger_event: 'DELIVERED', status: 'BELUM_JATUH_TEMPO', amount: 1_160_000_000 },
    ],
    variation_orders: [],
    total_vo_amount: 0,
  },
]

const initialProyek: Proyek[] = [
  {
    id: 'PRJ-2026-001', doc_no: 'PRJ-2026-001',
    so_id: 'SO-2026-018',
    name: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV',
    customer: 'PT. Semen Indonesia', customer_id: 'CST-SEMEN',
    pm: 'Budi Santoso',
    status: 'PRODUKSI', progress: 72,
    contract_value: 4_850_000_000,
    start_date: '2026-03-01', fat_date: '2026-11-15', delivery_date: '2026-12-10',
    is_locked: false, created_at: '2026-03-01',
    payment_terms: [
      { id: 'PT-018-1', name: 'DP 20%', percentage: 20, trigger_event: 'SO_CONFIRMED', status: 'LUNAS', amount: 970_000_000 },
      { id: 'PT-018-2', name: 'FAT 70%', percentage: 70, trigger_event: 'FAT_PASSED', status: 'BELUM_JATUH_TEMPO', amount: 3_395_000_000 },
      { id: 'PT-018-3', name: 'BAST 10%', percentage: 10, trigger_event: 'BAST_SIGNED', status: 'BELUM_JATUH_TEMPO', amount: 485_000_000 },
    ],
    variation_orders: [],
    panels: [
      { id: 'PRJ-2026-001-P01', panel_no: 'P01', name: 'LVMDP-01 (Incoming)', serial: 'SN-2026-001-01', type: 'LVMDP-Incoming', bom_status: 'APPROVED', bom_rev: 'Rev A', docs_status: { SLD: 'AFC', Layout: 'AFC', Wiring: 'AFC' }, wo_status: 'SELESAI', fat_status: 'LULUS', progress: 95, project_id: 'PRJ-2026-001', source_type: 'SO', source_id: 'SO-2026-018', status: 'SIAP_KIRIM', is_locked: false },
      { id: 'PRJ-2026-001-P02', panel_no: 'P02', name: 'LVMDP-02 (Outgoing A)', serial: 'SN-2026-001-02', type: 'LVMDP-Outgoing', bom_status: 'APPROVED', bom_rev: 'Rev A', docs_status: { SLD: 'AFC', Layout: 'AFC', Wiring: 'REVIEW_INTERNAL' }, wo_status: 'BERJALAN', fat_status: null, progress: 70, project_id: 'PRJ-2026-001', source_type: 'SO', source_id: 'SO-2026-018', status: 'PRODUKSI', is_locked: false },
      { id: 'PRJ-2026-001-P03', panel_no: 'P03', name: 'MCC-01 (Motor Control)', serial: 'SN-2026-001-03', type: 'MCC-Standard', bom_status: 'APPROVED', bom_rev: 'Rev A', docs_status: { SLD: 'AFC', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DIRILIS', fat_status: null, progress: 55, project_id: 'PRJ-2026-001', source_type: 'SO', source_id: 'SO-2026-018', status: 'PRODUKSI', is_locked: false },
      { id: 'PRJ-2026-001-P04', panel_no: 'P04', name: 'SDP-01 (Sub Distribution)', serial: 'SN-2026-001-04', type: 'SDP', bom_status: 'IN_REVIEW', bom_rev: 'Rev A', docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DRAFT', fat_status: null, progress: 30, project_id: 'PRJ-2026-001', source_type: 'SO', source_id: 'SO-2026-018', status: 'ENGINEERING', is_locked: false },
    ],
  },
  {
    id: 'PRJ-2026-002', doc_no: 'PRJ-2026-002',
    so_id: 'SO-2026-022',
    name: 'MCC Pabrik Gula PG Krebet',
    customer: 'PT. PG Rajawali Nusantara', customer_id: 'CST-PGR',
    pm: 'Budi Santoso',
    status: 'ENGINEERING', progress: 35,
    contract_value: 5_800_000_000,
    start_date: '2026-09-12', fat_date: '2027-02-20', delivery_date: '2027-03-15',
    is_locked: false, created_at: '2026-09-12',
    payment_terms: [
      { id: 'PT-022-1', name: 'Down Payment 30%', percentage: 30, trigger_event: 'SO_CONFIRMED', status: 'DITAGIH', amount: 1_740_000_000 },
      { id: 'PT-022-2', name: 'Progress FAT 50%', percentage: 50, trigger_event: 'FAT_PASSED', status: 'BELUM_JATUH_TEMPO', amount: 2_900_000_000 },
      { id: 'PT-022-3', name: 'Pelunasan Pengiriman 20%', percentage: 20, trigger_event: 'DELIVERED', status: 'BELUM_JATUH_TEMPO', amount: 1_160_000_000 },
    ],
    variation_orders: [],
    panels: [
      { id: 'PRJ-2026-002-P01', panel_no: 'P01', name: 'MCC-01', serial: 'SN-2026-002-01', type: 'MCC-Standard', bom_status: 'DRAFT', bom_rev: 'Rev A', docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DRAFT', fat_status: null, progress: 10, project_id: 'PRJ-2026-002', source_type: 'SO', source_id: 'SO-2026-022', status: 'ENGINEERING', is_locked: false },
      { id: 'PRJ-2026-002-P02', panel_no: 'P02', name: 'MCC-02', serial: 'SN-2026-002-02', type: 'MCC-Standard', bom_status: 'DRAFT', bom_rev: 'Rev A', docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DRAFT', fat_status: null, progress: 10, project_id: 'PRJ-2026-002', source_type: 'SO', source_id: 'SO-2026-022', status: 'ENGINEERING', is_locked: false },
      { id: 'PRJ-2026-002-P03', panel_no: 'P03', name: 'MCC-03', serial: 'SN-2026-002-03', type: 'MCC-Standard', bom_status: 'DRAFT', bom_rev: 'Rev A', docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DRAFT', fat_status: null, progress: 10, project_id: 'PRJ-2026-002', source_type: 'SO', source_id: 'SO-2026-022', status: 'ENGINEERING', is_locked: false },
      { id: 'PRJ-2026-002-P04', panel_no: 'P04', name: 'LVMDP-Incoming', serial: 'SN-2026-002-04', type: 'LVMDP-Incoming', bom_status: 'DRAFT', bom_rev: 'Rev A', docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' }, wo_status: 'DRAFT', fat_status: null, progress: 5, project_id: 'PRJ-2026-002', source_type: 'SO', source_id: 'SO-2026-022', status: 'ENGINEERING', is_locked: false },
    ],
  },
]

// ─── Seed BOM (sinkron dengan status panel di atas) ──────────────────────────

const initialBoms: BomHeader[] = []
for (const prj of initialProyek) {
  for (const panel of prj.panels) {
    initialBoms.push(buildBomHeader(prj, panel, {
      status: panel.bom_status,
      created_at: prj.start_date,
      created_by: panel.bom_status === 'DRAFT' ? 'Sistem (otomatis SO Confirmed)' : 'Ir. Hartono',
    }))
  }
}

// ─── Reactive State ──────────────────────────────────────────────────────────

export const prospekList = ref(initialProspek)
export const quotations = ref<Quotation[]>(initialQuotations)
export const salesOrders = ref<SalesOrder[]>(initialSalesOrders)
export const proyekList = ref<Proyek[]>(initialProyek)
export const bomHeaders = ref<BomHeader[]>(initialBoms)
export const statusLog = ref<StatusLog[]>([])

// ─── Snapshot Estimasi Cost-plus (Spesifikasi §6.1.2) ────────────────────────

/** Hitung ulang estimasi HPP + durasi sebuah quotation (advisory / keperluan tampilan). */
export const estimateForQuotation = (qt: Quotation): QuotationEstimate =>
  buildQuotationEstimate(
    qt.panel_lines.map(l => ({
      type: l.type, qty: l.qty, spec: l.spec,
      unit_price: l.unit_price,
      price_overridden: l.price_overridden,
      override_reason: l.override_reason,
    })),
    qt.margin,
    qt.est_start_date || qt.created_at || todayISO(),
  )

/** Isi kolom biaya/durasi quotation dari estimator (dipakai seed & pembuatan baru). */
const applyEstimateSnapshot = (qt: Quotation) => {
  const est = estimateForQuotation(qt)
  qt.panel_lines.forEach((l, i) => {
    const le = est.lines[i]
    if (!le) return
    l.material_cost = le.materialCost
    l.services_cost = le.servicesCost
    l.est_manhours = le.manhours
    l.est_days = le.estDays
  })
  qt.total_cost = est.totalHpp
  qt.est_start_date = qt.est_start_date || qt.created_at
  qt.est_days = est.estDays
  qt.est_finish_date = est.estFinishDate
  const prospek = prospekList.value.find(p => p.id === qt.source_id)
  qt.crm_estimated_value = prospek?.value
  qt.crm_deviation_pct = crmDeviationPct(qt.value, prospek?.value) ?? undefined
  qt.cost_snapshot_at = `${qt.created_at}T00:00:00`
}
quotations.value.forEach(applyEstimateSnapshot)

// ─── Helper: Nomor Urut ──────────────────────────────────────────────────────

let qtSeq = 33
let soSeq = 23
let prjSeq = 3
let prospekSeq = 23

const nextYear = () => new Date().getFullYear()
const nextQTId = () => `QT-${nextYear()}-0${qtSeq++}`
const nextSOId = () => `SO-${nextYear()}-0${soSeq++}`
const nextPRJId = () => `PRJ-${nextYear()}-00${prjSeq++}`
const nextProspekId = () => `LD-${nextYear()}-${String(prospekSeq++).padStart(3, '0')}`

// ─── Status Log ──────────────────────────────────────────────────────────────

const addLog = (docType: string, docId: string, from: string, to: string, action: string, reason?: string) => {
  statusLog.value.unshift({
    id: `LOG-${Date.now()}`,
    doc_type: docType,
    doc_id: docId,
    from_status: from,
    to_status: to,
    action,
    by_user: 'Budi Santoso', // current user mock
    at: new Date().toLocaleString('id-ID'),
    reason
  })
}

// ─── Penilaian Kelayakan Quotation (Deal Assessment) ─────────────────────────
// PM tidak perlu membaca angka mentah: skor 0–100 + verdict + alasan + rekomendasi.
// Semua komponen dihitung dari data yang sudah ada (tanpa input tambahan).

export type DealVerdict = 'LAYAK' | 'WASPADA' | 'TIDAK_DISARANKAN'

export interface AssessmentFactor {
  name: string
  weight: number
  points: number
  detail: string
}

export interface QuotationAssessment {
  score: number
  verdict: DealVerdict
  factors: AssessmentFactor[]
  /** Alasan ringkas yang harus dibaca PM sebelum memutuskan lanjut. */
  reasons: string[]
  /** Aksi konkret yang disarankan sistem. */
  recommendation: string
  estimated_cost: number
  estimated_margin_pct: number | null
  long_lead_items: string[]
}

const MARGIN_THRESHOLD_PCT = 18 // PRD §4.2.2: <18% → approval Direksi
const SAFE_MARGIN_PCT = 20

/** Estimasi biaya material 1 unit panel dari template BOM × harga Item Master. */
export const estimatePanelCost = (panelType: string): number => {
  const tpl = getTemplateForPanelType(panelType)
  if (!tpl) return 0
  return tpl.lines.reduce((sum, line) => {
    const item = getItemByCode(line.code)
    return sum + (item?.unit_price ?? 0) * line.qty
  }, 0)
}

/** Item long-lead (>threshold) yang dipakai pada tipe panel quotation ini. */
export const longLeadItemsFor = (lines: { type: string; qty: number }[]): string[] => {
  const codes = new Set<string>()
  for (const line of lines) {
    const tpl = getTemplateForPanelType(line.type)
    if (!tpl) continue
    for (const tl of tpl.lines) {
      if (!tl.longLead) continue
      const item = getItemByCode(tl.code)
      if (item && item.lead_time_days > LONG_LEAD_THRESHOLD) codes.add(`${item.code} (${item.lead_time_days} hr)`)
    }
  }
  return [...codes]
}

export const assessQuotation = (qt: Quotation): QuotationAssessment => {
  const factors: AssessmentFactor[] = []
  const reasons: string[] = []
  const recs: string[] = []

  // 1. Margin vs ambang PRD (bobot 30)
  const marginPts = qt.margin >= SAFE_MARGIN_PCT ? 30 : qt.margin >= MARGIN_THRESHOLD_PCT ? 20 : 5
  factors.push({ name: 'Margin vs ambang', weight: 30, points: marginPts, detail: `Target margin ${qt.margin}% (ambang aman ${SAFE_MARGIN_PCT}%, minimum direksi ${MARGIN_THRESHOLD_PCT}%)` })
  if (qt.margin < MARGIN_THRESHOLD_PCT) reasons.push(`Margin ${qt.margin}% di bawah ambang ${MARGIN_THRESHOLD_PCT}% — wajib approval Direksi.`)
  else if (marginPts < 30) reasons.push(`Margin ${qt.margin}% tipis (di bawah ${SAFE_MARGIN_PCT}% aman).`)
  if (qt.margin < MARGIN_THRESHOLD_PCT) recs.push('Ajukan approval Direksi atau revisi harga jual naik.')

  // 2. Estimasi HPP material + jasa (Spesifikasi §6.1.2; bobot 25)
  const costEst = estimateForQuotation(qt)
  const estimated_cost = costEst.totalHpp
  const est_margin_pct = qt.value > 0 ? ((qt.value - estimated_cost) / qt.value) * 100 : null
  let hppPts = 0
  if (est_margin_pct === null) hppPts = 8
  else if (est_margin_pct >= 25) hppPts = 25
  else if (est_margin_pct >= 15) hppPts = 15
  else hppPts = 0
  factors.push({
    name: 'Estimasi HPP (material + jasa)', weight: 25, points: hppPts,
    detail: est_margin_pct === null
      ? 'Nilai quotation 0 — tidak bisa menghitung margin kotor.'
      : `Material ${formatCurrencyChain(costEst.totalMaterial)} + jasa produksi ${formatCurrencyChain(costEst.totalServices)} = HPP ${formatCurrencyChain(estimated_cost)} → margin kotor ±${est_margin_pct.toFixed(1)}% dari nilai jual ${formatCurrencyChain(qt.value)}. Estimasi perakitan ${costEst.estDays} hari kerja (s/d ${costEst.estFinishDate}).`,
  })
  if (est_margin_pct !== null && est_margin_pct < 15) {
    reasons.push(`Margin kotor terestimasi ${est_margin_pct.toFixed(1)}% — sangat tipis, risiko merugi setelah overhead & PPN.`)
    recs.push('Turunkan spesifikasi komponen, efisienkan jam standar routing, atau naikkan harga jual sebelum terbit.')
  }
  if (costEst.skillWarnings.length) {
    reasons.push(...costEst.skillWarnings)
  }

  // 3. Cashflow termin pembayaran (bobot 15)
  const dpMatch = qt.payment_terms_text.match(/(\d+)\s*%/)
  const dpPct = dpMatch ? parseInt(dpMatch[1], 10) : 0
  const cashPts = dpPct >= 30 ? 15 : dpPct >= 20 ? 10 : 5
  factors.push({ name: 'Cashflow termin (DP)', weight: 15, points: cashPts, detail: `Termin: ${qt.payment_terms_text}${dpPct ? ` — DP ${dpPct}%` : ''}` })
  if (dpPct < 20) reasons.push(`DP hanya ${dpPct || 0}% — beban modal berat sebelum produksi.`)
  if (dpPct < 20) recs.push('Minta revisi termin DP ke ≥30%.')

  // 4. Risiko pengadaan long-lead (bobot 15)
  const long_lead_items = longLeadItemsFor(qt.panel_lines)
  const llPts = long_lead_items.length === 0 ? 15 : 10
  factors.push({ name: 'Risiko pengadaan', weight: 15, points: llPts, detail: long_lead_items.length ? `Long-lead: ${long_lead_items.join(', ')}` : 'Tidak ada komponen long-lead pada panel yang ditawarkan.' })
  if (long_lead_items.length) reasons.push(`${long_lead_items.length} komponen long-lead (lead time > ${LONG_LEAD_THRESHOLD} hari) — jadwal produksi harus ditinjau.`)

  // 5. Kesehatan prospek terkait (bobot 15)
  const prospek = prospekList.value.find(p => p.id === qt.source_id)
  let prosPts = 8
  let prosDetail = 'Prospek sumber tidak ditemukan (kutipan manual).'
  if (prospek) {
    const overdue = prospek.expected_closing_date && new Date(prospek.expected_closing_date) < new Date()
    prosPts = overdue ? 3 : prospek.expected_closing_date ? 15 : 8
    prosDetail = `Prospek ${prospek.id} · tahap ${prospek.stage} · prioritas ${prospek.priority}` +
      (prospek.expected_closing_date ? ` · target closing ${prospek.expected_closing_date}${overdue ? ' (LEWAT)' : ''}` : '')
    if (overdue) reasons.push(`Target closing prospek ${prospek.expected_closing_date} sudah lewat — deal bisa basi.`)
    if (!prospek.expected_closing_date) reasons.push('Target closing prospek belum diisi — timeline tidak terukur.')
    if (overdue) recs.push('Hubungi klien untuk konfirmasi timeline sebelum mengeluarkan biaya lebih lanjut.')
  }
  factors.push({ name: 'Kesehatan prospek', weight: 15, points: prosPts, detail: prosDetail })

  // Masa berlaku quotation (pengingat, tanpa bobot)
  if (qt.valid_until && new Date(qt.valid_until) < new Date()) {
    reasons.push(`Masa berlaku ${qt.valid_until} sudah lewat — perlu revisi penawaran.`)
  }

  const score = factors.reduce((s, f) => s + f.points, 0)
  const verdict: DealVerdict = score >= 75 ? 'LAYAK' : score >= 50 ? 'WASPADA' : 'TIDAK_DISARANKAN'
  if (verdict === 'LAYAK' && recs.length === 0) recs.push('Lanjutkan proses: ajukan approval & kirim ke klien sesuai state machine.')
  if (verdict === 'WASPADA' && recs.length === 0) recs.push('Perbaiki poin merah di atas sebelum mengirim ke klien.')

  return {
    score, verdict, factors,
    reasons: reasons.length ? reasons : ['Tidak ada factor risiko terdeteksi — profil deal sehat.'],
    recommendation: recs.join(' ') || 'Lanjutkan proses.',
    estimated_cost, estimated_margin_pct: est_margin_pct, long_lead_items,
  }
}

// ─── Aksi Prospek / CRM (PRD §4.2.1 + guard pindah tahap) ────────────────────

const stageIndex = (s: ProspekStage) => PROSPEK_STAGES.indexOf(s)

export const linkedQuotations = (prospekId: string) =>
  quotations.value.filter(q => q.source_type === 'PROSPEK' && q.source_id === prospekId)

export const stageHasQuotation = (prospekId: string) =>
  linkedQuotations(prospekId).some(q => q.status !== 'DIGANTIKAN' && q.status !== 'KALAH')

/**
 * Validasi pindah tahap pipeline (Spesifikasi §6 / CRM best practice).
 * Maju melompat diperbolehkan asal syarat target terpenuhi; mundur selalu boleh
 * (dicatat sebagai koreksi manual di stage_history).
 */
export const validateStageMove = (
  prospek: Prospek, to: ProspekStage,
  opts?: { reason?: string; competitor?: string },
): { ok: boolean; message?: string } => {
  if (to === prospek.stage) return { ok: false, message: 'Sudah berada di tahap tersebut.' }
  const from = stageIndex(prospek.stage)
  const target = stageIndex(to)
  const backwards = target < from
  const passed = (s: ProspekStage) =>
    prospek.stage === s || prospek.stage_history.some(e => e.to === s)

  if (backwards) return { ok: true }
  // Negosiasi & Menang wajib berpijak pada dokumen Quotation; Kalah cukup alasan
  // (prospek boleh gugur kapan pun, termasuk sebelum penawaran terbit).
  if ((to === 'Negosiasi' || to === 'Menang') && !stageHasQuotation(prospek.id)) {
    return { ok: false, message: `Tahap ${to} mensyaratkan minimal 1 Quotation terbit. Buat Quotation dulu dari prospek ini.` }
  }
  if (to === 'Kualifikasi') {
    if (!prospek.customer_id) return { ok: false, message: 'Isi data pelanggan sebelum masuk Kualifikasi.' }
    if (prospek.value <= 0) return { ok: false, message: 'Isi estimasi nilai potensi sebelum masuk Kualifikasi.' }
    return { ok: true }
  }
  if (to === 'Penawaran' && !passed('Kualifikasi')) {
    return { ok: false, message: 'Funnel discipline: wajib melewati tahap Kualifikasi sebelum Penawaran.' }
  }
  if (to === 'Kalah') {
    if (!opts?.reason) return { ok: false, message: 'Tahap Kalah wajib menyertakan alasan kalah.' }
    return { ok: true }
  }
  return { ok: true }
}

export const moveProspek = (
  prospekId: string, to: ProspekStage,
  opts?: { reason?: string; competitor?: string },
): { ok: boolean; message: string } => {
  const prospek = prospekList.value.find(p => p.id === prospekId)
  if (!prospek) return { ok: false, message: 'Prospek tidak ditemukan.' }
  const check = validateStageMove(prospek, to, opts)
  if (!check.ok) return { ok: false, message: check.message || 'Tahap tidak valid.' }
  const fromStage = prospek.stage
  const backwards = stageIndex(to) < stageIndex(fromStage)
  prospek.stage = to
  prospek.updated_at = todayISO()
  if (to === 'Kalah') {
    prospek.outcome_reason = opts?.reason || ''
    if (opts?.competitor) prospek.competitor = opts.competitor
  }
  if (to === 'Menang' && opts?.competitor) prospek.competitor = opts.competitor
  prospek.stage_history.push({
    from: fromStage, to, at: todayISO(), by: 'Budi Santoso',
    reason: backwards ? (opts?.reason || 'Koreksi manual') : opts?.reason,
  })
  addLog('Prospek', prospekId, fromStage, to, backwards ? 'Koreksi tahap' : 'Pindah tahap', opts?.reason)
  return { ok: true, message: `"${prospek.name}" → ${to}` }
}

export const createProspek = (payload: {
  name: string; customer: string; customer_id: string; value: number
  stage: ProspekStage; priority: ProspekPriority; owner: string
  expected_closing_date?: string; notes?: string
}): { ok: boolean; message: string; id?: string } => {
  if (payload.name.trim().length < 5) return { ok: false, message: 'Nama proyek tender minimal 5 karakter.' }
  if (!payload.customer) return { ok: false, message: 'Pelanggan wajib dipilih dari master.' }
  if (!(payload.value > 0)) return { ok: false, message: 'Estimasi potensi harus lebih dari 0.' }
  if (TERMINAL_PROSPEK_STAGES.includes(payload.stage)) {
    return { ok: false, message: `Lead baru tidak boleh langsung ${payload.stage}. Buat di tahap awal, lalu pindahkan setelah ada Quotation.` }
  }
  const id = nextProspekId()
  const now = todayISO()
  const prospek: Prospek = {
    id, name: payload.name.trim(), customer: payload.customer, customer_id: payload.customer_id,
    value: payload.value, stage: payload.stage, priority: payload.priority, owner: payload.owner,
    created_at: now, updated_at: now,
    expected_closing_date: payload.expected_closing_date || '',
    next_follow_up_date: '', notes: payload.notes || '',
    outcome_reason: '', competitor: '',
    stage_history: [{ from: '-', to: payload.stage, at: now, by: payload.owner, reason: 'Prospek dibuat' }],
  }
  prospekList.value.unshift(prospek)
  addLog('Prospek', id, '—', payload.stage, 'Tambah Prospek')
  return { ok: true, message: `Prospek "${prospek.name}" dibuat di tahap ${payload.stage}.`, id }
}

// ─── Gate Logic ──────────────────────────────────────────────────────────────

/**
 * G01: Konversi Quotation → SO
 * Syarat: DISETUJUI_KLIEN, versi terakhir, belum menjadi SO, masa berlaku belum lewat
 */
export const canConvertToSO = (qt: Quotation): { ok: boolean; reason?: string } => {
  if (qt.status !== 'DISETUJUI_KLIEN') return { ok: false, reason: 'Quotation belum disetujui klien.' }
  if (qt.so_id) return { ok: false, reason: 'Quotation sudah menjadi SO.' }
  if (qt.superseded_by_id) return { ok: false, reason: 'Ini bukan versi terbaru quotation.' }
  const isExpired = new Date(qt.valid_until) < new Date()
  if (isExpired) return { ok: false, reason: 'Masa berlaku quotation sudah lewat. Diperlukan override Direksi.' }
  return { ok: true }
}

/**
 * G02: Ajukan SO
 */
export const canSubmitSO = (so: SalesOrder): { ok: boolean; reason?: string } => {
  if (!so.customer_po) return { ok: false, reason: 'Lengkapi No. PO klien, lampiran PO, Project Manager, dan jadwal termin (total harus 100%).' }
  if (!so.pm) return { ok: false, reason: 'Project Manager belum ditunjuk.' }
  const totalPct = so.payment_terms.reduce((s, t) => s + t.percentage, 0)
  if (totalPct !== 100) return { ok: false, reason: `Jadwal termin belum total 100% (saat ini ${totalPct}%).` }
  return { ok: true }
}

/**
 * G06: Rilis ke Produksi
 */
export const canReleaseToProduction = (panel: PanelItem): { ok: boolean; reason?: string } => {
  if (panel.bom_status !== 'APPROVED') return { ok: false, reason: 'BOM belum disetujui.' }
  const docs = Object.values(panel.docs_status)
  if (docs.length === 0) return { ok: false, reason: 'Belum ada dokumen teknis.' }
  const notAFC = Object.entries(panel.docs_status).filter(([, v]) => v !== 'AFC').map(([k]) => k)
  if (notAFC.length > 0) return { ok: false, reason: `Dokumen wajib belum AFC: ${notAFC.join(', ')}.` }
  return { ok: true }
}

// ─── Aksi Quotation ──────────────────────────────────────────────────────────

/**
 * Buat Quotation baru dari Prospek (Spesifikasi §6.1.2 — cost-plus).
 * Harga satuan dihitung bottom-up: material (BOM template × Item Master)
 * + jasa (routing jam standar × tarif keahlian / biaya subcont) × (1 + margin target).
 * Nilai estimasi CRM hanya jadi acuan validasi (deviasi), bukan dasar harga.
 */
export const buatQuotation = (prospekId: string, data: Partial<Quotation>) => {
  const toast = useToast()
  const prospek = prospekList.value.find(p => p.id === prospekId)
  if (!prospek) return null

  const margin = data.margin ?? SAFE_MARGIN_PCT
  const startDate = data.est_start_date || todayISO()
  const est = buildQuotationEstimate(
    (data.panel_lines ?? []).map(l => ({
      type: l.type, qty: l.qty, spec: l.spec ?? '',
      unit_price: l.unit_price,
      price_overridden: l.price_overridden,
      override_reason: l.override_reason,
    })),
    margin,
    startDate,
  )
  if (est.lines.length === 0) {
    toast.error('Baris Panel Kosong', 'Tambahkan minimal satu baris panel (tipe + qty) sebelum membuat quotation.')
    return null
  }

  const id = nextQTId()
  const now = todayISO()
  const qt: Quotation = {
    id, doc_no: `${id}-v1`, version: 1,
    source_type: 'PROSPEK', source_id: prospekId,
    status: 'DRAFT', rev: 'v1', is_locked: false,
    created_by: 'Budi Santoso', created_at: now,
    project: data.project || prospek.name,
    customer: data.customer || prospek.customer,
    customer_id: data.customer_id || prospek.customer_id,
    valid_until: data.valid_until || '',
    margin,
    value: est.totalValue,
    payment_terms_text: data.payment_terms_text || '30% DP, 60% FAT, 10% BAST',
    panel_lines: est.lines.map(le => ({
      type: le.type, qty: le.qty, spec: le.spec,
      unit_price: le.unitPrice,
      material_cost: le.materialCost,
      services_cost: le.servicesCost,
      est_manhours: le.manhours,
      est_days: le.estDays,
      price_overridden: le.priceOverridden || undefined,
      override_reason: le.overrideReason,
    })),
    total_cost: est.totalHpp,
    est_start_date: est.estStartDate,
    est_days: est.estDays,
    est_finish_date: est.estFinishDate,
    crm_estimated_value: prospek.value,
    crm_deviation_pct: crmDeviationPct(est.totalValue, prospek.value) ?? undefined,
    cost_snapshot_at: `${now}T00:00:00`,
  }
  quotations.value.unshift(qt)
  addLog('Quotation', id, '—', 'DRAFT', 'Buat Quotation (cost-plus)')
  toast.success('Quotation Dibuat', `${qt.doc_no} — nilai ${formatCurrencyChain(qt.value)}, estimasi selesai ${est.estFinishDate}`)
  return qt
}

export const ajukanQuotation = (qtId: string) => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt || qt.status !== 'DRAFT') return
  const prev = qt.status
  qt.status = 'MENUNGGU_APPROVAL'
  addLog('Quotation', qtId, prev, 'MENUNGGU_APPROVAL', 'Ajukan untuk Approval')
  toast.info('Diajukan', `${qt.doc_no} menunggu persetujuan Direksi`)
}

export const setujuiQuotation = (qtId: string) => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt || qt.status !== 'MENUNGGU_APPROVAL') return
  const prev = qt.status
  qt.status = 'SIAP_KIRIM'
  qt.approved_by = 'Direktur'
  qt.approved_at = new Date().toISOString().split('T')[0]
  addLog('Quotation', qtId, prev, 'SIAP_KIRIM', 'Setujui')
  toast.success('Quotation Disetujui', `${qt.doc_no} siap dikirim ke klien`)
}

export const kirimQuotation = (qtId: string) => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt || qt.status !== 'SIAP_KIRIM') return
  const prev = qt.status
  qt.status = 'TERKIRIM'
  qt.is_locked = true
  addLog('Quotation', qtId, prev, 'TERKIRIM', 'Kirim ke Klien')
  toast.success('Terkirim', `${qt.doc_no} dikirim. Versi terkunci.`)
}

export const tandaiDisetujuiKlien = (qtId: string) => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt || qt.status !== 'TERKIRIM') return
  const prev = qt.status
  qt.status = 'DISETUJUI_KLIEN'
  addLog('Quotation', qtId, prev, 'DISETUJUI_KLIEN', 'Tandai Disetujui Klien')
  toast.success('Disetujui Klien!', `${qt.doc_no} siap dikonversi ke Sales Order`)
}

export const tandaiKalah = (qtId: string, reason: string) => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt) return
  const prev = qt.status
  qt.status = 'KALAH'
  qt.cancel_reason = reason
  addLog('Quotation', qtId, prev, 'KALAH', 'Tandai Kalah', reason)
  toast.warning('Quotation Kalah', reason)
}

export const revisiQuotation = (qtId: string): Quotation | null => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt) return null

  const baseId = qt.id
  const newVersion = qt.version + 1
  const newQt: Quotation = {
    ...JSON.parse(JSON.stringify(qt)),
    version: newVersion,
    doc_no: `${baseId}-v${newVersion}`,
    rev: `v${newVersion}`,
    status: 'DRAFT',
    is_locked: false,
    superseded_by_id: undefined,
    so_id: undefined,
    created_at: new Date().toISOString().split('T')[0],
  }
  // Mark old as superseded
  qt.status = 'DIGANTIKAN'
  qt.superseded_by_id = newQt.doc_no

  quotations.value.unshift(newQt)
  addLog('Quotation', newQt.doc_no, '—', 'DRAFT', `Revisi dari ${qt.doc_no}`)
  toast.info('Revisi Dibuat', `${newQt.doc_no} dibuat dari ${qt.doc_no}`)
  return newQt
}

// ─── Aksi Sales Order ────────────────────────────────────────────────────────

/**
 * Konversi Quotation ke SO (Gate G01)
 * Data diwariskan dari quotation; tidak diketik ulang
 */
export const konversiKeSOFromQuotation = (qtId: string): SalesOrder | null => {
  const toast = useToast()
  const qt = quotations.value.find(q => q.id === qtId)
  if (!qt) return null

  const guard = canConvertToSO(qt)
  if (!guard.ok) {
    toast.error('Tidak Dapat Dikonversi', guard.reason || 'Syarat tidak terpenuhi')
    return null
  }

  const soId = nextSOId()
  const so: SalesOrder = {
    id: soId, doc_no: soId,
    source_type: 'QUOTATION', source_id: qtId,
    status: 'DRAFT', rev: '1', is_locked: false,
    created_by: 'Budi Santoso', created_at: new Date().toISOString().split('T')[0],
    // Diwariskan dari quotation:
    customer: qt.customer, customer_id: qt.customer_id,
    project_name: qt.project,
    customer_po: '', customer_po_date: '',
    pm: '',
    contract_value: qt.value,
    retention_pct: 5,
    delivery_date: '',
    warranty_months: 12,
    require_client_doc_approval: false,
    shipping_address: '',
    panel_lines: JSON.parse(JSON.stringify(qt.panel_lines)),
    payment_terms: [
      { id: `PT-${soId}-1`, name: 'Down Payment 30%', percentage: 30, trigger_event: 'SO_CONFIRMED', status: 'BELUM_JATUH_TEMPO', amount: qt.value * 0.3 },
      { id: `PT-${soId}-2`, name: 'Progress FAT 60%', percentage: 60, trigger_event: 'FAT_PASSED', status: 'BELUM_JATUH_TEMPO', amount: qt.value * 0.6 },
      { id: `PT-${soId}-3`, name: 'Pelunasan 10%', percentage: 10, trigger_event: 'DELIVERED', status: 'BELUM_JATUH_TEMPO', amount: qt.value * 0.1 },
    ],
    variation_orders: [],
    total_vo_amount: 0,
  }

  salesOrders.value.unshift(so)
  qt.so_id = soId
  qt.status = 'MENJADI_SO'
  qt.is_locked = true

  addLog('SalesOrder', soId, '—', 'DRAFT', `Konversi dari ${qtId}`)
  addLog('Quotation', qtId, 'DISETUJUI_KLIEN', 'MENJADI_SO', 'Konversi ke SO')

  toast.success('SO Dibuat!', `${soId} berhasil dibuat dari ${qt.doc_no}. Lengkapi PO klien dan termin.`)
  return so
}

/**
 * Efek otomatis saat SO CONFIRMED (spec 6.2.1)
 */
export const confirmSO = (soId: string): Proyek | null => {
  const toast = useToast()
  const so = salesOrders.value.find(s => s.id === soId)
  if (!so) return null

  const guard = canSubmitSO(so)
  if (!guard.ok) {
    toast.error('Tidak Dapat Dikonfirmasi', guard.reason || 'Syarat tidak terpenuhi')
    return null
  }

  const prev = so.status
  so.status = 'CONFIRMED'
  so.is_locked = true
  so.approved_by = 'Direktur'
  so.approved_at = new Date().toISOString().split('T')[0]
  addLog('SalesOrder', soId, prev, 'CONFIRMED', 'Confirm SO')

  // 6.2.1 Efek Otomatis:
  const prjId = nextPRJId()

  // 1. Buat Proyek
  // 2. Buat Panel per baris × qty
  const panels: PanelItem[] = []
  let panelCount = 0
  for (const line of so.panel_lines) {
    for (let i = 0; i < line.qty; i++) {
      panelCount++
      const pNum = `P${String(panelCount).padStart(2, '0')}`
      const panelId = `${prjId}-${pNum}`
      panels.push({
        id: panelId, panel_no: pNum,
        name: `${line.type}-${pNum}`,
        serial: `SN-${prjId}-${String(panelCount).padStart(2, '0')}`,
        type: line.type,
        // 3. BOM Rev A (Draft) otomatis
        bom_status: 'DRAFT', bom_rev: 'Rev A',
        // 4. Shell Dokumen Teknis (Draft) otomatis
        docs_status: { SLD: 'DRAFT', Layout: 'DRAFT', Wiring: 'DRAFT' },
        wo_status: 'DRAFT', fat_status: null,
        progress: 0,
        project_id: prjId, source_type: 'SO', source_id: soId,
        status: 'ENGINEERING', is_locked: false,
      })
    }
  }

  // 5. Termin DP → SIAP_DITAGIH
  const dpTerm = so.payment_terms.find(t => t.trigger_event === 'SO_CONFIRMED')
  if (dpTerm) {
    dpTerm.status = 'SIAP_DITAGIH'
    addLog('PaymentTerm', dpTerm.id, 'BELUM_JATUH_TEMPO', 'SIAP_DITAGIH', 'SO Confirmed — DP siap ditagih')
  }

  const proyek: Proyek = {
    id: prjId, doc_no: prjId,
    so_id: soId,
    name: so.project_name,
    customer: so.customer, customer_id: so.customer_id,
    pm: so.pm,
    status: 'ENGINEERING', progress: 0,
    contract_value: so.contract_value,
    start_date: new Date().toISOString().split('T')[0],
    fat_date: '', delivery_date: so.delivery_date,
    panels,
    payment_terms: JSON.parse(JSON.stringify(so.payment_terms)),
    variation_orders: [],
    is_locked: false,
    created_at: new Date().toISOString().split('T')[0],
  }

  so.project_id = prjId
  proyekList.value.unshift(proyek)

  // 6. BOM Rev A (Draft) per panel — terisi otomatis dari template tipe panel (§7.1)
  for (const panel of panels) {
    bomHeaders.value.push(buildBomHeader(proyek, panel, { status: 'DRAFT' }))
  }

  addLog('Proyek', prjId, '—', 'ENGINEERING', `Dibuat otomatis dari SO ${soId}`)

  toast.success(
    'SO Confirmed! 🎉',
    `Proyek ${prjId} dibuat otomatis. ${panels.length} panel, ${bomHeaders.value.filter(b => b.project_id === prjId).length} BOM Rev A (Draft) terisi template material, shell dokumen dibuat. Termin DP siap ditagih.`,
  )
  return proyek
}

export const updateSOData = (soId: string, data: Partial<SalesOrder>) => {
  const so = salesOrders.value.find(s => s.id === soId)
  if (!so || so.is_locked) return
  Object.assign(so, data)
}

// ─── BOM: Query ─────────────────────────────────────────────────────────────

export const getBomById = (id: string): BomHeader | undefined =>
  bomHeaders.value.find(b => b.id === id)

export const getBomsForPanel = (panelId: string): BomHeader[] =>
  bomHeaders.value.filter(b => b.panel_id === panelId)

export const getBomsForProject = (projectId: string): BomHeader[] =>
  bomHeaders.value.filter(b => b.project_id === projectId)

const byVersionDesc = (a: BomHeader, b: BomHeader) => b.version - a.version

/** Revisi terbaru untuk satu panel */
export const latestBom = (panelId: string): BomHeader | undefined =>
  [...getBomsForPanel(panelId)].sort(byVersionDesc)[0]

/**
 * BOM yang berlaku (effektif) untuk panel:
 * revisi Approved terbaru; bila belum ada Approved, revisi terbaru.
 */
export const effectiveBom = (panelId: string): BomHeader | undefined => {
  const list = [...getBomsForPanel(panelId)].sort(byVersionDesc)
  return list.find(b => b.status === 'APPROVED') ?? list[0]
}

/** BOM yang menjadi sasaran aksi engineer (Draft terbaru) */
export const draftBom = (panelId: string): BomHeader | undefined =>
  getBomsForPanel(panelId).filter(b => b.status === 'DRAFT').sort(byVersionDesc)[0] ?? latestBom(panelId)

/** BOM boleh diedit hanya bila Draft dan tidak terkunci */
export const isBomEditable = (bom: BomHeader): boolean => bom.status === 'DRAFT' && !bom.is_locked

/** Buat BOM untuk panel bila belum ada (Rev A Draft, terisi template tipe panel) */
export const createBomForPanel = (
  prjId: string,
  panelId: string,
  bomType: BomHeader['bom_type'] = 'PRODUKSI',
): BomHeader | null => {
  const found = findPanel(panelId)
  if (!found || found.prj.id !== prjId) return null
  const existing = latestBom(panelId)
  if (existing) return existing
  const bom = buildBomHeader(found.prj, found.panel, { status: 'DRAFT' })
  bom.bom_type = bomType
  bomHeaders.value.push(bom)
  found.panel.bom_status = bom.status
  found.panel.bom_rev = bom.rev
  addLog('BOM', bom.id, '—', 'DRAFT', 'BOM dibuat untuk panel')
  return bom
}

const findPanel = (panelId: string): { prj: Proyek; panel: PanelItem } | undefined => {
  for (const prj of proyekList.value) {
    const panel = prj.panels.find(p => p.id === panelId)
    if (panel) return { prj, panel }
  }
  return undefined
}

/** Guard referensial: panel harus benar-benar milik proyek yang dipanggil */
const assertPanelInProject = (
  prjId: string,
  panelId: string,
  toast: ReturnType<typeof useToast>,
): boolean => {
  const prj = proyekList.value.find(p => p.id === prjId)
  if (!prj) {
    toast.error('Proyek Tidak Ditemukan', `ID ${prjId} tidak ada.`)
    return false
  }
  if (!prj.panels.some(p => p.id === panelId)) {
    toast.error('Data Tidak Konsisten', `Panel ${panelId} bukan milik proyek ${prjId}.`)
    return false
  }
  return true
}

/** Cerminan status BOM efektif ke panel (dipakai stepper & dashboard) */
const syncPanelBom = (panelId: string) => {
  const found = findPanel(panelId)
  if (!found) return
  const bom = effectiveBom(panelId)
  if (bom) {
    found.panel.bom_status = bom.status
    found.panel.bom_rev = bom.rev
  }
}

// ─── BOM: Validasi (syarat Gate G04, spec §7.1) ─────────────────────────────

export const validateBom = (bomId: string): string[] => {
  const bom = getBomById(bomId)
  if (!bom) return ['BOM tidak ditemukan.']

  const errors: string[] = []
  if (bom.items.length === 0) {
    errors.push('BOM masih kosong — tambahkan minimal 1 baris item (pilih dari Item Master).')
    return errors
  }

  const seen = new Set<string>()
  bom.items.forEach((line, idx) => {
    const label = `Baris ${idx + 1}`
    const item = getItemById(line.item_id)
    if (!item) {
      errors.push(`${label}: tidak terhubung ke Item Master — kode bebas dilarang.`)
    } else {
      if (item.status === 'Obsolete') errors.push(`${label}: item ${item.code} berstatus Obsolete.`)
      const key = `${line.item_id}|${(line.designator || '').trim().toUpperCase()}`
      if (seen.has(key)) errors.push(`${label}: item ${item.code} ganda pada designator yang sama.`)
      seen.add(key)
    }
    if (!(line.required_qty >= 0.01)) errors.push(`${label}: qty kebutuhan harus ≥ 0,01.`)
    if (!line.uom) errors.push(`${label}: UoM tidak valid.`)
  })
  return errors
}

const assertEditable = (bom: BomHeader | undefined): string | null => {
  if (!bom) return 'BOM tidak ditemukan.'
  if (bom.status === 'APPROVED' || bom.status === 'SUPERSEDED') {
    return `BOM ${bom.rev} terkunci. Buat revisi baru untuk mengubah baris.`
  }
  if (bom.status === 'IN_REVIEW') return `BOM ${bom.rev} sedang direview — tidak dapat diedit.`
  if (bom.is_locked) return 'BOM terkunci.'
  return null
}

// ─── BOM: Baris Item ────────────────────────────────────────────────────────

export interface BomLinePayload {
  item_id: string
  required_qty: number
  designator?: string
  is_long_lead?: boolean
  remarks?: string
}

export const addBomItem = (bomId: string, payload: BomLinePayload): { ok: boolean; message: string } => {
  const bom = getBomById(bomId)
  const blocked = assertEditable(bom)
  if (!bom || blocked) return { ok: false, message: blocked || 'BOM tidak ditemukan.' }

  const item = getItemById(payload.item_id)
  if (!item) return { ok: false, message: 'Item tidak ada di Item Master.' }
  if (!(payload.required_qty >= 0.01)) return { ok: false, message: 'Qty kebutuhan harus ≥ 0,01.' }

  const designator = (payload.designator || '').trim()
  const dup = bom.items.find(l => l.item_id === item.id && (l.designator || '').trim().toUpperCase() === designator.toUpperCase())
  if (dup) return { ok: false, message: `${item.code} sudah ada pada designator "${designator || '—'}". Ubah baris tersebut.` }

  bom.items.push(snapshotLine(
    bom, item, payload.required_qty, designator,
    payload.is_long_lead ?? false, payload.remarks || '', 'MANUAL',
  ))
  return { ok: true, message: `${item.code} ditambahkan ke ${bom.rev}.` }
}

export const updateBomItem = (
  bomId: string,
  lineId: string,
  patch: Partial<BomLinePayload>,
): { ok: boolean; message: string } => {
  const bom = getBomById(bomId)
  const blocked = assertEditable(bom)
  if (!bom || blocked) return { ok: false, message: blocked || 'BOM tidak ditemukan.' }

  const line = bom.items.find(l => l.id === lineId)
  if (!line) return { ok: false, message: 'Baris tidak ditemukan.' }

  if (patch.item_id && patch.item_id !== line.item_id) {
    const item = getItemById(patch.item_id)
    if (!item) return { ok: false, message: 'Item tidak ada di Item Master.' }
    const dup = bom.items.find(l => l.id !== lineId && l.item_id === item.id &&
      (l.designator || '').trim().toUpperCase() === (patch.designator ?? line.designator).trim().toUpperCase())
    if (dup) return { ok: false, message: `${item.code} sudah ada pada baris lain dengan designator sama.` }
    line.item_id = item.id
    line.item_code = item.code
    line.item_name = item.name
    line.category = item.category
    line.uom = item.uom
    line.unit_price = item.unit_price
  }
  if (patch.required_qty !== undefined) {
    if (!(patch.required_qty >= 0.01)) return { ok: false, message: 'Qty kebutuhan harus ≥ 0,01.' }
    line.required_qty = patch.required_qty
  }
  if (patch.designator !== undefined) line.designator = patch.designator.trim()
  if (patch.is_long_lead !== undefined) line.is_long_lead = patch.is_long_lead
  if (patch.remarks !== undefined) line.remarks = patch.remarks.trim()
  return { ok: true, message: 'Baris diperbarui.' }
}

export const removeBomItem = (bomId: string, lineId: string): { ok: boolean; message: string } => {
  const bom = getBomById(bomId)
  const blocked = assertEditable(bom)
  if (!bom || blocked) return { ok: false, message: blocked || 'BOM tidak ditemukan.' }
  const idx = bom.items.findIndex(l => l.id === lineId)
  if (idx < 0) return { ok: false, message: 'Baris tidak ditemukan.' }
  const [removed] = bom.items.splice(idx, 1)
  return { ok: true, message: `${removed.item_code} dihapus dari ${bom.rev}.` }
}

/** Aksi bantu §7.1: isi baris dari template tipe panel (tidak membuat BOM baru) */
export const salinTemplateKeBom = (bomId: string, replace: boolean): { added: number; message: string } => {
  const bom = getBomById(bomId)
  const blocked = assertEditable(bom)
  if (!bom || blocked) return { added: 0, message: blocked || 'BOM tidak ditemukan.' }

  const tpl = getTemplateForPanelType(bom.panel_type)
  const rows = templateLinesFor({ id: bom.id }, bom.panel_type)

  if (replace) {
    bom.items = rows
    return { added: rows.length, message: `${rows.length} baris template ${tpl.label} diterapkan (baris lama diganti).` }
  }

  let added = 0
  for (const row of rows) {
    const dup = bom.items.find(l =>
      l.item_id === row.item_id && (l.designator || '').toUpperCase() === row.designator.toUpperCase())
    if (dup) continue
    bom.items.push(row)
    added++
  }
  return { added, message: `${added} baris template ${tpl.label} ditambahkan.` }
}

/** Aksi bantu §7.1: salin baris dari BOM proyek lain */
export const salinBomLain = (bomId: string, sourceBomId: string): { ok: boolean; added: number; message: string } => {
  const target = getBomById(bomId)
  const blocked = assertEditable(target)
  if (!target || blocked) return { ok: false, added: 0, message: blocked || 'BOM tidak ditemukan.' }

  const source = getBomById(sourceBomId)
  if (!source) return { ok: false, added: 0, message: 'BOM sumber tidak ditemukan.' }
  if (source.id === target.id) return { ok: false, added: 0, message: 'Tidak bisa menyalin BOM ke dirinya sendiri.' }

  let added = 0
  for (const row of source.items) {
    const dup = target.items.find(l => l.item_id === row.item_id && (l.designator || '').toUpperCase() === row.designator.toUpperCase())
    if (dup) continue
    target.items.push(snapshotLine(target, getItemById(row.item_id) || {
      id: row.item_id, code: row.item_code, name: row.item_name, category: row.category,
      brand: '-', type: '-', uom: row.uom, unit_price: row.unit_price, stock: 0, reorder: 0,
      tracking: 'none', status: 'Aktif', lead_time_days: 0,
    } as ItemMaster, row.required_qty, row.designator, row.is_long_lead, row.remarks, 'COPY'))
    added++
  }
  return { ok: true, added, message: `${added} baris disalin dari ${source.id} (${source.rev}).` }
}

/** Impor baris dari teks (CSV/TSV): kode_item;qty;designator;long_lead */
export const importBomItems = (bomId: string, text: string): { added: number; errors: string[] } => {
  const bom = getBomById(bomId)
  const blocked = assertEditable(bom)
  const errors: string[] = []
  if (!bom || blocked) return { added: 0, errors: [blocked || 'BOM tidak ditemukan.'] }

  const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean)
  if (rows.length === 0) return { added: 0, errors: ['Tidak ada data untuk diimpor.'] }

  let added = 0
  rows.forEach((row, i) => {
    const cells = (row.includes('\t') ? row.split('\t') : row.includes(';') ? row.split(';') : row.split(','))
      .map(c => c.trim().replace(/^"|"$/g, ''))
    const code = cells[0] || ''
    if (i === 0 && /^(kode|code|item|no)/i.test(code)) return  // baris header

    const item = getItemByCode(code)
    if (!item) { errors.push(`Baris ${i + 1}: kode "${code}" tidak ada di Item Master.`); return }

    const qty = parseFloat((cells[1] || '').replace(',', '.'))
    if (!(qty >= 0.01)) { errors.push(`Baris ${i + 1}: qty "${cells[1] || ''}" tidak valid.`); return }

    const designator = (cells[2] || '').trim()
    const dup = bom.items.find(l => l.item_id === item.id && (l.designator || '').trim().toUpperCase() === designator.toUpperCase())
    if (dup) { errors.push(`Baris ${i + 1}: ${item.code} sudah ada pada designator "${designator || '—'}".`); return }

    const longLead = /^(1|true|ya|y|yes|ll)$/i.test((cells[3] || '').trim())
    bom.items.push(snapshotLine(bom, item, qty, designator, longLead, '', 'IMPORT'))
    added++
  })
  return { added, errors }
}

// ─── BOM: MRP (dihitung dari baris BOM Approved) ────────────────────────────

export const computeMRP = (bomId: string): MRPLine[] => {
  const bom = getBomById(bomId)
  if (!bom) return []
  const map = new Map<string, MRPLine>()
  for (const line of bom.items) {
    const master = getItemById(line.item_id)
    const onHand = master?.stock ?? 0
    const found = map.get(line.item_id)
    if (found) {
      found.gross_qty += line.required_qty
      found.net_qty = Math.max(0, found.gross_qty - found.on_hand)
      found.long_lead = found.long_lead || line.is_long_lead
    } else {
      map.set(line.item_id, {
        item_id: line.item_id,
        code: line.item_code,
        name: line.item_name,
        uom: line.uom,
        gross_qty: line.required_qty,
        on_hand: onHand,
        net_qty: Math.max(0, line.required_qty - onHand),
        long_lead: line.is_long_lead,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.net_qty - a.net_qty)
}

// ─── BOM: Transisi Status (Gate G04 / G05) ──────────────────────────────────

export const ajukanReviewBOM = (prjId: string, panelId: string): boolean => {
  const toast = useToast()
  if (!assertPanelInProject(prjId, panelId, toast)) return false
  const bom = draftBom(panelId)
  if (!bom || bom.status !== 'DRAFT') {
    toast.error('Tidak Dapat Diajukan', 'BOM panel ini tidak berstatus Draft.')
    return false
  }
  const errors = validateBom(bom.id)
  if (errors.length > 0) {
    toast.error('BOM Belum Lolos Validasi', errors.slice(0, 3).join(' '))
    return false
  }
  bom.status = 'IN_REVIEW'
  syncPanelBom(panelId)
  addLog('BOM', bom.id, 'DRAFT', 'IN_REVIEW', 'Ajukan Review BOM')
  toast.info('BOM Diajukan Review', `${bom.id} ${bom.rev} — ${bom.items.length} baris menunggu Manajer Teknik.`)
  return true
}

export const setujuiBOM = (prjId: string, panelId: string): boolean => {
  const toast = useToast()
  if (!assertPanelInProject(prjId, panelId, toast)) return false
  const target = [...getBomsForPanel(panelId)].filter(b => b.status === 'IN_REVIEW').sort(byVersionDesc)[0]
  if (!target) {
    toast.error('Tidak Dapat Disetujui', 'Tidak ada BOM yang sedang direview untuk panel ini.')
    return false
  }
  const errors = validateBom(target.id)
  if (errors.length > 0) {
    toast.error('BOM Belum Lolos Validasi', errors.slice(0, 3).join(' '))
    return false
  }

  target.status = 'APPROVED'
  target.is_locked = true
  target.approved_by = 'Ir. Hartono'
  target.approved_at = new Date().toISOString().split('T')[0]

  // Revisi sebelumnya yang berstatus Approved menjadi SUPERSEDED
  for (const other of getBomsForPanel(panelId)) {
    if (other.id !== target.id && other.status === 'APPROVED') {
      other.status = 'SUPERSEDED'
      other.is_locked = true
      other.superseded_by_id = target.id
      addLog('BOM', other.id, 'APPROVED', 'SUPERSEDED', `Digantikan ${target.rev}`)
    }
  }

  syncPanelBom(panelId)
  addLog('BOM', target.id, 'IN_REVIEW', 'APPROVED', 'Setujui BOM')

  const mrp = computeMRP(target.id)
  const shortfall = mrp.filter(l => l.net_qty > 0).length
  const longLead = mrp.filter(l => l.long_lead).length
  toast.success(
    'BOM Disetujui — MRP berjalan',
    `${target.rev} terkunci · ${mrp.length} komponen · ${shortfall} butuh pengadaan · ${longLead} long-lead.`,
  )
  return true
}

export const kembalikanBOM = (prjId: string, panelId: string, alasan: string): boolean => {
  const toast = useToast()
  if (!assertPanelInProject(prjId, panelId, toast)) return false
  if (!alasan.trim()) {
    toast.error('Alasan Wajib', 'Isi alasan pengembalian BOM ke engineer.')
    return false
  }
  const target = [...getBomsForPanel(panelId)].filter(b => b.status === 'IN_REVIEW').sort(byVersionDesc)[0]
  if (!target) {
    toast.error('Tidak Dapat Dikembalikan', 'Tidak ada BOM yang sedang direview.')
    return false
  }
  target.status = 'DRAFT'
  target.change_reason = alasan.trim()
  syncPanelBom(panelId)
  addLog('BOM', target.id, 'IN_REVIEW', 'DRAFT', 'Kembalikan ke Draft', alasan.trim())
  toast.warning('BOM Dikembalikan', `${target.rev} kembali ke Draft: ${alasan.trim()}`)
  return true
}

export const revisiBOM = (prjId: string, panelId: string, alasan: string): BomHeader | null => {
  const toast = useToast()
  if (!assertPanelInProject(prjId, panelId, toast)) return null
  if (!alasan.trim()) {
    toast.error('Alasan Wajib', 'Isi alasan revisi BOM.')
    return null
  }
  const source = effectiveBom(panelId) || latestBom(panelId)
  if (!source) {
    toast.error('Tidak Ada BOM', 'Panel ini belum memiliki BOM.')
    return null
  }
  const found = findPanel(panelId)
  if (!found) return null

  const next = buildBomHeader({ id: source.project_id }, found.panel, {
    status: 'DRAFT',
    version: source.version + 1,
    created_by: 'Ir. Hartono',
    change_reason: alasan.trim(),
  })
  next.items = source.items.map(l => ({ ...snapshotLine(next, getItemById(l.item_id) || {
    id: l.item_id, code: l.item_code, name: l.item_name, category: l.category,
    brand: '-', type: '-', uom: l.uom, unit_price: l.unit_price, stock: 0, reorder: 0,
    tracking: 'none', status: 'Aktif', lead_time_days: 0,
  } as ItemMaster, l.required_qty, l.designator, l.is_long_lead, l.remarks, 'COPY') }))

  bomHeaders.value.push(next)
  syncPanelBom(panelId)
  addLog('BOM', next.id, '—', 'DRAFT', `Revisi ${next.rev} dari ${source.id}`, alasan.trim())
  toast.info('Revisi BOM Dibuat', `${next.id} ${next.rev} dibuat dari ${source.rev}. BOM lama tetap berlaku sampai revisi ini disetujui.`)
  return next
}

// ─── Aksi Dokumen Teknis / Rilis ────────────────────────────────────────────

export const setujuiDokumen = (prjId: string, panelId: string, docType: string) => {
  const toast = useToast()
  const panel = getPanel(prjId, panelId)
  if (!panel) return
  panel.docs_status[docType] = 'AFC'
  addLog('TechDoc', `${panelId}-${docType}`, panel.docs_status[docType], 'AFC', 'Setujui AFC')
  toast.success('Dokumen AFC', `${docType} panel ${panel.name} berstatus Approved for Construction`)
  // Cek apakah tombol Rilis ke Produksi sudah aktif
  const check = canReleaseToProduction(panel)
  if (check.ok) {
    toast.info('Gate Terpenuhi', `Semua syarat Rilis ke Produksi sudah terpenuhi untuk ${panel.name}!`)
  }
}

export const rilisKeProduksi = (prjId: string, panelId: string) => {
  const toast = useToast()
  const panel = getPanel(prjId, panelId)
  if (!panel) return
  const guard = canReleaseToProduction(panel)
  if (!guard.ok) {
    toast.error('Tidak Dapat Dirilis', guard.reason || 'Syarat tidak terpenuhi')
    return
  }
  panel.status = 'SIAP_PRODUKSI'
  panel.wo_status = 'DRAFT'
  addLog('Panel', panelId, 'ENGINEERING', 'SIAP_PRODUKSI', 'Rilis ke Produksi')
  toast.success('Paket Rilis Dibuat!', `WO Draft dibuat untuk ${panel.name}. Cek ketersediaan material.`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getPanel = (prjId: string, panelId: string): PanelItem | undefined => {
  return proyekList.value.find(p => p.id === prjId)?.panels.find(pa => pa.id === panelId)
}

export const getSOForProyek = (prjId: string): SalesOrder | undefined => {
  const prj = proyekList.value.find(p => p.id === prjId)
  if (!prj) return undefined
  return salesOrders.value.find(s => s.id === prj.so_id)
}

export const getQuotationForSO = (soId: string): Quotation | undefined => {
  const so = salesOrders.value.find(s => s.id === soId)
  if (!so) return undefined
  return quotations.value.find(q => q.id === so.source_id)
}

// ─── Computed Helpers ────────────────────────────────────────────────────────

export const formatCurrencyChain = (value: number): string => {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(0)}jt`
  return `Rp ${value.toLocaleString('id-ID')}`
}

export const statusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    DRAFT: 'badge-neutral',
    MENUNGGU_APPROVAL: 'badge-warning',
    SIAP_KIRIM: 'badge-primary',
    TERKIRIM: 'badge-info',
    DISETUJUI_KLIEN: 'badge-success',
    MENJADI_SO: 'badge-success',
    KALAH: 'badge-danger',
    KEDALUWARSA: 'badge-danger',
    DIGANTIKAN: 'badge-neutral',
    CONFIRMED: 'badge-success',
    BERJALAN: 'badge-primary',
    DITAHAN: 'badge-warning',
    SELESAI: 'badge-success',
    CLOSED: 'badge-neutral',
    DIBATALKAN: 'badge-danger',
    ENGINEERING: 'badge-primary',
    SIAP_PRODUKSI: 'badge-warning',
    PRODUKSI: 'badge-primary',
    QC_FAT: 'badge-info',
    SIAP_KIRIM_PROJ: 'badge-warning',
    TERKIRIM_PROJ: 'badge-success',
    BAST: 'badge-success',
    DITUTUP: 'badge-neutral',
    IN_REVIEW: 'badge-warning',
    APPROVED: 'badge-success',
    SUPERSEDED: 'badge-neutral',
    REVIEW_INTERNAL: 'badge-warning',
    DIKIRIM_KLIEN: 'badge-info',
    AFC: 'badge-success',
    DIRILIS: 'badge-success',
    BELUM_JATUH_TEMPO: 'badge-neutral',
    SIAP_DITAGIH: 'badge-warning',
    DITAGIH: 'badge-primary',
    LUNAS: 'badge-success',
  }
  return map[status] || 'badge-neutral'
}

export const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    MENUNGGU_APPROVAL: 'Menunggu Approval',
    SIAP_KIRIM: 'Siap Kirim',
    TERKIRIM: 'Terkirim',
    DISETUJUI_KLIEN: 'Disetujui Klien',
    MENJADI_SO: 'Menjadi SO',
    KALAH: 'Kalah',
    KEDALUWARSA: 'Kedaluwarsa',
    DIGANTIKAN: 'Digantikan',
    CONFIRMED: 'Confirmed',
    BERJALAN: 'Berjalan',
    DITAHAN: 'Ditahan',
    SELESAI: 'Selesai',
    CLOSED: 'Closed',
    DIBATALKAN: 'Dibatalkan',
    ENGINEERING: 'Engineering',
    SIAP_PRODUKSI: 'Siap Produksi',
    PRODUKSI: 'Produksi',
    QC_FAT: 'QC / FAT',
    BAST: 'BAST',
    DITUTUP: 'Ditutup',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    SUPERSEDED: 'Digantikan',
    REVIEW_INTERNAL: 'Review Internal',
    DIKIRIM_KLIEN: 'Dikirim Klien',
    AFC: 'AFC',
    DIRILIS: 'Dirilis',
    BELUM_JATUH_TEMPO: 'Belum Jatuh Tempo',
    SIAP_DITAGIH: 'Siap Ditagih ⚡',
    DITAGIH: 'Ditagih',
    LUNAS: 'Lunas',
  }
  return map[status] || status
}
