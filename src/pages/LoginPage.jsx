import { useState } from "react";
import { supabase } from "../supabaseClient";
import { AuthInput } from "../components/shared/AuthInput";
import { Spinner } from "../components/shared/Spinner";

export function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handle = async () => {
    setMsg(null);
    if (!form.email) return setMsg({type:"error",text:"Email obrigatório"});
    if (mode==="login" && !form.password) return setMsg({type:"error",text:"Senha obrigatória"});
    setLoading(true);
    try {
      if (mode==="login") {
        const { error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
        if (error) setMsg({type:"error",text:error.message});
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password.html`,
        });
        if (error) setMsg({type:"error",text:error.message});
        else setMsg({type:"success",text:"Link enviado! Verifique seu email."});
      }
    } finally { setLoading(false); }
  };

  const inp = (key) => ({
    value: form[key],
    onChange: e => setForm(p => ({...p, [key]: e.target.value})),
    onKeyDown: e => e.key==="Enter" && handle(),
  });

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp 0.4s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",padding:"10px 20px",borderRadius:12}}>
            <span style={{fontSize:22}}>📦</span>
            <span style={{color:"#e2e8f0",fontSize:17,fontWeight:700,letterSpacing:"-0.5px"}}>PSR | GALPÃO Pipeline</span>
          </div>
          <p style={{color:"#475569",marginTop:8,fontSize:12}}>Sistema interno — acesso restrito</p>
        </div>

        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:36,boxShadow:"0 32px 64px rgba(0,0,0,0.4)"}}>
          <h2 style={{color:"#f1f5f9",margin:"0 0 24px",fontSize:21,fontWeight:700}}>
            {mode==="login" ? "Entrar na conta" : "Recuperar senha"}
          </h2>

          <AuthInput label="Email" type="email" placeholder="seu@empresa.com" {...inp("email")} />
          {mode==="login" && <AuthInput label="Senha" type="password" placeholder="••••••••" {...inp("password")} />}

          {msg && (
            <div style={{background:msg.type==="error"?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${msg.type==="error"?"#ef4444":"#10b981"}`,color:msg.type==="error"?"#ef4444":"#10b981",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:16}}>
              {msg.text}
            </div>
          )}

          <button onClick={handle} disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1,fontFamily:"inherit"}}>
            {loading ? <Spinner /> : mode==="login" ? "Entrar" : "Enviar link de recuperação"}
          </button>

          <div style={{marginTop:20,textAlign:"center",fontSize:13}}>
            {mode==="login"
              ? <span style={{color:"#6366f1",cursor:"pointer"}} onClick={()=>{setMode("forgot");setMsg(null);}}>Esqueci minha senha</span>
              : <span style={{color:"#6366f1",cursor:"pointer"}} onClick={()=>{setMode("login");setMsg(null);}}>← Voltar ao login</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}