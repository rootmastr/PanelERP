<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Pelanggan</h1>
        <p class="page-subtitle">Kelola data pelanggan dan histori proyek (PRD M0 §4.1.3)</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-customer" @click="showModal = true">+ Pelanggan Baru</button>
    </div>
    <div class="grid-3" style="margin-bottom: 24px;">
      <div class="stat-card" id="stat-cust-total"><div class="stat-value">{{ customers.length }}</div><div class="stat-label">Total Pelanggan Terdaftar</div></div>
      <div class="stat-card" id="stat-cust-projects"><div class="stat-value">{{ totalCustomerProjects }}</div><div class="stat-label">Total Proyek Terkontrak</div></div>
      <div class="stat-card" id="stat-cust-value"><div class="stat-value" style="font-size: 22px;">{{ formatCurrency(totalCustomerValue) }}</div><div class="stat-label">Total Nilai Kontrak</div></div>
    </div>
    <div class="grid-2" id="customer-cards">
      <div v-for="c in customers" :key="c.id" class="card card-hover" style="padding: 20px; cursor: pointer;" :id="`card-cust-${c.id}`">
        <div class="flex items-start justify-between" style="margin-bottom: 12px;">
          <div>
            <div class="mono text-xs text-tertiary">{{ c.code }}</div>
            <div class="font-semibold text-lg text-primary">{{ c.name }}</div>
          </div>
          <span :class="['badge', c.type === 'BUMN' ? 'badge-primary' : 'badge-neutral']">{{ c.type }}</span>
        </div>
        <div class="flex flex-col gap-1" style="margin-bottom: 16px;">
          <div class="text-sm text-secondary">👤 PIC: {{ c.contact }}</div>
          <div class="text-sm text-secondary">📍 Kota: {{ c.city }}</div>
          <div class="text-sm text-secondary">📞 Telepon: {{ c.phone }}</div>
        </div>
        <div class="flex justify-between items-end" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
          <div>
            <div class="text-xs text-tertiary">Total Proyek</div>
            <div class="font-bold text-xl text-primary">{{ c.totalProjects }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-tertiary">Total Nilai</div>
            <div class="font-semibold text-accent">{{ formatCurrency(c.totalValue) }}</div>
          </div>
          <span :class="['badge', c.status === 'Aktif' ? 'badge-success' : 'badge-neutral']">{{ c.status }}</span>
        </div>
      </div>
    </div>

    <!-- Modal Form Tambah Pelanggan Baru (Sesuai PRD §4.1.3 #modal-add-customer) -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" id="modal-add-customer">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="font-semibold text-lg">Tambah Data Pelanggan Baru</span>
            <div class="text-xs text-tertiary">Klien BUMN, Swasta & Kontraktor (PRD M0 §4.1.3)</div>
          </div>
          <button class="btn btn-icon btn-secondary btn-sm" @click="showModal = false">✕</button>
        </div>
        <form @submit.prevent="submitCustomer">
          <div class="modal-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="input-group">
                <label class="input-label" for="input-cust-code">Kode Pelanggan *</label>
                <input type="text" class="input mono" id="input-cust-code" v-model="form.code" placeholder="CST-XXX" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-cust-type">Tipe Klien *</label>
                <select class="select" id="input-cust-type" v-model="form.type" required>
                  <option>BUMN</option>
                  <option>Swasta</option>
                  <option>Kontraktor</option>
                  <option>Pemerintah</option>
                </select>
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-cust-name">Nama Perusahaan / Instansi *</label>
                <input type="text" class="input" id="input-cust-name" v-model="form.name" placeholder="PT. Pertamina Lubricants" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-cust-pic">Nama PIC Kontak *</label>
                <input type="text" class="input" id="input-cust-pic" v-model="form.contact" placeholder="Ir. Joko Susilo" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-cust-phone">No. Telepon / WA *</label>
                <input type="text" class="input" id="input-cust-phone" v-model="form.phone" placeholder="021-381-0000" required />
              </div>

              <div class="input-group" style="grid-column: 1/-1;">
                <label class="input-label" for="input-cust-address">Alamat Kantor / Penagihan *</label>
                <textarea class="input" rows="2" id="input-cust-address" v-model="form.address" placeholder="Jl. Medan Merdeka Timur No. 1..." style="height: auto; padding: 10px;" required></textarea>
              </div>

              <div class="input-group">
                <label class="input-label" for="input-cust-city">Kota Domisili *</label>
                <input type="text" class="input" id="input-cust-city" v-model="form.city" placeholder="Jakarta Pusat" required />
              </div>

              <div class="input-group">
                <label class="input-label" for="input-cust-top">Standar TOP (Hari) *</label>
                <input type="number" class="input" id="input-cust-top" v-model.number="form.top" min="0" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false" id="btn-cancel-cust">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-cust">Simpan Data Pelanggan</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mockCustomers, formatCurrency } from '../../data/mockData'
import { useToast } from '../../data/toastStore'

const toast = useToast()

const customers = ref([...mockCustomers])
const showModal = ref(false)

const totalCustomerProjects = computed(() => customers.value.reduce((sum, c) => sum + c.totalProjects, 0))
const totalCustomerValue = computed(() => customers.value.reduce((sum, c) => sum + c.totalValue, 0))

const form = ref({
  code: `CST-00${customers.value.length + 1}`,
  name: '',
  type: 'Swasta',
  contact: '',
  phone: '',
  address: '',
  city: 'Jakarta',
  top: 30
})

const submitCustomer = () => {
  if (!form.value.name || !form.value.code) return

  const newCust = {
    id: `CST-00${customers.value.length + 1}`,
    code: form.value.code,
    name: form.value.name,
    type: form.value.type,
    contact: form.value.contact,
    phone: form.value.phone,
    city: form.value.city,
    status: 'Aktif',
    totalProjects: 0,
    totalValue: 0
  }

  customers.value.unshift(newCust)
  showModal.value = false
  toast.success('Pelanggan Baru Disimpan', `${newCust.name} (${newCust.code}) siap menerima penawaran proyek`)
}
</script>
