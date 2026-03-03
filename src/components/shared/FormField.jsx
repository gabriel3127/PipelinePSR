export function FormField({ label, children }) {
  return (
    <div style={{marginBottom:16}}>
      <label style={{color:"#94a3b8",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:6}}>
        {label}
      </label>
      {children}
    </div>
  );
}