export function markerPos(t, period) {
  const phase = ((t % period) + period) % period; // 0..period
  const half = period / 2;
  return phase <= half ? phase / half : 2 - phase / half;
}
