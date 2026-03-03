export function Spinner({ size = 20 }) {
  return (
    <div style={{width:size,height:size,border:`2px solid rgba(255,255,255,0.2)`,borderTop:`2px solid #fff`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}} />
  );
}