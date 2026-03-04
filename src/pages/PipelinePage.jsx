import { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/shared/Modal";
import { FormField } from "../components/shared/FormField";
import { COLORS, PIPELINES, fieldStyle } from "../constants";

function FilterBar({ filters, setFilters, allUsers, locationTags, activePipeline }) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(filters).filter(v => v !== "").length;
  const clear = () => setFilters({ user:"", locationText:"", tag:"", interest:"", valueMin:"", valueMax:"", daysMin:"", daysMax:"" });

  const isDF = activePipeline?.startsWith("df");
  const locationLabel = isDF ? "🏘️ Bairro" : "🏙️ Cidade";
  const locationPlaceholder = isDF ? "Ex: Asa Norte, Taguatinga..." : "Ex: Goiânia, Luziânia...";

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:activeCount>0?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",color:activeCount>0?"#818cf8":"#64748b",border:`1px solid ${activeCount>0?"rgba(99,102,241,0.4)":"#334155"}`,borderRadius:8,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
        🔽 Filtros {activeCount>0 && <span style={{background:"#6366f1",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{activeCount}</span>}
      </button>

      {open && (
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#1e293b",border:"1px solid #334155",borderRadius:14,padding:20,zIndex:200,width:320,boxShadow:"0 16px 48px rgba(0,0,0,0.4)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>Filtros</span>
            {activeCount>0 && <span onClick={clear} style={{fontSize:11,color:"#6366f1",cursor:"pointer"}}>Limpar tudo</span>}
          </div>

          <FormField label="👤 Responsável">
            <select value={filters.user} onChange={e=>setFilters(p=>({...p,user:e.target.value}))} style={{...fieldStyle,cursor:"pointer",fontSize:12}}>
              <option value="">Todos</option>
              {allUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>

          <FormField label={locationLabel}>
            <input value={filters.locationText} onChange={e=>setFilters(p=>({...p,locationText:e.target.value}))} placeholder={locationPlaceholder} style={{...fieldStyle,fontSize:12}} />
          </FormField>

          <FormField label="🏷️ Tag">
            <select value={filters.tag} onChange={e=>setFilters(p=>({...p,tag:e.target.value}))} style={{...fieldStyle,cursor:"pointer",fontSize:12}}>
              <option value="">Todas</option>
              {locationTags.map(lt=><option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </select>
          </FormField>

          <FormField label="🌡️ Nível de interesse">
            <select value={filters.interest} onChange={e=>setFilters(p=>({...p,interest:e.target.value}))} style={{...fieldStyle,cursor:"pointer",fontSize:12}}>
              <option value="">Todos</option>
              <option value="frio">❄️ Frio</option>
              <option value="morno">🌤️ Morno</option>
              <option value="quente">🔥 Quente</option>
            </select>
          </FormField>

          <FormField label="💰 Valor (R$)">
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={filters.valueMin} onChange={e=>setFilters(p=>({...p,valueMin:e.target.value}))} placeholder="Mín" type="number" style={{...fieldStyle,fontSize:12}} />
              <span style={{color:"#475569",fontSize:12,flexShrink:0}}>até</span>
              <input value={filters.valueMax} onChange={e=>setFilters(p=>({...p,valueMax:e.target.value}))} placeholder="Máx" type="number" style={{...fieldStyle,fontSize:12}} />
            </div>
          </FormField>

          <FormField label="📅 Dias sem comprar">
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={filters.daysMin} onChange={e=>setFilters(p=>({...p,daysMin:e.target.value}))} placeholder="Mín" type="number" style={{...fieldStyle,fontSize:12}} />
              <span style={{color:"#475569",fontSize:12,flexShrink:0}}>até</span>
              <input value={filters.daysMax} onChange={e=>setFilters(p=>({...p,daysMax:e.target.value}))} placeholder="Máx" type="number" style={{...fieldStyle,fontSize:12}} />
            </div>
          </FormField>

          <button onClick={()=>setOpen(false)} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>Aplicar</button>
        </div>
      )}
    </div>
  );
}

function CardItem({ card, canDrag, onDragStart, onDragEnd, onClick, allUsers, locationTags, alertDays }) {
  const [hovered, setHovered] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const daysSince = card.last_purchase_date ? differenceInDays(new Date(), parseISO(card.last_purchase_date)) : null;
  const isOld = daysSince !== null && daysSince >= (alertDays||30);

  const nc = card.next_contact;
  const isContactToday   = nc && nc === today;
  const isContactOverdue = nc && nc < today;
  const contactDot = isContactOverdue ? "🟠" : isContactToday ? "🟡" : null;

  const borderColor = hovered
    ? (isOld?"#ef4444":isContactOverdue?"#f97316":isContactToday?"#eab308":"#6366f1")
    : (isOld?"rgba(239,68,68,0.25)":isContactOverdue?"rgba(249,115,22,0.25)":isContactToday?"rgba(234,179,8,0.25)":"#1e293b");

  const assigneeNames = (card.assignees||[]).map(id=>allUsers.find(u=>u.id===id)?.name?.split(" ")[0]).filter(Boolean);
  const tagNames      = (card.location_tags||[]).map(id=>locationTags.find(l=>l.id===id)?.name).filter(Boolean);

  return (
    <div draggable={canDrag} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{background:"#0f172a",border:`1px solid ${borderColor}`,borderRadius:9,padding:11,cursor:canDrag?"grab":"pointer",transition:"all 0.2s",userSelect:"none"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
        <div style={{fontWeight:600,fontSize:12,color:"#f1f5f9",lineHeight:1.3,flex:1}}>{card.client_name}</div>
        <div style={{display:"flex",gap:3,flexShrink:0,marginLeft:4}}>
          {isOld && <span title={`${daysSince}d sem comprar`} style={{fontSize:11}}>🔴</span>}
          {contactDot && <span title={isContactOverdue?`Contato atrasado: ${nc}`:`Contato hoje: ${nc}`} style={{fontSize:11}}>{contactDot}</span>}
        </div>
      </div>
      {card.company_name && <div style={{color:"#64748b",fontSize:10,marginBottom:4}}>{card.company_name}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:(tagNames.length||assigneeNames.length)?5:0}}>
        {daysSince!==null && <span style={{color:isOld?"#ef4444":"#64748b",fontSize:10}}>{daysSince}d atrás</span>}
        {nc && <span style={{color:isContactOverdue?"#f97316":isContactToday?"#eab308":"#64748b",fontSize:10}}>
          📅 {isContactOverdue?"Atrasado":isContactToday?"Hoje":nc}
        </span>}
      </div>
      {tagNames.length>0 && (
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>
          {tagNames.map(n=><span key={n} style={{background:"rgba(6,182,212,0.12)",color:"#22d3ee",fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:4}}>🏷️ {n}</span>)}
        </div>
      )}
      {assigneeNames.length>0 && (
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {assigneeNames.map(n=><span key={n} style={{background:"rgba(99,102,241,0.12)",color:"#818cf8",fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:4}}>👤 {n}</span>)}
        </div>
      )}
    </div>
  );
}

function AddCardModal({ columnId, onClose, onAdd }) {
  const { columns, showToast, activePipeline, allUsers, locationTags, profile } = useApp();
  const col = columns.find(c=>c.id===columnId);
  const [form, setForm] = useState({
    client_name:"", company_name:"", phone:"", email:"",
    value:"", last_purchase_date:"",
    city:"", neighborhood:"", address:"", state:"",
    notes:"",
    assignees:[profile?.id||""], location_tags:[]
  });
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const toggleArr = (field, val) => setForm(p=>({...p,[field]:(p[field]||[]).includes(val)?p[field].filter(x=>x!==val):[...(p[field]||[]),val]}));

  const save = async () => {
    if (!form.client_name.trim()) return showToast("Nome obrigatório","error");
    const { data, error } = await supabase.from("pipeline_cards")
      .insert({...form, column_id:columnId, value:parseFloat(form.value)||0, position:0, pipeline_id:activePipeline})
      .select().single();
    if (error) return showToast(error.message,"error");
    onAdd(data); showToast("Cliente adicionado!");
  };

  return (
    <Modal title={`Novo cliente — ${col?.name||""}`} onClose={onClose} width={540}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <div style={{gridColumn:"1/-1"}}><FormField label="Nome *"><input value={form.client_name} onChange={upd("client_name")} placeholder="Nome do cliente" style={fieldStyle} autoFocus /></FormField></div>
        <FormField label="CNPJ/CPF"><input value={form.company_name} onChange={upd("company_name")} placeholder="12.345.678/0001-99" style={fieldStyle} /></FormField>
        <FormField label="Telefone"><input value={form.phone} onChange={upd("phone")} placeholder="61999990000" style={fieldStyle} /></FormField>
        <FormField label="Email"><input value={form.email} onChange={upd("email")} placeholder="email@empresa.com" style={fieldStyle} /></FormField>
        <FormField label="Última compra"><input value={form.last_purchase_date} onChange={upd("last_purchase_date")} type="date" style={fieldStyle} /></FormField>
        <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr 64px",gap:"0 10px"}}>
          <FormField label="Cidade"><input value={form.city} onChange={upd("city")} style={fieldStyle} /></FormField>
          <FormField label="Bairro"><input value={form.neighborhood} onChange={upd("neighborhood")} style={fieldStyle} /></FormField>
          <FormField label="UF"><input value={form.state} onChange={upd("state")} style={fieldStyle} /></FormField>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <FormField label="Endereço"><input value={form.address} onChange={upd("address")} style={fieldStyle} /></FormField>
          {locationTags.length>0 && (
            <FormField label="🏷️ Tags">
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {locationTags.map(lt=>(
                  <button key={lt.id} type="button" onClick={()=>toggleArr("location_tags",lt.id)} style={{background:form.location_tags.includes(lt.id)?"rgba(6,182,212,0.18)":"rgba(255,255,255,0.04)",color:form.location_tags.includes(lt.id)?"#22d3ee":"#64748b",border:`1px solid ${form.location_tags.includes(lt.id)?"#22d3ee":"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{lt.name}</button>
                ))}
              </div>
            </FormField>
          )}
          <FormField label="👤 Responsáveis">
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {allUsers.map(u=>(
                <button key={u.id} type="button" onClick={()=>toggleArr("assignees",u.id)} style={{background:form.assignees.includes(u.id)?"rgba(99,102,241,0.18)":"rgba(255,255,255,0.04)",color:form.assignees.includes(u.id)?"#818cf8":"#64748b",border:`1px solid ${form.assignees.includes(u.id)?"#6366f1":"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{u.name}</button>
              ))}
            </div>
          </FormField>
          <FormField label="Observações"><textarea value={form.notes} onChange={upd("notes")} rows={2} style={{...fieldStyle,resize:"vertical"}} /></FormField>
        </div>
      </div>
      <button onClick={save} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Adicionar</button>
    </Modal>
  );
}

function CardDetailModal({ card, onClose, onUpdate, onDelete }) {
  const { columns, showToast, can, allUsers, locationTags } = useApp();
  const [tab, setTab] = useState("dados");
  const [form, setForm] = useState({
    ...card,
    value: String(card.value||""),
    sales_history: card.sales_history || [],
    contact_history: card.contact_history || [],
  });
  const [saving, setSaving] = useState(false);
  const canEdit = can("edit_clients");
  const upd = key => e => setForm(p=>({...p,[key]:e.target.value}));
  const toggleArr = (field, val) => {
    if (!canEdit) return;
    setForm(p=>({...p,[field]:(p[field]||[]).includes(val)?(p[field]||[]).filter(x=>x!==val):[...(p[field]||[]),val]}));
  };

  const [newSale, setNewSale] = useState({ doc:"", date:"", value:"" });
  const addSale = () => {
    if (!newSale.doc && !newSale.value) return;
    const sale = {...newSale, id:Date.now()};
    setForm(p => {
      const updatedHistory = [...p.sales_history, sale];
      let newLastDate = p.last_purchase_date;
      if (sale.date && (!newLastDate || sale.date > newLastDate)) newLastDate = sale.date;
      const totalValue = updatedHistory.reduce((s,v)=>s+(parseFloat(v.value)||0),0);
      return {...p, sales_history:updatedHistory, last_purchase_date:newLastDate, value:String(totalValue)};
    });
    setNewSale({ doc:"", date:"", value:"" });
  };

  const removeSale = id => {
    setForm(p => {
      const updatedHistory = p.sales_history.filter(s => s.id !== id);
      const datesFromHistory = updatedHistory.map(s => s.date).filter(Boolean);
      const mostRecent = datesFromHistory.length > 0
        ? datesFromHistory.sort().reverse()[0]
        : card.last_purchase_date;
      const totalValue = updatedHistory.reduce((s, v) => s + (parseFloat(v.value) || 0), 0);
      return { ...p, sales_history: updatedHistory, last_purchase_date: mostRecent, value: String(totalValue) };
    });
  };

  const [newContact, setNewContact] = useState({ type:"ligação", date:"", note:"" });
  const addContact = () => {
    if (!newContact.note) return;
    const contact = {...newContact, id:Date.now()};
    setForm(p => {
      const shouldClearNextContact = !p.next_contact || p.next_contact <= new Date().toISOString().slice(0,10);
      return {
        ...p,
        contact_history: [...p.contact_history, contact],
        next_contact: shouldClearNextContact ? "" : p.next_contact,
      };
    });
    setNewContact({ type:"ligação", date:"", note:"" });
  };

  const removeContact = id => setForm(p=>({...p, contact_history:p.contact_history.filter(c=>c.id!==id)}));

  const save = async () => {
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      company_name: form.company_name,
      phone: form.phone,
      email: form.email,
      value: parseFloat(form.value)||0,
      last_purchase_date: form.last_purchase_date||null,
      city: form.city||null,
      neighborhood: form.neighborhood||null,
      address: form.address||null,
      state: form.state||null,
      notes: form.notes,
      assignees: form.assignees||[],
      location_tags: form.location_tags||[],
      buyer_name: form.buyer_name||null,
      buyer_role: form.buyer_role||null,
      interest_level: form.interest_level||"morno",
      products_interest: form.products_interest||null,
      next_contact: form.next_contact||null,
      sales_history: form.sales_history||[],
      contact_history: form.contact_history||[],
      updated_at: new Date().toISOString()
    };
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

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)} style={{background:tab===id?"rgba(99,102,241,0.2)":"transparent",color:tab===id?"#818cf8":"#64748b",border:tab===id?"1px solid rgba(99,102,241,0.4)":"1px solid transparent",borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
      {label}
    </button>
  );

  const interestColors = { frio:"#3b82f6", morno:"#f59e0b", quente:"#ef4444" };

  return (
    <Modal title="Detalhes do cliente" onClose={onClose} width={580}>
      <div style={{display:"flex",gap:4,marginBottom:18,borderBottom:"1px solid #334155",paddingBottom:10}}>
        {tabBtn("dados","📋 Cadastro")}
        {tabBtn("relacionamento","🤝 Relacionamento")}
      </div>

      {tab==="dados" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{gridColumn:"1/-1"}}>
            <FormField label="Nome"><input value={form.client_name} onChange={upd("client_name")} style={fieldStyle} disabled={!canEdit} /></FormField>
          </div>
          <FormField label="CNPJ/CPF"><input value={form.company_name||""} onChange={upd("company_name")} style={fieldStyle} disabled={!canEdit} /></FormField>
          <FormField label="Telefone"><input value={form.phone||""} onChange={upd("phone")} style={fieldStyle} disabled={!canEdit} /></FormField>
          <FormField label="Email"><input value={form.email||""} onChange={upd("email")} style={fieldStyle} disabled={!canEdit} /></FormField>
          <FormField label="Última compra"><input value={form.last_purchase_date||""} onChange={upd("last_purchase_date")} type="date" style={fieldStyle} disabled={!canEdit} /></FormField>
          <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr 64px",gap:"0 10px"}}>
            <FormField label="Cidade"><input value={form.city||""} onChange={upd("city")} style={fieldStyle} disabled={!canEdit} /></FormField>
            <FormField label="Bairro"><input value={form.neighborhood||""} onChange={upd("neighborhood")} style={fieldStyle} disabled={!canEdit} /></FormField>
            <FormField label="UF"><input value={form.state||""} onChange={upd("state")} style={fieldStyle} disabled={!canEdit} /></FormField>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <FormField label="Endereço"><input value={form.address||""} onChange={upd("address")} style={fieldStyle} disabled={!canEdit} /></FormField>
          </div>
          {locationTags.length>0 && (
            <div style={{gridColumn:"1/-1"}}>
              <FormField label="🏷️ Tags">
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {locationTags.map(lt=>(
                    <button key={lt.id} type="button" onClick={()=>toggleArr("location_tags",lt.id)}
                      style={{background:(form.location_tags||[]).includes(lt.id)?"rgba(6,182,212,0.18)":"rgba(255,255,255,0.04)",color:(form.location_tags||[]).includes(lt.id)?"#22d3ee":"#64748b",border:`1px solid ${(form.location_tags||[]).includes(lt.id)?"#22d3ee":"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:canEdit?"pointer":"default",fontFamily:"inherit"}}>
                      {lt.name}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          )}
          <div style={{gridColumn:"1/-1"}}>
            <FormField label="👤 Responsáveis">
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {allUsers.map(u=>(
                  <button key={u.id} type="button" onClick={()=>toggleArr("assignees",u.id)}
                    style={{background:(form.assignees||[]).includes(u.id)?"rgba(99,102,241,0.18)":"rgba(255,255,255,0.04)",color:(form.assignees||[]).includes(u.id)?"#818cf8":"#64748b",border:`1px solid ${(form.assignees||[]).includes(u.id)?"#6366f1":"#334155"}`,borderRadius:6,padding:"4px 10px",fontSize:12,cursor:canEdit?"pointer":"default",fontFamily:"inherit"}}>
                    {u.name}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        </div>
      )}

      {tab==="relacionamento" && (
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <FormField label="👤 Nome do comprador">
              <input value={form.buyer_name||""} onChange={upd("buyer_name")} placeholder="Pessoa física responsável" style={fieldStyle} disabled={!canEdit} />
            </FormField>
            <FormField label="Cargo/Função">
              <input value={form.buyer_role||""} onChange={upd("buyer_role")} placeholder="Ex: Gerente de compras" style={fieldStyle} disabled={!canEdit} />
            </FormField>
          </div>

          <FormField label="🌡️ Nível de interesse">
            <div style={{display:"flex",gap:8}}>
              {["frio","morno","quente"].map(level=>(
                <button key={level} type="button" onClick={()=>canEdit&&setForm(p=>({...p,interest_level:level}))}
                  style={{flex:1,background:form.interest_level===level?`${interestColors[level]}22`:"rgba(255,255,255,0.04)",color:form.interest_level===level?interestColors[level]:"#64748b",border:`1px solid ${form.interest_level===level?interestColors[level]:"#334155"}`,borderRadius:7,padding:"7px",fontSize:12,fontWeight:600,cursor:canEdit?"pointer":"default",fontFamily:"inherit",textTransform:"capitalize"}}>
                  {level==="frio"?"❄️ Frio":level==="morno"?"🌤️ Morno":"🔥 Quente"}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="📦 Produtos de interesse">
            <textarea value={form.products_interest||""} onChange={upd("products_interest")} rows={2} placeholder="Ex: Caixas de papelão, sacolas, embalagens..." style={{...fieldStyle,resize:"vertical"}} disabled={!canEdit} />
          </FormField>

          <FormField label="📅 Próximo contato">
            <input value={form.next_contact||""} onChange={upd("next_contact")} type="date" style={{...fieldStyle,maxWidth:200}} disabled={!canEdit} />
          </FormField>

          <div style={{marginTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📄 Histórico de vendas</div>
            {canEdit && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:6,marginBottom:8,alignItems:"flex-end"}}>
                <div>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:3}}>Nº Documento</label>
                  <input value={newSale.doc} onChange={e=>setNewSale(p=>({...p,doc:e.target.value}))} placeholder="Ex: NF-001" style={{...fieldStyle,fontSize:11}} />
                </div>
                <div>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:3}}>Data</label>
                  <input value={newSale.date} onChange={e=>setNewSale(p=>({...p,date:e.target.value}))} type="date" style={{...fieldStyle,fontSize:11}} />
                </div>
                <div>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:3}}>Valor (R$)</label>
                  <input value={newSale.value} onChange={e=>setNewSale(p=>({...p,value:e.target.value}))} type="number" placeholder="0.00" style={{...fieldStyle,fontSize:11}} />
                </div>
                <button onClick={addSale} style={{background:"rgba(99,102,241,0.15)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",borderRadius:7,padding:"7px 10px",fontSize:18,cursor:"pointer",lineHeight:1}}>+</button>
              </div>
            )}
            {form.sales_history.length===0
              ? <div style={{color:"#475569",fontSize:12,textAlign:"center",padding:"12px 0"}}>Nenhuma venda registrada</div>
              : <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:160,overflowY:"auto"}}>
                  {[...form.sales_history].reverse().map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,background:"#0f172a",borderRadius:7,padding:"7px 10px"}}>
                      <span style={{fontSize:11,color:"#818cf8",fontWeight:600,flex:1}}>📄 {s.doc||"—"}</span>
                      <span style={{fontSize:11,color:"#64748b"}}>{s.date||"—"}</span>
                      <span style={{fontSize:11,color:"#10b981",fontWeight:600}}>R$ {Number(s.value||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                      {canEdit && <button onClick={()=>removeSale(s.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,padding:0}}>×</button>}
                    </div>
                  ))}
                </div>
            }
          </div>

          <div style={{marginTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📞 Histórico de contatos</div>
            {canEdit && (
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:6,marginBottom:8,alignItems:"flex-end"}}>
                <div>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:3}}>Tipo</label>
                  <select value={newContact.type} onChange={e=>setNewContact(p=>({...p,type:e.target.value}))} style={{...fieldStyle,fontSize:11,cursor:"pointer"}}>
                    <option value="ligação">📞 Ligação</option>
                    <option value="visita">🚗 Visita</option>
                    <option value="email">✉️ Email</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:10,color:"#64748b",display:"block",marginBottom:3}}>Anotação</label>
                  <input value={newContact.note} onChange={e=>setNewContact(p=>({...p,note:e.target.value}))} placeholder="O que foi discutido..." style={{...fieldStyle,fontSize:11}} onKeyDown={e=>e.key==="Enter"&&addContact()} />
                </div>
                <button onClick={addContact} style={{background:"rgba(99,102,241,0.15)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",borderRadius:7,padding:"7px 10px",fontSize:18,cursor:"pointer",lineHeight:1}}>+</button>
              </div>
            )}
            {form.contact_history.length===0
              ? <div style={{color:"#475569",fontSize:12,textAlign:"center",padding:"12px 0"}}>Nenhum contato registrado</div>
              : <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:160,overflowY:"auto"}}>
                  {[...form.contact_history].reverse().map(c=>(
                    <div key={c.id} style={{background:"#0f172a",borderRadius:7,padding:"8px 10px",display:"flex",alignItems:"flex-start",gap:8}}>
                      <span style={{fontSize:10,color:"#6366f1",fontWeight:700,flexShrink:0,textTransform:"capitalize"}}>{c.type==="ligação"?"📞":c.type==="visita"?"🚗":c.type==="email"?"✉️":"💬"} {c.type}</span>
                      <span style={{fontSize:11,color:"#94a3b8",flex:1}}>{c.note}</span>
                      {canEdit && <button onClick={()=>removeContact(c.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,padding:0,flexShrink:0}}>×</button>}
                    </div>
                  ))}
                </div>
            }
          </div>

          <div style={{marginTop:12}}>
            <FormField label="📝 Observações">
              <textarea value={form.notes||""} onChange={upd("notes")} rows={2} style={{...fieldStyle,resize:"vertical"}} disabled={!canEdit} />
            </FormField>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:16}}>
        {canEdit && <button onClick={save} disabled={saving} style={{flex:1,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:saving?"wait":"pointer",fontFamily:"inherit"}}>{saving?"Salvando...":"Salvar alterações"}</button>}
        {can("delete_clients") && <button onClick={del} style={{background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:"12px 16px",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>🗑️</button>}
      </div>
    </Modal>
  );
}

export function PipelinePage() {
  const { columns, setColumns, cards, setCards, showToast, can, activePipeline, allUsers, locationTags, appSettings } = useApp();
  const pipelineInfo = PIPELINES.find(p=>p.id===activePipeline);
  const alertDays = appSettings?.days_without_purchase_alert || 30;

  const [dragging, setDragging]         = useState(null);
  const [dragOver, setDragOver]         = useState(null);
  const [search, setSearch]             = useState("");
  const [showAddCol, setShowAddCol]     = useState(false);
  const [newColName, setNewColName]     = useState("");
  const [newColColor, setNewColColor]   = useState("#6366f1");
  const [newColMaxDays, setNewColMaxDays] = useState("");
  const [newColAutoMove, setNewColAutoMove] = useState("");
  const [editingCol, setEditingCol]     = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [addCardCol, setAddCardCol]     = useState(null);
  const [filters, setFilters] = useState({ user:"", locationText:"", tag:"", interest:"", valueMin:"", valueMax:"", daysMin:"", daysMax:"" });

  const applyFilters = (c) => {
    if (search && !c.client_name?.toLowerCase().includes(search.toLowerCase()) && !c.company_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.user && !(c.assignees||[]).includes(filters.user)) return false;
    if (filters.locationText) {
      const isDF = activePipeline?.startsWith("df");
      const field = isDF ? (c.neighborhood||"") : (c.city||"");
      if (!field.toLowerCase().includes(filters.locationText.toLowerCase())) return false;
    }
    if (filters.tag && !(c.location_tags||[]).includes(filters.tag)) return false;
    if (filters.interest && (c.interest_level||"morno") !== filters.interest) return false;
    if (filters.valueMin && Number(c.value) < Number(filters.valueMin)) return false;
    if (filters.valueMax && Number(c.value) > Number(filters.valueMax)) return false;
    if (filters.daysMin || filters.daysMax) {
      if (!c.last_purchase_date) return false;
      const days = differenceInDays(new Date(), parseISO(c.last_purchase_date));
      if (filters.daysMin && days < Number(filters.daysMin)) return false;
      if (filters.daysMax && days > Number(filters.daysMax)) return false;
    }
    return true;
  };

  const filtered    = cards.filter(applyFilters);
  const getColCards = colId => filtered.filter(c=>c.column_id===colId).sort((a,b)=>(a.position||0)-(b.position||0));
  const getColTotal = colId => cards.filter(c=>c.column_id===colId).reduce((s,c)=>s+(Number(c.value)||0),0);
  const totalAll    = cards.reduce((s,c)=>s+(Number(c.value)||0),0);
  const activeCount = Object.values(filters).filter(v=>v!=="").length;

  const onDrop = async (e, colId) => {
    e.preventDefault();
    if (!dragging||dragging.column_id===colId||!can("move_cards")) { setDragOver(null); return; }
    const updated = {...dragging, column_id:colId, updated_at:new Date().toISOString()};
    setCards(prev=>prev.map(c=>c.id===dragging.id?updated:c));
    await supabase.from("pipeline_cards").update({column_id:colId, updated_at:updated.updated_at}).eq("id",dragging.id);
    showToast(`${dragging.client_name} → ${columns.find(c=>c.id===colId)?.name}`);
    setDragOver(null);
  };

  const addColumn = async () => {
    if (!newColName.trim()) return;
    const { data, error } = await supabase.from("pipeline_columns").insert({
      name: newColName.trim(), color: newColColor, position: columns.length,
      pipeline_id: activePipeline,
      max_days: newColMaxDays ? parseInt(newColMaxDays) : null,
      auto_move_to_column_id: newColAutoMove || null,
    }).select().single();
    if (error) return showToast(error.message,"error");
    setColumns(prev=>[...prev,data]);
    setNewColName(""); setNewColMaxDays(""); setNewColAutoMove("");
    setShowAddCol(false); showToast("Coluna adicionada!");
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
    const { error } = await supabase.from("pipeline_columns").update({
      name: editingCol.name, color: editingCol.color,
      max_days: editingCol.max_days || null,
      auto_move_to_column_id: editingCol.auto_move_to_column_id || null,
    }).eq("id", editingCol.id);
    if (error) return showToast(error.message,"error");
    setColumns(prev=>prev.map(c=>c.id===editingCol.id?{...c,...editingCol}:c));
    setEditingCol(null); showToast("Coluna atualizada!");
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:pipelineInfo?.color}} />
          <div>
            <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#f1f5f9"}}>{pipelineInfo?.label}</h1>
            <p style={{margin:"2px 0 0",color:"#64748b",fontSize:12}}>
              {cards.length} clientes · R$ {totalAll.toLocaleString("pt-BR",{minimumFractionDigits:2})}
              {activeCount>0 && <span style={{color:"#818cf8"}}> · {filtered.length} filtrados</span>}
            </p>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{background:"#1e293b",border:"1px solid #334155",borderRadius:7,padding:"6px 12px",color:"#f1f5f9",fontSize:12,outline:"none",fontFamily:"inherit",width:160}} />
          <FilterBar filters={filters} setFilters={setFilters} allUsers={allUsers} locationTags={locationTags} activePipeline={activePipeline} />
          {can("manage_columns") && (
            <button onClick={()=>setShowAddCol(true)} style={{background:"rgba(99,102,241,0.15)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.3)",borderRadius:7,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Coluna</button>
          )}
        </div>
      </div>

      <div style={{display:"flex",gap:13,overflowX:"auto",paddingBottom:16,alignItems:"flex-start",minHeight:"calc(100vh - 200px)"}}>
        {columns.map(col=>(
          <div key={col.id}
            onDragOver={e=>{e.preventDefault();setDragOver(col.id)}}
            onDrop={e=>onDrop(e,col.id)}
            onDragLeave={()=>setDragOver(null)}
            style={{minWidth:268,maxWidth:268,background:dragOver===col.id?"rgba(99,102,241,0.08)":"#1e293b",borderRadius:13,border:`1px solid ${dragOver===col.id?"#6366f1":"#334155"}`,transition:"all 0.2s",flexShrink:0}}>
            <div style={{padding:"11px 13px",borderBottom:"1px solid #334155",display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:col.color,flexShrink:0}} />
              <span style={{fontWeight:700,fontSize:12,color:"#e2e8f0",flex:1}}>{col.name}</span>
              {col.max_days && <span title={`Máx ${col.max_days} dias`} style={{fontSize:10,color:"#f59e0b"}}>⏱️{col.max_days}d</span>}
              <span style={{background:"rgba(255,255,255,0.07)",color:"#94a3b8",fontSize:10,padding:"2px 7px",borderRadius:8,fontWeight:600}}>{getColCards(col.id).length}</span>
              {can("manage_columns") && <>
                <button onClick={()=>setEditingCol({...col})} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,padding:2}}>✏️</button>
                <button onClick={()=>deleteColumn(col.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,padding:2}}>🗑️</button>
              </>}
            </div>
            <div style={{padding:"4px 13px 7px",fontSize:10,color:"#64748b",borderBottom:"1px solid #1e293b"}}>
              R$ {getColTotal(col.id).toLocaleString("pt-BR",{minimumFractionDigits:2})}
            </div>
            <div style={{padding:8,display:"flex",flexDirection:"column",gap:6,minHeight:80}}>
              {getColCards(col.id).map(card=>(
                <CardItem key={card.id} card={card} canDrag={can("move_cards")}
                  onDragStart={()=>setDragging(card)} onDragEnd={()=>{setDragging(null);setDragOver(null);}}
                  onClick={()=>setSelectedCard(card)} allUsers={allUsers} locationTags={locationTags}
                  alertDays={alertDays} />
              ))}
              {can("add_clients") && (
                <button onClick={()=>setAddCardCol(col.id)}
                  style={{background:"rgba(255,255,255,0.02)",border:"1px dashed #334155",borderRadius:7,padding:8,color:"#475569",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.target.style.borderColor=col.color;e.target.style.color=col.color;}}
                  onMouseLeave={e=>{e.target.style.borderColor="#334155";e.target.style.color="#475569";}}>
                  + Adicionar cliente
                </button>
              )}
            </div>
          </div>
        ))}
        {columns.length===0 && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#475569",padding:60,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗂️</div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:6,color:"#64748b"}}>Nenhuma coluna neste pipeline</div>
            {can("manage_columns") && <button onClick={()=>setShowAddCol(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"9px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:12}}>+ Criar primeira coluna</button>}
          </div>
        )}
      </div>

      {showAddCol && <Modal title="Nova coluna" onClose={()=>setShowAddCol(false)} width={400}>
        <FormField label="Nome">
          <input value={newColName} onChange={e=>setNewColName(e.target.value)} placeholder="Ex: Em Análise" style={fieldStyle} autoFocus onKeyDown={e=>e.key==="Enter"&&addColumn()} />
        </FormField>
        <FormField label="Cor">
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {COLORS.map(c=><div key={c} onClick={()=>setNewColColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:newColColor===c?"3px solid #fff":"3px solid transparent"}} />)}
          </div>
        </FormField>
        <FormField label="⏱️ Máx. dias nesta etapa (opcional)">
          <input value={newColMaxDays} onChange={e=>setNewColMaxDays(e.target.value)} type="number" min={1} placeholder="Ex: 7" style={{...fieldStyle,maxWidth:120}} />
        </FormField>
        {newColMaxDays && (
          <FormField label="↪️ Mover automaticamente para">
            <select value={newColAutoMove} onChange={e=>setNewColAutoMove(e.target.value)} style={{...fieldStyle,cursor:"pointer"}}>
              <option value="">Só alertar (não mover)</option>
              {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
        )}
        <button onClick={addColumn} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Criar</button>
      </Modal>}

      {editingCol && <Modal title="Editar coluna" onClose={()=>setEditingCol(null)} width={400}>
        <FormField label="Nome">
          <input value={editingCol.name} onChange={e=>setEditingCol(p=>({...p,name:e.target.value}))} style={fieldStyle} />
        </FormField>
        <FormField label="Cor">
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {COLORS.map(c=><div key={c} onClick={()=>setEditingCol(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:editingCol.color===c?"3px solid #fff":"3px solid transparent"}} />)}
          </div>
        </FormField>
        <FormField label="⏱️ Máx. dias nesta etapa (opcional)">
          <input value={editingCol.max_days||""} onChange={e=>setEditingCol(p=>({...p,max_days:e.target.value?parseInt(e.target.value):null}))} type="number" min={1} placeholder="Ex: 7" style={{...fieldStyle,maxWidth:120}} />
        </FormField>
        {editingCol.max_days && (
          <FormField label="↪️ Mover automaticamente para">
            <select value={editingCol.auto_move_to_column_id||""} onChange={e=>setEditingCol(p=>({...p,auto_move_to_column_id:e.target.value||null}))} style={{...fieldStyle,cursor:"pointer"}}>
              <option value="">Só alertar (não mover)</option>
              {columns.filter(c=>c.id!==editingCol.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
        )}
        <button onClick={saveCol} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Salvar</button>
      </Modal>}

      {selectedCard && <CardDetailModal card={selectedCard} onClose={()=>setSelectedCard(null)} onUpdate={u=>{setCards(prev=>prev.map(c=>c.id===u.id?u:c));setSelectedCard(null);}} onDelete={id=>{setCards(prev=>prev.filter(c=>c.id!==id));setSelectedCard(null);}} />}
      {addCardCol && <AddCardModal columnId={addCardCol} onClose={()=>setAddCardCol(null)} onAdd={card=>{setCards(prev=>[...prev,card]);setAddCardCol(null);}} />}
    </div>
  );
}