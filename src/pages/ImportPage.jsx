import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { parse, format, differenceInDays, parseISO } from "date-fns";
import { supabase } from "../supabaseClient";
import { useApp } from "../context/AppContext";
import { Spinner } from "../components/shared/Spinner";
import { PIPELINES, IMPORT_GROUPS, fieldStyle } from "../constants";

// ── Helpers ───────────────────────────────────────────────────

// Parser CSV robusto - respeita campos entre aspas (RFC 4180)
function parseCSVLine(line, sep) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Detecta separador automaticamente pela primeira linha
function detectSeparator(firstLine) {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    if (!inQ && counts[ch] !== undefined) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSV(text, sep) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const useSep = sep === "auto" ? detectSeparator(lines[0] || "") : sep;
  return lines.map(l => parseCSVLine(l, useSep));
}

// Converte qualquer valor de célula para data yyyy-MM-dd
function parseDate(val) {
  if (val === null || val === undefined || val === "") return null;
  // Excel serial (número)
  if (typeof val === "number" || (typeof val === "string" && !val.includes("/") && !val.includes("-") && !isNaN(Number(val)))) {
    const n = Number(val);
    if (n > 1000 && n < 100000) {
      try { return format(new Date((n - 25569) * 86400 * 1000), "yyyy-MM-dd"); } catch {}
    }
  }
  const s = String(val).trim();
  if (!s || s.length < 6) return null;
  const fmts = [
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "d/M/yyyy",
  ];
  for (const fmt of fmts) {
    try {
      const d = parse(s.length > fmt.replace(/[^yMdHms]/g, "").length + 4 ? s.slice(0, fmt.length) : s, fmt, new Date());
      if (!isNaN(d.getTime()) && d.getFullYear() > 1950) return format(d, "yyyy-MM-dd");
    } catch {}
  }
  return null;
}

// Dado pipeline_id do grupo e data de última compra, retorna o pipeline correto (com/sem venda)
function getTargetPipelineId(groupId, lastPurchaseDate, saleDaysThreshold) {
  const group = IMPORT_GROUPS.find(g => g.id === groupId);
  if (!group) return groupId;
  if (group.comVenda === group.semVenda) return group.comVenda; // prospecção, sem regra
  if (!lastPurchaseDate) return group.semVenda;
  const days = differenceInDays(new Date(), parseISO(lastPurchaseDate));
  return days <= saleDaysThreshold ? group.comVenda : group.semVenda;
}

// ── Componente ────────────────────────────────────────────────
export function ImportPage() {
  const { setCards, showToast, activePipeline, appSettings } = useApp();
  const [headers, setHeaders]         = useState([]);
  const [preview, setPreview]         = useState(null);
  const [mapping, setMapping]         = useState({});
  const [importGroup, setImportGroup] = useState("df");
  const [importing, setImporting]     = useState(false);
  const [duplicates, setDuplicates]   = useState([]);
  const [newRows, setNewRows]         = useState([]);
  const [checked, setChecked]         = useState(false);
  const [importMode, setImportMode]   = useState("skip");
  const [rawRows, setRawRows]         = useState([]);
  const fileRef = useRef();

  const saleDays = appSettings?.days_with_sale_threshold ?? 60;

  // Inicializa importGroup baseado no pipeline ativo
  useEffect(() => {
    if (activePipeline) {
      const match = IMPORT_GROUPS.find(g =>
        g.comVenda === activePipeline || g.semVenda === activePipeline
      );
      if (match) setImportGroup(match.id);
    }
  }, [activePipeline]);

  const FIELDS = [
    { key: "external_id",        label: "ID do cliente (anti-duplicata)", highlight: true },
    { key: "client_name",        label: "Nome do cliente *" },
    { key: "company_name",       label: "Razão social / CNPJ" },
    { key: "phone",              label: "Telefone" },
    { key: "email",              label: "Email" },
    { key: "value",              label: "Valor (R$)" },
    { key: "last_purchase_date", label: "Última venda *", highlight: true },
    { key: "city",               label: "Cidade" },
    { key: "neighborhood",       label: "Bairro" },
    { key: "state",              label: "UF" },
    { key: "address",            label: "Endereço" },
  ];

  const autoDetect = (hdrs) => {
    const m = {};
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const hl = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (f.key === "external_id")        return /^id$|^cod|^codigo|^id.cliente/.test(hl);
        if (f.key === "client_name")        return /nome.fantasia|nome.cliente|^nome$/.test(hl);
        if (f.key === "company_name")       return /cnpj|cpf|raz/.test(hl);
        if (f.key === "phone")              return /tel|fone|celular/.test(hl);
        if (f.key === "email")              return /^email$/.test(hl);
        if (f.key === "value")              return /^valor$|^value$|^total$/.test(hl);
        if (f.key === "last_purchase_date") return /ultima.venda|ult.*venda|last.purch|ultima.compra/.test(hl);
        if (f.key === "city")               return /^cidade$|^city$/.test(hl);
        if (f.key === "neighborhood")       return /^bairro$/.test(hl);
        if (f.key === "state")              return /^uf$|^estado$/.test(hl);
        if (f.key === "address")            return /^endereco$|^endere/.test(hl);
        return false;
      });
      if (match) m[f.key] = match;
    });
    return m;
  };

  const parseFileRows = (text, isCSV, binaryResult) => {
    if (isCSV) return parseCSV(text, "auto");
    const wb = XLSX.read(binaryResult, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1 });
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseFileRows(evt.target.result, isCSV, evt.target.result);
      if (!rows.length) return showToast("Arquivo vazio", "error");
      const hdrs = rows[0].map(h => String(h || "").trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => c));
      setHeaders(hdrs);
      setRawRows(dataRows);
      setMapping(autoDetect(hdrs));
      setPreview(dataRows.slice(0, 5).map(r => Object.fromEntries(hdrs.map((h, i) => [h, r[i]]))));
      setDuplicates([]); setNewRows([]); setChecked(false);
    };
    if (isCSV) reader.readAsText(file, "latin1");
    else reader.readAsBinaryString(file);
  };

  const buildParsedRows = () => {
    const get = (obj, key) => mapping[key] ? String(obj[mapping[key]] ?? "").trim() : "";
    return rawRows.map((row, i) => {
      const obj = Object.fromEntries(headers.map((h, idx) => [h, row[idx]]));
      const rawDate = mapping.last_purchase_date ? row[headers.indexOf(mapping.last_purchase_date)] : null;
      const lpd = parseDate(rawDate);
      return {
        external_id: get(obj, "external_id"),
        client_name: get(obj, "client_name"),
        company_name: get(obj, "company_name"),
        phone: get(obj, "phone"),
        email: get(obj, "email"),
        value: parseFloat(get(obj, "value").replace(",", ".")) || 0,
        last_purchase_date: lpd,
        city: get(obj, "city"),
        neighborhood: get(obj, "neighborhood"),
        address: get(obj, "address"),
        state: get(obj, "state"),
        notes: "", assignees: [], location_tags: [], position: i,
      };
    }).filter(c => c.client_name);
  };

  const checkDuplicates = async () => {
    if (!mapping.client_name) return showToast("Mapeie o campo Nome", "error");
    setImporting(true);
    const parsed = buildParsedRows();
    const searchField = mapping.external_id ? "external_id" : "client_name";
    const searchValues = parsed.map(r => r[searchField]).filter(Boolean);

    let dupes = [], news = [...parsed];

    if (searchValues.length > 0) {
      const { data: existing } = await supabase
        .from("pipeline_cards")
        .select("id, client_name, company_name, external_id, column_id, pipeline_id, last_purchase_date")
        .in(searchField, searchValues);

      if (existing?.length > 0) {
        const colIds = [...new Set(existing.map(c => c.column_id).filter(Boolean))];
        const { data: cols } = await supabase.from("pipeline_columns").select("id,name").in("id", colIds);
        const colMap = Object.fromEntries((cols || []).map(c => [c.id, c.name]));
        const pipeMap = Object.fromEntries(PIPELINES.map(p => [p.id, p.label]));
        const existingVals = new Set(existing.map(c => c[searchField]));

        dupes = parsed.filter(r => existingVals.has(r[searchField])).map(r => {
          const match = existing.find(e => e[searchField] === r[searchField]);
          const correctPipeline = getTargetPipelineId(importGroup, r.last_purchase_date, saleDays);
          const needsMigration = match && correctPipeline !== match.pipeline_id;
          return {
            ...r,
            found_in_pipeline: pipeMap[match?.pipeline_id] || match?.pipeline_id || "?",
            found_in_column: colMap[match?.column_id] || "?",
            found_pipeline_id: match?.pipeline_id,
            card_id: match?.id,
            correct_pipeline_id: correctPipeline,
            needs_migration: needsMigration,
            migration_label: needsMigration ? pipeMap[correctPipeline] : null,
          };
        });
        news = parsed.filter(r => !existingVals.has(r[searchField]));
      }
    }

    setDuplicates(dupes); setNewRows(news); setChecked(true); setImporting(false);
    const migrations = dupes.filter(d => d.needs_migration).length;
    if (dupes.length === 0) showToast(`Nenhuma duplicata! ${news.length} clientes prontos.`);
    else if (migrations > 0) showToast(`${dupes.length} duplicata(s) — ${migrations} precisam migrar!`, "warning");
    else showToast(`${dupes.length} duplicata(s) encontrada(s).`, "warning");
  };

  const doImport = async () => {
    if (!newRows.length && !(importMode === "update" && duplicates.length)) {
      return showToast("Nenhum cliente para importar", "error");
    }
    setImporting(true);
    let totalInserted = 0, totalUpdated = 0, totalMigrated = 0;

    // 1. Inserir novos — distribui entre com/sem venda automaticamente
    if (newRows.length > 0) {
      const byPipeline = {};
      for (const r of newRows) {
        const pid = getTargetPipelineId(importGroup, r.last_purchase_date, saleDays);
        if (!byPipeline[pid]) byPipeline[pid] = [];
        byPipeline[pid].push(r);
      }

      for (const [pid, rows] of Object.entries(byPipeline)) {
        const { data: pidCols } = await supabase.from("pipeline_columns").select("id")
          .eq("pipeline_id", pid).order("position", { ascending: true }).limit(1);
        const pidColId = pidCols?.[0]?.id;
        if (!pidColId) {
          const pLabel = PIPELINES.find(p => p.id === pid)?.label || pid;
          showToast(`Pipeline "${pLabel}" não tem colunas! Crie ao menos uma.`, "error");
          continue;
        }

        const BATCH = 100;
        const toInsert = rows.map((r, i) => ({ ...r, pipeline_id: pid, column_id: pidColId, position: i }));
        for (let i = 0; i < toInsert.length; i += BATCH) {
          const { data, error } = await supabase.from("pipeline_cards").insert(toInsert.slice(i, i + BATCH)).select();
          if (error) { showToast(error.message, "error"); setImporting(false); return; }
          totalInserted += data.length;
          if (pid === activePipeline) setCards(prev => [...prev, ...data]);
        }
      }
    }

    // 2. Atualizar / migrar duplicatas
    if (importMode === "update" && duplicates.length > 0) {
      for (const dup of duplicates) {
        const { data: existing } = await supabase.from("pipeline_cards").select("*").eq("id", dup.card_id).single();
        if (!existing) continue;
        const patch = {};
        if (dup.last_purchase_date && (!existing.last_purchase_date || dup.last_purchase_date > existing.last_purchase_date))
          patch.last_purchase_date = dup.last_purchase_date;
        ["phone", "email", "city", "neighborhood", "address", "state", "company_name"].forEach(field => {
          if (!existing[field] && dup[field]) patch[field] = dup[field];
        });
        if (dup.needs_migration) {
          const { data: destCols } = await supabase.from("pipeline_columns").select("id")
            .eq("pipeline_id", dup.correct_pipeline_id).order("position", { ascending: true }).limit(1);
          if (destCols?.[0]?.id) {
            patch.pipeline_id = dup.correct_pipeline_id;
            patch.column_id = destCols[0].id;
            totalMigrated++;
          }
        }
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          await supabase.from("pipeline_cards").update(patch).eq("id", existing.id);
          totalUpdated++;
          if (patch.pipeline_id && patch.pipeline_id !== activePipeline)
            setCards(prev => prev.filter(c => c.id !== existing.id));
        }
      }
    }

    setImporting(false);
    setPreview(null); setHeaders([]); setRawRows([]); setDuplicates([]); setNewRows([]); setChecked(false);
    fileRef.current.value = "";
    const parts = [
      totalInserted > 0 && `${totalInserted} importados`,
      totalUpdated  > 0 && `${totalUpdated} atualizados`,
      totalMigrated > 0 && `${totalMigrated} migrados`,
    ].filter(Boolean);
    showToast(parts.join(", ") || "Concluído!");
  };

  const exportDuplicatesCSV = () => {
    if (!duplicates.length) return;
    const hdrs = ["ID", "Nome", "CNPJ/CPF", "Pipeline atual", "Etapa", "Última venda", "Migrar para"];
    const rows = duplicates.map(d => [
      d.external_id || "", d.client_name, d.company_name || "",
      d.found_in_pipeline, d.found_in_column,
      d.last_purchase_date || "", d.migration_label || "—"
    ]);
    const csv = [hdrs, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "duplicatas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setChecked(false); setDuplicates([]); setNewRows([]);
    setHeaders([]); setRawRows([]); setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const migrationCount = duplicates.filter(d => d.needs_migration).length;
  const currentGroup = IMPORT_GROUPS.find(g => g.id === importGroup);
  const comVendaLabel = PIPELINES.find(p => p.id === currentGroup?.comVenda)?.label;
  const semVendaLabel = PIPELINES.find(p => p.id === currentGroup?.semVenda)?.label;
  const isProspeccao = currentGroup?.comVenda === currentGroup?.semVenda;

  const s = { section: { background: "#1e293b", border: "1px solid #334155", borderRadius: 13, padding: 20, marginBottom: 16 } };

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 700 }}>Importar Clientes</h1>
      <p style={{ margin: "0 0 22px", color: "#64748b", fontSize: 13 }}>Suporta CSV (qualquer separador) e Excel (.xlsx)</p>

      {/* Seleção de grupo */}
      <div style={{ ...s.section, padding: "14px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Grupo de destino
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {IMPORT_GROUPS.map(g => {
            const isSelected = importGroup === g.id;
            const com = PIPELINES.find(p => p.id === g.comVenda);
            return (
              <button key={g.id} onClick={() => { setImportGroup(g.id); setChecked(false); setDuplicates([]); setNewRows([]); }}
                style={{ background: isSelected ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: isSelected ? "#c7d2fe" : "#64748b", border: `1px solid ${isSelected ? "#6366f1" : "#334155"}`, borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: com?.color }} />
                {g.label}
              </button>
            );
          })}
        </div>
        {!isProspeccao && (
          <div style={{ marginTop: 10, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "8px 13px", fontSize: 12, color: "#94a3b8" }}>
            🔄 Clientes com compra nos últimos <strong style={{ color: "#c7d2fe" }}>{saleDays} dias</strong> → <strong style={{ color: "#6ee7b7" }}>{comVendaLabel}</strong>.
            Os demais → <strong style={{ color: "#fca5a5" }}>{semVendaLabel}</strong>.
          </div>
        )}
        {isProspeccao && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
            📋 Pipeline de prospecção — sem regra de com/sem venda. Todos os clientes entram diretamente.
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div onClick={() => fileRef.current.click()}
        style={{ background: "#1e293b", border: "2px dashed #334155", borderRadius: 13, padding: 34, textAlign: "center", cursor: "pointer", marginBottom: 18, transition: "all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "rgba(99,102,241,0.04)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.background = "#1e293b"; }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>📂</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Clique para selecionar arquivo</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>.csv (qualquer separador) ou .xlsx</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
      </div>

      {headers.length > 0 && (
        <div style={s.section}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 }}>Mapeamento de colunas</div>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "9px 14px", marginBottom: 14, fontSize: 12, color: "#6ee7b7" }}>
            💡 Mapeie <strong>ID do cliente</strong> e <strong>Última venda</strong> para distribuição automática entre Com/Sem Venda.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {FIELDS.map(f => (
              <div key={f.key}
                style={f.highlight ? { gridColumn: "1/-1", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "10px 12px" } : {}}>
                <label style={{ color: f.highlight ? "#818cf8" : "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{f.label}</label>
                <select value={mapping[f.key] || ""} onChange={e => setMapping(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...fieldStyle, cursor: "pointer", fontSize: 12 }}>
                  <option value="">(não importar)</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {preview && !checked && (
            <div style={{ marginBottom: 14, overflowX: "auto" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Prévia (5 primeiros):</div>
              <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                <thead>
                  <tr style={{ background: "#0f172a" }}>
                    {headers.map(h => (
                      <th key={h} style={{ padding: "5px 9px", color: "#64748b", fontWeight: 600, textAlign: "left", borderBottom: "1px solid #334155", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.map(h => (
                        <td key={h} style={{ padding: "5px 9px", color: "#94a3b8", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" }}>{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!checked && (
            <button onClick={checkDuplicates} disabled={importing}
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: importing ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
              {importing ? <><Spinner />Verificando...</> : "🔍 Verificar duplicatas"}
            </button>
          )}
        </div>
      )}

      {checked && (
        <>
          {/* Duplicatas */}
          {duplicates.length > 0 && (
            <div style={{ ...s.section, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fca5a5" }}>⚠️ {duplicates.length} cliente(s) já cadastrado(s)</div>
                  {migrationCount > 0 && (
                    <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 3 }}>🔄 {migrationCount} precisam migrar de pipeline</div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => setImportMode("skip")}
                      style={{ background: importMode === "skip" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)", color: importMode === "skip" ? "#fca5a5" : "#64748b", border: `1px solid ${importMode === "skip" ? "rgba(239,68,68,0.4)" : "#334155"}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      🚫 Ignorar
                    </button>
                    <button onClick={() => setImportMode("update")}
                      style={{ background: importMode === "update" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)", color: importMode === "update" ? "#6ee7b7" : "#64748b", border: `1px solid ${importMode === "update" ? "rgba(16,185,129,0.4)" : "#334155"}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      🔄 Atualizar + migrar
                    </button>
                  </div>
                  {importMode === "update" && <div style={{ fontSize: 11, color: "#6ee7b7", marginTop: 5 }}>Atualiza última venda, preenche campos vazios e migra pipelines conforme necessário.</div>}
                </div>
                <button onClick={exportDuplicatesCSV}
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  ⬇️ Baixar CSV
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                {duplicates.map((d, i) => (
                  <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "9px 13px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {d.external_id && <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, background: "#1e293b", padding: "2px 7px", borderRadius: 4 }}>ID: {d.external_id}</span>}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", flex: 1 }}>{d.client_name}</span>
                    {d.last_purchase_date && <span style={{ fontSize: 10, color: "#64748b" }}>🗓 {d.last_purchase_date}</span>}
                    <span style={{ fontSize: 11, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 5 }}>📌 {d.found_in_pipeline}</span>
                    {d.needs_migration && (
                      <span style={{ fontSize: 11, color: "#fbbf24", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(245,158,11,0.2)" }}>
                        🔄 → {d.migration_label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos */}
          <div style={{ ...s.section, border: newRows.length > 0 ? "1px solid rgba(16,185,129,0.3)" : "1px solid #334155", background: newRows.length > 0 ? "rgba(16,185,129,0.04)" : "#1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: newRows.length > 0 || importMode === "update" ? "#6ee7b7" : "#64748b" }}>
                  {newRows.length > 0
                    ? `✅ ${newRows.length} cliente(s) novo(s) prontos`
                    : duplicates.length > 0 && importMode === "update"
                      ? "✅ Prontos para atualizar" : "ℹ️ Nenhum cliente novo"}
                </div>
                {!isProspeccao && newRows.length > 0 && (
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    Serão distribuídos automaticamente entre "{comVendaLabel}" e "{semVendaLabel}"
                  </div>
                )}
                {duplicates.length > 0 && importMode === "update" && (
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>
                    {duplicates.length} atualizado(s){migrationCount > 0 ? ` + ${migrationCount} migrado(s) de pipeline` : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={reset}
                  style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid #334155", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ↩ Refazer
                </button>
                {(newRows.length > 0 || (importMode === "update" && duplicates.length > 0)) && (
                  <button onClick={doImport} disabled={importing}
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", borderRadius: 9, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: importing ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                    {importing ? <><Spinner />Importando...</> :
                      importMode === "update" && duplicates.length > 0
                        ? `⬆ Importar ${newRows.length} + atualizar ${duplicates.length}`
                        : `⬆ Importar ${newRows.length} clientes`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}