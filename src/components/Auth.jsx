import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ConnectionStatus from './ConnectionStatus'

const EMOJIS = ['🙂', '😎', '🐱', '🐶', '🦊', '🐸', '🦄', '👾', '🤖', '🍕']

export default function Auth() {
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('🙂')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const name = username.trim()
    if (!name) {
      setError('Nhập biệt danh nhé')
      return
    }
    setLoading(true)
    try {
      // Đăng nhập ẩn danh -> vẫn có user id thật cho RLS & realtime
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error
      const uid = data.user?.id
      if (!uid) throw new Error('Không tạo được phiên đăng nhập')

      const { error: pErr } = await supabase.from('profiles').insert({
        id: uid,
        username: name,
        avatar_emoji: avatar,
      })
      if (pErr) throw pErr
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <ConnectionStatus />
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>SupaChat 💬</h1>
        <p className="sub">Nhập biệt danh là chat được ngay</p>

        {error && <div className="auth-error">{error}</div>}

        <input
          placeholder="Biệt danh của bạn"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {EMOJIS.map((e) => (
            <span
              key={e}
              onClick={() => setAvatar(e)}
              style={{
                fontSize: 26,
                cursor: 'pointer',
                padding: 4,
                borderRadius: 8,
                background: avatar === e ? '#e7f3ff' : 'transparent',
              }}
            >
              {e}
            </span>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Vào chat 🚀'}
        </button>
      </form>
    </div>
  )
}
