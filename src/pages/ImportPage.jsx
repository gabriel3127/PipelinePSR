import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Spinner } from "../components/shared/Spinner";
import { fieldStyle } from "../constants";

export function ImportPage() {
  const { columns, setCards, showToast, activeCompany } = useApp();
  const [headers, setHeaders]   = useState([]);
  const [preview, setPreview]   = useState(null);
  const [mapping, setMapping]   = useState({});
  const [targetCol, setTargetCol] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const FIELDS = [
    { key:"client_name",       label:"Nome do cliente *" },
    { key:"company_name",      label:"Razão social" },
    { key:"phone",             label:"Telefone" },
    { key:"email",             label:"Email" },
    { key:"value",             label:"Valor (R$)" },
    { key:"last_purchase_date",label:"Última compra" },
  ];

  const autoDetect = hdrs => {
    const m = {};
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const hl = h.toLowerCase();
        if (f.key==="client_name")        return /cliente|nome|client/.test(hl);
        if (f.key==="company_name")       return /empresa|company|raz/.test(hl);
        if (f.key==="phone")              return /tel|fone|celular/.test(hl);
        if (f.key==="email")              return /email/.test(hl);
        if (f.key==="value")              return /valor|value|total|venda/.test(hl);
        if (f.key==="last_purchase_date") return /data|compra|purchase/.test(hl);
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
      const hdrs = rows[0].map(h=>String(h||"").trim());
      setHeaders(hdrs);
      setMapping(autoDetect(hdrs));
      setPreview(rows.slice(1).filter(r=>r.some(c=>c)).slice(0,5).map(r=>Object.fromEntries(hdrs.map((h,i)=>[h,r[i]]))));
      setTargetCol(columns[0]?.id||"");
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    if (!mapping.client_name) return showToast("Mapeie o campo Nome","error");
    if (!targetCol) return showToast("Selecione coluna","error");
    setImporting(true);
    const file = fileRef.current.files[0];
    const reader = new FileReader();
    reader.onload = async evt => {
      const wb = XLSX.read(evt.target.result, { type:"binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1 });
      const hdrs = rows[0].map(h=>String(h||"").trim());
      const imported = rows.slice(1).filter(r=>r.some(c=>c)).map((row,i) => {
        const obj = Object.fromEntries(hdrs.map((h,idx)=>[h,row[idx]]));
        let dt = obj[mapping.last_purchase_date];
        if (dt && typeof dt==="number") { const d=new Date((dt-25569)*86400*1000); dt=format(d,"yyyy-MM-dd"); }
        else if (dt) dt = String(dt).trim();
        return { column_id:targetCol, company:activeCompany, client_name:String(obj[mapping.client_name]||"").trim(), company_name:String(obj[mapping.company_name]||"").trim(), phone:String(obj[mapping.phone]||"").trim(), email:String(obj[mapping.email]||"").trim(), value:parseFloat(String(obj[mapping.value]||"0").replace(",","."))||0, last_purchase_date:dt||null, notes:"", assignees:[], location_tags:[], position:i };
      }).filter(c=>c.client_name);
      const { data, error } = await supabase.from("pipeline_cards").insert(imported).select();
      if (error) { showToast(error.message,"error"); setImporting(false); return; }
      setCards(prev=>[...prev,...data]);
      setImporting(false); setPreview(null); fileRef.current.value="";
      showToast(`${data.length} clientes importados!`);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{maxWidth:800}}>
      <h1 style={{margin:"0 0 6px",fontSize:21,fontWeight:700}}>Importar Excel — {activeCompany}</h1>
      <p style={{margin:"0 0 22px",color:"#64748b",fontSize:13}}>Importe clientes direto da planilha do sistema de vendas</p>

      <div onClick={()=>fileRef.current.click()}
        style={{background:"#1e293b",border:"2px dashed #334155",borderRadius:13,padding:34,textAlign:"center",cursor:"pointer",marginBottom:18,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.background="rgba(99,102,241,0.04)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.background="#1e293b";}}>
        <div style={{fontSize:38,marginBottom:10}}>📊</div>
        <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4}}>Clique para selecionar planilha</div>
        <div style={{fontSize:12,color:"#64748b"}}>.xlsx ou .xls</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}} />
      </div>

      {headers.length>0 && (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:14}}>Mapeamento de colunas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {FIELDS.map(f=>(
              <div key={f.key}>
                <label style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:5}}>{f.label}</label>
                <select value={mapping[f.key]||""} onChange={e=>setMapping(p=>({...p,[f.key]:e.target.value}))} style={{...fieldStyle,cursor:"pointer",fontSize:12}}>
                  <option value="">(não importar)</option>
                  {headers.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{marginBottom:14}}>
            <label style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:5}}>Coluna de destino *</label>
            <select value={targetCol} onChange={e=>setTargetCol(e.target.value)} style={{...fieldStyle,cursor:"pointer",maxWidth:260,fontSize:12}}>
              {columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {preview && (
            <div style={{marginBottom:14,overflowX:"auto"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:5}}>Prévia (5 primeiros):</div>
              <table style={{borderCollapse:"collapse",fontSize:11,width:"100%"}}>
                <thead><tr style={{background:"#0f172a"}}>{headers.map(h=><th key={h} style={{padding:"5px 9px",color:"#64748b",fontWeight:600,textAlign:"left",borderBottom:"1px solid #334155",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>{preview.map((row,i)=><tr key={i}>{headers.map(h=><td key={h} style={{padding:"5px 9px",color:"#94a3b8",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{row[h]??""}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}

          <button onClick={doImport} disabled={importing} style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:9,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:importing?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            {importing ? <><Spinner/>Importando...</> : "⬆ Importar clientes"}
          </button>
        </div>
      )}
    </div>
  );
}