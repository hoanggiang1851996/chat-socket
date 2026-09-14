import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const ONLINE_MS = 40000 // coi là online nếu last_seen trong 40s

// Phòng chat chung: ai cũng thấy, không cần kết bạn
export const PUBLIC_ROOM = { id: 'public', username: 'Kênh chung', avatar_emoji: '🌐', isRoom: true }

function isOnline(lastSeen) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_MS
}

export default function FriendsSidebar({ profile, activeFriend, onSelect, onLogout }) {
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([]) // lời mời gửi đến mình
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  // Tải danh sách bạn bè + lời mời
  const loadFriends = useCallback(async () => {
    const { data: rows } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester.eq.${profile.id},addressee.eq.${profile.id}`)

    if (!rows) return

    const accepted = rows.filter((r) => r.status === 'accepted')
    const incoming = rows.filter((r) => r.status === 'pending' && r.addressee === profile.id)

    const friendIds = accepted.map((r) => (r.requester === profile.id ? r.addressee : r.requester))
    const requesterIds = incoming.map((r) => r.requester)
    const allIds = [...new Set([...friendIds, ...requesterIds])]

    let profilesById = {}
    if (allIds.length) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', allIds)
      profilesById = Object.fromEntries((profs || []).map((p) => [p.id, p]))
    }

    setFriends(friendIds.map((id) => profilesById[id]).filter(Boolean))
    setPending(
      incoming
        .map((r) => ({ ...profilesById[r.requester], _friendshipId: r.id }))
        .filter((p) => p.id)
    )
  }, [profile.id])

  useEffect(() => {
    loadFriends()
    // realtime khi có thay đổi friendships liên quan tới mình
    const ch = supabase
      .channel('friendships-' + profile.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => loadFriends()
      )
      .subscribe()
    const poll = setInterval(loadFriends, 20000) // refresh trạng thái online
    return () => {
      supabase.removeChannel(ch)
      clearInterval(poll)
    }
  }, [loadFriends, profile.id])

  // Tìm kiếm người dùng theo biệt danh
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${q}%`)
        .neq('id', profile.id)
        .limit(10)
      setResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [query, profile.id])

  async function addFriend(target) {
    await supabase.from('friendships').insert({
      requester: profile.id,
      addressee: target.id,
      status: 'pending',
    })
    setQuery('')
    setResults([])
    loadFriends()
  }

  async function accept(friendshipId) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    loadFriends()
  }

  const friendIdSet = new Set(friends.map((f) => f.id))
  const pendingIdSet = new Set(pending.map((f) => f.id))

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="me">
          <span className="ava">{profile.avatar_emoji}</span>
          <span>{profile.username}</span>
        </div>
        <button className="logout" onClick={onLogout}>Thoát</button>
      </div>

      <div className="search-box">
        <input
          placeholder="🔍 Tìm bạn theo biệt danh..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((u) => (
            <div className="friend-item" key={u.id}>
              <span className="ava">{u.avatar_emoji}</span>
              <div>
                <div className="name">{u.username}</div>
                <div className="sub">
                  {friendIdSet.has(u.id)
                    ? 'Đã là bạn'
                    : pendingIdSet.has(u.id)
                    ? 'Đang chờ'
                    : ''}
                </div>
              </div>
              {!friendIdSet.has(u.id) && !pendingIdSet.has(u.id) && (
                <button className="btn-mini" onClick={() => addFriend(u)}>Kết bạn</button>
              )}
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div className="section-label">Lời mời kết bạn</div>
          {pending.map((u) => (
            <div className="friend-item" key={u._friendshipId}>
              <span className="ava">{u.avatar_emoji}</span>
              <div>
                <div className="name">{u.username}</div>
                <div className="sub">muốn kết bạn</div>
              </div>
              <button className="btn-mini" onClick={() => accept(u._friendshipId)}>
                Chấp nhận
              </button>
            </div>
          ))}
        </>
      )}

      <div className="section-label">Phòng chung</div>
      <div
        className={'friend-item' + (activeFriend?.id === PUBLIC_ROOM.id ? ' active' : '')}
        onClick={() => onSelect(PUBLIC_ROOM)}
      >
        <span className="ava">{PUBLIC_ROOM.avatar_emoji}</span>
        <div>
          <div className="name">{PUBLIC_ROOM.username}</div>
          <div className="sub">Chat với tất cả mọi người</div>
        </div>
      </div>

      <div className="section-label">Bạn bè</div>
      <div className="friend-list">
        {friends.length === 0 && (
          <div style={{ padding: '12px 16px', color: '#65676b', fontSize: 14 }}>
            Chưa có bạn nào. Tìm và kết bạn ở trên nhé!
          </div>
        )}
        {friends.map((f) => (
          <div
            key={f.id}
            className={'friend-item' + (activeFriend?.id === f.id ? ' active' : '')}
            onClick={() => onSelect(f)}
          >
            <span className="ava">
              {f.avatar_emoji}
              {isOnline(f.last_seen) && <span className="dot" />}
            </span>
            <div>
              <div className="name">{f.username}</div>
              <div className="sub">{isOnline(f.last_seen) ? 'Đang hoạt động' : 'Ngoại tuyến'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
