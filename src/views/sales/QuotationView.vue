<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Quotation</h1>
        <p class="page-subtitle">Daftar penawaran harga — dibuat dari Prospek/CRM. Gunakan aksi per baris untuk melanjutkan alur.</p>
      </div>
      <div class="flex gap-3">
        <button class="btn btn-primary btn-sm" id="btn-new-quotation-from-crm" @click="openNewQt()">
          + Buat Quotation (Cost-Plus)
        </button>
        <router-link to="/sales/crm" class="btn btn-secondary btn-sm" id="btn-go-crm">
          🎯 Dari CRM
        </router-link>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-total-qt">
        <div class="stat-icon" style="background: rgba(59,85,168,0.15);">📋</div>
        <div class="stat-value">{{ allQuotations.length }}</div>
        <div class="stat-label">Total Quotation</div>
      </div>
      <div class="stat-card" id="stat-pending-qt">
        <div class="stat-icon" style="background: rgba(245,158,11,0.15);">⏳</div>
        <div class="stat-value">{{ pendingCount }}</div>
        <div class="stat-label">Menunggu Approval</div>
        <div class="stat-trend trend-up" v-if="pendingCount > 0">▲ Perlu tindakan</div>
      </div>
      <div class="stat-card" id="stat-approved-qt">
        <div class="stat-icon" style="background: rgba(16,185,129,0.15);">✅</div>
        <div class="stat-value">{{ approvedCount }}</div>
        <div class="stat-label">Disetujui Klien</div>
        <div class="stat-trend trend-up" v-if="approvedCount > 0">Siap → Konversi SO</div>
      </div>
      <div class="stat-card" id="stat-total-value">
        <div class="stat-icon" style="background: rgba(59,130,246,0.15);">💰</div>
        <div class="stat-value" style="font-size: 20px;">{{ formatCurrencyChain(totalPipelineValue) }}</div>
        <div class="stat-label">Nilai Pipeline</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="padding: 16px 20px; margin-bottom: 20px;">
      <div class="flex gap-3 flex-wrap">
        <div class="input-with-icon flex-1" style="min-width: 200px;">
          <span class="input-icon">🔍</span>
          <input type="text" class="input" placeholder="Cari nomor, proyek, pelanggan..." v-model="search" id="search-qt" />
        </div>
        <select class="select" style="width: 200px;" v-model="filterStatus" id="filter-qt-status">
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
          <option value="SIAP_KIRIM">Siap Kirim</option>
          <option value="TERKIRIM">Terkirim</option>
          <option value="DISETUJUI_KLIEN">Disetujui Klien</option>
          <option value="MENJADI_SO">Menjadi SO</option>
          <option value="KALAH">Kalah</option>
        </select>
        <select class="select" style="width: 220px;" v-model="filterVerdict" id="filter-qt-verdict">
          <option value="">Semua Kelayakan</option>
          <option value="LAYAK">✓ Layak Lanjut</option>
          <option value="WASPADA">⚠ Waspada</option>
          <option value="TIDAK_DISARANKAN">✗ Tidak Disarankan</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card" id="quotation-table-card">
      <div class="table-container" style="border: none;">
        <table class="table" id="quotation-table">
          <thead>
            <tr>
              <th>No. Quotation</th>
              <th>Proyek / Prospek</th>
              <th>Pelanggan</th>
              <th>Nilai</th>
              <th>HPP &amp; Durasi</th>
              <th>Margin</th>
              <th>Kelayakan</th>
              <th>Valid s/d</th>
              <th>Status</th>
              <th>Aksi Rantai</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="qt in filteredQuotations" :key="qt.doc_no" :id="`row-qt-${qt.id}`"
                :class="{ 'row-locked': qt.is_locked, 'row-actionable': canConvertToSO(qt).ok }">
              <td>
                <div class="mono text-sm font-semibold text-accent">{{ qt.doc_no }}</div>
                <div class="text-xs text-tertiary">dari {{ qt.source_id }}</div>
              </td>
              <td>
                <div class="font-medium text-primary truncate" style="max-width: 220px;">{{ qt.project }}</div>
                <div class="text-xs text-tertiary" v-if="qt.so_id">→ <span class="text-accent mono">{{ qt.so_id }}</span></div>
              </td>
              <td class="text-secondary text-sm">{{ qt.customer }}</td>
              <td class="font-semibold">{{ formatCurrencyChain(qt.value) }}</td>
              <td>
                <div class="text-sm">{{ formatCurrencyChain(qt.total_cost ?? 0) }}</div>
                <div class="text-xs text-tertiary" v-if="qt.est_days">
                  {{ qt.est_days }} hari kerja · s/d {{ qt.est_finish_date }}
                </div>
                <div class="text-xs text-warning" v-if="qt.crm_deviation_pct !== undefined && qt.crm_deviation_pct !== null && Math.abs(qt.crm_deviation_pct) > 20"
                     :title="`Deviasi vs estimasi CRM ${qt.crm_deviation_pct.toFixed(1)}%`">
                  ⚠ deviasi CRM {{ qt.crm_deviation_pct > 0 ? '+' : '' }}{{ qt.crm_deviation_pct.toFixed(0) }}%
                </div>
              </td>
              <td>
                <span :class="['badge', qt.margin < 18 ? 'badge-danger' : qt.margin < 20 ? 'badge-warning' : 'badge-success']">
                  {{ qt.margin }}%
                </span>
                <div v-if="qt.margin < 18" class="text-xs text-danger" style="margin-top:2px;">Butuh Direksi</div>
              </td>
              <td>
                <button
                  class="verdict-btn"
                  :class="verdictClass(qt)"
                  :id="`qt-assess-${qt.id}`"
                  @click="openAssessment(qt.id)"
                  title="Lihat rincian kelayakan deal"
                >{{ verdictIcon(qt) }} {{ assessment(qt).score }}</button>
              </td>
              <td>
                <span :class="isExpired(qt.valid_until) ? 'text-danger text-sm' : 'text-secondary text-sm'">
                  {{ qt.valid_until || '—' }}
                  <span v-if="isExpired(qt.valid_until)" class="badge badge-danger" style="margin-left: 4px;">Kedaluwarsa</span>
                </span>
              </td>
              <td>
                <span :class="['badge', statusBadgeClass(qt.status)]">{{ statusLabel(qt.status) }}</span>
                <div class="lock-icon" v-if="qt.is_locked" title="Terkunci">🔒</div>
              </td>
              <td>
                <div class="flex gap-1 flex-wrap">
                  <!-- Aksi sesuai status/state machine -->
                  <button
                    v-if="qt.status === 'DRAFT'"
                    class="btn btn-sm btn-primary"
                    :id="`qt-ajukan-${qt.id}`"
                    @click="doAjukan(qt.id)"
                  >Ajukan ↑</button>

                  <button
                    v-if="qt.status === 'MENUNGGU_APPROVAL'"
                    class="btn btn-sm btn-success-ghost"
                    :id="`qt-setujui-${qt.id}`"
                    @click="doSetujui(qt.id)"
                  >✓ Setujui</button>

                  <button
                    v-if="qt.status === 'SIAP_KIRIM'"
                    class="btn btn-sm btn-primary"
                    :id="`qt-kirim-${qt.id}`"
                    @click="doKirim(qt.id)"
                  >📤 Kirim ke Klien</button>

                  <button
                    v-if="qt.status === 'TERKIRIM'"
                    class="btn btn-sm btn-success-ghost"
                    :id="`qt-mark-approved-${qt.id}`"
                    @click="doTandaiDisetujui(qt.id)"
                  >✓ Klien Setuju</button>

                  <button
                    v-if="qt.status === 'TERKIRIM'"
                    class="btn btn-sm btn-danger-ghost"
                    :id="`qt-mark-kalah-${qt.id}`"
                    @click="doTandaiKalah(qt.id)"
                  >✗ Kalah</button>

                  <!-- TOMBOL UTAMA: Konversi ke SO (G01) -->
                  <div v-if="qt.status === 'DISETUJUI_KLIEN'" class="action-gate-wrapper">
                    <button
                      class="btn btn-sm btn-primary"
                      :class="{ 'btn-disabled': !canConvertToSO(qt).ok }"
                      :disabled="!canConvertToSO(qt).ok"
                      :id="`qt-convert-so-${qt.id}`"
                      @click="doKonversiKeSO(qt.id)"
                      :title="!canConvertToSO(qt).ok ? canConvertToSO(qt).reason : 'Konversi ke Sales Order'"
                    >
                      🔄 Konversi ke SO
                    </button>
                    <div v-if="!canConvertToSO(qt).ok" class="gate-reason">{{ canConvertToSO(qt).reason }}</div>
                  </div>

                  <!-- Revisi (jika sudah terkirim atau lebih) -->
                  <button
                    v-if="['TERKIRIM','DISETUJUI_KLIEN','KALAH','KEDALUWARSA'].includes(qt.status)"
                    class="btn btn-icon btn-secondary btn-sm"
                    :id="`qt-revisi-${qt.id}`"
                    @click="doRevisi(qt.id)"
                    title="Buat Revisi (versi baru)"
                  >↩ Rev</button>

                  <!-- Terkunci -->
                  <span v-if="qt.status === 'MENJADI_SO'" class="text-xs text-tertiary">
                    🔒 Terkunci
                  </span>
                  <span v-if="qt.status === 'DIGANTIKAN'" class="text-xs text-tertiary">
                    Digantikan
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="filteredQuotations.length === 0">
              <td colspan="10">
                <div class="empty-state">
                  <div class="empty-state-icon">📋</div>
                  <div class="empty-state-title">Belum ada quotation</div>
                  <div class="empty-state-desc">Buat quotation cost-plus di sini, atau mulai dari halaman CRM &amp; Prospek</div>
                  <button class="btn btn-primary" @click="openNewQt()">+ Buat Quotation</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Detail Kelayakan Deal (#modal-assess-qt) -->
    <div class="modal-overlay" v-if="showAssessModal" @click.self="showAssessModal = false" id="modal-assess-qt">
      <div class="modal" style="max-width: 640px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">📊 Kelayakan Deal</span>
            <div class="text-xs text-tertiary" v-if="assessTarget">{{ assessTarget.doc_no }} — {{ assessTarget.project }}</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showAssessModal = false">✕</button>
        </div>
        <div class="modal-body" v-if="assessTarget && assessData">
          <!-- Skor besar + verdict -->
          <div class="assess-hero" :class="`hero-${assessData.verdict}`">
            <div class="assess-score">{{ assessData.score }}</div>
            <div>
              <div class="assess-verdict">{{ verdictLabel(assessData.verdict) }}</div>
              <div class="text-xs" style="opacity:.85;">{{ verdictSub(assessData.verdict) }}</div>
            </div>
          </div>

          <!-- Ringkasan angka kunci -->
          <div class="assess-kpis">
            <div class="assess-kpi">
              <span class="text-xs text-tertiary">Nilai jual</span>
              <span class="font-semibold">{{ formatCurrencyChain(assessTarget.value) }}</span>
            </div>
            <div class="assess-kpi">
              <span class="text-xs text-tertiary">Estimasi HPP</span>
              <span class="font-semibold">{{ formatCurrencyChain(assessData.estimated_cost) }}</span>
            </div>
            <div class="assess-kpi" v-if="assessCost">
              <span class="text-xs text-tertiary">— material</span>
              <span class="font-semibold text-sm">{{ formatCurrencyChain(assessCost.totalMaterial) }}</span>
            </div>
            <div class="assess-kpi" v-if="assessCost">
              <span class="text-xs text-tertiary">— biaya jasa</span>
              <span class="font-semibold text-sm">{{ formatCurrencyChain(assessCost.totalServices) }}</span>
            </div>
            <div class="assess-kpi" v-if="assessCost">
              <span class="text-xs text-tertiary">Estimasi perakitan</span>
              <span class="font-semibold text-sm">{{ assessCost.estDays }} hari kerja<br>
                <span class="text-xs text-tertiary" style="font-weight:400;">s/d {{ assessCost.estFinishDate }}</span>
              </span>
            </div>
            <div class="assess-kpi">
              <span class="text-xs text-tertiary">Margin kotor terest.</span>
              <span class="font-semibold" :class="assessData.estimated_margin_pct !== null && assessData.estimated_margin_pct < 15 ? 'text-danger' : 'text-success'">
                {{ assessData.estimated_margin_pct === null ? '—' : assessData.estimated_margin_pct.toFixed(1) + '%' }}
              </span>
            </div>
            <div class="assess-kpi">
              <span class="text-xs text-tertiary">Long-lead</span>
              <span class="font-semibold">{{ assessData.long_lead_items.length }}</span>
            </div>
          </div>

          <!-- Rincian faktor -->
          <div class="assess-factors">
            <div v-for="f in assessData.factors" :key="f.name" class="assess-factor">
              <div class="flex justify-between items-center" style="margin-bottom: 4px;">
                <span class="text-sm font-medium">{{ f.name }}</span>
                <span class="text-sm font-semibold" :class="f.points >= f.weight * 0.7 ? 'text-success' : f.points >= f.weight * 0.4 ? 'text-warning' : 'text-danger'">
                  {{ f.points }}/{{ f.weight }}
                </span>
              </div>
              <div class="factor-bar"><div class="factor-fill" :style="{ width: (f.weight ? (f.points / f.weight) * 100 : 0) + '%' }"></div></div>
              <div class="text-xs text-tertiary" style="margin-top: 3px;">{{ f.detail }}</div>
            </div>
          </div>

          <!-- Alasan & rekomendasi -->
          <div class="assess-box reasons" v-if="assessData.reasons.length">
            <div class="text-sm font-semibold" style="margin-bottom: 6px;">⚠ Alasan / Risiko</div>
            <ul class="assess-list">
              <li v-for="(r, i) in assessData.reasons" :key="i">{{ r }}</li>
            </ul>
          </div>
          <div class="assess-box rec">
            <div class="text-sm font-semibold" style="margin-bottom: 6px;">💡 Rekomendasi Sistem</div>
            <p class="text-sm">{{ assessData.recommendation }}</p>
          </div>

          <!-- Snapshot prospek -->
          <div class="assess-box" v-if="assessProspek">
            <div class="text-sm font-semibold" style="margin-bottom: 6px;">🎯 Prospek Sumber ({{ assessProspek.id }})</div>
            <div class="text-sm">{{ assessProspek.name }}</div>
            <div class="text-xs text-tertiary" style="margin-top: 4px;">
              Tahap: {{ assessProspek.stage }} · Prioritas: {{ assessProspek.priority }} · Owner: {{ assessProspek.owner }}
              <span v-if="assessProspek.expected_closing_date"> · Target closing: {{ assessProspek.expected_closing_date }}</span>
            </div>
            <div v-if="assessProspek.competitor" class="text-xs text-warning" style="margin-top: 4px;">Kompetitor: {{ assessProspek.competitor }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAssessModal = false">Tutup</button>
        </div>
      </div>
    </div>

    <!-- Modal Tandai Kalah -->
    <div class="modal-overlay" v-if="showKalahModal" @click.self="showKalahModal = false" id="modal-kalah">
      <div class="modal" style="max-width: 440px;">
        <div class="modal-header">
          <span class="font-semibold">Tandai Kalah — {{ kalahTarget }}</span>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showKalahModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label class="input-label" for="input-kalah-reason">Alasan (Wajib) *</label>
            <textarea class="input" rows="3" id="input-kalah-reason" v-model="kalahReason"
              placeholder="Harga lebih tinggi dari kompetitor / klien menunda / dll..." style="height:auto;padding:10px;"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showKalahModal = false">Batal</button>
          <button class="btn btn-danger" @click="confirmKalah" :disabled="!kalahReason">Tandai Kalah</button>
        </div>
      </div>
    </div>

    <!-- Modal Buat Quotation Cost-Plus (#modal-new-qt) — Spesifikasi §6.1.2 -->
    <div class="modal-overlay" v-if="showNewQtModal" @click.self="showNewQtModal = false" id="modal-new-qt">
      <div class="modal" style="max-width: 920px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">📋 Buat Quotation — Estimasi Cost-Plus</span>
            <div class="text-xs text-tertiary">
              Harga = (material BOM template + jasa routing × tarif karyawan) × (1 + margin). Estimasi CRM hanya acuan validasi.
            </div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showNewQtModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- Header form -->
          <div class="qt-form-grid">
            <div class="input-group">
              <label class="input-label" for="input-qt-prospek">Sumber Prospek *</label>
              <select class="select" id="input-qt-prospek" v-model="newQt.prospekId" @change="onPickProspek">
                <option value="">Pilih prospek...</option>
                <option v-for="p in prospekList" :key="p.id" :value="p.id">
                  {{ p.id }} — {{ p.name }} ({{ formatCurrencyChain(p.value) }})
                </option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-qt-project">Nama Proyek *</label>
              <input class="input" id="input-qt-project" v-model="newQt.project" placeholder="Otomatis dari prospek" />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-qt-margin">Target Margin (%) *</label>
              <input class="input" type="number" id="input-qt-margin" v-model.number="newQt.margin" min="0" step="0.5" />
              <div v-if="newQt.margin < 18" class="text-xs text-danger" style="margin-top:3px;">Margin &lt; 18% — butuh approval Direksi</div>
            </div>
            <div class="input-group">
              <label class="input-label" for="input-qt-start">Asumsi Tanggal Mulai *</label>
              <input class="input" type="date" id="input-qt-start" v-model="newQt.startDate" />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-qt-valid">Masa Berlaku s/d *</label>
              <input class="input" type="date" id="input-qt-valid" v-model="newQt.validUntil" />
            </div>
            <div class="input-group">
              <label class="input-label" for="input-qt-payment">Term Pembayaran *</label>
              <input class="input" id="input-qt-payment" v-model="newQt.paymentTerms" />
            </div>
          </div>

          <!-- Estimasi CRM -->
          <div v-if="newQtProspek" class="qt-crm-box" :class="{ 'qt-crm-warn': newQtDeviationWarning }">
            <span class="text-sm">🎯 Estimasi CRM ({{ newQtProspek.id }}): <b>{{ formatCurrencyChain(newQtCrmValue) }}</b></span>
            <span class="text-sm" v-if="newQtDeviation !== null">
              · Deviasi harga cost-plus:
              <b :class="newQtDeviationWarning ? 'text-danger' : 'text-success'">
                {{ newQtDeviation > 0 ? '+' : '' }}{{ newQtDeviation.toFixed(1) }}%
              </b>
            </span>
            <div v-if="newQtDeviationWarning" class="text-xs text-warning" style="margin-top:4px;">
              ⚠ Deviasi melebihi ambang — tinjau ulang harga atau perbarui nilai prospek di CRM sebelum mengirim penawaran.
            </div>
          </div>

          <!-- Baris panel -->
          <div class="qt-lines-wrap">
            <table class="table qt-lines-table" id="qt-lines-table">
              <thead>
                <tr>
                  <th style="width:170px;">Tipe Panel</th>
                  <th style="width:64px;">Qty</th>
                  <th>Spesifikasi</th>
                  <th style="width:120px;">Material</th>
                  <th style="width:120px;">Jasa</th>
                  <th style="width:145px;">Harga Satuan</th>
                  <th style="width:130px;">Subtotal</th>
                  <th style="width:36px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, i) in newQt.lines" :key="i">
                  <td>
                    <select class="select select-sm" v-model="l.type">
                      <option value="">Pilih tipe...</option>
                      <option v-for="t in panelTypeOptions" :key="t.type" :value="t.type">{{ t.label }}</option>
                    </select>
                  </td>
                  <td><input class="input input-sm" type="number" min="1" v-model.number="l.qty" /></td>
                  <td><input class="input input-sm" v-model="l.spec" placeholder="ACB 3200A 65kA..." /></td>
                  <td class="text-sm text-secondary">
                    <template v-if="lineViews[i]">
                      {{ formatRp(lineViews[i]!.materialCost) }}
                      <div class="text-xs text-tertiary">{{ lineViews[i]!.manhours }} mh</div>
                    </template>
                  </td>
                  <td class="text-sm text-secondary">
                    <template v-if="lineViews[i]">{{ formatRp(lineViews[i]!.servicesCost) }}</template>
                  </td>
                  <td>
                    <template v-if="lineViews[i]">
                      <input class="input input-sm" type="number" :placeholder="formatRp(lineViews[i]!.suggested)"
                        :value="l.override_price ?? ''"
                        @input="l.override_price = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)" />
                      <div v-if="l.override_price != null && l.override_price > 0 && !l.override_reason"
                           class="text-xs text-danger" style="margin-top:2px;">Override: wajib alasan →</div>
                      <div v-else-if="l.override_price == null" class="text-xs text-tertiary" style="margin-top:2px;">cost-plus</div>
                    </template>
                  </td>
                  <td class="text-sm font-semibold">
                    <template v-if="lineViews[i]">{{ formatRp(lineViews[i]!.subtotal) }}</template>
                  </td>
                  <td>
                    <button class="btn btn-icon btn-secondary btn-sm" @click="removeQtLine(i)" title="Hapus baris">✕</button>
                  </td>
                </tr>
                <tr v-if="(lineViews ?? []).length === 0">
                  <td colspan="8" class="text-center text-tertiary text-sm" style="padding:16px;">Belum ada baris panel.</td>
                </tr>
              </tbody>
            </table>
            <!-- alasan override per baris -->
            <div v-for="(l, i) in newQt.lines" :key="'r'+i" class="qt-override-reason" v-show="l.override_price != null && l.override_price > 0">
              <label class="text-xs text-tertiary">Alasan override baris {{ i + 1 }} ({{ l.type || '—' }}) *</label>
              <input class="input input-sm" v-model="l.override_reason" placeholder="Diskon negosiasi klien / harga pasar..." />
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="qt-add-line" @click="addQtLine" style="margin-top:8px;">+ Tambah Baris Panel</button>

          <!-- Ringkasan estimasi -->
          <div class="qt-summary" id="qt-estimate-summary">
            <div class="qt-sum-item">
              <span class="text-xs text-tertiary">Total HPP</span>
              <span class="font-semibold">{{ formatRp(newQtTotals.totalHpp) }}</span>
              <span class="text-xs text-tertiary">mat {{ formatRp(newQtTotals.totalMaterial) }} + jasa {{ formatRp(newQtTotals.totalServices) }}</span>
            </div>
            <div class="qt-sum-item">
              <span class="text-xs text-tertiary">Nilai Penawaran</span>
              <span class="font-semibold text-accent">{{ formatRp(newQtTotals.totalValue) }}</span>
            </div>
            <div class="qt-sum-item">
              <span class="text-xs text-tertiary">Margin Efektif</span>
              <span class="font-semibold" :class="newQtTotals.marginPct < 18 ? 'text-danger' : 'text-success'">{{ newQtTotals.marginPct.toFixed(1) }}%</span>
            </div>
            <div class="qt-sum-item">
              <span class="text-xs text-tertiary">Estimasi Perakitan</span>
              <span class="font-semibold">{{ newQtTotals.estDays }} hari kerja</span>
              <span class="text-xs text-tertiary">{{ newQtTotals.totalManhours }} man-hours · s/d {{ newQtTotals.finish }}</span>
            </div>
          </div>

          <div v-for="(w, i) in newQtSkillWarnings" :key="'w'+i" class="alert alert-warning" style="margin-top:10px;font-size:12px;">
            ⚠ {{ w }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNewQtModal = false">Batal</button>
          <button class="btn btn-primary" id="qt-submit-new" @click="submitNewQt" :disabled="!newQtCanSubmit">
            📋 Buat Quotation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  quotations,
  canConvertToSO,
  ajukanQuotation,
  setujuiQuotation,
  kirimQuotation,
  tandaiDisetujuiKlien,
  tandaiKalah,
  revisiQuotation,
  konversiKeSOFromQuotation,
  formatCurrencyChain,
  statusBadgeClass,
  statusLabel,
  assessQuotation,
  prospekList,
  buatQuotation,
  estimateForQuotation,
  type Quotation,
  type QuotationAssessment,
} from '../../data/chainStore'
import { bomTemplates } from '../../data/bomTemplates'
import {
  estimateLine, roundPrice, formatRp, crmDeviationPct, isCrmDeviationWarning, skillWarningsFor,
} from '../../data/costEstimator'
import { todayISO, addWorkingDays } from '../../data/workforceStore'

const route = useRoute()
const router = useRouter()

const search = ref('')
const filterStatus = ref('')
const filterVerdict = ref('')
const showKalahModal = ref(false)
const kalahTarget = ref('')
const kalahReason = ref('')
let pendingKalahId = ''

// ─── Buat Quotation Cost-Plus (Spesifikasi §6.1.2) ───────────────────────────

const panelTypeOptions = bomTemplates.map(t => ({ type: t.panelType, label: t.label }))

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const plusDaysISO = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return localISO(d)
}

interface NewQtLine {
  type: string
  qty: number
  spec: string
  /** null = harga cost-plus otomatis; terisi = override (wajib alasan) */
  override_price: number | null
  override_reason: string
}

const showNewQtModal = ref(false)
const newQt = ref({
  prospekId: '',
  project: '',
  margin: 20,
  validUntil: plusDaysISO(30),
  paymentTerms: '30% DP, 60% FAT, 10% BAST',
  startDate: todayISO(),
  lines: [] as NewQtLine[],
})

const newQtProspek = computed(() => prospekList.value.find(p => p.id === newQt.value.prospekId))

const lineViews = computed(() => newQt.value.lines.map(l => {
  if (!l.type || !(l.qty > 0)) return null
  const le = estimateLine({ type: l.type, qty: l.qty, spec: l.spec }, newQt.value.startDate)
  const suggested = roundPrice((le.hpp / le.qty) * (1 + newQt.value.margin / 100))
  const overridden = l.override_price != null && l.override_price > 0 && !!l.override_reason
  const unit = overridden ? (l.override_price as number) : suggested
  return {
    ...le,
    suggested,
    unit,
    subtotal: unit * le.qty,
    overridden,
    isOverrideValid: l.override_price == null || (l.override_price > 0 && !!l.override_reason),
  }
}))

const validLineViews = computed(() => lineViews.value.filter(v => v !== null) as NonNullable<(typeof lineViews.value)[number]>[])

const newQtTotals = computed(() => {
  const lines = validLineViews.value
  const totalMaterial = lines.reduce((s, l) => s + l.materialCost, 0)
  const totalServices = lines.reduce((s, l) => s + l.servicesCost, 0)
  const totalHpp = lines.reduce((s, l) => s + l.hpp, 0)
  const totalValue = lines.reduce((s, l) => s + l.subtotal, 0)
  const totalManhours = lines.reduce((s, l) => s + l.manhours, 0)
  const estDays = lines.reduce((s, l) => s + l.estDays, 0)
  const finish = lines.length ? addWorkingDays(newQt.value.startDate, estDays) : ''
  const marginPct = totalValue > 0 ? ((totalValue - totalHpp) / totalValue) * 100 : 0
  return { totalMaterial, totalServices, totalHpp, totalValue, totalManhours, estDays, finish, marginPct }
})

const newQtCrmValue = computed(() => newQtProspek.value?.value ?? 0)
const newQtDeviation = computed(() => crmDeviationPct(newQtTotals.value.totalValue, newQtCrmValue.value))
const newQtDeviationWarning = computed(() => isCrmDeviationWarning(newQtDeviation.value))
const newQtSkillWarnings = computed(() => {
  const warns: string[] = []
  for (const l of newQt.value.lines) {
    if (!l.type) continue
    for (const w of skillWarningsFor(l.type, newQt.value.startDate)) {
      if (!warns.includes(w)) warns.push(w)
    }
  }
  return warns
})
const newQtCanSubmit = computed(() =>
  !!newQt.value.prospekId &&
  validLineViews.value.length > 0 &&
  validLineViews.value.every(l => l.isOverrideValid))

const addQtLine = () => {
  newQt.value.lines.push({ type: '', qty: 1, spec: '', override_price: null, override_reason: '' })
}
const removeQtLine = (i: number) => {
  newQt.value.lines.splice(i, 1)
}

const applyProspekToForm = (id: string) => {
  const p = prospekList.value.find(x => x.id === id)
  if (p) newQt.value.project = p.name
}

const onPickProspek = () => applyProspekToForm(newQt.value.prospekId)

const openNewQt = (prospekId?: string) => {
  newQt.value = {
    prospekId: prospekId ?? '',
    project: '',
    margin: 20,
    validUntil: plusDaysISO(30),
    paymentTerms: '30% DP, 60% FAT, 10% BAST',
    startDate: todayISO(),
    lines: [{ type: 'LVMDP-Incoming', qty: 1, spec: '', override_price: null, override_reason: '' }],
  }
  if (prospekId) applyProspekToForm(prospekId)
  showNewQtModal.value = true
}

const submitNewQt = () => {
  if (!newQtCanSubmit.value) return
  const qt = buatQuotation(newQt.value.prospekId, {
    project: newQt.value.project || undefined,
    margin: newQt.value.margin,
    valid_until: newQt.value.validUntil,
    payment_terms_text: newQt.value.paymentTerms,
    est_start_date: newQt.value.startDate,
    panel_lines: newQt.value.lines
      .filter(l => l.type && l.qty > 0)
      .map(l => ({
        type: l.type,
        qty: l.qty,
        spec: l.spec,
        unit_price: l.override_price ?? 0,
        price_overridden: l.override_price != null && l.override_price > 0,
        override_reason: l.override_reason || undefined,
      })),
  })
  if (qt) {
    showNewQtModal.value = false
    if (route.query.prospek) router.replace({ query: {} })
  }
}

// Prefill dari CRM (?prospek=LD-…)
onMounted(() => {
  const p = route.query.prospek
  if (p) openNewQt(String(p))
})

// ─── Penilaian kelayakan (Deal Assessment) ───────────────────────────────────
const assessmentCache = new Map<string, QuotationAssessment>()
const assessment = (qt: Quotation): QuotationAssessment => {
  const hit = assessmentCache.get(qt.id)
  if (hit) return hit
  const res = assessQuotation(qt)
  assessmentCache.set(qt.id, res)
  return res
}
const verdictIcon = (qt: Quotation) => {
  const v = assessment(qt).verdict
  return v === 'LAYAK' ? '✓' : v === 'WASPADA' ? '⚠' : '✗'
}
const verdictClass = (qt: Quotation) => {
  const v = assessment(qt).verdict
  return v === 'LAYAK' ? 'verdict-layak' : v === 'WASPADA' ? 'verdict-waspada' : 'verdict-gagal'
}
const verdictLabel = (v: string) => v === 'LAYAK' ? 'LAYAK LANJUT' : v === 'WASPADA' ? 'WASPADA' : 'TIDAK DISARANKAN'
const verdictSub = (v: string) => v === 'LAYAK'
  ? 'Profil deal sehat — aman lanjut ke tahap berikutnya.'
  : v === 'WASPADA'
    ? 'Ada poin yang perlu diperbaiki sebelum dikirim ke klien.'
    : 'Risiko tinggi — jangan lanjut tanpa revisi struktural.'

const showAssessModal = ref(false)
const assessTargetId = ref('')
const assessTarget = computed(() => allQuotations.value.find(q => q.id === assessTargetId.value))
const assessData = computed(() => assessTarget.value ? assessment(assessTarget.value) : null)
const assessCost = computed(() => assessTarget.value ? estimateForQuotation(assessTarget.value) : null)
const assessProspek = computed(() => {
  const t = assessTarget.value
  if (!t) return null
  return prospekList.value.find(p => p.id === t.source_id) || null
})
const openAssessment = (id: string) => {
  assessTargetId.value = id
  showAssessModal.value = true
}

const allQuotations = quotations

const filteredQuotations = computed(() => allQuotations.value.filter(q => {
  const s = search.value.toLowerCase()
  const matchS = !s || q.doc_no.toLowerCase().includes(s) || q.project.toLowerCase().includes(s) || q.customer.toLowerCase().includes(s)
  const matchStatus = !filterStatus.value || q.status === filterStatus.value
  const matchVerdict = !filterVerdict.value || assessment(q).verdict === filterVerdict.value
  return matchS && matchStatus && matchVerdict
}))

const pendingCount = computed(() => allQuotations.value.filter(q => q.status === 'MENUNGGU_APPROVAL').length)
const approvedCount = computed(() => allQuotations.value.filter(q => q.status === 'DISETUJUI_KLIEN').length)
const totalPipelineValue = computed(() => allQuotations.value
  .filter(q => ['DRAFT','MENUNGGU_APPROVAL','SIAP_KIRIM','TERKIRIM','DISETUJUI_KLIEN'].includes(q.status))
  .reduce((a, q) => a + q.value, 0))

const isExpired = (date: string) => date ? new Date(date) < new Date() : false

const doAjukan = (id: string) => ajukanQuotation(id)
const doSetujui = (id: string) => setujuiQuotation(id)
const doKirim = (id: string) => kirimQuotation(id)
const doTandaiDisetujui = (id: string) => tandaiDisetujuiKlien(id)
const doTandaiKalah = (id: string) => {
  const qt = allQuotations.value.find(q => q.id === id)
  kalahTarget.value = qt?.doc_no || id
  pendingKalahId = id
  kalahReason.value = ''
  showKalahModal.value = true
}
const confirmKalah = () => {
  if (!kalahReason.value) return
  tandaiKalah(pendingKalahId, kalahReason.value)
  showKalahModal.value = false
}
const doRevisi = (id: string) => revisiQuotation(id)
const doKonversiKeSO = (id: string) => {
  const so = konversiKeSOFromQuotation(id)
  if (so) {
    // Navigate to SO detail
    router.push('/sales/orders')
  }
}
</script>

<style scoped>
.row-locked { opacity: 0.7; }
.row-actionable { border-left: 3px solid var(--success-500); }

.lock-icon {
  font-size: 11px;
  display: inline;
  margin-left: 4px;
}

.action-gate-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gate-reason {
  font-size: 10px;
  color: var(--text-danger);
  max-width: 180px;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger-ghost {
  background: rgba(239,68,68,0.1);
  color: var(--text-danger);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-danger-ghost:hover { background: rgba(239,68,68,0.2); }

/* ─── Kelayakan deal ─────────────────────────────────────────────────────── */
.verdict-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: filter var(--transition-fast);
}
.verdict-btn:hover { filter: brightness(1.15); }
.verdict-layak { background: rgba(16,185,129,0.15); color: var(--text-success); border-color: rgba(16,185,129,0.3); }
.verdict-waspada { background: rgba(245,158,11,0.15); color: var(--text-warning); border-color: rgba(245,158,11,0.3); }
.verdict-gagal { background: rgba(239,68,68,0.15); color: var(--text-danger); border-color: rgba(239,68,68,0.3); }

.assess-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  border: 1px solid var(--border-subtle);
}
.hero-LAYAK { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
.hero-WASPADA { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); }
.hero-TIDAK_DISARANKAN { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
.assess-score { font-size: 40px; font-weight: 800; line-height: 1; }
.hero-LAYAK .assess-score { color: var(--text-success); }
.hero-WASPADA .assess-score { color: var(--text-warning); }
.hero-TIDAK_DISARANKAN .assess-score { color: var(--text-danger); }
.assess-verdict { font-size: 15px; font-weight: 700; margin-bottom: 2px; }

.assess-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.assess-kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.assess-factors { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.factor-bar { height: 6px; background: var(--skeleton-shine); border-radius: 3px; overflow: hidden; }
.factor-fill { height: 100%; background: var(--primary-400, #6366f1); border-radius: 3px; transition: width var(--transition-base); }

.assess-box {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}
.assess-box.reasons { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.2); }
.assess-box.rec { background: rgba(59,85,168,0.08); border-color: rgba(59,85,168,0.25); }
.assess-list { margin: 0; padding-left: 18px; }
.assess-list li { font-size: 13px; margin-bottom: 4px; }

.btn-success-ghost {
  background: rgba(16,185,129,0.12);
  color: var(--text-success);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-success-ghost:hover { background: rgba(16,185,129,0.22); }

/* ─── Modal Buat Quotation (cost-plus) ───────────────────────────────────── */
.qt-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.qt-crm-box {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(59,130,246,0.25);
  background: rgba(59,130,246,0.06);
  margin-bottom: 14px;
}
.qt-crm-warn {
  border-color: rgba(245,158,11,0.35);
  background: rgba(245,158,11,0.08);
}

.qt-lines-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
.qt-lines-table { width: 100%; font-size: 12.5px; }
.qt-lines-table th, .qt-lines-table td { padding: 6px 8px; vertical-align: middle; }

.qt-override-reason {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 10px;
  border-top: 1px dashed var(--border-subtle);
}

.qt-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}
.qt-sum-item { display: flex; flex-direction: column; gap: 2px; }

.input-sm { padding: 4px 8px; font-size: 12px; }
.select-sm { padding: 4px 8px; font-size: 12px; }
</style>
