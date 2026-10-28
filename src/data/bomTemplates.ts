/**
 * bomTemplates.ts — Template BOM per tipe panel
 * Dipakai saat: (1) SO Confirmed → Rev A Draft terisi otomatis (spec §7.1),
 *               (2) Aksi "Salin dari Template Panel" (hanya mengisi baris).
 * Baris template menunjuk kode Item Master — bukan kode bebas.
 */

export interface BomTemplateLine {
  code: string
  qty: number
  designator?: string
  longLead?: boolean
  remarks?: string
}

export interface BomTemplate {
  panelType: string
  label: string
  lines: BomTemplateLine[]
}

export const bomTemplates: BomTemplate[] = [
  {
    panelType: 'LVMDP-Incoming',
    label: 'LVMDP Incoming (ACB Utama)',
    lines: [
      { code: 'ENCL-STER-2000x800x600', qty: 1, designator: 'ENC-1', remarks: 'Bodi panel + pintu ganda' },
      { code: 'CB-ACB-4P-2500A-65kA', qty: 1, designator: 'ACB-1', longLead: true, remarks: 'Pemutus utama, motorized' },
      { code: 'RLY-CT-5/1A-15VA', qty: 3, designator: 'CT-R/S/T' },
      { code: 'BB-CU-100x10MM', qty: 24, designator: 'BB-R/S/T', remarks: 'Busbar fasa + netral' },
      { code: 'KBL-NYY-4x16MM', qty: 40, designator: 'KBL-IN', remarks: 'Kabel feeder masuk' },
      { code: 'DIN-RAIL-35MM', qty: 6 },
      { code: 'TRM-BLOCK-UK5N', qty: 40 },
      { code: 'IND-LAMP-22MM-24VDC', qty: 3, designator: 'L-R/S/T' },
      { code: 'PBT-PB-22MM', qty: 2, designator: 'PB-ON/OFF' },
      { code: 'VNT-FAN-230MM-230V', qty: 2, designator: 'FAN-1/2' },
      { code: 'KBL-NYA-1x2.5MM', qty: 30, remarks: 'Instalasi kontrol' },
    ],
  },
  {
    panelType: 'LVMDP-Outgoing',
    label: 'LVMDP Outgoing (Feeder MCCB)',
    lines: [
      { code: 'ENCL-STER-2000x800x600', qty: 1, designator: 'ENC-1' },
      { code: 'CB-MCCB-3P-800A-50kA', qty: 4, designator: 'MCCB-1..4', longLead: true },
      { code: 'CB-MCB-3P-63A', qty: 4, designator: 'MCB-1..4', remarks: 'Pemisah circuit kecil' },
      { code: 'BB-CU-100x10MM', qty: 30, designator: 'BB-R/S/T' },
      { code: 'KBL-NYY-4x16MM', qty: 60, designator: 'KBL-OUT' },
      { code: 'RLY-CT-5/1A-15VA', qty: 3, designator: 'CT-R/S/T' },
      { code: 'DIN-RAIL-35MM', qty: 8 },
      { code: 'TRM-BLOCK-UK5N', qty: 60 },
      { code: 'IND-LAMP-22MM-24VDC', qty: 6 },
      { code: 'VNT-FAN-230MM-230V', qty: 2, designator: 'FAN-1/2' },
      { code: 'KBL-NYA-1x2.5MM', qty: 40 },
    ],
  },
  {
    panelType: 'MCC-Standard',
    label: 'MCC Motor Control Center',
    lines: [
      { code: 'ENCL-STER-2000x800x600', qty: 1, designator: 'ENC-1' },
      { code: 'CB-MCCB-3P-250A-36kA', qty: 6, designator: 'MCCB-1..6', longLead: true },
      { code: 'CNT-3P-95A', qty: 6, designator: 'KM-1..6', longLead: true },
      { code: 'RLY-OVL-65/100A', qty: 6, designator: 'OLR-1..6' },
      { code: 'CB-MCB-1P-16A', qty: 12, designator: 'MCB-C1..C12', remarks: 'Sirkuit kontrol' },
      { code: 'BB-CU-60x6MM', qty: 18, designator: 'BB-R/S/T' },
      { code: 'KBL-NYFGBY-3x2.5', qty: 120, designator: 'KBL-CTRL' },
      { code: 'KBL-NYA-1x2.5MM', qty: 80 },
      { code: 'DIN-RAIL-35MM', qty: 10 },
      { code: 'TRM-BLOCK-UK5N', qty: 80 },
      { code: 'IND-LAMP-22MM-24VDC', qty: 8 },
      { code: 'PBT-PB-22MM', qty: 8 },
      { code: 'VNT-FAN-230MM-230V', qty: 2, designator: 'FAN-1/2' },
    ],
  },
  {
    panelType: 'SDP',
    label: 'SDP Sub Distribution Panel',
    lines: [
      { code: 'ENCL-STER-800x600x300', qty: 1, designator: 'ENC-1' },
      { code: 'CB-MCB-3P-63A', qty: 6, designator: 'MCB-1..6' },
      { code: 'CB-MCB-1P-16A', qty: 18, designator: 'MCB-L1..L18' },
      { code: 'BB-CU-60x6MM', qty: 8, designator: 'BB-R/S/T/N' },
      { code: 'KBL-NYFGBY-3x2.5', qty: 60 },
      { code: 'DIN-RAIL-35MM', qty: 6 },
      { code: 'TRM-BLOCK-UK5N', qty: 40 },
      { code: 'IND-LAMP-22MM-24VDC', qty: 4 },
    ],
  },
]

/** Template default untuk tipe panel yang belum punya template khusus */
export const fallbackTemplate: BomTemplate = {
  panelType: 'DEFAULT',
  label: 'Template Umum Panel Distribusi',
  lines: [
    { code: 'ENCL-STER-2000x800x600', qty: 1 },
    { code: 'CB-MCB-3P-63A', qty: 4 },
    { code: 'BB-CU-60x6MM', qty: 12 },
    { code: 'KBL-NYFGBY-3x2.5', qty: 80 },
    { code: 'DIN-RAIL-35MM', qty: 6 },
    { code: 'TRM-BLOCK-UK5N', qty: 40 },
    { code: 'IND-LAMP-22MM-24VDC', qty: 4 },
  ],
}

export const getTemplateForPanelType = (panelType: string): BomTemplate =>
  bomTemplates.find(t => t.panelType === panelType) || fallbackTemplate
