export const SVG_W = 1800;
export const SVG_H = 1200;
export const ROW_HEIGHT = 20;
export const HEADER_HEIGHT = 28;
export const PADDING_Y = 6;
export const COL_W = 260;

export const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  // Row 1
  series:              { x: 560,  y: 30,  w: COL_W },
  admin_notifications: { x: 1100, y: 30,  w: COL_W },
  // Row 2
  works:               { x: 40,   y: 240, w: COL_W },
  posts:               { x: 400,  y: 240, w: COL_W },
  comments:            { x: 760,  y: 240, w: COL_W },
  work_comments:       { x: 1120, y: 240, w: COL_W },
  // Row 3
  site_settings:       { x: 40,   y: 780, w: COL_W },
  likes:               { x: 400,  y: 780, w: COL_W },
  site_visits:         { x: 760,  y: 780, w: COL_W },
  revisions:           { x: 1120, y: 780, w: COL_W },
};

export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.1;
