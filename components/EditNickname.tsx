// components/EditNickname.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function EditNickname(){
  const [nick, setNick] = useState('')
  const [orig, setOrig] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string|null>(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user){ setLoading(false); return }
      const { data, error } = await supabase
        .from('profile')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!mounted) return
      if (error) {
        setError(null)
      }
      const fallback = (user.email || '').split('@')[0] || ''
      const current = (data?.nickname ?? '').trim() || fallback
      setNick(current)
      setOrig(current)
      setLoading(false)
    }
    load()
    return ()=>{ mounted = false }
  }, [])

  async function onSave(){
    const trimmed = nick.trim().slice(0, 32)
    if (!trimmed) return
    setSaving(true); setError(null); setSaved(false)
    const { error } = await supabase.rpc('set_my_nickname', { p_nickname: trimmed })
    setSaving(false)
    if (error){ setError(error.message); return }
    setOrig(trimmed)
    setSaved(true)
    setTimeout(()=> setSaved(false), 1500)
  }

  const disabled = loading || saving || nick.trim() === '' || nick.trim() === orig.trim()

  return (
    <div className="editNick" role="group" aria-label="Edit your display nickname">
      <input
        value={nick}
        onChange={e=> setNick(e.target.value)}
        aria-label="Nickname"
        placeholder="Your nickname"
        maxLength={32}
      />
      <button onClick={onSave} disabled={disabled}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <span className="saved">Saved</span>}
      {error && <span className="err">Error: {error}</span>}

      <style jsx>{`
        .editNick {
          display:flex;
          align-items:center;
          gap:8px;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:6px 8px;
          box-shadow: 0 1px 0 rgba(17,24,39,0.03);
        }
        input {
          border:none;
          outline:none;
          padding:4px 6px;
          min-width: 160px;
          width: 200px;
          font-size:14px;
          color:#111827;
        }
        button {
          padding:6px 10px;
          border-radius:10px;
          border:1px solid #d1d5db;
          background:#111827;
          color:#fff;
          font-weight:700;
          font-size:13px;
        }
        button:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }
        .saved{
          margin-left:6px;
          font-size:12px;
          color:#059669;
          font-weight:700;
        }
        .err{
          margin-left:6px;
          font-size:12px;
          color:#dc2626;
        }
      `}</style>
    </div>
  )
}
