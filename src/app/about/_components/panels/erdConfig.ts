export const SVG_W = 1800;
export const SVG_H = 1200;
export const ROW_HEIGHT = 20;
export const HEADER_HEIGHT = 28;
export const PADDING_Y = 6;
const COL_W = 260;

const OX = 190;
const OY = 100;

export const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  // Row 1
  series:              { x: OX + 520,  y: OY,       w: COL_W },
  admin_notifications: { x: OX + 1060, y: OY,       w: COL_W },
  // Row 2
  works:               { x: OX,        y: OY + 210, w: COL_W },
  posts:               { x: OX + 360,  y: OY + 210, w: COL_W },
  comments:            { x: OX + 720,  y: OY + 210, w: COL_W },
  work_comments:       { x: OX + 1080, y: OY + 210, w: COL_W },
  // Row 3
  site_settings:       { x: OX,        y: OY + 720, w: COL_W },
  likes:               { x: OX + 360,  y: OY + 720, w: COL_W },
  site_visits:         { x: OX + 720,  y: OY + 720, w: COL_W },
  revisions:           { x: OX + 1080, y: OY + 720, w: COL_W },
};

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;
