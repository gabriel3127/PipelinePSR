export function Toast({ toasts, onDismiss }) {
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          background:t.type==="error"?"#ef4444":t.type==="warning"?"#f59e0b":"#10b981",
          color:"#fff",padding:"12px 20px",borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
          cursor:"pointer",maxWidth:340,fontSize:14,fontWeight:500,display:"flex",alignItems:"center",gap:10,
        }}>
          <span>{t.type==="error"?"✕":t.type==="warning"?"⚠":"✓"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}