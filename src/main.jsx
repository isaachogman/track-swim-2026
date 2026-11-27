import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class StartupErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('LaneLine render error:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <main style={{minHeight:'100vh',background:'#071522',color:'#eaf3f8',fontFamily:'Arial,sans-serif',padding:'32px 22px'}}>
          <div style={{maxWidth:620,margin:'10vh auto',padding:24,border:'1px solid #244765',borderRadius:16,background:'#0b1b2d'}}>
            <p style={{color:'#39baff',fontWeight:800,letterSpacing:2}}>LANELINE STARTUP ERROR</p>
            <h1 style={{fontSize:25}}>The app hit a problem while opening.</h1>
            <p style={{color:'#b6c9dc',lineHeight:1.6}}>This diagnostic screen means the website loaded, but one part of LaneLine failed to render. Please send this message to support:</p>
            <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:14,borderRadius:8,background:'#06101d',color:'#ffd3a8',fontSize:12}}>{String(this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={{background:'#087fe8',color:'white',border:0,borderRadius:8,padding:'12px 16px',fontWeight:700}}>Reload LaneLine</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <StartupErrorBoundary><App /></StartupErrorBoundary>
    </React.StrictMode>
  );
}
