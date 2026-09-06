/** 도넛 wedge path (start/end 각도는 0=12시 시계방향, deg 단위) */
export function describeDonutArc(
  cx: number,
  cy: number,
  oR: number,
  iR: number,
  startAngle: number,
  endAngle: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sa = toRad(startAngle),
    ea = toRad(endAngle);
  const ox1 = cx + oR * Math.cos(sa),
    oy1 = cy + oR * Math.sin(sa);
  const ox2 = cx + oR * Math.cos(ea),
    oy2 = cy + oR * Math.sin(ea);
  const ix1 = cx + iR * Math.cos(ea),
    iy1 = cy + iR * Math.sin(ea);
  const ix2 = cx + iR * Math.cos(sa),
    iy2 = cy + iR * Math.sin(sa);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M${ox1.toFixed(2)},${oy1.toFixed(2)}`,
    `A${oR},${oR} 0 ${large} 1 ${ox2.toFixed(2)},${oy2.toFixed(2)}`,
    `L${ix1.toFixed(2)},${iy1.toFixed(2)}`,
    `A${iR},${iR} 0 ${large} 0 ${ix2.toFixed(2)},${iy2.toFixed(2)}`,
    `Z`,
  ].join(" ");
}
