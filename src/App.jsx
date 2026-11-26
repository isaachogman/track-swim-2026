import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Award, CalendarDays, Check, ChevronDown, Clock3, Droplets, Gauge, LogOut, Plus, Target, Timer, Waves, X } from 'lucide-react';
import { supabase } from './lib/supabase';

const tabs = ['Overview', 'Workouts', 'Best Times', 'Meet Results', 'Goals'];
const fmt = (seconds) => {
  if (seconds == null) return '—';
  const n = Number(seconds), m = Math.floor(n / 60), s = (n % 60).toFixed(2).padStart(5, '0');
  return m ? m + ':' + s : s;
};
const dateLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
  }
  return <main className="auth-shell"><div className="auth-card">
    <div className="brand-mark"><Waves size={24}/></div><p className="eyebrow">YOUR TRAINING, IN FOCUS</p>
    <h1>Every lap<br/><span>moves you forward.</span></h1>
    <p className="muted auth-copy">A simple home for your swim sessions, personal bests, and goals.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      {message && <p className="notice">{message}</p>}
      <button className="primary-btn wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p className="auth-switch">{mode === 'signin' ? 'New here?' : 'Already have an account?'} <button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
  </div><div className="auth-foot">LANELINE <span>·</span> BUILT FOR THE NEXT PERSONAL BEST</div></main>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal">
    <div className="modal-head"><div><p className="eyebrow">ADD TO YOUR LOG</p><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}
  </section></div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [sessions, setSessions] = useState([]);
  const [bests, setBests] = useState([]);
  const [goals, setGoals] = useState([]);
  const [meetResults, setMeetResults] = useState([]);
  const [meetImport, setMeetImport] = useState({ source_name:'MaxPreps', source_url:'', rows:'' });
  const [modal, setModal] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [swim, setSwim] = useState({ swim_date: new Date().toISOString().slice(0,10), pool_length:'25 yd', distance_yards:'2000', stroke:'Breaststroke', duration_seconds:'', notes:'' });
  const [best, setBest] = useState({ event:'100 Breast', course:'SCY', time_seconds:'75.00', achieved_on:new Date().toISOString().slice(0,10) });
  const [goal, setGoal] = useState({ title:'100 Breast', target_value:'73', current_value:'75', unit:'seconds', target_date:'' });

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)});
    const { data } = supabase.auth.onAuthStateChange((_event, next)=>setSession(next));
    return ()=>data.subscription.unsubscribe();
  }, []);
  async function loadData() {
    if (!session?.user) return;
    const [s,b,g,m] = await Promise.all([
      supabase.from('swim_sessions').select('*').order('swim_date',{ascending:false}).limit(100),
      supabase.from('personal_bests').select('*').order('achieved_on',{ascending:false}),
      supabase.from('swim_goals').select('*').order('created_at',{ascending:false}),
      supabase.from('meet_results').select('*').order('meet_date',{ascending:false}).limit(200)
    ]);
    if (s.error || b.error || g.error || m.error) setToast((s.error||b.error||g.error||m.error).message);
    setSessions(s.data||[]); setBests(b.data||[]); setGoals(g.data||[]); setMeetResults(m.data||[]);
  }
  useEffect(()=>{loadData()},[session]);
  const totalYards = sessions.reduce((n,s)=>n+Number(s.distance_yards||0),0);
  const thisWeek = sessions.filter(s => {
    const d = new Date(s.swim_date+'T12:00:00'); const now = new Date(); const start = new Date(now); start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0); return d>=start;
  }).reduce((n,s)=>n+Number(s.distance_yards||0),0);
  const avgDistance = sessions.length ? Math.round(totalYards/sessions.length) : 0;
  const weekBars = useMemo(()=>Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i); const key=d.toISOString().slice(0,10);
    return {day:d.toLocaleDateString(undefined,{weekday:'short'}), yards:sessions.filter(s=>s.swim_date===key).reduce((n,s)=>n+Number(s.distance_yards),0)};
  }),[sessions]);
  const maxBar = Math.max(1,...weekBars.map(x=>x.yards));
  function parseSwimTime(value) {
    const raw = String(value||'').trim();
    if (!raw) return NaN;
    if (raw.includes(':')) { const parts=raw.split(':'); return Number(parts[0])*60+Number(parts[1]); }
    return Number(raw);
  }
  async function importMeetResults(e) {
    e.preventDefault();
    const lines = meetImport.rows.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
    const parsed = lines.map(line => {
      const parts = line.split(',').map(x=>x.trim());
      return { event:parts[0], time_seconds:parseSwimTime(parts[1]), course:(parts[2]||'SCY').toUpperCase(), meet_date:parts[3]||new Date().toISOString().slice(0,10), meet_name:parts[4]||'Swim meet', source_name:meetImport.source_name||'Other', source_url:meetImport.source_url||null };
    });
    if (!parsed.length || parsed.some(x=>!x.event || !Number.isFinite(x.time_seconds) || x.time_seconds<=0 || !['SCY','SCM','LCM'].includes(x.course) || !/^\\d{4}-\\d{2}-\\d{2}$/.test(x.meet_date))) {
      setToast('Check the pasted rows. Use: Event, Time, Course, YYYY-MM-DD, Meet name'); return;
    }
    setBusy(true);
    for (const item of parsed) {
      const {error}=await supabase.from('meet_results').insert({...item,user_id:session.user.id});
      if (error) { setBusy(false); setToast(error.message); return; }
      const existing = bests.filter(b=>b.event.toLowerCase()===item.event.toLowerCase() && b.course===item.course).sort((a,b)=>Number(a.time_seconds)-Number(b.time_seconds))[0];
      if (!existing || item.time_seconds < Number(existing.time_seconds)) {
        if (existing) {
          const {error:updateError}=await supabase.from('personal_bests').update({time_seconds:item.time_seconds,achieved_on:item.meet_date}).eq('id',existing.id);
          if (updateError) { setBusy(false); setToast(updateError.message); return; }
        } else {
          const {error:insertError}=await supabase.from('personal_bests').insert({user_id:session.user.id,event:item.event,course:item.course,time_seconds:item.time_seconds,achieved_on:item.meet_date});
          if (insertError) { setBusy(false); setToast(insertError.message); return; }
        }
      }
    }
    setBusy(false); setModal(''); setMeetImport({...meetImport,rows:''}); await loadData(); setToast(parsed.length+' meet result(s) imported. Personal bests updated automatically.');
    setTimeout(()=>setToast(''),4500);
  }
  async function save(table, value, reset) {
    setBusy(true); const {error}=await supabase.from(table).insert({...value,user_id:session.user.id});
    setBusy(false); if(error){setToast(error.message);return;}
    setModal(''); reset(); await loadData(); setToast('Saved to your swim log.');
    setTimeout(()=>setToast(''),3000);
  }
  if (!authReady) return <div className="loading">Loading LaneLine…</div>;
  if (!supabase) return <main className="auth-shell"><div className="auth-card"><div className="brand-mark"><Waves/></div><h1>One quick setup step.</h1><p className="muted">The app is coded, but its Supabase connection still needs to be added to the deployment environment.</p></div></main>;
  if (!session) return <AuthScreen />;
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark small"><Waves size={19}/></div><span>lane<span className="brand-light">line</span></span></div>
      <div className="side-label">WORKSPACE</div><nav>{tabs.map((t,i)=><button key={t} className={tab===t?'nav-item active':'nav-item'} onClick={()=>setTab(t)}>{[<Gauge/>,<Activity/>,<Award/>,<FileUp/>,<Target/>][i]}<span>{t}</span>{tab===t&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{session.user.email?.[0]?.toUpperCase()}</div><div className="user-info"><b>{session.user.email?.split('@')[0]}</b><span>Swimmer</span></div><button className="icon-btn" title="Sign out" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">TRAINING DASHBOARD</p><h1>{tab==='Overview'?'Good to see you back.':tab}</h1></div><div className="top-actions"><span className="date-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span><button className="primary-btn" onClick={()=>setModal('swim')}><Plus size={17}/> Log a swim</button></div></header>
      {toast&&<div className="toast" onClick={()=>setToast('')}>{toast}<button><X size={14}/></button></div>}
      {tab==='Overview'&&<><section className="welcome-panel"><div><p className="eyebrow">KEEP SHOWING UP</p><h2>Small improvements.<br/><em>Big swims.</em></h2><p>Consistency is built one session at a time. Keep your eyes on the next lap.</p><button className="light-btn" onClick={()=>setModal('swim')}>Add today's session <ArrowUpRight size={16}/></button></div><div className="water-art"><div className="water-ring ring-one"/><div className="water-ring ring-two"/><Waves size={96} strokeWidth={1}/><span>01 / KEEP MOVING</span></div></section>
        <section className="stats-grid"><Stat icon={<Droplets/>} label="TOTAL YARDS" value={totalYards.toLocaleString()} detail="All logged sessions"/><Stat icon={<Activity/>} label="THIS WEEK" value={thisWeek.toLocaleString()} detail="Yards swum this week"/><Stat icon={<Timer/>} label="SESSIONS" value={sessions.length} detail="Workouts logged"/><Stat icon={<Gauge/>} label="AVG. DISTANCE" value={avgDistance.toLocaleString()} detail="Yards per session"/></section>
        <section className="content-grid"><div className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR CONSISTENCY</p><h3>Last 7 days</h3></div><span className="mini-tag">YARDS</span></div><div className="bar-chart">{weekBars.map((d,i)=><div className="bar-column" key={i}><span className="bar-value">{d.yards?d.yards.toLocaleString():'—'}</span><div className="bar-track"><div className="bar-fill" style={{height:d.yards?Math.max(5,d.yards/maxBar*100)+'%':'3px'}}/></div><span className="bar-day">{d.day}</span></div>)}</div></div>
        <div className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Latest sessions</h3></div><button className="text-btn" onClick={()=>setTab('Workouts')}>View all <ArrowUpRight size={14}/></button></div>{sessions.slice(0,4).length?sessions.slice(0,4).map(s=><SessionRow key={s.id} item={s}/>):<Empty text="Your first swim is waiting to be logged."/>}</div></section>
        <section className="panel best-strip"><div className="panel-heading"><div><p className="eyebrow">PERSONAL RECORDS</p><h3>Best times</h3></div><button className="text-btn" onClick={()=>setTab('Best Times')}>All bests <ArrowUpRight size={14}/></button></div><div className="best-cards">{bests.slice(0,3).map(b=><div className="best-card" key={b.id}><span>{b.event}</span><b>{fmt(b.time_seconds)}</b><small>{b.course} · {dateLabel(b.achieved_on)}</small></div>)}{!bests.length&&<Empty text="Add a personal best to start your record board."/>}</div></section></>}
      {tab==='Workouts'&&<section className="panel page-panel"><div className="panel-heading"><div><p className="eyebrow">THE WORK YOU PUT IN</p><h3>Swim history</h3></div><button className="primary-btn" onClick={()=>setModal('swim')}><Plus size={16}/> Log swim</button></div>{sessions.length?sessions.map(s=><SessionRow key={s.id} item={s} detailed/>):<Empty text="No sessions yet. Log your first workout to get started."/>}</section>}
      {tab==='Best Times'&&<section className="panel page-panel"><div className="panel-heading"><div><p className="eyebrow">THE TIMES THAT DEFINE PROGRESS</p><h3>Personal bests</h3></div><button className="primary-btn" onClick={()=>setModal('best')}><Plus size={16}/> Add best time</button></div>{bests.length?<div className="record-grid">{bests.map(b=><div className="record-card" key={b.id}><Award size={20}/><span>{b.event}</span><strong>{fmt(b.time_seconds)}</strong><small>{b.course} · {dateLabel(b.achieved_on)}</small></div>)}</div>:<Empty text="Your next personal best starts here. Add a time you want to track."/>}</section>}
      {tab==='Meet Results'&&<section className="panel page-panel"><div className="panel-heading"><div><p className="eyebrow">OFFICIAL MEET PERFORMANCE</p><h3>Meet results</h3></div><button className="primary-btn" onClick={()=>setModal('meet')}><Plus size={16}/> Import results</button></div><p className="muted meet-help">Bring in times from MaxPreps or another team results page. Paste the results and save the source link so every time stays traceable.</p>{meetResults.length?<div className="meet-result-list">{meetResults.map(r=><div className="meet-result-row" key={r.id}><div className="meet-result-main"><b>{r.event}</b><span>{r.meet_name||'Swim meet'} · {dateLabel(r.meet_date)} · {r.course}</span>{r.source_url&&<a href={r.source_url} target="_blank" rel="noreferrer">{r.source_name||'Source'} ↗</a>}</div><strong>{fmt(r.time_seconds)}</strong></div>)}</div>:<Empty text="Your meet results will appear here after you import your first result."/>}</section>}
      {tab==='Goals'&&<section className="panel page-panel"><div className="panel-heading"><div><p className="eyebrow">A TARGET TO CHASE</p><h3>Your swim goals</h3></div><button className="primary-btn" onClick={()=>setModal('goal')}><Plus size={16}/> Add goal</button></div>{goals.length?<div className="goal-list">{goals.map(g=>{const raw=String(g.unit).toLowerCase().includes('second') ? Number(g.target_value)/Number(g.current_value)*100 : Number(g.current_value)/Number(g.target_value)*100; const pct=Math.min(100,Math.max(0,Math.round(raw||0)));return <div className="goal-card" key={g.id}><div className="goal-top"><div><span className="goal-kicker">TARGET EVENT</span><h4>{g.title}</h4></div><b>{pct}%</b></div><div className="progress"><i style={{width:pct+'%'}}/></div><div className="goal-meta"><span>Current: {g.current_value} {g.unit}</span><span>Target: {g.target_value} {g.unit}</span></div></div>})}</div>:<Empty text="Set a goal, then use each session to move toward it."/>}</section>}
      <footer className="footer"><span>LANELINE / 2026</span><span>PROGRESS IS BUILT IN THE WATER.</span></footer>
    </main>
    {modal==='swim'&&<Modal title="Log a swim" onClose={()=>setModal('')}><form className="modal-form" onSubmit={e=>{e.preventDefault();save('swim_sessions',{...swim,distance_yards:Number(swim.distance_yards),duration_seconds:swim.duration_seconds?Number(swim.duration_seconds):null},()=>setSwim({...swim,distance_yards:'2000',duration_seconds:'',notes:''}))}}>
      <div className="form-row"><label>Date<input type="date" required value={swim.swim_date} onChange={e=>setSwim({...swim,swim_date:e.target.value})}/></label><label>Pool length<select value={swim.pool_length} onChange={e=>setSwim({...swim,pool_length:e.target.value})}><option>25 yd</option><option>25 m</option><option>50 m</option></select></label></div>
      <div className="form-row"><label>Distance (yards)<input type="number" min="1" required value={swim.distance_yards} onChange={e=>setSwim({...swim,distance_yards:e.target.value})}/></label><label>Stroke<select value={swim.stroke} onChange={e=>setSwim({...swim,stroke:e.target.value})}>{['Breaststroke','Freestyle','Backstroke','Butterfly','IM','Mixed'].map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>Duration in seconds <span className="optional">optional</span><input type="number" min="1" value={swim.duration_seconds} onChange={e=>setSwim({...swim,duration_seconds:e.target.value})} placeholder="e.g. 3600"/></label>
      <label>Notes <span className="optional">optional</span><textarea rows="3" value={swim.notes} onChange={e=>setSwim({...swim,notes:e.target.value})} placeholder="Main set, how it felt, what to improve…"/></label>
      <button className="primary-btn wide" disabled={busy}>{busy?'Saving…':'Save session'}</button>
    </form></Modal>}
    {modal==='best'&&<Modal title="Add a personal best" onClose={()=>setModal('')}><form className="modal-form" onSubmit={e=>{e.preventDefault();save('personal_bests',{...best,time_seconds:Number(best.time_seconds)},()=>setBest({...best,time_seconds:'75.00'}))}}>
      <label>Event<input required value={best.event} onChange={e=>setBest({...best,event:e.target.value})} placeholder="100 Breast"/></label><div className="form-row"><label>Time (seconds)<input type="number" step="0.01" min="0.01" required value={best.time_seconds} onChange={e=>setBest({...best,time_seconds:e.target.value})}/></label><label>Course<select value={best.course} onChange={e=>setBest({...best,course:e.target.value})}><option>SCY</option><option>SCM</option><option>LCM</option></select></label></div><label>Date achieved<input type="date" value={best.achieved_on} onChange={e=>setBest({...best,achieved_on:e.target.value})}/></label><button className="primary-btn wide" disabled={busy}>{busy?'Saving…':'Save personal best'}</button>
    </form></Modal>}
    {modal==='meet'&&<Modal title="Import meet results" onClose={()=>setModal('')}><form className="modal-form" onSubmit={importMeetResults}>
      <div className="notice">Paste results copied from your meet results page. LaneLine will save each swim and automatically update a personal best when the time is faster for the same event and course.</div>
      <label>Results website<select value={meetImport.source_name} onChange={e=>setMeetImport({...meetImport,source_name:e.target.value})}><option>MaxPreps</option><option>SwimCloud</option><option>Meet Mobile</option><option>Team website</option><option>Other</option></select></label>
      <label>Link to the results page <span className="optional">optional</span><input type="url" value={meetImport.source_url} onChange={e=>setMeetImport({...meetImport,source_url:e.target.value})} placeholder="https://…"/></label>
      <label>Paste results <span className="optional">one swim per line</span><textarea required rows="6" value={meetImport.rows} onChange={e=>setMeetImport({...meetImport,rows:e.target.value})} placeholder={'100 Breast, 1:12.45, SCY, 2026-11-20, Evanston Invite\\n200 IM, 2:18.30, SCY, 2026-11-20, Evanston Invite'}/></label>
      <p className="muted import-format">Format: Event, Time, Course, Date (YYYY-MM-DD), Meet name. Time can be 72.45 or 1:12.45.</p>
      <button className="primary-btn wide" disabled={busy}>{busy?'Importing…':'Import results & update bests'}</button>
    </form></Modal>}
    {modal==='goal'&&<Modal title="Set a swim goal" onClose={()=>setModal('')}><form className="modal-form" onSubmit={e=>{e.preventDefault();save('swim_goals',{...goal,target_value:Number(goal.target_value),current_value:Number(goal.current_value),target_date:goal.target_date||null},()=>setGoal({...goal,title:'',target_value:'',current_value:'0'}))}}>
      <label>Goal / event<input required value={goal.title} onChange={e=>setGoal({...goal,title:e.target.value})} placeholder="100 Breast"/></label><div className="form-row"><label>Current value<input type="number" step="0.01" required value={goal.current_value} onChange={e=>setGoal({...goal,current_value:e.target.value})}/></label><label>Target value<input type="number" step="0.01" required value={goal.target_value} onChange={e=>setGoal({...goal,target_value:e.target.value})}/></label></div><label>Unit<input required value={goal.unit} onChange={e=>setGoal({...goal,unit:e.target.value})} placeholder="seconds"/></label><label>Target date <span className="optional">optional</span><input type="date" value={goal.target_date} onChange={e=>setGoal({...goal,target_date:e.target.value})}/></label><button className="primary-btn wide" disabled={busy}>{busy?'Saving…':'Save goal'}</button>
    </form></Modal>}
  </div>;
}

function Stat({icon,label,value,detail}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{detail}</small></div>; }
function SessionRow({item,detailed=false}) { return <div className="session-row"><div className="session-icon"><Waves size={18}/></div><div className="session-main"><b>{item.stroke} session</b><span>{dateLabel(item.swim_date)} · {item.pool_length}{detailed&&item.notes?' · '+item.notes:''}</span></div><div className="session-distance"><b>{Number(item.distance_yards).toLocaleString()} yd</b><span>{item.duration_seconds?fmt(item.duration_seconds):'Distance logged'}</span></div></div>; }
function Empty({text}) { return <div className="empty-state"><div className="empty-icon"><Waves size={22}/></div><p>{text}</p></div>; }
