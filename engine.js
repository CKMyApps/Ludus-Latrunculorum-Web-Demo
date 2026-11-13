const Engine = (() => {
  const side = p => Math.sign(p);
  const directions = [[1,0],[-1,0],[0,1],[0,-1]];
  function step(i, dx, dy) {
    const x=i%8+dx, y=(i>>3)+dy;
    return x>=0 && x<8 && y>=0 && y<8 ? y*8+x : -1;
  }
  const adjacent = i => directions.map(d=>step(i,...d)).filter(j=>j>=0);
  function destinations(board, from) {
    const out=[];
    for (const dir of directions) {
      for(let j=step(from,...dir);j>=0 && !board[j];j=step(j,...dir)) out.push(j);
    }
    return out;
  }
  const key = (board,turn) => turn + ':' + board.join(',');
  function initial() {
    const board=Array(64).fill(0);
    board.fill(-1,0,8); board.fill(1,56); board[11]=-2; board[52]=2;
    return {board,turn:1,quiet:0,plies:0,seen:{[key(board,1)]:1},result:null};
  }
  const moves = ({board,turn}) => board.flatMap((p,i)=>side(p)===turn ? destinations(board,i).map(j=>[i,j]) : []);
  const count = (board,owner) => board.filter(p=>p===owner).length;
  function apply(state, from, to) {
    const {turn}=state;
    if(state.result || !Number.isInteger(from) || !Number.isInteger(to) || side(state.board[from])!==turn ||
       !destinations(state.board,from).includes(to)) return null;
    const board=state.board.slice();
    board[to]=board[from]; board[from]=0;
    const captured=new Set();
    for (const dir of directions) {
      const victim=step(to,...dir);
      if(victim>=0 && board[victim]===-turn && side(board[step(victim,...dir)])===turn) captured.add(victim);
    }
    for (const corner of [0,7,56,63]) {
      const neighbors=adjacent(corner);
      if(board[corner]===-turn && neighbors.includes(to) && neighbors.every(i=>side(board[i])===turn)) captured.add(corner);
    }
    for(const i of captured) board[i]=0;
    const next={board,turn:-turn,quiet:captured.size?0:state.quiet+1,plies:state.plies+1,seen:state.seen,result:null};
    for (const owner of [turn,-turn]) {
      if(!destinations(board,board.indexOf(owner*2)).length) {
        next.result={winner:-owner,reason:'The Dux has no open path.'}; return next;
      }
    }
    const position=key(board,next.turn), visits=(state.seen[position]||0)+1;
    next.seen={...state.seen,[position]:visits};
    if(visits>=3 || next.quiet>=100 || next.plies>=500) {
      const reason=visits>=3?'The same position occurred three times.':next.quiet>=100?'100 turns passed without a capture.':'The match reached its move limit.';
      next.result={winner:side(count(board,1)-count(board,-1)),reason:reason+' Remaining soldiers decide the match.'};
    }
    return next;
  }
  function score(state,owner) {
    if(state.result) return state.result.winner*owner*100000;
    const {board}=state;
    const position = side => {
      const exits=adjacent(board.indexOf(side*2)).filter(i=>!board[i]).length;
      return count(board,side)*140 + exits*26 - (exits===1?95:0) +
        board.reduce((v,p,i)=>v+(p===side ? Math.min(i%8,7-i%8)+Math.min(i>>3,7-(i>>3)) : 0),0);
    };
    return position(owner)-position(-owner);
  }
  function choose(state) {
    const owner=state.turn;
    let best=null, high=-Infinity;
    for(const m of moves(state)) {
      const next=apply(state,...m);
      if(next.result?.winner===owner) return m;
      const replies=moves(next);
      let worst=score(next,owner);
      if(!next.result && replies.length) {
        worst=Infinity;
        for(const reply of replies) {
          worst=Math.min(worst,score(apply(next,...reply),owner));
          if(worst*10+2<high) break;
        }
      }
      const rank=worst*10 + Math.max(-2,Math.min(2,score(next,owner)/80));
      if(rank>high) { high=rank; best=m; }
    }
    return best;
  }
  return {initial,apply,choose,destinations,moves,count};
})();
