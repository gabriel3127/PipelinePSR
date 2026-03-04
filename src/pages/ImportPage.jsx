import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { parse, format } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Spinner } from "../components/shared/Spinner";
import { fieldStyle } from "../constants";

export function ImportPage() {
  const { setCards, showToast, activePipeline, accessiblePipelines } = useApp();
  const [headers, setHeaders]       = useState([]);
  const [preview, setPreview]       = useState(null);
  const [mapping, setMapping]       = useState({});
  const [targetPipeline, setTargetPipeline] = useState("");
  const [importing, setImporting]   = useState(false);
  const [separator, setSeparator]   = useState(";");
  const fileRef = useRef();
  const [firstColumnId, setFirstColumnId] = useState(null);

  useEffect(() => {
    if (activePipeline && !targetPipeline) setTargetPipeline(activePipeline);
  }, [activePipeline]);

  const FIELDS = [
    { key:"client_name",        label:"Nome do cliente *" },
    { key:"company_name",       label:"Razão social / CNPJ" },
    { key:"phone",              label:"Telefone" },
    { key:"email",              label:"Email" },
    { key:"value",              label:"Valor (R$)" },
    { key:"last_purchase_date", label:"Última compra" },
    { key:"city",               label:"Cidade" },
    { key:"neighborhood",       label:"Bairro" },
    { key:"state",              label:"UF" },
    { key:"address",            label:"Endereço" },
  ];

  const autoDetect = (hdrs) => {
    const m = {};
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const hl = h.toLowerCase().trim();
        if (f.key==="client_name")        return /nome.fantasia|nome|cliente/.test(hl);
        if (f.key==="company_name")       return /cnpj|cpf|raz/.test(hl);
        if (f.key==="phone")              return /tel|fone|celular/.test(hl);
        if (f.key==="email")              return /^email$/.test(hl);
        if (f.key==="value")              return /^valor$|^value$|^total$/.test(hl);
        if (f.key==="last_purchase_date") return /ltima|venda/.test(hl);
        if (f.key==="city")               return /^cidade$|^city$/.test(hl);
        if (f.key==="neighborhood")       return /^bairro$/.test(hl);
        if (f.key==="state")              return /^uf$|^estado$/.test(hl);
        if (f.key==="address")            return /^endereco$|^endereço$/.test(hl);
        return false;
      });
      if (match) m[f.key] = match;
    });
    return m;
  };

  const parseDate = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    try { return format(parse(s, "dd/MM/yyyy HH:mm", new Date()), "yyyy-MM-dd"); } catch {}
    try { return format(parse(s, "dd/MM/yyyy", new Date()), "yyyy-MM-dd"); } catch {}
    if (!isNaN(Number(s))) {
      return format(new Date((Number(s) - 25569) * 86400 * 1000), "yyyy-MM-dd");
    }
    return null;
  };

  const parseRows = (text, isCSV, binaryResult) => {
    if (isCSV) {
      return text.split("\n").filter(l => l.trim()).map(l => l.split(separator));
    } else {
      const wb = XLSX.read(binaryResult, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { header: 1 });
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const isCSV = file.name.endsWith(".csv");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rows = parseRows(evt.target.result, isCSV, evt.target.result);
      if (!rows.length) return showToast("Arquivo vazio", "error");
      const hdrs = rows[0].map(h => String(h || "").trim());
      setHeaders(hdrs);
      setMapping(autoDetect(hdrs));
      setPreview(rows.slice(1).filter(r => r.some(c => c)).slice(0, 5)
        .map(r => Object.fromEntries(hdrs.map((h, i) => [h, r[i]]))));
      const { data: cols } = await supabase
        .from("pipeline_columns")
        .select("id")
        .eq("pipeline_id", targetPipeline || activePipeline)
        .order("position", { ascending: true })
        .limit(1);
      if (cols?.length) setFirstColumnId(cols[0].id);
    };
    if (isCSV) reader.readAsText(file, "latin1");
    else reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    if (!mapping.client_name) return showToast("Mapeie o campo Nome", "error");
    if (!targetPipeline) return showToast("Selecione o pipeline", "error");
    setImporting(true);

    // Busca a primeira coluna do pipeline SELECIONADO
    const { data: cols } = await supabase
      .from("pipeline_columns")
      .select("id")
      .eq("pipeline_id", targetPipeline)
      .order("position", { ascending: true })
      .limit(1);

    const colId = cols?.[0]?.id || null;
    if (!colId) {
      showToast("Crie ao menos uma coluna no pipeline antes de importar", "error");
      setImporting(false);
      return;
    }

    const file = fileRef.current.files[0];
    const isCSV = file.name.endsWith(".csv");
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const rows = parseRows(evt.target.result, isCSV, evt.target.result);
      const hdrs = rows[0].map(h => String(h || "").trim());
      const get  = (obj, key) => mapping[key] ? String(obj[mapping[key]] ?? "").trim() : "";

      const imported = rows.slice(1).filter(r => r.some(c => c)).map((row, i) => {
        const obj = Object.fromEntries(hdrs.map((h, idx) => [h, row[idx]]));
        const addressParts = [get(obj,"address"), get(obj,"neighborhood"), get(obj,"city"), get(obj,"state")].filter(Boolean);
          return {
            pipeline_id:        targetPipeline,
            column_id:          colId,
            client_name:        get(obj, "client_name"),
            company_name:       get(obj, "company_name"),
            phone:              get(obj, "phone"),
            email:              get(obj, "email"),
            value:              parseFloat(get(obj, "value").replace(",", ".")) || 0,
            last_purchase_date: parseDate(get(obj, "last_purchase_date")),
            city:               get(obj, "city"),
            neighborhood:       get(obj, "neighborhood"),
            address:            get(obj, "address"),
            state:              get(obj, "state"),
            notes:              "",   // ← limpo para novas observações
            assignees:          [],
            location_tags:      [],
            position:           i,
          };
      }).filter(c => c.client_name);

      let total = 0;
      const BATCH = 100;
      for (let i = 0; i < imported.length; i += BATCH) {
        const { data, error } = await supabase.from("pipeline_cards")
          .insert(imported.slice(i, i + BATCH)).select();
        if (error) { showToast(error.message, "error"); setImporting(false); return; }
        total += data.length;
        setCards(prev => [...prev, ...data]);
      }

      setImporting(false);
      setPreview(null);
      fileRef.current.value = "";
      showToast(`${total} clientes importados!`);
    };

    if (isCSV) reader.readAsText(file, "latin1");
    else reader.readAsBinaryString(file);
  };

  return (
    <div style={{maxWidth:820}}>
      <h1 style={{margin:"0 0 6px",fontSize:21,fontWeight:700}}>Importar Clientes</h1>
      <p style={{margin:"0 0 22px",color:"#64748b",fontSize:13}}>Suporta CSV (separado por ; ou ,) e Excel (.xlsx)</p>

      {/* Separador CSV */}
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Separador do CSV:</span>
        {[";", ",", "\t"].map(s => (
          <button key={s} onClick={() => setSeparator(s)}
            style={{background:separator===s?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)",color:separator===s?"#818cf8":"#64748b",border:`1px solid ${separator===s?"#6366f1":"#334155"}`,borderRadius:6,padding:"4px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {s==="\t" ? "Tab" : s}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div onClick={() => fileRef.current.click()}
        style={{background:"#1e293b",border:"2px dashed #334155",borderRadius:13,padding:34,textAlign:"center",cursor:"pointer",marginBottom:18,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.background="rgba(99,102,241,0.04)";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#334155";e.currentTarget.style.background="#1e293b";}}>
        <div style={{fontSize:38,marginBottom:10}}>📂</div>
        <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4}}>Clique para selecionar arquivo</div>
        <div style={{fontSize:12,color:"#64748b"}}>.csv ou .xlsx</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{display:"none"}} />
      </div>

      {headers.length > 0 && (
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:13,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:14}}>Mapeamento de colunas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:5}}>{f.label}</label>
                <select value={mapping[f.key]||""} onChange={e=>setMapping(p=>({...p,[f.key]:e.target.value}))} style={{...fieldStyle,cursor:"pointer",fontSize:12}}>
                  <option value="">(não importar)</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Pipeline destino */}
          <div style={{marginBottom:14}}>
            <label style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:5}}>Pipeline de destino *</label>
            <select value={targetPipeline} onChange={e=>setTargetPipeline(e.target.value)} style={{...fieldStyle,cursor:"pointer",maxWidth:320,fontSize:12}}>
              {(accessiblePipelines||[]).map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Prévia */}
          {preview && (
            <div style={{marginBottom:14,overflowX:"auto"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:5}}>Prévia (5 primeiros):</div>
              <table style={{borderCollapse:"collapse",fontSize:11,width:"100%"}}>
                <thead>
                  <tr style={{background:"#0f172a"}}>
                    {headers.map(h => <th key={h} style={{padding:"5px 9px",color:"#64748b",fontWeight:600,textAlign:"left",borderBottom:"1px solid #334155",whiteSpace:"nowrap"}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>{headers.map(h => <td key={h} style={{padding:"5px 9px",color:"#94a3b8",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{String(row[h]??"")}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#22d3ee"}}>
            💡 Cidade, Bairro, UF e Endereço serão salvos no campo <strong>Observações</strong> do card.
          </div>

          <button onClick={doImport} disabled={importing}
            style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:9,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:importing?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            {importing ? <><Spinner />Importando...</> : "⬆ Importar clientes"}
          </button>
        </div>
      )}
    </div>
  );
}