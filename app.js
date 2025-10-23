/* -------------------- Config Canvas -------------------- */
const canvas = document.getElementById('staff');
const ctx = canvas.getContext('2d');
const feedbackEl = document.getElementById('feedback');
const optionsWrap = document.getElementById('options');
const clefSelect = document.getElementById('clef');
const newBtn = document.getElementById('newBtn');
const playBtn = document.getElementById('playBtn');

let currentMidi = null;
let currentClef = clefSelect.value || 'treble';

/* -------------------- Datos musicales -------------------- */
const NOTE_BASE = { 'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11 };
function noteNameToMidi(name){
  const m = name.match(/^([A-G]#?)(\d)$/);
  if(!m) return null;
  const pitch = m[1], octave = parseInt(m[2],10);
  return (octave+1)*12 + NOTE_BASE[pitch];
}
function midiToNoteName(midi){
  const octave = Math.floor(midi/12)-1;
  const ordered = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return ordered[midi%12] + octave;
}

/* -------------------- Canvas responsive -------------------- */
function resizeCanvas(){
  canvas.width = canvas.clientWidth;
  canvas.height = 220;
}
window.addEventListener('resize',()=>{ resizeCanvas(); if(currentMidi) drawNoteAt(currentMidi); else drawStaff(); });
resizeCanvas();

/* -------------------- Layout pentagrama -------------------- */
let staffTop = 40;
let lineGap = 18;
const staffLines = 5;
const VISIBLE_MARGIN = 20; // margen superior/inferior en px

// Calcular staffTop centrado verticalmente
function computeStaffTop() {
  const staffHeight = (staffLines - 1) * lineGap;
  const totalHeight = staffHeight + 2*lineGap*2; // 2 líneas ledger arriba y abajo
  staffTop = (canvas.height - totalHeight)/2 + 2*lineGap; 
}

/* Posiciones predefinidas para pentagrama */
const NOTE_POS = {
  treble: {'F3':7,'F#3':7,'G3':6.5,'G#3':6.5,'A3':6,'A#3':6,'B3':5.5,'C4':5,'C#4':5,'D4':4.5,'D#4':4.5,'E4':4,'F4':3.5,'F#4':3.5,'G4':3,'G#4':3,'A4':2.5,'A#4':2.5,'B4':2,'C5':1.5,'C#5':1.5,'D5':1,'D#5':1,'E5':0.5,'F5':0,'F#5':0,'G5':-0.5,'G#5':-0.5,'A5':-1,'A#5':-1,'B5':-1.5,'C6':-2,'C#6':-2,'D6':-2},
  bass: {'G1':7,'G#1':7,'A1':6.5,'A#1':6.5,'B1':6,'C2':5.5,'C#2':5.5,'D2':5,'D#2':5,'E2':4,'F2':3.5,'F#2':3.5,'G2':3,'G#2':3,'A2':2.5,'A#2':2.5,'B2':2,'C3':1.5,'C#3':1.5,'D3':1,'D#3':1,'E3':0.5,'F3':0,'F#3':0,'G3':-0.5,'G#3':-0.5,'A3':-1,'A#3':-1,'B3':-1.5,'C4':-2}
};

/* -------------------- Audio -------------------- */
let audioCtx=null;
function ensureAudio(){ 
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); 
}
document.body.addEventListener('touchstart',()=>ensureAudio(),{once:true});
document.body.addEventListener('click',()=>ensureAudio(),{once:true});

function playSound(correct=true){
  ensureAudio();
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type='sine';
  o.frequency.value=correct?880:220;
  o.connect(g); g.connect(audioCtx.destination);
  const now=audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001,now);
  g.gain.exponentialRampToValueAtTime(0.15, now+0.02);
  o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now+0.5);
  o.stop(now+0.55);
}

/* -------------------- Dibujos pentagrama y notas -------------------- */
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }

function drawStaff(clef=currentClef){
  computeStaffTop();
  clearCanvas();
  ctx.strokeStyle='#111'; ctx.lineWidth=1.2;
  const startX=60, endX=canvas.width-40;
  for(let i=0;i<staffLines;i++){
    const y=staffTop + i*lineGap;
    ctx.beginPath(); ctx.moveTo(startX,y); ctx.lineTo(endX,y); ctx.stroke();
  }
  ctx.font='44px serif'; ctx.fillStyle='#111';
  if(clef==='treble') ctx.fillText('𝄞', startX-12, staffTop + 2*lineGap +10);
  else ctx.fillText('𝄢', startX-18, staffTop +2*lineGap +12);
}

function midiToY(midi, clef=currentClef){
  const name = midiToNoteName(midi);
  let pos = NOTE_POS[clef][name];
  if(pos===undefined){
    const bottomLineY = staffTop + (staffLines - 1) * lineGap;
    const refMidi = clef==='treble'?noteNameToMidi('E4'):noteNameToMidi('G2');
    pos = (bottomLineY - ((midi - refMidi)/2*lineGap) - staffTop)/lineGap;
  }
  let y = staffTop + pos*lineGap;
  if(y < VISIBLE_MARGIN) y = VISIBLE_MARGIN;
  if(y > canvas.height - VISIBLE_MARGIN) y = canvas.height - VISIBLE_MARGIN;
  return y;
}

function drawLedgerLines(midi,cx){
  const y=midiToY(midi); const topLineY=staffTop; const bottomLineY=staffTop+(staffLines-1)*lineGap;
  ctx.strokeStyle='#111'; ctx.lineWidth=1.6;
  if(y<topLineY){ let startY=topLineY-lineGap; while(startY>=y){ ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY-=lineGap; } }
  if(y>bottomLineY){ let startY=bottomLineY+lineGap; while(startY<=y){ ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY+=lineGap; } }
}

function drawNoteAt(midi){
  drawStaff(currentClef);
  const cx=canvas.width/2; const y=midiToY(midi);
  drawLedgerLines(midi,cx);
  ctx.fillStyle='#111'; ctx.beginPath();
  ctx.save(); ctx.translate(cx,y); ctx.scale(1.6,1); ctx.arc(0,0,6,0,2*Math.PI); ctx.fill(); ctx.restore();
  const midStaff=staffTop+(staffLines-1)*lineGap/2;
  const stemUp=y>=midStaff; ctx.strokeStyle='#111'; ctx.lineWidth=2;
  ctx.beginPath(); if(stemUp) ctx.moveTo(cx+9,y), ctx.lineTo(cx+9,y-40); else ctx.moveTo(cx-9,y), ctx.lineTo(cx-9,y+40); ctx.stroke();
  const name=midiToNoteName(midi);
  if(name.includes('#')){ ctx.font='18px serif'; ctx.fillText('#', cx-30, y+6); }
}

/* -------------------- Opciones -------------------- */
const NOTE_LETTERS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function buildOptions(){
  optionsWrap.innerHTML='';
  NOTE_LETTERS.forEach(n=>{
    const b=document.createElement('button'); 
    b.className='note-btn'; 
    b.textContent=n; 
    b.dataset.note=n;
    b.addEventListener('click',()=>handleAnswer(n,b));
    optionsWrap.appendChild(b);
  });
}

/* -------------------- Manejo respuesta -------------------- */
function handleAnswer(chosen,button){
  if(currentMidi===null) return;
  const actual=midiToNoteName(currentMidi).replace(/\d/,'');
  if(actual===chosen){
    feedbackEl.innerHTML=`<span class="good">✓ Correcto — ${midiToNoteName(currentMidi)}</span>`;
    playSound(true);
    button.classList.add('pop');
    setTimeout(()=>button.classList.remove('pop'),300);
    setTimeout(newNote,600);
  } else {
    feedbackEl.innerHTML=`<span class="bad">✗ Incorrecto — era ${midiToNoteName(currentMidi)}</span>`;
    playSound(false);
    button.classList.add('shake');
    setTimeout(()=>button.classList.remove('shake'),300);
  }
}

/* -------------------- Generación notas -------------------- */
function randomMidiInRange(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

const TREBLE_MIN_MIDI = noteNameToMidi('F3');
const TREBLE_MAX_MIDI = noteNameToMidi('D6');
const BASS_MIN_MIDI = noteNameToMidi('G1');
const BASS_MAX_MIDI = noteNameToMidi('C4');

function generateRandomForClef(clef){ 
  if(clef==='treble') return randomMidiInRange(TREBLE_MIN_MIDI, TREBLE_MAX_MIDI);
  else return randomMidiInRange(BASS_MIN_MIDI, BASS_MAX_MIDI);
}

/* -------------------- UI / Eventos -------------------- */
function newNote(){ currentMidi=generateRandomForClef(currentClef); drawNoteAt(currentMidi); feedbackEl.textContent=''; }
function playCurrent(){ if(currentMidi===null) return; playSound(true); }

clefSelect.addEventListener('change',e=>{ currentClef=e.target.value; if(currentMidi!==null) drawNoteAt(currentMidi); else drawStaff(currentClef); });
newBtn.addEventListener('click',newNote);
playBtn.addEventListener('click',playCurrent);

/* -------------------- Inicialización -------------------- */
buildOptions();
drawStaff(currentClef);
newNote();
