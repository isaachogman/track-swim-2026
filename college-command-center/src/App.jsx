import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowDown, ArrowUp, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  Circle, GraduationCap, LayoutDashboard, ListTodo, LogOut, Plus, School,
  Search, Sparkles, Trash2, X
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'colleges', label: 'College tracker', icon: GraduationCap },
  { id: 'tasks', label: 'To-do lists', icon: ListTodo },
  { id: 'study', label: 'Study order', icon: BookOpen },
];

function AuthScreen() {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (!supabase) throw new Error('The app is missing its Supabase connection settings.');
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(data.session ? 'Your account is ready.' : 'Account created. Check your email for a confirmation link, then come back and sign in.');
        if (!data.session) setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand-mark"><GraduationCap size={22}/></div>
      <p className="eyebrow">YOUR NEXT CHAPTER, ORGANIZED</p>
      <h1>Make your next move<br/><span>Northstar.</span></h1>
      <p className="muted">One place for college research, school tasks, and a study plan that moves in order—not by the clock.</p>
      {!supabase && <div className="notice error">App connection settings are missing. The owner needs to add the Supabase URL and publishable key in Vercel.</div>}
      <form onSubmit={submit} className="auth-form">
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required autoComplete={mode==='signup'?'new-password':'current-password'}/></label>
        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}
        <button className="primary full" disabled={busy || !supabase}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Sign in'}<ChevronRight size={17}/></button>
      </form>
      <p className="switch-auth">{mode === 'signup' ? 'Already have an account?' : 'New here?'} <button onClick={()=>{setMode(mode==='signup'?'signin':'signup');setError('');setMessage('');}}>{mode==='signup'?'Sign in':'Create account'}</button></p>
      <div className="privacy-note">Your college notes and tasks are private to your account.</div>
    </section>
  </main>;
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</section>
  </div>;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('overview');
  const [colleges, setColleges] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [study, setStudy] = useState([]);
  const [modal, setModal] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [collegeForm, setCollegeForm] = useState({name:'',location:'',website:'',program:'',status:'Considering',tuition:'',scholarship:'',deadline:'',notes:''});
  const [taskForm, setTaskForm] = useState({title:'',category:'School',due_date:'',priority:'Medium',notes:''});
  const [studyForm, setStudyForm] = useState({title:'',subject:'General',notes:''});
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next)=>setSession(next));
    return ()=>listener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    if (!session?.user) return;
    setLoading(true);
    const uid = session.user.id;
    const [c,t,s] = await Promise.all([
      supabase.from('cc_colleges').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
      supabase.from('cc_tasks').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
      supabase.from('cc_study_items').select('*').eq('user_id',uid).order('sort_order',{ascending:true}).order('created_at',{ascending:true})
    ]);
    const error = c.error || t.error || s.error;
    if (error) console.error('Northstar data load:', error);
    setColleges(c.data || []); setTasks(t.data || []); setStudy(s.data || []);
    setLoading(false);
  }

  useEffect(()=>{ if(session?.user) loadData(); },[session?.user?.id]);

  const completedTasks = tasks.filter(x=>x.completed).length;
  const pendingTasks = tasks.filter(x=>!x.completed);
  const nextStudy = study.find(x=>!x.completed);
  const filteredColleges = colleges.filter(c => (c.name+' '+c.location+' '+c.program).toLowerCase().includes(search.toLowerCase()));
  const filteredTasks = tasks.filter(t => filter==='All' || (filter==='Open' && !t.completed) || (filter==='Done' && t.completed));

  async function addCollege(e) {
    e.preventDefault(); setSaving(true);
    const {error}=await supabase.from('cc_colleges').insert({...collegeForm,user_id:session.user.id,deadline:collegeForm.deadline||null});
    setSaving(false); if(error){alert(error.message);return;} setCollegeForm({name:'',location:'',website:'',program:'',status:'Considering',tuition:'',scholarship:'',deadline:'',notes:''});setModal('');loadData();
  }
  async function addTask(e) {
    e.preventDefault(); setSaving(true);
    const {error}=await supabase.from('cc_tasks').insert({...taskForm,user_id:session.user.id,due_date:taskForm.due_date||null});
    setSaving(false); if(error){alert(error.message);return;} setTaskForm({title:'',category:'School',due_date:'',priority:'Medium',notes:''});setModal('');loadData();
  }
  async function addStudy(e) {
    e.preventDefault(); setSaving(true);
    const {error}=await supabase.from('cc_study_items').insert({...studyForm,user_id:session.user.id,sort_order:study.length?Math.max(...study.map(x=>x.sort_order))+1:0});
    setSaving(false); if(error){alert(error.message);return;} setStudyForm({title:'',subject:'General',notes:''});setModal('');loadData();
  }
  async function toggle(table,row) {
    const {error}=await supabase.from(table).update({completed:!row.completed}).eq('id',row.id);
    if(error) alert(error.message); else loadData();
  }
  async function remove(table,id) {
    if(!confirm('Delete this item?'))return;
    const {error}=await supabase.from(table).delete().eq('id',id);
    if(error)alert(error.message);else loadData();
  }
  async function moveStudy(index,delta) {
    const next=[...study]; const target=index+delta;
    if(target<0||target>=next.length)return;
    [next[index],next[target]]=[next[target],next[index]];
    setStudy(next);
    await Promise.all(next.map((item,i)=>supabase.from('cc_study_items').update({sort_order:i}).eq('id',item.id)));
  }

  if (loading && !session) return <div className="loading-screen"><div className="brand-mark"><GraduationCap/></div><p>Getting your workspace ready…</p></div>;
  if (!session) return <AuthScreen/>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>northstar</strong><small>COLLEGE COMMAND CENTER</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(item=><button key={item.id} className={page===item.id?'nav-item active':'nav-item'} onClick={()=>setPage(item.id)}><item.icon size={18}/>{item.label}{page===item.id&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(session.user.email||'U').slice(0,1).toUpperCase()}</div><div className="user-email">{session.user.email}</div></div><button className="nav-item signout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/>Sign out</button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><GraduationCap size={20}/> northstar</div><div className="breadcrumb">MY WORKSPACE <span>/</span> {nav.find(x=>x.id===page)?.label.toUpperCase()}</div><div className="topbar-right"><span className="saved-indicator"><span/> CLOUD SYNC ON</span></div></header>
      <div className="page-wrap">
        {page==='overview' && <section>
          <div className="welcome-row"><div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>Keep moving <em>forward.</em></h1><p className="muted">A clear plan for school now and the college decisions ahead.</p></div><div className="date-chip"><CalendarDays size={16}/> {new Date().toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</div></div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon purple"><School size={19}/></div><span>COLLEGES TRACKED</span><strong>{colleges.length}</strong><small>Schools on your list</small></div>
            <div className="stat-card"><div className="stat-icon blue"><ListTodo size={19}/></div><span>OPEN TASKS</span><strong>{pendingTasks.length}</strong><small>{completedTasks} completed so far</small></div>
            <div className="stat-card"><div className="stat-icon gold"><BookOpen size={19}/></div><span>STUDY QUEUE</span><strong>{study.filter(x=>!x.completed).length}</strong><small>Items left in your order</small></div>
          </div>
          <div className="overview-grid">
            <div className="panel next-panel"><div className="panel-head"><div><p className="eyebrow">UP NEXT</p><h2>Your next study move</h2></div><BookOpen size={19}/></div>
              {nextStudy ? <div className="next-study"><span className="step-tag">NEXT IN LINE</span><h3>{nextStudy.title}</h3><p>{nextStudy.subject}{nextStudy.notes?' · '+nextStudy.notes:''}</p><button className="primary" onClick={()=>toggle('cc_study_items',nextStudy)}>Mark complete <Check size={16}/></button></div> : <div className="empty-state"><CheckCircle2 size={27}/><h3>Study queue is clear</h3><p>Add your next study task when you're ready.</p></div>}
              <button className="text-link" onClick={()=>setPage('study')}>Open study order <ChevronRight size={15}/></button>
            </div>
            <div className="panel task-panel"><div className="panel-head"><div><p className="eyebrow">DON'T LOSE THE THREAD</p><h2>Upcoming tasks</h2></div><button className="small-add" onClick={()=>setModal('task')}><Plus size={16}/></button></div>
              {pendingTasks.slice(0,4).length ? pendingTasks.slice(0,4).map(t=><div className="mini-task" key={t.id}><button className="check-button" onClick={()=>toggle('cc_tasks',t)}><Circle size={18}/></button><div><strong>{t.title}</strong><small>{t.category}{t.due_date?' · Due '+new Date(t.due_date+'T12:00:00').toLocaleDateString() : ''}</small></div><span className={'priority '+t.priority.toLowerCase()}>{t.priority}</span></div>) : <div className="empty-state compact"><p>No open tasks. Nice work.</p></div>}
              <button className="text-link" onClick={()=>setPage('tasks')}>View all tasks <ChevronRight size={15}/></button>
            </div>
          </div>
          <div className="panel college-strip"><div><p className="eyebrow">THE BIG PICTURE</p><h2>Your college shortlist</h2><p className="muted">Compare programs, tuition, scholarships, and application deadlines in one place.</p></div><button className="secondary" onClick={()=>setPage('colleges')}>Manage colleges <ChevronRight size={16}/></button></div>
        </section>}

        {page==='colleges' && <section>
          <div className="page-heading"><div><p className="eyebrow">PLAN YOUR NEXT CHAPTER</p><h1>College tracker</h1><p className="muted">Keep every school, cost, scholarship, and deadline organized.</p></div><button className="primary" onClick={()=>setModal('college')}><Plus size={17}/> Add college</button></div>
          <div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search colleges or programs…"/></div><span className="result-count">{filteredColleges.length} {filteredColleges.length===1?'school':'schools'}</span></div>
          {filteredColleges.length ? <div className="college-grid">{filteredColleges.map(c=><article className="college-card" key={c.id}><div className="college-card-top"><div className="college-logo"><GraduationCap size={20}/></div><span className={'status-pill '+c.status.toLowerCase()}>{c.status}</span></div><h3>{c.name}</h3><p className="college-location">{c.location||'Location not added'}</p>{c.program&&<div className="college-field"><span>PROGRAM</span><strong>{c.program}</strong></div>}<div className="college-meta"><div><span>EST. TUITION</span><strong>{c.tuition||'Not added'}</strong></div><div><span>DEADLINE</span><strong>{c.deadline?new Date(c.deadline+'T12:00:00').toLocaleDateString():'Not added'}</strong></div></div>{c.scholarship&&<div className="scholarship-note"><Sparkles size={14}/> {c.scholarship}</div>}{c.notes&&<p className="college-notes">{c.notes}</p>}{c.website&&<a className="college-link" href={c.website.startsWith('http')?c.website:'https://'+c.website} target="_blank" rel="noreferrer">Visit website <ChevronRight size={14}/></a>}<button className="delete-link" onClick={()=>remove('cc_colleges',c.id)}><Trash2 size={14}/> Remove</button></article>)}</div> : <div className="empty-large"><div className="empty-icon"><School size={25}/></div><h3>Your college list starts here</h3><p>Add schools you're considering. You can compare tuition, programs, scholarships, and deadlines as you research.</p><button className="primary" onClick={()=>setModal('college')}><Plus size={17}/> Add your first college</button></div>}
        </section>}

        {page==='tasks' && <section>
          <div className="page-heading"><div><p className="eyebrow">STAY ON TOP OF THE DETAILS</p><h1>To-do lists</h1><p className="muted">Capture what needs to get done, then check it off as you go.</p></div><button className="primary" onClick={()=>setModal('task')}><Plus size={17}/> Add task</button></div>
          <div className="task-summary"><div><strong>{pendingTasks.length}</strong><span>Open</span></div><div><strong>{completedTasks}</strong><span>Completed</span></div><div className="progress-wrap"><div className="progress-label"><span>Overall progress</span><strong>{tasks.length?Math.round(completedTasks/tasks.length*100):0}%</strong></div><div className="progress-track"><i style={{width:(tasks.length?completedTasks/tasks.length*100:0)+'%'}}/></div></div></div>
          <div className="filter-row">{['All','Open','Done'].map(f=><button key={f} className={filter===f?'filter active':'filter'} onClick={()=>setFilter(f)}>{f}</button>)}</div>
          <div className="task-list">{filteredTasks.map(t=><div className={'task-row '+(t.completed?'is-done':'')} key={t.id}><button className="check-button" onClick={()=>toggle('cc_tasks',t)}>{t.completed?<CheckCircle2 size={20}/>:<Circle size={20}/>}</button><div className="task-main"><strong>{t.title}</strong><div className="task-sub">{t.category}{t.due_date?' · Due '+new Date(t.due_date+'T12:00:00').toLocaleDateString():''}{t.notes?' · '+t.notes:''}</div></div><span className={'priority '+t.priority.toLowerCase()}>{t.priority}</span><button className="icon-button delete-button" onClick={()=>remove('cc_tasks',t.id)}><Trash2 size={16}/></button></div>)}
          {!filteredTasks.length&&<div className="empty-large"><div className="empty-icon"><ListTodo size={25}/></div><h3>{filter==='Done'?'Nothing completed yet':'No tasks here'}</h3><p>Add assignments, ACT prep, college applications, or anything else you want to keep track of.</p><button className="primary" onClick={()=>setModal('task')}><Plus size={17}/> Add a task</button></div>}</div>
        </section>}

        {page==='study' && <section>
          <div className="page-heading"><div><p className="eyebrow">NO CLOCK. JUST THE NEXT STEP.</p><h1>Study order</h1><p className="muted">Put your study tasks in the order you want to complete them. Move items up or down—there are no time slots.</p></div><button className="primary" onClick={()=>setModal('study')}><Plus size={17}/> Add study item</button></div>
          <div className="study-banner"><div className="study-banner-icon"><BookOpen size={21}/></div><div><strong>One task at a time.</strong><p>Start at the top. When you finish, check it off and move to the next item.</p></div><span>{study.filter(x=>!x.completed).length} LEFT</span></div>
          <div className="study-list">{study.map((s,i)=><div className={'study-row '+(s.completed?'is-done':'')} key={s.id}><div className="study-number">{String(i+1).padStart(2,'0')}</div><button className="check-button" onClick={()=>toggle('cc_study_items',s)}>{s.completed?<CheckCircle2 size={21}/>:<Circle size={21}/>}</button><div className="study-main"><strong>{s.title}</strong><span>{s.subject}{s.notes?' · '+s.notes:''}</span></div><div className="reorder"><button className="icon-button" disabled={i===0} onClick={()=>moveStudy(i,-1)} aria-label="Move up"><ArrowUp size={16}/></button><button className="icon-button" disabled={i===study.length-1} onClick={()=>moveStudy(i,1)} aria-label="Move down"><ArrowDown size={16}/></button></div><button className="icon-button delete-button" onClick={()=>remove('cc_study_items',s.id)}><Trash2 size={16}/></button></div>)}
          {!study.length&&<div className="empty-large"><div className="empty-icon"><BookOpen size={25}/></div><h3>Build your study sequence</h3><p>Add the subjects and assignments you need to work on, then arrange them in the order that makes sense.</p><button className="primary" onClick={()=>setModal('study')}><Plus size={17}/> Add first study item</button></div>}</div>
        </section>}
      </div>
    </main>

    {modal==='college'&&<Modal title="Add a college" onClose={()=>setModal('')}><form className="modal-form" onSubmit={addCollege}>
      <label>College name *<input required value={collegeForm.name} onChange={e=>setCollegeForm({...collegeForm,name:e.target.value})} placeholder="e.g. University of Utah"/></label>
      <div className="form-grid"><label>Location<input value={collegeForm.location} onChange={e=>setCollegeForm({...collegeForm,location:e.target.value})} placeholder="City, State"/></label><label>Program or major<input value={collegeForm.program} onChange={e=>setCollegeForm({...collegeForm,program:e.target.value})} placeholder="Business, finance…"/></label></div>
      <div className="form-grid"><label>Status<select value={collegeForm.status} onChange={e=>setCollegeForm({...collegeForm,status:e.target.value})}>{['Considering','Researching','Applying','Accepted','Waitlisted','Declined'].map(x=><option>{x}</option>)}</select></label><label>Application deadline<input type="date" value={collegeForm.deadline} onChange={e=>setCollegeForm({...collegeForm,deadline:e.target.value})}/></label></div>
      <div className="form-grid"><label>Estimated tuition<input value={collegeForm.tuition} onChange={e=>setCollegeForm({...collegeForm,tuition:e.target.value})} placeholder="e.g. $12,000/year"/></label><label>Scholarships<input value={collegeForm.scholarship} onChange={e=>setCollegeForm({...collegeForm,scholarship:e.target.value})} placeholder="Scholarships to investigate"/></label></div>
      <label>Website<input value={collegeForm.website} onChange={e=>setCollegeForm({...collegeForm,website:e.target.value})} placeholder="university.edu"/></label><label>Notes<textarea value={collegeForm.notes} onChange={e=>setCollegeForm({...collegeForm,notes:e.target.value})} placeholder="Campus feel, pros and cons, admission requirements…"/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Save college'}</button></div>
    </form></Modal>}
    {modal==='task'&&<Modal title="Add a task" onClose={()=>setModal('')}><form className="modal-form" onSubmit={addTask}>
      <label>What needs to get done? *<input required value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="e.g. Finish history reading"/></label>
      <div className="form-grid"><label>Category<select value={taskForm.category} onChange={e=>setTaskForm({...taskForm,category:e.target.value})}>{['School','College applications','ACT prep','Project','Personal','Other'].map(x=><option>{x}</option>)}</select></label><label>Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})}>{['Low','Medium','High'].map(x=><option>{x}</option>)}</select></label></div>
      <label>Due date (optional)<input type="date" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm,due_date:e.target.value})}/></label><label>Notes (optional)<textarea value={taskForm.notes} onChange={e=>setTaskForm({...taskForm,notes:e.target.value})} placeholder="Details or reminders…"/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Save task'}</button></div>
    </form></Modal>}
    {modal==='study'&&<Modal title="Add to study order" onClose={()=>setModal('')}><form className="modal-form" onSubmit={addStudy}>
      <label>Study task *<input required value={studyForm.title} onChange={e=>setStudyForm({...studyForm,title:e.target.value})} placeholder="e.g. Complete calculus practice"/></label>
      <label>Subject<select value={studyForm.subject} onChange={e=>setStudyForm({...studyForm,subject:e.target.value})}>{['General','Math','History','Science','English','ACT prep','College research','Other'].map(x=><option>{x}</option>)}</select></label>
      <label>Notes (optional)<textarea value={studyForm.notes} onChange={e=>setStudyForm({...studyForm,notes:e.target.value})} placeholder="What should you focus on?"/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Add to order'}</button></div>
    </form></Modal>}
  </div>;
}

export default App;