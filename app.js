'use strict';
const sounds=window.ANDO_SOUNDS, $=s=>document.querySelector(s);
let enabled=[true,false,false,false], volumes=[70,45,45,40], running=false, ctx, master, nodes=[], elapsed=0, endAt=0, busy=false;
const audioFiles=sounds.map(s=>{if(!s.src)return null;const a=new Audio(s.src);a.loop=true;return a;});
$('#tracks').innerHTML=sounds.map((s,i)=>`<div class="track"><button class="track-toggle" data-track="${i}" aria-pressed="${enabled[i]}"><em aria-hidden="true">${s.icon}</em><span>${s.name}<small>${s.english}</small></span></button><input aria-label="${s.name} 음량" data-volume="${i}" type="range" min="0" max="100" value="${volumes[i]}"><output id="vol-${i}">${volumes[i]}</output></div>`).join('');
$('.wave').innerHTML=Array.from({length:49},(_,i)=>`<i style="--h:${8+Math.sin(i*1.8)**2*28}px;--d:${-i*.17}s"></i>`).join('');
function status(t){$('#status').textContent=t;}
function buildAudio(){
 ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);
 const buffer=ctx.createBuffer(1,ctx.sampleRate*8,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*4;}
 sounds.forEach((s,i)=>{const gain=ctx.createGain();gain.gain.value=0;gain.connect(master);nodes.push(gain);if(s.src)return;const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type=i===3?'highpass':'lowpass';filter.frequency.value=[950,1900,380,1200][i];noise.connect(filter);const swell=ctx.createGain();swell.gain.value=[.4,.12,.35,.5][i];filter.connect(swell);swell.connect(gain);const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=[.13,.06,.09,.19][i];depth.gain.value=[.25,.03,.2,.07][i];lfo.connect(depth);depth.connect(swell.gain);noise.start(i*.04);lfo.start();});
 setInterval(()=>{if(!running||!enabled[1]||sounds[1].src)return;const now=ctx.currentTime;for(let k=0;k<3;k++){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(2200+k*180,now+k*.2);o.frequency.exponentialRampToValueAtTime(3500-k*110,now+k*.2+.08);g.gain.setValueAtTime(0,now+k*.2);g.gain.linearRampToValueAtTime(.045,now+k*.2+.02);g.gain.exponentialRampToValueAtTime(.0001,now+k*.2+.16);o.connect(g);g.connect(nodes[1]);o.start(now+k*.2);o.stop(now+k*.2+.18);o.onended=()=>{o.disconnect();g.disconnect();};}},2800);
}
function update(){
 document.querySelectorAll('[data-track]').forEach(b=>b.setAttribute('aria-pressed',String(enabled[+b.dataset.track])));
 if(master)master.gain.setTargetAtTime(+$('#master').value/100,ctx.currentTime,.12);
 sounds.forEach((s,i)=>{if(nodes[i])nodes[i].gain.setTargetAtTime(enabled[i]?volumes[i]/100:0,ctx.currentTime,.15);if(audioFiles[i])audioFiles[i].volume=enabled[i]?volumes[i]/100*(+$('#master').value/100):0;});
 const chosen=enabled.flatMap((on,i)=>on?[i]:[]);$('#mix-title').textContent=chosen.length>1?'나만의 안도 사운드트랙':chosen.length?sounds[chosen[0]].title:'듣고 싶은 소리를 골라주세요';
 $('#mode').textContent=chosen.some(i=>!sounds[i].src)?'체험용 사운드':'섬의 사운드';
 $('.demo-note').hidden=!chosen.some(i=>!sounds[i].src);
 $('#play').textContent=running?'Ⅱ':'▶';$('#play').setAttribute('aria-label',running?'일시정지':'재생');document.body.classList.toggle('playing',running);$('#master-value').textContent=$('#master').value+'%';
}
async function pause(){running=false;audioFiles.forEach(a=>a?.pause());if(ctx)await ctx.suspend();update();}
async function play(){if(busy)return;busy=true;try{if(running){await pause();status('잠시 쉬어 가는 중입니다.');return;}if(!enabled.some(Boolean)){enabled[0]=true;}if(!ctx)buildAudio();await ctx.resume();await Promise.all(audioFiles.map((a,i)=>a&&enabled[i]?a.play():Promise.resolve()));running=true;update();status('지금, 안도의 소리와 함께하고 있어요.');}catch(e){await pause();status('소리를 열지 못했어요. 음원 경로와 브라우저 설정을 확인해 주세요.');}finally{busy=false;}}
$('#play').addEventListener('click',play);
document.querySelectorAll('[data-track]').forEach(b=>b.addEventListener('click',async()=>{const i=+b.dataset.track;enabled[i]=!enabled[i];if(audioFiles[i]){if(running&&enabled[i]){try{await audioFiles[i].play();}catch{enabled[i]=false;status('이 음원을 열 수 없어요. 파일 경로를 확인해 주세요.');}}else audioFiles[i].pause();}update();if(!enabled.some(Boolean))await pause();}));
document.querySelectorAll('[data-volume]').forEach(r=>r.addEventListener('input',()=>{const i=+r.dataset.volume;volumes[i]=+r.value;$('#vol-'+i).textContent=r.value;update();}));
$('#master').addEventListener('input',update);
$('#timer').addEventListener('change',()=>{endAt=+$('#timer').value?Date.now()+(+$('#timer').value*60000):0;status(endAt?`${$('#timer').value}분 후 소리가 멈춥니다.`:'종료 타이머를 해제했어요.');});
setInterval(()=>{if(running)elapsed++;$('#elapsed').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;if(endAt&&Date.now()>=endAt){endAt=0;$('#timer').value='0';pause();status('설정한 시간이 지나 재생을 마쳤어요.');}},1000);
$('#save').addEventListener('click',()=>{try{localStorage.setItem('ando-mix',JSON.stringify({enabled,volumes,master:+$('#master').value}));status('이 브라우저에 나만의 소리 조합을 저장했어요.');$('#save').textContent='♥ 저장 완료';}catch{status('브라우저가 저장을 허용하지 않아요.');}});
$('#restore').addEventListener('click',async()=>{try{const raw=localStorage.getItem('ando-mix');if(!raw){status('아직 저장한 조합이 없어요. 먼저 조합을 저장해 주세요.');location.hash='sounds';return;}const m=JSON.parse(raw);if(!Array.isArray(m.enabled)||m.enabled.length!==4||!Array.isArray(m.volumes)||m.volumes.length!==4||!m.volumes.every(v=>Number.isFinite(v)&&v>=0&&v<=100)||!Number.isFinite(m.master))throw Error();await pause();enabled=m.enabled.map(Boolean);volumes=m.volumes;$('#master').value=m.master;document.querySelectorAll('[data-volume]').forEach(r=>{r.value=volumes[+r.dataset.volume];$('#vol-'+r.dataset.volume).textContent=r.value;});update();status('저장한 조합을 불러왔어요. 재생 버튼을 눌러주세요.');location.hash='sounds';}catch{status('저장한 조합을 불러올 수 없어요.');location.hash='sounds';}});
update();
