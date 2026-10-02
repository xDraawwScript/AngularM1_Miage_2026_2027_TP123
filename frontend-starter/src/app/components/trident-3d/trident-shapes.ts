/**
 * Silhouette du trident, reprise point pour point du SVG de `trident/trident.html`
 * (même repère : dessiné à l'horizontale, tête à gauche, fourche à droite).
 * Chaque pièce est un polygone fermé ; le composant 3D les extrude en volume.
 *
 * Fichier sans Angular ni three.js : uniquement des calculs de points.
 */

export type Point = readonly [number, number];

/** Manche : rectangle de 70 à 570, épaisseur 24. */
const SHAFT: Point[] = [[70, 163], [570, 163], [570, 187], [70, 187]];

/** Pointe de lance (à gauche). */
const HEAD: Point[] = [[0, 175], [120, 131], [86, 175], [120, 219]];

/** Pointes barbelées au bout des deux branches de la fourche. */
const TIP_TOP: Point[] = [[850, 0], [1000, 50], [850, 100], [886, 50]];
const TIP_BOTTOM: Point[] = [[850, 350], [1000, 300], [850, 250], [886, 300]];

/** Épaisseur du trait des branches dans le SVG (stroke-width). */
const BRANCH_WIDTH = 26;

/** Point d'une courbe de Bézier cubique pour t entre 0 et 1. */
function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/**
 * Transforme un trait (ligne centrale + épaisseur) en polygone : on décale chaque
 * point de la moitié de l'épaisseur, d'un côté puis de l'autre, perpendiculairement
 * à la direction du trait.
 */
function strokeToPolygon(center: Point[], width: number): Point[] {
  const half = width / 2;
  const left: Point[] = [];
  const right: Point[] = [];
  center.forEach((p, i) => {
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    left.push([p[0] + nx * half, p[1] + ny * half]);
    right.push([p[0] - nx * half, p[1] - ny * half]);
  });
  return [...left, ...right.reverse()];
}

/** Une branche de la fourche : courbe de Bézier puis segment droit (comme le chemin SVG). */
function branch(endY: number): Point[] {
  const start: Point = [560, 175];
  const c1: Point = [650, 175];
  const c2: Point = [660, endY];
  const end: Point = [770, endY];
  const center: Point[] = [];
  for (let i = 0; i <= 40; i++) center.push(bezier(start, c1, c2, end, i / 40));
  center.push([880, endY]);
  return strokeToPolygon(center, BRANCH_WIDTH);
}

/** Toutes les pièces du trident. */
export function tridentPolygons(): Point[][] {
  return [SHAFT, HEAD, branch(50), branch(300), TIP_TOP, TIP_BOTTOM];
}
