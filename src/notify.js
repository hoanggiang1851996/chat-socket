// Tiện ích thông báo: âm thanh "ting" + thông báo hệ thống kiểu FB

// Xin quyền hiển thị thông báo (gọi 1 lần sau khi user đăng nhập)
export function requestNotifyPermission() {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

// Phát tiếng thông báo ngắn bằng Web Audio (không cần file mp3)
let audioCtx = null
export function playPing() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const now = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)

    // Hai nốt nhẹ giống tiếng báo tin nhắn
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1175, now + 0.12)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc.start(now)
    osc.stop(now + 0.36)
  } catch {
    /* ignore */
  }
}

// Hiện thông báo hệ thống
export function showNotification(title, body) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (document.visibilityState === 'visible' && document.hasFocus()) return
    const n = new Notification(title, { body, icon: '/vite.svg', tag: 'chat-msg' })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* ignore */
  }
}

// Gộp: báo tiếng + noti
export function notifyMessage(title, body) {
  playPing()
  showNotification(title, body)
}
