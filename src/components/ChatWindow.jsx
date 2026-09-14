import { useEffect, useRef, useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import { supabase } from '../supabaseClient'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🤡', '💩']

function timeStr(ts) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatWindow({ me, friend }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [reactFor, setReactFor] = useState(null) // id tin nhắn đang mở popup reaction
  const bottomRef = useRef(null)

  // Tải lịch sử chat giữa me & friend
  useEffect(() => {
    setMessages([])
    setReactFor(null)
    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender.eq.${me.id},receiver.eq.${friend.id}),and(sender.eq.${friend.id},receiver.eq.${me.id})`
        )
        .order('created_at', { ascending: true })
      setMessages(data || [])
    }
    load()
  }, [me.id, friend.id])

  // Realtime: lắng nghe insert + update messages
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${me.id}-${friend.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new
          const relevant =
            (m.sender === me.id && m.receiver === friend.id) ||
            (m.sender === friend.id && m.receiver === me.id)
          if (relevant) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)))
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [me.id, friend.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const content = text.trim()
    if (!content) return
    setText('')
    setShowEmoji(false)
    // Optimistic update
    const temp = {
      id: 'temp-' + Date.now(),
      sender: me.id,
      receiver: friend.id,
      content,
      reaction: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, temp])

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender: me.id, receiver: friend.id, content })
      .select()
      .single()

    if (!error && data) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? data : m)))
    }
  }

  async function react(messageId, emoji) {
    setReactFor(null)
    if (String(messageId).startsWith('temp-')) return
    // toggle: nếu đang là emoji đó thì bỏ
    const current = messages.find((m) => m.id === messageId)?.reaction
    const next = current === emoji ? null : emoji
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reaction: next } : m)))
    await supabase.from('messages').update({ reaction: next }).eq('id', messageId)
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <span className="ava">{friend.avatar_emoji}</span>
        <span>{friend.username}</span>
      </div>

      <div className="messages">
        {messages.map((m) => {
          const mine = m.sender === me.id
          return (
            <div key={m.id} className={'msg-row ' + (mine ? 'mine' : 'theirs')}>
              <div className="bubble">
                {m.content}
                <div
                  className="react-btn"
                  onClick={() => setReactFor(reactFor === m.id ? null : m.id)}
                  title="Thả cảm xúc"
                >
                  🙂
                </div>
                {reactFor === m.id && (
                  <div className="react-popup">
                    {QUICK_REACTIONS.map((e) => (
                      <span key={e} onClick={() => react(m.id, e)}>{e}</span>
                    ))}
                  </div>
                )}
              </div>
              {m.reaction && <div className="reaction-badge">{m.reaction}</div>}
              <div className="msg-time">{timeStr(m.created_at)}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        {showEmoji && (
          <div className="emoji-panel">
            <EmojiPicker
              onEmojiClick={(ed) => setText((t) => t + ed.emoji)}
              width={320}
              height={380}
            />
          </div>
        )}
        <button className="icon-btn" onClick={() => setShowEmoji((s) => !s)} title="Emoji">
          😀
        </button>
        <input
          placeholder="Nhắn gì đó..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          onFocus={() => setShowEmoji(false)}
        />
        <button className="send" onClick={send} disabled={!text.trim()}>➤</button>
      </div>
    </div>
  )
}
