/**
 * Template App Router : re-monté à chaque navigation → l'animation `.page-enter`
 * rejoue sur chaque changement de page. Transition douce et vivante, app-wide,
 * sans toucher aucune page. Réduit sous prefers-reduced-motion (règle globale).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
