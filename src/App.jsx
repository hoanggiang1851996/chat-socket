import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import FriendsSidebar from './components/FriendsSidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeFriend, setActiveFriend] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setActiveFriend(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Lấy profile của user hiện tại.
  // Vừa đăng nhập ẩn danh xong, dòng profile có thể chưa insert kịp,
  // nên thử lại vài lần cho tới khi thấy profile.
  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    async function load(attempt = 0) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setProfile(data)
      } else if (attempt < 10) {
        setTimeout(() => load(attempt + 1), 400)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session])

  // Cập nhật last_seen định kỳ (trạng thái online)
  useEffect(() => {
    if (!profile) return
    const beat = () =>
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id)
    beat()
    const t = setInterval(beat, 20000)
    return () => clearInterval(t)
  }, [profile])

  async function logout() {
    await supabase.auth.signOut()
  }

  if (!ready) return null
  if (!session) return <Auth />
  // Có session nhưng profile chưa load xong (hoặc chưa tạo)
  if (!profile) return <Auth />

  return (
    <div className="app">
      <FriendsSidebar
        profile={profile}
        activeFriend={activeFriend}
        onSelect={setActiveFriend}
        onLogout={logout}
      />
      {activeFriend ? (
        <ChatWindow me={profile} friend={activeFriend} />
      ) : (
        <div className="chat">
          <div className="chat-empty">
            <div style={{ fontSize: 48 }}>💬</div>
            <div>Chọn một người bạn để bắt đầu chat</div>
          </div>
        </div>
      )}
    </div>
  )
}
