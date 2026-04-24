/* ===== FLUID MOUSE BACKGROUND ===== */
(function(){
  const fc=document.getElementById('fluid-canvas');
  const ctx=fc.getContext('2d');
  let W,H;
  function resize(){W=fc.width=innerWidth;H=fc.height=innerHeight;}
  resize();addEventListener('resize',resize);
  let mx=W/2,my=H/2,tmx=W/2,tmy=H/2;
  document.addEventListener('mousemove',e=>{tmx=e.clientX;tmy=e.clientY;});
  const blobs=[];
  for(let i=0;i<6;i++){blobs.push({x:Math.random()*1000,y:Math.random()*700,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*160+80,phase:Math.random()*Math.PI*2,speed:Math.random()*.008+.004,hue:200+Math.random()*40});}
  const trail=[];let lastMx=0,lastMy=0;
  function draw(){
    requestAnimationFrame(draw);
    mx+=(tmx-mx)*.07;my+=(tmy-my)*.07;
    if(Math.abs(mx-lastMx)>1||Math.abs(my-lastMy)>1){trail.push({x:mx,y:my,life:1,r:Math.random()*70+40});if(trail.length>18)trail.shift();lastMx=mx;lastMy=my;}
    ctx.clearRect(0,0,W,H);
    for(const b of blobs){b.x+=b.vx;b.y+=b.vy;b.phase+=b.speed;if(b.x<-b.r)b.x=W+b.r;if(b.x>W+b.r)b.x=-b.r;if(b.y<-b.r)b.y=H+b.r;if(b.y>H+b.r)b.y=-b.r;const pulse=Math.sin(b.phase)*0.25+0.75;const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*pulse);g.addColorStop(0,`hsla(${b.hue},100%,60%,0.045)`);g.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(b.x,b.y,b.r*pulse,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}
    for(let i=0;i<trail.length;i++){const pt=trail[i];const alpha=(i/trail.length)*0.22;const g=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,pt.r);g.addColorStop(0,`rgba(56,130,246,${alpha})`);g.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}
    const mg=ctx.createRadialGradient(mx,my,0,mx,my,280);mg.addColorStop(0,'rgba(56,130,246,0.13)');mg.addColorStop(0.4,'rgba(56,100,220,0.06)');mg.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(mx,my,280,0,Math.PI*2);ctx.fillStyle=mg;ctx.fill();
    const mc=ctx.createRadialGradient(mx,my,0,mx,my,60);mc.addColorStop(0,'rgba(100,180,255,0.18)');mc.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(mx,my,60,0,Math.PI*2);ctx.fillStyle=mc;ctx.fill();
  }
  requestAnimationFrame(draw);
})();

/* ===== PARTICLES ===== */
(function(){
  const c=document.getElementById('canvas'),x=c.getContext('2d');
  let W,H,pts=[];
  const COLS=['rgba(249,115,22,','rgba(251,191,36,','rgba(45,212,191,','rgba(139,92,246,'];
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
  resize();addEventListener('resize',resize);
  function mk(){return{x:Math.random()*W,y:H+10,r:Math.random()*1.5+.4,sp:Math.random()*.4+.15,dr:(Math.random()-.5)*.8,op:Math.random()*.55+.2,col:COLS[Math.floor(Math.random()*COLS.length)]};}
  for(let i=0;i<70;i++)pts.push({...mk(),y:Math.random()*H});
  (function draw(){x.clearRect(0,0,W,H);pts.forEach((p,i)=>{p.y-=p.sp;p.x+=p.dr*.25;p.op-=.0006;if(p.y<-10||p.op<=0)pts[i]=mk();x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fillStyle=p.col+p.op+')';x.fill();});requestAnimationFrame(draw);})();
})();

/* ===== ACCOUNT DATABASE (localStorage) ===== */
function getAccounts(){
  try{return JSON.parse(localStorage.getItem('baatchete_accounts')||'[]');}catch(e){return [];}
}
function saveAccounts(arr){
  localStorage.setItem('baatchete_accounts',JSON.stringify(arr));
}
function findAccount(email){
  return getAccounts().find(a=>a.email.toLowerCase()===email.toLowerCase());
}
function registerAccount(data){
  const accounts=getAccounts();
  accounts.push(data);
  saveAccounts(accounts);
}

/* ===== STATE ===== */
const S={
  role:null,isOnline:true,
  profile:{name:'',mobile:'',email:'',rci:'',inst:'',spec:''},
  sessions:[],requests:[],
  earnings:{today:0,week:0,total:0},
  reqId:1
};

/* ===== CHAT STATE ===== */
let activeChatUser=null;
const chatHistory={};

/* ===== TOAST ===== */
function showT(title,body='',type='ic-or'){
  const b=document.getElementById('tbox');
  const borderCls=type==='ic-teal'?'border-teal':type==='ic-red'?'border-red':'border-or';
  const iconSvg=type==='ic-teal'
    ?'<polyline points="20 6 9 17 4 12"/>'
    :type==='ic-red'
    ?'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    :'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>';
  const el=document.createElement('div');
  el.className=`t ${borderCls}`;
  el.innerHTML=`<div class="t-ic ${type}"><svg viewBox="0 0 24 24" fill="none" stroke-width="2">${iconSvg}</svg></div><div><div class="t-tit">${title}</div>${body?`<div class="t-bod">${body}</div>`:''}</div>`;
  b.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},3500);
}

/* ===== SCREEN TRANSITIONS ===== */
function goTo(id){
  const cur=document.querySelector('.screen.active');
  if(cur){cur.style.animation='pageExit .25s ease both';setTimeout(()=>{cur.classList.remove('active');cur.style.animation='';activate(id);},230);}
  else activate(id);
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('dashboard').style.display='none';
}
function activate(id){
  const el=document.getElementById(id);
  el.classList.add('active');
  el.style.animation='pageEnter .35s ease both';
  setTimeout(()=>el.style.animation='',400);
}
function goHome(){
  goTo('home');
  document.getElementById('navbar').style.display='flex';
  document.getElementById('nav-right').innerHTML=`<button class="btn-ghost-sm" onclick="showLogin()">Log In</button><button class="btn-orange-sm" onclick="showLogin()">Get Started</button>`;
}

/* ===== LOGIN FLOW ===== */
let authTab='login';
let loginRole=null;

function showLogin(){loginRole=null;goTo('login');renderLoginForm();}
function showLoginWithRole(role){loginRole=role;goTo('login');renderLoginForm('register',role);}

function renderLoginForm(tab='login',role=null){
  authTab=tab;
  if(role)loginRole=role;
  const fc=document.getElementById('form-content');
  if(tab==='login'){
    updateLeftPanel(loginRole||'default');
    fc.innerHTML=`
      <div class="auth-tabs-row">
        <div class="a-tab active">Log In</div>
        <div class="a-tab" onclick="renderLoginForm('register',loginRole)">Register</div>
      </div>
      <div class="form-title">Welcome Back</div>
      <div class="form-sub">Select your role and sign in</div>
      <div class="role-selector">
        <div class="rs-card ${loginRole==='therapist'?'sel-or':''}" id="rs-t" onclick="selectLoginRole('therapist')">
          <div class="rs-check rs-check-or">✓</div>
          <div class="rs-icon rs-icon-or"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
          <div class="rs-name">Therapist</div><div class="rs-sub">Licensed professional</div>
        </div>
        <div class="rs-card ${loginRole==='listener'?'sel-teal':''}" id="rs-l" onclick="selectLoginRole('listener')">
          <div class="rs-check rs-check-teal">✓</div>
          <div class="rs-icon rs-icon-teal"><svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg></div>
          <div class="rs-name">Student Listener</div><div class="rs-sub">Psychology student</div>
        </div>
      </div>
      <div class="f-group" style="animation-delay:.05s"><label class="f-label">Email Address</label><input class="f-input ${loginRole==='listener'?'teal-focus':''}" id="l-id" placeholder="Enter your email address" type="email"></div>
      <div class="f-group" style="animation-delay:.1s"><label class="f-label">Password</label><input class="f-input ${loginRole==='listener'?'teal-focus':''}" id="l-pw" placeholder="Enter your password" type="password"></div>
      <button class="${loginRole==='listener'?'btn-submit-teal':'btn-submit-or'}" onclick="doLogin()">Sign In</button>
      <div class="form-footer">Don't have an account? <a onclick="renderLoginForm('register',loginRole)">Register</a></div>`;
  } else {
    if(role)loginRole=role;
    updateLeftPanel(loginRole);
    fc.innerHTML=`
      <div class="auth-tabs-row">
        <div class="a-tab" onclick="renderLoginForm('login',loginRole)">Log In</div>
        <div class="a-tab active">Register</div>
      </div>
      <div class="form-title">Create Account</div>
      <div class="form-sub">First select your role</div>
      <div class="role-selector">
        <div class="rs-card ${loginRole==='therapist'?'sel-or':''}" id="rs-t" onclick="selectRegRole('therapist')">
          <div class="rs-check rs-check-or">✓</div>
          <div class="rs-icon rs-icon-or"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
          <div class="rs-name">Therapist</div><div class="rs-sub">Licensed professional</div>
        </div>
        <div class="rs-card ${loginRole==='listener'?'sel-teal':''}" id="rs-l" onclick="selectRegRole('listener')">
          <div class="rs-check rs-check-teal">✓</div>
          <div class="rs-icon rs-icon-teal"><svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg></div>
          <div class="rs-name">Student Listener</div><div class="rs-sub">Psychology student</div>
        </div>
      </div>
      <div id="reg-fields">
        ${loginRole?renderRegFields(loginRole):'<div style="text-align:center;padding:20px;color:#aaaacc;font-size:13px;">Select a role above</div>'}
      </div>
      <div class="form-footer" style="margin-top:14px">Already have an account? <a onclick="renderLoginForm(\'login\',loginRole)">Log in</a></div>`;
  }
}

function renderRegFields(role){
  const isT=role==='therapist';
  const fc=isT?'':'teal-focus';
  const btnCls=isT?'btn-submit-or':'btn-submit-teal';

  /* Therapist: RCI Number field | Student: Institute ID + Institute Name fields */
  const specialFields=isT
    ?`<div class="f-group" style="animation-delay:.28s"><label class="f-label">RCI Number</label><input class="f-input ${fc}" id="r-rci" placeholder="Enter your RCI number (e.g. A-12345)"></div>`
    :`<div class="f-group" style="animation-delay:.28s"><label class="f-label">Institute ID</label><input class="f-input ${fc}" id="r-inst" placeholder="Enter your Institute ID (e.g. NIMHANS-2024-001)"></div>
      <div class="f-group" style="animation-delay:.32s"><label class="f-label">Institute Name</label><input class="f-input ${fc}" id="r-instname" placeholder="Enter your Institute Name (e.g. NIMHANS, Delhi University...)"></div>`;

  return `
    <div class="f-group" style="animation-delay:.05s"><label class="f-label">Full Name</label><input class="f-input ${fc}" id="r-name" placeholder="Enter your full name"></div>
    <div class="f-row">
      <div class="f-group" style="animation-delay:.1s"><label class="f-label">Mobile</label><input class="f-input ${fc}" id="r-mob" placeholder="Enter your mobile number" type="tel"></div>
      <div class="f-group" style="animation-delay:.15s"><label class="f-label">Email</label><input class="f-input ${fc}" id="r-email" placeholder="Enter your email address" type="email"></div>
    </div>
    ${specialFields}
    <div class="f-row">
      <div class="f-group" style="animation-delay:.38s"><label class="f-label">Password</label><input class="f-input ${fc}" id="r-pw" placeholder="Create a strong password" type="password" oninput="pwMeter(this.value)"><div class="pw-meter"><div class="pw-seg" id="pw1"></div><div class="pw-seg" id="pw2"></div><div class="pw-seg" id="pw3"></div><div class="pw-seg" id="pw4"></div><span class="pw-txt" id="pw-lbl"></span></div></div>
      <div class="f-group" style="animation-delay:.43s"><label class="f-label">Confirm Password</label><input class="f-input ${fc}" id="r-pw2" placeholder="Confirm your password" type="password"></div>
    </div>
    <button class="${btnCls}" style="margin-top:8px" onclick="doRegister('${role}')">${isT?'Register as Therapist':'Register as Student Listener'}</button>`;
}

function selectLoginRole(role){
  loginRole=role;
  document.getElementById('rs-t').className='rs-card'+(role==='therapist'?' sel-or':'');
  document.getElementById('rs-l').className='rs-card'+(role==='listener'?' sel-teal':'');
  updateLeftPanel(role);
  document.querySelectorAll('.f-input').forEach(i=>i.classList.toggle('teal-focus',role==='listener'));
  const btn=document.querySelector('.btn-submit-or,.btn-submit-teal');
  if(btn)btn.className=(role==='listener'?'btn-submit-teal':'btn-submit-or');
}

function selectRegRole(role){
  loginRole=role;
  document.getElementById('rs-t').className='rs-card'+(role==='therapist'?' sel-or':'');
  document.getElementById('rs-l').className='rs-card'+(role==='listener'?' sel-teal':'');
  updateLeftPanel(role);
  document.getElementById('reg-fields').innerHTML=renderRegFields(role);
  document.querySelectorAll('#reg-fields .f-group').forEach((g,i)=>{g.style.animation='none';requestAnimationFrame(()=>{g.style.animation=`fieldIn .3s ${i*.06}s ease both`;});});
}

function updateLeftPanel(role){
  const panel=document.getElementById('ll-panel');
  const glow=document.getElementById('ll-glow');
  const logo=document.getElementById('ll-logo');
  const iconWrap=document.getElementById('ll-icon-wrap');
  const iconSvg=document.getElementById('ll-icon-svg');
  const title=document.getElementById('ll-title');
  const desc=document.getElementById('ll-desc');
  const feats=document.getElementById('ll-features');
  const content=document.getElementById('ll-content');
  content.style.animation='none';
  requestAnimationFrame(()=>{
    if(role==='therapist'){
      panel.className='login-left ll-therapist';
      glow.className='ll-glow ll-glow-or';
      logo.className='ll-logo ll-logo-or';
      iconWrap.className='ll-big-icon-wrap';
      iconSvg.setAttribute('viewBox','0 0 24 24');
      iconSvg.innerHTML='<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>';
      iconSvg.style.stroke='var(--or)';
      content.style.animation='therapistAnim .55s cubic-bezier(.22,1,.36,1) both';
      title.textContent='Therapist Dashboard';
      desc.textContent='A powerful management system for RCI certified therapists. Sessions, earnings, and client requests — all in one place.';
      feats.innerHTML=`<li><div class="ll-feat-dot feat-or">✓</div>RCI verification included</li><li><div class="ll-feat-dot feat-or">✓</div>Earnings and session tracking</li><li><div class="ll-feat-dot feat-or">✓</div>Professional profile showcase</li>`;
    } else if(role==='listener'){
      panel.className='login-left ll-listener';
      glow.className='ll-glow ll-glow-teal';
      logo.className='ll-logo ll-logo-teal';
      iconWrap.className='ll-big-icon-wrap teal-ic';
      iconSvg.setAttribute('viewBox','0 0 24 24');
      iconSvg.innerHTML='<path d="M22 10v6M2 10l10-5 10 5-10 5z"/>';
      iconSvg.style.stroke='var(--teal)';
      content.style.animation='listenerAnim .55s cubic-bezier(.22,1,.36,1) both';
      title.textContent='Student Listener Portal';
      desc.textContent='For psychology students — manage supervised peer support sessions and build your experience.';
      feats.innerHTML=`<li><div class="ll-feat-dot feat-teal">✓</div>Institute ID verification</li><li><div class="ll-feat-dot feat-teal">✓</div>Supervised session management</li><li><div class="ll-feat-dot feat-teal">✓</div>Practical experience tracking</li>`;
    } else {
      panel.className='login-left ll-default';
      glow.className='ll-glow ll-glow-vio';
      logo.className='ll-logo ll-logo-vio';
      iconWrap.className='ll-big-icon-wrap';
      iconSvg.setAttribute('viewBox','0 0 24 24');
      iconSvg.innerHTML='<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
      iconSvg.style.stroke='var(--or)';
      content.style.animation='fadeIn .4s ease both';
      title.textContent='Welcome to Baatcheet';
      desc.textContent='A new way of mental wellness support. Choose your role to get started.';
      feats.innerHTML=`<li><div class="ll-feat-dot feat-or">✓</div>Real-time session management</li><li><div class="ll-feat-dot feat-or">✓</div>Earnings tracking & analytics</li><li><div class="ll-feat-dot feat-or">✓</div>Client request notifications</li>`;
    }
  });
}

function pwMeter(v){
  const segs=[1,2,3,4].map(i=>document.getElementById('pw'+i));
  const lbl=document.getElementById('pw-lbl');
  if(!segs[0])return;
  const sc=[v.length>=8,/[A-Z]/.test(v),/[0-9]/.test(v),/[^a-zA-Z0-9]/.test(v)].filter(Boolean).length;
  const cfg=[['',''],['var(--red)','Weak'],['var(--amber)','Fair'],['var(--or)','Good'],['var(--teal)','Strong']];
  segs.forEach((s,i)=>{if(s)s.style.background=i<sc?cfg[sc][0]:'var(--bg5)';});
  if(lbl){lbl.textContent=cfg[sc][1];lbl.style.color=cfg[sc][0];}
}

/* ===== LOGIN ===== */
function doLogin(){
  const email=document.getElementById('l-id')?.value?.trim();
  const pw=document.getElementById('l-pw')?.value?.trim();
  if(!loginRole){showT('Select Role','Please select Therapist or Student Listener','ic-red');return;}
  if(!email){errShake('l-id');showT('Email Required','Enter your email address','ic-red');return;}
  if(!isValidEmail(email)){errShake('l-id');showT('Invalid Email','Enter a valid email address','ic-red');return;}
  if(!pw){errShake('l-pw');showT('Password Required','Enter your password','ic-red');return;}
  const account=findAccount(email);
  if(!account){errShake('l-id');showT('Account Not Found','No account exists with this email. Please register.','ic-red');return;}
  if(account.password!==pw){errShake('l-pw');showT('Wrong Password','Please enter the correct password','ic-red');return;}
  /* ✅ ENGLISH ROLE MISMATCH NOTIFICATION */
  if(account.role!==loginRole){
    showT(
      'Role Mismatch',
      'Your account is registered as '+(account.role==='therapist'?'Therapist':'Student Listener')+'. Please select the correct role.',
      'ic-red'
    );
    return;
  }
  S.role=account.role;
  S.profile={name:account.name,mobile:account.mobile,email:account.email,rci:account.rci||'',inst:account.inst||'',instname:account.instname||'',spec:account.spec||''};
  showSuccessPanel('login',account.name);
}

/* ===== REGISTER ===== */
function doRegister(role){
  const name=document.getElementById('r-name')?.value?.trim();
  const mob=document.getElementById('r-mob')?.value?.trim();
  const email=document.getElementById('r-email')?.value?.trim();
  const rci=document.getElementById('r-rci')?.value?.trim();
  const inst=document.getElementById('r-inst')?.value?.trim();
  const instname=document.getElementById('r-instname')?.value?.trim();
  const pw=document.getElementById('r-pw')?.value?.trim();
  const pw2=document.getElementById('r-pw2')?.value?.trim();

  if(!name){errShake('r-name');showT('Name Required','Enter your full name','ic-red');return;}
  if(!mob){errShake('r-mob');showT('Mobile Required','Enter your mobile number','ic-red');return;}
  if(!email){errShake('r-email');showT('Email Required','Enter your email address','ic-red');return;}
  if(!isValidEmail(email)){errShake('r-email');showT('Invalid Email','Enter a valid email address','ic-red');return;}
  if(role==='therapist'&&!rci){errShake('r-rci');showT('RCI Number Required','Enter your RCI number','ic-red');return;}
  if(role==='listener'&&!inst){errShake('r-inst');showT('Institute ID Required','Enter your Institute ID','ic-red');return;}
  if(role==='listener'&&!instname){errShake('r-instname');showT('Institute Name Required','Enter your Institute Name','ic-red');return;}
  if(!pw){errShake('r-pw');showT('Set a Password','Create a strong password','ic-red');return;}
  if(pw.length<6){errShake('r-pw');showT('Password Too Short','Password must be at least 6 characters','ic-red');return;}
  if(pw!==pw2){errShake('r-pw2');showT('Passwords Do Not Match','Both passwords must be the same','ic-red');return;}

  const existing=findAccount(email);
  if(existing){
    errShake('r-email');
    showT(
      'Email Already Registered',
      'This email is already used in a '+(existing.role==='therapist'?'Therapist':'Student Listener')+' account. Please log in.',
      'ic-red'
    );
    return;
  }

  registerAccount({email,password:pw,name,mobile:mob,rci:rci||'',inst:inst||'',instname:instname||'',role,spec:''});
  S.role=role;
  S.profile={name,mobile:mob,email,rci:rci||'',inst:inst||'',instname:instname||'',spec:''};
  showSuccessPanel('register',name);
}

function isValidEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}

function errShake(id){
  const el=document.getElementById(id);if(!el)return;
  el.classList.add('err');setTimeout(()=>el.classList.remove('err'),600);
}

function showSuccessPanel(type,name){
  const fc=document.getElementById('form-content');
  const isListener=S.role==='listener';
  const ringCls=isListener?'suc-ring suc-ring-teal':'suc-ring suc-ring-or';
  const btnCls=isListener?'btn-dash-teal':'btn-dash-or';
  const titleTxt=type==='login'?'Logged In!':'Account Created!';
  const subTxt=type==='login'
    ?'Your Baatcheet dashboard is ready. Let\'s get started!'
    :`${name}'s account has been created as ${S.role==='therapist'?'Therapist':'Student Listener'}. Explore your dashboard!`;
  fc.innerHTML=`<div class="success-panel">
    <div class="${ringCls}"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
    ${name?`<div class="suc-user-chip">${name}</div>`:''}
    <div class="suc-title">${titleTxt}</div>
    <div class="suc-sub">${subTxt}</div>
    <button class="${btnCls}" onclick="launchDashboard()">Open Dashboard</button>
  </div>`;
  showT(type==='login'?'Login Successful!':'Registration Complete!',name?`Welcome, ${name}!`:'','ic-teal');
}

/* ===== DASHBOARD ===== */
function launchDashboard(){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.style.display='none';});
  document.getElementById('navbar').style.display='none';
  const d=document.getElementById('dashboard');
  d.style.display='flex';d.classList.add('active');
  updateDashUI();buildChart();buildRBars();
  showT('Dashboard Ready!','Welcome back!','ic-teal');
}

function doLogout(){
  document.getElementById('dashboard').style.display='none';
  document.getElementById('dashboard').classList.remove('active');
  document.querySelectorAll('.screen').forEach(s=>s.style.display='');
  document.getElementById('navbar').style.display='flex';
  S.role=null;S.sessions=[];S.requests=[];S.earnings={today:0,week:0,total:0};S.reqId=1;
  S.profile={name:'',mobile:'',email:'',rci:'',inst:'',instname:'',spec:''};
  activate('home');
  document.getElementById('nav-right').innerHTML=`<button class="btn-ghost-sm" onclick="showLogin()">Log In</button><button class="btn-orange-sm" onclick="showLogin()">Get Started</button>`;
  showT('Logged Out','See you again!','ic-or');
}

function showPage(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-it').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  if(id==='earnings')buildChart();
  if(id==='rating')buildRBars();
}

function updateDashUI(){
  const p=S.profile;
  const init=p.name?p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'?';
  document.getElementById('d-ava').textContent=init;
  const hour=new Date().getHours();
  const greet=hour<12?'Good Morning':'Hello';
  document.getElementById('d-title').textContent=`${greet}${p.name?' '+p.name:''}!`;
  document.getElementById('d-sub').textContent='Your Baatcheet Dashboard is ready';
  document.getElementById('d-uname').textContent=p.name?p.name.split(' ')[0]:'Profile';
  updateProfileUI();
}

function toggleAvail(cb){
  S.isOnline=cb.checked;
  const dot=document.getElementById('a-dot');
  const txt=document.getElementById('a-txt');
  if(S.isOnline){dot.className='a-dot on';txt.className='a-txt-on';txt.textContent='Online';showT('Now Online','New requests can come in','ic-teal');}
  else{dot.className='a-dot off';txt.className='a-txt-off';txt.textContent='Offline';showT('Now Offline','Requests are temporarily paused','ic-or');}
}

const NMS=['Aarav','Meera','Rohit','Sneha','Karan','Riya','Arjun','Vivek','Ananya','Priya'];
const ISS=['Anxiety & Stress','Depression Support','Relationship Issues','Career Stress','Sleep Problems','Loneliness','Self-esteem'];

/* Demo auto-replies for chat */
const AUTO_REPLIES={
  'Anxiety & Stress':["I've been feeling very anxious lately...","Can you help me with some breathing techniques?","I can't sleep because of stress."],
  'Depression Support':["I feel very low and unmotivated.","Nothing seems to interest me anymore.","I haven't been eating properly."],
  'Relationship Issues':["My relationship has been very stressful.","We keep having the same arguments.","I don't know if I should stay or leave."],
  'Career Stress':["Work pressure is getting to me.","I feel like I'm not good enough at my job.","I'm thinking of quitting."],
  'Sleep Problems':["I haven't slept well in weeks.","My mind won't stop when I try to sleep.","I wake up at 3am every night."],
  'Loneliness':["I feel so alone even in a crowd.","I don't have anyone to talk to.","Making friends is so hard for me."],
  'Self-esteem':["I feel worthless sometimes.","I compare myself to others too much.","I never feel good enough."]
};

function addDemoReq(){
  if(!S.isOnline){showT('You Are Offline','Please go online first','ic-red');return;}
  const name=NMS[Math.floor(Math.random()*NMS.length)];
  const issue=ISS[Math.floor(Math.random()*ISS.length)];
  const rid=S.reqId++;
  S.requests.push({id:rid,name,issue,time:'Just now',init:name[0]});
  renderReqs();updateBadge();
  document.getElementById('ov-req').textContent=S.requests.length;
  showT('New Request!',`${name} wants to talk with you`,'ic-or');
}

function renderReqs(){
  const el=document.getElementById('req-list');
  if(!S.requests.length){
    el.innerHTML=`<div class="card cp"><div class="empty-st"><div class="empty-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div class="empty-t">No requests yet</div><div class="empty-s">Keep availability "Online". When a user connects, it will show here.</div></div></div>`;
    return;
  }
  el.innerHTML=S.requests.map((r,i)=>`
    <div class="req-card" style="animation-delay:${i*.07}s" id="rc-${r.id}">
      <div class="req-ava">${r.init}</div>
      <div class="req-info"><div class="req-name">${r.name}</div><div class="req-meta">${r.issue}</div></div>
      <div style="display:flex;align-items:center;gap:6px;"><div class="live-pulse"></div><span style="font-size:11px;color:#aaaacc">${r.time}</span></div>
      <div class="req-acts">
        <button class="btn-acc" onclick="acceptReq(${r.id})">Accept</button>
        <button class="btn-dec" onclick="declineReq(${r.id})">Decline</button>
      </div>
    </div>`).join('');
}

function acceptReq(id){
  const r=S.requests.find(x=>x.id===id);if(!r)return;
  S.requests=S.requests.filter(x=>x.id!==id);
  const dur=[30,45,60][Math.floor(Math.random()*3)];
  const amt=dur*10;
  const sesId='ses_'+Date.now();
  S.sessions.unshift({id:sesId,name:r.name,issue:r.issue,
    time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    date:'Today',dur:`${dur} min`,amt:`Rs.${amt}`,status:'done',init:r.init});
  S.earnings.today+=amt;S.earnings.week+=amt;S.earnings.total+=amt;
  renderReqs();renderSessions();updateBadge();updateEarnings();
  document.getElementById('ov-ses').textContent=S.sessions.length;
  document.getElementById('ov-ses').classList.remove('empty');
  document.getElementById('ov-earn').textContent=`Rs.${S.earnings.today.toLocaleString('en-IN')}`;
  document.getElementById('ov-earn').classList.remove('empty');
  document.getElementById('ov-req').textContent=S.requests.length;
  document.getElementById('p-s1').textContent=S.sessions.length;

  /* Open chat with this user */
  openChat(r.name,r.issue,r.init,r.id);
  showT('Session Accepted',`Chat with ${r.name} started`,'ic-teal');
}

function declineReq(id){
  const r=S.requests.find(x=>x.id===id);
  S.requests=S.requests.filter(x=>x.id!==id);
  renderReqs();updateBadge();
  document.getElementById('ov-req').textContent=S.requests.length;
  showT('Request Declined',r?`${r.name}'s request has been declined`:'','ic-red');
}

function updateBadge(){document.getElementById('req-badge').textContent=S.requests.length;}

function renderSessions(){
  const el=document.getElementById('ses-list');
  const tot=S.sessions.length;
  const mins=S.sessions.reduce((a,s)=>a+parseInt(s.dur),0);
  document.getElementById('st-total').textContent=tot;
  document.getElementById('st-total').classList.remove('empty');
  document.getElementById('st-hours').textContent=`${Math.floor(mins/60)}h ${mins%60}m`;
  document.getElementById('st-hours').classList.remove('empty');
  if(!tot){el.innerHTML=`<div class="empty-st"><div class="empty-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div><div class="empty-t">No sessions yet</div><div class="empty-s">Sessions will appear here after accepting requests.</div></div>`;return;}
  el.innerHTML=S.sessions.map((s,i)=>`
    <div class="ses-row" style="animation:slideL .35s ${i*.06}s ease both">
      <div class="ses-ava">${s.init}</div>
      <div class="ses-info"><div class="ses-name">${s.name}</div><div class="ses-meta">${s.issue} · ${s.date} ${s.time}</div></div>
      <div class="ses-dur">${s.dur}</div>
      <div class="ses-amt">${s.amt}</div>
      <span class="pill ${s.status==='done'?'pill-done':'pill-active'}">${s.status==='done'?'Done':'Active'}</span>
    </div>`).join('');
}

function updateEarnings(){
  ['today','week','total'].forEach(k=>{
    const el=document.getElementById('e-'+k);
    if(el){el.textContent=`Rs.${S.earnings[k].toLocaleString('en-IN')}`;el.classList.remove('empty');}
  });
  buildChart();
}

function buildChart(){
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const td=new Date().getDay();const ti=td===0?6:td-1;
  const vals=days.map((_,i)=>i===ti?S.earnings.today:0);
  const mx=Math.max(...vals,1);
  document.getElementById('e-chart').innerHTML=days.map((d,i)=>{
    const pct=Math.round((vals[i]/mx)*100);
    const emp=vals[i]===0;
    return `<div class="bar-col"><div class="bar-track"><div class="bar-fill${emp?' empty':''}" style="height:${emp?6:pct}%;animation-delay:${i*.07}s"></div></div><div class="bar-day">${d}</div></div>`;
  }).join('');
}

function buildRBars(){
  document.getElementById('r-bars').innerHTML=
    [5,4,3,2,1].map(s=>`<div class="rbar-row"><span class="rbar-lbl">${s} ★</span><div class="rbar-track"><div class="rbar-fill" style="width:0"></div></div><span class="rbar-count">0</span></div>`).join('');
}

function openModal(){
  const m=document.getElementById('edit-modal');
  m.classList.add('open');
  const p=S.profile;
  document.getElementById('m-name').value=p.name||'';
  document.getElementById('m-mob').value=p.mobile||'';
  document.getElementById('m-email').value=p.email||'';
  document.getElementById('m-rci').value=p.rci||'';
  document.getElementById('m-inst').value=p.inst||'';
  document.getElementById('m-spec').value=p.spec||'';
  document.getElementById('m-rci-g').style.display=S.role==='listener'?'none':'block';
  document.getElementById('m-inst-g').style.display=S.role==='listener'?'block':'none';
}
function closeModal(){document.getElementById('edit-modal').classList.remove('open');}
document.getElementById('edit-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});

function saveProfile(){
  const name=document.getElementById('m-name').value.trim();
  if(!name){showT('Name Required','Enter your full name','ic-red');return;}
  S.profile={
    name,
    mobile:document.getElementById('m-mob').value.trim(),
    email:document.getElementById('m-email').value.trim(),
    rci:document.getElementById('m-rci').value.trim(),
    inst:document.getElementById('m-inst').value.trim(),
    spec:document.getElementById('m-spec').value.trim()
  };
  const accounts=getAccounts();
  const idx=accounts.findIndex(a=>a.email.toLowerCase()===S.profile.email.toLowerCase());
  if(idx>-1){accounts[idx]={...accounts[idx],...S.profile};saveAccounts(accounts);}
  updateProfileUI();closeModal();
  document.getElementById('d-title').textContent=`Hello ${name}!`;
  const init=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('d-ava').textContent=init;
  document.getElementById('d-uname').textContent=name.split(' ')[0];
  showT('Profile Saved',`Hello, ${name}!`,'ic-teal');
}

function updateProfileUI(){
  const p=S.profile;const isL=S.role==='listener';
  const init=p.name?p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase():'?';
  document.getElementById('p-ava').textContent=init;
  document.getElementById('p-name').textContent=p.name||'Name Not Set';
  document.getElementById('p-role').textContent=isL?'Student Listener':'Licensed Therapist';
  document.getElementById('p-badges').innerHTML=isL?`<span class="pb pb-teal">Student Listener</span>`:`<span class="pb pb-or">Therapist</span>`;
  const sv=(id,v)=>{const e=document.getElementById(id);if(!e)return;e.textContent=v||'— Not set';e.className='info-val'+(v?'':' e');};
  sv('i-name',p.name);sv('i-mob',p.mobile);sv('i-email',p.email);sv('i-spec',p.spec);
  if(isL){sv('i-inst',p.inst);document.getElementById('i-rci-box').style.display='none';document.getElementById('i-inst-box').style.display='block';}
  else{sv('i-rci',p.rci);document.getElementById('i-rci-box').style.display='block';document.getElementById('i-inst-box').style.display='none';}
}

/* ===== CHAT SYSTEM ===== */
function openChat(name,issue,init,reqId){
  activeChatUser={name,issue,init,reqId};
  if(!chatHistory[name])chatHistory[name]=[];

  document.getElementById('chat-ava').textContent=init;
  document.getElementById('chat-name').textContent=name;
  document.getElementById('chat-issue').textContent=issue+' · Session Active';
  document.getElementById('chat-modal').classList.add('open');

  /* Add initial greeting from user if first time */
  if(chatHistory[name].length===0){
    const replies=AUTO_REPLIES[issue]||["Hello, I need some help.","I have been struggling lately.","Can we talk?"];
    const firstMsg=replies[0];
    chatHistory[name].push({sender:'user',text:firstMsg,time:nowTime()});
  }
  renderChatMsgs();

  /* Auto scroll */
  setTimeout(()=>{
    const msgs=document.getElementById('chat-msgs');
    if(msgs)msgs.scrollTop=msgs.scrollHeight;
  },100);

  /* Schedule a second auto-reply after 3s if new session */
  if(chatHistory[name].length===1){
    const replies=AUTO_REPLIES[issue]||["I have been struggling lately.","Can we talk?","Please help me."];
    setTimeout(()=>{
      if(activeChatUser&&activeChatUser.name===name){
        addUserMsg(name,issue);
      }
    },3000);
  }
}

function addUserMsg(name,issue){
  const replies=AUTO_REPLIES[issue]||["I need help.","Please guide me.","What should I do?"];
  const existing=chatHistory[name]||[];
  const idx=Math.min(existing.filter(m=>m.sender==='user').length,replies.length-1);
  const txt=replies[idx];
  if(!chatHistory[name])chatHistory[name]=[];
  chatHistory[name].push({sender:'user',text:txt,time:nowTime()});
  if(activeChatUser&&activeChatUser.name===name){
    renderChatMsgs();
    const msgs=document.getElementById('chat-msgs');
    if(msgs)msgs.scrollTop=msgs.scrollHeight;
  }
}

function nowTime(){
  return new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

function renderChatMsgs(){
  const name=activeChatUser?.name;
  if(!name)return;
  const msgs=chatHistory[name]||[];
  const container=document.getElementById('chat-msgs');
  if(!container)return;
  container.innerHTML=msgs.map((m,i)=>`
    <div style="display:flex;flex-direction:column;align-items:${m.sender==='me'?'flex-end':'flex-start'};animation:chatMsgIn .3s ${i*.04}s ease both">
      <div class="chat-bubble ${m.sender==='me'?'mine':'theirs'}">${escHtml(m.text)}<div class="chat-bubble-time">${m.time}</div></div>
    </div>`).join('');
  container.scrollTop=container.scrollHeight;
}

function sendChatMsg(){
  const inp=document.getElementById('chat-input');
  const text=inp?.value?.trim();
  if(!text||!activeChatUser)return;
  const name=activeChatUser.name;
  if(!chatHistory[name])chatHistory[name]=[];
  chatHistory[name].push({sender:'me',text,time:nowTime()});
  inp.value='';
  inp.style.height='auto';
  renderChatMsgs();

  /* Simulate user typing response after a delay */
  setTimeout(()=>{
    if(activeChatUser&&activeChatUser.name===name){
      addUserMsg(name,activeChatUser.issue);
    }
  },2000+Math.random()*2000);
}

function chatKeyDown(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMsg();}
}

function autoResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,100)+'px';
}

function closeChat(){
  document.getElementById('chat-modal').classList.remove('open');
  activeChatUser=null;
}

document.getElementById('chat-modal').addEventListener('click',e=>{
  if(e.target===e.currentTarget)closeChat();
});

function escHtml(t){
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

buildChart();buildRBars();