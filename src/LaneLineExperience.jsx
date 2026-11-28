import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Award, Bell, Bookmark, BookOpen, ChartNoAxesCombined, Check, ChevronRight, CirclePlay, Crown, Droplets, Flag, Gauge, Heart, Medal, Plus, Search, Settings, Shield, Sparkles, Target, Timer, Trophy, Waves, X, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import './laneline.css';

const NAV = [
  ['Overview', Gauge], ['My Times', Timer], ['Meet Results', Flag],
  ['Goals', Target], ['Video Lab', CirclePlay], ['Athlete Profile', Award], ['Rankings', Crown], ['Rewards', Trophy]
];
const demo = {
  sessions: [
    {id:'s1',swim_date:'2026-11-24',pool_length:'25 yd',distance_yards:2400,stroke:'Breaststroke',duration_seconds:3600,notes:'Technique + pace'},
    {id:'s2',swim_date:'2026-11-22',pool_length:'25 yd',distance_yards:2100,stroke:'IM',duration_seconds:3300,notes:'200 IM focus'},
    {id:'s3',swim_date:'2026-11-20',pool_length:'25 yd',distance_yards:2600,stroke:'Breaststroke',duration_seconds:3900,notes:'Race pace'}
  ],
  bests: [
    {id:'b1',event:'100 Breast',course:'SCY',time_seconds:75.18,achieved_on:'2026-11-20'},
    {id:'b2',event:'200 IM',course:'SCY',time_seconds:138.42,achieved_on:'2026-11-20'},
    {id:'b3',event:'50 Free',course:'SCY',time_seconds:25.91,achieved_on:'2026-11-18'},
    {id:'b4',event:'100 Breast',course:'LCM',time_seconds:86.2,achieved_on:'2026-10-30'}
  ],
  goals: [{id:'g1',title:'100 Breast · State cut',current_value:75.18,target_value:73.58,unit:'seconds',target_date:'2027-02-01'}],
  meets: [
    {id:'m1',event:'100 Breast',time_seconds:75.18,course:'SCY',meet_date:'2026-11-20',meet_name:'Evanston Invite',source_name:'Meet result'},
    {id:'m2',event:'200 IM',time_seconds:138.42,course:'SCY',meet_date:'2026-11-20',meet_name:'Evanston Invite',source_name:'Meet result'},
    {id:'m3',event:'100 Breast',time_seconds:77.1,course:'SCY',meet_date:'2026-10-25',meet_name:'Early Season Invite',source_name:'Meet result'}
  ]
};
const videos = [
  {id:'breaststroke-basics',tag:'BREASTSTROKE',title:'The 5 most important breaststroke skills',coach:"Skills N' Talents",category:'Breaststroke',videoId:'rVaXro6fcEQ',start:0,tip:'Study body line, timing, kick shape, and how the stroke connects.'},
  {id:'breaststroke-modern',tag:'BREASTSTROKE',title:'A modern way to swim breaststroke',coach:'U.S. Masters Swimming',category:'Breaststroke',videoId:'loBCYYEJcqk',start:0,tip:'Compare the demonstrated rhythm and body position with your own stroke.'},
  {id:'freestyle-breathing',tag:'FREESTYLE',title:'Four steps to better freestyle breathing',coach:"Skills N' Talents",category:'Freestyle',videoId:'Ug9-LP7p08U',start:0,tip:'Notice head position, rotation, and when the breath fits into the stroke.'},
  {id:'freestyle-technique',tag:'FREESTYLE',title:'Freestyle technique step by step',coach:'Creekwood Crocs swim team resource',category:'Freestyle',videoId:'6_vXycbD2TM',start:0,tip:'Watch body position, breathing, kick, and hand entry as connected skills.'},
  {id:'backstroke-technique',tag:'BACKSTROKE',title:'How to swim backstroke correctly',coach:'MySwimPro',category:'Backstroke',videoId:'nf13HsTGzRA',start:0,tip:'Focus on body position, rotation, hand entry, and race tempo.'},
  {id:'butterfly-technique',tag:'BUTTERFLY',title:'How to swim butterfly correctly',coach:'MySwimPro',category:'Butterfly',videoId:'BG6pX2jju4g',start:0,tip:'Study arm entry, the finish of the pull, recovery, and two-kick timing.'},
  {id:'flip-turn',tag:'TURNS',title:'How to do a freestyle flip turn',coach:'MySwimPro',category:'Starts & Turns',videoId:'Y4ZU2uW-YnU',start:0,tip:'Watch the approach, compact rotation, foot placement, and push-off.'},
  {id:'underwater-backstroke',tag:'UNDERWATERS',title:'Backstroke underwater dolphin kick',coach:'MySwimPro',category:'Underwaters',videoId:'nf13HsTGzRA',start:426,tip:'Jump to the underwater dolphin kick chapter and watch body line and rhythm.'}
];
const standards = [
  {event:'100 Breast',course:'SCY',time:73.58,label:'Example state qualifying target'},
  {event:'200 IM',course:'SCY',time:135.99,label:'Example championship target'}
];
const fmt = (v) => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n=Math.round(Number(v)*100)/100, m=Math.floor(n/60), s=(n%60).toFixed(2).padStart(5,'0');
  return m ? m+':'+s : s;
};
const dateText = d => d ? new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—';
const toSeconds = v => {
  const s=String(v??'').trim().replace(',', '.');
  if(!s)return NaN;
  if(s.includes(':')){
    const p=s.split(':');
    if(p.length!==2 || !/^\d+$/.test(p[0]) || !/^\d{1,2}(?:\.\d{1,2})?$/.test(p[1]))return NaN;
    const sec=Number(p[1]);if(sec>=60)return NaN;
    return Number(p[0])*60+sec;
  }
  return /^\d+(?:\.\d{1,2})?$/.test(s)?Number(s):NaN;
};
const safeHttpUrl = value => {
  try { const u=new URL(String(value||'')); return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; }
};
function Card({children,className=''}) { return <section className={'ll-card '+className}>{children}</section>; }
function Header({eyebrow,title,action}) { return <div className="ll-section-head"><div><div className="ll-eyebrow">{eyebrow}</div><h2>{title}</h2></div>{action}</div>; }
function Empty({text}) { return <div className="ll-empty"><Waves size={24}/><p>{text}</p></div>; }
function Modal({title,onClose,children}) { return <div className="ll-modal-back" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="ll-modal"><header><div><div className="ll-eyebrow">LANELINE LOG</div><h2>{title}</h2></div><button className="ll-icon-btn" onClick={onClose}><X/></button></header>{children}</section></div>; }

export default function LaneLineExperience() {
  const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(false),[demoMode,setDemoMode]=useState(false);
  const [authMode,setAuthMode]=useState('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[authError,setAuthError]=useState('');
  const [tab,setTab]=useState('Video Lab'),[unit,setUnit]=useState('yd'),[sessions,setSessions]=useState([]),[bests,setBests]=useState([]),[goals,setGoals]=useState([]),[meets,setMeets]=useState([]);
  const [videoFilter,setVideoFilter]=useState('For You');
  const [activeVideo,setActiveVideo]=useState(null);
  const [athleteProfile,setAthleteProfile]=useState({full_name:'',team_name:'',swimcloud_url:'',usaswimming_url:'',school_results_url:''});
  const [savedVideos,setSavedVideos]=useState(()=>{try{return JSON.parse(localStorage.getItem('laneline-saved-videos')||'[]')}catch{return []}});
  const [likedVideos,setLikedVideos]=useState([]);
  function toggleSavedVideo(id){
    setSavedVideos(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];
      try{localStorage.setItem('laneline-saved-videos',JSON.stringify(next))}catch{}
      return next;
    });
  }
  function toggleLikedVideo(id){
    setLikedVideos(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  }
  const [modal,setModal]=useState(''),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[eventFilter,setEventFilter]=useState('100 Breast');
  const [swim,setSwim]=useState({swim_date:new Date().toISOString().slice(0,10),pool_length:'25 yd',distance:'2000',distance_unit:'yd',stroke:'Breaststroke',duration_seconds:'',notes:''});
  const [best,setBest]=useState({event:'100 Breast',course:'SCY',time:'1:15.00',achieved_on:new Date().toISOString().slice(0,10)});
  const [goal,setGoal]=useState({title:'100 Breast · State cut',current_value:'1:15.18',target_value:'1:13.58',unit:'seconds',target_date:''});
  const [meet,setMeet]=useState({source_name:'Manual / source link',source_url:'',meet_name:'',meet_date:new Date().toISOString().slice(0,10),rows:''});

  useEffect(()=>{
    if(demoMode){
      try{setAthleteProfile(JSON.parse(localStorage.getItem('laneline-demo-athlete')||'{}'));}catch{}
      return;
    }
    if(session?.user){
      const saved=session.user.user_metadata?.laneline_athlete_profile||{};
      setAthleteProfile({full_name:'',team_name:'',swimcloud_url:'',usaswimming_url:'',school_results_url:'',...saved});
    }
  },[session?.user?.id,demoMode]);
  useEffect(()=>{
    if(!supabase){setAuthReady(true);return;}
    setAuthReady(true); let active=true;
    supabase.auth.getSession().then(({data,error})=>{if(active&&!error)setSession(data.session);}).catch(()=>{});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next);});
    return ()=>{active=false;data.subscription.unsubscribe();};
  },[]);
  async function loadData(){
    if(!session?.user||demoMode||!supabase)return;
    const [s,b,g,m]=await Promise.all([
      supabase.from('swim_sessions').select('*').order('swim_date',{ascending:false}).limit(150),
      supabase.from('personal_bests').select('*').order('achieved_on',{ascending:false}),
      supabase.from('swim_goals').select('*').order('created_at',{ascending:false}),
      supabase.from('meet_results').select('*').order('meet_date',{ascending:false}).limit(250)
    ]);
    const err=s.error||b.error||g.error||m.error;
    if(err)setToast(err.message);
    setSessions(s.data||[]);setBests(b.data||[]);setGoals(g.data||[]);setMeets(m.data||[]);
  }
  useEffect(()=>{loadData();},[session,demoMode]);
  function startDemo(){
    setDemoMode(true);setSession({user:{id:'demo',email:'demo@laneline.app'}});
    try{
      const saved=JSON.parse(localStorage.getItem('laneline-demo-data')||'null');
      const d=saved||demo;
      setSessions(d.sessions||[]);setBests(d.bests||[]);setGoals(d.goals||[]);setMeets(d.meets||d.meetResults||[]);
      try{setAthleteProfile(JSON.parse(localStorage.getItem('laneline-demo-athlete')||'{}'));}catch{}
    }catch{setSessions(demo.sessions);setBests(demo.bests);setGoals(demo.goals);setMeets(demo.meets);}
  }
  function persistDemo(next){
    localStorage.setItem('laneline-demo-data',JSON.stringify({sessions:next.sessions??sessions,bests:next.bests??bests,goals:next.goals??goals,meets:next.meets??meets}));
  }
  async function signIn(e){
    e.preventDefault();setBusy(true);setAuthError('');
    if(!supabase){setBusy(false);setAuthError('Sign-in is not configured yet. You can explore the demo below.');return;}
    const {data,error}=authMode==='signin'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
    setBusy(false);if(error)setAuthError(error.message);
    else if(authMode==='signup'&&!data.session)setAuthError('Account created. Check your email to confirm it, then sign in.');
  }
  async function saveRow(table,value,localSetter,localList,key){
    setBusy(true);
    if(demoMode){
      const item={...value,id:'demo-'+Date.now()};
      const next=[item,...localList];localSetter(next);
      const all={sessions,bests,goals,meets};all[key]=next;persistDemo(all);
      setBusy(false);setModal('');setToast('Saved to this demo on this device.');return item;
    }
    const {data,error}=await supabase.from(table).insert({...value,user_id:session.user.id}).select().single();
    setBusy(false);if(error){setToast(error.message);return null;}
    await loadData();setModal('');setToast('Saved to your LaneLine account.');return data;
  }
  async function saveSwim(e){
    e.preventDefault();
    const yards=swim.distance_unit==='m'?Math.round(Number(swim.distance)*1.09361):Number(swim.distance);
    const duration=swim.duration_seconds?toSeconds(swim.duration_seconds):null;
    if(swim.duration_seconds&&(!Number.isFinite(duration)||duration<=0)){setToast('Enter duration as minutes:seconds.hundredths, such as 42:30.00.');return;}
    await saveRow('swim_sessions',{swim_date:swim.swim_date,pool_length:swim.pool_length,distance_yards:yards,stroke:swim.stroke,duration_seconds:duration,notes:swim.notes},setSessions,sessions,'sessions');
  }
  async function saveBest(e){
    e.preventDefault();const seconds=toSeconds(best.time);
    if(!Number.isFinite(seconds)||seconds<=0){setToast('Enter a valid swim time.');return;}
    const existing=bests.find(x=>x.event.toLowerCase()===best.event.toLowerCase()&&x.course===best.course);
    if(existing&&Number(existing.time_seconds)<=seconds){setToast('That time is not faster than your current personal best.');return;}
    setBusy(true);
    if(demoMode){
      const next=[{id:'demo-'+Date.now(),event:best.event,course:best.course,time_seconds:seconds,achieved_on:best.achieved_on},...bests.filter(x=>!(x.event.toLowerCase()===best.event.toLowerCase()&&x.course===best.course))];
      setBests(next);persistDemo({bests:next});setBusy(false);setModal('');setToast('NEW PERSONAL BEST! +100 XP');return;
    }
    const write=existing
      ? await supabase.from('personal_bests').update({time_seconds:seconds,achieved_on:best.achieved_on}).eq('id',existing.id)
      : await supabase.from('personal_bests').insert({user_id:session.user.id,event:best.event,course:best.course,time_seconds:seconds,achieved_on:best.achieved_on});
    setBusy(false);if(write.error){setToast(write.error.message);return;}
    await loadData();setModal('');setToast('Personal best saved. +100 XP earned!');
  }
  async function importMeet(e){
    e.preventDefault();
    const rows=meet.rows.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
      const p=line.split(',').map(x=>x.trim());
      return {event:p[0],time_seconds:toSeconds(p[1]),course:(p[2]||'SCY').toUpperCase(),meet_date:p[3]||meet.meet_date,meet_name:p[4]||meet.meet_name||'Swim meet',source_name:meet.source_name,source_url:meet.source_url||null};
    });
    if(!rows.length||rows.some(x=>!x.event||!Number.isFinite(x.time_seconds)||x.time_seconds<=0||!['SCY','SCM','LCM'].includes(x.course))){setToast('Check the rows. Format: Event, Time, Course, Date, Meet name.');return;}
    setBusy(true);
    if(demoMode){
      const nextMeets=[...rows.map((x,i)=>({...x,id:'m-'+Date.now()+'-'+i})),...meets],nextBests=[...bests];
      rows.forEach(x=>{const idx=nextBests.findIndex(b=>b.event.toLowerCase()===x.event.toLowerCase()&&b.course===x.course);if(idx<0||x.time_seconds<Number(nextBests[idx].time_seconds)){if(idx<0)nextBests.push({...x,id:'b-'+Date.now()});else nextBests[idx]={...nextBests[idx],time_seconds:x.time_seconds,achieved_on:x.meet_date};}});
      setMeets(nextMeets);setBests(nextBests);persistDemo({meets:nextMeets,bests:nextBests});setBusy(false);setModal('');setToast('Meet results imported. Personal bests checked automatically.');return;
    }
    for(const x of rows){
      const {error}=await supabase.from('meet_results').insert({...x,user_id:session.user.id});
      if(error){setBusy(false);setToast(error.message);return;}
      const current=bests.find(b=>b.event.toLowerCase()===x.event.toLowerCase()&&b.course===x.course);
      if(!current||x.time_seconds<Number(current.time_seconds)){
        if(current)await supabase.from('personal_bests').update({time_seconds:x.time_seconds,achieved_on:x.meet_date}).eq('id',current.id);
        else await supabase.from('personal_bests').insert({user_id:session.user.id,event:x.event,course:x.course,time_seconds:x.time_seconds,achieved_on:x.meet_date});
      }
    }
    setBusy(false);await loadData();setModal('');setToast('Results imported and personal bests updated.');
  }
  async function saveGoal(e){
    e.preventDefault();
    const current=toSeconds(goal.current_value),target=toSeconds(goal.target_value);
    if(!Number.isFinite(current)||!Number.isFinite(target)||current<=0||target<=0){setToast('Enter both goal times as minutes:seconds.hundredths, such as 1:13.58.');return;}
    const value={title:goal.title,current_value:current,target_value:target,unit:goal.unit,target_date:goal.target_date||null};
    await saveRow('swim_goals',value,setGoals,goals,'goals');
  }
  async function saveAthleteProfile(e){
    e.preventDefault();
    const next={...athleteProfile};
    for(const key of ['swimcloud_url','usaswimming_url','school_results_url']){
      if(next[key]&&!safeHttpUrl(next[key])){setToast('Profile links must start with https:// or http://');return;}
      if(next[key])next[key]=safeHttpUrl(next[key]);
    }
    setBusy(true);
    if(demoMode){try{localStorage.setItem('laneline-demo-athlete',JSON.stringify(next));}catch{}setAthleteProfile(next);setBusy(false);setToast('Athlete profile saved on this device.');return;}
    const {data,error}=await supabase.auth.updateUser({data:{laneline_athlete_profile:next}});
    setBusy(false);if(error){setToast(error.message);return;}
    if(data.user)setSession(current=>current?{...current,user:data.user}:current);
    setAthleteProfile(next);setToast('Athlete profile linked to your LaneLine account.');
  }

  const totalYards=sessions.reduce((n,s)=>n+Number(s.distance_yards||0),0);
  const distanceTotal=unit==='m'?Math.round(totalYards/1.09361):totalYards;
  const xp=sessions.length*25+bests.length*100+goals.length*50;
  const level=Math.floor(xp/250)+1, progress=xp%250/250*100;
  const pbHistory=useMemo(()=>meets.filter(m=>m.event===eventFilter).slice().sort((a,b)=>new Date(a.meet_date)-new Date(b.meet_date)),[meets,eventFilter]);
  const improvement=pbHistory.length>1?Number(pbHistory[0].time_seconds)-Number(pbHistory[pbHistory.length-1].time_seconds):0;
  const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const key=d.toISOString().slice(0,10);return {day:d.toLocaleDateString(undefined,{weekday:'short'}),yards:sessions.filter(s=>s.swim_date===key).reduce((n,s)=>n+Number(s.distance_yards||0),0)};});
  const maxWeek=Math.max(1,...week.map(x=>x.yards));
  const nearestGoal=goals.find(g=>String(g.unit).toLowerCase().includes('second'));
  const secondsAway=nearestGoal?Math.max(0,Number(nearestGoal.current_value)-Number(nearestGoal.target_value)):null;
  const achievementCount=(sessions.length>=1?1:0)+(sessions.length>=10?1:0)+(bests.length>=1?1:0)+(bests.length>=3?1:0)+(goals.length>=1?1:0);

  if(!authReady)return <div className="ll-loading">LOADING LANELINE<span>SYNCING YOUR NEXT PERSONAL BEST</span></div>;
  if(!session)return <main className="ll-auth"><div className="ll-auth-card"><div className="ll-logo"><Waves/><b>LANE<span>LINE</span></b></div><div className="ll-eyebrow">TRACK · IMPROVE · ACHIEVE</div><h1>Every lap<br/><span>levels you up.</span></h1><p>Your swim data. Your goals. Your next breakthrough.</p><form onSubmit={signIn}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>{authError&&<div className="ll-error">{authError}</div>}<button className="ll-primary" disabled={busy}>{busy?'PLEASE WAIT…':authMode==='signin'?'SIGN IN':'CREATE ACCOUNT'}</button></form><button className="ll-demo" onClick={startDemo}>EXPLORE THE INTERACTIVE DEMO <ChevronRight size={16}/></button><p className="ll-switch">{authMode==='signin'?'New to LaneLine?':'Already have an account?'} <button onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthError('')}}>{authMode==='signin'?'Create account':'Sign in'}</button></p></div><div className="ll-auth-foot">LANELINE / SWIM SMARTER. GO FASTER.</div></main>;

  const title=tab==='Overview'?'Your swim command center':tab==='Video Lab'?'Technique video lab':tab==='My Times'?'Personal records':tab==='Athlete Profile'?'Connect your swimmer profile':tab;
  return <div className="ll-app">
    <aside className="ll-sidebar"><div className="ll-logo"><div className="ll-logo-icon"><Waves/></div><b>LANE<span>LINE</span></b></div><div className="ll-side-label">SWIM HQ</div><nav>{NAV.map(([name,Icon])=><button key={name} className={tab===name?'ll-nav active':'ll-nav'} onClick={()=>setTab(name)}><Icon size={18}/><span>{name}</span>{tab===name&&<i/>}</button>)}</nav><div className="ll-side-bottom"><div className="ll-level-mini"><div className="ll-level-icon"><Shield size={18}/></div><div><b>LEVEL {level}</b><small>{xp} XP EARNED</small></div></div><div className="ll-user"><span>{session.user.email?.[0]?.toUpperCase()||'S'}</span><div><b>{demoMode?'Demo Swimmer':session.user.email?.split('@')[0]}</b><small>{demoMode?'DEMO PROFILE':'SWIMMER PROFILE'}</small></div><button onClick={()=>demoMode?(setDemoMode(false),setSession(null)):supabase.auth.signOut()} title="Sign out"><LogOut size={16}/></button></div></div></aside>
    <main className="ll-main"><header className="ll-top"><div><div className="ll-eyebrow">LANELINE / SWIM PROGRESS SYSTEM</div><h1>{title}</h1></div><div className="ll-top-actions"><div className="ll-xp-pill"><Sparkles size={15}/>{xp} XP</div><button className="ll-icon-btn" onClick={()=>setToast('You will see in-app progress alerts here. Browser push notifications need permission and setup.')}><Bell/></button><button className="ll-primary ll-log-btn" onClick={()=>setModal('swim')}><Plus size={17}/> LOG A SWIM</button></div></header>
      {toast&&<div className="ll-toast" onClick={()=>setToast('')}>{toast}<X size={15}/></div>}
      {tab==='Overview'&&<><section className="ll-hero"><div><div className="ll-eyebrow">MISSION STATUS / KEEP MOVING</div><h2>MAKE EVERY<br/><span>SECOND COUNT.</span></h2><p>Small improvements stack up. Keep chasing the next personal best.</p><div className="ll-hero-actions"><button className="ll-primary" onClick={()=>setModal('best')}><Plus size={16}/> ADD A TIME</button><button className="ll-outline" onClick={()=>setTab('Goals')}>VIEW GOALS <ChevronRight size={15}/></button></div></div><div className="ll-hero-art"><div className="ll-orbit orbit-a"/><div className="ll-orbit orbit-b"/><Waves size={106}/><span>LANE / 01</span></div><div className="ll-hero-stamp">PERSONAL<br/>BEST HUNTER</div></section>
      <div className="ll-stats"><div><span><Droplets/> TOTAL DISTANCE</span><b>{distanceTotal.toLocaleString()} <small>{unit}</small></b><em>ALL LOGGED SESSIONS</em></div><div><span><Activity/> SWIM SESSIONS</span><b>{sessions.length}</b><em>TRAINING LOG ENTRIES</em></div><div><span><Award/> PERSONAL BESTS</span><b>{bests.length}</b><em>EVENT RECORDS</em></div><div><span><Sparkles/> CURRENT LEVEL</span><b>{level}</b><em>{xp} EXPERIENCE POINTS</em></div></div>
      <div className="ll-grid-main"><Card><Header eyebrow="TRAINING LOAD" title="Last 7 days" action={<div className="ll-unit-toggle"><button className={unit==='yd'?'active':''} onClick={()=>setUnit('yd')}>YD</button><button className={unit==='m'?'active':''} onClick={()=>setUnit('m')}>M</button></div>}/><div className="ll-bars">{week.map(d=><div className="ll-bar-col" key={d.day}><small>{d.yards?(unit==='m'?Math.round(d.yards/1.09361):d.yards).toLocaleString():'—'}</small><div><i style={{height:(d.yards?Math.max(4,d.yards/maxWeek*100):2)+'%'}}/></div><span>{d.day}</span></div>)}</div></Card><Card><Header eyebrow="NEXT TARGET" title="Qualification watch" action={<Target size={19}/>}/>{nearestGoal?<><div className="ll-qual-event">{nearestGoal.title}</div><div className="ll-qual-times"><div><small>CURRENT</small><b>{fmt(nearestGoal.current_value)}</b></div><ChevronRight/><div><small>TARGET</small><b>{fmt(nearestGoal.target_value)}</b></div></div><div className="ll-progress"><i style={{width:Math.min(100,Math.max(0,Number(nearestGoal.target_value)/Math.max(0.01,Number(nearestGoal.current_value))*100))+'%'}}/></div><p className="ll-muted">{secondsAway?.toFixed(2)} seconds to target. Update your latest meet time to refresh progress.</p></>:<Empty text="Add a goal or qualifying standard to start your qualification tracker."/>}</Card></div>
      <Card className="ll-mt"><Header eyebrow="RECENT PERFORMANCE" title="Personal best board" action={<button className="ll-link" onClick={()=>setTab('My Times')}>ALL TIMES <ChevronRight size={14}/></button>}/><div className="ll-pb-grid">{bests.slice(0,4).map(b=><div className="ll-pb" key={b.id}><span>{b.event}</span><b>{fmt(b.time_seconds)}</b><small>{b.course} · {dateText(b.achieved_on)}</small></div>)}{!bests.length&&<Empty text="Your first personal best is waiting to be logged."/>}</div></Card></>}
      {tab==='My Times'&&<><Card><Header eyebrow="YOUR RECORDS" title="Personal bests" action={<button className="ll-primary" onClick={()=>setModal('best')}><Plus size={16}/> ADD TIME</button>}/>{bests.length?<div className="ll-record-list">{bests.map(b=><div className="ll-record" key={b.id}><div><b>{b.event}</b><small>{b.course} · {dateText(b.achieved_on)}</small></div><strong>{fmt(b.time_seconds)}</strong><Medal size={19}/></div>)}</div>:<Empty text="Add your first time to start building your record board."/>}</Card><Card className="ll-mt"><Header eyebrow="TIME TREND" title={eventFilter+" progression"}/><label className="ll-field">Choose event<select value={eventFilter} onChange={e=>setEventFilter(e.target.value)}>{Array.from(new Set(meets.map(m=>m.event))).map(x=><option key={x}>{x}</option>)}</select></label>{pbHistory.length>1?<div className="ll-history"><div className="ll-history-chart">{pbHistory.map((m,i)=><div key={m.id} title={fmt(m.time_seconds)}><i style={{height:Math.max(15,100-(Number(m.time_seconds)-Math.min(...pbHistory.map(x=>Number(x.time_seconds))))/Math.max(0.1,Math.max(...pbHistory.map(x=>Number(x.time_seconds)))-Math.min(...pbHistory.map(x=>Number(x.time_seconds))))*75)+'%'}}/><small>{dateText(m.meet_date).split(',')[0]}</small></div>)}</div><p className="ll-muted">{improvement>0?'Improved by '+improvement.toFixed(2)+' seconds across these results.':'Keep logging results to build your time trend.'}</p></div>:<Empty text="Import or enter multiple meet results for this event to see your progress chart."/>}</Card></>}
      {tab==='Meet Results'&&<Card><Header eyebrow="RESULTS + SOURCE TRACKING" title="Meet results" action={<button className="ll-primary" onClick={()=>setModal('meet')}><Plus size={16}/> IMPORT / ADD</button>}/><div className="ll-info">Use Athlete Profile to attach your official swimmer pages. Paste results from a meet page below when direct data access is unavailable. Imported rows are source-linked, not automatically certified as official.</div>{meets.length?<div className="ll-record-list">{meets.map(m=><div className="ll-record" key={m.id}><div><b>{m.event}</b><small>{m.meet_name||'Swim meet'} · {dateText(m.meet_date)} · {m.course} · {m.source_name||'Manual import'}</small></div><strong>{fmt(m.time_seconds)}</strong></div>)}</div>:<Empty text="No meet results yet. Import a result sheet to begin."/>}</Card>}
      {tab==='Goals'&&<Card><Header eyebrow="QUALIFICATION + PERSONAL TARGETS" title="Your goals" action={<button className="ll-primary" onClick={()=>setModal('goal')}><Plus size={16}/> ADD GOAL</button>}/>{goals.length?<div className="ll-goal-list">{goals.map(g=>{const time=String(g.unit).toLowerCase().includes('second'),pct=time?Number(g.target_value)/Math.max(.01,Number(g.current_value))*100:Number(g.current_value)/Math.max(.01,Number(g.target_value))*100;const away=time?Math.max(0,Number(g.current_value)-Number(g.target_value)):null;return <div className="ll-goal" key={g.id}><div className="ll-goal-top"><div><small>EVENT / QUALIFYING STANDARD</small><h3>{g.title}</h3></div><b>{Math.min(100,Math.round(pct))}%</b></div><div className="ll-progress"><i style={{width:Math.min(100,Math.max(0,pct))+'%'}}/></div><div className="ll-goal-foot"><span>Current {time?fmt(g.current_value):g.current_value}</span><span>Target {time?fmt(g.target_value):g.target_value}</span></div>{time&&<p className="ll-muted">{away.toFixed(2)} seconds to go</p>}</div>})}</div>:<Empty text="Set a personal goal or enter a state qualifying standard."/>}<div className="ll-info ll-mt">Qualification times shown are only as accurate as the standards you enter. Confirm current state and championship standards with your swim association or coach.</div></Card>}
      {tab==='Video Lab'&&<section className="ll-reels-page">
        <div className="ll-reels-heading"><div><div className="ll-eyebrow">LANELINE / TECHNIQUE FEED</div><h2>SWIM <span>REELS</span></h2><p>Tap a clip to play it in LaneLine, without leaving this screen.</p></div><div className="ll-reels-count">{videos.length} CLIPS</div></div>
        <div className="ll-reel-filters">{['For You','Breaststroke','Freestyle','Backstroke','Butterfly','Underwaters','Starts & Turns','Saved'].map(x=><button key={x} className={videoFilter===x?'active':''} onClick={()=>setVideoFilter(x)}>{x}</button>)}</div>
        <div className="ll-reel-feed">
          {videos.filter(v=>videoFilter==='For You'||(videoFilter==='Saved'?savedVideos.includes(v.id):v.category===videoFilter)).map(v=><article className="ll-reel-card" key={v.id}>
            <button className="ll-reel-thumb" onClick={()=>setActiveVideo(v)} aria-label={'Play '+v.title}>
              <img src={'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg'} alt="" loading="lazy"/>
              <span className="ll-reel-play"><CirclePlay size={48}/><small>PLAY IN LANELINE</small></span>
            </button>
            <div className="ll-reel-overlay"><span className="ll-reel-tag">{v.tag}</span><div className="ll-reel-actions"><button aria-label="Like video" className={likedVideos.includes(v.id)?'selected':''} onClick={()=>toggleLikedVideo(v.id)}><Heart fill={likedVideos.includes(v.id)?'currentColor':'none'}/><small>{likedVideos.includes(v.id)?'LIKED':'LIKE'}</small></button><button aria-label="Save video" className={savedVideos.includes(v.id)?'selected':''} onClick={()=>toggleSavedVideo(v.id)}><Bookmark fill={savedVideos.includes(v.id)?'currentColor':'none'}/><small>{savedVideos.includes(v.id)?'SAVED':'SAVE'}</small></button></div></div>
            <div className="ll-reel-copy"><small>{v.coach} · TECHNIQUE BREAKDOWN</small><h3>{v.title}</h3><p>{v.tip}</p></div>
          </article>)}
          {videos.filter(v=>videoFilter==='For You'||(videoFilter==='Saved'?savedVideos.includes(v.id):v.category===videoFilter)).length===0&&<div className="ll-reels-empty"><Bookmark/><b>No saved clips yet</b><span>Tap Save on a video and it will show up here.</span></div>}
        </div>
        <div className="ll-reels-note">Videos are embedded from their original creators. If a creator disables embedding, that clip cannot be played inside any third-party app.</div>
      </section>}
      {tab==='Athlete Profile'&&<div className="ll-athlete-page">
        <Card><Header eyebrow="ATHLETE IDENTITY" title="Connect your swimmer profile" action={<Shield size={19}/>}/>
          <div className="ll-info">Link your exact athlete pages so LaneLine can organize records around the right swimmer. Use the profile URL from the source site—names alone can match the wrong athlete.</div>
          <form className="ll-form" onSubmit={saveAthleteProfile}>
            <div className="ll-two"><label>Athlete name<input required value={athleteProfile.full_name} onChange={e=>setAthleteProfile({...athleteProfile,full_name:e.target.value})} placeholder="Full name as shown on results"/></label><label>Team / school<input value={athleteProfile.team_name} onChange={e=>setAthleteProfile({...athleteProfile,team_name:e.target.value})} placeholder="Club or high school"/></label></div>
            <label>SwimCloud athlete profile URL<input type="url" value={athleteProfile.swimcloud_url} onChange={e=>setAthleteProfile({...athleteProfile,swimcloud_url:e.target.value})} placeholder="Paste your swimmer profile link"/></label>
            <label>USA Swimming Data Hub athlete URL<input type="url" value={athleteProfile.usaswimming_url} onChange={e=>setAthleteProfile({...athleteProfile,usaswimming_url:e.target.value})} placeholder="Paste your athlete page link, if available"/></label>
            <label>School / state results profile URL<input type="url" value={athleteProfile.school_results_url} onChange={e=>setAthleteProfile({...athleteProfile,school_results_url:e.target.value})} placeholder="Paste your official school or association results page"/></label>
            <button className="ll-primary" disabled={busy}>{busy?'SAVING…':'SAVE ATHLETE CONNECTION'}</button>
          </form>
          <div className="ll-athlete-status"><div className="ll-eyebrow">LINK STATUS</div><b>{athleteProfile.full_name?'Athlete identity saved':'No athlete identity saved yet'}</b><span>{[athleteProfile.swimcloud_url,athleteProfile.usaswimming_url,athleteProfile.school_results_url].filter(Boolean).length} profile / results links attached</span></div>
          <div className="ll-athlete-links">{athleteProfile.swimcloud_url&&<a href={safeHttpUrl(athleteProfile.swimcloud_url)} target="_blank" rel="noreferrer">Open linked SwimCloud profile ↗</a>}{athleteProfile.usaswimming_url&&<a href={safeHttpUrl(athleteProfile.usaswimming_url)} target="_blank" rel="noreferrer">Open linked USA Swimming profile ↗</a>}{athleteProfile.school_results_url&&<a href={safeHttpUrl(athleteProfile.school_results_url)} target="_blank" rel="noreferrer">Open linked school results ↗</a>}</div>
        </Card>
        <Card><Header eyebrow="OFFICIAL SWIM RESULTS" title="Results providers" action={<Flag size={19}/>}/>
          <div className="ll-source-list">
            <div><b>USA Swimming Data Hub</b><p>Official USA Swimming athlete performances, event rankings, meet results, and time history.</p><a href="https://data.usaswimming.org/" target="_blank" rel="noreferrer">Open Data Hub ↗</a></div>
            <div><b>SwimCloud</b><p>Swimmer profiles and meet results uploaded by meet directors and coaches. Link your exact swimmer profile above.</p><a href="https://www.swimcloud.com/" target="_blank" rel="noreferrer">Open SwimCloud ↗</a></div>
            <div><b>Wyoming High School Activities Association</b><p>Official Wyoming high-school swimming scoreboards, state qualifying standards, and posted meet results.</p><a href="https://www.whsaa.org/swimming/boysswimming.html" target="_blank" rel="noreferrer">Boys swimming results ↗</a><a href="https://www.whsaa.org/swimming/girlsswimming.html" target="_blank" rel="noreferrer">Girls swimming results ↗</a></div>
          </div>
          <div className="ll-info ll-mt">There is no shared public athlete-times API across these providers. USA Swimming's secure partner API is for approved vendors, and SwimCloud confirms it does not sync with SWIMS. LaneLine stores your athlete profile links and source-linked imports; it does not claim a time is officially verified unless it has been checked against the source. LaneLine saves your profile links and organizes imported results, but does not label a time officially verified unless it has actually been checked against the source.</div>
        </Card>
      </div>}
      {tab==='Rankings'&&<Card><Header eyebrow="COMPETITIVE SNAPSHOT" title="Rankings" action={<Crown size={20}/>}/><div className="ll-info">Real school, state, and national rankings need a verified results source and swimmer identity match. LaneLine won't invent rankings. This screen is ready for a connected rankings feed.</div><div className="ll-ranking-grid"><div><span>YOUR PERSONAL BESTS</span><b>{bests.length}</b><small>Events with a record</small></div><div><span>MEET RESULTS</span><b>{meets.length}</b><small>Recorded performances</small></div><div><span>GOALS IN PLAY</span><b>{goals.length}</b><small>Active targets</small></div></div><Header eyebrow="YOUR EVENT BOARD" title="Best recorded times"/>{bests.slice().sort((a,b)=>Number(a.time_seconds)-Number(b.time_seconds)).map((b,i)=><div className="ll-rank-row" key={b.id}><span className="ll-rank-number">#{i+1}</span><div><b>{b.event}</b><small>{b.course}</small></div><strong>{fmt(b.time_seconds)}</strong></div>)}</Card>}
      {tab==='Rewards'&&<><section className="ll-reward-hero"><div className="ll-eyebrow">PLAYER PROFILE / LEVEL {level}</div><h2>{xp} <span>XP</span></h2><p>Every session, goal, and personal best moves your progress forward.</p><div className="ll-xp-track"><i style={{width:progress+'%'}}/></div><small>{Math.round(250-(xp%250))} XP TO LEVEL {level+1}</small></section><Card><Header eyebrow="ACHIEVEMENT COLLECTION" title="Your badges"/><div className="ll-badges">{[{name:'First Splash',desc:'Log your first swim',ok:sessions.length>=1,icon:Waves},{name:'Training Habit',desc:'Log 10 sessions',ok:sessions.length>=10,icon:Activity},{name:'Record Breaker',desc:'Save a personal best',ok:bests.length>=1,icon:Medal},{name:'Multi-Event',desc:'Track 3 personal bests',ok:bests.length>=3,icon:Award},{name:'Goal Setter',desc:'Create your first goal',ok:goals.length>=1,icon:Target}].map(b=><div className={'ll-badge '+(b.ok?'earned':'locked')} key={b.name}><div>{b.ok?<b.icon/>:<Shield/>}</div><b>{b.name}</b><small>{b.desc}</small><span>{b.ok?'UNLOCKED':'LOCKED'}</span></div>)}</div></Card></>}
      <footer className="ll-footer">LANELINE / TRAIN SMARTER. RACE FASTER. <span>BUILD 0.2 · PERSONAL PROGRESS FIRST</span></footer>
    </main>
    {modal==='swim'&&<Modal title="Log a practice swim" onClose={()=>setModal('')}><form className="ll-form" onSubmit={saveSwim}><div className="ll-two"><label>Date<input type="date" value={swim.swim_date} onChange={e=>setSwim({...swim,swim_date:e.target.value})}/></label><label>Pool<select value={swim.pool_length} onChange={e=>setSwim({...swim,pool_length:e.target.value})}><option>25 yd</option><option>25 m</option><option>50 m</option></select></label></div><div className="ll-two"><label>Distance<input type="number" min="1" required value={swim.distance} onChange={e=>setSwim({...swim,distance:e.target.value})}/></label><label>Unit<select value={swim.distance_unit} onChange={e=>setSwim({...swim,distance_unit:e.target.value})}><option value="yd">Yards</option><option value="m">Meters</option></select></label></div><label>Primary stroke<select value={swim.stroke} onChange={e=>setSwim({...swim,stroke:e.target.value})}>{['Breaststroke','Freestyle','Backstroke','Butterfly','IM','Mixed'].map(x=><option key={x}>{x}</option>)}</select></label><label>Duration (mm:ss.hh) <small>optional · e.g. 42:30.00</small><input type="text" inputMode="decimal" placeholder="42:30.00" value={swim.duration_seconds} onChange={e=>setSwim({...swim,duration_seconds:e.target.value})}/></label><label>Notes <small>optional</small><textarea rows="3" value={swim.notes} onChange={e=>setSwim({...swim,notes:e.target.value})}/></label><button className="ll-primary" disabled={busy}>{busy?'SAVING…':'SAVE PRACTICE'}</button></form></Modal>}
    {modal==='best'&&<Modal title="Add a personal best" onClose={()=>setModal('')}><form className="ll-form" onSubmit={saveBest}><label>Event<input required value={best.event} onChange={e=>setBest({...best,event:e.target.value})} placeholder="100 Breast"/></label><div className="ll-two"><label>Race time (mm:ss.hh) <small>hundredths supported · e.g. 1:13.58</small><input required inputMode="decimal" placeholder="1:13.58" value={best.time} onChange={e=>setBest({...best,time:e.target.value})}/></label><label>Course<select value={best.course} onChange={e=>setBest({...best,course:e.target.value})}><option>SCY</option><option>SCM</option><option>LCM</option></select></label></div><label>Date achieved<input type="date" value={best.achieved_on} onChange={e=>setBest({...best,achieved_on:e.target.value})}/></label><button className="ll-primary" disabled={busy}>SAVE PERSONAL BEST</button></form></Modal>}
    {modal==='meet'&&<Modal title="Import posted meet results" onClose={()=>setModal('')}><form className="ll-form" onSubmit={importMeet}><div className="ll-info">Choose the official results page you used, paste its URL, then paste the rows for this athlete. LaneLine keeps the source attached to each result.</div><label>Results source<select value={meet.source_name} onChange={e=>setMeet({...meet,source_name:e.target.value})}><option>Manual / source link</option><option>USA Swimming Data Hub</option><option>SwimCloud</option><option>WHSAA</option><option>Meet Mobile</option><option>Other</option></select></label><label>Meet name<input value={meet.meet_name} onChange={e=>setMeet({...meet,meet_name:e.target.value})} placeholder="Evanston Invite"/></label><label>Results page link<input type="url" value={meet.source_url} onChange={e=>setMeet({...meet,source_url:e.target.value})} placeholder="https://…"/></label><label>Meet date<input type="date" value={meet.meet_date} onChange={e=>setMeet({...meet,meet_date:e.target.value})}/></label><label>Paste result rows<textarea rows="5" required value={meet.rows} onChange={e=>setMeet({...meet,rows:e.target.value})} placeholder={'100 Breast, 1:13.58, SCY, 2026-11-20, Evanston Invite'}/></label><small className="ll-muted">Format: Event, Time, Course (SCY/SCM/LCM), Date, Meet name.</small><button className="ll-primary" disabled={busy}>IMPORT RESULTS + CHECK PERSONAL BESTS</button></form></Modal>}
    {modal==='goal'&&<Modal title="Set a goal or qualifying time" onClose={()=>setModal('')}><form className="ll-form" onSubmit={saveGoal}><label>Event / standard name<input required value={goal.title} onChange={e=>setGoal({...goal,title:e.target.value})} placeholder="100 Breast · State cut"/></label><div className="ll-two"><label>Current time (mm:ss.hh)<input type="text" inputMode="decimal" placeholder="1:15.18" required value={goal.current_value} onChange={e=>setGoal({...goal,current_value:e.target.value})}/></label><label>Target time (mm:ss.hh)<input type="text" inputMode="decimal" placeholder="1:13.58" required value={goal.target_value} onChange={e=>setGoal({...goal,target_value:e.target.value})}/></label></div><label>Target date<input type="date" value={goal.target_date} onChange={e=>setGoal({...goal,target_date:e.target.value})}/></label><button className="ll-primary" disabled={busy}>SAVE GOAL</button></form></Modal>}
    {activeVideo&&<div className="ll-video-modal-back" onMouseDown={e=>e.target===e.currentTarget&&setActiveVideo(null)}>
      <section className="ll-video-modal">
        <header><div><div className="ll-eyebrow">{activeVideo.coach} · {activeVideo.tag}</div><h2>{activeVideo.title}</h2></div><button className="ll-icon-btn" onClick={()=>setActiveVideo(null)} aria-label="Close video"><X/></button></header>
        <div className="ll-video-modal-player"><iframe src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?start=${activeVideo.start}&autoplay=1&playsinline=1&rel=0&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`} title={activeVideo.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen/></div>
        <p>{activeVideo.tip}</p><small>Playback stays in this LaneLine window. Use Close to return to your technique feed.</small>
      </section>
    </div>}
  </div>;
}
