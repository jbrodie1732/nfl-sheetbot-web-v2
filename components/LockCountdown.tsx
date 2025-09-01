// components/LockCountdown.tsx
'use client'
import { useCountdownSmart } from '@/hooks/useCountdownSmart'

export default function LockCountdown({ startsAtISO }:{ startsAtISO: string }){
  const { label, isPast } = useCountdownSmart(startsAtISO)
  const emoji = isPast ? '🔒' : '🔓'
  const text = isPast ? 'Locked' : `Locks in ${label}`
  return (
    <div className={`lock-pill ${isPast ? 'locked' : 'open'}`} title={new Date(startsAtISO).toLocaleString()}>
      <span className="emoji">{emoji}</span>
      <span>{text}</span>
      <style jsx>{`
        .lock-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 2px 8px; border-radius: 9999px; font-size: 12px;
          border: 1px solid #e5e7eb; color: #374151; background: #fff;
        }
        .lock-pill.locked { background: #f3f4f6; color: #6b7280; }
        .emoji { opacity: 0.9; }
      `}</style>
    </div>
  )
}
