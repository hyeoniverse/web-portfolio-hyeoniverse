export const SVG_W = 1800;
export const SVG_H = 1200;
export const ROW_HEIGHT = 20;
export const HEADER_HEIGHT = 28;
export const PADDING_Y = 6;
const COL_W = 260;

const OX = 190;
const OY = 100;

// 4열 그리드 — x 는 OX / OX+360 / OX+720 / OX+1080 네 값만 쓴다 (열 사이 간격 100px).
// 여기에 없는 테이블은 ErdPanel 이 렌더하지 않는다 — 전체 스키마(erd.ts) 중 다이어그램에
// 그릴 것만 좌표를 준다.
export const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  // Row 1 — series 는 posts 바로 위(같은 열)에 둬서 series_id 관계선이 수직으로 떨어진다
  calendars:           { x: OX,        y: OY,       w: COL_W },
  series:              { x: OX + 360,  y: OY,       w: COL_W },
  custom_emojis:       { x: OX + 720,  y: OY,       w: COL_W },
  admin_notifications: { x: OX + 1080, y: OY,       w: COL_W },
  // Row 2
  works:               { x: OX,        y: OY + 210, w: COL_W },
  posts:               { x: OX + 360,  y: OY + 210, w: COL_W },
  comments:            { x: OX + 720,  y: OY + 210, w: COL_W },
  work_comments:       { x: OX + 1080, y: OY + 210, w: COL_W },
  // comments / work_comments 아래 빈 공간 — 양쪽을 다 참조하므로 두 열 사이에 걸친다
  comment_reactions:   { x: OX + 900,  y: OY + 550, w: COL_W },
  // Row 3 — posts(28행)/works(26행) 카드 높이에 맞춰 내려둔 위치. 위 행이 길어지면 같이 내려야 한다.
  site_settings:       { x: OX,        y: OY + 840, w: COL_W },
  likes:               { x: OX + 360,  y: OY + 840, w: COL_W },
  site_visits:         { x: OX + 720,  y: OY + 840, w: COL_W },
  revisions:           { x: OX + 1080, y: OY + 840, w: COL_W },
};

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
