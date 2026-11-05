import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import {Trophy,Wallet,Users,ShoppingBag,Gamepad2,ShieldCheck,Zap,Menu,X,Medal,Play,ChevronRight,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Footprints,Target,RotateCcw,Music2,ExternalLink} from 'lucide-react';
import './style.css';

function makePlayer(color, number=9) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color,roughness:.65});
  const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(.48,.82,5,10),mat);
  shirt.position.y=1.12; shirt.castShadow=true; g.add(shirt);
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(.72,.38,.48),new THREE.MeshStandardMaterial({color:'#101b2a'}));
  shorts.position.y=.53; g.add(shorts);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.27,16,12),new THREE.MeshStandardMaterial({color:'#b87950'}));
  head.position.y=1.88; g.add(head);
  for (const x of [-.2,.2]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.11,.48,4,8),new THREE.MeshStandardMaterial({color:'#dce7ef'}));
    leg.position.set(x,.15,0); g.add(leg);
  }
  const badge = new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.025),new THREE.MeshBasicMaterial({color:'#ffffff'}));
  badge.position.set(0,1.22,-.49); g.add(badge);
  return g;
}

function Match3D({onGoal,onEnd,matchActive,setMatchActive}) {
  const hostRef=useRef(null), apiRef=useRef(null);
  const [seconds,setSeconds]=useState(90),[score,setScore]=useState([0,0]),[toast,setToast]=useState(''),[keys,setKeys]=useState({});
  const [touch,setTouch]=useState({});
  const [started,setStarted]=useState(false);
  useEffect(()=>{
    const host=hostRef.current; if(!host)return;
    const scene=new THREE.Scene(); scene.background=new THREE.Color('#071522'); scene.fog=new THREE.Fog('#071522',35,90);
    const camera=new THREE.PerspectiveCamera(52,host.clientWidth/host.clientHeight,.1,120);
    camera.position.set(0,13,24); camera.lookAt(0,0,2);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.setSize(host.clientWidth,host.clientHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xd9efff,0x18351f,2.0));
    const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(-10,22,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
    const grass=new THREE.Mesh(new THREE.PlaneGeometry(28,48),new THREE.MeshStandardMaterial({color:'#16723e',roughness:1})); grass.rotation.x=-Math.PI/2; grass.receiveShadow=true; scene.add(grass);
    for(let i=0;i<12;i++){let m=new THREE.Mesh(new THREE.PlaneGeometry(28,4),new THREE.MeshStandardMaterial({color:i%2?'#1a8248':'#14713d'}));m.rotation.x=-Math.PI/2;m.position.set(0,.008,-22+i*4);scene.add(m);}
    const white=new THREE.MeshBasicMaterial({color:'#eaffef'});
    function line(x1,z1,x2,z2,w=.075){let dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);let m=new THREE.Mesh(new THREE.BoxGeometry(w,.025,len),white);m.position.set((x1+x2)/2,.035,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);scene.add(m);}
    line(-13,-23,13,-23);line(13,-23,13,23);line(13,23,-13,23);line(-13,23,-13,-23);line(-13,0,13,0);
    let c=new THREE.Mesh(new THREE.TorusGeometry(3,.055,8,64),white);c.rotation.x=Math.PI/2;c.position.y=.04;scene.add(c);
    function box(x,z,w,d){let m=new THREE.Mesh(new THREE.BoxGeometry(w,.03,d),white);m.position.set(x,.04,z);scene.add(m);}
    box(0,-17,16,0.08);box(0,17,16,.08);box(-4,-19,0.08,8);box(4,-19,.08,8);box(-4,19,.08,8);box(4,19,.08,8);
    // goals, posts and net
    const goalGroup=new THREE.Group(), metal=new THREE.MeshStandardMaterial({color:'#e9f5ff',metalness:.45,roughness:.25});
    for(const x of [-3.5,3.5]){let p=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,2.3,12),metal);p.position.set(x,1.15,-22.5);goalGroup.add(p);}
    let cross=new THREE.Mesh(new THREE.BoxGeometry(7.1,.18,.18),metal);cross.position.set(0,2.3,-22.5);goalGroup.add(cross);
    let net=new THREE.Mesh(new THREE.BoxGeometry(7,2.2,1.1),new THREE.MeshBasicMaterial({color:'#cde9ff',wireframe:true,transparent:true,opacity:.3}));net.position.set(0,1.1,-23);goalGroup.add(net);scene.add(goalGroup);
    const player=makePlayer('#28a8ff');player.position.set(0,0,12);scene.add(player);
    const mate=makePlayer('#28a8ff');mate.scale.setScalar(.85);mate.position.set(-5,0,5);scene.add(mate);
    const defender=makePlayer('#f0f3f5');defender.scale.setScalar(.92);defender.position.set(2,0,-6);scene.add(defender);
    const keeper=makePlayer('#f5bd38');keeper.scale.setScalar(1.05);keeper.position.set(0,0,-19.6);scene.add(keeper);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,24,18),new THREE.MeshStandardMaterial({color:'#f8fbff',roughness:.32}));ball.position.set(0,.4,10.9);ball.castShadow=true;scene.add(ball);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.43,24),new THREE.MeshBasicMaterial({color:'#06120a',transparent:true,opacity:.35}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;scene.add(shadow);
    const velocity=new THREE.Vector3(0,0,0);let active=true, elapsed=0, last=performance.now(), scoreLocal=[0,0], goalCooldown=0, timer=90, ended=false;
    const state={player,ball,velocity,scene,camera,renderer,keeper,mate,defender,started:false};
    apiRef.current={start:()=>{active=true;state.started=true;setStarted(true);setMatchActive(true);setToast('Kick-off! Move with WASD or the touch pad.');},pause:()=>{active=false;},reset:()=>{scoreLocal=[0,0];setScore([0,0]);timer=90;setSeconds(90);ended=false;player.position.set(0,0,12);ball.position.set(0,.4,10.9);velocity.set(0,0,0);active=true;state.started=true;setStarted(true);setMatchActive(true);}};
    const onKeyDown=e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();setKeys(v=>({...v,[k]:true}));};
    const onKeyUp=e=>setKeys(v=>({...v,[e.key.toLowerCase()]:false}));
    window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
    const resize=()=>{if(!host.clientWidth)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);};window.addEventListener('resize',resize);
    let raf;
    const animate=now=>{
      raf=requestAnimationFrame(animate);let dt=Math.min((now-last)/1000,.04);last=now;
      if(active && state.started && !ended){
        elapsed+=dt;timer=Math.max(0,90-Math.floor(elapsed));if(Math.floor(elapsed)!==Math.floor(elapsed-dt)){setSeconds(timer);}
        const k=window.__pefKeys||{},t=window.__pefTouch||{};
        const forward=(k.w||k.arrowup||t.up?1:0)-(k.s||k.arrowdown||t.down?1:0);
        const side=(k.d||k.arrowright||t.right?1:0)-(k.a||k.arrowleft||t.left?1:0);
        const dir=new THREE.Vector3(side,0,-forward);if(dir.length()>0)dir.normalize();
        player.position.x=THREE.MathUtils.clamp(player.position.x+dir.x*dt*8,-12,12);
        player.position.z=THREE.MathUtils.clamp(player.position.z+dir.z*dt*8,-21,21);
        if(dir.length()>.1)player.rotation.y=Math.atan2(dir.x,dir.z);
        const dist=player.position.distanceTo(new THREE.Vector3(ball.position.x,0,ball.position.z));
        // Ball control when close to player
        if(dist<1.35 && velocity.length()<5){ball.position.x=player.position.x+Math.sin(player.rotation.y)*.8;ball.position.z=player.position.z-Math.cos(player.rotation.y)*.8;}
        const pass=k.e||t.pass, shoot=k[' ']||k.q||t.shoot;
        if(pass && !state.passLatch && dist<2.1){velocity.set(-3,1.5,-12);state.passLatch=true;setToast('Pass played!');}
        if(!pass)state.passLatch=false;
        if(shoot && !state.shootLatch && dist<2.2){velocity.set((0-player.position.x)*.25,4,-21);state.shootLatch=true;setToast('Shot on goal!');}
        if(!shoot)state.shootLatch=false;
        // goalkeeper tracks ball horizontally and dives toward shots
        const targetX=THREE.MathUtils.clamp(ball.position.x,-2.8,2.8);
        keeper.position.x+=(targetX-keeper.position.x)*Math.min(1,dt*3.8);
        // opponent closes toward ball
        defender.position.x+=(ball.position.x-defender.position.x)*dt*.3;
        defender.position.z+=(ball.position.z+4-defender.position.z)*dt*.18;
        velocity.y-=9.8*dt;ball.position.addScaledVector(velocity,dt);
        if(ball.position.y<.38){ball.position.y=.38;velocity.y=Math.abs(velocity.y)*.38;if(Math.abs(velocity.y)<.7)velocity.y=0;velocity.x*=.985;velocity.z*=.985;}
        if(ball.position.x>13||ball.position.x< -13){velocity.x*=-.7;ball.position.x=THREE.MathUtils.clamp(ball.position.x,-13,13);}
        if(ball.position.z>23){velocity.z*=-.7;ball.position.z=22.7;}
        // goalkeeper save / goal
        if(ball.position.z < -18.7 && Math.abs(ball.position.x-keeper.position.x)<1.25 && Math.abs(ball.position.x)<3.7){velocity.z=Math.abs(velocity.z)*.65;velocity.x+=(ball.position.x-keeper.position.x)*2;ball.position.z=-18.4;setToast('Saved by the goalkeeper!');}
        if(ball.position.z < -23 && Math.abs(ball.position.x)<3.6 && goalCooldown<=0){
          scoreLocal[0]++;setScore([...scoreLocal]);onGoal?.();goalCooldown=2;setToast('GOAL! + XP earned');ball.position.set(0,.4,10);velocity.set(0,0,0);
        }
        if(goalCooldown>0)goalCooldown-=dt;
        shadow.position.x=ball.position.x;shadow.position.z=ball.position.z;
        ball.rotation.x+=velocity.z*dt;ball.rotation.z-=velocity.x*dt;
        camera.position.x+=(player.position.x*.35-camera.position.x)*dt*2;camera.position.z+=(player.position.z+13-camera.position.z)*dt*1.4;camera.lookAt(player.position.x*.25,0,player.position.z-8);
        if(timer<=0&&!ended){ended=true;active=false;setMatchActive(false);onEnd?.(scoreLocal[0]);setToast(scoreLocal[0]>0?'Full time! Match completed.':'Full time! Keep practicing.');}
      }
      renderer.render(scene,camera);
    };raf=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('resize',resize);renderer.dispose();if(host.contains(renderer.domElement))host.removeChild(renderer.domElement);};
  },[]);
  useEffect(()=>{window.__pefKeys=keys;},[keys]);useEffect(()=>{window.__pefTouch=touch;},[touch]);
  const hold=(key,val)=>setTouch(v=>({...v,[key]:val}));
  return <div className="game-wrap">
    <div className="game-hud"><div><small>HOME</small><b>{score[0]} <i>:</i> {score[1]}</b><small>AWAY</small></div><div className="timer">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div><div className="match-state"><span className="live-dot"/> {matchActive?'LIVE MATCH':'TRAINING ARENA'}</div></div>
    <div className="game-canvas" ref={hostRef}><div className="game-toast">{toast||'WASD / ARROWS to move · SPACE to shoot · E to pass'}</div></div>
    <div className="game-controls">
      <div className="dpad">
       <button onPointerDown={()=>hold('up',true)} onPointerUp={()=>hold('up',false)} onPointerLeave={()=>hold('up',false)}><ArrowUp/></button>
       <div><button onPointerDown={()=>hold('left',true)} onPointerUp={()=>hold('left',false)} onPointerLeave={()=>hold('left',false)}><ArrowLeft/></button><button onPointerDown={()=>hold('down',true)} onPointerUp={()=>hold('down',false)} onPointerLeave={()=>hold('down',false)}><ArrowDown/></button><button onPointerDown={()=>hold('right',true)} onPointerUp={()=>hold('right',false)} onPointerLeave={()=>hold('right',false)}><ArrowRight/></button></div>
      </div>
      <div className="action-pad"><button className="pass-btn" onPointerDown={()=>hold('pass',true)} onPointerUp={()=>hold('pass',false)} onPointerLeave={()=>hold('pass',false)}>PASS <Footprints size={17}/></button><button className="shoot-btn" onPointerDown={()=>hold('shoot',true)} onPointerUp={()=>hold('shoot',false)} onPointerLeave={()=>hold('shoot',false)}>SHOOT <Target size={20}/></button></div>
    </div>
    <div className="game-bottom"><span>Desktop: WASD / arrows · E pass · Space shoot</span><button onClick={()=>apiRef.current?.reset()}><RotateCcw size={14}/> Restart match</button><button className="start-btn" onClick={()=>apiRef.current?.start()}><Play size={14}/> {started?'Resume':'Kick off'}</button></div>
  </div>
}

function MusicPanel(){
 const playlists=[
  {title:'This Is Imagine Dragons',detail:'Artist essentials and biggest tracks',url:'https://open.spotify.com/search/This%20Is%20Imagine%20Dragons/playlists'},
  {title:'Imagine Dragons — Radio',detail:'A mix built around the band’s sound',url:'https://open.spotify.com/search/Imagine%20Dragons%20Radio'},
  {title:'Imagine Dragons on YouTube Music',detail:'Find official tracks, albums and mixes',url:'https://music.youtube.com/search?q=Imagine%20Dragons%20playlist'}
 ];
 return <div className="panel music-panel"><div className="panel-title"><Music2 size={18}/> MATCHDAY MUSIC</div><p className="muted">Fuel your next match with Imagine Dragons. Open an official streaming service to play music; tracks are not hosted by PlayEarn Football.</p>{playlists.map(item=><a className="music-link" href={item.url} target="_blank" rel="noreferrer" key={item.title}><span><b>{item.title}</b><small>{item.detail}</small></span><ExternalLink size={15}/></a>)}<small className="muted">Streaming availability and playlist contents depend on your music service and region.</small></div>
}

function RevenuePanel(){
 const [token,setToken]=useState(''),[data,setData]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function load(){setBusy(true);setMsg('');try{const r=await fetch('/api/admin/summary',{headers:{authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load revenue summary');setData(d);}catch(e){setMsg(e.message);}finally{setBusy(false);}}
 async function evaluate(){setBusy(true);setMsg('');try{const r=await fetch('/api/admin/payout/evaluate',{method:'POST',headers:{authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Evaluation failed');setMsg(d.message);}catch(e){setMsg(e.message);}finally{setBusy(false);}}
 return <div className="panel revenue-panel"><div className="panel-title"><ShieldCheck size={18}/> REVENUE & PAYOUT CONTROL</div><div className="revenue-warning">SANDBOX SCAFFOLD · NO REAL MONEY MOVES</div><label className="admin-label">Admin API token</label><input className="admin-input" type="password" autoComplete="off" placeholder="Set PEF_ADMIN_TOKEN on server" value={token} onChange={e=>setToken(e.target.value)}/><button className="wide-button" disabled={busy||!token} onClick={load}>{busy?'LOADING…':'LOAD REVENUE SUMMARY'}</button>{data&&<><div className="revenue-metric"><small>Eligible settled balance</small><b>${data.eligibleBalanceUsd.toFixed(2)} USD</b></div><div className="revenue-line"><span>Settled gross</span><b>${data.grossSettledUsd.toFixed(2)}</b></div><div className="revenue-line"><span>Refunds / chargebacks</span><b>${data.refundsAndChargebacksUsd.toFixed(2)}</b></div><div className="revenue-line"><span>Reserves</span><b>${data.reservesUsd.toFixed(2)}</b></div><div className="revenue-line"><span>Payout threshold</span><b>$50.00 USD</b></div><div className="revenue-line"><span>Destination</span><b>{data.destination.slice(0,8)}…{data.destination.slice(-6)}</b></div><div className="revenue-line"><span>Network / asset</span><b>Arbitrum One · ETH</b></div><button className="wide-button" disabled={busy} onClick={evaluate}>EVALUATE PAYOUT (DRY RUN)</button></>}{msg&&<p className="revenue-message">{msg}</p>}<small className="muted">Website checkout and Google Play Billing adapters are not connected. Payout evaluation never converts or transfers funds.</small></div>
}

function App(){
 const [xp,setXp]=useState(()=>Number(localStorage.getItem('pef-xp')||2480));
 const [matches,setMatches]=useState(()=>Number(localStorage.getItem('pef-matches')||12));
 const [active,setActive]=useState('Home'),[notice,setNotice]=useState(''),[matchActive,setMatchActive]=useState(false),[mobileMenu,setMobileMenu]=useState(false);
 useEffect(()=>{localStorage.setItem('pef-xp',xp);localStorage.setItem('pef-matches',matches)},[xp,matches]);
 const level=Math.floor(xp/1000)+1,progress=xp%1000;
 const nav=[['Home',Trophy],['Play',Gamepad2],['Leaderboard',Medal],['Rewards',Zap],['Community',Users],['Wallet',Wallet]];
 function select(n){setActive(n);setMobileMenu(false);setNotice(n==='Wallet'?'ETH on Arbitrum One is the planned payout asset; no real transactions are enabled yet.':n==='Rewards'?'Demo XP is not NEAR or cash. Testnet rewards will be enabled after server-side validation.':'');}
 function goal(){setXp(v=>v+20)}
 function endMatch(goals){setMatches(v=>v+1);setXp(v=>v+40+goals*20);setNotice(`Full time! ${goals} goals scored. Demo XP awarded for completing the match.`)}
 return <div className="app">
  <header className="topbar"><div className="brand"><div className="brand-ball">⚽</div><div><b>PLAYEARN <em>FOOTBALL</em></b><small>PLAY • COMPETE • LEVEL UP</small></div></div><button className="mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button><nav className={mobileMenu?'nav open':'nav'}>{nav.map(([n,I])=><button key={n} className={active===n?'selected':''} onClick={()=>select(n)}><I size={17}/>{n}</button>)}</nav><div className="profile"><div className="avatar">PF</div><div><b>Rookie Striker</b><small>Level {level} · {xp.toLocaleString()} XP</small></div></div></header>
  <main>
   <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> THE NEXT GENERATION FOOTBALL ARENA</div><h1>PLAY THE GAME.<br/><span>EARN YOUR LEGACY.</span></h1><p>Take control on the pitch. Pass, shoot, beat the keeper and build your player legacy.</p><div className="hero-actions"><button className="primary" onClick={()=>{setActive('Play');document.getElementById('match-arena')?.scrollIntoView({behavior:'smooth'})}}><Play size={17} fill="currentColor"/> PLAY A MATCH</button><button className="secondary" onClick={()=>select('Rewards')}>EXPLORE REWARDS <ChevronRight size={16}/></button></div><div className="mini-stats"><div><b>{matches}</b><small>MATCHES PLAYED</small></div><div><b>{xp.toLocaleString()}</b><small>TOTAL XP</small></div><div><b>{level}</b><small>PLAYER LEVEL</small></div></div></div><div className="hero-side"><div className="orb">⚽</div><div className="side-caption">YOUR PITCH. YOUR MOMENT.</div></div></section>
   <section className="dashboard-grid"><div className="main-column"><div className="section-heading" id="match-arena"><div><span className="eyebrow">ON THE PITCH</span><h2>Playable 3D Match Arena</h2></div><span className="pill">LIVE PROTOTYPE</span></div><Match3D matchActive={matchActive} setMatchActive={setMatchActive} onGoal={goal} onEnd={endMatch}/><div className="section-heading lower"><div><span className="eyebrow">CHOOSE YOUR CHALLENGE</span><h2>Coming Game Modes</h2></div></div><div className="mode-grid">{[['⚡','Quick Match','Playable training match.'],['🏆','Tournament','Compete for the top spot.'],['🎯','Daily Challenges','Complete objectives for bonus XP.']].map(([ico,title,desc])=><button className="mode-card" key={title} onClick={()=>setNotice(`${title} mode is planned for a future build.`)}><span>{ico}</span><b>{title}</b><small>{desc}</small><i>COMING NEXT <ChevronRight size={14}/></i></button>)}</div></div>
   <aside className="side-column"><div className="panel xp-panel"><div className="panel-title"><Zap size={18}/> PLAYER PROGRESS</div><div className="level-line"><div className="level-badge">{level}</div><div><b>Rising Star</b><small>Level {level} player</small></div><strong>{progress}/1,000 XP</strong></div><div className="progress"><span style={{width:`${progress/10}%`}}/></div><small className="muted">{1000-progress} XP to next level</small></div>
   <div className="panel"><div className="panel-title"><Wallet size={18}/> REWARD WALLET</div><div className="wallet-number">{xp.toLocaleString()} <small>XP</small></div><p className="muted">XP is a game progression score, not cryptocurrency or a cash balance.</p><div className="chain-row"><span className="near-icon">Ξ</span><div><b>ETH · Arbitrum One</b><small>Sandbox payout design only</small></div><span className="status">DISABLED</span></div><button className="wide-button" onClick={()=>select('Wallet')}>PAYOUT WALLET DETAILS <ChevronRight size={15}/></button></div>
   <MusicPanel/><RevenuePanel/><div className="panel"><div className="panel-title"><Trophy size={18}/> TOP PLAYERS</div>{[['01','GoalMachine','8,920'],['02','BlueComet','7,640'],['03','PitchLegend','6,210']].map(([r,n,s])=><div className="rank-row" key={r}><span>{r}</span><b>{n}</b><strong>{s} XP</strong></div>)}</div>
   <div className="panel community"><div className="panel-title"><Users size={18}/> COMMUNITY</div><b>Play together. Grow together.</b><p className="muted">Share match highlights and compete with the community.</p><button className="wide-button" onClick={()=>select('Community')}>EXPLORE COMMUNITY <ChevronRight size={15}/></button></div></aside></section>
   {notice&&<div className="notice"><ShieldCheck size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
  </main><footer><div className="brand small-brand"><div className="brand-ball">⚽</div><div><b>PLAYEARN <em>FOOTBALL</em></b><small>PLAY • COMPETE • LEVEL UP</small></div></div><span>© 2026 PlayEarn Football · Development build</span><span><ShieldCheck size={15}/> Arbitrum One payout scaffold</span></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
