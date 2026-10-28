/**
 * itemStore.ts — Item Master tunggal (single source of truth)
 * Dipakai oleh: Item Master, Inventaris, BOM (bom_items.item_id -> items.id)
 * PRD §3.1 (tabel items) & §4.1
 */

import { ref } from 'vue'
import { useToast } from './toastStore'

export type ItemTracking = 'none' | 'lot' | 'serial'
export type ItemStatus = 'Aktif' | 'Obsolete'

export interface ItemMaster {
  id: string
  code: string
  name: string
  category: string
  brand: string
  type: string
  uom: string
  unit_price: number
  stock: number
  reorder: number
  tracking: ItemTracking
  status: ItemStatus
  /** Lead time pengadaan (hari) — dasar penandaan long-lead */
  lead_time_days: number
  /** Catatan spesifikasi teknis (opsional) */
  notes?: string
}

export const itemCategories = [
  'Komponen Elektrikal', 'Material Mekanik', 'Kabel', 'Enclosure', 'Instrumen', 'Aksesori',
]

export const itemUoms = ['PCS', 'MTR', 'KG', 'SET', 'ROLL', 'LOT', 'BOX']

/** Ambang lead time (hari) untuk kandidat long-lead */
export const LONG_LEAD_THRESHOLD = 45

// ─── Seed ────────────────────────────────────────────────────────────────────

const seedItems: ItemMaster[] = [
  { id: 'ITM-001', code: 'CB-ACB-4P-1600A-65kA', name: 'ACB 4 Pole 1600A 65kA', category: 'Komponen Elektrikal', brand: 'Schneider Electric', type: 'Masterpact NW16H1', uom: 'PCS', unit_price: 45_000_000, stock: 3, reorder: 2, tracking: 'serial', status: 'Aktif', lead_time_days: 60 },
  { id: 'ITM-002', code: 'CB-MCCB-3P-250A-36kA', name: 'MCCB 3 Pole 250A 36kA', category: 'Komponen Elektrikal', brand: 'ABB', type: 'Tmax T4S', uom: 'PCS', unit_price: 8_500_000, stock: 12, reorder: 5, tracking: 'serial', status: 'Aktif', lead_time_days: 45 },
  { id: 'ITM-003', code: 'BB-CU-100x10MM', name: 'Busbar Tembaga 100x10mm', category: 'Material Mekanik', brand: 'Starlite', type: 'Bare Copper', uom: 'MTR', unit_price: 350_000, stock: 250, reorder: 50, tracking: 'lot', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-004', code: 'KBL-NYY-4x16MM', name: 'Kabel NYY 4x16mm²', category: 'Kabel', brand: 'Supreme', type: 'NYY', uom: 'MTR', unit_price: 45_000, stock: 800, reorder: 200, tracking: 'lot', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-005', code: 'ENCL-STER-2000x800x600', name: 'Enclosure Besi 2000x800x600', category: 'Enclosure', brand: 'Custom', type: 'Powder Coat', uom: 'PCS', unit_price: 12_000_000, stock: 5, reorder: 2, tracking: 'none', status: 'Aktif', lead_time_days: 30 },
  { id: 'ITM-006', code: 'RLY-CT-5/1A-15VA', name: 'Current Transformer 5/1A 15VA', category: 'Instrumen', brand: 'Hobut', type: 'Toroidal', uom: 'PCS', unit_price: 1_200_000, stock: 45, reorder: 10, tracking: 'lot', status: 'Aktif', lead_time_days: 21 },
  { id: 'ITM-007', code: 'CB-MCB-1P-16A', name: 'MCB 1 Pole 16A', category: 'Komponen Elektrikal', brand: 'Hager', type: 'Type B', uom: 'PCS', unit_price: 85_000, stock: 320, reorder: 100, tracking: 'none', status: 'Aktif', lead_time_days: 7 },
  { id: 'ITM-008', code: 'KBL-NYFGBY-3x2.5', name: 'Kabel NYFGBY 3x2.5mm²', category: 'Kabel', brand: 'Kabelindo', type: 'NYFGBY', uom: 'MTR', unit_price: 18_500, stock: 1_500, reorder: 500, tracking: 'lot', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-009', code: 'CB-ACB-4P-2500A-65kA', name: 'ACB 4 Pole 2500A 65kA', category: 'Komponen Elektrikal', brand: 'Schneider Electric', type: 'Masterpact NW40H', uom: 'PCS', unit_price: 165_000_000, stock: 1, reorder: 1, tracking: 'serial', status: 'Aktif', lead_time_days: 90 },
  { id: 'ITM-010', code: 'CB-MCCB-3P-800A-50kA', name: 'MCCB 3 Pole 800A 50kA', category: 'Komponen Elektrikal', brand: 'ABB', type: 'Tmax T7S', uom: 'PCS', unit_price: 28_000_000, stock: 2, reorder: 2, tracking: 'serial', status: 'Aktif', lead_time_days: 60 },
  { id: 'ITM-011', code: 'CNT-3P-95A', name: 'Contactor 3 Pole 95A', category: 'Komponen Elektrikal', brand: 'Schneider Electric', type: 'LC1D95', uom: 'PCS', unit_price: 1_850_000, stock: 24, reorder: 10, tracking: 'none', status: 'Aktif', lead_time_days: 45 },
  { id: 'ITM-012', code: 'RLY-OVL-65/100A', name: 'Overload Relay Thermal 65-100A', category: 'Komponen Elektrikal', brand: 'Schneider Electric', type: 'LRE3369', uom: 'PCS', unit_price: 950_000, stock: 18, reorder: 8, tracking: 'none', status: 'Aktif', lead_time_days: 45 },
  { id: 'ITM-013', code: 'CB-MCB-3P-63A', name: 'MCB 3 Pole 63A', category: 'Komponen Elektrikal', brand: 'Hager', type: 'Type C', uom: 'PCS', unit_price: 320_000, stock: 140, reorder: 50, tracking: 'none', status: 'Aktif', lead_time_days: 7 },
  { id: 'ITM-014', code: 'KBL-NYA-1x2.5MM', name: 'Kabel NYA 1x2.5mm²', category: 'Kabel', brand: 'Supreme', type: 'NYA', uom: 'MTR', unit_price: 4_200, stock: 3_000, reorder: 1_000, tracking: 'lot', status: 'Aktif', lead_time_days: 7 },
  { id: 'ITM-015', code: 'DIN-RAIL-35MM', name: 'Din Rail 35mm (per meter)', category: 'Material Mekanik', brand: 'Rittal', type: 'TS35', uom: 'MTR', unit_price: 35_000, stock: 500, reorder: 100, tracking: 'none', status: 'Aktif', lead_time_days: 7 },
  { id: 'ITM-016', code: 'TRM-BLOCK-UK5N', name: 'Terminal Block UK-5N', category: 'Aksesori', brand: 'Phoenix Contact', type: 'UK-5N', uom: 'PCS', unit_price: 12_000, stock: 2_000, reorder: 500, tracking: 'none', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-017', code: 'IND-LAMP-22MM-24VDC', name: 'Pilot Lamp 22mm 24VDC', category: 'Aksesori', brand: 'Schneider Electric', type: 'XVU', uom: 'PCS', unit_price: 95_000, stock: 250, reorder: 80, tracking: 'none', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-018', code: 'PBT-PB-22MM', name: 'Push Button 22mm', category: 'Aksesori', brand: 'Schneider Electric', type: 'XB2', uom: 'PCS', unit_price: 75_000, stock: 300, reorder: 100, tracking: 'none', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-019', code: 'VNT-FAN-230MM-230V', name: 'Kipas Ventilasi 230mm + Filter', category: 'Aksesori', brand: 'Rittal', type: 'SK 3230', uom: 'PCS', unit_price: 650_000, stock: 20, reorder: 8, tracking: 'none', status: 'Aktif', lead_time_days: 30 },
  { id: 'ITM-020', code: 'ENCL-STER-800x600x300', name: 'Enclosure Besi 800x600x300', category: 'Enclosure', brand: 'Custom', type: 'Powder Coat', uom: 'PCS', unit_price: 5_500_000, stock: 3, reorder: 2, tracking: 'none', status: 'Aktif', lead_time_days: 30 },
  { id: 'ITM-021', code: 'KBL-FLEX-1x6MM', name: 'Kabel Flexible 1x6mm²', category: 'Kabel', brand: 'Kabelindo', type: 'Flexible', uom: 'MTR', unit_price: 12_000, stock: 1_200, reorder: 400, tracking: 'lot', status: 'Aktif', lead_time_days: 14 },
  { id: 'ITM-022', code: 'BB-CU-60x6MM', name: 'Busbar Tembaga 60x6mm', category: 'Material Mekanik', brand: 'Starlite', type: 'Bare Copper', uom: 'MTR', unit_price: 155_000, stock: 180, reorder: 50, tracking: 'lot', status: 'Aktif', lead_time_days: 14 },
]

export const items = ref<ItemMaster[]>(seedItems)

// ─── Query ───────────────────────────────────────────────────────────────────

export const getItemById = (id: string): ItemMaster | undefined =>
  items.value.find(i => i.id === id)

export const getItemByCode = (code: string): ItemMaster | undefined =>
  items.value.find(i => i.code.trim().toUpperCase() === code.trim().toUpperCase())

export const searchItems = (q: string, limit = 50): ItemMaster[] => {
  const s = q.trim().toLowerCase()
  if (!s) return items.value.slice(0, limit)
  return items.value.filter(i =>
    i.code.toLowerCase().includes(s) ||
    i.name.toLowerCase().includes(s) ||
    i.brand.toLowerCase().includes(s) ||
    i.category.toLowerCase().includes(s)
  ).slice(0, limit)
}

export const isLongLeadCandidate = (item: ItemMaster): boolean =>
  item.lead_time_days >= LONG_LEAD_THRESHOLD

// ─── Mutasi ──────────────────────────────────────────────────────────────────

let seq = seedItems.length

const nextItemId = () => `ITM-${String(++seq).padStart(3, '0')}`

export interface ItemPayload {
  code: string
  name: string
  category: string
  uom: string
  brand?: string
  type?: string
  unit_price?: number
  stock?: number
  reorder?: number
  tracking?: ItemTracking
  lead_time_days?: number
  notes?: string
}

/**
 * Simpan item baru atau perubahan item lama.
 * Validasi: kode wajib + unik (case-insensitive), nama wajib, uom wajib.
 */
export const saveItem = (payload: ItemPayload, editingId?: string): { ok: boolean; message: string } => {
  const toast = useToast()
  const code = payload.code.trim().toUpperCase()
  const name = payload.name.trim()

  if (!code) return { ok: false, message: 'Kode item wajib diisi.' }
  if (!name) return { ok: false, message: 'Nama / deskripsi wajib diisi.' }
  if (!payload.uom) return { ok: false, message: 'UoM dasar wajib dipilih.' }
  if ((payload.unit_price ?? 0) < 0) return { ok: false, message: 'Harga tidak boleh negatif.' }
  if ((payload.stock ?? 0) < 0) return { ok: false, message: 'Stok tidak boleh negatif.' }

  const dup = items.value.find(i => i.code.toUpperCase() === code && i.id !== editingId)
  if (dup) return { ok: false, message: `Kode ${code} sudah dipakai oleh ${dup.name}.` }

  if (editingId) {
    const item = getItemById(editingId)
    if (!item) return { ok: false, message: 'Item tidak ditemukan.' }
    Object.assign(item, {
      code, name,
      category: payload.category,
      uom: payload.uom,
      brand: payload.brand?.trim() || '-',
      type: payload.type?.trim() || '-',
      unit_price: payload.unit_price ?? 0,
      stock: payload.stock ?? 0,
      reorder: payload.reorder ?? 0,
      tracking: payload.tracking ?? 'none',
      lead_time_days: payload.lead_time_days ?? 14,
      notes: payload.notes?.trim() || '',
    })
    toast.success('Item Diperbarui', `${code} — ${name}`)
    return { ok: true, message: 'Item diperbarui.' }
  }

  const item: ItemMaster = {
    id: nextItemId(),
    code, name,
    category: payload.category,
    brand: payload.brand?.trim() || '-',
    type: payload.type?.trim() || '-',
    uom: payload.uom,
    unit_price: payload.unit_price ?? 0,
    stock: payload.stock ?? 0,
    reorder: payload.reorder ?? 0,
    tracking: payload.tracking ?? 'none',
    status: 'Aktif',
    lead_time_days: payload.lead_time_days ?? 14,
    notes: payload.notes?.trim() || '',
  }
  items.value.unshift(item)
  toast.success('Item Ditambahkan', `${code} — ${name}`)
  return { ok: true, message: 'Item ditambahkan.' }
}

/**
 * Tandai status item secara massal (Aktif / Obsolete).
 * Dipakai aksi bulk di Item Master.
 */
export const setItemStatus = (ids: string[], status: ItemStatus): number => {
  const targets = items.value.filter(i => ids.includes(i.id))
  targets.forEach(i => { i.status = status })
  return targets.length
}
