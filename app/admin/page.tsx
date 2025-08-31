
'use client';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

type Job = { id: number; kind: string; status: string; created_at: string; updated_at: string };

const KINDS = ['INGEST','FREEZE','VERIFY','OPEN_NOW','INGEST_RESULTS'];

export default function AdminPage() {
  const [email,setEmail] = useState<string|null>(null);
  const [jobs,setJobs] = useState<Job[]>([]);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    load();
  }, []);

  async function load(){
    const { data } = await supabase.from('admin_job').select('*').order('id', { ascending: false }).limit(25);
    setJobs((data as Job[]) ?? []);
  }

  async function enqueue(kind: string){
    const { error } = await supabase.from('admin_job').insert({ kind, status:'queued' });
    if (error) alert(error.message); else load();
  }

  if (!email) return <div className="container"><p>Checking auth…</p></div>;
  if (email !== adminEmail) return <div className="container"><p>Not authorized.</p></div>;

  return (
    <div className="container">
      <h1 className="section-title">Admin</h1>
      <div className="grid">
        {KINDS.map(k => (
          <button key={k} className="btn" onClick={()=>enqueue(k)}>Enqueue: {k}</button>
        ))}
      </div>
      <h3 className="section-title">Recent Jobs</h3>
      <div className="card">
        {jobs.map(j=>(
          <div key={j.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto', gap:8, padding:'6px 0', borderBottom:'1px solid #1b2230'}}>
            <span className="small">#{j.id} {j.kind}</span>
            <span className="small">{j.status}</span>
            <span className="small">{new Date(j.updated_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
