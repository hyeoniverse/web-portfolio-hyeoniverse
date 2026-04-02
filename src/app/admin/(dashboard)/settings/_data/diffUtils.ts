export type DiffOp = { type: "context" | "removed" | "added"; text: string; id: number; oldLn?: number; newLn?: number };
export type Hunk = { id: number; removed: DiffOp[]; added: DiffOp[] };
export type DiffBlock = { type: "context"; ops: DiffOp[] } | { type: "hunk"; hunk: Hunk };

export function buildDiffOps(oldStr: string, newStr: string): DiffOp[] {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = m, j = n, id = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: "context", text: oldLines[i - 1], id: id++ });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "added", text: newLines[j - 1], id: id++ });
      j--;
    } else {
      ops.push({ type: "removed", text: oldLines[i - 1], id: id++ });
      i--;
    }
  }
  ops.reverse();
  let oldLn = 1, newLn = 1;
  for (const op of ops) {
    if (op.type === "context") { op.oldLn = oldLn++; op.newLn = newLn++; }
    else if (op.type === "removed") { op.oldLn = oldLn++; }
    else { op.newLn = newLn++; }
  }
  return ops;
}

// Group consecutive non-context ops into hunks
export function groupIntoBlocks(ops: DiffOp[]): { blocks: DiffBlock[]; hunks: Hunk[] } {
  const blocks: DiffBlock[] = [];
  const hunks: Hunk[] = [];
  let hunkId = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "context") {
      const ctxOps: DiffOp[] = [];
      while (i < ops.length && ops[i].type === "context") {
        ctxOps.push(ops[i]);
        i++;
      }
      blocks.push({ type: "context", ops: ctxOps });
    } else {
      const hunk: Hunk = { id: hunkId++, removed: [], added: [] };
      while (i < ops.length && ops[i].type !== "context") {
        if (ops[i].type === "removed") hunk.removed.push(ops[i]);
        else hunk.added.push(ops[i]);
        i++;
      }
      hunks.push(hunk);
      blocks.push({ type: "hunk", hunk });
    }
  }
  return { blocks, hunks };
}
