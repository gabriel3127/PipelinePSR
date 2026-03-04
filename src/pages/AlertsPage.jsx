import { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { PIPELINE_PAIRS, PIPELINES, fieldStyle } from "../constants";

export function AlertsPage() {
  const { cards, columns, notifRules, setNotifRules, showToast, can, appSettings, setAppSettings } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localDays, setLocalDays]           = useState(appSettings?.days_without_purchase_alert ?? 30);
  const [localSaleDays, setLocalSaleDays]   = useState(appSettings?.days_with_sale_threshold ?? 60);

  useEffect(() => {
    setLocalDays(appSettings?.days_without_purchase_alert ?? 30);
    setLocalSaleDays(appSettings?.days_with_sale_threshold ?? 60);
  }, [appSettings]);

  useEffect(() => {
    if (!cards.length) { setNotifications([]); return; }
    const generated = [];
    const alertDays = appSettings?.days_without_purchase_alert ?? 30;

    cards.forEach(card => {
      if (card.last_purchase_date) {
        const days = differenceInDays(new Date(), parseISO(card.last_purchase_date));
        if (days >= alertDays)
          generated.push({ id:`np_${card.id}`, card_id:card.id, message:`${card.client_name} está há ${days} dias sem comprar`, type:"purchase", days, is_read:false });
      }
    });

    notifRules.filter(r=>r.is_active && r.type==="days_no_purchase").forEach(rule => {
      cards.forEach(card => {
        if (card.last_purchase_date) {
          const days = differenceInDays(new Date(), parseISO(card.last_purchase_date));
          if (days >= rule.threshold_days && !generated.find(g=>g.id===`np_${card.id}`))
            generated.push({ id:`np_${card.id}_${rule.id}`, card_id:card.id, message:`[${rule.name}] ${card.client_name} está há ${days} dias sem comprar`, type:"purchase", days, is_read:false });
        }
      });
    });

    columns.forEach(col => {
      if (!col.max_days) return;
      cards.filter(c=>c.column_id===col.id && c.updated_at).forEach(card => {
        const days = differenceInDays(new Date(), parseISO(card.updated_at));
        if (days >= col.max_days)
          generated.push({ id:`dc_col_${card.id}_${col.id}`, card_id:card.id, message:`${card.client_name} está há ${days} dias em "${col.name}" (limite: ${col.max_days}d)`, type:"column", days, col_name:col.name, is_read:false });
      });
    });

    notifRules.filter(r=>r.is_active && r.type==="days_in_column").forEach(rule => {
      cards.forEach(card => {
        if (card.updated_at) {
          const days = differenceInDays(new Date(), parseISO(card.updated_at));
          if (days >= rule.threshold_days) {
            const col = columns.find(c=>c.id===card.column_id);
            generated.push({ id:`dc_${card.id}_${rule.id}`, card_id:card.id, message:`${card.client_name} está há ${days} dias em "${col?.name||"etapa"}"`, type:"column", days, is_read:false });
          }
        }
      });
    });

    setNotifications(generated.filter((g,i,arr)=>arr.findIndex(x=>x.id===g.id)===i));
  }, [cards, notifRules, columns, appSettings]);

  const unread = notifications.filter(n=>!n.is_read).length;
  const markRead = id => setNotifications(prev=>prev.map(n=>n.id===id?{...n,is_read:true}:n));
  const markAll  = () => setNotifications(prev=>prev.map(n=>({...n,is_read:true})));

  const saveSettings = async () => {
    setSavingSettings(true);
    const alertVal = parseInt(localDays)||30;
    const saleVal  = parseInt(localSaleDays)||60;
    const { error } = await supabase.from("app_settings").upsert({
      id:"global", days_without_purchase_alert:alertVal, days_with_sale_threshold:saleVal, updated_at:new Date().toISOString()
    });
    if (error) { showToast(error.message,"error"); setSavingSettings(false); return; }
    setAppSettings(p=>({...p, days_without_purchase_alert:alertVal, days_with_sale_threshold:saleVal}));
    showToast("Configurações salvas!"); setSavingSettings(false);
  };

  const toggleRule = async rule => {
    await supabase.from("notification_rules").update({is_active:!rule.is_active}).eq("id",rule.id);
    setNotifRules(prev=>prev.map(r=>r.id===rule.id?{...r,is_active:!r.is_active}:r));
  };
  const delRule = async id => {
    await supabase.from("notification_rules").delete().eq("id",id);
    setNotifRules(prev=>prev.filter(r=>r.id!==id));
    showToast("Regra removida","warning");
  };

  const purchaseAlerts = notifications.filter(n=>n.type==="purchase");
  const columnAlerts   = notifications.filter(n=>n.type==="column");
  const sectionStyle = { background:"#1e293b", border:"1px solid #334155", borderRadius:13, padding:16, marginBottom:16 };
  const labelStyle   = { fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 };
  const saleDaysLabel = appSettings?.days_with_sale_threshold ?? 60;

  return (
    <div style={{maxWidth:820}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:21,fontWeight:700}}>Alertas</h1>
          <p style={{margin:"3px 0 0",color:"#64748b",fontSize:12}}>{unread} não lidos · {notifications.length} total</p>
        </div>
        {unread>0 && (
          <div style={{marginLeft:"auto"}}>
            <button onClick={markAll} style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)",borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Marcar tudo lido</button>
          </div>
        )}
      </div>

      {can("manage_alerts") && (
        <div style={sectionStyle}>
          <div style={labelStyle}>⚙️ Configurações gerais</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:12}}>
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>🔴 Dias sem compra para alerta (bolinha vermelha)</label>
              <input value={localDays} onChange={e=>setLocalDays(e.target.value)} type="number" min={1} style={{...fieldStyle,fontSize:13}} />
            </div>
            <div>
              <label style={{fontSize:11,color:"#64748b",display:"block",marginBottom:5}}>🔄 Dias de última compra para permanecer no "Com Venda"</label>
              <input value={localSaleDays} onChange={e=>setLocalSaleDays(e.target.value)} type="number" min={1} style={{...fieldStyle,fontSize:13}} />
            </div>
          </div>

          <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#818cf8",marginBottom:6}}>🔗 Pares de pipeline linkados</div>
            {PIPELINE_PAIRS.map(pair => {
              const com = PIPELINES.find(p=>p.id===pair.comVenda);
              const sem = PIPELINES.find(p=>p.id===pair.semVenda);
              return (
                <div key={pair.comVenda} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#94a3b8",marginBottom:4}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:com?.color}} />
                  <span>{com?.label}</span>
                  <span style={{color:"#475569"}}>↔</span>
                  <div style={{width:7,height:7,borderRadius:"50%",background:sem?.color}} />
                  <span>{sem?.label}</span>
                </div>
              );
            })}
            <div style={{fontSize:11,color:"#475569",marginTop:6}}>
              Ao importar, clientes com compra nos últimos <strong style={{color:"#c7d2fe"}}>{saleDaysLabel} dias</strong> vão para "Com Venda". Os demais vão para "Sem Venda". Clientes já cadastrados são migrados automaticamente entre os pares.
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button onClick={saveSettings} disabled={savingSettings}
              style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:8,padding:"8px 22px",fontSize:12,fontWeight:600,cursor:savingSettings?"wait":"pointer",fontFamily:"inherit"}}>
              {savingSettings?"Salvando...":"Salvar"}
            </button>
          </div>
          <div style={{marginTop:10,fontSize:11,color:"#475569"}}>💡 O limite de dias por etapa é configurado diretamente ao criar ou editar cada coluna no pipeline.</div>
        </div>
      )}

      {can("manage_alerts") && columns.some(c=>c.max_days) && (
        <div style={sectionStyle}>
          <div style={labelStyle}>⏱️ Limites por etapa configurados</div>
          {columns.filter(c=>c.max_days).map(col => (
            <div key={col.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #334155"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:col.color,flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{col.name}</div>
                <div style={{fontSize:11,color:"#64748b"}}>
                  Máx {col.max_days} dias
                  {col.auto_move_to_column_id && <span style={{color:"#818cf8"}}> → mover para "{columns.find(c=>c.id===col.auto_move_to_column_id)?.name||"?"}"</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {can("manage_alerts") && notifRules.length>0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>📋 Regras personalizadas</div>
          {notifRules.map(rule=>(
            <div key={rule.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #334155"}}>
              <div onClick={()=>toggleRule(rule)} style={{width:36,height:20,borderRadius:10,background:rule.is_active?"#10b981":"#334155",cursor:"pointer",transition:"background 0.2s",position:"relative",flexShrink:0}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:rule.is_active?18:2,transition:"left 0.2s"}} />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{rule.name}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{rule.type==="days_no_purchase"?`Sem compra há ${rule.threshold_days} dias`:`Parado na etapa há ${rule.threshold_days} dias`}</div>
              </div>
              <button onClick={()=>delRule(rule.id)} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {notifications.length===0 ? (
        <div style={{...sectionStyle,padding:34,textAlign:"center"}}>
          <div style={{fontSize:34,marginBottom:10}}>✅</div>
          <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>Tudo em dia!</div>
        </div>
      ) : (
        <>
          {purchaseAlerts.length>0 && (
            <div style={{marginBottom:16}}>
              <div style={{...labelStyle,marginBottom:8}}>🛒 Sem compra recente ({purchaseAlerts.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {purchaseAlerts.map(n=>(
                  <div key={n.id} onClick={()=>markRead(n.id)}
                    style={{background:n.is_read?"#1e293b":"rgba(239,68,68,0.05)",border:`1px solid ${n.is_read?"#334155":"rgba(239,68,68,0.2)"}`,borderRadius:11,padding:"11px 15px",cursor:n.is_read?"default":"pointer",display:"flex",alignItems:"center",gap:11}}>
                    <span style={{fontSize:17}}>🛒</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{n.message}</div>
                      {!n.is_read && <div style={{fontSize:10,color:"#64748b",marginTop:1}}>Clique para marcar como lido</div>}
                    </div>
                    {!n.is_read && <div style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",flexShrink:0}} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {columnAlerts.length>0 && (
            <div>
              <div style={{...labelStyle,marginBottom:8}}>⏱️ Parados em etapa ({columnAlerts.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {columnAlerts.map(n=>(
                  <div key={n.id} onClick={()=>markRead(n.id)}
                    style={{background:n.is_read?"#1e293b":"rgba(245,158,11,0.05)",border:`1px solid ${n.is_read?"#334155":"rgba(245,158,11,0.2)"}`,borderRadius:11,padding:"11px 15px",cursor:n.is_read?"default":"pointer",display:"flex",alignItems:"center",gap:11}}>
                    <span style={{fontSize:17}}>⏱️</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{n.message}</div>
                      {!n.is_read && <div style={{fontSize:10,color:"#64748b",marginTop:1}}>Clique para marcar como lido</div>}
                    </div>
                    {!n.is_read && <div style={{width:7,height:7,borderRadius:"50%",background:"#f59e0b",flexShrink:0}} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}