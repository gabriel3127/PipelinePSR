import { useState, useEffect } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/shared/Modal";
import { FormField } from "../components/shared/FormField";
import { fieldStyle } from "../constants";

export function AlertsPage() {
  const { cards, columns, notifRules, setNotifRules, showToast, can, activeCompany } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ name:"", type:"days_no_purchase", threshold_days:30, column_id:"", is_active:true });

  // Gera notificações com base nas regras
  useEffect(() => {
    if (!cards.length || !notifRules.length) { setNotifications([]); return; }
    const generated = [];
    notifRules.filter(r=>r.is_active).forEach(rule => {
      cards.forEach(card => {
        if (rule.type==="days_no_purchase" && card.last_purchase_date) {
          const days = differenceInDays(new Date(), parseISO(card.last_purchase_date));
          if (days >= rule.threshold_days)
            generated.push({ id:`np_${card.id}_${rule.id}`, card_id:card.id, message:`${card.client_name} está há ${days} dias sem comprar`, type:"purchase", days, is_read:false });
        }
        if (rule.type==="days_in_column" && card.updated_at) {
          const days = differenceInDays(new Date(), parseISO(card.updated_at));
          if (days >= rule.threshold_days) {
            const col = columns.find(c=>c.id===card.column_id);
            generated.push({ id:`dc_${card.id}_${rule.id}`, card_id:card.id, message:`${card.client_name} está há ${days} dias em "${col?.name||"etapa"}"`, type:"column", days, is_read:false });
          }
        }
      });
    });
    setNotifications(generated);
  }, [cards, notifRules, columns]);

  const unread = notifications.filter(n=>!n.is_read).length;
  const markRead = id => setNotifications(prev=>prev.map(n=>n.id===id?{...n,is_read:true}:n));
  const markAll  = () => setNotifications(prev=>prev.map(n=>({...n,is_read:true})));

  const addRule = async () => {
    if (!newRule.name||!newRule.threshold_days) return showToast("Preencha todos os campos","error");
    const { data, error } = await supabase.from("notification_rules").insert({...newRule, column_id:newRule.column_id||null, company:activeCompany}).select().single();
    if (error) return showToast(error.message,"error");
    setNotifRules(prev=>[...prev,data]); setShowAdd(false); showToast("Regra criada!");
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

  return (
    <div style={{maxWidth:800}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:21,fontWeight:700}}>Alertas — {activeCompany}</h1>
          <p style={{margin:"3px 0 0",color:"#64748b",fontSize:12}}>{unread} não lidos · {notifications.length} total</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {unread>0 && <button onClick={markAll} style={{background:"rgba(99,102,241,0.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.2)",borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Marcar tudo lido</button>}
          {can("manage_alerts") && <button onClick={()=>setShowAdd(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Nova regra</button>}
        </div>
      </div>

      {can("manage_alerts") && (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:16,marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Regras configuradas</div>
          {notifRules.length===0 && <div style={{color:"#475569",fontSize:12,textAlign:"center",padding:16}}>Nenhuma regra. Crie uma acima.</div>}
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

      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {notifications.length===0
          ? <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:34,textAlign:"center"}}><div style={{fontSize:34,marginBottom:10}}>✅</div><div style={{fontSize:14,fontWeight:600,color:"#e2e8f0"}}>Tudo em dia!</div></div>
          : notifications.map(n=>(
            <div key={n.id} onClick={()=>markRead(n.id)} style={{background:n.is_read?"#1e293b":"rgba(239,68,68,0.05)",border:`1px solid ${n.is_read?"#334155":"rgba(239,68,68,0.2)"}`,borderRadius:11,padding:"11px 15px",cursor:n.is_read?"default":"pointer",display:"flex",alignItems:"center",gap:11}}>
              <span style={{fontSize:17}}>{n.type==="purchase"?"🛒":"⏱️"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{n.message}</div>
                {!n.is_read && <div style={{fontSize:10,color:"#64748b",marginTop:1}}>Clique para marcar como lido</div>}
              </div>
              {!n.is_read && <div style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",flexShrink:0}} />}
            </div>
          ))
        }
      </div>

      {showAdd && <Modal title="Nova regra de alerta" onClose={()=>setShowAdd(false)} width={400}>
        <FormField label="Nome"><input value={newRule.name} onChange={e=>setNewRule(p=>({...p,name:e.target.value}))} placeholder="Ex: Sem compra há 30 dias" style={fieldStyle} autoFocus /></FormField>
        <FormField label="Tipo">
          <select value={newRule.type} onChange={e=>setNewRule(p=>({...p,type:e.target.value}))} style={{...fieldStyle,cursor:"pointer"}}>
            <option value="days_no_purchase">Dias sem compra</option>
            <option value="days_in_column">Dias parado na etapa</option>
          </select>
        </FormField>
        <FormField label="Limite de dias"><input value={newRule.threshold_days} onChange={e=>setNewRule(p=>({...p,threshold_days:parseInt(e.target.value)||0}))} type="number" min={1} style={fieldStyle} /></FormField>
        <button onClick={addRule} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Criar regra</button>
      </Modal>}
    </div>
  );
}