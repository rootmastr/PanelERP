import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Dashboard', icon: '📊' }
      },
      // M0 - Master Data
      {
        path: 'master',
        children: [
          {
            path: 'items',
            name: 'ItemMaster',
            component: () => import('../views/master/ItemMasterView.vue'),
            meta: { title: 'Item Master', icon: '📦' }
          },
          {
            path: 'vendors',
            name: 'Vendors',
            component: () => import('../views/master/VendorView.vue'),
            meta: { title: 'Vendor', icon: '🏭' }
          },
          {
            path: 'customers',
            name: 'Customers',
            component: () => import('../views/master/CustomerView.vue'),
            meta: { title: 'Pelanggan', icon: '🤝' }
          },
          {
            path: 'employees',
            name: 'Employees',
            component: () => import('../views/master/EmployeeView.vue'),
            meta: { title: 'Karyawan & Kapasitas', icon: '👷' }
          },
        ]
      },
      // M1 - Sales
      {
        path: 'sales',
        children: [
          {
            path: 'quotations',
            name: 'Quotations',
            component: () => import('../views/sales/QuotationView.vue'),
            meta: { title: 'Quotation', icon: '📋' }
          },
          {
            path: 'orders',
            name: 'SalesOrders',
            component: () => import('../views/sales/SalesOrderView.vue'),
            meta: { title: 'Sales Order', icon: '📝' }
          },
          {
            path: 'crm',
            name: 'CRM',
            component: () => import('../views/sales/CRMView.vue'),
            meta: { title: 'CRM & Prospek', icon: '🎯' }
          },
          {
            path: 'variation-orders',
            name: 'VariationOrders',
            component: () => import('../views/sales/VariationOrderView.vue'),
            meta: { title: 'Variation Order', icon: '🔄' }
          },
        ]
      },
      // M2 - Projects
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/project/ProjectListView.vue'),
        meta: { title: 'Proyek', icon: '🏗️' }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('../views/project/ProjectDetailView.vue'),
        meta: { title: 'Detail Proyek' }
      },
      // M3 - Engineering
      {
        path: 'engineering',
        children: [
          {
            path: 'bom',
            name: 'BOM',
            component: () => import('../views/engineering/BOMView.vue'),
            meta: { title: 'Bill of Materials', icon: '⚙️' }
          },
          {
            path: 'documents',
            name: 'Documents',
            component: () => import('../views/engineering/DocumentView.vue'),
            meta: { title: 'Dokumen Teknis', icon: '📄' }
          },
        ]
      },
      // M5 - Inventory
      {
        path: 'inventory',
        children: [
          {
            path: '',
            name: 'Inventory',
            component: () => import('../views/inventory/InventoryView.vue'),
            meta: { title: 'Stok & Gudang', icon: '🏪' }
          },
          {
            path: 'grn',
            name: 'GRN',
            component: () => import('../views/inventory/GRNView.vue'),
            meta: { title: 'Penerimaan Barang (GRN)', icon: '📥' }
          },
        ]
      },
      // M6 – Purchasing
      {
        path: 'purchasing',
        name: 'Purchasing',
        component: () => import('../views/purchasing/PurchasingView.vue'),
        meta: { title: 'Pembelian', icon: '🛒' }
      },
      // M7 – Production
      {
        path: 'production',
        children: [
          {
            path: '',
            name: 'Production',
            component: () => import('../views/production/ProductionView.vue'),
            meta: { title: 'Produksi & Work Order', icon: '⚡' }
          },
          {
            path: 'work-orders',
            name: 'WorkOrders',
            component: () => import('../views/production/ProductionView.vue'),
            meta: { title: 'Work Orders', icon: '⚡' }
          },
          {
            path: 'routing',
            name: 'RoutingTemplates',
            component: () => import('../views/production/RoutingView.vue'),
            meta: { title: 'Template Routing', icon: '📐' }
          },
        ]
      },
      // M8 – Quality
      {
        path: 'quality',
        children: [
          {
            path: '',
            name: 'Quality',
            component: () => import('../views/quality/QualityView.vue'),
            meta: { title: 'Quality Control', icon: '🔍' }
          },
          {
            path: 'ncr',
            name: 'NCR',
            component: () => import('../views/quality/QualityView.vue'),
            meta: { title: 'NCR', icon: '⚠️' }
          },
        ]
      },
      // M8b – Pengiriman & BAST
      {
        path: 'delivery',
        name: 'Delivery',
        component: () => import('../views/delivery/DeliveryView.vue'),
        meta: { title: 'Pengiriman & BAST', icon: '🚚' }
      },
      // M9 – Finance
      {
        path: 'finance',
        children: [
          {
            path: '',
            name: 'Finance',
            component: () => import('../views/finance/FinanceView.vue'),
            meta: { title: 'Keuangan', icon: '💰' }
          },
          {
            path: 'invoices',
            name: 'Invoices',
            component: () => import('../views/finance/FinanceView.vue'),
            meta: { title: 'Invoice', icon: '💳' }
          },
        ]
      },
      // M10 – Client Portal
      {
        path: 'portal',
        name: 'ClientPortal',
        component: () => import('../views/portal/ClientPortalView.vue'),
        meta: { title: 'Portal Klien', icon: '🌐' }
      },
      // M11 – Platform
      {
        path: 'platform',
        name: 'Platform',
        component: () => import('../views/platform/PlatformView.vue'),
        meta: { title: 'Platform & Layanan', icon: '⚙️' }
      },
      // Settings
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue'),
        meta: { title: 'Pengaturan', icon: '⚙️' }
      },
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Login' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — PanelERP` : 'PanelERP'
})

export default router
