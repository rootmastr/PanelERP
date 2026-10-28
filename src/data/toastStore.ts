import { reactive } from 'vue'

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

const state = reactive<{
  toasts: ToastMessage[]
}>({
  toasts: []
})

let nextId = 1

/** Timer auto-dismiss per toast — supaya bisa dijeda saat kursor hover. */
interface ToastTimer { duration: number; handle: ReturnType<typeof setTimeout> | null }
const timers = new Map<number, ToastTimer>()

export function useToast() {
  const show = (title: string, message: string, type: ToastMessage['type'] = 'success', duration = 3500) => {
    const id = nextId++
    state.toasts.push({ id, type, title, message })
    timers.set(id, { duration, handle: setTimeout(() => remove(id), duration) })
  }

  /** Hentikan hitung mundur (dipanggil saat kursor hover toast). */
  const pause = (id: number) => {
    const timer = timers.get(id)
    if (!timer?.handle) return
    clearTimeout(timer.handle)
    timer.handle = null
  }

  /** Lanjutkan hitung mundur (kursor meninggalkan toast). */
  const resume = (id: number) => {
    const timer = timers.get(id)
    if (!timer || timer.handle) return
    timer.handle = setTimeout(() => remove(id), timer.duration)
  }

  const success = (title: string, message: string) => show(title, message, 'success')
  const error = (title: string, message: string) => show(title, message, 'error')
  const warning = (title: string, message: string) => show(title, message, 'warning')
  const info = (title: string, message: string) => show(title, message, 'info')

  /** Umpan balik jujur untuk aksi yang belum tersedia di prototipe. */
  const notReady = (feature: string) =>
    show(feature, 'Belum tersedia di prototipe — akan aktif setelah integrasi API.', 'info')

  const remove = (id: number) => {
    const timer = timers.get(id)
    if (timer?.handle) clearTimeout(timer.handle)
    timers.delete(id)
    const index = state.toasts.findIndex(t => t.id === id)
    if (index !== -1) {
      state.toasts.splice(index, 1)
    }
  }

  return {
    toasts: state.toasts,
    show,
    success,
    error,
    warning,
    info,
    notReady,
    pause,
    resume,
    remove
  }
}
