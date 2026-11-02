import {createContext,useContext,useEffect,useState} from 'react';
import {api} from './api.js';
import {ErrorMessage} from './components.jsx';
const Context=createContext(null);
export const useAuth=()=>useContext(Context);
export function AuthProvider({children}){
  const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  async function refresh(){setLoading(true);setError('');try{const result=await api('/auth/me');setUser(result.data);}catch(err){if(err.message!=='Please sign in to continue')setError(err.message);}finally{setLoading(false);}}
  useEffect(()=>{refresh();const unauthorized=()=>setUser(null);window.addEventListener('taskflow:unauthorized',unauthorized);return()=>window.removeEventListener('taskflow:unauthorized',unauthorized);},[]);
  const login=async(email,password)=>{const result=await api('/auth/login',{method:'POST',body:{email,password}});setUser(result.data);setError('');};
  const logout=async()=>{await api('/auth/logout',{method:'POST'});setUser(null);};
  return <Context.Provider value={{user,loading,error,refresh,login,logout}}>{children}</Context.Provider>;
}
export function Login(){
  const {login}=useAuth();const [email,setEmail]=useState('admin@taskflow.local');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(event){event.preventDefault();setBusy(true);setError('');try{await login(email,password);}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <main className="login-page"><section className="login-story"><div className="brand"><span className="brand-mark">t</span> taskflow<span className="brand-dot">.</span></div><div><p className="eyebrow">A CLEARER WAY TO WORK</p><h1>Good work.<br/>Great flow.</h1><p>Bring your projects, people and priorities<br/>into one focused workspace.</p><div className="story-cards"><span>Plan with clarity</span><span>Stay in sync</span><span>Make progress</span></div></div><small>Your team’s next chapter starts here.</small></section><section className="login-form"><form onSubmit={submit}><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your workspace</h2><p className="muted">Keep your team moving in the same direction.</p><label>Email address<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><ErrorMessage message={error}/><button className="full" disabled={busy}>{busy?'Signing in…':'Sign in →'}</button><div className="demo-note"><b>Seeded demo accounts</b><p>admin / manager / lead / employee<br/>@taskflow.local</p><span>Password: Taskflow123!</span></div></form></section></main>;
}
