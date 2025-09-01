// components/HeaderMenu.tsx (vertical stack + compact font)
'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function HeaderMenu(){
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement|null>(null)

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

  const close = () => setOpen(false)

  return (
    <div className="hm-wrap">
      <button
        className="hm-btn"
        onClick={()=> setOpen(v=>!v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open menu"
      >
        <span className="bars" aria-hidden>☰</span>
      </button>

      {open && (
        <div ref={panelRef} className="hm-pop" role="menu" aria-label="Main menu">
          <Link href="/" className="hm-item" role="menuitem" onClick={close}>🏟️ Home</Link>
          <Link href="/leaderboard" className="hm-item" role="menuitem" onClick={close}>🏆 Leaderboard</Link>
          {/* Add more links later */}
        </div>
      )}

      <style jsx>{`
        .hm-wrap{ position: relative; }
        .hm-btn{
          display:inline-flex; align-items:center; justify-content:center;
          width: 36px; height: 32px; border-radius:10px;
          border:1px solid #d1d5db; background:#fff; color:#111827;
          font-weight:800;
        }
        .hm-btn:hover{ background:#ffffff; }
        .bars{ font-size:16px; line-height:1; }

        .hm-pop{
          position:absolute; right:0; top: calc(100% + 8px);
          min-width: 150px;
          display:flex; flex-direction: column;
          background:transparent; border:1px solid #e5e7eb; border-radius:12px;
          box-shadow:0 8px 28px rgba(0,0,0,.08);
          padding:6px;
          z-index:70;
        }

        /* Each item on its own line (single-column stack) */
        .hm-item{
          display:block;
          width:100%;
          padding:8px 10px;
          border-radius:8px;
          text-decoration:none;
          color:#111827;
          font-weight:500;
          font-size:10px;           /* compact by default */
          line-height:1.25;
          white-space:nowrap;
        }
        .hm-item:hover{ background:#ffffff; }

        @media (max-width:480px){
          .hm-btn{ width:32px; height:30px; }
          .hm-item{ font-size:10px; padding:8px 8px; }
        }
      `}</style>
    </div>
  )
}
