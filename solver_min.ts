
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIRS: [number, number, string][] = [
  [0, -1, 'u'],
  [0, 1, 'd'],
  [-1, 0, 'l'],
  [1, 0, 'r'],
];
type PushRec = { from: number; dir: number };
type Room = {
  cells: number[];            
  cellIdx: Map<number, number>;
  boxes: number[];            
  goals: Set<number>;         
  doorHall: number;           
  doorRoom: number;           
};
function walkPath(from: number, to: number, blocked: Set<number>, w: number, h: number, wall: boolean[]): string | null {
  if (from === to) return '';
  const prev = new Map<number, number>();
  const q = [from];
  prev.set(from, -1);
  while (q.length > 0) {
    const p = q.shift()!;
    for (const [dx, dy, letter] of DIRS) {
      const nx = (p % w) + dx, ny = Math.floor(p / w) + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (wall[n] || blocked.has(n) || prev.has(n)) continue;
      prev.set(n, p);
      if (n === to) {
        let path = '';
        for (let c = to; c !== from; c = prev.get(c)!) {
          const pp = prev.get(c)!;
          const dx2 = (c % w) - (pp % w), dy2 = Math.floor(c / w) - Math.floor(pp / w);
          path = DIRS.find(([a, b]) => a === dx2 && b === dy2)![2] + path;
        }
        return path;
      }
      q.push(n);
    }
  }
  return null;
}
function solveRoomFull(room: Room, w: number): PushRec[] | null {
  const cellIdx = room.cellIdx;
  const goals = room.goals;
  const cells = room.cells.slice();
  const hasDoor = room.doorHall !== room.doorRoom;
  const hallIdx = hasDoor ? cells.length : -1;
  if (hasDoor) cells.push(room.doorHall);
  const deltas = DIRS.map(([dx, dy]) => dy * w + dx);
  const idx = (c: number) => (hasDoor && c === room.doorHall) ? hallIdx : cellIdx.get(c) ?? -1;
  const isGoal = (c: number) => goals.has(c);
  const reach = (bset: Set<number>, p: number): Set<number> => {
    const seen = new Set<number>([p]);
    const q = [p];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const d of deltas) {
        const v = cells[u]! + d;
        const vi = idx(v);
        if (vi !== -1 && !bset.has(vi) && !seen.has(vi)) { seen.add(vi); q.push(vi); }
      }
    }
    return seen;
  };
  const key = (bs: number[], norm: number) => bs.join(',') + '|' + norm;
  const qBoxes: number[][] = [room.boxes.map(idx).sort((a, b) => a - b)];
  const qPlayer: number[] = [hasDoor ? hallIdx : idx(room.doorRoom)];
  const qParent: number[] = [-1];
  const qRec: (PushRec | null)[] = [null];
  const visited = new Map<string, number>();
  const r0 = reach(new Set(qBoxes[0]!), qPlayer[0]!);
  visited.set(key(qBoxes[0]!, Math.min(...r0)), 0);
  for (let head = 0; head < qBoxes.length; head++) {
    const bs = qBoxes[head]!;
    const p = qPlayer[head]!;
    if (bs.every((b) => isGoal(cells[b]))) {
      const recs: PushRec[] = [];
      for (let t = head; t > 0; t = qParent[t]!) recs.push(qRec[t]!);
      recs.reverse();
      return recs;
    }
    const bset = new Set(bs);
    const r = reach(bset, p);
    for (let bi = 0; bi < bs.length; bi++) {
      const b = bs[bi]!;
      for (let di = 0; di < 4; di++) {
        const target = cells[b]! + deltas[di]!;
        const ti = idx(target);
        if (ti === -1 || bset.has(ti)) continue;
        const from = cells[b]! - deltas[di]!;
        const fi = idx(from);
        if (fi === -1 || !r.has(fi)) continue;
        const nbs = bs.slice();
        nbs[bi] = ti;
        nbs.sort((a, b2) => a - b2);
        const nr = reach(new Set(nbs), b);
        const nkey = key(nbs, Math.min(...nr));
        if (visited.has(nkey)) continue;
        visited.set(nkey, qBoxes.length);
        qBoxes.push(nbs);
        qPlayer.push(b);
        qParent.push(head);
        qRec.push({ from, dir: di });
      }
    }
  }
  return null;
}
function solve(text: string): string {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const wall: boolean[] = [];
  const goals: number[] = [];
  const boxes: number[] = [];
  let player = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '#';
      const i = y * w + x;
      wall[i] = ch === '#';
      if ('.*+'.includes(ch)) goals.push(i);
      if ('$*'.includes(ch)) boxes.push(i);
      if ('@+'.includes(ch)) player = i;
    }
  });
  boxes.sort((a, b) => a - b);
  
  const hallRow = Math.floor(player / w);
  const onHall = (c: number) => Math.floor(c / w) === hallRow;
  const comp = new Map<number, number>();
  let nc = 0;
  for (let i = 0; i < w * h; i++) {
    if (wall[i] || onHall(i) || comp.has(i)) continue;
    const q = [i];
    comp.set(i, nc);
    while (q.length > 0) {
      const u = q.shift()!;
      for (const [dx, dy] of DIRS) {
        const x = (u % w) + dx, y = Math.floor(u / w) + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const v = y * w + x;
        if (!wall[v] && !onHall(v) && !comp.has(v)) { comp.set(v, nc); q.push(v); }
      }
    }
    nc++;
  }
  const byRegion = new Map<number, number[]>();
  for (const [c, r] of comp) {
    if (!byRegion.has(r)) byRegion.set(r, []);
    byRegion.get(r)!.push(c);
  }
  const rooms: Room[] = [];
  for (const [, cs] of byRegion) {
    cs.sort((a, b) => a - b);
    const cellIdx = new Map<number, number>(cs.map((c, i) => [c, i] as [number, number]));
    const rboxes = boxes.filter((b) => comp.get(b) === comp.get(cs[0]!));
    const goalsSet = new Set<number>();
    for (const g of goals) if (comp.get(g) === comp.get(cs[0]!)) goalsSet.add(g);
    const doors: [number, number][] = [];
    for (const c of cs) {
      for (const [dx, dy] of DIRS) {
        const v = (Math.floor(c / w) + dy) * w + (c % w) + dx;
        if (!wall[v] && onHall(v)) doors.push([v, c]);
      }
    }
    doors.sort((a, b) => a[0] - b[0]);
    rooms.push({ cells: cs, cellIdx, boxes: rboxes, goals: goalsSet, doorHall: doors[0]![0], doorRoom: doors[0]![1] });
  }
  rooms.sort((a, b) => a.doorHall - b.doorHall);
  const plans = rooms.map((room) => solveRoomFull(room, w));
  if (plans.some((p) => p === null)) return '';
  
  let out = '';
  let ppos = player;
  const boxSet = new Set(boxes);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]!;
    const recs = plans[ri]!;
    if (ppos !== room.doorHall) {
      const path = walkPath(ppos, room.doorHall, boxSet, w, h, wall);
      if (path === null) return '';
      out += path;
      ppos = room.doorHall;
    }
    
    
    
    const cur = new Set(room.boxes);
    for (const rec of recs) {
      const [dx, dy, letter] = DIRS[rec.dir]!;
      const boxCell = rec.from + dy * w + dx;
      const path = walkPath(ppos, rec.from, cur, w, h, wall);
      if (path === null) return '';
      out += path;
      ppos = rec.from;
      out += letter;
      ppos = boxCell;
      cur.delete(boxCell);
      cur.add(boxCell + dy * w + dx);
    }
    
    const path = walkPath(ppos, room.doorHall, cur, w, h, wall);
    if (path === null) return '';
    out += path;
    ppos = room.doorHall;
  }
  return out;
}
export default (I: string, O: string) => {
  for (const id of readdirSync(I).sort()) {
    const moves = solve(readFileSync(join(I, id, 'level.txt'), 'utf8'));
    mkdirSync(join(O, id), { recursive: true });
    writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
  }
};
