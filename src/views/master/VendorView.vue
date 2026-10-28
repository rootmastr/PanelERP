<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Vendor</h1>
        <p class="page-subtitle">Kelola data vendor, subkontraktor, dan supplier (PRD M0 §4.1.2)</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-vendor" @click="showModal = true">+ Vendor Baru</button>
    </div>
    <div class="grid-4" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-vendor-total"><div class="stat-value">{{ vendors.length }}</div><div class="stat-label">Total Vendor</div></div>
      <div class="stat-card" id="stat-vendor-supplier"><div class="stat-value">{{ vendors.filter(v => v.category === 'Pemasok').length }}</div><div class="stat-label">Pemasok Aktif</div></div>
      <div class="stat-card" id="stat-vendor-subkon"><div class="stat-value">{{ vendors.filter(v => v.category === 'Subkontraktor').length }}</div><div class="stat-label">Subkontraktor</div></div>
      <div class="stat-card" id="stat-vendor-rating"><div class="stat-value">{{ avgRating }}</div><div class="stat-label">Avg Rating</div></div>
    </div>
    <div class="card" id="vendor-table-card">
      <div class="card-header">
        <div class="input-with-icon" style="width: 280px;">
          <span class="input-icon">🔍</span>
          <input class="input" placeholder="Cari vendor..." v-model="search" id="search-vendor" />
        </div>
        <select class="select" style="width: 160px;" v-model="filterCat" id="filter-vendor-cat">
          <option value="">Semua Kategori</option>
          <option value="Pemasok">Pemasok</option>
          <option value="Subkontraktor">Subkontraktor</option>
        </select>
      </div>
      <div class="table-container" style="border: none;">
        <table class="table table-clickable" id="vendor-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Vendor</th>
              <th>Kategori</th>
              <th>Kontak</th>
              <th>Kota</th>
              <th>Lead Time</th>
              <th>Rating</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in filteredVendors" :key="v.id" :id="`row-vendor-${v.id}`">
              <td><span class="mono text-xs text-tertiary">{{ v.code }}</span></td>
              <td>
                <div class="font-medium text-primary">{{ v.name }}</div>
                <div class="text-xs text-tertiary">{{ v.paymentTerm }}</div>
              </td>
              <td><span :class="['badge', v.category === 'Pemasok' ? 'badge-primary' : 'badge-warning']">{{ v.category }}</span></td>
              <td class="text-secondary text-sm">{{ v.contact }}</td>
              <td class="text-secondary text-sm">{{ v.city }}</td>
              <td class="text-secondary text-sm">{{ v.leadTime }} hari</td>
              <td>
                <div class="flex items-center gap-1">
                  <span class="text-warning">★</span>
                  <span class="font-semibold text-sm">{{ v.rating }}</span>
                </div>
              </td>
              <td><span :class="['badge', v.status === 'Aktif' ? 'badge-success' : 'badge-neutral']">{{ v.status }}</span></td>
              <td>
                <button class="btn btn-icon btn-secondary btn-sm" :id="`edit-vendor-${v.id}`" @click="editVendor(v)">✏️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Tambah Vendor Baru (Sesuai PRD §4.1.2 #modal-add-vendor) -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" id="modal-add-vendor">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Tambah Data Vendor / Subkontraktor</span>
            <div class="text-xs text-tertiary">Pemasok Material & Jasa Fabrikasi Luar (PRD M0 §4.1.2)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="submitVendor">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-vendor-code">Kode Vendor *</label>
                <input type="text" class="input mono" id="input-vendor-code" v-model="form.code" placeholder="VND-XXX" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-cat">Kategori *</label>
                <select class="select" id="input-vendor-cat" v-model="form.category" required>
                  <option>Pemasok</option>
                  <option>Subkontraktor</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-vendor-name">Nama Perusahaan Vendor *</label>
                <input type="text" class="input" id="input-vendor-name" v-model="form.name" placeholder="PT. Schneider Electric Indonesia" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-contact">Nama Personil Kontak (PIC) *</label>
                <input type="text" class="input" id="input-vendor-contact" v-model="form.contact" placeholder="Dian Pratiwi" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-phone">No. Telepon / WA *</label>
                <input type="text" class="input" id="input-vendor-phone" v-model="form.phone" placeholder="021-5555-1234" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-city">Kota Workshop / Kantor *</label>
                <input type="text" class="input" id="input-vendor-city" v-model="form.city" placeholder="Jakarta / Semarang" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-curr">Mata Uang Standar</label>
                <select class="select" id="input-vendor-curr" v-model="form.currency">
                  <option>IDR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-top">Term Pembayaran (TOP) *</label>
                <select class="select" id="input-vendor-top" v-model="form.paymentTerm">
                  <option>Cash Sebelum Kirim</option>
                  <option>14 hari</option>
                  <option>30 hari</option>
                  <option>45 hari</option>
                  <option>60 hari</option>
                </select>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-vendor-lead">Lead Time Pengiriman (Hari) *</label>
                <input type="number" class="input" id="input-vendor-lead" v-model.number="form.leadTime" min="1" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false" id="btn-cancel-vendor">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-vendor">Simpan Data Vendor</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockVendors } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const vendors = ref([...mockVendors])
const search = ref('')
const filterCat = ref('')
const showModal = ref(false)

const avgRating = computed(() => {
  const rated = vendors.value.filter(v => typeof v.rating === 'number')
  if (!rated.length) return '—'
  return (rated.reduce((a, v) => a + v.rating, 0) / rated.length).toFixed(1)
})

const form = ref({
  code: `VND-00${vendors.value.length + 1}`,
  name: '',
  category: 'Pemasok',
  contact: '',
  phone: '',
  city: 'Semarang',
  currency: 'IDR',
  paymentTerm: '30 hari',
  leadTime: 14
})

const filteredVendors = computed(() => vendors.value.filter(v => {
  const q = search.value.toLowerCase()
  const matchSearch = !q || v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
  const matchCat = !filterCat.value || v.category === filterCat.value
  return matchSearch && matchCat
}))

const editVendor = (v: typeof vendors.value[0]) => {
  toast.info('Data Vendor', `${v.name} (${v.code}) — Rating: ${v.rating}★`)
}

const submitVendor = () => {
  if (!form.value.name || !form.value.code) return

  const newVendor = {
    id: `VND-00${vendors.value.length + 1}`,
    code: form.value.code,
    name: form.value.name,
    category: form.value.category,
    contact: form.value.contact,
    phone: form.value.phone,
    city: form.value.city,
    currency: form.value.currency,
    paymentTerm: form.value.paymentTerm,
    leadTime: form.value.leadTime,
    rating: 5.0,
    status: 'Aktif'
  }

  vendors.value.unshift(newVendor)
  showModal.value = false
  toast.success('Vendor Terdaftar', `${newVendor.name} berhasil disimpan ke master vendor`)
}
</script>
