import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/shared/Modal";
import { FormField } from "../components/shared/FormField";
import { ALL_PERMISSIONS, COMPANIES, fieldStyle } from "../constants";

function PermGrid({ perms, onChange }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
      {ALL_PERMISSIONS.map(p=>(
        <label key={p.key} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",padding:"6px 9px",background:"rgba(255,255,255,0.03)",borderRadius:6,border:`1px solid ${perms[p.key]?"rgba(99,102,241,0.35)":"#334155"}`}}>
          <input type="checkbox" checked={!!perms[p.key]} onChange={()=>onChange(p.key)} style={{accentColor:"#6366f1",width:14,height:14}} />
          <span style={{fontSize:11,color:perms[p.key]?"#c7d2fe":"#64748b"}}>{p.label}</span>
        </label>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { showToast, profile: me, locationTags, setLocationTags, activeCompany } = useApp();
  const [tab, setTab]           = useState("users");
  const [users, setUsers]       = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newLocTag, setNewLocTag]     = useState("");
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"user", companies:[], permissions:{} });
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));

  const toggleCompany = (arr, co) => arr.includes(co) ? arr.filter(x=>x!==co) : [...arr,co];
  const togglePerm    = (perms, key) => ({...perms,[key]:!perms[key]});

  useEffect(() => {
    supabase.from("profiles").select("*").then(({ data }) => { if (data) setUsers(data); });
  }, []);

  const createUser = async () => {
    if (!form.name||!form.email||!form.password) return showToast("Preencha nome, email e senha","error");
    if (form.role==="user" && form.companies.length===0) return showToast("Selecione ao menos uma empresa","error");
    const { data: authData, error } = await supabase.auth.signUp({
      email: form.email, password: form.password, options:{ data:{ name:form.name } }
    });
    if (error) return showToast(error.message,"error");
    if (authData.user) {
      await supabase.from("profiles").update({ role:form.role, name:form.name, companies:form.companies, permissions:form.permissions }).eq("id",authData.user.id);
      const { data } = await supabase.from("profiles").select("*");
      if (data) setUsers(data);
    }
    setForm({ name:"", email:"", password:"", role:"user", companies:[], permissions:{} });
    showToast("Usuário criado! Ele deve redefinir a senha via email.");
  };

  const saveUser = async () => {
    await supabase.from("profiles").update({ name:editingUser.name, role:editingUser.role, companies:editingUser.companies||[], permissions:editingUser.permissions||{} }).eq("id",editingUser.id);
    setUsers(prev=>prev.map(u=>u.id===editingUser.id?{...u,...editingUser}:u));
    setEditingUser(null); showToast("Usuário atualizado!");
  };

  const addLocTag = async () => {
    if (!newLocTag.trim()) return;
    const { data, error } = await supabase.from("location_tags").insert({ name:newLocTag.trim(), company:activeCompany }).select().single();
    if (error) return showToast(error.message,"error");
    setLocationTags(prev=>[...prev,data]); setNewLocTag(""); showToast("Tag criada!");
  };

  const delLocTag = async id => {
    await supabase.from("location_tags").delete().eq("id",id);
    setLocationTags(prev=>prev.filter(t=>t.id!==id));
    showToast("Tag removida","warning");
  };

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)} style={{background:tab===id?"rgba(99,102,241,0.2)":"transparent",color:tab===id?"#818cf8":"#64748b",border:tab===id?"1px solid rgba(99,102,241,0.4)":"1px solid transparent",borderRadius:7,padding:"6px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>
  );

  return (
    <div style={{maxWidth:820}}>
      <h1 style={{margin:"0 0 18px",fontSize:21,fontWeight:700}}>Administração</h1>
      <div style={{display:"flex",gap:6,marginBottom:22}}>
        {tabBtn("users","👥 Usuários")}
        {tabBtn("tags","📍 Tags de Localização")}
      </div>

      {tab==="users" && <>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:20,marginBottom:18}}>
          <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:14}}>Cadastrar novo usuário</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FormField label="Nome completo"><input value={form.name} onChange={upd("name")} placeholder="Nome" style={fieldStyle} /></FormField>
            <FormField label="Email"><input value={form.email} onChange={upd("email")} type="email" placeholder="email@empresa.com" style={fieldStyle} /></FormField>
            <FormField label="Senha temporária"><input value={form.password} onChange={upd("password")} type="password" placeholder="••••••••" style={fieldStyle} /></FormField>
            <FormField label="Perfil">
              <select value={form.role} onChange={upd("role")} style={{...fieldStyle,cursor:"pointer"}}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </FormField>
          </div>
          <FormField label="Acesso às empresas">
            <div style={{display:"flex",gap:8}}>
              {COMPANIES.map(co=>(
                <button key={co} type="button" onClick={()=>setForm(p=>({...p,companies:toggleCompany(p.companies,co)}))} style={{background:form.companies.includes(co)?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",color:form.companies.includes(co)?"#818cf8":"#64748b",border:`1px solid ${form.companies.includes(co)?"#6366f1":"#334155"}`,borderRadius:8,padding:"6px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{co}</button>
              ))}
            </div>
          </FormField>
          {form.role==="user" && (
            <FormField label="Permissões">
              <PermGrid perms={form.permissions} onChange={key=>setForm(p=>({...p,permissions:togglePerm(p.permissions,key)}))} />
            </FormField>
          )}
          <button onClick={createUser} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:9,padding:"9px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>+ Cadastrar</button>
        </div>

        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Usuários ({users.length})</div>
          {users.map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderBottom:"1px solid #334155"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#fff",flexShrink:0}}>
                {(u.name||"U")[0].toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{u.name} {u.id===me?.id&&<span style={{fontSize:10,color:"#64748b"}}>(você)</span>}</div>
                <div style={{fontSize:11,color:"#64748b",display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                  <span>{u.role==="admin"?"👑 Admin":"👤 Usuário"}</span>
                  {(u.companies||[]).map(co=><span key={co} style={{background:"rgba(99,102,241,0.15)",color:"#818cf8",padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:600}}>{co}</span>)}
                </div>
              </div>
              {u.id!==me?.id && (
                <button onClick={()=>setEditingUser({...u,companies:u.companies||[],permissions:u.permissions||{}})} style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)",borderRadius:7,padding:"4px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Editar</button>
              )}
            </div>
          ))}
        </div>
      </>}

      {tab==="tags" && (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>Tags de localização — {activeCompany}</div>
          <div style={{fontSize:12,color:"#64748b",marginBottom:16}}>Para filtrar clientes por região e agilizar ligações</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            <input value={newLocTag} onChange={e=>setNewLocTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLocTag()} placeholder="Ex: Asa Norte, Taguatinga, Gama..." style={{...fieldStyle,flex:1}} />
            <button onClick={addLocTag} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:7,padding:"0 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Criar</button>
          </div>
          {locationTags.length===0
            ? <div style={{color:"#475569",fontSize:12,textAlign:"center",padding:20}}>Nenhuma tag criada ainda</div>
            : <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {locationTags.map(lt=>(
                  <div key={lt.id} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)",borderRadius:8,padding:"6px 12px"}}>
                    <span style={{fontSize:12,color:"#22d3ee",fontWeight:600}}>📍 {lt.name}</span>
                    <button onClick={()=>delLocTag(lt.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {editingUser && (
        <Modal title={`Editar — ${editingUser.name}`} onClose={()=>setEditingUser(null)} width={560}>
          <FormField label="Nome"><input value={editingUser.name} onChange={e=>setEditingUser(p=>({...p,name:e.target.value}))} style={fieldStyle} /></FormField>
          <FormField label="Perfil">
            <select value={editingUser.role} onChange={e=>setEditingUser(p=>({...p,role:e.target.value}))} style={{...fieldStyle,cursor:"pointer"}}>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </FormField>
          <FormField label="Acesso às empresas">
            <div style={{display:"flex",gap:8}}>
              {COMPANIES.map(co=>(
                <button key={co} type="button" onClick={()=>setEditingUser(p=>({...p,companies:toggleCompany(p.companies||[],co)}))} style={{background:(editingUser.companies||[]).includes(co)?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",color:(editingUser.companies||[]).includes(co)?"#818cf8":"#64748b",border:`1px solid ${(editingUser.companies||[]).includes(co)?"#6366f1":"#334155"}`,borderRadius:8,padding:"6px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{co}</button>
              ))}
            </div>
          </FormField>
          {editingUser.role==="user" && (
            <FormField label="Permissões">
              <PermGrid perms={editingUser.permissions||{}} onChange={key=>setEditingUser(p=>({...p,permissions:togglePerm(p.permissions||{},key)}))} />
            </FormField>
          )}
          <button onClick={saveUser} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Salvar alterações</button>
        </Modal>
      )}
    </div>
  );
}