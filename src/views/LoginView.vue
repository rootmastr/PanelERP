<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-circuit"></div>
    </div>
    <div class="login-container" id="login-container">
      <!-- Logo -->
      <div class="login-logo">
        <div class="logo-icon-large">⚡</div>
        <div class="logo-brand">PanelERP</div>
        <div class="logo-subtitle">Sistem ERP & MES Manufaktur Panel Listrik</div>
      </div>

      <!-- Card -->
      <div class="login-card card" id="login-card">
        <div class="login-card-header">
          <h2 class="font-bold text-2xl">Masuk ke Sistem</h2>
          <p class="text-sm text-tertiary" style="margin-top: 4px;">Gunakan akun yang diberikan administrator</p>
        </div>

        <form @submit.prevent="handleLogin" id="login-form">
          <div class="input-group" style="margin-bottom: 16px;">
            <label class="input-label" for="input-email">Email / Username</label>
            <div class="input-with-icon">
              <span class="input-icon">👤</span>
              <input type="email" class="input" id="input-email" placeholder="budi@panelei.com" v-model="email" required />
            </div>
          </div>

          <div class="input-group" style="margin-bottom: 24px;">
            <label class="input-label" for="input-password">Password</label>
            <div class="input-with-icon">
              <span class="input-icon">🔒</span>
              <input :type="showPassword ? 'text' : 'password'" class="input" id="input-password"
                     placeholder="••••••••" v-model="password" required style="padding-right: 40px;" />
              <button type="button" class="show-pw-btn" @click="showPassword = !showPassword" id="btn-toggle-pw">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center" style="margin-bottom: 24px;">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" id="check-remember" />
              <span>Ingat saya</span>
            </label>
            <a href="#" class="text-sm text-accent" id="link-forgot-pw">Lupa password?</a>
          </div>

          <button type="submit" class="btn btn-primary w-full btn-lg" id="btn-login" :disabled="loading">
            <span v-if="loading" class="animate-spin">⟳</span>
            <span v-else>Masuk →</span>
          </button>
        </form>

        <div class="login-demo-accounts" id="demo-accounts">
          <div class="divider"></div>
          <div class="text-xs text-tertiary text-center" style="margin-bottom: 12px;">Demo Akun</div>
          <div class="demo-account-list">
            <button v-for="acc in demoAccounts" :key="acc.email" class="demo-acc-btn"
                    @click="fillDemo(acc)" :id="`demo-${acc.role.toLowerCase().replace(' ', '-')}`">
              <span>{{ acc.icon }}</span>
              <span class="text-sm">{{ acc.role }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="login-footer text-xs text-tertiary text-center" style="margin-top: 24px;">
        PanelERP v2.0 · © 2026 · Versi Beta
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

const demoAccounts = [
  { icon: '👔', role: 'Direksi', email: 'direksi@panelei.com' },
  { icon: '🏗️', role: 'Project Manager', email: 'pm@panelei.com' },
  { icon: '🔧', role: 'Teknisi', email: 'teknisi@panelei.com' },
  { icon: '📦', role: 'Gudang', email: 'gudang@panelei.com' },
]

const fillDemo = (acc: { email: string }) => {
  email.value = acc.email
  password.value = 'demo123'
}

const handleLogin = async () => {
  loading.value = true
  await new Promise(r => setTimeout(r, 800))
  loading.value = false
  router.push('/dashboard')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--bg-primary);
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(59, 85, 168, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.bg-circuit {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 85, 168, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 85, 168, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}

.login-container {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: var(--space-6);
}

.login-logo {
  text-align: center;
  margin-bottom: var(--space-8);
}

.logo-icon-large {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto var(--space-4);
  box-shadow: 0 8px 24px rgba(59, 85, 168, 0.5);
}

.logo-brand {
  font-size: var(--text-4xl);
  font-weight: 800;
  background: linear-gradient(135deg, var(--logo-from), var(--logo-to));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-2);
}

.logo-subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.login-card {
  padding: var(--space-8);
  box-shadow: var(--shadow-xl), var(--shadow-glow);
}

.login-card-header {
  margin-bottom: var(--space-6);
}

.show-pw-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.login-demo-accounts {
  margin-top: var(--space-4);
}

.demo-account-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.demo-acc-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--text-xs);
}

.demo-acc-btn:hover {
  background: var(--bg-glass-hover);
  color: var(--text-primary);
  border-color: var(--border-default);
}
</style>
