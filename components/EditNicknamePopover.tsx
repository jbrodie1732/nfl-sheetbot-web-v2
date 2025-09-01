
// components/EditNicknamePopover.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function EditNicknamePopover(){
  const [open, setOpen] = useState(false)
  const [nick, setNick] = useState('')
  const [orig, setOrig] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const panelRef = useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true); setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user){ setLoading(false); return }
      const { data, error } = await supabase
        .from('profile')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!mounted) return
      if (error) setError(null)
      const fallback = (user.email || '').split('@')[0] || ''
      const current = (data?.nickname ?? '').trim() || fallback
      setNick(current); setOrig(current)
      setLoading(false)
    }
    load()
    return ()=>{ mounted = false }
  }, [])

  useEffect(()=>{
    function onDocClick(e: MouseEvent){
      if (!open) return
      if (panelRef.current && !panelRef.current.contains(e.target as Node)){
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return ()=> document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function onSave(){
    const trimmed = nick.trim().slice(0, 32)
    if (!trimmed) return
    setSaving(true); setError(null)
    const { error } = await supabase.rpc('set_my_nickname', { p_nickname: trimmed })
    setSaving(false)
    if (error){ setError(error.message); return }
    setOrig(trimmed)
    setOpen(false)
    if (typeof window !== 'undefined'){
      window.dispatchEvent(new CustomEvent('sheetmeat:profile-updated'))
    }
  }

  const disabled = loading || saving || nick.trim() === '' || nick.trim() === orig.trim()

  return (
    <div className="nick-wrap" style={{position:'relative', display:'inline-block'}}>
      <button className="tile-btn" onClick={()=> setOpen(v=>!v)} aria-expanded={open}>
        ✏️ Edit nickname
      </button>

      {open && (
        <div ref={panelRef} className="popover" role="dialog" aria-label="Edit nickname">
          <div className="row">
            <input
              value={nick}
              onChange={e=> setNick(e.target.value)}
              aria-label="Nickname"
              placeholder="Your nickname"
              maxLength={32}
              disabled={loading || saving}
            />
            <button onClick={onSave} disabled={disabled}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {error && <div className="err">Error: {error}</div>}
        </div>
      )}

      <style jsx>{`
        .tile-btn{
          display:inline-flex; align-items:center; gap:8px;
          padding:6px 10px; border-radius:12px;
          border:1px solid #d1d5db; background:#ffffff; color:#374151;
          font-size:13px; font-weight:700;
          box-shadow:0 1px 0 rgba(17,24,39,0.03);
        }
        .tile-btn:hover{ background:#f9fafb; }
        .popover{
          position:absolute; right:0; top: calc(100% + 8px);
          min-width:280px; background:#fff; border:1px solid #e5e7eb; border-radius:12px;
          box-shadow:0 8px 28px rgba(0,0,0,0.08);
          padding:10px;
          z-index:60;
        }
        .row{ display:flex; align-items:center; gap:8px; }
        input{
          flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:6px 8px;
          font-size:14px; color:#111827; outline:none;
        }
        button{
          padding:6px 10px; border-radius:10px; border:1px solid #d1d5db;
          background:#111827; color:#fff; font-weight:700; font-size:13px;
        }
        button:disabled{ opacity:.5; cursor:not-allowed; }
        .err{ margin-top:6px; font-size:12px; color:#dc2626; }
      `}</style>
    </div>
  )
}
