import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

let session=null, profile=null, progress={}, queue=[], custom=[], leaders=[];
let period="week", leagueTrack="written", category="All";
let lesson=[], idx=0, score=0, currentKind="quiet_lesson", rec=null, qt=null;
let totalXp=0,todayXp=0,events=0;
const avatars=["✨","🌙","🦋","🌸","⚡","🧠","🎧","☕","💜","🪩","🌊","🔥"];
let avatar="✨";

const P=[
[1,"Small talk","How's your day going so far?","Comment se passe ta journée jusqu'ici ?"],
[2,"Small talk","How did that go?","Comment ça s'est passé ?"],
[3,"Small talk","What have you been up to lately?","Qu'est-ce que tu fais de beau ces derniers temps ?"],
[4,"Small talk","I haven't really been up to much.","Je n'ai pas fait grand-chose dernièrement."],
[5,"Small talk","That actually sounds really nice.","En fait, ça a l'air vraiment sympa."],
[6,"Small talk","I know what you mean.","Je vois ce que tu veux dire."],
[7,"Small talk","That makes sense.","Je comprends / Ça se tient."],
[8,"Small talk","I was going to, but I changed my mind.","J'allais le faire, mais j'ai changé d'avis."],
[9,"Small talk","I ended up staying home.","Finalement, je suis restée à la maison."],
[10,"Small talk","It turned out better than I expected.","Ça s'est finalement mieux passé que prévu."],
[11,"Conversation rescue","Give me a second, I'm trying to think of the word.","Donne-moi une seconde, j'essaie de retrouver le mot."],
[12,"Conversation rescue","What I mean is…","Ce que je veux dire, c'est…"],
[13,"Conversation rescue","Actually, let me rephrase that.","En fait, laisse-moi reformuler."],
[14,"Conversation rescue","Sorry, I didn't catch the last part.","Désolée, je n'ai pas compris la dernière partie."],
[15,"Conversation rescue","Could you say that again?","Tu peux répéter ?"],
[16,"Work","I'm just wrapping up a few things.","Je suis juste en train de terminer quelques trucs."],
[17,"Work","I'm free if anyone needs help with anything.","Je suis disponible si quelqu'un a besoin d'aide."],
[18,"Work","I can take a look at it if you want.","Je peux y jeter un œil si tu veux."],
[19,"Work","I haven't had a chance to look at it yet.","Je n'ai pas encore eu l'occasion de regarder."],
[20,"Work","I'll double-check and get back to you.","Je vais revérifier et je te reviens."],
[21,"Work","I'm pretty much done with it.","J'ai pratiquement terminé."],
[22,"Work","Do you want me to send it over?","Tu veux que je te l'envoie ?"],
[23,"Work","I thought you were away last week.","Je pensais que tu étais absente la semaine dernière."],
[24,"Everyday","I don't really feel like going out tonight.","Je n'ai pas vraiment envie de sortir ce soir."],
[25,"Everyday","I might just stay home and take it easy.","Je vais peut-être simplement rester à la maison et me reposer."],
[26,"Everyday","I'm still trying to figure it out.","J'essaie encore de comprendre / décider."],
[27,"Everyday","I completely forgot about that.","J'avais complètement oublié ça."],
[28,"Everyday","I'm not really into that kind of thing.","Ce n'est pas vraiment mon truc."],
[29,"Everyday","I'm still getting used to it.","Je suis encore en train de m'y habituer."],
[30,"Everyday","We'll see how it goes.","On verra comment ça se passe."],
[31,"Parents & school","How has he been doing in class?","Comment ça se passe pour lui en classe ?"],
[32,"Parents & school","Is there anything we should work on at home?","Y a-t-il quelque chose qu'on devrait travailler à la maison ?"],
[33,"Parents & school","He's really looking forward to it.","Il a vraiment hâte."],
[34,"Parents & school","Do we need to bring anything?","Est-ce qu'on doit apporter quelque chose ?"],
[35,"Social","I wasn't sure if I was going to come, but I'm glad I did.","Je n'étais pas sûre de venir, mais je suis contente d'être venue."],
[36,"Social","It was a little awkward at first, but then it was fine.","C'était un peu gênant au début, puis ça allait."],
[37,"Social","We haven't seen each other in forever.","Ça fait une éternité qu'on ne s'est pas vus."],
[38,"Social","We should do this again sometime.","On devrait refaire ça un de ces jours."],
[39,"Social","I'm really glad we got to catch up.","Je suis vraiment contente qu'on ait pu discuter."],
[40,"Everyday","I didn't realize it was that late.","Je n'avais pas réalisé qu'il était si tard."],
[41,"Everyday","It depends on how tired I am.","Ça dépend de mon niveau de fatigue."],
[42,"Work","I'm waiting on a few things before I can move forward.","J'attends quelques éléments avant de pouvoir avancer."],
[43,"Work","Just let me know if anything needs to be changed.","Dis-moi simplement si quelque chose doit être modifié."],
[44,"Social","I'm really glad you came.","Je suis vraiment contente que tu sois venu(e)."],
[45,"Small talk","How was the rest of your day?","Comment s'est passée la suite de ta journée ?"]
].map(x=>({id:String(x[0]),cat:x[1],en:x[2],fr:x[3]}));

const topics=[
"Tell me what you have done so far today.",
"Describe your last weekend without preparing.",
"Talk about something you are looking forward to this week.",
"Explain what you usually do after work.",
"Tell a short story about something that did not go as planned.",
"Talk about one thing you want to improve in your English."
];

const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const all=()=>P.concat(custom.map(x=>({id:"c_"+x.id,dbid:x.id,cat:"My phrases",en:x.english,fr:x.french})));
const pg=id=>progress[String(id)]||{box:0,correct_count:0,wrong_count:0,spoken_count:0};
const due=p=>!pg(p.id).next_review_at||new Date(pg(p.id).next_review_at)<=new Date();
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const lvl=x=>Math.max(1,Math.floor(Math.sqrt(Math.max(0,x)/140))+1);

function toast(t){let e=$("#toast");if(!e)return; e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2200)}
function say(t){if(!("speechSynthesis" in window))return toast("Audio unavailable");speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang="en-CA";u.rate=.92;speechSynthesis.speak(u)}
function celebrate(){
  const host=$("#confetti"); if(!host)return;
  host.innerHTML="";
  for(let i=0;i<10;i++){
    const p=document.createElement("i");
    p.className="confetti-piece";
    p.style.left=(42+Math.random()*16)+"%";
    p.style.top=(40+Math.random()*12)+"%";
    p.style.width=p.style.height=(4+Math.random()*4)+"px";
    p.style.borderRadius="50%";
    p.style.background=["#d8b4fe","#67e8f9","#f9a8d4"][i%3];
    p.style.setProperty("--x",((Math.random()-.5)*90)+"px");
    p.style.animationDuration=(.55+Math.random()*.35)+"s";
    host.appendChild(p);
  }
  setTimeout(()=>host.innerHTML="",1000);
}

function renderAv(){
  avatar=avatars[0];
  $("#avatarPicker").innerHTML=avatars.map((a,i)=>`<button type="button" class="avatar-choice ${i?"":"selected"}" data-a="${a}">${a}</button>`).join("");
  $$(".avatar-choice").forEach(b=>b.onclick=()=>{avatar=b.dataset.a;$$(".avatar-choice").forEach(x=>x.classList.toggle("selected",x===b))});
}
function authTab(v){let sign=v==="signup";$("#loginForm").classList.toggle("hidden",sign);$("#signupForm").classList.toggle("hidden",!sign);$$("#authTabs .seg").forEach((b,i)=>b.classList.toggle("active",sign?i===1:i===0));$("#authTabs").dataset.index=sign?1:0}
async function login(e){e.preventDefault();let{error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});if(error)toast(error.message)}
async function signup(e){
  e.preventDefault();
  let username=$("#signupUsername").value.trim().toLowerCase();
  let{data:ok}=await sb.rpc("check_username_available",{p_username:username});
  if(ok===false)return toast("Username already taken");
  let{data,error}=await sb.auth.signUp({
    email:$("#signupEmail").value.trim(),
    password:$("#signupPassword").value,
    options:{emailRedirectTo:"https://alpha3111.github.io/speakflow/",data:{username,display_name:$("#signupName").value.trim(),avatar}}
  });
  if(error)return toast(error.message);
  toast(data.session?"Welcome ✨":"Profile created — check your email, then return to SpeakFlow.");
}
async function enter(){
  session=(await sb.auth.getSession()).data.session;
  if(!session){$("#authGate").classList.remove("hidden");$("#app").classList.add("hidden");return}
  $("#authGate").classList.add("hidden");$("#app").classList.remove("hidden");await sync();go("home",0)
}
async function sync(){
  let u=session.user.id;
  let[a,b,c,d]=await Promise.all([
    sb.from("profiles").select("*").eq("id",u).single(),
    sb.from("user_phrase_progress").select("*").eq("user_id",u),
    sb.from("speaking_queue").select("phrase_key").eq("user_id",u),
    sb.from("custom_phrases").select("*").eq("user_id",u)
  ]);
  profile=a.data;progress={};(b.data||[]).forEach(x=>progress[x.phrase_key]=x);queue=(c.data||[]).map(x=>x.phrase_key);custom=d.data||[];
  await stats();await league();renderAll();
}
async function stats(){
  let{data}=await sb.from("activity_events").select("xp,created_at").eq("user_id",session.user.id);data=data||[];events=data.length;totalXp=data.reduce((s,x)=>s+x.xp,0);
  let day=new Date();day.setHours(0,0,0,0);todayXp=data.filter(x=>new Date(x.created_at)>=day).reduce((s,x)=>s+x.xp,0)
}
async function league(){
  let{data,error}=await sb.rpc("get_track_leaderboard",{p_period:period,p_track:leagueTrack});
  if(error){leaders=[];toast("Leaderboard unavailable");}else leaders=data||[];
  renderLeague();renderRank()
}
function go(id,scroll=1){
  $$(".screen").forEach(s=>s.classList.toggle("active",s.id===id));$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.go===id));
  if(id==="library")renderLibrary();if(id==="league"){ensureTrackTabs();league()}if(id==="profile")renderProfile();if(scroll)scrollTo({top:0,behavior:"smooth"})
}
function renderAll(){
  $("#dueHome").textContent=all().filter(due).length;$("#queueHome").textContent=queue.length;$("#queueBadge").textContent=queue.length;
  $("#lessonsHome").textContent=events;$("#miniAvatar").textContent=profile?.avatar||"✨";$("#miniName").textContent=profile?.display_name||"Learner";
  $("#miniLevel").textContent="Level "+lvl(totalXp);$("#headerXp").textContent=totalXp+" XP";
  $("#heroGreeting").innerHTML=`Ready to sound<br><span class="gradient-text">more natural, ${esc((profile?.display_name||"there").split(" ")[0])}?</span>`;
  $("#todayXpLabel").textContent=todayXp+" XP";$("#todayXpBar").style.width=Math.min(100,todayXp/500*100)+"%";renderProfile();renderLibrary();renderRank()
}
function renderRank(){let i=leaders.findIndex(x=>x.user_id===session?.user?.id);$("#homeRank").textContent=i<0?"#–":"#"+(i+1);$("#homePlayers").textContent=leaders.length||"–";$("#rankProgress").style.width=i<0?"0%":Math.max(8,(leaders.length-i)/leaders.length*100)+"%"}

function ensureTrackTabs(){
  if($("#trackTabs"))return;
  const leagueTabs=$(".league-tabs"); if(!leagueTabs)return;
  const wrap=document.createElement("div");
  wrap.id="trackTabs";wrap.className="segmented";wrap.style.marginBottom="10px";
  wrap.innerHTML=`<button class="seg active" data-track="written">🧠 Written Champion</button><button class="seg" data-track="speaking">🎤 Speaking Champion</button><span class="seg-glider"></span>`;
  leagueTabs.parentNode.insertBefore(wrap,leagueTabs);
  $$('[data-track]',wrap).forEach((b,i)=>b.onclick=()=>{leagueTrack=b.dataset.track;$$('[data-track]',wrap).forEach(x=>x.classList.toggle("active",x===b));wrap.dataset.index=i?1:0;league()});
}

function choose(){let a=all();return[...shuffle(a.filter(due)),...shuffle(a.filter(x=>!due(x)))].slice(0,10)}
function frame(s){return `<div class="exercise-card glass"><div class="exercise-top"><span class="step-pill">${idx+1} / ${lesson.length}</span><div class="exercise-progress"><i style="width:${idx/Math.max(1,lesson.length)*100}%"></i></div></div>${s}</div>`}
function startQuiet(){
  currentKind="quiet_lesson";go("practice");$("#practiceMenu").classList.add("hidden");$("#exerciseStage").classList.remove("hidden");
  lesson=choose();idx=score=0;quiet()
}
function wrongChoices(p,n=3){return shuffle(all().filter(x=>x.id!==p.id)).slice(0,n)}

function quiet(){
  if(idx>=lesson.length)return finish("quiet_lesson");
  let p=lesson[idx],type=idx%6,s="";
  if(type===0){
    let opts=shuffle([p,...wrongChoices(p)]);
    s=`<div class="prompt-label">CHOOSE THE TRANSLATION</div><div class="exercise-prompt">${esc(p.fr)}</div><div class="choices">${opts.map(o=>`<button class="choice" data-v="${o.id}">${esc(o.en)}</button>`).join("")}</div>`;
  }else if(type===1){
    let words=p.en.split(" ");let gap=Math.min(words.length-1,Math.max(1,Math.floor(words.length/2)));let answer=words[gap].replace(/[.,!?]/g,"");let masked=words.map((w,i)=>i===gap?"_____":w).join(" ");
    let distract=shuffle(all().flatMap(x=>x.en.split(" ")).map(w=>w.replace(/[.,!?]/g,"")).filter(w=>w&&w.toLowerCase()!==answer.toLowerCase())).slice(0,3);
    let opts=shuffle([answer,...distract]);
    s=`<div class="prompt-label">FILL THE GAP</div><div class="exercise-prompt">${esc(masked)}</div><div class="translation-box">${esc(p.fr)}</div><div class="choices">${opts.map(w=>`<button class="choice" data-word="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
  }else if(type===2){
    let tokens=p.en.replace(/[.,!?]/g,"").split(" ");
    s=`<div class="prompt-label">PUT THE SENTENCE IN ORDER</div><div class="translation-box">${esc(p.fr)}</div><div id="answerZone" class="translation-box" style="min-height:58px;margin-top:12px;display:flex;gap:7px;flex-wrap:wrap"></div><div id="wordBank" class="choices" style="grid-template-columns:repeat(2,1fr)">${shuffle(tokens).map((w,i)=>`<button class="choice word-chip" draggable="true" data-word="${esc(w)}" data-i="${i}">${esc(w)}</button>`).join("")}</div><div class="exercise-bottom"><button class="primary" id="checkOrder"><span>Check sentence</span><b>✓</b></button></div>`;
  }else if(type===3){
    let opts=shuffle([p,...wrongChoices(p)]).map(x=>({id:x.id,txt:x.fr}));
    s=`<div class="prompt-label">WHAT DOES THIS MEAN?</div><div class="exercise-prompt">${esc(p.en)}</div><div class="choices">${opts.map(o=>`<button class="choice" data-v="${o.id}">${esc(o.txt)}</button>`).join("")}</div>`;
  }else if(type===4){
    let tokens=p.en.replace(/[.,!?]/g,"").split(" ");
    s=`<div class="prompt-label">BUILD THE SENTENCE</div><div class="translation-box">${esc(p.fr)}</div><div id="answerZone" class="translation-box" style="min-height:58px;margin-top:12px;display:flex;gap:7px;flex-wrap:wrap"></div><div id="wordBank" class="choices" style="grid-template-columns:repeat(2,1fr)">${shuffle(tokens).map((w,i)=>`<button class="choice word-chip" data-word="${esc(w)}" data-i="${i}">${esc(w)}</button>`).join("")}</div><div class="exercise-bottom"><button class="primary" id="checkOrder"><span>Check answer</span><b>→</b></button></div>`;
  }else{
    let alt=p.en.replace(/\bI'm\b/g,"I am").replace(/\bdon't\b/g,"do not").replace(/\bhaven't\b/g,"have not");
    s=`<div class="prompt-label">MOST NATURAL IN CONVERSATION</div><div class="translation-box">${esc(p.fr)}</div><div class="choices"><button class="choice" data-natural="1">${esc(p.en)}</button><button class="choice" data-natural="0">${esc(alt===p.en?p.en+" please":alt)}</button></div>`;
  }
  $("#exerciseStage").innerHTML=frame(s);
  bindQuiet(p,type);
}
function nextQuiet(ok,p){if(ok)score++;upd(p.id,ok,0).then(()=>{setTimeout(()=>{idx++;quiet()},ok?280:650)})}
function bindQuiet(p,type){
  if([0,3].includes(type)){
    $$(".choice").forEach(b=>b.onclick=()=>{let ok=b.dataset.v===p.id;b.classList.add(ok?"correct":"wrong");if(!ok){let c=$$(".choice").find(x=>x.dataset.v===p.id);if(c)c.classList.add("correct")}nextQuiet(ok,p)})
  }else if(type===1){
    const words=p.en.split(" ");let gap=Math.min(words.length-1,Math.max(1,Math.floor(words.length/2)));let ans=words[gap].replace(/[.,!?]/g,"").toLowerCase();
    $$(".choice").forEach(b=>b.onclick=()=>{let ok=b.dataset.word.toLowerCase()===ans;b.classList.add(ok?"correct":"wrong");nextQuiet(ok,p)})
  }else if([2,4].includes(type)){
    setupWordBuilder(p)
  }else{
    $$('[data-natural]').forEach(b=>b.onclick=()=>{let ok=b.dataset.natural==="1";b.classList.add(ok?"correct":"wrong");nextQuiet(ok,p)})
  }
}
function setupWordBuilder(p){
  const bank=$("#wordBank"), zone=$("#answerZone");
  let selected=[];
  function draw(){zone.innerHTML=selected.map((w,i)=>`<button class="choice correct" style="width:auto;padding:8px 10px" data-back="${i}">${esc(w)}</button>`).join("");$$('[data-back]',zone).forEach(b=>b.onclick=()=>{selected.splice(+b.dataset.back,1);draw()})}
  $$(".word-chip",bank).forEach(b=>{
    b.onclick=()=>{selected.push(b.dataset.word);b.remove();draw()};
    b.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",b.dataset.word));
  });
  zone.addEventListener("dragover",e=>e.preventDefault());
  zone.addEventListener("drop",e=>{e.preventDefault();let w=e.dataTransfer.getData("text/plain");if(w){selected.push(w);let candidate=$$(".word-chip",bank).find(x=>x.dataset.word===w);if(candidate)candidate.remove();draw()}});
  $("#checkOrder").onclick=()=>{const normalized=s=>s.toLowerCase().replace(/[^\w\s']/g,"").replace(/\s+/g," ").trim();let ok=normalized(selected.join(" "))===normalized(p.en);if(!ok){toast("Not quite — try the natural order.");return}nextQuiet(true,p)};
}
async function upd(id,good,spoken){
  let o=pg(id),box=good?Math.min(5,(o.box||0)+1):Math.max(0,(o.box||0)-1),days=[0,1,3,7,14,30][box];
  let row={user_id:session.user.id,phrase_key:String(id),box,correct_count:(o.correct_count||0)+(good?1:0),wrong_count:(o.wrong_count||0)+(good?0:1),spoken_count:(o.spoken_count||0)+(spoken?1:0),next_review_at:new Date(Date.now()+days*86400000).toISOString(),updated_at:new Date().toISOString()};
  progress[String(id)]=row;await sb.from("user_phrase_progress").upsert(row,{onConflict:"user_id,phrase_key"});renderAll()
}
async function saveLater(id){if(!queue.includes(String(id))){queue.push(String(id));await sb.from("speaking_queue").upsert({user_id:session.user.id,phrase_key:String(id)},{onConflict:"user_id,phrase_key"});renderAll()}toast("Saved for speaking later 🎤")}

function startSpeak(){
  currentKind="speaking_lesson";go("practice");$("#practiceMenu").classList.add("hidden");$("#exerciseStage").classList.remove("hidden");
  lesson=(queue.length?queue.map(k=>all().find(p=>p.id===k)).filter(Boolean):choose().slice(0,6));idx=score=0;speakEx()
}
function speakEx(){
  if(idx>=lesson.length)return finish("speaking_lesson");
  let p=lesson[idx];
  $("#exerciseStage").innerHTML=frame(`<div class="prompt-label">SPEAKING ONLY</div><div class="exercise-prompt">${esc(p.fr)}</div><button class="listen-btn" id="target">🔊 Hear target</button><div id="heard"></div><div class="exercise-bottom"><button class="mic-button" id="mic">🎤 Tap and speak</button><button class="ghost-btn" id="again">Do this later</button></div>`);
  $("#target").onclick=()=>say(p.en);$("#again").onclick=()=>{saveLater(p.id);idx++;speakEx()};$("#mic").onclick=()=>record(p)
}
function sim(a,b){let A=new Set(a.toLowerCase().replace(/[^\w\s']/g,"").split(/\s+/)),B=new Set(b.toLowerCase().replace(/[^\w\s']/g,"").split(/\s+/)),i=0;A.forEach(x=>B.has(x)&&i++);return i/Math.max(1,new Set([...A,...B]).size)}
function record(p){
  let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return manual(p);
  rec=new SR;rec.lang="en-CA";
  rec.onresult=e=>{let h=e.results[0][0].transcript,g=sim(h,p.en)>.55;$("#heard").innerHTML=`<div class="result-box"><b>${g?"✅ Good — compare":"🧠 Try again"}</b><br>I heard: ${esc(h)}<br><br>Target: ${esc(p.en)}<div class="row"><button class="secondary" id="retry">Repeat</button><button class="secondary" id="next">Continue</button></div></div>`;$("#retry").onclick=()=>record(p);$("#next").onclick=()=>doneSpeak(p,g)};
  rec.onerror=()=>manual(p);rec.start()
}
function manual(p){$("#heard").innerHTML=`<div class="result-box"><b>Compare yourself</b><br>${esc(p.en)}<div class="row"><button class="secondary" id="mh">Hard</button><button class="secondary" id="mg">I said it well</button></div></div>`;$("#mh").onclick=()=>doneSpeak(p,0);$("#mg").onclick=()=>doneSpeak(p,1)}
async function doneSpeak(p,g){if(g)score++;await upd(p.id,g,1);queue=queue.filter(x=>x!==p.id);await sb.from("speaking_queue").delete().eq("user_id",session.user.id).eq("phrase_key",p.id);idx++;speakEx()}

function startQuick(){
  currentKind="quick_talk";go("practice");$("#practiceMenu").classList.add("hidden");$("#exerciseStage").classList.remove("hidden");
  lesson=[{id:"q"}];idx=score=0;let t=topics[Math.floor(Math.random()*topics.length)];
  $("#exerciseStage").innerHTML=frame(`<div class="prompt-label">QUICK TALK · SPEAKING LEAGUE</div><div class="exercise-prompt" style="text-align:center">${esc(t)}</div><div id="clock" style="font-size:64px;text-align:center;font-weight:1000;margin:20px">60</div><div class="translation-box" style="text-align:center">Keep talking. Don't stop to fix every mistake.</div><div class="exercise-bottom"><button class="mic-button" id="go60">🎤 Start 60 seconds</button></div>`);
  $("#go60").onclick=()=>{let n=60;$("#go60").disabled=1;qt=setInterval(()=>{n--;$("#clock").textContent=n;if(n<=0){clearInterval(qt);score=1;finish("quick_talk")}},1000)}
}
async function finish(kind){
  let acc=kind==="quick_talk"?1:score/Math.max(1,lesson.length),token=crypto.randomUUID();
  let{data,error}=await sb.rpc("award_activity",{p_kind:kind,p_accuracy:acc,p_client_token:token});
  let xp=data?.[0]?.xp_awarded||0,g=data?.[0]?.grade_awarded||(acc>.85?"A":acc>.7?"B":"C");if(error)toast(error.message);
  await stats();renderAll();celebrate();
  const label=kind==="quiet_lesson"?"Written & memory":kind==="speaking_lesson"?"Speaking":"Quick Talk";
  $("#exerciseStage").innerHTML=`<div class="grade-card glass"><div class="eyebrow">${label.toUpperCase()} COMPLETE</div><div class="grade-letter">${g}</div><h2>Keep the momentum.</h2><div class="xp-pop">⚡ +${xp} XP</div><p class="muted">${Math.round(acc*100)}% session score.</p><div class="modal-actions"><button class="primary" id="more"><span>New ${kind==="quiet_lesson"?"written":"speaking"} lesson</span><b>→</b></button><button class="secondary" id="menu">Practice menu</button></div></div>`;
  $("#more").onclick=()=>kind==="quiet_lesson"?startQuiet():kind==="quick_talk"?startQuick():startSpeak;
  $("#menu").onclick=reset;league()
}
function reset(){$("#exerciseStage").classList.add("hidden");$("#practiceMenu").classList.remove("hidden");$("#exerciseStage").innerHTML=""}

function renderLeague(){
  ensureTrackTabs();
  let top=leaders.slice(0,3),ord=[top[1],top[0],top[2]],cls=["second","first","third"];
  $("#podium").innerHTML=ord.map((x,i)=>x?`<div class="podium-card ${cls[i]}"><div class="podium-avatar">${esc(x.avatar||"✨")}</div><b>${esc(x.display_name||x.username)}</b><strong>${x.xp} XP</strong></div>`:"<div></div>").join("");
  $("#leaderList").innerHTML=leaders.map((x,i)=>`<div class="leader-row ${x.user_id===session?.user.id?"me":""}"><div>#${i+1}</div><div class="leader-avatar">${esc(x.avatar||"✨")}</div><div class="leader-copy"><b>${esc(x.display_name||x.username)}${x.user_id===session?.user.id?" · You":""}</b><small>@${esc(x.username)}</small></div><div class="leader-xp"><b>${x.xp} XP</b><small>${leagueTrack==="written"?"Written":"Speaking"}</small></div></div>`).join("")||'<div class="translation-box">No activity yet.</div>'
}
function renderLibrary(){
  let cats=["All",...new Set(all().map(p=>p.cat))];
  $("#categoryChips").innerHTML=cats.map(c=>`<button class="chip ${c===category?"active":""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
  $$(".chip").forEach(b=>b.onclick=()=>{category=b.dataset.c;renderLibrary()});
  let q=($("#phraseSearch")?.value||"").toLowerCase();
  $("#phraseList").innerHTML=all().filter(p=>(category==="All"||p.cat===category)&&(`${p.en} ${p.fr}`.toLowerCase().includes(q))).map(p=>`<div class="phrase-card"><div class="en">${esc(p.en)}</div><div class="fr">${esc(p.fr)}</div><div class="phrase-foot"><span class="status-dot">${pg(p.id).box>=2?"Strong":pg(p.id).correct_count?"Learning":"New"} · ${esc(p.cat)}</span><button class="tiny-audio" data-s="${esc(p.en)}">🔊</button></div></div>`).join("");
  $$(".tiny-audio").forEach(b=>b.onclick=()=>say(b.dataset.s))
}
function renderProfile(){
  if(!profile)return;$("#profileAvatar").textContent=profile.avatar;$("#profileName").textContent=profile.display_name;$("#profileUsername").textContent="@"+profile.username;
  let l=lvl(totalXp),base=(l-1)*(l-1)*140,next=l*l*140;$("#profileLevel").textContent="Level "+l;$("#profileXP").textContent=totalXp+" XP";$("#profileLevelBar").style.width=Math.min(100,(totalXp-base)/(next-base)*100)+"%";
  $("#profileLessons").textContent=events;$("#profileSpoken").textContent=Object.values(progress).filter(x=>x.spoken_count>0).length;$("#profileStrong").textContent=Object.values(progress).filter(x=>x.box>=2).length;$("#profileStreak").textContent="1"
}
function closeModal(){$("#modal").classList.add("hidden")}
function addPhrase(){
  $("#modalSheet").innerHTML=`<span class="eyebrow">PERSONAL PHRASE</span><h2>I wanted to say…</h2><label>English<textarea id="en"></textarea></label><label>French<textarea id="fr"></textarea></label><div class="modal-actions"><button class="primary" id="savep"><span>Add to my English</span><b>＋</b></button><button class="secondary" id="cancel">Cancel</button></div>`;
  $("#modal").classList.remove("hidden");$("#cancel").onclick=closeModal;
  $("#savep").onclick=async()=>{let english=$("#en").value.trim(),french=$("#fr").value.trim();if(!english||!french)return toast("Add both fields");let{data,error}=await sb.from("custom_phrases").insert({user_id:session.user.id,english,french}).select().single();if(error)return toast(error.message);custom.push(data);closeModal();renderLibrary();toast("Phrase added ✦")}
}

function bind(){
  renderAv();$$("#authTabs .seg").forEach(b=>b.onclick=()=>authTab(b.dataset.auth));
  $("#loginForm").onsubmit=login;$("#signupForm").onsubmit=signup;
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $("#continueBtn").onclick=$("#quietStart").onclick=$("#quietStart2").onclick=startQuiet;
  $("#speakStart").onclick=$("#speakStart2").onclick=startSpeak;
  $("#quickStart").onclick=$("#quickStart2").onclick=startQuick;
  $("#refreshLeague").onclick=league;
  $$(".league-tabs .seg").forEach((b,i)=>b.onclick=()=>{period=b.dataset.period;$$(".league-tabs .seg").forEach(x=>x.classList.toggle("active",x===b));$(".league-tabs").dataset.index=i?1:0;league()});
  $("#phraseSearch").oninput=renderLibrary;
  $("#addPhraseBtn").onclick=addPhrase;
  $("#logoutBtn").onclick=()=>sb.auth.signOut();
  $("#editProfileBtn").onclick=()=>toast("Profile editing coming next.");
}
bind();sb.auth.onAuthStateChange((_e,s)=>{session=s;enter()});enter();
