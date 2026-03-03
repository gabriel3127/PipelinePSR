import { useState } from "react";
export function AuthInput({ label, type="text", placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{marginBottom:16}}>
      <label style={{color:"#94a3b8",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{width:"100%",background:"#0f172a",border:`1px solid ${focused?"#6366f1":"#334155"}`,borderRadius:8,padding:"12px 14px",color:"#f1f5f9",fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s"}} />
    </div>
  );
}