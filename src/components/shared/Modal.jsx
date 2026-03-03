export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:20,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid #334155",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#1e293b",zIndex:1}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:"#f1f5f9"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>×</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}