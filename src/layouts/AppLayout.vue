<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': isCollapsed }">
    <!-- Sidebar -->
    <aside class="sidebar" id="main-sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">⚡</div>
        <div class="logo-text" v-show="!isCollapsed">
          <span class="logo-name">PanelERP</span>
          <span class="logo-tagline">Manufaktur Panel Listrik</span>
        </div>
        <button class="collapse-btn" @click="isCollapsed = !isCollapsed" :data-tooltip="isCollapsed ? 'Buka Sidebar' : undefined">
          <span>{{ isCollapsed ? '→' : '←' }}</span>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav" id="sidebar-nav">
        <!-- Dashboard -->
        <router-link to="/dashboard" class="nav-item" id="nav-dashboard">
          <span class="nav-icon">📊</span>
          <span class="nav-label" v-show="!isCollapsed">Dashboard</span>
        </router-link>

        <!-- M0: Master Data -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Master Data</span>
        </div>
        <router-link to="/master/items" class="nav-item" id="nav-items" :data-tooltip="isCollapsed ? 'Item Master' : undefined">
          <span class="nav-icon">📦</span>
          <span class="nav-label" v-show="!isCollapsed">Item Master</span>
        </router-link>
        <router-link to="/master/vendors" class="nav-item" id="nav-vendors" :data-tooltip="isCollapsed ? 'Vendor' : undefined">
          <span class="nav-icon">🏭</span>
          <span class="nav-label" v-show="!isCollapsed">Vendor</span>
        </router-link>
        <router-link to="/master/customers" class="nav-item" id="nav-customers" :data-tooltip="isCollapsed ? 'Pelanggan' : undefined">
          <span class="nav-icon">🤝</span>
          <span class="nav-label" v-show="!isCollapsed">Pelanggan</span>
        </router-link>

        <router-link to="/master/employees" class="nav-item" id="nav-employees" :data-tooltip="isCollapsed ? 'Karyawan & Kapasitas' : undefined">
          <span class="nav-icon">👷</span>
          <span class="nav-label" v-show="!isCollapsed">Karyawan &amp; Kapasitas</span>
        </router-link>

        <!-- M1: Sales -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Penjualan</span>
        </div>
        <router-link to="/sales/crm" class="nav-item" id="nav-crm" :data-tooltip="isCollapsed ? 'CRM & Prospek' : undefined">
          <span class="nav-icon">🎯</span>
          <span class="nav-label" v-show="!isCollapsed">CRM & Prospek</span>
        </router-link>
        <router-link to="/sales/quotations" class="nav-item" id="nav-quotations" :data-tooltip="isCollapsed ? 'Quotation' : undefined">
          <span class="nav-icon">📋</span>
          <span class="nav-label" v-show="!isCollapsed">Quotation</span>
          <span class="nav-badge" v-show="!isCollapsed" v-if="pendingQuotations > 0">{{ pendingQuotations }}</span>
        </router-link>
        <router-link to="/sales/orders" class="nav-item" id="nav-sales-orders" :data-tooltip="isCollapsed ? 'Sales Order' : undefined">
          <span class="nav-icon">📝</span>
          <span class="nav-label" v-show="!isCollapsed">Sales Order</span>
        </router-link>
        <router-link to="/sales/variation-orders" class="nav-item" id="nav-vo" :data-tooltip="isCollapsed ? 'Variation Order' : undefined">
          <span class="nav-icon">🔄</span>
          <span class="nav-label" v-show="!isCollapsed">Variation Order</span>
        </router-link>

        <!-- M2: Projects -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Proyek</span>
        </div>
        <router-link to="/projects" class="nav-item" id="nav-projects" :data-tooltip="isCollapsed ? 'Proyek' : undefined">
          <span class="nav-icon">🏗️</span>
          <span class="nav-label" v-show="!isCollapsed">Semua Proyek</span>
        </router-link>

        <!-- M3: Engineering -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Engineering</span>
        </div>
        <router-link to="/engineering/bom" class="nav-item" id="nav-bom" :data-tooltip="isCollapsed ? 'Bill of Materials' : undefined">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label" v-show="!isCollapsed">Bill of Materials</span>
        </router-link>
        <router-link to="/engineering/documents" class="nav-item" id="nav-documents" :data-tooltip="isCollapsed ? 'Dokumen Teknis' : undefined">
          <span class="nav-icon">📄</span>
          <span class="nav-label" v-show="!isCollapsed">Dokumen Teknis</span>
        </router-link>

        <!-- M5: Inventory -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Inventaris</span>
        </div>
        <router-link to="/inventory" class="nav-item" id="nav-inventory" :data-tooltip="isCollapsed ? 'Stok & Gudang' : undefined">
          <span class="nav-icon">🏪</span>
          <span class="nav-label" v-show="!isCollapsed">Stok & Gudang</span>
          <span class="nav-badge nav-badge-warn" v-show="!isCollapsed" v-if="stockAlerts > 0">{{ stockAlerts }}</span>
        </router-link>
        <router-link to="/inventory/grn" class="nav-item" id="nav-grn" :data-tooltip="isCollapsed ? 'Penerimaan Barang' : undefined">
          <span class="nav-icon">📥</span>
          <span class="nav-label" v-show="!isCollapsed">Penerimaan (GRN)</span>
        </router-link>

        <!-- M6: Purchasing -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Pembelian</span>
        </div>
        <router-link to="/purchasing" class="nav-item" id="nav-purchasing" :data-tooltip="isCollapsed ? 'Pembelian' : undefined">
          <span class="nav-icon">🛒</span>
          <span class="nav-label" v-show="!isCollapsed">PR & Purchase Order</span>
        </router-link>

        <!-- M7: Production -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Produksi</span>
        </div>
        <router-link to="/production" class="nav-item" id="nav-production" :data-tooltip="isCollapsed ? 'Produksi & WO' : undefined">
          <span class="nav-icon">⚡</span>
          <span class="nav-label" v-show="!isCollapsed">Work Order</span>
        </router-link>

        <router-link to="/production/routing" class="nav-item" id="nav-routing" :data-tooltip="isCollapsed ? 'Template Routing' : undefined">
          <span class="nav-icon">📐</span>
          <span class="nav-label" v-show="!isCollapsed">Template Routing</span>
        </router-link>

        <!-- M8: Quality -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Quality</span>
        </div>
        <router-link to="/quality" class="nav-item" id="nav-quality" :data-tooltip="isCollapsed ? 'Quality Control' : undefined">
          <span class="nav-icon">🔍</span>
          <span class="nav-label" v-show="!isCollapsed">QC & NCR & FAT</span>
        </router-link>
        <router-link to="/delivery" class="nav-item" id="nav-delivery" :data-tooltip="isCollapsed ? 'Pengiriman & BAST' : undefined">
          <span class="nav-icon">🚚</span>
          <span class="nav-label" v-show="!isCollapsed">Pengiriman & BAST</span>
        </router-link>

        <!-- M9: Finance -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Keuangan</span>
        </div>
        <router-link to="/finance" class="nav-item" id="nav-finance" :data-tooltip="isCollapsed ? 'Keuangan' : undefined">
          <span class="nav-icon">💰</span>
          <span class="nav-label" v-show="!isCollapsed">Invoice & AR/AP</span>
        </router-link>

        <!-- M10 & M11: Portal & Platform -->
        <div class="nav-group" v-show="!isCollapsed">
          <span class="nav-group-label">Lainnya</span>
        </div>
        <router-link to="/portal" class="nav-item" id="nav-portal" :data-tooltip="isCollapsed ? 'Portal Klien' : undefined">
          <span class="nav-icon">🌐</span>
          <span class="nav-label" v-show="!isCollapsed">Portal Klien</span>
        </router-link>
        <router-link to="/platform" class="nav-item" id="nav-platform" :data-tooltip="isCollapsed ? 'Platform & Layanan' : undefined">
          <span class="nav-icon">🔧</span>
          <span class="nav-label" v-show="!isCollapsed">Platform & Approval</span>
          <span class="nav-badge" v-show="!isCollapsed" v-if="pendingApprovals > 0">{{ pendingApprovals }}</span>
        </router-link>
      </nav>

      <!-- Bottom -->
      <div class="sidebar-bottom">
        <router-link to="/settings" class="nav-item" id="nav-settings" :data-tooltip="isCollapsed ? 'Pengaturan' : undefined">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label" v-show="!isCollapsed">Pengaturan</span>
        </router-link>

        <div class="user-info" v-show="!isCollapsed" id="sidebar-user">
          <div class="user-avatar">BS</div>
          <div class="user-details">
            <div class="user-name">Budi Santoso</div>
            <div class="user-role">Project Manager</div>
          </div>
        </div>
        <div class="user-avatar user-avatar-collapsed" v-show="isCollapsed" data-tooltip="Budi Santoso">BS</div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-area">
      <!-- Top Header -->
      <header class="top-header" id="top-header">
        <div class="header-left">
          <div class="breadcrumb">
            <span class="breadcrumb-item">{{ currentModule }}</span>
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">{{ currentPage }}</span>
          </div>
        </div>
        <div class="header-right">
          <!-- Search -->
          <div class="header-search" id="global-search">
            <span class="search-icon">🔍</span>
            <input
              ref="searchInput"
              type="search"
              placeholder="Cari proyek, panel, item..."
              class="search-input"
              id="search-input"
              aria-label="Pencarian global"
              aria-autocomplete="list"
              :aria-expanded="searchOpen"
              aria-controls="search-results"
              v-model="searchQuery"
              @focus="searchOpen = true"
              @keydown.down.prevent="moveSearch(1)"
              @keydown.up.prevent="moveSearch(-1)"
              @keydown.enter.prevent="pickSearch"
            />
            <kbd class="search-kbd">⌘K</kbd>

            <div
              v-if="searchOpen && searchQuery.trim()"
              class="search-results card"
              id="search-results"
              role="listbox"
              aria-label="Hasil pencarian"
            >
              <div v-if="searchHits.length === 0" class="search-empty text-xs text-tertiary">
                Tidak ada hasil untuk “{{ searchQuery }}”
              </div>
              <button
                v-for="(hit, i) in searchHits"
                :key="hit.to"
                class="search-hit"
                role="option"
                :aria-selected="i === searchIndex"
                :class="{ active: i === searchIndex }"
                @mouseenter="searchIndex = i"
                @click="goSearch(hit)"
              >
                <span class="search-hit-icon">{{ hit.icon }}</span>
                <span class="search-hit-body">
                  <span class="search-hit-label">{{ hit.label }}</span>
                  <span class="search-hit-sub">{{ hit.sub }}</span>
                </span>
                <span class="search-hit-kind text-xs text-tertiary">{{ hit.kind }}</span>
              </button>
            </div>
          </div>

          <!-- Theme Toggle -->
          <button class="header-btn" id="theme-toggle-btn" @click="toggleTheme" :data-tooltip="currentTheme === 'light' ? 'Beralih ke Dark Mode' : 'Beralih ke Putih Clean'" :aria-label="currentTheme === 'light' ? 'Beralih ke mode gelap' : 'Beralih ke mode terang'">
            <span>{{ currentTheme === 'light' ? '☀️' : '🌙' }}</span>
          </button>

          <!-- Notifications -->
          <button
            class="header-btn notification-btn"
            id="notification-btn"
            @click="showNotifs = !showNotifs"
            aria-haspopup="true"
            :aria-expanded="showNotifs"
            aria-label="Notifikasi"
          >
            <span>🔔</span>
            <span class="notif-dot" v-if="pendingApprovals > 0">{{ pendingApprovals }}</span>
          </button>

          <!-- Notifications dropdown -->
          <div class="notif-dropdown card" v-if="showNotifs" id="notification-panel">
            <div class="card-header" style="padding: 12px 16px;">
              <span class="font-semibold text-sm">Notifikasi</span>
              <span class="badge badge-danger" v-if="pendingApprovals > 0">{{ pendingApprovals }} Baru</span>
            </div>
            <div style="padding: 8px 0;">
              <div v-for="a in recentActivities.slice(0,4)" :key="a.id" class="notif-item" :class="{ urgent: a.urgent }">
                <span class="notif-icon">{{ a.icon }}</span>
                <div class="notif-content">
                  <div class="text-sm">{{ a.message }}</div>
                  <div class="text-xs text-tertiary">{{ a.time }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- User -->
          <div class="header-user" id="header-user">
            <div class="user-avatar" style="font-size: 11px;">BS</div>
            <div class="user-details" style="display: flex; flex-direction: column;">
              <span class="text-sm font-medium">Budi Santoso</span>
              <span class="text-xs text-tertiary">Project Manager</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="page-content" id="page-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- Global Toast Notifications Container -->
      <div class="toast-container" id="global-toast-container" role="status" aria-live="polite" aria-atomic="false">
        <transition-group name="toast">
          <div
            v-for="t in toasts"
            :key="t.id"
            :class="['toast-notification', `toast-${t.type}`]"
            :id="`toast-${t.id}`"
            @click="removeToast(t.id)"
            @mouseenter="pauseToast(t.id)"
            @mouseleave="resumeToast(t.id)"
            @focusin="pauseToast(t.id)"
            @focusout="resumeToast(t.id)"
          >
            <div class="toast-icon">
              <span v-if="t.type === 'success'">✅</span>
              <span v-else-if="t.type === 'error'">🚨</span>
              <span v-else-if="t.type === 'warning'">⚠️</span>
              <span v-else>ℹ️</span>
            </div>
            <div class="toast-body">
              <div class="toast-title">{{ t.title }}</div>
              <div class="toast-message">{{ t.message }}</div>
            </div>
            <button class="toast-close" @click.stop="removeToast(t.id)" aria-label="Tutup notifikasi">✕</button>
          </div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mockRecentActivities, mockVendors, mockCustomers } from '../data/mockData'
import { mockApprovalQueue } from '../data/mockDataExtended'
import { quotations, proyekList, salesOrders } from '../data/chainStore'
import { items } from '../data/itemStore'
import { useToast } from '../data/toastStore'

const { toasts, remove: removeToast, pause: pauseToast, resume: resumeToast } = useToast()

const isCollapsed = ref(false)
const showNotifs = ref(false)
const recentActivities = mockRecentActivities

// ─── Badge navigasi — dihitung dari data, bukan angka tetap ──────────────────
const pendingQuotations = computed(() => quotations.value.filter(q => q.status === 'MENUNGGU_APPROVAL').length)
const stockAlerts = computed(() => items.value.filter(i => i.stock <= i.reorder).length)
const pendingApprovals = computed(() => mockApprovalQueue.value.filter(a => a.status === 'Pending').length)

const currentTheme = ref(localStorage.getItem('theme') || 'light')

const applyTheme = (theme: string) => {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

const toggleTheme = () => {
  const nextTheme = currentTheme.value === 'light' ? 'dark' : 'light'
  applyTheme(nextTheme)
}

// ─── Pencarian global (⌘K / Ctrl+K) ─────────────────────────────────────────
interface SearchHit { icon: string; label: string; sub: string; kind: string; to: string }

const router = useRouter()
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const searchOpen = ref(false)
const searchIndex = ref(0)

const searchHits = computed<SearchHit[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const match = (...fields: string[]) => fields.some(f => f.toLowerCase().includes(q))

  const hits: SearchHit[] = []
  for (const p of proyekList.value) {
    if (match(p.id, p.name, p.customer)) hits.push({ icon: '🏗️', label: p.name, sub: `${p.id} · ${p.customer}`, kind: 'Proyek', to: `/projects/${p.id}` })
  }
  for (const qt of quotations.value) {
    if (match(qt.id, qt.project, qt.customer)) hits.push({ icon: '📋', label: qt.project, sub: `${qt.id} · ${qt.customer}`, kind: 'Quotation', to: '/sales/quotations' })
  }
  for (const so of salesOrders.value) {
    if (match(so.id, so.customer)) hits.push({ icon: '📝', label: so.id, sub: `${so.customer} · ${so.status}`, kind: 'Sales Order', to: '/sales/orders' })
  }
  for (const it of items.value) {
    if (match(it.code, it.name, it.brand)) hits.push({ icon: '📦', label: it.name, sub: `${it.code} · stok ${it.stock} ${it.uom}`, kind: 'Item', to: '/master/items' })
  }
  for (const v of mockVendors) {
    if (match(v.name, v.code, v.city)) hits.push({ icon: '🏭', label: v.name, sub: `${v.code} · ${v.city}`, kind: 'Vendor', to: '/master/vendors' })
  }
  for (const c of mockCustomers) {
    if (match(c.name, c.code, c.city)) hits.push({ icon: '🤝', label: c.name, sub: `${c.code} · ${c.city}`, kind: 'Pelanggan', to: '/master/customers' })
  }
  return hits.slice(0, 8)
})

watch(searchHits, () => { searchIndex.value = 0 })

const moveSearch = (step: number) => {
  const last = searchHits.value.length - 1
  if (last < 0) return
  searchIndex.value = (searchIndex.value + step + searchHits.value.length) % searchHits.value.length
}

const goSearch = (hit: SearchHit) => {
  router.push(hit.to)
  searchQuery.value = ''
  searchOpen.value = false
  searchInput.value?.blur()
}

const pickSearch = () => {
  const hit = searchHits.value[searchIndex.value]
  if (hit) goSearch(hit)
}

// ─── Tutup panel luar dengan Escape / klik di luar ──────────────────────────
const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
    searchOpen.value = true
    return
  }
  if (e.key === 'Escape') {
    searchOpen.value = false
    showNotifs.value = false
  }
}

const onDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#global-search')) searchOpen.value = false
  if (!target.closest('#notification-btn') && !target.closest('#notification-panel')) showNotifs.value = false
}

onMounted(() => {
  applyTheme(currentTheme.value)
  document.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('click', onDocumentClick)
})

const route = useRoute()

const moduleMap: Record<string, string> = {
  dashboard: 'Beranda',
  master: 'Master Data',
  sales: 'Penjualan',
  projects: 'Proyek',
  engineering: 'Engineering',
  inventory: 'Inventaris',
  purchasing: 'Pembelian',
  production: 'Produksi',
  quality: 'Quality',
  delivery: 'Pengiriman & BAST',
  finance: 'Keuangan',
  portal: 'Portal Klien',
  platform: 'Platform',
  settings: 'Pengaturan',
}

const currentModule = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  return moduleMap[parts[0]] || 'Beranda'
})

/** Judul halaman diambil dari meta.title router — sumber kebenaran tunggal. */
const currentPage = computed(() => {
  const title = typeof route.meta.title === 'string' ? route.meta.title : ''
  if (title) return title
  const parts = route.path.split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Beranda'
})
</script>

<style scoped>
/* App Shell Layout */
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-slow);
  overflow: hidden;
  position: relative;
  z-index: 100;
}

.app-shell.sidebar-collapsed .sidebar {
  width: var(--sidebar-collapsed);
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  min-height: var(--header-height);
  flex-shrink: 0;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 85, 168, 0.5);
}

.logo-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.logo-name {
  display: block;
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  background: linear-gradient(135deg, var(--logo-from), var(--logo-to));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-tagline {
  display: block;
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.collapse-btn {
  width: 24px;
  height: 24px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.collapse-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
}

/* Nav */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group {
  padding: var(--space-3) var(--space-2) var(--space-1);
  margin-top: var(--space-2);
}

.nav-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition-base);
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-glass);
  color: var(--text-primary);
}

.nav-item.router-link-exact-active {
  background: var(--tint-primary-bg);
  color: var(--text-accent);
  border-color: var(--tint-primary-border);
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
  line-height: 1;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  background: var(--primary-600);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.nav-badge-warn {
  background: var(--warning-600);
}

/* Sidebar Bottom */
.sidebar-bottom {
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-600), var(--accent-500));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.user-avatar-collapsed {
  margin: 0 auto;
  cursor: pointer;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.user-role {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* Main Area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Header */
.top-header {
  height: var(--header-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  gap: var(--space-4);
  flex-shrink: 0;
}

.header-left {
  flex: 1;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.breadcrumb-item { color: var(--text-tertiary); }
.breadcrumb-sep { color: var(--text-tertiary); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  position: relative;
}

/* Search */
.header-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  height: 34px;
  min-width: 280px;
  transition: all var(--transition-base);
  position: relative;
}

.header-search:focus-within {
  border-color: var(--primary-500);
  background: var(--bg-glass-hover);
  box-shadow: 0 0 0 3px rgba(59, 85, 168, 0.12);
}

.search-icon { font-size: 14px; color: var(--text-tertiary); }

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.search-input::placeholder { color: var(--text-tertiary); }

.search-kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 1px 5px;
}

/* Global search results */
.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 340px;
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
  z-index: 300;
  animation: slideDown 150ms ease;
}

.search-hit {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition: background var(--transition-fast);
}

.search-hit:hover,
.search-hit.active {
  background: var(--tint-primary-bg);
}

.search-hit-icon { font-size: 16px; flex-shrink: 0; }

.search-hit-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.search-hit-label {
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-hit-sub {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-hit-kind { flex-shrink: 0; }

.search-empty { padding: var(--space-3); }

/* Header Buttons */
.header-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: 16px;
  position: relative;
}

.header-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
}

.notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  background: var(--danger-500);
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-secondary);
  padding: 0 3px;
}

/* Notification Dropdown */
.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 48px;
  width: 360px;
  z-index: 200;
  animation: slideDown 150ms ease;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  transition: background var(--transition-fast);
  cursor: pointer;
}

.notif-item:hover { background: var(--bg-glass); }
.notif-item.urgent { border-left: 3px solid var(--danger-500); }

.notif-icon { font-size: 20px; flex-shrink: 0; }
.notif-content { flex: 1; min-width: 0; }

/* Header User */
.header-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-base);
}

.header-user:hover { background: var(--bg-glass); }

/* Page Content */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  background: var(--bg-primary);
}

/* Page transition */
.page-enter-active, .page-leave-active {
  transition: all 150ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Global Toast Container */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  pointer-events: none;
}

.toast-notification {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
  cursor: pointer;
  transition: all var(--transition-base);
}

.toast-notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.toast-success {
  border-left: 4px solid var(--success-500);
}
.toast-error {
  border-left: 4px solid var(--danger-500);
}
.toast-warning {
  border-left: 4px solid var(--warning-500);
}
.toast-info {
  border-left: 4px solid var(--primary-500);
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.2;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.toast-message {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
}

.toast-close:hover {
  color: var(--text-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
</style>
