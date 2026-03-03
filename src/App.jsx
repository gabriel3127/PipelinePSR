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
import { GLOBAL_STYLES, COMPANIES } from "./constants";
import { differenceInDays, parseISO } from "date-fns";

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

function Topbar({ profile, user, view, setView, activeCompany, setActiveCompany, accessibleCompanies, unread, onSignOut, isAdmin, can }) {
  const navItems = [
    ...(can("view_pipeline")  ? [{ id:"pipeline",      label:"Pipeline",       icon:"📋" }] : []),
    ...(can("import_excel")   ? [{ id:"import",        label:"Importar Excel", icon:"📊" }] : []),
    ...(can("view_alerts")    ? [{ id:"alerts",        label:"Alertas",        icon:"🔔", badge:unread }] : []),
    ...(isAdmin               ? [{ id:"admin",         label:"Admin",          icon:"⚙️" }] : []),
  ];

  return (
    <div style={{background:"#1e293b",borderBottom:"1px solid #334155",padding:"0 20px",height:58,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:100}}>
      <span style={{fontSize:18}}>📦</span>
      <span style={{fontWeight:700,fontSize:14,color:"#e2e8f0",letterSpacing:"-0.5px",marginRight:4}}>Pipeline</span>
      <div style={{width:1,height:22,background:"#334155"}} />
      {accessibleCompanies.map(co=>(
        <button key={co} onClick={()=>setActiveCompany(co)} style={{background:activeCompany===co?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.04)",color:activeCompany===co?"#818cf8":"#64748b",border:`1px solid ${activeCompany===co?"rgba(99,102,241,0.5)":"#334155"}`,borderRadius:7,padding:"4px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          {co}
        </button>
      ))}
      <div style={{width:1,height:22,background:"#334155"}} />
      {navItems.map(item=>(
        <button key={item.id} onClick={()=>setView(item.id)} style={{background:view===item.id?"rgba(99,102,241,0.2)":"transparent",color:view===item.id?"#818cf8":"#64748b",border:view===item.id?"1px solid rgba(99,102,241,0.4)":"1px solid transparent",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
          {item.icon} {item.label}
          {item.badge>0 && <span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}
        </button>
      ))}
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>{profile?.name||user.email}</div>
          <div style={{fontSize:10,color:"#64748b"}}>{isAdmin?"Administrador":"Usuário"}</div>
        </div>
        <button onClick={onSignOut} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,padding:"5px 11px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
      </div>
    </div>
  );
}

function MainApp({ user, profile }) {
  const [view, setView]                     = useState("pipeline");
  const [activeCompany, setActiveCompany]   = useState(null);
  const [columns, setColumns]               = useState([]);
  const [cards, setCards]                   = useState([]);
  const [notifRules, setNotifRules]         = useState([]);
  const [notifications, setNotifications]   = useState([]);
  const [allUsers, setAllUsers]             = useState([]);
  const [locationTags, setLocationTags]     = useState([]);
  const { toasts, show: showToast, dismiss } = useToast();

  const isAdmin = profile?.role === "admin";
  const can = (key) => isAdmin || !!(profile?.permissions?.[key]);
  const accessibleCompanies = isAdmin ? COMPANIES : (profile?.companies || []);

  useEffect(() => {
    if (accessibleCompanies.length > 0 && !activeCompany)
      setActiveCompany(accessibleCompanies[0]);
  }, [profile]);

  const loadData = useCallback(async () => {
    if (!activeCompany) return;
    const [colRes, cardRes, ruleRes, userRes, locRes] = await Promise.all([
      supabase.from("pipeline_columns").select("*").eq("company",activeCompany).order("position",{ascending:true}),
      supabase.from("pipeline_cards").select("*").eq("company",activeCompany).order("position",{ascending:true}),
      supabase.from("notification_rules").select("*").eq("company",activeCompany),
      supabase.from("profiles").select("id, name, role, companies, permissions"),
      supabase.from("location_tags").select("*").eq("company",activeCompany).order("name"),
    ]);
    if (colRes.data)  setColumns(colRes.data);
    if (cardRes.data) setCards(cardRes.data);
    if (ruleRes.data) setNotifRules(ruleRes.data);
    if (userRes.data) setAllUsers(userRes.data);
    if (locRes.data)  setLocationTags(locRes.data);
  }, [activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calcula unread para o badge
  const unread = notifications.filter(n=>!n.is_read).length;

  const onSignOut = async () => { await supabase.auth.signOut(); };

  if (accessibleCompanies.length === 0) return (
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:"#64748b"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:16,fontWeight:600,color:"#94a3b8",marginBottom:8}}>Sem acesso configurado</div>
        <div style={{fontSize:13}}>Contate o administrador.</div>
        <button onClick={onSignOut} style={{marginTop:24,background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"8px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sair</button>
      </div>
    </div>
  );

  const ctx = { user, profile, isAdmin, can, onSignOut, activeCompany, setActiveCompany, accessibleCompanies, columns, setColumns, cards, setCards, notifRules, setNotifRules, notifications, setNotifications, allUsers, locationTags, setLocationTags, loadData, showToast };

  return (
    <AppProvider value={ctx}>
      <Toast toasts={toasts} onDismiss={dismiss} />
      <Topbar profile={profile} user={user} view={view} setView={setView} activeCompany={activeCompany} setActiveCompany={setActiveCompany} accessibleCompanies={accessibleCompanies} unread={unread} onSignOut={onSignOut} isAdmin={isAdmin} can={can} />
      <div style={{padding:22}}>
        {view==="pipeline" && can("view_pipeline") && <PipelinePage />}
        {view==="import"   && can("import_excel")  && <ImportPage />}
        {view==="alerts"   && can("view_alerts")   && <AlertsPage />}
        {view==="admin"    && isAdmin              && <AdminPage />}
      </div>
    </AppProvider>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const { toasts, show: showToast, dismiss } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_, session) => {
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
        <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:14}}>📦</div><Spinner size={28} /></div>
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