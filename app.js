const canvas=document.getElementById('staff'),
      ctx=canvas.getContext('2d'),
      feedbackEl=document.getElementById('feedback'),
      optionsWrap=document.getElementById('options'),
      clefSelect=document.getElementById('clef'),
      newBtn=document.getElementById('newBtn'),
      playBtn=document.getElementById('playBtn');

let currentMidi=null,
    currentClef=clefSelect.value||'treble',
    audioCtx=null;

const NOTE_BASE={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11},
      NOTE_LETTERS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],
      MIN_MIDI=48, // C3
      MAX_MIDI=76; // E5
const lineGap=18, staffTop=38, staffLines=5, semitoneHeight=lineGap/2;

const CLEF_REF={
  treble:{bottomLineMidi:noteNameToMidi('E4')},
  bass:{bottomLineMidi:noteNameToMidi('G2')}
};

function noteNameToMidi(name){const m=name.match(/^([A-G]#?)(\d)$/); if(!m)return null; return (parseInt(m[2])+1)*12+NOTE_BASE[m[1]];}
function midiToNoteName(m){const octave=Math.floor(m/12)-1; const pitches=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; return pitches[m%12]+octave;}

function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();}
function playSound(correct=true){ensureAudio(); const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type='sine'; o.frequency.value=correct?880:220; o.connect(g); g.connect(audioCtx.destination); const now=audioCtx.currentTime; g.gain.setValueAtTime(0.0001,now); g.gain.exponentialRampToValueAtTime(0.18,now+0.02); o.start(now); g.gain.exponentialRampToValueAtTime(0.0001,now+0.6); o.stop(now+0.65);}

function midiToY(midi,clef=currentClef){
  const bottomLineY=staffTop+(staffLines-1)*lineGap+40;
  const refMidi=CLEF_REF[clef].bottomLineMidi;
  const diff=midi-refMidi;
  return bottomLineY-diff*semitoneHeight;
}

function drawStaff(clef=currentClef){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#111'; ctx.lineWidth=1.2;
  const startX=60, endX=canvas.width-40, topY=staffTop+40;
  for(let i=0;i<staffLines;i++){const y=topY+i*lineGap; ctx.beginPath(); ctx.moveTo(startX,y); ctx.lineTo(endX,y); ctx.stroke();}
  ctx.font='44px serif'; ctx.fillStyle='#111';
  if(clef==='treble') ctx.fillText('𝄞',startX-12,topY+2*lineGap+10);
  else ctx.fillText('𝄢',startX-18,topY+2*lineGap+12);
}

function drawLedgerLines(midi,cx){
  const topY=staffTop+40, bottomY=topY+(staffLines-1)*lineGap, y=midiToY(midi);
  ctx.strokeStyle='#111'; ctx.lineWidth=1.6;
  if(y<topY-4){let startY=topY-lineGap; while(startY>=y-4){ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY-=lineGap;}}
  if(y>bottomY+4){let startY=bottomY+lineGap; while(startY<=y+4){ctx.beginPath(); ctx.moveTo(cx-20,startY); ctx.lineTo(cx+20,startY); ctx.stroke(); startY+=lineGap;}}
}

function drawNoteAt(midi){
  drawStaff(currentClef);
  const cx=canvas.width/2, y=midiToY(midi);
  drawLedgerLines(midi,cx);
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.save(); ctx.translate(cx,y); ctx.scale(1.6,1); ctx.arc(0,0,6,0,2*Math.PI); ctx.fill(); ctx.restore();
  const midStaff=(staffTop+40+staffTop+40+(staffLines-1)*lineGap)/2;
  const stemUp=y>=midStaff; ctx.strokeStyle='#111'; ctx.lineWidth=2;
  ctx.beginPath();
  if(stemUp){ctx.moveTo(cx+9,y); ctx.lineTo(cx+9,y-40);} else {ctx.moveTo(cx-9,y); ctx.lineTo(cx-9,y+40);}
  ctx.stroke();
  const name=midiToNoteName(midi); if(name.includes('#')){ctx.font='18px serif'; ctx.fillText('#',cx-30,y+6);}
}

function buildOptions(){
  optionsWrap.innerHTML='';
  NOTE_LETTERS.forEach(n=>{
    const b=document.createElement('button'); b.className='note-btn'; b.textContent=n; b.dataset.note=n;
    b.addEventListener('click',()=>handleAnswer(n,b));
    optionsWrap.appendChild(b);
  });
}

function handleAnswer(chosen,button){
  if(currentMidi===null)return;
  const actual=midiToNoteName(currentMidi).replace(/\d/,'').trim();
  const correct=actual===chosen;
  if(correct){feedbackEl.innerHTML=`<span class="good">✓ Correcto — ${midiToNoteName(currentMidi)}</span>`; playSound(true); button.classList.add('pop'); setTimeout(()=>button.classList.remove('pop'),300); newNote();}
  else{feedbackEl.innerHTML=`<span class="bad">✗ Incorrecto — era ${midiToNoteName(currentMidi)}</span>`; playSound(false); button.classList.add('shake'); setTimeout(()=>button.classList.remove('shake'),300);}
}

function randomMidiInRange(min, max){return Math.floor(Math.random()*(max-min+1))+min;}
function generateRandomForClef(clef){
  if(clef==='treble'){const min=Math.max(MIN_MIDI,noteNameToMidi('C4')); const max=Math.min(MAX_MIDI,noteNameToMidi('A5')); return randomMidiInRange(min,max);}
  else{const min=Math.max(MIN_MIDI,noteNameToMidi('E2')); const max=Math.min(MAX_MIDI,noteNameToMidi('C4')); return randomMidiInRange(min,max);}
}

function newNote(){currentMidi=generateRandomForClef(currentClef); drawNoteAt(currentMidi); feedbackEl.textContent='';}
function playCurrent(){if(currentMidi!==null) playSound(true);}

clefSelect.addEventListener('change',e=>{currentClef=e.target.value; newNote();});
newBtn.addEventListener('click',newNote);
playBtn.addEventListener('click',playCurrent);

/* -------------------- canvas resize -------------------- */
function resizeCanvas(){const w=canvas.clientWidth; canvas.width=w; canvas.height=Math.max(w/4,200); if(currentMidi) drawNoteAt(currentMidi); else drawStaff(currentClef);}
window.addEventListener('resize',resizeCanvas);
window.addEventListener('load',resizeCanvas);

buildOptions();
newNote();
