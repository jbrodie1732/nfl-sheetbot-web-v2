// hooks/useCountdownSmart.ts
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

function format(parts: {d:number,h:number,m:number,s:number}){
  const { d, h, m, s } = parts
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function useCountdownSmart(targetISO: string){
  const target = useMemo(()=> new Date(targetISO).getTime(), [targetISO])
  const [now, setNow] = useState(()=> Date.now())
  const idRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(()=>{
    function tick(){
      setNow(Date.now())
      const msLeft = target - Date.now()
      let interval = 60_000 // default: 1 min
      if (msLeft <= 60*60*1000) interval = 1_000       // < 1h: every second
      else if (msLeft <= 6*60*60*1000) interval = 15_000 // < 6h: every 15s

      if (idRef.current) clearTimeout(idRef.current)
      idRef.current = setTimeout(tick, interval)
    }
    tick()
    return ()=>{ if (idRef.current) clearTimeout(idRef.current) }
  }, [target])

  const ms = Math.max(0, target - now)
  const s = Math.floor(ms/1000)%60
  const m = Math.floor(ms/60000)%60
  const h = Math.floor(ms/3600000)%24
  const d = Math.floor(ms/86400000)

  return { msLeft: ms, parts: { d,h,m,s }, label: format({ d,h,m,s }), isPast: ms === 0 }
}
