<template>
  <div class="modal-overlay" @click.self="emit('close')" id="modal-bom-builder">
    <div class="modal bom-modal" role="dialog" aria-modal="true">

      <!-- Header -->
      <div class="modal-header bom-header">
        <div class="min-w-0">
          <div class="chain-crumb" id="bom-breadcrumb">
            <span class="crumb">{{ qt?.doc_no || 'QT-…' }}</span>
            <span class="sep">›</span>
            <span class="crumb">{{ prj?.so_id }}</span>
            <span class="sep">›</span>
            <span class="crumb">{{ prj?.id }}</span>
            <span class="sep">›</span>
            <span class="crumb">{{ panel?.panel_no }}</span>
            <span class="sep">›</span>
            <span class="crumb current">{{ bom?.id }} {{ bom?.rev }}</span>
          </div>
          <div class="flex items-center gap-2" style="margin-top:4px;">
            <span class="font-semibold text-lg truncate">Bill of Materials — {{ panel?.name }}</span>
            <span v-if="bom" :class="['badge', statusBadgeClass(bom.status)]">{{ statusLabel(bom.status) }}</span>
            <span class="badge badge-neutral">{{ bom?.bom_type === 'ESTIMASI' ? 'Estimasi' : 'Produksi' }}</span>
          </div>
        </div>
        <button class="btn btn-icon btn-secondary btn-sm" @click="emit('close')" id="btn-close-bom">✕</button>
      </div>

      <div class="modal-body bom-body">

        <!-- Banner terkunci -->
        <div v-if="bom && !editable" class="alert alert-warning" id="bom-lock-banner">
          <span>🔒</span>
          <div>
            <strong>Dokumen ini terkunci.</strong>
            {{ lockReason }}
            <span v-if="bom.status === 'APPROVED'" class="text-tertiary"> Perubahan hanya lewat Buat Revisi (Rev berikutnya).</span>
          </div>
        </div>

        <!-- Banner validasi -->
        <div v-if="editable && errors.length > 0" class="alert alert-danger" id="bom-validation-banner">
          <span>⚠️</span>
          <div>
            <strong>{{ errors.length }} hal perlu diperbaiki sebelum diajukan review:</strong>
            <ul class="error-list">
              <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
            </ul>
          </div>
        </div>

        <!-- Info dokumen -->
        <div class="bom-meta" id="bom-meta">
          <div class="meta-cell">
            <span class="meta-label">Proyek</span>
            <span class="meta-value mono" id="input-bom-project">{{ prj?.id }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-label">Panel</span>
            <span class="meta-value mono" id="input-bom-panel">{{ panel?.id }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-label">Tipe BOM</span>
            <span class="meta-value" id="input-bom-type">{{ bom?.bom_type === 'ESTIMASI' ? 'Estimasi' : 'Produksi' }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-label">Versi</span>
            <span class="meta-value mono" id="input-bom-version">v{{ bom?.version }} · {{ bom?.rev }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-label">Dibuat</span>
            <span class="meta-value">{{ bom?.created_by }} · {{ fmtDate(bom?.created_at) }}</span>
          </div>
          <div class="meta-cell">
            <span class="meta-label">Disetujui</span>
            <span class="meta-value">{{ bom?.approved_by ? `${bom.approved_by} · ${fmtDate(bom.approved_at)}` : '—' }}</span>
          </div>
        </div>

        <div v-if="bom?.change_reason" class="change-reason" id="bom-change-reason">
          📌 Alasan: <em>{{ bom.change_reason }}</em>
        </div>

        <!-- Ringkasan KPI -->
        <div class="bom-kpis" id="bom-kpis">
          <div class="kpi">
            <span class="kpi-value">{{ bom?.items.length || 0 }}</span>
            <span class="kpi-label">Baris Item</span>
          </div>
          <div class="kpi">
            <span class="kpi-value">{{ summary.totalQty.toLocaleString('id-ID') }}</span>
            <span class="kpi-label">Total Qty</span>
          </div>
          <div class="kpi">
            <span class="kpi-value text-accent">{{ formatCurrencyChain(summary.value) }}</span>
            <span class="kpi-label">Estimasi Material</span>
          </div>
          <div class="kpi">
            <span class="kpi-value" :class="summary.longLead > 0 ? 'text-danger' : ''">{{ summary.longLead }}</span>
            <span class="kpi-label">Long-Lead</span>
          </div>
          <div class="kpi">
            <span class="kpi-value" :class="summary.shortfall > 0 ? 'text-warning' : 'text-success'">{{ summary.shortfall }}</span>
            <span class="kpi-label">Butuh Pengadaan</span>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="bom-toolbar" id="bom-toolbar">
          <div class="input-with-icon" style="width: 260px;">
            <span class="input-icon">🔍</span>
            <input class="input" placeholder="Cari baris, kode, designator..." v-model="rowSearch" id="search-bom-rows" />
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" :disabled="!editable" :id="editable ? 'bom-item-add' : 'bom-item-add-disabled'"
                    @click="openAddLine" data-tooltip="Tambah baris dari Item Master">＋ Tambah Baris</button>
            <button class="btn btn-secondary btn-sm" :disabled="!editable" id="bom-copy-template"
                    @click="openCopy('template')">📋 Salin Template</button>
            <button class="btn btn-secondary btn-sm" :disabled="!editable" id="bom-copy-other"
                    @click="openCopy('fromBom')">📄 Salin BOM Lain</button>
            <button class="btn btn-secondary btn-sm" :disabled="!editable" id="btn-import-bom"
                    @click="showImport = true">📥 Import CSV</button>
          </div>
        </div>

        <!-- Grid item -->
        <div class="table-container bom-grid" id="bom-item-grid">
          <table class="table" id="bom-items-table">
            <thead>
              <tr>
                <th style="width:34px;">#</th>
                <th style="min-width:250px;">Kode & Item (Item Master)</th>
                <th style="width:96px;">Qty</th>
                <th style="width:64px;">UoM</th>
                <th style="width:130px;">Designator</th>
                <th style="width:78px;">Stok</th>
                <th style="width:88px;">Bersih</th>
                <th style="width:120px;">Harga Satuan</th>
                <th style="width:130px;">Subtotal</th>
                <th style="width:56px;">LL</th>
                <th style="width:70px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, idx) in filteredLines" :key="line.id" :id="`bom-row-${line.id}`"
                  :class="{ 'row-invalid': !!rowIssue(line) }">
                <td class="text-tertiary text-xs mono">{{ idx + 1 }}</td>
                <td>
                  <button v-if="editable" class="item-cell-btn" :id="`bom-item-select-${line.id}`"
                          @click="openEditLine(line)" :title="'Ganti item — ' + line.item_code">
                    <span class="mono text-xs text-accent">{{ line.item_code }}</span>
                    <span class="item-name">{{ line.item_name }}</span>
                  </button>
                  <div v-else>
                    <div class="mono text-xs text-accent">{{ line.item_code }}</div>
                    <div class="item-name">{{ line.item_name }}</div>
                  </div>
                  <input v-if="editable" class="input input-inline" :value="line.remarks"
                         placeholder="Catatan spesifikasi / alternatif…" :id="`bom-item-remarks-${line.id}`"
                         @focus="remember(line)"
                         @change="patchLine(line, { remarks: val($event) })" />
                  <div v-else-if="line.remarks" class="text-xs text-tertiary">{{ line.remarks }}</div>
                  <div v-if="rowIssue(line)" class="row-issue">⚠ {{ rowIssue(line) }}</div>
                </td>
                <td>
                  <input v-if="editable" type="number" min="0.01" step="0.01" class="input input-inline"
                         :value="line.required_qty" :id="`bom-item-qty-${line.id}`"
                         @focus="remember(line)"
                         @change="patchLine(line, { required_qty: num($event) })" />
                  <span v-else class="font-semibold">{{ line.required_qty }}</span>
                </td>
                <td><span class="badge badge-neutral">{{ line.uom }}</span></td>
                <td>
                  <input v-if="editable" class="input input-inline" :value="line.designator" placeholder="Q1, KM1…"
                         :id="`bom-item-tag-${line.id}`" @focus="remember(line)"
                         @change="patchLine(line, { designator: val($event) })" />
                  <span v-else class="mono text-xs">{{ line.designator || '—' }}</span>
                </td>
                <td class="text-sm" :class="stockClass(line)">{{ stockOf(line).toLocaleString('id-ID') }}</td>
                <td class="text-sm font-semibold" :class="netClass(line)">{{ netOf(line).toLocaleString('id-ID') }}</td>
                <td class="text-sm text-secondary">{{ formatCurrencyChain(line.unit_price) }}</td>
                <td class="font-semibold">{{ formatCurrencyChain(line.unit_price * line.required_qty) }}</td>
                <td>
                  <input v-if="editable" type="checkbox" :checked="line.is_long_lead"
                         :id="`bom-item-longlead-${line.id}`" @focus="remember(line)"
                         @change="patchLine(line, { is_long_lead: checked($event) })"
                         data-tooltip="Long-lead: PO cepat ke Purchasing" />
                  <span v-else-if="line.is_long_lead" class="badge badge-danger">LL</span>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button v-if="editable" class="btn btn-icon btn-secondary btn-sm" :id="`bom-edit-${line.id}`"
                            @click="openEditLine(line)" data-tooltip="Ubah baris">✏️</button>
                    <button v-if="editable" class="btn btn-icon btn-secondary btn-sm" :id="`bom-del-${line.id}`"
                            @click="deleteLine(line)" data-tooltip="Hapus baris">🗑️</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredLines.length === 0">
                <td colspan="11">
                  <div class="empty-state" style="padding: 28px;">
                    <div class="empty-state-icon">🧱</div>
                    <div class="empty-state-title">{{ bom?.items.length ? 'Tidak ada baris cocok dengan pencarian' : 'Belum ada item pada BOM ini' }}</div>
                    <div class="empty-state-desc">
                      {{ bom?.items.length ? 'Ubah kata kunci pencarian.' : 'Tambahkan baris dari Item Master, salin dari template panel, atau impor CSV.' }}
                    </div>
                    <button v-if="editable && !bom?.items.length" class="btn btn-primary btn-sm" style="margin-top:12px;"
                            @click="openAddLine" id="bom-empty-add">＋ Tambah Baris Pertama</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MRP ringkas -->
        <details class="mrp-box" id="bom-mrp">
          <summary>📊 Kebutuhan Material (MRP) — kebutuhan bruto vs stok gudang</summary>
          <div class="table-container" style="margin-top:10px; max-height:220px;">
            <table class="table" id="bom-mrp-table">
              <thead>
                <tr><th>Kode</th><th>Item</th><th>Kebutuhan Bruto</th><th>Stok</th><th>Kebutuhan Bersih</th><th>Long-Lead</th></tr>
              </thead>
              <tbody>
                <tr v-for="l in mrp" :key="l.item_id">
                  <td class="mono text-xs text-accent">{{ l.code }}</td>
                  <td class="text-sm">{{ l.name }}</td>
                  <td class="font-semibold">{{ l.gross_qty.toLocaleString('id-ID') }} {{ l.uom }}</td>
                  <td class="text-secondary">{{ l.on_hand.toLocaleString('id-ID') }}</td>
                  <td class="font-semibold" :class="l.net_qty > 0 ? 'text-warning' : 'text-success'">
                    {{ l.net_qty.toLocaleString('id-ID') }} {{ l.uom }}
                  </td>
                  <td><span v-if="l.long_lead" class="badge badge-danger">Long-Lead</span><span v-else class="text-tertiary text-xs">—</span></td>
                </tr>
                <tr v-if="mrp.length === 0">
                  <td colspan="6" class="text-tertiary text-sm" style="text-align:center; padding:16px;">Belum ada baris untuk dihitung.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <!-- Log status -->
        <details class="mrp-box" id="bom-log">
          <summary>🕒 Timeline status BOM ini</summary>
          <div class="log-list">
            <div v-for="log in bomLogs" :key="log.id" class="log-line">
              <span class="mono text-xs">{{ log.at }}</span>
              <span class="badge badge-neutral" style="font-size:10px;">{{ log.from_status || '—' }}</span>
              <span class="text-tertiary">→</span>
              <span class="badge badge-primary" style="font-size:10px;">{{ log.to_status }}</span>
              <span class="text-sm">{{ log.action }}</span>
              <span class="text-xs text-tertiary">{{ log.by_user }}</span>
              <span v-if="log.reason" class="text-xs text-warning">({{ log.reason }})</span>
            </div>
            <div v-if="bomLogs.length === 0" class="text-xs text-tertiary" style="padding:8px 0;">Belum ada log untuk BOM ini.</div>
          </div>
        </details>
      </div>

      <!-- Footer aksi -->
      <div class="modal-footer bom-footer">
        <div class="text-xs text-tertiary" id="bom-autosave-note">
          <template v-if="editable">Perubahan baris tersimpan otomatis selama status <strong>Draft</strong>.</template>
          <template v-else>Status <strong>{{ statusLabel(bom?.status || '') }}</strong> — baris hanya-baca.</template>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" @click="emit('close')">Tutup</button>

          <template v-if="editable">
            <button class="btn btn-secondary btn-sm" :disabled="bom?.items.length === 0" id="bom-btn-ajukan"
                    :class="{ 'btn-disabled': errors.length > 0 }"
                    :title="errors.length ? errors[0] : ''" @click="ajukan">
              📋 Ajukan Review
            </button>
          </template>

          <template v-else-if="bom?.status === 'IN_REVIEW'">
            <button class="btn btn-secondary btn-sm" id="bom-btn-kembalikan" @click="openReason('return')">
              ↩ Kembalikan (Draft)
            </button>
            <button class="btn btn-primary btn-sm" id="bom-btn-setujui" @click="setujui">
              ✓ Setujui BOM
            </button>
          </template>

          <template v-else-if="bom?.status === 'APPROVED'">
            <button class="btn btn-secondary btn-sm" id="bom-btn-revisi" @click="openReason('revise')">
              🔁 Buat Revisi ({{ nextRev }})
            </button>
          </template>

          <template v-else-if="bom?.status === 'SUPERSEDED'">
            <span class="text-xs text-tertiary">Digantikan oleh {{ bom.superseded_by_id }}</span>
          </template>
        </div>
      </div>

      <!-- ═══ Modal: Tambah / Ubah baris ═══ -->
      <div class="modal-overlay nested" v-if="showLine" @click.self="showLine = false" id="modal-bom-line">
        <div class="modal" style="max-width: 620px;">
          <div class="modal-header">
            <span class="font-semibold">{{ lineForm.lineId ? 'Ubah Baris Item' : 'Tambah Baris Item' }}</span>
            <button class="btn btn-icon btn-secondary btn-sm" @click="showLine = false">✕</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;gap:14px;">
              <div class="input-group picker-group">
                <label class="input-label">Pilih Item (Item Master) *</label>
                <input class="input" id="bom-item-select" autocomplete="off"
                       placeholder="Ketik kode / nama / merek…"
                       v-model="lineForm.query"
                       @focus="pickerOpen = true" @blur="closePicker" />
                <div class="picker-menu" v-if="pickerOpen && pickerResults.length > 0">
                  <button v-for="it in pickerResults" :key="it.id" class="picker-option"
                          :class="{ selected: it.id === lineForm.item_id }"
                          @mousedown.prevent="pickItem(it)">
                    <div class="flex justify-between items-center">
                      <span class="mono text-xs text-accent">{{ it.code }}</span>
                      <span class="badge badge-neutral" style="font-size:10px;">{{ it.uom }}</span>
                    </div>
                    <div class="text-sm font-medium">{{ it.name }}</div>
                    <div class="text-xs text-tertiary">
                      {{ it.brand }} · stok {{ it.stock.toLocaleString('id-ID') }} ·
                      {{ formatCurrencyChain(it.unit_price) }}
                      <span v-if="it.lead_time_days >= 45" class="text-danger">· lead {{ it.lead_time_days }} hari</span>
                    </div>
                  </button>
                </div>
                <div class="text-xs text-tertiary" v-if="pickerOpen && pickerResults.length === 0">
                  Tidak ada item cocok. Tambahkan dulu di menu <strong>Master Data → Item Master</strong>.
                </div>
              </div>

              <div v-if="pickedItem" class="picked-item" id="bom-picked-item">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="mono text-xs text-accent">{{ pickedItem.code }}</div>
                    <div class="font-medium text-sm">{{ pickedItem.name }}</div>
                  </div>
                  <span class="badge" :class="pickedItem.status === 'Aktif' ? 'badge-success' : 'badge-danger'">
                    {{ pickedItem.status }}
                  </span>
                </div>
                <div class="text-xs text-tertiary" style="margin-top:6px;">
                  Kategori {{ pickedItem.category }} · UoM {{ pickedItem.uom }} · stok
                  {{ pickedItem.stock.toLocaleString('id-ID') }} · harga {{ formatCurrencyChain(pickedItem.unit_price) }}
                  · lead {{ pickedItem.lead_time_days }} hari
                </div>
              </div>

              <div class="grid-2" style="gap:12px;">
                <div class="input-group">
                  <label class="input-label">Qty Kebutuhan *</label>
                  <input type="number" min="0.01" step="0.01" class="input" id="bom-item-qty"
                         v-model.number="lineForm.required_qty" />
                </div>
                <div class="input-group">
                  <label class="input-label">Designator (label gambar)</label>
                  <input type="text" class="input mono" id="bom-item-tag" placeholder="Q1, KM1, Busbar R-S-T"
                         v-model="lineForm.designator" />
                </div>
                <div class="input-group" style="grid-column:1/-1;">
                  <label class="input-label">Catatan spesifikasi / alternatif</label>
                  <input type="text" class="input" v-model="lineForm.remarks" placeholder="Mis. alternatif merk ABB" />
                </div>
              </div>

              <label class="check-line" for="bom-item-longlead">
                <input type="checkbox" id="bom-item-longlead" v-model="lineForm.is_long_lead" />
                <span>
                  <strong>Long-lead item</strong> — penanda kebutuhan PO cepat ke Purchasing (§8.1)
                  <span v-if="pickedItem && pickedItem.lead_time_days >= 45" class="text-danger">
                    (lead time {{ pickedItem.lead_time_days }} hari — kandidat otomatis)
                  </span>
                </span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <span class="text-xs text-tertiary">Baris terhubung ke Item Master — kode bebas tidak diizinkan.</span>
            <div class="flex gap-2">
              <button class="btn btn-secondary" @click="showLine = false">Batal</button>
              <button class="btn btn-primary" :disabled="!canSubmitLine" id="bom-btn-save-line" @click="submitLine">
                {{ lineForm.lineId ? 'Simpan Baris' : 'Tambahkan' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Modal: Salin template / BOM lain ═══ -->
      <div class="modal-overlay nested" v-if="showCopy" @click.self="showCopy = false" id="modal-bom-copy">
        <div class="modal" style="max-width: 640px;">
          <div class="modal-header">
            <span class="font-semibold">{{ copyMode === 'template' ? 'Salin dari Template Panel' : 'Salin dari BOM Lain' }}</span>
            <button class="btn btn-icon btn-secondary btn-sm" @click="showCopy = false">✕</button>
          </div>
          <div class="modal-body">
            <template v-if="copyMode === 'template'">
              <p class="text-sm text-secondary" style="margin-bottom:12px;">
                Template <strong>{{ templateLabel }}</strong> untuk tipe panel <strong>{{ bom?.panel_type }}</strong>.
                Aksi ini <em>hanya mengisi baris</em> — tidak membuat BOM baru (§7.1).
              </p>
              <div class="radio-stack">
                <label class="check-line">
                  <input type="radio" value="replace" v-model="copyModeOption" />
                  <span><strong>Ganti semua baris</strong> dengan isi template ({{ templateCount }} baris)</span>
                </label>
                <label class="check-line">
                  <input type="radio" value="merge" v-model="copyModeOption" />
                  <span><strong>Tambah baris yang belum ada</strong> saja (pertahankan baris manual)</span>
                </label>
              </div>
            </template>
            <template v-else>
              <div class="input-group">
                <label class="input-label">Pilih BOM sumber (proyek lain / revisi lain)</label>
                <select class="select" v-model="copySourceId" id="bom-copy-source">
                  <option value="">— Pilih BOM —</option>
                  <option v-for="b in copyCandidates" :key="b.id" :value="b.id">
                    {{ b.id }} · {{ b.rev }} — {{ b.panel_name }} ({{ b.items.length }} baris)
                  </option>
                </select>
              </div>
              <p class="text-xs text-tertiary" style="margin-top:10px;">
                Baris sumber disalin beserta qty, designator, dan penanda long-lead. Item yang sudah ada dengan
                designator sama akan dilewati.
              </p>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCopy = false">Batal</button>
            <button class="btn btn-primary" :disabled="copyMode === 'fromBom' && !copySourceId" id="bom-btn-copy-confirm"
                    @click="confirmCopy">
              Salin Sekarang
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ Modal: Import CSV ═══ -->
      <div class="modal-overlay nested" v-if="showImport" @click.self="showImport = false" id="modal-import-bom">
        <div class="modal" style="max-width: 680px;">
          <div class="modal-header">
            <span class="font-semibold">Import Baris BOM (CSV / TSV)</span>
            <button class="btn btn-icon btn-secondary btn-sm" @click="showImport = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info" style="margin-bottom:12px;">
              <span>ℹ️</span>
              <div>
                Format per baris: <code class="mono">kode_item; qty; designator; long_lead</code><br />
                Contoh: <code class="mono">CB-MCB-1P-16A; 12; MCB-C1; ya</code><br />
                Kode harus terdaftar di <strong>Item Master</strong>. Baris header opsional.
              </div>
            </div>
            <textarea class="input" rows="8" id="bom-import-text" v-model="importText"
                      placeholder="kode_item; qty; designator; long_lead&#10;CB-MCB-1P-16A; 12; MCB-C1; ya&#10;TRM-BLOCK-UK5N; 40;"
                      style="height:auto;padding:10px;font-family:var(--font-mono);font-size:12px;"></textarea>
            <div v-if="importResult" style="margin-top:10px;">
              <div class="text-sm" :class="importResult.added ? 'text-success' : 'text-danger'">
                {{ importResult.added }} baris berhasil ditambahkan.
              </div>
              <ul class="error-list" v-if="importResult.errors.length">
                <li v-for="(e, i) in importResult.errors" :key="i">{{ e }}</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showImport = false">Tutup</button>
            <button class="btn btn-primary" :disabled="!importText.trim() || !editable" id="bom-btn-import-run"
                    @click="runImport">Validasi &amp; Impor</button>
          </div>
        </div>
      </div>

      <!-- ═══ Modal: Alasan (kembalikan / revisi) ═══ -->
      <div class="modal-overlay nested" v-if="showReason" @click.self="showReason = false" id="modal-bom-reason">
        <div class="modal" style="max-width: 520px;">
          <div class="modal-header">
            <span class="font-semibold">{{ reasonMode === 'return' ? 'Kembalikan BOM ke Draft' : `Buat Revisi ${nextRev}` }}</span>
            <button class="btn btn-icon btn-secondary btn-sm" @click="showReason = false">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-secondary" style="margin-bottom:12px;">
              {{ reasonMode === 'return'
                ? 'BOM dikembalikan ke engineer untuk diperbaiki. Alasan wajib dicatat di status_log.'
                : `Revisi ${nextRev} disalin dari ${bom?.rev} (baris, qty, designator). BOM ${bom?.rev} tetap berlaku sampai revisi baru disetujui.` }}
            </p>
            <div class="input-group">
              <label class="input-label">Alasan *</label>
              <textarea class="input" rows="3" v-model="reasonText" id="bom-reason-input"
                        placeholder="Mis. qty busbar kurang, tambah feeder MCC-05…"
                        style="height:auto;padding:10px;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showReason = false">Batal</button>
            <button class="btn btn-primary" :disabled="!reasonText.trim()" id="bom-btn-reason-confirm"
                    @click="confirmReason">
              {{ reasonMode === 'return' ? 'Kembalikan' : 'Buat Revisi' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from '../data/toastStore'
import { getItemById, searchItems, type ItemMaster } from '../data/itemStore'
import { getTemplateForPanelType, fallbackTemplate } from '../data/bomTemplates'
import {
  proyekList, salesOrders, quotations, statusLog, bomHeaders,
  latestBom, isBomEditable, validateBom, computeMRP, createBomForPanel,
  addBomItem, updateBomItem, removeBomItem, salinTemplateKeBom, salinBomLain, importBomItems,
  ajukanReviewBOM, setujuiBOM, kembalikanBOM, revisiBOM,
  formatCurrencyChain, statusBadgeClass, statusLabel,
  type BomItem,
} from '../data/chainStore'

const props = defineProps<{ projectId: string; panelId: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const toast = useToast()

// ─── Konteks dokumen ─────────────────────────────────────────────────────────
const prj = computed(() => proyekList.value.find(p => p.id === props.projectId))
const panel = computed(() => prj.value?.panels.find(p => p.id === props.panelId))
const so = computed(() => prj.value ? salesOrders.value.find(s => s.id === prj.value!.so_id) : undefined)
const qt = computed(() => so.value ? quotations.value.find(q => q.id === so.value!.source_id) : undefined)

const bom = computed(() => latestBom(props.panelId))
const editable = computed(() => !!bom.value && isBomEditable(bom.value))
const errors = computed(() => bom.value ? validateBom(bom.value.id) : [])
const mrp = computed(() => bom.value ? computeMRP(bom.value.id) : [])
const nextRev = computed(() => {
  const v = (bom.value?.version || 1) + 1
  return `Rev ${String.fromCharCode(64 + Math.min(v, 26))}`
})

const lockReason = computed(() => {
  if (!bom.value) return ''
  if (bom.value.status === 'APPROVED') return `BOM ${bom.value.rev} sudah disetujui & terkunci (Approved for Construction).`
  if (bom.value.status === 'SUPERSEDED') return `BOM ${bom.value.rev} digantikan revisi baru.`
  if (bom.value.status === 'IN_REVIEW') return `BOM ${bom.value.rev} sedang direview Manajer Teknik.`
  return ''
})

const summary = computed(() => {
  const rows = bom.value?.items || []
  const longLead = rows.filter(r => r.is_long_lead).length
  return {
    totalQty: rows.reduce((s, r) => s + (r.required_qty || 0), 0),
    value: rows.reduce((s, r) => s + r.required_qty * r.unit_price, 0),
    longLead,
    shortfall: mrp.value.filter(l => l.net_qty > 0).length,
  }
})

const bomLogs = computed(() =>
  statusLog.value.filter(l => l.doc_id === bom.value?.id || l.doc_id.startsWith(props.panelId)).slice(0, 12))

const fmtDate = (d?: string) => {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Baris & pencarian ───────────────────────────────────────────────────────
const rowSearch = ref('')
const filteredLines = computed(() => {
  const rows = bom.value?.items || []
  const q = rowSearch.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(r =>
    r.item_code.toLowerCase().includes(q) ||
    r.item_name.toLowerCase().includes(q) ||
    r.designator.toLowerCase().includes(q) ||
    r.remarks.toLowerCase().includes(q))
})

const stockOf = (line: BomItem) => getItemById(line.item_id)?.stock ?? 0
const netOf = (line: BomItem) => Math.max(0, line.required_qty - stockOf(line))
const stockClass = (line: BomItem) => stockOf(line) <= 0 ? 'text-danger' : 'text-secondary'
const netClass = (line: BomItem) => netOf(line) > 0 ? 'text-warning' : 'text-success'

const rowIssue = (line: BomItem): string | null => {
  const item = getItemById(line.item_id)
  if (!item) return 'Tidak terhubung ke Item Master'
  if (item.status === 'Obsolete') return 'Item berstatus Obsolete'
  if (!(line.required_qty >= 0.01)) return 'Qty tidak valid (min. 0,01)'
  const dupes = (bom.value?.items || []).filter(l =>
    l.item_id === line.item_id &&
    (l.designator || '').trim().toUpperCase() === (line.designator || '').trim().toUpperCase())
  if (dupes.length > 1) return 'Item ganda pada designator sama'
  return null
}

// ─── Aksi baris (edit inline dengan rollback bila guard menolak) ─────────────
type Snapshot = Partial<BomItem>
const snapshots = ref<Record<string, Snapshot>>({})
const remember = (line: BomItem) => {
  snapshots.value[line.id] = {
    item_id: line.item_id, required_qty: line.required_qty,
    designator: line.designator, is_long_lead: line.is_long_lead, remarks: line.remarks,
  }
}
const patchLine = (line: BomItem, patch: Partial<{ required_qty: number; designator: string; is_long_lead: boolean; remarks: string }>) => {
  if (!bom.value) return
  const res = updateBomItem(bom.value.id, line.id, patch)
  if (!res.ok) {
    const before = snapshots.value[line.id]
    if (before) Object.assign(line, before)
    toast.error('Baris Tidak Diubah', res.message)
  }
}
const deleteLine = (line: BomItem) => {
  if (!bom.value) return
  const res = removeBomItem(bom.value.id, line.id)
  if (res.ok) toast.success('Baris Dihapus', res.message)
  else toast.error('Gagal Menghapus', res.message)
}

const val = (e: Event) => (e.target as HTMLInputElement).value
const num = (e: Event) => parseFloat((e.target as HTMLInputElement).value)
const checked = (e: Event) => (e.target as HTMLInputElement).checked

// ─── Modal baris (add / edit) ────────────────────────────────────────────────
const showLine = ref(false)
const lineForm = ref({
  lineId: null as string | null,
  item_id: '',
  query: '',
  required_qty: 1,
  designator: '',
  is_long_lead: false,
  remarks: '',
})
const pickerOpen = ref(false)
const pickerResults = computed(() => searchItems(lineForm.value.query, 8))
const pickedItem = computed(() => (lineForm.value.item_id ? getItemById(lineForm.value.item_id) : undefined))
const canSubmitLine = computed(() => !!lineForm.value.item_id && lineForm.value.required_qty >= 0.01)

const openAddLine = () => {
  if (!editable.value) return
  lineForm.value = { lineId: null, item_id: '', query: '', required_qty: 1, designator: '', is_long_lead: false, remarks: '' }
  pickerOpen.value = true
  showLine.value = true
}
const openEditLine = (line: BomItem) => {
  if (!editable.value) return
  const item = getItemById(line.item_id)
  lineForm.value = {
    lineId: line.id,
    item_id: line.item_id,
    query: item ? `${item.code} — ${item.name}` : '',
    required_qty: line.required_qty,
    designator: line.designator,
    is_long_lead: line.is_long_lead,
    remarks: line.remarks,
  }
  pickerOpen.value = false
  showLine.value = true
}
const pickItem = (item: ItemMaster) => {
  lineForm.value.item_id = item.id
  lineForm.value.query = `${item.code} — ${item.name}`
  if (item.lead_time_days >= 45 && !lineForm.value.lineId) lineForm.value.is_long_lead = true
  pickerOpen.value = false
}
const closePicker = () => { setTimeout(() => { pickerOpen.value = false }, 150) }

const submitLine = () => {
  if (!bom.value || !canSubmitLine.value) return
  const payload = {
    item_id: lineForm.value.item_id,
    required_qty: lineForm.value.required_qty,
    designator: lineForm.value.designator,
    is_long_lead: lineForm.value.is_long_lead,
    remarks: lineForm.value.remarks,
  }
  const res = lineForm.value.lineId
    ? updateBomItem(bom.value.id, lineForm.value.lineId, payload)
    : addBomItem(bom.value.id, payload)
  if (res.ok) {
    toast.success(lineForm.value.lineId ? 'Baris Diperbarui' : 'Baris Ditambahkan', res.message)
    showLine.value = false
  } else {
    toast.error('Gagal Menyimpan Baris', res.message)
  }
}

// ─── Salin template / BOM lain ───────────────────────────────────────────────
const showCopy = ref(false)
const copyMode = ref<'template' | 'fromBom'>('template')
const copyModeOption = ref<'replace' | 'merge'>('replace')
const copySourceId = ref('')
const template = computed(() => getTemplateForPanelType(bom.value?.panel_type || ''))
const templateLabel = computed(() => (bom.value?.panel_type ? (template.value.panelType !== 'DEFAULT' ? template.value.label : fallbackTemplate.label) : ''))
const templateCount = computed(() => template.value.lines.length)
const copyCandidates = computed(() =>
  bomHeaders.value.filter(b => b.id !== bom.value?.id && b.items.length > 0))

const openCopy = (mode: 'template' | 'fromBom') => {
  if (!editable.value) return
  copyMode.value = mode
  copySourceId.value = ''
  showCopy.value = true
}
const confirmCopy = () => {
  if (!bom.value) return
  if (copyMode.value === 'template') {
    const res = salinTemplateKeBom(bom.value.id, copyModeOption.value === 'replace')
    toast[res.added > 0 ? 'success' : 'warning']('Salin Template', res.message)
  } else {
    const res = salinBomLain(bom.value.id, copySourceId.value)
    if (res.ok) toast.success('Salin BOM Lain', res.message)
    else toast.error('Gagal Menyalin', res.message)
  }
  showCopy.value = false
}

// ─── Import ──────────────────────────────────────────────────────────────────
const showImport = ref(false)
const importText = ref('')
const importResult = ref<{ added: number; errors: string[] } | null>(null)
const runImport = () => {
  if (!bom.value) return
  const res = importBomItems(bom.value.id, importText.value)
  importResult.value = res
  if (res.added > 0) toast.success('Import Berhasil', `${res.added} baris ditambahkan.`)
  else toast.error('Import Gagal', res.errors[0] || 'Tidak ada baris valid.')
  if (res.added > 0 && res.errors.length === 0) {
    importText.value = ''
    showImport.value = false
    importResult.value = null
  }
}

// ─── Transisi status ─────────────────────────────────────────────────────────
const ajukan = () => {
  if (!bom.value) return
  ajukanReviewBOM(props.projectId, props.panelId)
}
const setujui = () => {
  setujuiBOM(props.projectId, props.panelId)
}

const showReason = ref(false)
const reasonMode = ref<'return' | 'revise'>('return')
const reasonText = ref('')
const openReason = (mode: 'return' | 'revise') => {
  reasonMode.value = mode
  reasonText.value = ''
  showReason.value = true
}
const confirmReason = () => {
  if (reasonMode.value === 'return') {
    kembalikanBOM(props.projectId, props.panelId, reasonText.value)
  } else {
    revisiBOM(props.projectId, props.panelId, reasonText.value)
  }
  showReason.value = false
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showLine.value) showLine.value = false
    else if (showCopy.value) showCopy.value = false
    else if (showImport.value) showImport.value = false
    else if (showReason.value) showReason.value = false
    else emit('close')
  }
}
onMounted(() => {
  // BOM belum ada (panel baru tanpa SO Confirmed) → buat Rev A Draft sekali
  if (!bom.value) createBomForPanel(props.projectId, props.panelId)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.bom-modal { max-width: 1180px; width: calc(100vw - 48px); max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.bom-header { align-items: flex-start; }
.bom-body { overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.bom-footer { justify-content: space-between; align-items: center; }

.chain-crumb { display: flex; gap: 6px; align-items: center; font-size: 11px; color: var(--text-tertiary); flex-wrap: wrap; }
.chain-crumb .crumb { font-family: var(--font-mono); }
.chain-crumb .crumb.current { color: var(--text-accent); font-weight: 700; }
.chain-crumb .sep { opacity: .5; }

.bom-meta {
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px; padding: 12px 14px; background: var(--bg-glass);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
}
.meta-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-tertiary); }
.meta-value { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.change-reason { font-size: 12px; color: var(--text-warning); }

.bom-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.kpi {
  padding: 10px 12px; border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); background: var(--bg-card);
  display: flex; flex-direction: column; gap: 2px;
}
.kpi-value { font-size: 17px; font-weight: 700; }
.kpi-label { font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .04em; }

.bom-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }

.bom-grid { max-height: 46vh; overflow: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.bom-grid thead th { position: sticky; top: 0; z-index: 2; background: var(--bg-card); }

.item-cell-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  background: none; border: none; padding: 0; text-align: left; cursor: pointer; width: 100%;
}
.item-cell-btn:hover .item-name { color: var(--text-accent); text-decoration: underline; }
.item-name { font-size: 12.5px; font-weight: 500; color: var(--text-primary); }

.input-inline { padding: 4px 6px; font-size: 12.5px; width: 100%; }
.row-invalid { background: rgba(239, 68, 68, 0.06); }
.row-issue { font-size: 10.5px; color: var(--text-danger); margin-top: 3px; }

.error-list { margin: 6px 0 0; padding-left: 18px; font-size: 12px; }
.error-list li { margin-bottom: 2px; }

.mrp-box {
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  padding: 10px 14px; background: var(--bg-glass); font-size: 13px;
}
.mrp-box summary { cursor: pointer; color: var(--text-secondary); font-weight: 600; }

.log-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.log-line { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Picker */
.picker-group { position: relative; }
.picker-menu {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 30;
  background: var(--bg-card); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); margin-top: 4px; max-height: 260px; overflow-y: auto;
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
.picker-option {
  display: block; width: 100%; text-align: left; padding: 8px 12px;
  background: none; border: none; border-bottom: 1px solid var(--border-subtle); cursor: pointer;
}
.picker-option:last-child { border-bottom: none; }
.picker-option:hover, .picker-option.selected { background: rgba(59,85,168,.18); }

.picked-item {
  padding: 10px 12px; border: 1px solid rgba(16,185,129,.3);
  background: rgba(16,185,129,.07); border-radius: var(--radius-md);
}

.check-line { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.radio-stack { display: flex; flex-direction: column; gap: 10px; }

.nested { position: fixed; inset: 0; z-index: 60; }

@media (max-width: 1100px) {
  .bom-meta { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .bom-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
