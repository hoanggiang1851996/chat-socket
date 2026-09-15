import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import FriendsSidebar, { PUBLIC_ROOM } from './components/FriendsSidebar'
import ChatWindow from './components/ChatWindow'
import { requestNotifyPermission, notifyMessage } from './notify'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeFriend, setActiveFriend] = useState(null)
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState([]) // hộp thoại tin nhắn mới ở góc
  const activeFriendRef = useRef(null)

  function pushToast(t) {
    setToasts((prev) => [...prev.filter((x) => x.key !== t.key), t].slice(-3))
    // Tự ẩn sau 6 giây
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id))
    }, 6000)
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }

  function openFromToast(t) {
    setActiveFriend(t.friend)
    dismissToast(t.id)
    window.focus()
  }

  // Giữ ref luôn đồng bộ với bạn chat đang mở để listener notify đọc được giá trị mới nhất
  useEffect(() => {
    activeFriendRef.current = activeFriend
  }, [activeFriend])

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

  // Xin quyền thông báo sau khi có profile
  useEffect(() => {
    if (profile) requestNotifyPermission()
  }, [profile])

  // Lắng nghe tin nhắn mới trên toàn app để báo tiếng + hiện thông báo kiểu FB
  useEffect(() => {
    if (!profile) return
    const ch = supabase
      .channel(`notify-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const m = payload.new
          // Bỏ qua tin do chính mình gửi
          if (m.sender === profile.id) return
          // Chỉ quan tâm tin gửi cho mình (1-1) hoặc phòng chung
          const isRoom = m.receiver === null
          const toMe = m.receiver === profile.id
          if (!isRoom && !toMe) return

          // Đang mở đúng cuộc trò chuyện và cửa sổ đang focus -> không cần noti
          const active = activeFriendRef.current
          const viewingThis = active && (active.isRoom ? isRoom : active.id === m.sender)
          const focused = document.visibilityState === 'visible' && document.hasFocus()
          if (viewingThis && focused) return

          // Lấy tên người gửi
          let sender = null
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_emoji')
            .eq('id', m.sender)
            .maybeSingle()
          if (data) sender = data
          const name = sender ? `${sender.avatar_emoji || ''} ${sender.username}`.trim() : 'Tin nhắn mới'
          const title = isRoom ? `${name} (Phòng chung)` : name

          // Thông báo hệ thống + âm thanh
          notifyMessage(title, m.content)

          // Hộp thoại trong trang (bấm vào để mở cuộc trò chuyện)
          const friend = isRoom
            ? PUBLIC_ROOM
            : sender
            ? { id: sender.id, username: sender.username, avatar_emoji: sender.avatar_emoji }
            : null
          if (friend) {
            pushToast({
              id: m.id,
              key: isRoom ? 'room' : friend.id, // gộp theo nguồn để không dồn quá nhiều
              avatar: friend.avatar_emoji,
              title,
              body: m.content,
              friend,
            })
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

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

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast" onClick={() => openFromToast(t)}>
            <span className="toast-ava">{t.avatar}</span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              <div className="toast-text">{t.body}</div>
            </div>
            <button
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(t.id)
              }}
              title="Đóng"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
