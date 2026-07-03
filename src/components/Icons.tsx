import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  // a11y : icônes toujours décoratives — le texte/aria-label du parent porte le sens
  "aria-hidden": true,
});

export function IconCave({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function IconJournal({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

export function IconCercle({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconCaviste({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M8 22H6a2 2 0 01-2-2v-7l4-2 4 2 4-2 4 2v7a2 2 0 01-2 2h-2" />
      <path d="M8 22V11" />
      <path d="M16 22V11" />
      <path d="M2 13h20" />
      <path d="M12 2v9" />
      <circle cx="12" cy="2" r="1" />
    </svg>
  );
}

export function IconActu({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
      <line x1="10" y1="7" x2="18" y2="7" />
      <line x1="10" y1="11" x2="18" y2="11" />
      <line x1="10" y1="15" x2="14" y2="15" />
    </svg>
  );
}

export function IconPromos({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export function IconScan({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M3 9V5a2 2 0 012-2h4" />
      <path d="M15 3h4a2 2 0 012 2v4" />
      <path d="M21 15v4a2 2 0 01-2 2h-4" />
      <path d="M9 21H5a2 2 0 01-2-2v-4" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

export function IconBell({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

export function IconUser({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconMoon({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function IconMap({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function IconHeart({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

export function IconPlus({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconEdit({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconX({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconStar({ size, filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...defaults(size)} fill={filled ? "currentColor" : "none"} {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function IconBook({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

export function IconCamera({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconChevronRight({ size, ...p }: IconProps) {
  return (
    <svg {...defaults(size)} {...p}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
