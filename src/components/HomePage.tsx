import React from 'react';
import { Menu, X, ArrowRight, Check, User, RefreshCw, Lock } from 'lucide-react';

interface HomePageProps {
  onNavigateToDashboard: () => void;
}

function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" style={{ width: size, height: size, display: 'block' }}>
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7C93C" />
          <stop offset="28%" stopColor="#F7931E" />
          <stop offset="55%" stopColor="#E8286E" />
          <stop offset="80%" stopColor="#C0208A" />
          <stop offset="100%" stopColor="#8E1FA0" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#hg)" />
      <circle cx="200" cy="200" r="160" fill="#000000" />
      <circle cx="200" cy="200" r="148" fill="#FFFFFF" />
      <g transform="translate(200,200) scale(1.28)">
        <rect x="-70" y="-52" width="140" height="100" rx="14" fill="none" stroke="#E31E24" strokeWidth="8" />
        <circle cx="-52" cy="-34" r="5" fill="#E31E24" />
        <circle cx="-32" cy="-34" r="5" fill="#E31E24" />
        <g transform="scale(0.88)">
          <path d="M0 -16 L54 6 L0 28 L-54 6 Z" fill="#E31E24" />
          <path d="M-27 14 L-27 40 C-27 47 -12 53 0 53 C12 53 27 47 27 40 L27 14 L0 26 Z" fill="#E31E24" />
        </g>
      </g>
    </svg>
  );
}

const trustItems = [
  { icon: User, title: 'One record per student', desc: 'Profile, attendance, results, and fees, always in sync.' },
  { icon: Check, title: 'Built for accuracy', desc: 'Automatic result computation removes manual grading errors.' },
  { icon: RefreshCw, title: 'Grows with your school', desc: 'Add classes, campuses, or a whole school group without switching systems.' },
  { icon: Lock, title: 'One account, everywhere', desc: 'Same login across every Pisairtel product your school uses.' },
];

const features = [
  { icon: 'admissions', title: 'Admissions & Enrollment', desc: 'Online applications, inquiry tracking, and a guided enrollment workflow — from first contact to student ID.' },
  { icon: 'attendance', title: 'Attendance & Timetable', desc: 'Mark attendance in seconds — by hand or QR code — and publish clash-free class timetables automatically.' },
  { icon: 'results', title: 'Results & CBT Exams', desc: 'Automatic result computation, approval workflows, broadsheets, and full computer-based testing.' },
  { icon: 'finance', title: 'Finance & Fees', desc: 'Fee structures, invoices, receipts, and online payment — with real-time visibility into who owes what.' },
  { icon: 'communication', title: 'Communication', desc: 'School-wide announcements, targeted SMS, and direct parent–teacher messaging in one inbox.' },
  { icon: 'campus', title: 'Multi-Campus Support', desc: 'Run several campuses or a whole school group from one connected account and shared directory.' },
];

const featureIcons: Record<string, React.ReactNode> = {
  admissions: <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />,
  attendance: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  results: <><rect x="3" y="4" width="18" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="18" x2="12" y2="21" /></>,
  finance: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  communication: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  campus: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></>,
};

const showcaseSteps = [
  { num: '01', title: 'Capture every score accurately', desc: 'Teachers enter CA and exam scores against the right student and subject, automatically weighted.' },
  { num: '02', title: 'Review and approve', desc: 'Results move through an approval workflow — teacher, department head, then administrator.' },
  { num: '03', title: 'Publish instantly', desc: 'Approved results appear in student and parent portals — no printing, no waiting.' },
];

const subjects = [
  { name: 'Mathematics', students: '124 students', pct: 78 },
  { name: 'English Language', students: '124 students', pct: 84 },
  { name: 'Basic Science', students: '124 students', pct: 71 },
];

export function HomePage({ onNavigateToDashboard }: HomePageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const stackRef = React.useRef<HTMLDivElement>(null);
  const tiltRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const revealEls = document.querySelectorAll('.ps-reveal');
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ps-in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      io = observer;
      revealEls.forEach((el) => observer.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('ps-in'));
    }
    return () => revealEls.forEach((el) => io?.unobserve(el));
  }, []);

  const handleStackMouseMove = (e: React.MouseEvent) => {
    if (!stackRef.current || !tiltRef.current) return;
    const r = stackRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tiltRef.current.style.transform = `rotate(${x * 4}deg) translate(${x * 10}px,${y * 10}px)`;
  };

  const handleStackMouseLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = 'rotate(0deg) translate(0,0)';
  };

  return (
    <div className="ps-home">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,450;0,9..144,560;0,9..144,620;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .ps-home { --bg:#faf9f5; --surface:#fff; --surface-2:#f3f1ea; --line:#e6e2d8; --line-strong:#d5cfc0; --ink:#15161a; --ink-dim:#5b5c63; --ink-faint:#9b9a94; --red:#e31e24; --gold:#f7c93c; --orange:#f7931e; --pink:#e8286e; --purple:#8e1fa0; background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden; min-height:100vh; }
        .ps-home * { box-sizing:border-box; }
        .ps-home a { color:inherit; text-decoration:none; }
        .ps-wrap { max-width:1180px; margin:0 auto; padding:0 32px; }
        @media(max-width:700px){ .ps-wrap{ padding:0 20px; } }
        .ps-reveal { opacity:0; transform:translateY(20px); transition:opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
        .ps-reveal.ps-in { opacity:1; transform:translateY(0); }
        @keyframes ps-floatA { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-30px,40px) scale(1.08);} }
        @keyframes ps-floatB { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(40px,-20px) scale(1.06);} }
        @keyframes ps-floatCard { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
        .ps-blob { position:absolute; border-radius:50%; filter:blur(70px); opacity:.55; z-index:0; }
        .ps-blob-a { width:420px; height:420px; background:radial-gradient(circle,#fbe6ee 0%,transparent 72%); top:-140px; right:-60px; animation:ps-floatA 24s ease-in-out infinite; }
        .ps-blob-b { width:360px; height:360px; background:radial-gradient(circle,#fdecd0 0%,transparent 72%); bottom:-120px; left:18%; animation:ps-floatB 28s ease-in-out infinite; }
        .ps-card-front-anim { animation:ps-floatCard 6s ease-in-out infinite; }
        .ps-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-faint); display:inline-flex; align-items:center; margin-bottom:26px; border:1px solid var(--line-strong); border-radius:20px; padding:7px 14px; }
        .ps-eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--red); margin-right:9px; }
        .ps-h1 { font-family:'Fraunces',serif; font-weight:560; font-size:clamp(36px,4.6vw,54px); line-height:1.08; letter-spacing:-.01em; }
        .ps-h1 em { font-style:italic; font-weight:500; color:var(--red); }
        .ps-section-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-faint); margin-bottom:16px; }
        .ps-h2 { font-family:'Fraunces',serif; font-weight:560; font-size:clamp(28px,3.4vw,38px); letter-spacing:-.01em; }
        .ps-fc-icon { width:44px; height:44px; border-radius:11px; background:var(--ink); display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
        .ps-feature-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:26px 24px; transition:box-shadow .25s ease, transform .25s ease, border-color .25s ease; }
        .ps-feature-card:hover { transform:translateY(-4px); box-shadow:0 20px 42px -20px rgba(20,20,20,.18); border-color:var(--line-strong); }
        .ps-feature-card b { display:block; font-family:'Fraunces',serif; font-weight:600; font-size:17px; margin-bottom:8px; }
        .ps-feature-card span { font-size:13.5px; color:var(--ink-dim); line-height:1.6; }
        .ps-skel { height:9px; border-radius:5px; background:var(--surface-2); margin-bottom:9px; }
        .ps-student-row { display:flex; align-items:center; padding:7px 0; border-bottom:1px solid var(--surface-2); }
        .ps-avatar { width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg,var(--orange),var(--pink)); flex-shrink:0; }
        .ps-bars { display:flex; align-items:flex-end; height:64px; margin-top:12px; }
        .ps-bars > * + * { margin-left:7px; }
        .ps-bars i { flex:1; border-radius:4px 4px 0 0; background:linear-gradient(180deg,var(--pink),var(--orange)); opacity:.85; }
        .ps-btn { font-size:13.5px; font-weight:600; padding:11px 20px; border-radius:6px; display:inline-flex; align-items:center; transition:transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease; cursor:pointer; border:none; }
        .ps-btn-solid { background:var(--red); color:#fff; }
        .ps-btn-solid:hover { transform:translateY(-1px); box-shadow:0 12px 26px -10px rgba(227,30,36,.5); background:#cf1a1f; }
        .ps-btn-ghost { color:var(--ink); border:1px solid var(--line-strong); background:transparent; }
        .ps-btn-ghost:hover { border-color:var(--ink); }
        .ps-nav-link { position:relative; font-size:13.5px; color:var(--ink-dim); font-weight:500; padding-bottom:3px; transition:color .18s ease; }
        .ps-nav-link::after { content:''; position:absolute; left:0; right:0; bottom:0; height:1px; background:var(--red); transform:scaleX(0); transform-origin:right; transition:transform .28s cubic-bezier(.2,.7,.2,1); }
        .ps-nav-link:hover { color:var(--ink); }
        .ps-nav-link:hover::after { transform:scaleX(1); transform-origin:left; }
        .ps-live-tag .d { width:6px; height:6px; border-radius:50%; background:#2fae66; box-shadow:0 0 0 3px rgba(47,174,102,.15); }
        .ps-footer-status .d { width:6px; height:6px; border-radius:50%; background:#2fae66; box-shadow:0 0 0 3px rgba(47,174,102,.15); }
        .ps-home :focus-visible { outline:2px solid var(--red); outline-offset:2px; }
        @media(max-width:980px){ .ps-hero-left,.ps-hero-right{ width:100% !important; margin-left:0 !important; } .ps-hero-right{ margin-top:40px !important; } .ps-showcase-inner{ flex-direction:column !important; } .ps-showcase-right,.ps-showcase-left{ width:100% !important; margin-right:0 !important; } .ps-showcase-right{ margin-bottom:40px !important; } }
        @media(max-width:820px){ .ps-trust-inner{ flex-direction:column !important; } .ps-trust-item{ width:100% !important; margin-top:18px !important; border-left:none !important; border-top:1px solid var(--line) !important; padding-top:18px !important; } .ps-trust-item:first-child{ border-top:none !important; margin-top:0 !important; } .ps-feature-card{ width:calc(50% - 20px) !important; } .ps-mobile-toggle{ display:flex !important; } .ps-desktop-nav{ display:none !important; } }
        @media(max-width:560px){ .ps-feature-card{ width:calc(100% - 20px) !important; } }
        @media(max-width:700px){ .ps-wrap{ padding:0 20px; } }
        @media(prefers-reduced-motion:reduce){ .ps-home *{ animation-duration:.001ms !important; transition-duration:.001ms !important; } }
      `}</style>

      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:60, background:'rgba(250,249,245,.86)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--line)' }}>
        <div className="ps-wrap" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'78px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Logo size={32} />
            <div style={{ fontFamily:'Fraunces,serif', fontWeight:600, fontSize:'19px' }}>
              Pisairtel<span style={{ color:'var(--red)', fontWeight:700, fontSize:'11px', letterSpacing:'.06em', verticalAlign:'middle', marginLeft:'2px' }}>SCHOOLS</span>
            </div>
          </div>
          <div className="ps-desktop-nav" style={{ display:'flex', alignItems:'center', gap:'30px' }}>
            <a className="ps-nav-link" href="#features">Features</a>
            <a className="ps-nav-link" href="#showcase">How it works</a>
            <a className="ps-nav-link" href="#" onClick={onNavigateToDashboard}>Pricing</a>
            <a className="ps-nav-link" href="#" onClick={onNavigateToDashboard}>Support</a>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <button className="ps-btn ps-btn-ghost" onClick={onNavigateToDashboard}>Sign in</button>
              <button className="ps-btn ps-btn-solid" onClick={onNavigateToDashboard}>Get started</button>
            </div>
          </div>
          <button className="ps-mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ padding:'8px', background:'none', border:'none', cursor:'pointer', display:'none' }}>
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <div style={{ borderTop:'1px solid var(--line)', padding:'16px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
            <a href="#features" className="ps-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
            <a href="#showcase" className="ps-nav-link" onClick={() => setIsMobileMenuOpen(false)}>How it works</a>
            <a href="#" className="ps-nav-link" onClick={(e) => { e.preventDefault(); onNavigateToDashboard(); }}>Pricing</a>
            <a href="#" className="ps-nav-link" onClick={(e) => { e.preventDefault(); onNavigateToDashboard(); }}>Support</a>
            <button className="ps-btn ps-btn-solid" style={{ width:'100%', justifyContent:'center' }} onClick={onNavigateToDashboard}>Get started</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section style={{ position:'relative', padding:'88px 0 40px', overflow:'hidden' }}>
        <div className="ps-blob ps-blob-a" />
        <div className="ps-blob ps-blob-b" />
        <div className="ps-wrap" style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center' }}>
          <div className="ps-hero-left" style={{ width:'52%' }}>
            <div className="ps-eyebrow ps-reveal ps-in">Pisairtel Schools · School Management</div>
            <h1 className="ps-h1 ps-reveal ps-in">From admissions to results,<br />run it all <em>in one place</em>.</h1>
            <p className="ps-reveal ps-in" style={{ marginTop:'22px', fontSize:'16.5px', lineHeight:1.65, color:'var(--ink-dim)', maxWidth:'460px' }}>
              Enrollment, attendance, results, fees, and communication — one connected system built for how schools actually run, from first inquiry to final transcript.
            </p>
            <div className="ps-reveal ps-in" style={{ marginTop:'32px', display:'flex', flexWrap:'wrap', gap:'14px' }}>
              <button className="ps-btn ps-btn-solid" style={{ padding:'14px 24px', fontSize:'14.5px' }} onClick={onNavigateToDashboard}>
                <span>Start free trial</span>
                <ArrowRight size={15} style={{ marginLeft:'7px' }} />
              </button>
              <a className="ps-btn ps-btn-ghost" href="#showcase" style={{ padding:'14px 24px', fontSize:'14.5px' }}>See how it works</a>
            </div>
            <div className="ps-reveal ps-in" style={{ marginTop:'44px', display:'flex', gap:'36px' }}>
              <div style={{ fontSize:'12px', color:'var(--ink-faint)', fontFamily:'JetBrains Mono,monospace' }}>
                <b style={{ display:'block', fontFamily:'Fraunces,serif', fontSize:'22px', color:'var(--ink)', fontWeight:600, marginBottom:'3px' }}>1</b>
                Record per student
              </div>
              <div style={{ fontSize:'12px', color:'var(--ink-faint)', fontFamily:'JetBrains Mono,monospace' }}>
                <b style={{ display:'block', fontFamily:'Fraunces,serif', fontSize:'22px', color:'var(--ink)', fontWeight:600, marginBottom:'3px' }}>Live</b>
                Results &amp; attendance
              </div>
              <div style={{ fontSize:'12px', color:'var(--ink-faint)', fontFamily:'JetBrains Mono,monospace' }}>
                <b style={{ display:'block', fontFamily:'Fraunces,serif', fontSize:'22px', color:'var(--ink)', fontWeight:600, marginBottom:'3px' }}>All</b>
                Classes, one login
              </div>
            </div>
          </div>

          <div className="ps-hero-right" style={{ width:'48%', marginLeft:'40px' }}>
            <div className="ps-reveal ps-in" ref={stackRef} style={{ position:'relative', height:'400px' }} onMouseMove={handleStackMouseMove} onMouseLeave={handleStackMouseLeave}>
              <div ref={tiltRef} style={{ position:'absolute', inset:0, transition:'transform .15s ease-out' }}>
                {/* Card back */}
                <div style={{ position:'absolute', width:'320px', top:'60px', left:'10px', transform:'rotate(-6deg)', height:'220px', borderRadius:'16px', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -22px rgba(20,20,20,.22)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:'1px solid var(--line)' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                    </div>
                  </div>
                  <div style={{ padding:'16px' }}>
                    <div className="ps-skel" style={{ width:'60%' }} />
                    <div className="ps-skel" style={{ width:'85%' }} />
                    <div className="ps-skel" style={{ width:'40%' }} />
                  </div>
                </div>
                {/* Card mid */}
                <div style={{ position:'absolute', width:'320px', top:'34px', left:'76px', transform:'rotate(4deg)', height:'220px', borderRadius:'16px', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -22px rgba(20,20,20,.22)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:'1px solid var(--line)' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                    </div>
                  </div>
                  <div style={{ padding:'16px' }}>
                    {[0,1,2].map((i) => (
                      <div key={i} className="ps-student-row">
                        <div className="ps-avatar" style={{ marginRight:'10px' }} />
                        <div style={{ flex:1 }}>
                          <div className="ps-skel" style={{ width:['70%','55%','65%'][i], marginBottom:'5px' }} />
                          <div className="ps-skel" style={{ width:['40%','35%','30%'][i], height:'6px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Card front */}
                <div className="ps-card-front-anim" style={{ position:'absolute', width:'320px', top:'82px', left:'36px', height:'236px', zIndex:3, borderRadius:'16px', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -22px rgba(20,20,20,.22)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:'1px solid var(--line)' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--line-strong)' }} />
                    </div>
                    <div className="ps-live-tag" style={{ display:'flex', alignItems:'center', gap:'6px', fontFamily:'JetBrains Mono,monospace', fontSize:'10px', color:'var(--ink-faint)' }}>
                      <span className="d" />
                      <span>SMS · live</span>
                    </div>
                  </div>
                  <div style={{ padding:'16px' }}>
                    <div className="ps-skel" style={{ width:'45%' }} />
                    <div className="ps-skel" style={{ width:'75%' }} />
                    <div className="ps-bars">
                      {[60,75,52,88,65,80,70].map((h, i) => (
                        <i key={i} style={{ height:`${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)', padding:'32px 0', marginTop:'20px' }}>
        <div className="ps-wrap ps-trust-inner" style={{ display:'flex', flexDirection:'row' }}>
          {trustItems.map((item, i) => (
            <div key={i} className="ps-reveal ps-trust-item" style={{ width:'25%', padding:'0 24px', display:'flex', alignItems:'flex-start', gap:'12px', borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <item.icon size={16} color="#15161a" strokeWidth={1.8} />
              </div>
              <div>
                <b style={{ display:'block', fontSize:'13.5px', fontWeight:600, marginBottom:'2px' }}>{item.title}</b>
                <span style={{ fontSize:'12.5px', color:'var(--ink-dim)', lineHeight:1.5 }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding:'88px 0' }}>
        <div className="ps-wrap">
          <div className="ps-reveal" style={{ maxWidth:560, marginBottom:48 }}>
            <div className="ps-section-eyebrow">Everything in one place</div>
            <h2 className="ps-h2">Six tools, one school.</h2>
            <p style={{ marginTop:14, fontSize:15, color:'var(--ink-dim)', lineHeight:1.6 }}>
              Each piece works on its own, and even better together — all sharing the same student record.
            </p>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', marginLeft:-10, marginRight:-10 }}>
            {features.map((f, i) => (
              <div key={i} className="ps-feature-card ps-reveal" style={{ width:'calc((100% / 3) - 20px)', margin:10 }}>
                <div className="ps-fc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {featureIcons[f.icon]}
                  </svg>
                </div>
                <b>{f.title}</b>
                <span>{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section id="showcase" style={{ background:'var(--surface-2)', padding:'88px 0' }}>
        <div className="ps-wrap ps-showcase-inner" style={{ display:'flex', alignItems:'center' }}>
          <div className="ps-reveal ps-showcase-right" style={{ width:'56%', marginRight:'56px' }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:20, padding:20, boxShadow:'0 30px 70px -30px rgba(20,20,20,.2)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid var(--line)', marginBottom:16 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontWeight:600, fontSize:15 }}>Term average by subject</div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--ink-faint)' }}>JSS2 · THIS TERM</div>
              </div>
              {subjects.map((s, i) => (
                <div key={i} style={{ padding:'12px 0', borderBottom: i < subjects.length - 1 ? '1px solid var(--surface-2)' : 'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'13.5px', fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:'11.5px', color:'var(--ink-faint)' }}>{s.students}</div>
                    </div>
                    <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:'var(--ink)' }}>{s.pct}%</div>
                  </div>
                  <div style={{ height:5, background:'var(--surface-2)', borderRadius:3, marginTop:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,var(--orange),var(--pink))', width:`${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ps-reveal ps-showcase-left" style={{ width:'44%' }}>
            <div className="ps-section-eyebrow">How it works</div>
            <h2 style={{ fontFamily:'Fraunces,serif', fontWeight:560, fontSize:'clamp(26px,3vw,32px)', letterSpacing:'-.01em', marginBottom:26 }}>From CA score to published result.</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
              {showcaseSteps.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:16 }}>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--red)', flexShrink:0, paddingTop:2 }}>{s.num}</div>
                  <div>
                    <b style={{ display:'block', fontSize:15, marginBottom:4 }}>{s.title}</b>
                    <span style={{ fontSize:'13.5px', color:'var(--ink-dim)', lineHeight:1.6 }}>{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section style={{ padding:'100px 0', textAlign:'center' }}>
        <div className="ps-wrap">
          <div className="ps-reveal" style={{ fontFamily:'Fraunces,serif', fontSize:64, color:'var(--red)', opacity:.9, lineHeight:.6 }}>“</div>
          <div className="ps-reveal" style={{ fontFamily:'Fraunces,serif', fontWeight:560, fontSize:'clamp(24px,3vw,34px)', lineHeight:1.35, maxWidth:760, margin:'14px auto 0', letterSpacing:'-.005em' }}>
            Built on the belief that running a school well shouldn't require a dozen disconnected tools — one accurate student record should be enough.
          </div>
          <div className="ps-reveal" style={{ marginTop:28, fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--ink-faint)', letterSpacing:'.05em' }}>
            PISAIRTEL SCHOOLS · PRODUCT PRINCIPLES
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ position:'relative', background:'var(--ink)', color:'#fff', padding:'90px 0', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(500px 320px at 15% 20%, rgba(232,40,110,.32), transparent 60%), radial-gradient(500px 320px at 85% 80%, rgba(247,147,30,.24), transparent 60%)' }} />
        <div className="ps-wrap" style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
          <div>
            <h2 style={{ fontFamily:'Fraunces,serif', fontWeight:560, fontSize:'clamp(28px,3.6vw,42px)', maxWidth:520, letterSpacing:'-.01em' }}>
              Ready to bring your <em style={{ fontStyle:'italic', fontWeight:500, color:'var(--gold)' }}>whole school</em> online?
            </h2>
            <p style={{ marginTop:14, fontSize:'14.5px', color:'rgba(255,255,255,.6)', maxWidth:460 }}>
              Start with your student directory today — attendance, results, and fees are ready when you are.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:20 }}>
              <button className="ps-btn ps-btn-solid" style={{ padding:'14px 24px', fontSize:'14.5px' }} onClick={onNavigateToDashboard}>Start free trial</button>
              <button className="ps-btn ps-btn-ghost" style={{ padding:'14px 24px', fontSize:'14.5px', borderColor:'rgba(255,255,255,.25)', color:'#fff' }} onClick={onNavigateToDashboard}>Talk to us</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'48px 0 40px' }}>
        <div className="ps-wrap">
          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', paddingBottom:36, borderBottom:'1px solid var(--line)' }}>
            <div style={{ maxWidth:280, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <Logo size={28} />
                <div style={{ fontFamily:'Fraunces,serif', fontWeight:600, fontSize:'19px' }}>
                  Pisairtel<span style={{ color:'var(--red)', fontWeight:700, fontSize:'11px', letterSpacing:'.06em', verticalAlign:'middle', marginLeft:'2px' }}>SCHOOLS</span>
                </div>
              </div>
              <p style={{ fontSize:13, color:'var(--ink-dim)', maxWidth:260, lineHeight:1.6 }}>
                School management software from the Pisairtel family — the same account works across every Pisairtel product.
              </p>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:56 }}>
              <div>
                <b style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:'.1em', color:'var(--ink-faint)', marginBottom:14 }}>PRODUCT</b>
                <a href="#features" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Features</a>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Pricing</a>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Security</a>
              </div>
              <div>
                <b style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:'.1em', color:'var(--ink-faint)', marginBottom:14 }}>COMPANY</b>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>About Pisairtel</a>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Contact</a>
              </div>
              <div>
                <b style={{ display:'block', fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:'.1em', color:'var(--ink-faint)', marginBottom:14 }}>RESOURCES</b>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Help center</a>
                <a href="#" style={{ display:'block', fontSize:13.5, color:'var(--ink-dim)', marginBottom:10 }}>Status</a>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', paddingTop:24 }}>
            <div className="ps-footer-status" style={{ display:'flex', alignItems:'center', gap:8, fontSize:'12.5px', color:'var(--ink-dim)', fontFamily:'JetBrains Mono,monospace' }}>
              <span className="d" />
              <span>All systems operational · © 2026 Pisairtel Technologies</span>
            </div>
            <div style={{ display:'flex', gap:20 }}>
              <a href="#" style={{ fontSize:12.5, color:'var(--ink-faint)' }}>Privacy</a>
              <a href="#" style={{ fontSize:12.5, color:'var(--ink-faint)' }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
