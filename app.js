const $ = id => document.getElementById(id);
const storageKey='ckmyapps.latrunculi.demo.v1';
let transcript=null, state=Engine.initial(), selected=-1, timer=null;
let storageAvailable=true;
try {
  const data=JSON.parse(localStorage.getItem(storageKey));
  if(Array.isArray(data) && data.length<=500) {
    transcript=[];
    for(const move of data) {
      if(!Array.isArray(move) || move.length!==2) break;
      const next=Engine.apply(state,...move);
      if(!next) break;
      state=next; transcript.push(move);
    }
  }
} catch { storageAvailable=false; }

const squares=Array.from({length:64},(_,i)=>{
  const button=document.createElement('button');
  button.type='button';
  button.addEventListener('click',()=>playSquare(i));
  button.addEventListener('keydown',event=>{
    const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(!shifts[event.key]) return;
    event.preventDefault();
    const [dx,dy]=shifts[event.key], x=i%8+dx, y=(i>>3)+dy;
    if(x>=0 && x<8 && y>=0 && y<8) squares[y*8+x].focus();
  });
  $('board').append(button);
  return button;
});
function persist() {
  try { localStorage.setItem(storageKey,JSON.stringify(transcript)); }
  catch { storageAvailable=false; }
}
function updateMenu() {
  $('start-label').textContent=state.result?'View Result':transcript?'Continue Game':'New Game';
  $('notice').textContent=state.result?'Your demo match is complete.':transcript?'Your match is in progress.':'One match against the computer.';
}
function render() {
  const {board,turn,result}=state;
  const legal=selected<0?[]:Engine.destinations(board,selected);
  const last=transcript?.at(-1)??[];
  const label=result?'Match complete':turn===1?'Your turn · Ivory':'Computer’s turn · Black';
  $('status').textContent=label;
  $('score').textContent=Engine.count(board,1)+' ivory · '+Engine.count(board,-1)+' black';
  $('move-hint').textContent=result?'':!storageAvailable?'Browser storage is unavailable. Keep this tab open to finish the match.':
    turn===1?'Select an ivory piece, then a marked square.':'The computer is choosing a move…';
  for(const [i,square] of squares.entries()) {
    const p=board[i], isLegal=legal.includes(i);
    square.className=['square',(i%8+(i>>3))%2?'alt':'',i===selected?'selected':'',isLegal?'legal':'',last.includes(i)?'last':''].filter(Boolean).join(' ');
    const location=String.fromCharCode(65+i%8)+(8-(i>>3));
    const piece=p?(p>0?'ivory ':'black ')+(Math.abs(p)===2?'Dux':'soldier'):'empty';
    square.setAttribute('aria-label',location+', '+piece+(isLegal?', legal destination':''));
    square.setAttribute('aria-pressed',String(i===selected));
    square.replaceChildren();
    if(p) {
      const token=document.createElement('span');
      token.className='piece '+(p>0?'ivory':'obsidian')+(Math.abs(p)===2?' dux':'');
      token.setAttribute('aria-hidden','true');
      if(Math.abs(p)===2) for(let face=0;face<3;face++) token.append(document.createElement('i'));
      square.append(token);
    }
  }
  $('outcome').hidden=!result;
  if(result) {
    $('result').textContent=result.winner===1?'You Win':result.winner===-1?'Computer Wins':'Draw';
    $('reason').textContent=result.reason;
  }
}
function commit(move) {
  const next=Engine.apply(state,...move);
  if(!next) return;
  state=next; selected=-1; transcript.push(move);
  persist(); render(); updateMenu();
  if(state.result) $('result').focus();
  else queueComputer();
}
function queueComputer() {
  if(timer!==null || state.result || state.turn!==-1 || $('game').hidden) return;
  timer=setTimeout(()=>{
    timer=null;
    if($('game').hidden || state.result || state.turn!==-1) return;
    const move=Engine.choose(state);
    if(move) commit(move);
  },260);
}
function playSquare(i) {
  if(state.result || state.turn!==1) return;
  if(state.board[i]>0) {
    selected=selected===i?-1:i; render(); return;
  }
  if(selected>=0 && Engine.destinations(state.board,selected).includes(i)) commit([selected,i]);
}
$('start').onclick=()=>{
  if(transcript===null) { transcript=[]; persist(); }
  $('menu').hidden=true; $('game').hidden=false;
  render(); queueComputer();
  if(state.result) $('result').focus(); else $('menu-back').focus();
};
$('menu-back').onclick=()=>{
  clearTimeout(timer); timer=null; selected=-1;
  $('game').hidden=true; $('menu').hidden=false; updateMenu(); $('start').focus();
};
for(const button of document.querySelectorAll('[data-full]')) {
  button.onclick=()=>{ $('notice').textContent=button.dataset.full+' is available in the full game.'; };
}
for(const id of ['rules','game-rules']) $(id).onclick=()=>$('rules-dialog').showModal();
updateMenu();
