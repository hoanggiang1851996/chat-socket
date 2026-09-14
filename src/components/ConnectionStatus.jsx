import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// Ping thử Supabase: query nhẹ vào bảng profiles.
// - ok: kết nối + schema + RLS đều chạy
// - lỗi: hiện thông báo cụ thể để biết fix ở đâu
export default function ConnectionStatus() {
  const [state, setState] = useState({ status: 'checking', msg: 'Đang kiểm tra kết nối Supabase...' })

  useEffect(() => {
    let cancelled = false
    async function check() {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!url || !key) {
        if (!cancelled) setState({ status: 'error', msg: 'Chưa cấu hình .env (thiếu URL hoặc ANON KEY)' })
        return
      }
      const { error } = await supabase.from('profiles').select('id').limit(1)
      if (cancelled) return
      if (error) {
        setState({ status: 'error', msg: 'Lỗi: ' + error.message })
      } else {
        setState({ status: 'ok', msg: 'Đã kết nối Supabase ✔' })
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  const color =
    state.status === 'ok' ? '#31a24c' : state.status === 'error' ? '#e41e3f' : '#8a8d91'

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#fff',
        color,
        padding: '8px 16px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 10px rgba(0,0,0,.15)',
        zIndex: 100,
        maxWidth: '90vw',
      }}
    >
      <span style={{ marginRight: 6 }}>
        {state.status === 'ok' ? '🟢' : state.status === 'error' ? '🔴' : '⚪'}
      </span>
      {state.msg}
    </div>
  )
}
