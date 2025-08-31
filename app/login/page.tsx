
'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="container">
      <h1 className="section-title">Login</h1>
      <p className="small">Enter your email to receive a magic link.</p>
      <form onSubmit={async (e)=>{
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL }
        });
        if (!error) setSent(true); else alert(error.message);
      }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{width:'100%', padding:12, borderRadius:10, border:'1px solid #1b2230', background:'#101621', color:'var(--fg)'}}
        />
        <div style={{height:8}}/>
        <button className="btn" style={{width:'100%'}}>Send magic link</button>
      </form>
      {sent && <p className="small">Magic link sent. Check your inbox.</p>}
    </div>
  );
}
