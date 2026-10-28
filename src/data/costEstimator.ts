/**
 * costEstimator.ts — Mesin estimasi cost-plus Quotation (Spesifikasi §6.1.2)
 * material  = Σ (BOM template × harga Item Master) × qty
 * jasa      = Σ operasi routing (jam standar × tarif keahlian | biaya subcont) × qty
 * HPP       = material + jasa (+ overhead % konfigurasi)
 * harga     = HPP × (1 + margin target), dibulatkan sesuai konfigurasi
 * durasi    = hari kerja dari blok operasi (paralel = konkurensi) ÷ kapasitas karyawan
 */

import { getItemByCode } from './itemStore'
import { getTemplateForPanelType } from './bomTemplates'
import { getRoutingForPanelType, type RoutingOperation, type WorkerSkill } from './routingTemplates'
import {
  estimationConfig, avgHourlyRate, safeCapacity, hasCapacity, addWorkingDays, todayISO,
} from './workforceStore'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface LineInput {
  type: string
  qty: number
  spec: string
  /** Harga manual (override) — bila kosong memakai harga cost-plus */
  unit_price?: number
  price_overridden?: boolean
  override_reason?: string
}

export interface OpEstimate {
  seq: number
  stage: string
  skill: WorkerSkill
  std_hours: number
  qty: number
  /** Durasi operasi ini (hari kerja) */
  days: number
  /** Biaya operasi ini (jasa karyawan ATAU biaya subcont) */
  cost: number
  is_subcont: boolean
  is_parallel: boolean
  /** Kapasitas keahlian yang dipakai (man-hours/hari) */
  capacity: number
}

export interface LineEstimate {
  type: string
  qty: number
  spec: string
  materialCost: number
  servicesCost: number
  /** man-hours karyawan internal (tanpa subcont) */
  manhours: number
  /** HPP termasuk overhead */
  hpp: number
  /** Harga satuan cost-plus (sudah dibulatkan) */
  costPlusUnitPrice: number
  /** Harga yang dipakai quotation (override bila ada, dengan alasan) */
  unitPrice: number
  priceOverridden: boolean
  overrideReason?: string
  subtotal: number
  estDays: number
  ops: OpEstimate[]
}

export interface QuotationEstimate {
  lines: LineEstimate[]
  totalMaterial: number
  totalServices: number
  totalHpp: number
  totalValue: number
  totalManhours: number
  estDays: number
  estStartDate: string
  estFinishDate: string
  marginTargetPct: number
  /** Peringatan keahlian tanpa karyawan aktif tersedia */
  skillWarnings: string[]
}

// ─── Util biaya ──────────────────────────────────────────────────────────────

export const roundPrice = (value: number): number => {
  const r = estimationConfig.value.priceRounding
  if (!r || r <= 0) return Math.round(value)
  return Math.round(value / r) * r
}

export const formatRp = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

/** Biaya material 1 unit panel dari template BOM × harga Item Master */
export const materialCostPerUnit = (panelType: string): number => {
  const tpl = getTemplateForPanelType(panelType)
  return tpl.lines.reduce((sum, line) => {
    const item = getItemByCode(line.code)
    return sum + (item?.unit_price ?? 0) * line.qty
  }, 0)
}

// ─── Estimasi per baris ──────────────────────────────────────────────────────

/** Durasi & biaya per operasi routing untuk qty panel */
const estimateOps = (panelType: string, qty: number, startDate: string): OpEstimate[] => {
  const routing = getRoutingForPanelType(panelType)
  return routing.operations.map((op: RoutingOperation) => {
    const capacity = safeCapacity(op.skill, startDate)
    const days = Math.ceil((op.std_hours * qty) / capacity)
    const cost = op.is_subcont
      ? (op.subcont_cost ?? 0) * qty
      : op.std_hours * qty * avgHourlyRate(op.skill)
    return {
      seq: op.seq, stage: op.stage, skill: op.skill,
      std_hours: op.std_hours, qty, days, cost,
      is_subcont: !!op.is_subcont, is_parallel: !!op.is_parallel, capacity,
    }
  })
}

/**
 * Durasi total (hari kerja) dari daftar operasi.
 * Operasi berurutan dijumlahkan; operasi `is_parallel` berjalan bersama blok sebelumnya
 * (durasi blok = max durasi di dalamnya).
 */
export const durationFromOps = (ops: OpEstimate[]): number => {
  const blocks: number[][] = []
  for (const op of ops) {
    if (op.is_parallel && blocks.length) {
      blocks[blocks.length - 1].push(op.days)
    } else {
      blocks.push([op.days])
    }
  }
  return blocks.reduce((s, block) => s + Math.max(...block), 0)
}

export const estimateLine = (input: LineInput, startDate: string): LineEstimate => {
  const qty = Math.max(1, Math.floor(input.qty || 1))
  const material = materialCostPerUnit(input.type) * qty
  const ops = estimateOps(input.type, qty, startDate)
  const services = ops.reduce((s, o) => s + o.cost, 0)
  const manhours = ops.filter(o => !o.is_subcont).reduce((s, o) => s + o.std_hours * qty, 0)
  const overhead = material + services
  const hpp = overhead * (1 + estimationConfig.value.overheadPct / 100)

  const overridden = !!input.price_overridden && !!input.override_reason && (input.unit_price ?? 0) > 0
  const estDays = durationFromOps(ops)

  return {
    type: input.type, qty, spec: input.spec,
    materialCost: material,
    servicesCost: services,
    manhours,
    hpp,
    costPlusUnitPrice: 0, // harga cost-plus (dengan margin) diisi di buildQuotationEstimate
    unitPrice: overridden ? (input.unit_price ?? 0) : 0,
    priceOverridden: overridden,
    overrideReason: overridden ? input.override_reason : undefined,
    subtotal: 0,
    estDays,
    ops,
  }
}

// ─── Estimasi header quotation ───────────────────────────────────────────────

/** Peringatan keahlian tanpa karyawan aktif tersedia pada tanggal estimasi */
export const skillWarningsFor = (panelType: string, startDate: string): string[] => {
  const routing = getRoutingForPanelType(panelType)
  const warnings: string[] = []
  for (const op of routing.operations) {
    if (!op.is_subcont && !hasCapacity(op.skill, startDate)) {
      const w = `Keahlian ${op.skill} tidak punya karyawan aktif tersedia — memakai kapasitas & tarif default.`
      if (!warnings.includes(w)) warnings.push(w)
    }
  }
  return warnings
}

export const buildQuotationEstimate = (
  inputs: LineInput[],
  marginTargetPct: number,
  startDate: string = todayISO(),
): QuotationEstimate => {
  const margin = Math.max(0, marginTargetPct) / 100
  const skillWarnings: string[] = []

  const lines = inputs
    .filter(i => i.type && i.qty > 0)
    .map(input => {
      const line = estimateLine(input, startDate)
      // harga cost-plus per unit = (HPP total baris / qty) × (1 + margin), dibulatkan
      const suggested = roundPrice((line.hpp / line.qty) * (1 + margin))
      line.costPlusUnitPrice = suggested
      if (!line.priceOverridden) line.unitPrice = suggested
      line.subtotal = line.unitPrice * line.qty
      for (const w of skillWarningsFor(line.type, startDate)) {
        if (!skillWarnings.includes(w)) skillWarnings.push(w)
      }
      return line
    })

  const totalMaterial = lines.reduce((s, l) => s + l.materialCost, 0)
  const totalServices = lines.reduce((s, l) => s + l.servicesCost, 0)
  const totalHpp = lines.reduce((s, l) => s + l.hpp, 0)
  const totalValue = lines.reduce((s, l) => s + l.subtotal, 0)
  const totalManhours = lines.reduce((s, l) => s + l.manhours, 0)
  const estDays = lines.reduce((s, l) => s + l.estDays, 0)

  return {
    lines,
    totalMaterial, totalServices, totalHpp, totalValue, totalManhours,
    estDays,
    estStartDate: startDate,
    estFinishDate: addWorkingDays(startDate, estDays),
    marginTargetPct,
    skillWarnings,
  }
}

/** Deviasi % nilai penawaran vs estimasi CRM (Spesifikasi §6.1.2 ayat 6) */
export const crmDeviationPct = (value: number, crmValue: number | undefined | null): number | null => {
  if (!crmValue || crmValue <= 0) return null
  return ((value - crmValue) / crmValue) * 100
}

export const isCrmDeviationWarning = (deviation: number | null): boolean =>
  deviation !== null && Math.abs(deviation) > estimationConfig.value.crmDeviationThresholdPct
