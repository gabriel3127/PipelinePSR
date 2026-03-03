import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import * as XLSX from "xlsx";
import { differenceInDays, parseISO, format } from "date-fns";
import { supabase } from './supabaseClient';

// ============================================================
// CONTEXTS & HOOKS
// ============================================================
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, show, dismiss };
}

// ============================================================
// CONSTANTS
// ============================================================
const COLORS = ["#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#10b981","#14b8a6","#06b6d4","#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#64748b","#475569"];
const TAG_COLORS = { "VIP":"#f59e0b","Alto Valor":"#ef4444","Recorrente":"#10b981","Novo":"#3b82f6","Inativo":"#64748b" };
const fieldStyle = { width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:13,outline:"none",fontFamily:"'Sora',sans-serif",boxSizing:"border-box" };

// ============================================================
// SHARED COMPONENTS
// ============================================================
const Spinner = ({ size=20 }) => (
  <div style={{width:size,height:size,border:`2px solid rgba(255,255,255,0.2)`,borderTop:`2px solid #fff`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}} />
);

const Toast = ({ toasts, onDismiss }) => (
  <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => onDismiss(t.id)} style={{
        background:t.type==="error"?"#ef4444":t.type==="warning"?"#f59e0b":"#10b981",
        color:"#fff",padding:"12px 20px",borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
        cursor:"pointer",maxWidth:320,fontSize:14,fontWeight:500,display:"flex",alignItems:"center",gap:10,
      }}>
        <span>{t.type==="error"?"\u2715":t.type==="warning"?"\u26a0":"\u2713"}</span>
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

function Modal({ title, onClose, children, width=480 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid #334155",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#1e293b",zIndex:1}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#f1f5f9"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>\u00d7</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{marginBottom:16}}>
      <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | forgot
  const [form, setForm] = useState({ email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handle = async () => {
    setMsg(null);
    if (!form.email) return setMsg({type:"error",text:"Email obrigat\u00f3rio"});
    if (mode==="login" && !form.password) return setMsg({type:"error",text:"Senha obrigat\u00f3ria"});
    setLoading(true);
    try {
      if (mode==="login") {
        const { error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
        if (error) setMsg({type:"error",text:error.message});
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: window.location.origin });
        if (error) setMsg({type:"error",text:error.message});
        else setMsg({type:"success",text:"Link de recupera\u00e7\u00e3o enviado! Verifique seu email."});
      }
    } finally { setLoading(false); }
  };

  const inp = key => ({ value:form[key], onChange:e=>setForm(p=>({...p,[key]:e.target.value})), onKeyDown:e=>e.key==="Enter"&&handle() });

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",padding:"10px 20px",borderRadius:12}}>
            <span style={{fontSize:24}}>\ud83d\udce6</span>
            <span style={{color:"#e2e8f0",fontSize:18,fontWeight:700,letterSpacing:"-0.5px"}}>PSR Pipeline</span>
          </div>
          <p style={{color:"#64748b",marginTop:8,fontSize:14}}>Gest\u00e3o de Atendimentos a Clientes</p>
          <p style={{color:"#475569",marginTop:4,fontSize:12}}>Sistema interno \u2014 acesso restrito</p>
        </div>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:36,boxShadow:"0 32px 64px rgba(0,0,0,0.4)"}}>
          <h2 style={{color:"#f1f5f9",margin:"0 0 24px",fontSize:22,fontWeight:700}}>
            {mode==="login"?"Entrar na conta":"Recuperar senha"}
          </h2>
          <AuthInput label="Email" type="email" placeholder="seu@empresa.com" {...inp("email")} />
          {mode==="login" && <AuthInput label="Senha" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" {...inp("password")} />}
          {msg && (
            <div style={{background:msg.type==="error"?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${msg.type==="error"?"#ef4444":"#10b981"}`,color:msg.type==="error"?"#ef4444":"#10b981",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:16}}>
              {msg.text}
            </div>
          )}
          <button onClick={handle} disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1,fontFamily:"inherit"}}>
            {loading?<Spinner/>:mode==="login"?"Entrar":"Enviar link de recupera\u00e7\u00e3o"}
          </button>
          <div style={{marginTop:20,textAlign:"center",fontSize:13}}>
            {mode==="login"
              ? <span style={{color:"#6366f1",cursor:"pointer"}} onClick={()=>{setMode("forgot");setMsg(null);}}>Esqueci minha senha</span>
              : <span style={{color:"#6366f1",cursor:"pointer"}} onClick={()=>{setMode("login");setMsg(null);}}>\u2190 Voltar ao login</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// RESET PASSWORD SCREEN (opened via email link)
// ============================================================
function ResetPasswordScreen({ onDone }) {
  const [form, setForm] = useState({ password:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handle = async () => {
    setMsg(null);
    if (!form.password) return setMsg({type:"error",text:"Digite a nova senha"});
    if (form.password.length < 6) return setMsg({type:"error",text:"M\u00ednimo 6 caracteres"});
    if (form.password !== form.confirm) return setMsg({type:"error",text:"Senhas n\u00e3o coincidem"});
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    if (error) { setMsg({type:"error",text:error.message}); setLoading(false); return; }
    setMsg({type:"success",text:"Senha definida com sucesso! Redirecionando..."});
    setTimeout(() => onDone(), 2000);
    setLoading(false);
  };

  const inp = key => ({ value:form[key], onChange:e=>setForm(p=>({...p,[key]:e.target.value})), onKeyDown:e=>e.key==="Enter"&&handle() });

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",padding:"10px 20px",borderRadius:12}}>
            <span style={{fontSize:24}}>\ud83d\udce6</span>
            <span style={{color:"#e2e8f0",fontSize:18,fontWeight:700,letterSpacing:"-0.5px"}}>PSR Pipeline</span>
          </div>
        </div>
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:36,boxShadow:"0 32px 64px rgba(0,0,0,0.4)"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:40,marginBottom:12}}>\ud83d\udd12</div>
            <h2 style={{color:"#f1f5f9",margin:"0 0 8px",fontSize:22,fontWeight:700}}>Definir nova senha</h2>
            <p style={{color:"#64748b",fontSize:13}}>Escolha uma senha segura para sua conta</p>
          </div>
          <AuthInput label="Nova senha" type="password" placeholder="M\u00ednimo 6 caracteres" {...inp("password")} />
          <AuthInput label="Confirmar senha" type="password" placeholder="Repita a senha" {...inp("confirm")} />
          {msg && (
            <div style={{background:msg.type==="error"?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${msg.type==="error"?"#ef4444":"#10b981"}`,color:msg.type==="error"?"#ef4444":"#10b981",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:16}}>
              {msg.text}
            </div>
          )}
          <button onClick={handle} disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:600,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1,fontFamily:"inherit"}}>
            {loading?<Spinner/>:"Salvar nova senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthInput({ label, type="text", placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:16}}>
      <label style={{color:"#94a3b8",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:"#0f172a",border:`1px solid ${focused?"#6366f1":"#334155"}`,borderRadius:8,padding:"12px 14px",color:"#f1f5f9",fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s"}} />
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function MainApp({ user, profile, onSignOut }) {
  const [view, setView] = useState("pipeline");
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [notifRules, setNotifRules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { toasts, show: showToast, dismiss } = useToast();

  const loadData = useCallback(async () => {
    const [colRes, cardRes, ruleRes] = await Promise.all([
      supabase.from("pipeline_columns").select("*").order("position", {ascending:true}),
      supabase.from("pipeline_cards").select("*").order("position", {ascending:true}),
      supabase.from("notification_rules").select("*"),
    ]);
    if (colRes.data) setColumns(colRes.data);
    if (cardRes.data) setCards(cardRes.data);
    if (ruleRes.data) setNotifRules(ruleRes.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!cards.length || !notifRules.length) return;
    const generated = [];
    notifRules.filter(r=>r.is_active).forEach(rule => {
      cards.forEach(card => {
        if (rule.type==="days_no_purchase" && card.last_purchase_date) {
          const days = differenceInDays(new Date(), parseISO(card.last_purchase_date));
          if (days >= rule.threshold_days)
            generated.push({ id:`np_${card.id}_${rule.id}`, card_id:card.id, message:`${card.client_name} est\u00e1 h\u00e1 ${days} dias sem comprar`, type:"purchase", days, is_read:false });
        }
        if (rule.type==="days_in_column" && card.updated_at) {
          const days = differenceInDays(new Date(), parseISO(card.updated_at));
          if (days >= rule.threshold_days) {
            const col = columns.find(c=>c.id===card.column_id);
            generated.push({ id:`dc_${card.id}_${rule.id}`, card_id:card.id, message:`${card.client_name} est\u00e1 h\u00e1 ${days} dias em "${col?.name||"etapa"}"`, type:"column", days, is_read:false });
          }
        }
      });
    });
    setNotifications(generated);
  }, [cards, notifRules, columns]);

  const unread = notifications.filter(n=>!n.is_read).length;
  const appCtx = { columns, setColumns, cards, setCards, notifRules, setNotifRules, notifications, setNotifications, loadData, showToast, profile };

  const navItems = [
    { id:"pipeline", label:"Pipeline", icon:"\ud83d\udccb" },
    { id:"import", label:"Importar Excel", icon:"\ud83d\udcca" },
    { id:"notifications", label:"Alertas", icon:"\ud83d\udd14", badge:unread },
    ...(profile?.role==="admin" ? [{ id:"admin", label:"Admin", icon:"\u2699\ufe0f" }] : []),
  ];

  return (
    <AppContext.Provider value={appCtx}>
      <div style={{minHeight:"100vh",background:"#0f172a",fontFamily:"'Sora',sans-serif",color:"#f1f5f9"}}>
        <Toast toasts={toasts} onDismiss={dismiss} />
        <div style={{background:"#1e293b",borderBottom:"1px solid #334155",padding:"0 24px",height:60,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto"}}>
            <span style={{fontSize:20}}>\ud83d\udce6</span>
            <span style={{fontWeight:700,fontSize:16,color:"#e2e8f0",letterSpacing:"-0.5px"}}>PSR Pipeline</span>
          </div>
          <div style={{display:"flex",gap:4}}>
            {navItems.map(item => (
              <button key={item.id} onClick={()=>setView(item.id)} style={{
                background:view===item.id?"rgba(99,102,241,0.2)":"transparent",
                color:view===item.id?"#818cf8":"#64748b",
                border:view===item.id?"1px solid rgba(99,102,241,0.4)":"1px solid transparent",
                borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:6,
              }}>
                <span>{item.icon}</span> <span>{item.label}</span>
                {item.badge>0 && <span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:11,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:8,paddingLeft:12,borderLeft:"1px solid #334155"}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{profile?.name||user.email}</div>
              <div style={{fontSize:11,color:"#64748b"}}>{profile?.role==="admin"?"Administrador":"Usu\u00e1rio"}</div>
            </div>
            <button onClick={onSignOut} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
          </div>
        </div>
        <div style={{padding:24}}>
          {view==="pipeline" && <PipelineView />}
          {view==="import" && <ImportView />}
          {view==="notifications" && <NotificationsView />}
          {view==="admin" && profile?.role==="admin" && <AdminView />}
        </div>
      </div>
    </AppContext.Provider>
  );
}

// ============================================================
// PIPELINE VIEW
// ============================================================
function PipelineView() {
  const { columns, setColumns, cards, setCards, showToast } = useApp();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [search, setSearch] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("#6366f1");
  const [editingCol, setEditingCol] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [addCardCol, setAddCardCol] = useState(null);

  const filtered = cards.filter(c => !search || c.client_name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()));
  const getColCards = colId => filtered.filter(c=>c.column_id===colId).sort((a,b)=>(a.position||0)-(b.position||0));
  const getColTotal = colId => cards.filter(c=>c.column_id===colId).reduce((s,c)=>s+(Number(c.value)||0),0);
  const totalAll = cards.reduce((s,c)=>s+(Number(c.value)||0),0);

  const onDrop = async (e, colId) => {
    e.preventDefault();
    if (!dragging || dragging.column_id===colId) { setDragOver(null); return; }
    const updated = { ...dragging, column_id:colId, updated_at:new Date().toISOString() };
    setCards(prev => prev.map(c => c.id===dragging.id ? updated : c));
    await supabase.from("pipeline_cards").update({ column_id:colId, updated_at:new Date().toISOString() }).eq("id", dragging.id);
    showToast(`${dragging.client_name} \u2192 ${columns.find(c=>c.id===colId)?.name}`);
    setDragOver(null);
  };

  const addColumn = async () => {
    if (!newColName.trim()) return;
    const { data, error } = await supabase.from("pipeline_columns").insert({ name:newColName.trim(), color:newColColor, position:columns.length }).select().single();
    if (error) return showToast(error.message, "error");
    setColumns(prev=>[...prev,data]); setNewColName(""); setShowAddCol(false); showToast("Coluna adicionada!");
  };

  const deleteColumn = async colId => {
    const count = cards.filter(c=>c.column_id===colId).length;
    if (count>0 && !window.confirm(`Esta coluna tem ${count} card(s). Excluir mesmo assim?`)) return;
    await supabase.from("pipeline_columns").delete().eq("id",colId);
    setColumns(prev=>prev.filter(c=>c.id!==colId));
    setCards(prev=>prev.filter(c=>c.column_id!==colId));
    showToast("Coluna removida","warning");
  };

  const saveCol = async () => {
    const { error } = await supabase.from("pipeline_columns").update({ name:editingCol.name, color:editingCol.color }).eq("id",editingCol.id);
    if (error) return showToast(error.message,"error");
    setColumns(prev=>prev.map(c=>c.id===editingCol.id?{...c,...editingCol}:c));
    setEditingCol(null); showToast("Coluna atualizada!");
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:700,color:"#f1f5f9"}}>Pipeline de Vendas</h1>
          <p style={{margin:"4px 0 0",color:"#64748b",fontSize:13}}>{cards.length} clientes \u00b7 R$ {totalAll.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="\ud83d\udd0d Buscar cliente..." style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 14px",color:"#f1f5f9",fontSize:13,outline:"none",fontFamily:"inherit",width:220}} />
          <button onClick={()=>setShowAddCol(true)} style={{background:"rgba(99,102,241,0.15)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Coluna</button>
        </div>
      </div>

      <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:16,alignItems:"flex-start",minHeight:"calc(100vh - 200px)"}}>
        {columns.map(col => (
          <div key={col.id}
            onDragOver={e=>{e.preventDefault();setDragOver(col.id)}}
            onDrop={e=>onDrop(e,col.id)}
            onDragLeave={()=>setDragOver(null)}
            style={{minWidth:280,maxWidth:280,background:dragOver===col.id?"rgba(99,102,241,0.08)":"#1e293b",borderRadius:14,border:`1px solid ${dragOver===col.id?"#6366f1":"#334155"}`,transition:"all 0.2s",flexShrink:0}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #334155",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:col.color,flexShrink:0}} />
              <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0",flex:1}}>{col.name}</span>
              <span style={{background:"rgba(255,255,255,0.07)",color:"#94a3b8",fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600}}>{getColCards(col.id).length}</span>
              <button onClick={()=>setEditingCol({...col})} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>\u270f\ufe0f</button>
              <button onClick={()=>deleteColumn(col.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>\ud83d\uddd1\ufe0f</button>
            </div>
            <div style={{padding:"6px 16px 10px",fontSize:11,color:"#64748b",borderBottom:"1px solid #1e293b"}}>
              R$ {getColTotal(col.id).toLocaleString("pt-BR",{minimumFractionDigits:2})}
            </div>
            <div style={{padding:10,display:"flex",flexDirection:"column",gap:8,minHeight:80}}>
              {getColCards(col.id).map(card => (
                <CardItem key={card.id} card={card}
                  onDragStart={()=>setDragging(card)} onDragEnd={()=>{setDragging(null);setDragOver(null);}}
                  onClick={()=>setSelectedCard(card)} />
              ))}
              <button onClick={()=>setAddCardCol(col.id)}
                style={{background:"rgba(255,255,255,0.03)",border:"1px dashed #334155",borderRadius:8,padding:10,color:"#475569",fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.target.style.borderColor=col.color;e.target.style.color=col.color;}}
                onMouseLeave={e=>{e.target.style.borderColor="#334155";e.target.style.color="#475569";}}>
                + Adicionar cliente
              </button>
            </div>
          </div>
        ))}
        {columns.length===0 && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#475569",padding:60,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>\ud83d\uddc2\ufe0f</div>
            <div style={{fontSize:16,fontWeight:600,marginBottom:8,color:"#64748b"}}>Nenhuma coluna criada</div>
            <div style={{fontSize:13,marginBottom:24}}>Clique em "+ Coluna" para come\u00e7ar</div>
            <button onClick={()=>setShowAddCol(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Criar primeira coluna</button>
          </div>
        )}
      </div>

      {showAddCol && (
        <Modal title="Nova coluna" onClose={()=>setShowAddCol(false)} width={380}>
          <FormField label="Nome">
            <input value={newColName} onChange={e=>setNewColName(e.target.value)} placeholder="Ex: Em An\u00e1lise" style={fieldStyle} autoFocus onKeyDown={e=>e.key==="Enter"&&addColumn()} />
          </FormField>
          <FormField label="Cor">
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {COLORS.map(c=>(<div key={c} onClick={()=>setNewColColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:newColColor===c?"3px solid #fff":"3px solid transparent",transition:"border 0.15s"}} />))}
            </div>
          </FormField>
          <button onClick={addColumn} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Criar coluna</button>
        </Modal>
      )}

      {editingCol && (
        <Modal title="Editar coluna" onClose={()=>setEditingCol(null)} width={380}>
          <FormField label="Nome">
            <input value={editingCol.name} onChange={e=>setEditingCol(p=>({...p,name:e.target.value}))} style={fieldStyle} />
          </FormField>
          <FormField label="Cor">
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {COLORS.map(c=>(<div key={c} onClick={()=>setEditingCol(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:editingCol.color===c?"3px solid #fff":"3px solid transparent"}} />))}
            </div>
          </FormField>
          <button onClick={saveCol} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Salvar</button>
        </Modal>
      )}

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={()=>setSelectedCard(null)}
          onUpdate={u=>{setCards(prev=>prev.map(c=>c.id===u.id?u:c));setSelectedCard(null);}}
          onDelete={id=>{setCards(prev=>prev.filter(c=>c.id!==id));setSelectedCard(null);}} />
      )}
      {addCardCol && (
        <AddCardModal columnId={addCardCol} onClose={()=>setAddCardCol(null)}
          onAdd={card=>{setCards(prev=>[...prev,card]);setAddCardCol(null);}} />
      )}
    </div>
  );
}

function CardItem({ card, onDragStart, onDragEnd, onClick }) {
  const daysSince = card.last_purchase_date ? differenceInDays(new Date(), parseISO(card.last_purchase_date)) : null;
  const isOld = daysSince!==null && daysSince>=30;
  const [hovered, setHovered] = useState(false);
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{background:"#0f172a",border:`1px solid ${hovered?(isOld?"#ef4444":"#6366f1"):(isOld?"rgba(239,68,68,0.3)":"#1e293b")}`,borderRadius:10,padding:14,cursor:"grab",transition:"all 0.2s",userSelect:"none"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontWeight:600,fontSize:13,color:"#f1f5f9",lineHeight:1.3,flex:1}}>{card.client_name}</div>
        {isOld && <span title={`${daysSince} dias sem comprar`} style={{fontSize:14,marginLeft:4}}>\ud83d\udd34</span>}
      </div>
      {card.company && <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>{card.company}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {Number(card.value)>0 && <span style={{color:"#10b981",fontSize:12,fontWeight:600}}>R$ {Number(card.value).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>}
        {daysSince!==null && <span style={{color:isOld?"#ef4444":"#64748b",fontSize:11}}>{daysSince}d atr\u00e1s</span>}
      </div>
      {card.tags?.length>0 && (
        <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
          {card.tags.map(tag=>(<span key={tag} style={{background:`${TAG_COLORS[tag]||"#6366f1"}22`,color:TAG_COLORS[tag]||"#818cf8",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:5}}>{tag}</span>))}
        </div>
      )}
    </div>
  );
}

function AddCardModal({ columnId, onClose, onAdd }) {
  const { columns, showToast } = useApp();
  const [form, setForm] = useState({ client_name:"", company:"", phone:"", email:"", value:"", last_purchase_date:"", notes:"", tags:[] });
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const col = columns.find(c=>c.id===columnId);

  const save = async () => {
    if (!form.client_name.trim()) return showToast("Nome obrigat\u00f3rio","error");
    const card = { ...form, column_id:columnId, value:parseFloat(form.value)||0, position:0 };
    const { data, error } = await supabase.from("pipeline_cards").insert(card).select().single();
    if (error) return showToast(error.message,"error");
    onAdd(data); showToast("Cliente adicionado!");
  };

  const toggleTag = tag => setForm(p=>({ ...p, tags:p.tags.includes(tag)?p.tags.filter(t=>t!==tag):[...p.tags,tag] }));

  return (
    <Modal title={`Novo cliente em "${col?.name||""}"`} onClose={onClose} width={520}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div style={{gridColumn:"1 / -1"}}><FormField label="Nome *"><input value={form.client_name} onChange={upd("client_name")} placeholder="Nome do cliente" style={fieldStyle} autoFocus /></FormField></div>
        <FormField label="Empresa"><input value={form.company} onChange={upd("company")} placeholder="Empresa" style={fieldStyle} /></FormField>
        <FormField label="Telefone"><input value={form.phone} onChange={upd("phone")} placeholder="61999990000" style={fieldStyle} /></FormField>
        <FormField label="Email"><input value={form.email} onChange={upd("email")} placeholder="email@empresa.com" style={fieldStyle} /></FormField>
        <FormField label="Valor (R$)"><input value={form.value} onChange={upd("value")} type="number" placeholder="0.00" style={fieldStyle} /></FormField>
        <div style={{gridColumn:"1 / -1"}}>
          <FormField label="\u00daltima compra"><input value={form.last_purchase_date} onChange={upd("last_purchase_date")} type="date" style={fieldStyle} /></FormField>
          <FormField label="Tags">
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.keys(TAG_COLORS).map(tag=>(<button key={tag} onClick={()=>toggleTag(tag)} style={{background:form.tags.includes(tag)?`${TAG_COLORS[tag]}33`:"rgba(255,255,255,0.04)",color:form.tags.includes(tag)?TAG_COLORS[tag]:"#64748b",border:`1px solid ${form.tags.includes(tag)?TAG_COLORS[tag]:"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{tag}</button>))}
            </div>
          </FormField>
          <FormField label="Observa\u00e7\u00f5es"><textarea value={form.notes} onChange={upd("notes")} rows={2} style={{...fieldStyle,resize:"vertical"}} /></FormField>
        </div>
      </div>
      <button onClick={save} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Adicionar</button>
    </Modal>
  );
}

function CardDetailModal({ card, onClose, onUpdate, onDelete }) {
  const { columns, showToast } = useApp();
  const [form, setForm] = useState({ ...card, value:String(card.value||"") });
  const [saving, setSaving] = useState(false);
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));

  const save = async () => {
    setSaving(true);
    const payload = { client_name:form.client_name, company:form.company, phone:form.phone, email:form.email, value:parseFloat(form.value)||0, last_purchase_date:form.last_purchase_date||null, column_id:form.column_id, notes:form.notes, tags:form.tags||[], updated_at:new Date().toISOString() };
    const { data, error } = await supabase.from("pipeline_cards").update(payload).eq("id",card.id).select().single();
    if (error) { showToast(error.message,"error"); setSaving(false); return; }
    onUpdate(data); showToast("Salvo!"); setSaving(false);
  };

  const del = async () => {
    if (!window.confirm("Remover este cliente?")) return;
    const { error } = await supabase.from("pipeline_cards").delete().eq("id",card.id);
    if (error) return showToast(error.message,"error");
    onDelete(card.id); showToast("Removido","warning");
  };

  const toggleTag = tag => setForm(p=>({ ...p, tags:(p.tags||[]).includes(tag)?(p.tags||[]).filter(t=>t!==tag):[...(p.tags||[]),tag] }));

  return (
    <Modal title="Detalhes do cliente" onClose={onClose} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div style={{gridColumn:"1 / -1"}}><FormField label="Nome"><input value={form.client_name} onChange={upd("client_name")} style={fieldStyle} /></FormField></div>
        <FormField label="Empresa"><input value={form.company||""} onChange={upd("company")} style={fieldStyle} /></FormField>
        <FormField label="Telefone"><input value={form.phone||""} onChange={upd("phone")} style={fieldStyle} /></FormField>
        <FormField label="Email"><input value={form.email||""} onChange={upd("email")} style={fieldStyle} /></FormField>
        <FormField label="Valor (R$)"><input value={form.value} onChange={upd("value")} type="number" style={fieldStyle} /></FormField>
        <div style={{gridColumn:"1 / -1"}}>
          <FormField label="\u00daltima compra"><input value={form.last_purchase_date||""} onChange={upd("last_purchase_date")} type="date" style={fieldStyle} /></FormField>
          <FormField label="Etapa no pipeline">
            <select value={form.column_id} onChange={upd("column_id")} style={{...fieldStyle,cursor:"pointer"}}>
              {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Tags">
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.keys(TAG_COLORS).map(tag=>(<button key={tag} onClick={()=>toggleTag(tag)} style={{background:(form.tags||[]).includes(tag)?`${TAG_COLORS[tag]}33`:"rgba(255,255,255,0.04)",color:(form.tags||[]).includes(tag)?TAG_COLORS[tag]:"#64748b",border:`1px solid ${(form.tags||[]).includes(tag)?TAG_COLORS[tag]:"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{tag}</button>))}
            </div>
          </FormField>
          <FormField label="Observa\u00e7\u00f5es"><textarea value={form.notes||""} onChange={upd("notes")} rows={3} style={{...fieldStyle,resize:"vertical"}} /></FormField>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={save} disabled={saving} style={{flex:1,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:saving?"wait":"pointer",fontFamily:"inherit"}}>
          {saving?"Salvando...":"Salvar altera\u00e7\u00f5es"}
        </button>
        <button onClick={del} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"12px 16px",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>\ud83d\uddd1\ufe0f</button>
      </div>
    </Modal>
  );
}

// ============================================================
// IMPORT VIEW
// ============================================================
function ImportView() {
  const { columns, setCards, showToast } = useApp();
  const [preview, setPreview] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [targetCol, setTargetCol] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const FIELDS = [
    { key:"client_name", label:"Nome do cliente *" },
    { key:"company", label:"Empresa" },
    { key:"phone", label:"Telefone" },
    { key:"email", label:"Email" },
    { key:"value", label:"Valor (R$)" },
    { key:"last_purchase_date", label:"\u00daltima compra" },
  ];

  const autoDetect = hdrs => {
    const m = {};
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const hl = h.toLowerCase();
        if (f.key==="client_name") return /cliente|nome|client|customer/.test(hl);
        if (f.key==="company") return /empresa|company|raz/.test(hl);
        if (f.key==="phone") return /tel|fone|celular|phone/.test(hl);
        if (f.key==="email") return /email|e-mail/.test(hl);
        if (f.key==="value") return /valor|value|total|venda|preco/.test(hl);
        if (f.key==="last_purchase_date") return /data|compra|purchase|ltima/.test(hl);
        return false;
      });
      if (match) m[f.key] = match;
    });
    return m;
  };

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const wb = XLSX.read(evt.target.result, { type:"binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1 });
      if (!rows.length) return showToast("Planilha vazia","error");
      const hdrs = rows[0].map(h => String(h||"").trim());
      setHeaders(hdrs);
      setMapping(autoDetect(hdrs));
      const data = rows.slice(1).filter(r=>r.some(c=>c));
      setPreview(data.slice(0,5).map(r => Object.fromEntries(hdrs.map((h,i)=>[h,r[i]]))));
      setTargetCol(columns[0]?.id||"");
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    if (!mapping.client_name) return showToast("Mapeie o campo Nome","error");
    if (!targetCol) return showToast("Selecione coluna de destino","error");
    setImporting(true);
    const file = fileRef.current.files[0];
    const reader = new FileReader();
    reader.onload = async evt => {
      const wb = XLSX.read(evt.target.result, { type:"binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1 });
      const hdrs = rows[0].map(h=>String(h||"").trim());
      const dataRows = rows.slice(1).filter(r=>r.some(c=>c));
      const imported = dataRows.map((row,i) => {
        const obj = Object.fromEntries(hdrs.map((h,idx)=>[h,row[idx]]));
        let dt = obj[mapping.last_purchase_date];
        if (dt && typeof dt==="number") { const d=new Date((dt-25569)*86400*1000); dt=format(d,"yyyy-MM-dd"); }
        else if (dt) dt=String(dt).trim();
        return { column_id:targetCol, client_name:String(obj[mapping.client_name]||"").trim(), company:String(obj[mapping.company]||"").trim(), phone:String(obj[mapping.phone]||"").trim(), email:String(obj[mapping.email]||"").trim(), value:parseFloat(String(obj[mapping.value]||"0").replace(",","."))||0, last_purchase_date:dt||null, notes:"", tags:[], position:i };
      }).filter(c=>c.client_name);
      const { data, error } = await supabase.from("pipeline_cards").insert(imported).select();
      if (error) { showToast(error.message,"error"); setImporting(false); return; }
      setCards(prev=>[...prev,...data]);
      setImporting(false); setPreview(null); fileRef.current.value="";
      showToast(`${data.length} clientes importados com sucesso!`);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{maxWidth:800}}>
      <h1 style={{margin:"0 0 8px",fontSize:24,fontWeight:700}}>Importar Clientes via Excel</h1>
      <p style={{margin:"0 0 24px",color:"#64748b",fontSize:14}}>Importe clientes do seu sistema de vendas direto de planilhas .xlsx</p>
      <div onClick={()=>fileRef.current.click()} style={{background:"#1e293b",border:"2px dashed #334155",borderRadius:16,padding:40,textAlign:"center",cursor:"pointer",marginBottom:24,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.background="rgba(99,102,241,0.04)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.background="#1e293b";}}>
        <div style={{fontSize:48,marginBottom:12}}>\ud83d\udcca</div>
        <div style={{fontSize:16,fontWeight:600,color:"#e2e8f0",marginBottom:6}}>Clique para selecionar planilha</div>
        <div style={{fontSize:13,color:"#64748b"}}>Suporte para .xlsx e .xls</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}} />
      </div>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:20,marginBottom:24}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Formato esperado</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:12,width:"100%"}}>
            <thead><tr>{["CLIENTE","EMPRESA","TELEFONE","EMAIL","VALOR","ULTIMA_COMPRA"].map(h=><th key={h} style={{padding:"8px 12px",color:"#64748b",fontWeight:600,textAlign:"left",borderBottom:"1px solid #334155",background:"#0f172a"}}>{h}</th>)}</tr></thead>
            <tbody><tr>{["Jo\u00e3o Silva","PSR Embalagens","61999990001","joao@email.com","1500.00","2025-01-15"].map((v,i)=><td key={i} style={{padding:"8px 12px",color:"#94a3b8"}}>{v}</td>)}</tr></tbody>
          </table>
        </div>
      </div>
      {headers.length>0 && (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:24}}>
          <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:16}}>Mapeamento de colunas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {FIELDS.map(f=>(
              <div key={f.key}>
                <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>{f.label}</label>
                <select value={mapping[f.key]||""} onChange={e=>setMapping(p=>({...p,[f.key]:e.target.value}))} style={{...fieldStyle,cursor:"pointer"}}>
                  <option value="">(n\u00e3o importar)</option>
                  {headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{marginBottom:20}}>
            <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Coluna destino *</label>
            <select value={targetCol} onChange={e=>setTargetCol(e.target.value)} style={{...fieldStyle,cursor:"pointer",maxWidth:300}}>
              {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {preview && (
            <div style={{marginBottom:20,overflowX:"auto"}}>
              <div style={{fontSize:12,color:"#64748b",marginBottom:8}}>Pr\u00e9via (5 primeiros):</div>
              <table style={{borderCollapse:"collapse",fontSize:11,width:"100%"}}>
                <thead><tr style={{background:"#0f172a"}}>{headers.map(h=><th key={h} style={{padding:"6px 10px",color:"#64748b",fontWeight:600,textAlign:"left",borderBottom:"1px solid #334155",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>{preview.map((row,i)=><tr key={i}>{headers.map(h=><td key={h} style={{padding:"6px 10px",color:"#94a3b8",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{row[h]??""}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          <button onClick={doImport} disabled={importing} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontSize:14,fontWeight:600,cursor:importing?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            {importing?<><Spinner/>Importando...</>:"\u2b06 Importar clientes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS VIEW
// ============================================================
function NotificationsView() {
  const { notifications, setNotifications, notifRules, setNotifRules, columns, showToast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ name:"", type:"days_no_purchase", threshold_days:30, column_id:"", is_active:true });

  const addRule = async () => {
    if (!newRule.name||!newRule.threshold_days) return showToast("Preencha todos os campos","error");
    const { data, error } = await supabase.from("notification_rules").insert({ ...newRule, column_id:newRule.column_id||null }).select().single();
    if (error) return showToast(error.message,"error");
    setNotifRules(prev=>[...prev,data]); setShowAdd(false); showToast("Regra criada!");
  };

  const toggleRule = async rule => {
    await supabase.from("notification_rules").update({ is_active:!rule.is_active }).eq("id",rule.id);
    setNotifRules(prev=>prev.map(r=>r.id===rule.id?{...r,is_active:!r.is_active}:r));
  };

  const delRule = async id => {
    await supabase.from("notification_rules").delete().eq("id",id);
    setNotifRules(prev=>prev.filter(r=>r.id!==id));
    showToast("Regra removida","warning");
  };

  const markRead = id => setNotifications(prev=>prev.map(n=>n.id===id?{...n,is_read:true}:n));
  const markAllRead = () => setNotifications(prev=>prev.map(n=>({...n,is_read:true})));
  const unread = notifications.filter(n=>!n.is_read).length;

  return (
    <div style={{maxWidth:800}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:700}}>Central de Alertas</h1>
          <p style={{margin:"4px 0 0",color:"#64748b",fontSize:13}}>{unread} n\u00e3o lidos \u00b7 {notifications.length} total</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          {unread>0 && <button onClick={markAllRead} style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Marcar tudo lido</button>}
          <button onClick={()=>setShowAdd(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Nova regra</button>
        </div>
      </div>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:20,marginBottom:24}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16}}>Regras configuradas ({notifRules.length})</div>
        {notifRules.length===0 && <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:20}}>Nenhuma regra. Crie uma acima.</div>}
        {notifRules.map(rule=>(
          <div key={rule.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #334155"}}>
            <div onClick={()=>toggleRule(rule)} style={{width:40,height:22,borderRadius:11,background:rule.is_active?"#10b981":"#334155",cursor:"pointer",transition:"background 0.2s",position:"relative",flexShrink:0}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:rule.is_active?20:2,transition:"left 0.2s"}} />
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{rule.name}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{rule.type==="days_no_purchase"?`Sem compra h\u00e1 ${rule.threshold_days} dias`:`Parado na etapa h\u00e1 ${rule.threshold_days} dias`}</div>
            </div>
            <button onClick={()=>delRule(rule.id)} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"none",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit"}}>\ud83d\uddd1\ufe0f</button>
          </div>
        ))}
      </div>
      <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Alertas gerados</div>
      {notifications.length===0 ? (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>\u2705</div>
          <div style={{fontSize:15,fontWeight:600,color:"#e2e8f0"}}>Tudo em dia!</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:6}}>Nenhum alerta ativo no momento</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {notifications.map(n=>(
            <div key={n.id} onClick={()=>markRead(n.id)} style={{background:n.is_read?"#1e293b":"rgba(239,68,68,0.05)",border:`1px solid ${n.is_read?"#334155":"rgba(239,68,68,0.2)"}`,borderRadius:12,padding:"14px 18px",cursor:n.is_read?"default":"pointer",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:20}}>{n.type==="purchase"?"\ud83d\uded2":"\u23f1\ufe0f"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{n.message}</div>
                {!n.is_read && <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Clique para marcar como lido</div>}
              </div>
              {!n.is_read && <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0}} />}
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <Modal title="Nova regra de alerta" onClose={()=>setShowAdd(false)} width={440}>
          <FormField label="Nome da regra"><input value={newRule.name} onChange={e=>setNewRule(p=>({...p,name:e.target.value}))} placeholder="Ex: Sem compra h\u00e1 30 dias" style={fieldStyle} autoFocus /></FormField>
          <FormField label="Tipo de alerta">
            <select value={newRule.type} onChange={e=>setNewRule(p=>({...p,type:e.target.value}))} style={{...fieldStyle,cursor:"pointer"}}>
              <option value="days_no_purchase">Dias sem compra</option>
              <option value="days_in_column">Dias parado na etapa</option>
            </select>
          </FormField>
          <FormField label="Limite de dias"><input value={newRule.threshold_days} onChange={e=>setNewRule(p=>({...p,threshold_days:parseInt(e.target.value)||0}))} type="number" min={1} style={fieldStyle} /></FormField>
          {newRule.type==="days_in_column" && (
            <FormField label="Etapa (opcional)">
              <select value={newRule.column_id} onChange={e=>setNewRule(p=>({...p,column_id:e.target.value}))} style={{...fieldStyle,cursor:"pointer"}}>
                <option value="">Qualquer etapa</option>
                {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          )}
          <button onClick={addRule} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Criar regra</button>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// ADMIN VIEW
// ============================================================
function AdminView() {
  const { showToast, profile: currentProfile } = useApp();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"user" });
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));

  useEffect(() => {
    supabase.from("profiles").select("*").then(({ data }) => { if (data) setUsers(data); });
  }, []);

  const createUser = async () => {
    if (!form.name||!form.email||!form.password) return showToast("Preencha todos os campos","error");
    const { data: authData, error } = await supabase.auth.signUp({ email:form.email, password:form.password, options:{ data:{ name:form.name } } });
    if (error) return showToast(error.message,"error");
    if (authData.user) {
      await supabase.from("profiles").update({ role:form.role, name:form.name }).eq("id", authData.user.id);
      const { data } = await supabase.from("profiles").select("*");
      if (data) setUsers(data);
    }
    setForm({ name:"", email:"", password:"", role:"user" });
    showToast("Usu\u00e1rio criado!");
  };

  const toggleRole = async u => {
    if (u.id===currentProfile?.id) return showToast("N\u00e3o \u00e9 poss\u00edvel alterar seu pr\u00f3prio perfil","error");
    const nr = u.role==="admin"?"user":"admin";
    await supabase.from("profiles").update({ role:nr }).eq("id",u.id);
    setUsers(prev=>prev.map(p=>p.id===u.id?{...p,role:nr}:p));
    showToast(`${u.name} agora \u00e9 ${nr==="admin"?"Administrador":"Usu\u00e1rio"}`);
  };

  return (
    <div style={{maxWidth:700}}>
      <h1 style={{margin:"0 0 8px",fontSize:24,fontWeight:700}}>Administra\u00e7\u00e3o</h1>
      <p style={{margin:"0 0 24px",color:"#64748b",fontSize:13}}>Gerencie usu\u00e1rios e permiss\u00f5es</p>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:24,marginBottom:24}}>
        <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginBottom:16}}>Cadastrar novo usu\u00e1rio</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FormField label="Nome"><input value={form.name} onChange={upd("name")} placeholder="Nome completo" style={fieldStyle} /></FormField>
          <FormField label="Email"><input value={form.email} onChange={upd("email")} type="email" placeholder="email@empresa.com" style={fieldStyle} /></FormField>
          <FormField label="Senha tempor\u00e1ria"><input value={form.password} onChange={upd("password")} type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" style={fieldStyle} /></FormField>
          <FormField label="Perfil">
            <select value={form.role} onChange={upd("role")} style={{...fieldStyle,cursor:"pointer"}}>
              <option value="user">Usu\u00e1rio</option>
              <option value="admin">Administrador</option>
            </select>
          </FormField>
        </div>
        <button onClick={createUser} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>+ Cadastrar usu\u00e1rio</button>
      </div>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16}}>Usu\u00e1rios ({users.length})</div>
        {users.length===0 && <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:20}}>Nenhum usu\u00e1rio cadastrado</div>}
        {users.map(u=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid #334155"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>
              {(u.name||"U")[0].toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>{u.name} {u.id===currentProfile?.id&&<span style={{fontSize:10,color:"#64748b"}}>(voc\u00ea)</span>}</div>
              <div style={{fontSize:12,color:"#64748b"}}>{u.role==="admin"?"Administrador":"Usu\u00e1rio"}</div>
            </div>
            <button onClick={()=>toggleRole(u)} disabled={u.id===currentProfile?.id} style={{background:u.role==="admin"?"rgba(239,68,68,0.1)":"rgba(99,102,241,0.1)",color:u.role==="admin"?"#ef4444":"#818cf8",border:`1px solid ${u.role==="admin"?"rgba(239,68,68,0.2)":"rgba(99,102,241,0.2)"}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:u.id===currentProfile?.id?"not-allowed":"pointer",fontFamily:"inherit",opacity:u.id===currentProfile?.id?0.4:1}}>
              {u.role==="admin"?"Rebaixar":"Promover"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [isReset, setIsReset] = useState(false);
  const { toasts, show: showToast, dismiss } = useToast();

  useEffect(() => {
    // Detect password recovery flow from URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setIsReset(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsReset(true);
        setSession(session);
        return;
      }
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async uid => {
    const { data } = await supabase.from("profiles").select("*").eq("id",uid).single();
    setProfile(data);
  };

  const handleResetDone = async () => {
    setIsReset(false);
    window.location.hash = "";
    await supabase.auth.signOut();
    setSession(null);
  };

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    input::placeholder,textarea::placeholder{color:#475569}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:#1e293b}
    ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
    input,textarea,select{font-family:'Sora',sans-serif}
  `;

  if (session===undefined) return (
    <>
      <style>{globalStyles}</style>
      <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>\ud83d\udce6</div>
          <Spinner size={32} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{globalStyles}</style>
      <Toast toasts={toasts} onDismiss={dismiss} />
      <AppContext.Provider value={{ showToast }}>
        {isReset ? (
          <ResetPasswordScreen onDone={handleResetDone} />
        ) : !session ? (
          <AuthScreen />
        ) : (
          <MainApp user={session.user} profile={profile} onSignOut={async()=>{ await supabase.auth.signOut(); }} />
        )}
      </AppContext.Provider>
    </>
  );
}