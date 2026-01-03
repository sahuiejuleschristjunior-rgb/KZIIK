import { Link } from "react-router-dom";
export default function Header(){
  return (
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <a href="/" style={{fontWeight:900,fontSize:20,color:"#fff",textDecoration:"none"}}>EmploisFacile</a>
      </div>
      <nav style={{display:"flex",gap:10}}>
        <a href="/login" style={{padding:"8px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",color:"#fff",textDecoration:"none"}}>Connexion</a>
        <a href="/register" style={{padding:"8px 12px",borderRadius:10,background:"#fff",color:"#000",textDecoration:"none",fontWeight:700}}>Inscription</a>
      </nav>
    </header>
  );
}
