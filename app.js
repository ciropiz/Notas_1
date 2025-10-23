/* Entrenador de lectura musical — responsive y sonidos fijos */

const canvas = document.getElementById('staff');
const ctx = canvas.getContext('2d');
const feedbackEl = document.getElementById('feedback');
const optionsWrap = document.getElementById('options');
const clefSelect = document.getElementById('clef');
const newBtn = document.getElementById('newBtn');
const playBtn = document.getElementById('playBtn');

let currentMidi = null;
let currentClef = clefSelect.value || 'treble';

/* Datos musicales */
const NOTE_BASE = { 'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11 };
const MIN_MIDI = 36;
const MAX_MIDI = 83;

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

/* Canvas responsive */
function resizeCanvas(){
  canvas.width = canvas.clientWidth;
  canvas.height = 220;
}
window.addEventListener('resize',()=>{ resizeCanvas(); if(currentMidi) drawNoteAt(currentMidi); else drawStaff(); });
resizeCanvas();

/* Layout del pentagrama */
let staffTop = 40;
let lineGap = 18;
const staffLines = 5;

/* Posiciones exactas (solo para notas comunes) */
const NOTE_POS = {
  treble: {'C4':5,'C#4':5,'D4':4.5,'D#4':4.5,'E4':4,'F4':3.5,'F#4':3.5,'G4':3,'G#4':3,'A4':2.5,'A#4':2.5,'B4':2,'C5':1.5,'C#5':1.5,'D5':1,'D#5':1,'E5':0.5,'F5':0,'F#5':0},
  bass: {'E2':5,'F2':4.5,'F#2':4.5,'G2':4,'G#2':4,'A2':3.5,'A#2':3.5,'B2':3,'C3':2.5,'C#3':2.5,'D3':2,'D#3':2,'E3':1.5,'F3':1,'F#3':1,'G3':0.5,'A3':0,'A#3':0}
};

/* Audio: dos sonidos fijos */
let audioCtx=null;
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }

/* Intento de reanudar el AudioContext en la primera interacción explícita del usuario
   para sortear políticas de autoplay en algunos navegadores. */
function resumeAudioOnFirstInteraction(){
  ensureAudio();
  if(!audioCtx) return;
  const resume = ()=> {
    if(audioCtx.state === 'suspended') {
      audioCtx.resume().catch(()=>{ /* ignore */ });
    }
  };
  // reanudar en el primer clic o toque; se ejecuta solo una vez
  document.addEventListener('click', resume, { once: true, passive: true });
  document.addEventListener('touchstart', resume, { once: true, passive: true });
}
resumeAudioOnFirstInteraction();

/* Reproducir sonido (asegurando resume() si el contexto está suspendido) */
function playSound(correct=true){
  ensureAudio();

  const doPlay = ()=>{
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    o.type='sine';
    o.frequency.value=correct?880:220; // agudo para correcto, grave para error
    o.connect(g); g.connect(audioCtx.destination);
    const now=audioCtx.currentTime;
    // usar valores > 0 para exponentialRamp
    g.gain.setValueAtTime(0.0001,now);
    g.gain.exponentialRampToValueAtTime(0.15, now+0.02);
    o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now+0.5);
    o.stop(now+0.55);
  };

  if(!audioCtx) {
    // si por alguna razón no se pudo crear, no hacer nada
    return;
  }

  if(audioCtx.state === 'suspended'){
    // reanudar antes de reproducir (los navegadores requieren interacción del usuario)
    audioCtx.resume().then(doPlay).catch(err=>{
      console.warn('No se pudo reanudar AudioContext:', err);
      // intentar reproducir de todas formas
      try{ doPlay(); }catch(e){ /* no más remedio */ }
    });
  } else {
    doPlay();
  }
}

/* Dibujar pentagrama */
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
function drawStaff(clef=currentClef){
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

/* Posición vertical de nota */
function midiToY(midi,clef=currentClef){
  const name=midiToNoteName(midi);
  const pos=NOTE_POS[clef][name];
  if(pos!==undefined) return staffTop + lineGap*pos;
  const bottomLineY=staffTop+(staffLines-1)*lineGap;
  const refMidi=clef==='treble'?noteNameToMidi('E4'):noteNameToMidi('G2');
  return bottomLineY-(midi-refMidi)/2*lineGap;
}

/* Ledger lines */
function drawLedgerLines(midi,cx){
  const y=midiToY(midi); const topLineY=staffTop; const bottomLineY=staffTop+(staffLines-1)*lineGap;
  ctx.strokeStyle='#111'; ctx.lineWidth=1.6;
  if(y<topLineY){ let startY=topLineY-lineGap; while(startY>=y){ ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY-=lineGap; } }
  if(y>bottomLineY){ let startY=bottomLineY+lineGap; while(startY<=y){ ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY+=lineGap; } }
}

/* Dibujo nota */
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

/* Botones */
const NOTE_LETTERS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function buildOptions(){
  optionsWrap.innerHTML='';
  NOTE_LETTERS.forEach(n=>{
    const b=document.createElement('button'); b.className='note-btn'; b.textContent=n; b.dataset.note=n;
    b.addEventListener('click',()=>handleAnswer(n));
    optionsWrap.appendChild(b);
  });
}

/* Manejo respuesta */
function handleAnswer(chosen){
  if(currentMidi===null) return;
  const actual=midiToNoteName(currentMidi).replace(/\d/,'');
  if(actual===chosen){
    feedbackEl.innerHTML=`<span class="good">✓ Correcto — ${midiToNoteName(currentMidi)}</span>`;
    playSound(true);
    setTimeout(newNote,600);
  } else {
    feedbackEl.innerHTML=`<span class="bad">✗ Incorrecto — era ${midiToNoteName(currentMidi)}</span>`;
    playSound(false);
  }
}

/* Generación nota aleatoria */
function randomMidiInRange(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function generate
