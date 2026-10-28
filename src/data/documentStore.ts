/**
 * documentStore.ts — PanelERP Central Document Repository
 *
 * Sistem dokumen profesional:
 *  - Menyimpan berkas nyata (Blob / Object URL) sehingga bisa dibuka & diunduh
 *  - Manajemen versi / revisi (riwayat lengkap per dokumen)
 *  - Status workflow: Draft → Issued for Review → Approved for Construction → As-Built
 *  - Metadata teknis: proyek, panel, tipe, tag, deskripsi, pengunggah
 *
 * Catatan: pada implementasi produksi, `url` diisi path Object Storage (S3/MinIO),
 * sesuai PRD §7 (file fisik tidak disimpan sebagai BLOB di DB).
 */

import { ref } from 'vue'
import { useToast } from './toastStore'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export type TechDocType = 'SLD' | 'Layout' | 'Wiring' | 'BOM' | 'Datasheet' | 'Cable Schedule'

export type TechDocStatus =
  | 'Draft'
  | 'Issued for Review'
  | 'Approved for Construction'
  | 'As-Built'
  | 'Superseded'

export type FileCategory = 'pdf' | 'image' | 'text' | 'spreadsheet' | 'cad' | 'doc' | 'other'

export interface DocVersion {
  id: string
  version: string          // v1, v2, Rev.A
  filename: string
  ext: string
  size: string
  sizeBytes: number
  uploadedBy: string
  uploadedAt: string
  note?: string
  status: TechDocStatus    // status dokumen pada saat versi ini dirilis
  url?: string             // blob:/data:/storage URL — hulu pratinjau & unduh
  isCurrent: boolean
}

export interface TechDoc {
  id: string
  docNo: string
  name: string
  project: string
  projectName?: string
  panel?: string
  type: TechDocType
  status: TechDocStatus
  version: string
  rev: string
  uploadedBy: string
  date: string
  size: string
  ext: string
  description?: string
  tags: string[]
  versions: DocVersion[]
}

// ─── Kategori & Tampilan Berkas ──────────────────────────────────────────────

const CATEGORY_MAP: Record<string, FileCategory> = {
  pdf: 'pdf',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  txt: 'text', log: 'text', md: 'text', csv: 'text', json: 'text', xml: 'text',
  xls: 'spreadsheet', xlsx: 'spreadsheet', ods: 'spreadsheet',
  dwg: 'cad', dxf: 'cad', dgn: 'cad',
  doc: 'doc', docx: 'doc', rtf: 'doc', odt: 'doc',
}

export function fileCategory(ext: string): FileCategory {
  return CATEGORY_MAP[ext.toLowerCase()] || 'other'
}

export function fileIcon(ext: string): string {
  const map: Record<FileCategory, string> = {
    pdf: '📕', image: '🖼️', text: '📃', spreadsheet: '📗', cad: '📐', doc: '📘', other: '📄',
  }
  return map[fileCategory(ext)]
}

export function canPreview(ext: string): boolean {
  return ['pdf', 'image', 'text'].includes(fileCategory(ext))
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function statusBadgeClass(status: TechDocStatus): string {
  const map: Record<TechDocStatus, string> = {
    Draft: 'badge-neutral',
    'Issued for Review': 'badge-warning',
    'Approved for Construction': 'badge-success',
    'As-Built': 'badge-info',
    Superseded: 'badge-danger',
  }
  return map[status] || 'badge-neutral'
}

export function statusLabel(status: TechDocStatus): string {
  const map: Record<TechDocStatus, string> = {
    Draft: 'Draft / Internal',
    'Issued for Review': 'Dalam Review Klien',
    'Approved for Construction': 'AFC (Siap Produksi)',
    'As-Built': 'As-Built / Final',
    Superseded: 'Digantikan',
  }
  return map[status] || status
}

const nowStamp = () => new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Generator PDF contoh (agar pratinjau benar-benar dapat dibuka) ───────────

const esc = (t: string) =>
  String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

function buildPdf(content: string): Blob {
  const objects: string[] = []
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
    '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n'
  )
  objects.push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const o of objects) {
    offsets.push(pdf.length)
    pdf += o
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

interface PdfSpec {
  title: string
  subtitle: string
  meta: string[]
  body: string[]
}

function makeSamplePdf(spec: PdfSpec): Blob {
  let y = 792
  let c = ''
  c += `0.23 0.33 0.66 RG 1.2 w 30 30 535 782 re S\n`
  c += `BT /F1 17 Tf 0 0 0 rg 50 ${y} Td (${esc(spec.title)}) Tj ET\n`
  y -= 24
  c += `BT /F1 10 Tf 0.35 0.4 0.5 rg 50 ${y} Td (${esc(spec.subtitle)}) Tj ET\n`
  y -= 12
  c += `0.7 0.72 0.76 RG 0.8 w 50 ${y} m 545 ${y} l S\n`
  y -= 26
  for (const m of spec.meta) {
    c += `BT /F1 9 Tf 0.2 0.24 0.32 rg 50 ${y} Td (${esc(m)}) Tj ET\n`
    y -= 15
  }
  y -= 14
  for (const b of spec.body) {
    c += `BT /F1 11 Tf 0.1 0.12 0.18 rg 50 ${y} Td (${esc(b)}) Tj ET\n`
    y -= 18
  }
  c += `BT /F1 8 Tf 0.55 0.58 0.63 rg 50 45 Td (PanelERP — Engineering Document Control · Dokumen contoh untuk pratinjau) Tj ET\n`
  return buildPdf(c)
}

const sampleUrl = (spec: PdfSpec): string => URL.createObjectURL(makeSamplePdf(spec))

// ─── Seed Data (repositori contoh) ───────────────────────────────────────────

let docSeq = 100
let verSeq = 1000
const nextDocId = () => `doc-${docSeq++}`

const mkVersion = (
  filename: string, ext: string, sizeBytes: number, uploadedBy: string,
  uploadedAt: string, status: TechDocStatus, isCurrent: boolean, opts: { note?: string; url?: string; version: string },
): DocVersion => ({
  id: `ver-${verSeq++}`,
  version: opts.version,
  filename, ext,
  size: formatBytes(sizeBytes),
  sizeBytes,
  uploadedBy, uploadedAt,
  note: opts.note,
  status,
  url: opts.url,
  isCurrent,
})

function makeDoc(input: {
  name: string; docNo: string; project: string; projectName?: string; panel?: string
  type: TechDocType; status: TechDocStatus; version: string; ext: string
  description?: string; tags?: string[]; versions: DocVersion[]
}): TechDoc {
  const cur = input.versions.find(v => v.isCurrent) || input.versions[input.versions.length - 1]
  return {
    id: nextDocId(),
    docNo: input.docNo,
    name: input.name,
    project: input.project,
    projectName: input.projectName,
    panel: input.panel,
    type: input.type,
    status: input.status,
    version: input.version,
    rev: input.version,
    uploadedBy: cur.uploadedBy,
    date: cur.uploadedAt,
    size: cur.size,
    ext: cur.ext,
    description: input.description,
    tags: input.tags || [],
    versions: input.versions,
  }
}

function seedDocs(): TechDoc[] {
  const sldUrl = sampleUrl({
    title: 'SINGLE LINE DIAGRAM',
    subtitle: 'LVMDP PT. Semen Indonesia — Pabrik Tuban IV',
    meta: ['No. Dokumen : SLD-PRJ-2026-001', 'Revisi : v3 · Status : AFC', 'Skala : NTS · Tanggal : 20 Sep 2026'],
    body: [
      'Incoming  20 kV / ACB 3200 A 65 kA',
      'Busbar LVMDP 400 V — 5000 A',
      'Outgoing 1  MCC-01  MCCB 800 A 36 kA',
      'Outgoing 2  MCC-02  MCCB 800 A 36 kA',
      'Outgoing 3  SDP-01  MCCB 400 A 36 kA',
      'Metering & Protection — Sepam / PM8000',
    ],
  })
  const layoutUrl = sampleUrl({
    title: 'PANEL GENERAL ARRANGEMENT / LAYOUT',
    subtitle: 'LVMDP-01 (Incoming)',
    meta: ['No. Dokumen : LAYOUT-LVMDP-01', 'Revisi : v2 · Status : AFC', 'Material : Lembaran 2.0 mm · IP 54'],
    body: [
      'Dimensi 2000 (H) x 1600 (W) x 800 (D) mm',
      'Kompartemen Busbar — Internal Arc IAC',
      'Kompartemen ACB + Metering',
      'Kompartemen Kabel & CT',
      'Pintu depan dengan interlock mekanik',
    ],
  })
  const wiringUrl = sampleUrl({
    title: 'WIRING DIAGRAM',
    subtitle: 'LVMDP-02 (Outgoing A)',
    meta: ['No. Dokumen : WD-LVMDP-02', 'Revisi : v1 · Status : Issued for Review'],
    body: [
      'Kontrol ACB — Spring Charge Circuit',
      'Trip/Close Control & Indikasi',
      'Interlock Busbar A/B',
      'Auxiliary Contact 52a/52b',
      'Annunciator & Alarm',
    ],
  })
  const earthUrl = sampleUrl({
    title: 'EARTHING LAYOUT DRAWING',
    subtitle: 'Sistem Pentanahan Proyek PRJ-2026-001',
    meta: ['No. Dokumen : EARTH-PRJ-2026-001', 'Revisi : v1 · Status : Draft'],
    body: [
      'Electrode Copper Bonded Rod 5/8" x 3 m',
      'Conductor BC 70 mm² / Cable Tray',
      'Resistance target < 1 Ohm',
      'Bonding semua panel & struktur',
    ],
  })
  const sld2Url = sampleUrl({
    title: 'SINGLE LINE DIAGRAM — SWITCHGEAR 20 kV',
    subtitle: 'Gardu Induk Suralaya',
    meta: ['No. Dokumen : SLD-PRJ-2026-002', 'Revisi : v1 · Status : Issued for Review'],
    body: [
      'Incoming 20 kV — Vacuum Circuit Breaker',
      'Busbar Line-Up 20 kV',
      'Feeder 1 & Feeder 2',
      'Trafo Aux 20kV/400V 250 kVA',
      'Protection — Overcurrent / Earth Fault',
    ],
  })
  const csUrl = sampleUrl({
    title: 'CABLE SCHEDULE',
    subtitle: 'MCC-01 · Proyek PRJ-2026-001',
    meta: ['No. Dokumen : CS-MCC-01', 'Revisi : v1 · Status : Draft'],
    body: [
      'CBL-001  N2XY 3x240+1x120  To Main Busbar',
      'CBL-002  N2XY 4x50       To Motor MCC-01/01',
      'CBL-003  N2XY 4x25       To Motor MCC-01/02',
      'CBL-004  NYY 4x16        To Control Panel',
      'CTL-001  Belden 8723     To PLC / SCADA',
    ],
  })
  const bomUrl = sampleUrl({
    title: 'BILL OF MATERIALS — RINGKAS',
    subtitle: 'Panel SDP-01 (Sub Distribution)',
    meta: ['No. Dokumen : BOM-SDP-01', 'Revisi : Rev B · Status : Issued for Review'],
    body: [
      '1  Enclosure IP54 2000x800x600   1 set',
      '2  MCCB 400 A 36 kA 4P          1 pcs',
      '3  MCCB 160 A 25 kA 3P          6 pcs',
      '4  Busbar Cu 60x10              8 m',
      '5  Pilot Lamp & Ammeter         6 set',
    ],
  })

  const docs: TechDoc[] = [
    makeDoc({
      name: 'Single Line Diagram — LVMDP Tuban IV', docNo: 'SLD-PRJ-2026-001', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'LVMDP-01', type: 'SLD',
      status: 'Approved for Construction', version: 'v3', ext: 'pdf',
      description: 'SLD final untuk konstruksi LVMDP-01. Sudah disetujui klien.',
      tags: ['AFC', 'LVMDP', '20kV'],
      versions: [
        mkVersion('SLD-PRJ-2026-001-v3.pdf', 'pdf', 2516582, 'Surya (Eng)', '20 Sep 2026', 'Approved for Construction', true, { version: 'v3', url: sldUrl, note: 'Revisi penambahan metering PM8000.' }),
        mkVersion('SLD-PRJ-2026-001-v2.pdf', 'pdf', 2401997, 'Surya (Eng)', '12 Sep 2026', 'Issued for Review', false, { version: 'v2', note: 'Perbaikan rating busbar.' }),
        mkVersion('SLD-PRJ-2026-001-v1.pdf', 'pdf', 1987654, 'Deni (Drafter)', '02 Sep 2026', 'Draft', false, { version: 'v1', note: 'Rilis awal.' }),
      ],
    }),
    makeDoc({
      name: 'Panel Layout Drawing — LVMDP-01', docNo: 'LAYOUT-LVMDP-01', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'LVMDP-01', type: 'Layout',
      status: 'Approved for Construction', version: 'v2', ext: 'pdf',
      description: 'General arrangement LVMDP-01, dimensi & tata letak komponen.',
      tags: ['AFC', 'Layout'],
      versions: [
        mkVersion('LAYOUT-LVMDP-01-v2.pdf', 'pdf', 1887437, 'Deni (Drafter)', '22 Sep 2026', 'Approved for Construction', true, { version: 'v2', url: layoutUrl, note: 'Penyesuaian tinggi busbar.' }),
        mkVersion('LAYOUT-LVMDP-01-v1.pdf', 'pdf', 1720132, 'Deni (Drafter)', '10 Sep 2026', 'Draft', false, { version: 'v1', note: 'Rilis awal.' }),
      ],
    }),
    makeDoc({
      name: 'Wiring Diagram — LVMDP-02', docNo: 'WD-LVMDP-02', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'LVMDP-02', type: 'Wiring',
      status: 'Issued for Review', version: 'v1', ext: 'pdf',
      description: 'Diagram kontrol ACB LVMDP-02, sedang direview klien.',
      tags: ['Review', 'Wiring'],
      versions: [
        mkVersion('WD-LVMDP-02-v1.pdf', 'pdf', 3250585, 'Surya (Eng)', '25 Sep 2026', 'Issued for Review', true, { version: 'v1', url: wiringUrl, note: 'Dikirim ke klien untuk review.' }),
      ],
    }),
    makeDoc({
      name: 'Earthing Layout Drawing', docNo: 'EARTH-PRJ-2026-001', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', type: 'Layout',
      status: 'Draft', version: 'v1', ext: 'pdf',
      description: 'Tata letak sistem pentanahan proyek.',
      tags: ['Draft', 'Earthing'],
      versions: [
        mkVersion('EARTH-PRJ-2026-001-v1.pdf', 'pdf', 943718, 'Deni (Drafter)', '28 Sep 2026', 'Draft', true, { version: 'v1', url: earthUrl, note: 'Belum diverifikasi manajer teknik.' }),
      ],
    }),
    makeDoc({
      name: 'SLD Switchgear 20kV Suralaya', docNo: 'SLD-PRJ-2026-002', project: 'PRJ-2026-002',
      projectName: 'MCC Pabrik Gula PG Krebet', panel: 'LVMDP-Incoming', type: 'SLD',
      status: 'Issued for Review', version: 'v1', ext: 'pdf',
      description: 'SLD switchgear 20 kV gardu Suralaya.',
      tags: ['Review', '20kV', 'Switchgear'],
      versions: [
        mkVersion('SLD-PRJ-2026-002-v1.pdf', 'pdf', 8598323, 'Andi (Eng)', '01 Oct 2026', 'Issued for Review', true, { version: 'v1', url: sld2Url, note: 'Dikirim ke klien.' }),
      ],
    }),
    makeDoc({
      name: 'Cable Schedule — MCC-01', docNo: 'CS-MCC-01', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'MCC-01', type: 'Cable Schedule',
      status: 'Draft', version: 'v1', ext: 'pdf',
      description: 'Daftar kabel untuk panel MCC-01.',
      tags: ['Draft', 'Cable'],
      versions: [
        mkVersion('CS-MCC-01-v1.pdf', 'pdf', 460800, 'Surya (Eng)', '02 Oct 2026', 'Draft', true, { version: 'v1', url: csUrl, note: 'Rilis awal.' }),
      ],
    }),
    makeDoc({
      name: 'Bill of Materials — SDP-01', docNo: 'BOM-SDP-01', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'SDP-01', type: 'BOM',
      status: 'Issued for Review', version: 'Rev B', ext: 'pdf',
      description: 'BOM ringkas panel SDP-01 revisi B.',
      tags: ['BOM', 'Review'],
      versions: [
        mkVersion('BOM-SDP-01-RevB.pdf', 'pdf', 734003, 'Surya (Eng)', '30 Sep 2026', 'Issued for Review', true, { version: 'Rev B', url: bomUrl, note: 'Penambahan pilot lamp.' }),
        mkVersion('BOM-SDP-01-RevA.pdf', 'pdf', 655360, 'Surya (Eng)', '18 Sep 2026', 'Superseded', false, { version: 'Rev A', note: 'Revisi awal.' }),
      ],
    }),
    makeDoc({
      name: 'Datasheet ACB 3200A — Masterpact', docNo: 'DS-ACB-3200', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', type: 'Datasheet',
      status: 'Approved for Construction', version: 'v1', ext: 'pdf',
      description: 'Datasheet komponen utama Air Circuit Breaker 3200A.',
      tags: ['Datasheet', 'AFC'],
      versions: [
        mkVersion('DS-ACB-3200-v1.pdf', 'pdf', 512000, 'Surya (Eng)', '05 Sep 2026', 'Approved for Construction', true, {
          version: 'v1',
          url: sampleUrl({
            title: 'COMPONENT DATASHEET',
            subtitle: 'Air Circuit Breaker 3200 A',
            meta: ['No. Dokumen : DS-ACB-3200', 'Revisi : v1 · Status : AFC'],
            body: [
              'Rated current    : 3200 A',
              'Breaking cap.    : 65 kA / 1 s',
              'Rated voltage    : 690 V AC',
              'Poles            : 3P + N',
              'Standard         : IEC 60947-2',
            ],
          }),
          note: 'Disetujui.',
        }),
      ],
    }),
    makeDoc({
      name: 'SLD Draft — LVMDP Rembang II', docNo: 'SLD-PRJ-2026-003', project: 'PRJ-2026-003',
      projectName: 'Panel LVMDP Pabrik Semen Rembang II', type: 'SLD',
      status: 'Draft', version: 'v1', ext: 'dwg',
      description: 'SLD CAD asli (AutoCAD) — perlu aplikasi CAD untuk membuka.',
      tags: ['CAD', 'Draft'],
      versions: [
        mkVersion('SLD-PRJ-2026-003-v1.dwg', 'dwg', 12582912, 'Andi (Eng)', '03 Oct 2026', 'Draft', true, { version: 'v1', note: 'File DWG dari AutoCAD.' }),
      ],
    }),
    makeDoc({
      name: 'Cable Schedule (Excel) — MCC-02', docNo: 'CS-MCC-02', project: 'PRJ-2026-001',
      projectName: 'LVMDP PT. Semen Indonesia - Pabrik Tuban IV', panel: 'MCC-02', type: 'Cable Schedule',
      status: 'Draft', version: 'v1', ext: 'xlsx',
      description: 'Cable schedule dalam format Excel.',
      tags: ['Excel', 'Draft'],
      versions: [
        mkVersion('CS-MCC-02-v1.xlsx', 'xlsx', 236544, 'Deni (Drafter)', '04 Oct 2026', 'Draft', true, { version: 'v1', note: 'Spreadsheet kerja.' }),
      ],
    }),
  ]
  return docs
}

// ─── Reactive State ──────────────────────────────────────────────────────────

export const techDocs = ref<TechDoc[]>(seedDocs())

export const projectOptions = ['PRJ-2026-001', 'PRJ-2026-002', 'PRJ-2026-003', 'PRJ-2025-045']

export const docTypeOptions: TechDocType[] = ['SLD', 'Layout', 'Wiring', 'BOM', 'Datasheet', 'Cable Schedule']
export const docStatusOptions: TechDocStatus[] = [
  'Draft', 'Issued for Review', 'Approved for Construction', 'As-Built', 'Superseded',
]

// ─── Computed ────────────────────────────────────────────────────────────────

export function getDoc(id: string): TechDoc | undefined {
  return techDocs.value.find(d => d.id === id)
}

export function currentVersion(doc: TechDoc): DocVersion {
  return doc.versions.find(v => v.isCurrent) || doc.versions[0]
}

// ─── Aksi ────────────────────────────────────────────────────────────────────

export interface UploadInput {
  name: string
  project: string
  projectName?: string
  panel?: string
  type: TechDocType
  version: string
  status: TechDocStatus
  description?: string
  tags?: string[]
  file: File
  uploadedBy?: string
}

export function addDocument(input: UploadInput): TechDoc {
  const toast = useToast()
  const ext = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const url = URL.createObjectURL(input.file)
  const author = input.uploadedBy || 'Surya (Eng)'

  const version = mkVersion(
    input.file.name, ext, input.file.size, author, nowStamp(), input.status, true,
    { version: input.version, url, note: 'Unggahan baru' },
  )

  const doc: TechDoc = {
    id: `doc-${Date.now()}`,
    docNo: input.name.slice(0, 24).toUpperCase().replace(/\s+/g, '-'),
    name: input.name,
    project: input.project,
    projectName: input.projectName,
    panel: input.panel,
    type: input.type,
    status: input.status,
    version: input.version,
    rev: input.version,
    uploadedBy: author,
    date: version.uploadedAt,
    size: version.size,
    ext,
    description: input.description,
    tags: input.tags || [],
    versions: [version],
  }
  techDocs.value.unshift(doc)
  toast.success('Dokumen Diunggah', `${doc.name} (${doc.version}) tersimpan di repositori`)
  return doc
}

export interface RevisionInput {
  version: string
  status: TechDocStatus
  note?: string
  file: File
  uploadedBy?: string
}

export function addRevision(docId: string, input: RevisionInput): TechDoc | null {
  const toast = useToast()
  const doc = getDoc(docId)
  if (!doc) return null

  const ext = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const url = URL.createObjectURL(input.file)
  const author = input.uploadedBy || 'Surya (Eng)'

  doc.versions.forEach(v => { v.isCurrent = false })

  const version = mkVersion(
    input.file.name, ext, input.file.size, author, nowStamp(), input.status, true,
    { version: input.version, url, note: input.note || `Revisi dari ${doc.version}` },
  )

  doc.versions.unshift(version)
  doc.version = input.version
  doc.rev = input.version
  doc.status = input.status
  doc.ext = ext
  doc.size = version.size
  doc.uploadedBy = author
  doc.date = version.uploadedAt

  toast.success('Revisi Tersimpan', `${doc.name} — ${input.version} (${input.status})`)
  return doc
}

export function setStatus(docId: string, status: TechDocStatus) {
  const toast = useToast()
  const doc = getDoc(docId)
  if (!doc) return
  const prev = doc.status
  doc.status = status
  const cur = currentVersion(doc)
  if (cur) cur.status = status
  toast.info('Status Diperbarui', `${doc.name}: ${statusLabel(prev)} → ${statusLabel(status)}`)
}

export function removeDocument(docId: string) {
  const toast = useToast()
  const idx = techDocs.value.findIndex(d => d.id === docId)
  if (idx === -1) return
  const doc = techDocs.value[idx]
  doc.versions.forEach(v => { if (v.url?.startsWith('blob:')) URL.revokeObjectURL(v.url) })
  techDocs.value.splice(idx, 1)
  toast.warning('Dokumen Dihapus', `${doc.name} dihapus dari repositori`)
}

export function downloadVersion(version: DocVersion) {
  const toast = useToast()
  if (!version.url) {
    toast.error('Berkas Tidak Tersedia', `File ${version.filename} belum tersimpan di repositori`)
    return
  }
  const a = document.createElement('a')
  a.href = version.url
  a.download = version.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast.success('Mengunduh…', version.filename)
}

export function downloadCurrent(doc: TechDoc) {
  downloadVersion(currentVersion(doc))
}
