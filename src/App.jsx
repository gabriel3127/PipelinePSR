import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { AppProvider } from "./context/AppContext";
import { Toast } from "./components/shared/Toast";
import { Spinner } from "./components/shared/Spinner";
import { LoginPage } from "./pages/LoginPage";
import { PipelinePage } from "./pages/PipelinePage";
import { ImportPage } from "./pages/ImportPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AdminPage } from "./pages/AdminPage";
import { GLOBAL_STYLES, PIPELINES } from "./constants";

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type="success") => {
    const id = Date.now();
    setToasts(prev=>[...prev,{id,message,type}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4000);
  },[]);
  const dismiss = useCallback((id)=>setToasts(prev=>prev.filter(t=>t.id!==id)),[]);
  return { toasts, show, dismiss };
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ profile, user, view, setView, activePipeline, setActivePipeline, accessiblePipelines, unread, onSignOut, isAdmin }) {
  const navBottom = [
    ...(isAdmin ? [{ id:"admin", label:"Admin", icon:"⚙️" }] : []),
    { id:"alerts", label:"Alertas", icon:"🔔", badge: unread },
    { id:"import", label:"Importar Excel", icon:"📊" },
  ];

  return (
    <div style={{width:220,background:"#1e293b",borderRight:"1px solid #334155",display:"flex",flexDirection:"column",height:"100vh",position:"fixed",left:0,top:0,zIndex:100}}>
      {/* Logo */}
      <div style={{padding:"20px 16px 16px",borderBottom:"1px solid #334155"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>📦</span>
          <div>
            <div style={{fontWeight:700,fontSize:13,color:"#e2e8f0",letterSpacing:"-0.3px"}}>Pipeline CRM</div>
            <div style={{fontSize:10,color:"#475569"}}>PSR Embalagens</div>
          </div>
        </div>
      </div>

      {/* Pipelines */}
      <div style={{padding:"12px 8px 8px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.08em",padding:"0 8px",marginBottom:6}}>Pipelines</div>
        {accessiblePipelines.map(p => (
          <button key={p.id} onClick={()=>{setActivePipeline(p.id);setView("pipeline");}}
            style={{width:"100%",background:view==="pipeline"&&activePipeline===p.id?"rgba(99,102,241,0.2)":"transparent",color:view==="pipeline"&&activePipeline===p.id?"#c7d2fe":"#94a3b8",border:"none",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,marginBottom:2,textAlign:"left",transition:"all 0.15s"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}} />
            <span style={{lineHeight:1.3}}>{p.label}</span>
          </button>
        ))}
      </div>

      <div style={{flex:1}} />

      {/* Nav inferior */}
      <div style={{padding:"8px 8px 12px",borderTop:"1px solid #334155"}}>
        {navBottom.map(item=>(
          <button key={item.id} onClick={()=>setView(item.id)}
            style={{width:"100%",background:view===item.id?"rgba(99,102,241,0.2)":"transparent",color:view===item.id?"#818cf8":"#64748b",border:"none",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,marginBottom:2,textAlign:"left"}}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge>0 && <span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}
          </button>
        ))}
      </div>

      {/* Usuário */}
      <div style={{padding:"12px 16px",borderTop:"1px solid #334155",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#fff",flexShrink:0}}>
          {(profile?.name||user.email)[0].toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:600,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.name||user.email}</div>
          <div style={{fontSize:10,color:"#475569"}}>{isAdmin?"Admin":"Usuário"}</div>
        </div>
        <button onClick={onSignOut} title="Sair" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,padding:2,flexShrink:0}}>⏻</button>
      </div>
    </div>
  );
}

// ── MainApp ───────────────────────────────────────────────────
function MainApp({ user, profile }) {
  const [view, setView]                   = useState("pipeline");
  const [activePipeline, setActivePipeline] = useState(null);
  const [columns, setColumns]             = useState([]);
  const [cards, setCards]                 = useState([]);
  const [notifRules, setNotifRules]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers]           = useState([]);
  const [locationTags, setLocationTags]   = useState([]);
  const { toasts, show: showToast, dismiss } = useToast();

  const isAdmin = profile?.role === "admin";
  const can = (key) => isAdmin || !!(profile?.permissions?.[key]);

  const accessiblePipelines = PIPELINES.filter(p =>
    isAdmin || (profile?.pipelines||[]).includes(p.id)
  );

  useEffect(() => {
    if (accessiblePipelines.length > 0 && !activePipeline)
      setActivePipeline(accessiblePipelines[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadData = useCallback(async () => {
    if (!activePipeline) return;
    const [colRes, cardRes, ruleRes, userRes, locRes] = await Promise.all([
      supabase.from("pipeline_columns").select("*").eq("pipeline_id", activePipeline).order("position",{ascending:true}),
      supabase.from("pipeline_cards").select("*").eq("pipeline_id", activePipeline).order("position",{ascending:true}),
      supabase.from("notification_rules").select("*").eq("pipeline_id", activePipeline),
      supabase.from("profiles").select("id, name, role, pipelines, permissions"),
      supabase.from("location_tags").select("*").eq("pipeline_id", activePipeline).order("name"),
    ]);
    if (colRes.data)  setColumns(colRes.data);
    if (cardRes.data) setCards(cardRes.data);
    if (ruleRes.data) setNotifRules(ruleRes.data);
    if (userRes.data) setAllUsers(userRes.data);
    if (locRes.data)  setLocationTags(locRes.data);
  }, [activePipeline]);

  useEffect(() => { loadData(); }, [loadData]);

  const unread = notifications.filter(n=>!n.is_read).length;
  const onSignOut = async () => { await supabase.auth.signOut(); };

  if (accessiblePipelines.length === 0) return (
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:"#64748b"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:16,fontWeight:600,color:"#94a3b8",marginBottom:8}}>Sem acesso configurado</div>
        <div style={{fontSize:13}}>Contate o administrador.</div>
        <button onClick={onSignOut} style={{marginTop:24,background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"8px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
      </div>
    </div>
  );

  const ctx = {
    user, profile, isAdmin, can, onSignOut,
    activePipeline, setActivePipeline, accessiblePipelines,
    columns, setColumns, cards, setCards,
    notifRules, setNotifRules, notifications, setNotifications,
    allUsers, locationTags, setLocationTags,
    loadData, showToast,
  };

  return (
    <AppProvider value={ctx}>
      <Toast toasts={toasts} onDismiss={dismiss} />
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar
          profile={profile} user={user}
          view={view} setView={setView}
          activePipeline={activePipeline} setActivePipeline={setActivePipeline}
          accessiblePipelines={accessiblePipelines}
          unread={unread} onSignOut={onSignOut} isAdmin={isAdmin}
        />
        <div style={{marginLeft:220,flex:1,padding:24,minHeight:"100vh"}}>
          {view==="pipeline" && can("view_pipeline") && <PipelinePage />}
          {view==="import"   && can("import_excel")  && <ImportPage />}
          {view==="alerts"   && can("view_alerts")   && <AlertsPage />}
          {view==="admin"    && isAdmin              && <AdminPage />}
        </div>
      </div>
    </AppProvider>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_,session) => {
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

  if (session===undefined) return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:14}}>📦</div><Spinner size={28}/></div>
      </div>
    </>
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <Toast toasts={toasts} onDismiss={dismiss} />
      {!session ? <LoginPage /> : <MainApp user={session.user} profile={profile} />}
    </>
  );
}