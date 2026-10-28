/**
 * routingTemplates.ts — Template Routing & Jam Standar per tipe panel
 * PRD §3.1 routing_templates + routing_operations; Spesifikasi §8.2 & §8.8.
 * Sumber tunggal estimasi biaya jasa (services_cost), man-hours, dan durasi perakitan.
 * Baris operasi menunjuk keahlian (bukan nama orang) — pencocokan ke karyawan di workforceStore.
 */

import { ref } from 'vue'

export type ProductionStage =
  | 'Fabrikasi' | 'Powder Coating' | 'Rakit Mekanis' | 'Wiring' | 'QC Internal' | 'Packing'

export type WorkerSkill =
  | 'Fabrikasi' | 'Powder Coating' | 'Rakit Mekanis' | 'Wiring' | 'QC'

export interface RoutingOperation {
  seq: number
  stage: ProductionStage
  skill: WorkerSkill
  /** Jam standar pengerjaan operasi ini untuk 1 unit panel */
  std_hours: number
  /** Boleh berjalan paralel dengan operasi sebelumnya */
  is_parallel?: boolean
  /** Operasi subkontrak — biaya memakai subcont_cost, bukan tarif karyawan */
  is_subcont?: boolean
  subcont_cost?: number
}

export interface RoutingTemplate {
  panelType: string
  label: string
  isActive: boolean
  operations: RoutingOperation[]
}

export const routingTemplates = ref<RoutingTemplate[]>([
  {
    panelType: 'LVMDP-Incoming',
    label: 'LVMDP Incoming (ACB Utama)',
    isActive: true,
    operations: [
      { seq: 1, stage: 'Fabrikasi', skill: 'Fabrikasi', std_hours: 24 },
      { seq: 2, stage: 'Powder Coating', skill: 'Powder Coating', std_hours: 8, is_subcont: true, subcont_cost: 1_750_000 },
      { seq: 3, stage: 'Rakit Mekanis', skill: 'Rakit Mekanis', std_hours: 40 },
      { seq: 4, stage: 'Wiring', skill: 'Wiring', std_hours: 36 },
      { seq: 5, stage: 'QC Internal', skill: 'QC', std_hours: 8 },
      { seq: 6, stage: 'Packing', skill: 'Fabrikasi', std_hours: 4 },
    ],
  },
  {
    panelType: 'LVMDP-Outgoing',
    label: 'LVMDP Outgoing (Feeder MCCB)',
    isActive: true,
    operations: [
      { seq: 1, stage: 'Fabrikasi', skill: 'Fabrikasi', std_hours: 20 },
      { seq: 2, stage: 'Powder Coating', skill: 'Powder Coating', std_hours: 8, is_subcont: true, subcont_cost: 1_750_000 },
      { seq: 3, stage: 'Rakit Mekanis', skill: 'Rakit Mekanis', std_hours: 32 },
      { seq: 4, stage: 'Wiring', skill: 'Wiring', std_hours: 28 },
      { seq: 5, stage: 'QC Internal', skill: 'QC', std_hours: 6 },
      { seq: 6, stage: 'Packing', skill: 'Fabrikasi', std_hours: 3 },
    ],
  },
  {
    panelType: 'MCC-Standard',
    label: 'MCC Motor Control Center',
    isActive: true,
    operations: [
      { seq: 1, stage: 'Fabrikasi', skill: 'Fabrikasi', std_hours: 28 },
      { seq: 2, stage: 'Powder Coating', skill: 'Powder Coating', std_hours: 10, is_subcont: true, subcont_cost: 2_100_000 },
      { seq: 3, stage: 'Rakit Mekanis', skill: 'Rakit Mekanis', std_hours: 44 },
      { seq: 4, stage: 'Wiring', skill: 'Wiring', std_hours: 48 },
      { seq: 5, stage: 'QC Internal', skill: 'QC', std_hours: 8 },
      { seq: 6, stage: 'Packing', skill: 'Fabrikasi', std_hours: 4 },
    ],
  },
  {
    panelType: 'SDP',
    label: 'SDP Sub Distribution Panel',
    isActive: true,
    operations: [
      { seq: 1, stage: 'Fabrikasi', skill: 'Fabrikasi', std_hours: 12 },
      { seq: 2, stage: 'Powder Coating', skill: 'Powder Coating', std_hours: 5, is_subcont: true, subcont_cost: 1_100_000 },
      { seq: 3, stage: 'Rakit Mekanis', skill: 'Rakit Mekanis', std_hours: 16 },
      { seq: 4, stage: 'Wiring', skill: 'Wiring', std_hours: 14 },
      { seq: 5, stage: 'QC Internal', skill: 'QC', std_hours: 4 },
      { seq: 6, stage: 'Packing', skill: 'Fabrikasi', std_hours: 2 },
    ],
  },
])

export const fallbackRouting: RoutingTemplate = {
  panelType: 'DEFAULT',
  label: 'Template Umum Panel Distribusi',
  isActive: true,
  operations: [
    { seq: 1, stage: 'Fabrikasi', skill: 'Fabrikasi', std_hours: 16 },
    { seq: 2, stage: 'Powder Coating', skill: 'Powder Coating', std_hours: 6, is_subcont: true, subcont_cost: 1_300_000 },
    { seq: 3, stage: 'Rakit Mekanis', skill: 'Rakit Mekanis', std_hours: 24 },
    { seq: 4, stage: 'Wiring', skill: 'Wiring', std_hours: 20 },
    { seq: 5, stage: 'QC Internal', skill: 'QC', std_hours: 5 },
    { seq: 6, stage: 'Packing', skill: 'Fabrikasi', std_hours: 3 },
  ],
}

export const getRoutingForPanelType = (panelType: string): RoutingTemplate =>
  routingTemplates.value.find(t => t.panelType === panelType) || fallbackRouting

/** Total jam standar (termasuk subcont sebagai durasi) untuk 1 unit panel */
export const totalStdHours = (tpl: RoutingTemplate): number =>
  tpl.operations.reduce((s, op) => s + op.std_hours, 0)

/** Total biaya jasa subkontrak per 1 unit panel */
export const subcontCostPerUnit = (tpl: RoutingTemplate): number =>
  tpl.operations.reduce((s, op) => s + (op.is_subcont ? (op.subcont_cost ?? 0) : 0), 0)
