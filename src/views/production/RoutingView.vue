<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Template Routing &amp; Jam Standar</h1>
        <p class="page-subtitle">
          Daftar operasi + jam standar per tipe panel — sumber tunggal estimasi biaya jasa,
          man-hours, dan durasi perakitan (Spesifikasi §8.2 &amp; §6.1.2).
        </p>
      </div>
    </div>

    <div class="alert alert-info" style="margin-bottom: 20px;" id="routing-hint">
      ⚙️ Perubahan jam standar berlaku untuk estimasi quotation berikutnya; quotation terbit sudah
      di-snapshot (<i>cost_snapshot_at</i>) dan tidak berubah (Spesifikasi §9.6). Tarif keahlian diambil
      dari master Karyawan; subkontrak memakai biaya vendor per operasi.
    </div>

    <div class="card" v-for="tpl in templates" :key="tpl.panelType" :id="`routing-${slug(tpl.panelType)}`" style="margin-bottom: 20px;">
      <div class="routing-header">
        <div>
          <span class="font-semibold text-lg">{{ tpl.label }}</span>
          <div class="text-xs text-tertiary mono">{{ tpl.panelType }} · {{ tpl.operations.length }} operasi</div>
        </div>
        <div class="routing-kpis">
          <div class="routing-kpi">
            <span class="text-xs text-tertiary">Man-hours/unit</span>
            <span class="font-semibold">{{ totalStdHours(tpl) }}</span>
          </div>
          <div class="routing-kpi">
            <span class="text-xs text-tertiary">Biaya jasa/unit</span>
            <span class="font-semibold">{{ formatRp(serviceCostPerUnit(tpl)) }}</span>
          </div>
          <div class="routing-kpi">
            <span class="text-xs text-tertiary">Durasi indikatif</span>
            <span class="font-semibold">{{ durationPerUnit(tpl) }} hari kerja</span>
          </div>
          <div class="routing-kpi">
            <span class="text-xs text-tertiary">Status</span>
            <span :class="['badge', tpl.isActive ? 'badge-success' : 'badge-neutral']">{{ tpl.isActive ? 'Aktif' : 'Nonaktif' }}</span>
          </div>
        </div>
      </div>

      <div class="table-container" style="border: none;">
        <table class="table" :id="`rt-ops-table-${slug(tpl.panelType)}`">
          <thead>
            <tr>
              <th style="width:44px;">#</th>
              <th>Tahap</th>
              <th>Keahlian</th>
              <th style="width:130px;">Jam Standar /unit</th>
              <th style="width:150px;">Biaya /unit</th>
              <th style="width:110px;">Durasi</th>
              <th style="width:90px;">Paralel</th>
              <th style="width:90px;">Subcont</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="op in tpl.operations" :key="op.seq">
              <td class="mono text-xs">{{ op.seq }}</td>
              <td>
                <span class="badge badge-primary">{{ op.stage }}</span>
              </td>
              <td class="text-sm">{{ op.skill }}</td>
              <td>
                <input class="input input-sm" type="number" min="0.5" step="0.5" v-model.number="op.std_hours"
                  :id="`op-hours-${slug(tpl.panelType)}-${op.seq}`" @change="onStdHoursChanged(tpl)" />
              </td>
              <td class="text-sm">
                <template v-if="op.is_subcont">
                  <input class="input input-sm" type="number" min="0" step="50000" v-model.number="op.subcont_cost" />
                </template>
                <template v-else>
                  {{ formatRp(op.std_hours * avgHourlyRate(op.skill)) }}
                  <div class="text-xs text-tertiary">@ {{ formatRp(avgHourlyRate(op.skill)) }}/jam</div>
                </template>
              </td>
              <td class="text-sm">{{ opDays(op) }} hari</td>
              <td>
                <input type="checkbox" v-model="op.is_parallel" :id="`op-par-${slug(tpl.panelType)}-${op.seq}`" />
              </td>
              <td>
                <input type="checkbox" v-model="op.is_subcont" :id="`op-sub-${slug(tpl.panelType)}-${op.seq}`" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  routingTemplates, totalStdHours, type RoutingTemplate, type RoutingOperation,
} from '../../data/routingTemplates'
import { avgHourlyRate, safeCapacity, todayISO, estimationConfig } from '../../data/workforceStore'
import { formatRp } from '../../data/costEstimator'
import { useToast } from '../../data/toastStore'

const toast = useToast()
const templates = computed(() => routingTemplates.value)
const today = todayISO()

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Biaya jasa per 1 unit panel = Σ (jam standar × tarif | biaya subcont) */
const serviceCostPerUnit = (tpl: RoutingTemplate): number =>
  tpl.operations.reduce((s, op) =>
    s + (op.is_subcont ? (op.subcont_cost ?? 0) : op.std_hours * avgHourlyRate(op.skill)), 0)

const opDays = (op: RoutingOperation): number =>
  Math.ceil(op.std_hours / safeCapacity(op.skill, today))

/** Durasi indikatif per unit: blok sekuensial, paralel = max dalam blok */
const durationPerUnit = (tpl: RoutingTemplate): number => {
  const blocks: number[][] = []
  for (const op of tpl.operations) {
    if (op.is_parallel && blocks.length) blocks[blocks.length - 1].push(opDays(op))
    else blocks.push([opDays(op)])
  }
  return blocks.reduce((s, b) => s + Math.max(...b), 0)
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
const onStdHoursChanged = (_tpl: RoutingTemplate) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    toast.info('Routing Diperbarui', `Jam standar disimpan — estimasi quotation baru memakai nilai terbaru (overhead ${estimationConfig.value.overheadPct}%).`)
  }, 500)
}
</script>

<style scoped>
.routing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}
.routing-kpis { display: flex; gap: 10px; flex-wrap: wrap; }
.routing-kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  min-width: 110px;
}
.input-sm { padding: 4px 8px; font-size: 12px; }
</style>
