import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const DEMO_VIDEOS = [
  { id:'demo-1', user_id:'ids-team', caption:'Welcome to IDS. Your next favorite video is one swipe away. ✨', video_url:'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', source_type:'demo', author:{username:'idsdaily',display_name:'IDS Daily'}, likes:12800, comments:342, tag:'For You' },
  { id:'demo-2', user_id:'ids-team', caption:'POV: you finally get the weekend started 🔥', video_url:'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', source_type:'demo', author:{username:'theloop',display_name:'The Loop'}, likes:8640, comments:186, tag:'Trending' },
  { id:'demo-3', user_id:'ids-team', caption:'A little inspiration for your feed today. 💗', video_url:'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', source_type:'demo', author:{username:'goodvibes',display_name:'Good Vibes'}, likes:5200, comments:94, tag:'Lifestyle' },
  { id:'demo-4', user_id:'ids-team', caption:'Find something new. Make something yours. ❤️', video_url:'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', source_type:'demo', author:{username:'idsdaily',display_name:'IDS Daily'}, likes:3900, comments:76, tag:'Discover' },
];

function embedFromUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.hostname.includes('tiktok.com')) {
      const id = u.pathname.match(/video\/(\d+)/)?.[1];
      return id ? { type:'tiktok', url:`https://www.tiktok.com/player/v1/${id}?autoplay=1&music_info=0&description=0` } : null;
    }
    if (u.hostname.includes('instagram.com')) {
      const code = u.pathname.match(/\/(?:reel|reels|p)\/([^/?]+)/)?.[1];
      return code ? { type:'instagram', url:`https://www.instagram.com/reel/${code}/embed` } : null;
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
      return id ? { type:'youtube', url:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1` } : null;
    }
  } catch { return null; }
  return null;
}

function formatCount(n=0) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1).replace('.0','')}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1).replace('.0','')}K`;
  return String(n);
}

function Avatar({ profile, size='md' }) {
  const initials = (profile?.display_name || profile?.username || 'I').slice(0,1).toUpperCase();
  return profile?.avatar_url
    ? <img className={`avatar avatar-${size}`} src={profile.avatar_url} alt="" />
    : <span className={`avatar avatar-${size} avatar-fallback`}>{initials}</span>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState(DEMO_VIDEOS);
  const [likes, setLikes] = useState({});
  const [saves, setSaves] = useState({});
  const [follows, setFollows] = useState({});
  const [activeTab, setActiveTab] = useState('home');
  const [feedMode, setFeedMode] = useState('for-you');
  const [activeVideo, setActiveVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState('upload');
  const [caption, setCaption] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [demoLikes, setDemoLikes] = useState(() => { try { return JSON.parse(localStorage.getItem('ids-demo-likes') || '{}'); } catch { return {}; } });
  const [demoSaves, setDemoSaves] = useState(() => { try { return JSON.parse(localStorage.getItem('ids-demo-saves') || '{}'); } catch { return {}; } });
  const feedRef = useRef(null);
  const fileRef = useRef(null);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    const { data: rows, error } = await supabase.from('ids_videos').select('*').eq('visibility','public').order('created_at',{ascending:false}).limit(60);
    if (error) { console.warn(error.message); return; }
    if (!rows?.length) { setVideos(DEMO_VIDEOS); return; }
    const ids = [...new Set(rows.map(v => v.user_id))];
    const [{ data: people }, { data: likeRows }, { data: commentRows }] = await Promise.all([
      supabase.from('ids_profiles').select('id,username,display_name,avatar_url,bio').in('id', ids),
      supabase.from('ids_likes').select('video_id,user_id'),
      supabase.from('ids_comments').select('video_id'),
    ]);
    const personMap = Object.fromEntries((people || []).map(p => [p.id,p]));
    const likeMap = {};
    (likeRows || []).forEach(row => { likeMap[row.video_id] = (likeMap[row.video_id] || 0) + 1; });
    const commentMap = {};
    (commentRows || []).forEach(row => { commentMap[row.video_id] = (commentMap[row.video_id] || 0) + 1; });
    const liked = {};
    (likeRows || []).forEach(row => { if (session?.user?.id === row.user_id) liked[row.video_id] = true; });
    setLikes(liked);
    setVideos(rows.map(v => ({ ...v, author:personMap[v.user_id] || { username:'idsuser',display_name:'IDS user' }, likes:likeMap[v.id] || 0, comments:commentMap[v.id] || 0 })));
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!supabase || !session?.user?.id) { setProfile(null); return; }
    supabase.from('ids_profiles').select('*').eq('id',session.user.id).maybeSingle().then(({data}) => {
      setProfile(data || null);
      if (data) { setEditName(data.display_name || ''); setEditUsername(data.username || ''); setEditBio(data.bio || ''); }
    });
    supabase.from('ids_saves').select('video_id').eq('user_id',session.user.id).then(({data}) => setSaves(Object.fromEntries((data || []).map(x => [x.video_id,true]))));
    supabase.from('ids_follows').select('following_id').eq('follower_id',session.user.id).then(({data}) => setFollows(Object.fromEntries((data || []).map(x => [x.following_id,true]))));
  }, [session]);

  useEffect(() => {
    if (!feedRef.current || activeTab !== 'home') return;
    const nodes = feedRef.current.querySelectorAll('video');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.65) video.play().catch(() => {});
        else video.pause();
      });
    }, { root:feedRef.current, threshold:[0,0.65,1] });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [videos, activeTab, feedMode]);

  const followingIds = Object.keys(follows);
  const visibleVideos = useMemo(() => {
    let list = videos;
    if (activeTab === 'saved') list = list.filter(v => saves[v.id] || demoSaves[v.id]);
    if (feedMode === 'following' && activeTab === 'home') list = list.filter(v => followingIds.includes(v.user_id));
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(v => (v.caption || '').toLowerCase().includes(term) || (v.author?.username || '').toLowerCase().includes(term) || (v.author?.display_name || '').toLowerCase().includes(term));
    }
    return list;
  }, [videos, activeTab, saves, demoSaves, feedMode, followingIds.join('|'), search]);

  const requireUser = () => {
    if (!session?.user) { setShowAuth(true); setAuthError('Sign in or create an account to do that.'); return false; }
    return true;
  };

  async function toggleLike(video) {
    if (video.source_type === 'demo') {
      const next = { ...demoLikes, [video.id]:!demoLikes[video.id] };
      setDemoLikes(next); localStorage.setItem('ids-demo-likes',JSON.stringify(next)); return;
    }
    if (!requireUser()) return;
    const liked = !!likes[video.id];
    setLikes(prev => ({...prev,[video.id]:!liked}));
    setVideos(prev => prev.map(v => v.id === video.id ? {...v,likes:Math.max(0,(v.likes || 0)+(liked?-1:1))} : v));
    const result = liked
      ? await supabase.from('ids_likes').delete().eq('video_id',video.id).eq('user_id',session.user.id)
      : await supabase.from('ids_likes').insert({video_id:video.id,user_id:session.user.id});
    if (result.error) { setLikes(prev => ({...prev,[video.id]:liked})); loadData(); notify(result.error.message); }
  }

  async function toggleSave(video) {
    if (video.source_type === 'demo') {
      const next = {...demoSaves,[video.id]:!demoSaves[video.id]};
      setDemoSaves(next); localStorage.setItem('ids-demo-saves',JSON.stringify(next)); notify(next[video.id]?'Saved':'Removed from saves'); return;
    }
    if (!requireUser()) return;
    const saved = !!saves[video.id];
    setSaves(prev => ({...prev,[video.id]:!saved}));
    const result = saved
      ? await supabase.from('ids_saves').delete().eq('video_id',video.id).eq('user_id',session.user.id)
      : await supabase.from('ids_saves').insert({video_id:video.id,user_id:session.user.id});
    if (result.error) { setSaves(prev => ({...prev,[video.id]:saved})); notify(result.error.message); }
    else notify(saved?'Removed from saves':'Saved to your collection');
  }

  async function openComments(video) {
    setActiveVideo(video); setShowComments(true); setComments([]);
    if (video.source_type !== 'demo' && supabase) {
      const {data} = await supabase.from('ids_comments').select('id,body,user_id,created_at').eq('video_id',video.id).order('created_at',{ascending:true});
      const ids = [...new Set((data || []).map(c => c.user_id))];
      const {data:people} = ids.length ? await supabase.from('ids_profiles').select('id,username,display_name,avatar_url').in('id',ids) : {data:[]};
      const map = Object.fromEntries((people || []).map(p => [p.id,p]));
      setComments((data || []).map(c => ({...c,author:map[c.user_id] || {username:'idsuser'}})));
    }
  }

  async function sendComment() {
    if (!commentText.trim() || !activeVideo) return;
    if (activeVideo.source_type === 'demo') { notify('Demo comments are just a preview. Post a video to start the conversation.'); return; }
    if (!requireUser()) return;
    const {error} = await supabase.from('ids_comments').insert({video_id:activeVideo.id,user_id:session.user.id,body:commentText.trim()});
    if (error) notify(error.message);
    else { setComments(prev => [...prev,{id:crypto.randomUUID(),body:commentText.trim(),author:profile || {username:'you'}}]); setCommentText(''); setVideos(prev => prev.map(v => v.id === activeVideo.id ? {...v,comments:(v.comments || 0)+1} : v)); }
  }

  async function followUser(video) {
    if (!requireUser()) return;
    if (video.user_id === session.user.id) return;
    const already = !!follows[video.user_id];
    setFollows(prev => ({...prev,[video.user_id]:!already}));
    const result = already
      ? await supabase.from('ids_follows').delete().eq('follower_id',session.user.id).eq('following_id',video.user_id)
      : await supabase.from('ids_follows').insert({follower_id:session.user.id,following_id:video.user_id});
    if (result.error) { setFollows(prev => ({...prev,[video.user_id]:already})); notify(result.error.message); }
    else notify(already?'Unfollowed':'Following');
  }

  async function shareVideo(video) {
    const url = video.source_url || video.video_url || window.location.href;
    try {
      if (navigator.share) await navigator.share({title:'IDS video',text:video.caption,url});
      else { await navigator.clipboard.writeText(url); notify('Link copied'); }
    } catch {}
  }

  async function reportVideo(video) {
    if (!requireUser()) return;
    const reason = window.prompt('What should we review about this video?');
    if (!reason?.trim()) return;
    const {error} = await supabase.from('ids_reports').insert({reporter_id:session.user.id,video_id:video.source_type === 'demo' ? null : video.id,reason:reason.trim().slice(0,300)});
    notify(error ? error.message : 'Report sent for review. Thank you.');
  }

  async function submitAuth(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError('');
    if (!supabase) { setAuthError('Sign-in is not configured yet.'); setAuthBusy(false); return; }
    const result = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({email:authEmail,password:authPassword})
      : await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{username:authUsername.trim().toLowerCase(),display_name:authUsername.trim()}}});
    setAuthBusy(false);
    if (result.error) setAuthError(result.error.message);
    else if (authMode === 'signup' && !result.data.session) setAuthError('Check your email to confirm your account, then sign in.');
    else {
      if (authMode === 'signup' && result.data.user) {
        const { error: usernameError } = await supabase.from('ids_profiles').update({username:authUsername.trim().toLowerCase()}).eq('id',result.data.user.id);
        if (usernameError) notify('Account created. You can choose an available username in Profile.');
      }
      setShowAuth(false); setAuthPassword(''); notify('Welcome to IDS');
    }
  }

  async function submitPost(e) {
    e.preventDefault();
    if (!requireUser()) return;
    if (!profile) { notify('Your profile is still loading. Try again in a moment.'); return; }
    setUploadBusy(true);
    try {
      let videoUrl = '';
      let sourceType = 'upload';
      let sourceUrl = null;
      let storagePath = null;
      if (createMode === 'external') {
        const embed = embedFromUrl(externalUrl.trim());
        if (!embed) throw new Error('Paste a public TikTok, Instagram Reel, or YouTube video link.');
        videoUrl = embed.url; sourceType = 'external'; sourceUrl = externalUrl.trim();
      } else {
        if (!uploadFile) throw new Error('Choose a video first.');
        if (!uploadFile.type.startsWith('video/')) throw new Error('Please choose a video file.');
        if (uploadFile.size > 50 * 1024 * 1024) throw new Error('Videos must be 50 MB or smaller for this first version.');
        const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g,'-');
        storagePath = `${session.user.id}/${Date.now()}-${safeName}`;
        const {error:uploadError} = await supabase.storage.from('ids-videos').upload(storagePath,uploadFile,{contentType:uploadFile.type,upsert:false});
        if (uploadError) throw uploadError;
        videoUrl = supabase.storage.from('ids-videos').getPublicUrl(storagePath).data.publicUrl;
      }
      const {error} = await supabase.from('ids_videos').insert({user_id:session.user.id,caption:caption.trim(),video_url:videoUrl,storage_path:storagePath,source_type:sourceType,source_url:sourceUrl,visibility:'public'});
      if (error) throw error;
      setShowCreate(false); setCaption(''); setExternalUrl(''); setUploadFile(null); setActiveTab('home'); setFeedMode('for-you');
      await loadData(); notify('Your video is live on IDS');
    } catch (err) { notify(err.message || 'Could not publish your video.'); }
    finally { setUploadBusy(false); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (!requireUser()) return;
    setProfileBusy(true);
    const {error} = await supabase.from('ids_profiles').update({display_name:editName.trim(),username:editUsername.trim().toLowerCase(),bio:editBio.trim()}).eq('id',session.user.id);
    setProfileBusy(false);
    if (error) notify(error.message);
    else { setProfile(prev => ({...prev,display_name:editName.trim(),username:editUsername.trim().toLowerCase(),bio:editBio.trim()})); notify('Profile updated'); }
  }

  async function signOut() { await supabase?.auth.signOut(); setProfile(null); setSaves({}); setFollows({}); setActiveTab('home'); notify('Signed out'); }

  const displayVideos = visibleVideos.length ? visibleVideos : [];
  const pageTitle = activeTab === 'explore' ? 'Explore' : activeTab === 'saved' ? 'Saved' : activeTab === 'profile' ? 'Your profile' : 'IDS';

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => {setActiveTab('home');setSearch('');}} aria-label="IDS home">
          <span className="brand-mark">IDS<span className="brand-dot">.</span></span>
          <span className="brand-sub">ISAAC'S DOOM SCROLL</span>
        </button>
        <div className="top-actions">
          <button className="icon-button search-trigger" onClick={() => {setActiveTab('explore');document.getElementById('ids-search')?.focus();}} aria-label="Search">⌕</button>
          {session?.user ? <button className="mini-profile" onClick={() => setActiveTab('profile')}><Avatar profile={profile} size="sm" /></button> : <button className="login-pill" onClick={() => setShowAuth(true)}>Log in</button>}
        </div>
      </header>

      {activeTab === 'home' && <>
        <div className="feed-switch">
          <button className={feedMode==='following'?'selected':''} onClick={() => setFeedMode('following')}>Following</button>
          <span className="switch-line" />
          <button className={feedMode==='for-you'?'selected':''} onClick={() => setFeedMode('for-you')}>For You</button>
        </div>
        <main className="video-feed" ref={feedRef}>
          {displayVideos.length ? displayVideos.map((video,index) => {
            const liked = video.source_type === 'demo' ? !!demoLikes[video.id] : !!likes[video.id];
            const saved = video.source_type === 'demo' ? !!demoSaves[video.id] : !!saves[video.id];
            const embed = video.source_type === 'external' ? {url:video.video_url} : null;
            return <article className="video-card" key={video.id}>
              <div className="video-stage">
                {embed
                  ? <iframe className="video-player" src={embed.url} title="Embedded social video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                  : <video className="video-player" src={video.video_url} playsInline muted loop autoPlay={index===0} preload={index<2?'auto':'metadata'} controls={false} onClick={e => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()} />}
                <div className="video-vignette" />
                <div className="video-top-label"><span className="live-dot" /> {video.source_type === 'demo' ? 'IDS PICKS' : video.source_type === 'external' ? 'EMBEDDED VIDEO' : 'IDS COMMUNITY'}</div>
                <div className="video-meta">
                  <div className="creator-line">
                    <Avatar profile={video.author} size="sm" />
                    <span className="creator-name">@{video.author?.username || 'idsuser'}</span>
                    {video.source_type !== 'demo' && session?.user?.id !== video.user_id && <button className={follows[video.user_id]?'follow-button following':'follow-button'} onClick={() => followUser(video)}>{follows[video.user_id]?'Following':'Follow'}</button>}
                  </div>
                  <p className="video-caption">{video.caption || 'A new video on IDS.'}</p>
                  <div className="video-tags"><span>#ids</span><span>#foryou</span></div>
                </div>
                <div className="video-actions">
                  <button className={liked?'action-button active':'action-button'} onClick={() => toggleLike(video)}><span className="action-icon">{liked?'♥':'♡'}</span><span>{formatCount((video.likes || 0)+(liked && video.source_type==='demo' ? 1 : 0))}</span></button>
                  <button className="action-button" onClick={() => openComments(video)}><span className="action-icon">◌</span><span>{formatCount(video.comments || 0)}</span></button>
                  <button className={saved?'action-button active':'action-button'} onClick={() => toggleSave(video)}><span className="action-icon">{saved?'▣':'▢'}</span><span>Save</span></button>
                  <button className="action-button" onClick={() => shareVideo(video)}><span className="action-icon">↗</span><span>Share</span></button>
                  {video.source_type !== 'demo' && <button className="action-button report-action" onClick={() => reportVideo(video)}><span className="action-icon">•••</span><span>Report</span></button>}
                </div>
              </div>
            </article>;
          }) : <div className="empty-state"><div className="empty-icon">✦</div><h2>{feedMode==='following'?'Your Following feed is quiet':'Nothing here yet'}</h2><p>{feedMode==='following'?'Follow creators to see their videos here.':'Be the first to post a video to IDS.'}</p><button className="primary-button" onClick={() => setShowCreate(true)}>Create a post</button></div>}
        </main>
      </>}

      {activeTab === 'explore' && <main className="page-content">
        <div className="page-heading"><div><p className="eyebrow">FIND YOUR NEXT FAVORITE</p><h1>Explore<span className="pink">.</span></h1></div><span className="heading-spark">✳</span></div>
        <div className="search-box"><span>⌕</span><input id="ids-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search videos or creators" /><button onClick={()=>setSearch('')}>×</button></div>
        <div className="topic-row">{['For You','Trending','Comedy','Lifestyle','Music','Sports','Gaming'].map(t=><button key={t} className="topic-chip" onClick={()=>setSearch(t==='For You'?'':t.toLowerCase())}>{t}</button>)}</div>
        <div className="explore-grid">{(search ? visibleVideos : videos).map(v=><button className="explore-tile" key={v.id} onClick={()=>{setActiveTab('home');setSearch('');setFeedMode('for-you');}}><video src={v.video_url} muted playsInline preload="metadata"/><span className="tile-play">▶</span><span className="tile-caption">{v.caption}</span></button>)}</div>
        {!videos.length && <p className="muted">New videos will show up here.</p>}
      </main>}

      {activeTab === 'saved' && <main className="page-content">
        <div className="page-heading"><div><p className="eyebrow">YOUR COLLECTION</p><h1>Saved<span className="pink">.</span></h1></div><span className="heading-spark">▣</span></div>
        <div className="explore-grid">{visibleVideos.map(v=><button className="explore-tile" key={v.id} onClick={()=>{setActiveTab('home');setSearch('');}}><video src={v.video_url} muted playsInline preload="metadata"/><span className="tile-play">▶</span><span className="tile-caption">{v.caption}</span></button>)}</div>
        {!visibleVideos.length && <div className="empty-state compact"><h2>No saved videos yet</h2><p>Tap Save on a video and it will live here.</p></div>}
      </main>}

      {activeTab === 'profile' && <main className="page-content profile-page">
        <div className="page-heading"><div><p className="eyebrow">YOUR CORNER OF IDS</p><h1>Profile<span className="pink">.</span></h1></div><span className="heading-spark">✦</span></div>
        {session?.user ? <>
          <div className="profile-card"><Avatar profile={profile} size="xl"/><div className="profile-identity"><h2>{profile?.display_name || 'IDS creator'}</h2><p>@{profile?.username || 'loading'}</p></div><span className="profile-badge">CREATOR</span></div>
          <form className="profile-form" onSubmit={saveProfile}>
            <label>Display name<input value={editName} onChange={e=>setEditName(e.target.value)} maxLength="40"/></label>
            <label>Username<input value={editUsername} onChange={e=>setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g,''))} minLength="3" maxLength="24"/></label>
            <label>Bio<textarea value={editBio} onChange={e=>setEditBio(e.target.value)} maxLength="160" placeholder="A little about you..."/></label>
            <button className="primary-button" disabled={profileBusy}>{profileBusy?'Saving...':'Save profile'}</button>
          </form>
          <button className="outline-button signout-button" onClick={signOut}>Sign out</button>
        </> : <div className="empty-state compact"><h2>Your profile starts here</h2><p>Sign in to create your profile and post videos.</p><button className="primary-button" onClick={()=>setShowAuth(true)}>Sign in / Sign up</button></div>}
      </main>}

      <nav className="bottom-nav">
        <button className={activeTab==='home'?'nav-item active':'nav-item'} onClick={()=>{setActiveTab('home');setSearch('');}}><span>⌂</span><small>Home</small></button>
        <button className={activeTab==='explore'?'nav-item active':'nav-item'} onClick={()=>setActiveTab('explore')}><span>⌕</span><small>Explore</small></button>
        <button className="create-nav" onClick={()=>{setShowCreate(true);setCreateMode('upload');}} aria-label="Create video"><span>＋</span></button>
        <button className={activeTab==='saved'?'nav-item active':'nav-item'} onClick={()=>setActiveTab('saved')}><span>▢</span><small>Saved</small></button>
        <button className={activeTab==='profile'?'nav-item active':'nav-item'} onClick={()=>setActiveTab('profile')}><span>◉</span><small>Profile</small></button>
      </nav>

      {showAuth && <div className="modal-backdrop" onClick={()=>setShowAuth(false)}><section className="modal-card auth-card" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={()=>setShowAuth(false)}>×</button><div className="modal-brand">IDS<span>.</span></div><p className="eyebrow">YOUR FEED. YOUR PEOPLE.</p><h2>{authMode==='signup'?'Join the scroll.':'Welcome back.'}</h2>
        <form onSubmit={submitAuth} className="modal-form">
          {authMode==='signup' && <label>Username<input value={authUsername} onChange={e=>setAuthUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g,''))} placeholder="yourusername" minLength="3" maxLength="24" required/></label>}
          <label>Email<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/></label>
          <label>Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters" minLength="8" required/></label>
          {authError && <p className="form-error">{authError}</p>}
          <button className="primary-button" disabled={authBusy}>{authBusy?'One sec...':authMode==='signup'?'Create account':'Log in'}</button>
        </form>
        <p className="modal-switch">{authMode==='signup'?'Already have an account?':'New to IDS?'} <button onClick={()=>{setAuthMode(authMode==='signup'?'signin':'signup');setAuthError('');}}>{authMode==='signup'?'Log in':'Sign up'}</button></p>
        <p className="fine-print">Be kind. Respect creators. Only post videos you own or have permission to share.</p>
      </section></div>}

      {showCreate && <div className="modal-backdrop" onClick={()=>setShowCreate(false)}><section className="modal-card create-card" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={()=>setShowCreate(false)}>×</button><p className="eyebrow">MAKE SOMETHING YOURS</p><h2>Create a post<span className="pink">.</span></h2>
        <div className="create-tabs"><button className={createMode==='upload'?'selected':''} onClick={()=>setCreateMode('upload')}>Upload video</button><button className={createMode==='external'?'selected':''} onClick={()=>setCreateMode('external')}>Add social link</button></div>
        <form className="modal-form" onSubmit={submitPost}>
          {createMode==='upload' ? <div className="upload-zone" onClick={()=>fileRef.current?.click()}><input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={e=>setUploadFile(e.target.files?.[0] || null)} hidden/><span className="upload-plus">＋</span><strong>{uploadFile?.name || 'Choose a video'}</strong><small>MP4, MOV or WebM · up to 50 MB</small></div> : <label>Public video link<input value={externalUrl} onChange={e=>setExternalUrl(e.target.value)} placeholder="Paste a TikTok, Instagram Reel, or YouTube URL"/><small>IDS embeds the original post. It does not copy or re-upload it.</small></label>}
          <label>Caption<textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Add a caption..." maxLength="220"/></label>
          <button className="primary-button" disabled={uploadBusy}>{uploadBusy?'Publishing...':'Publish to IDS'}</button>
        </form>
        <p className="fine-print">Only upload videos you created or have permission to use. Posts are public in this first version.</p>
      </section></div>}

      {showComments && <div className="modal-backdrop comments-backdrop" onClick={()=>setShowComments(false)}><section className="comments-sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/><div className="comments-heading"><div><p className="eyebrow">THE CONVERSATION</p><h2>Comments <span className="pink">.</span></h2></div><button className="modal-close inline-close" onClick={()=>setShowComments(false)}>×</button></div>
        <div className="comments-list">{comments.length ? comments.map(c=><div className="comment-row" key={c.id}><Avatar profile={c.author} size="sm"/><div><strong>@{c.author?.username || 'idsuser'}</strong><p>{c.body}</p></div></div>) : <div className="comments-empty"><span>♡</span><strong>Start the conversation</strong><p>Be the first to comment.</p></div>}</div>
        <form className="comment-form" onSubmit={e=>{e.preventDefault();sendComment();}}><input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment..." maxLength="500"/><button disabled={!commentText.trim()}>Post</button></form>
      </section></div>}

      {toast && <div className="toast-message">{toast}</div>}
      <footer className="site-foot">IDS <span>·</span> ISAAC'S DOOM SCROLL <span>·</span> MADE TO DISCOVER</footer>
    </div>
  );
}