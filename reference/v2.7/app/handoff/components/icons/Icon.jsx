import React from 'react';

/** Renders a Lucide glyph at locked design-system sizes (16/20/24).
    Requires the Lucide UMD script: https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js */
export function Icon({ name, size = 20, strokeWidth, color = 'currentColor', label, style, className }) {
  const sw = strokeWidth != null ? strokeWidth : (size <= 16 ? 2 : 1.5);
  const pascal = String(name || '')
    .split(/[-_ ]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const lib = (typeof window !== 'undefined' && window.lucide) || {};
  const icons = lib.icons || lib;
  // Cover Lucide's renames in either direction
  const ALIASES = {
    AlertTriangle: 'TriangleAlert', TriangleAlert: 'AlertTriangle',
    CheckCircle2: 'CircleCheckBig', CircleCheckBig: 'CheckCircle2',
    XCircle: 'CircleX', CircleX: 'XCircle',
    ChartLine: 'LineChart', LineChart: 'ChartLine',
    Ellipsis: 'MoreHorizontal', MoreHorizontal: 'Ellipsis',
  };
  const node = icons[pascal] || (ALIASES[pascal] && icons[ALIASES[pascal]]);
  const renderNode = (n, key) => {
    if (!Array.isArray(n)) return null;
    const tag = n[0];
    const attrs = n[1] || {};
    const kids = n[2];
    return React.createElement(
      tag,
      Object.assign({ key }, attrs),
      Array.isArray(kids) ? kids.map(renderNode) : null
    );
  };
  // UMD IconNode is ["svg", svgAttrs, childNodes]; older builds expose just the child list.
  const childList = Array.isArray(node) ? (node[0] === 'svg' ? node[2] : node) : null;
  const children = Array.isArray(childList) ? childList.map(renderNode) : null;
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: sw,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      role: label ? 'img' : undefined,
      'aria-label': label || undefined,
      'aria-hidden': label ? undefined : true,
      style: Object.assign({ flexShrink: 0, verticalAlign: 'middle' }, style),
      className,
    },
    children
  );
}
