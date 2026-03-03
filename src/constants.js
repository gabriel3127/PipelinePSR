export const PIPELINES = [
  { id: "df-com-venda",    label: "DF — Com Venda",          color: "#6366f1", icon: "🟦" },
  { id: "df-sem-venda",    label: "DF — Sem Venda",          color: "#8b5cf6", icon: "🟪" },
  { id: "inter-com-venda", label: "Interestadual — Com Venda", color: "#f59e0b", icon: "🟧" },
  { id: "inter-sem-venda", label: "Interestadual — Sem Venda", color: "#ef4444", icon: "🟥" },
];

export const ALL_PERMISSIONS = [
  { key: "view_pipeline",  label: "Ver pipeline" },
  { key: "move_cards",     label: "Mover cards entre colunas" },
  { key: "add_clients",    label: "Adicionar novos clientes" },
  { key: "edit_clients",   label: "Editar clientes existentes" },
  { key: "delete_clients", label: "Excluir clientes" },
  { key: "import_excel",   label: "Importar Excel" },
  { key: "view_alerts",    label: "Ver alertas" },
  { key: "manage_alerts",  label: "Gerenciar regras de alerta" },
  { key: "manage_columns", label: "Criar/editar colunas do pipeline" },
];

export const COLORS = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e",
  "#10b981","#14b8a6","#06b6d4","#3b82f6","#6366f1","#8b5cf6",
  "#a855f7","#ec4899","#64748b","#475569",
];

export const fieldStyle = {
  width:"100%", background:"#0f172a", border:"1px solid #334155",
  borderRadius:8, padding:"10px 12px", color:"#f1f5f9", fontSize:13,
  outline:"none", fontFamily:"'Sora',sans-serif", boxSizing:"border-box",
};

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0f172a;font-family:'Sora',sans-serif;color:#f1f5f9;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  input::placeholder,textarea::placeholder{color:#475569}
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:#1e293b}
  ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
  input,textarea,select{font-family:'Sora',sans-serif}
`;