import type { Point, Pose } from './exercises'

/**
 * Aus den Gelenkpunkten einer Haltung wird ein Mensch mit Körperformen: Rumpf mit Brust, Bauch und Gesäß,
 * Oberschenkel und Waden, Arme mit Händen, Kopf im Profil mit Haaren, Ohr und Nase, dazu Shirt, Shorts und
 * Schuhe. Jedes Körperteil ist ein Schlauch entlang seines Knochens, der vorn und hinten verschieden dick ist
 * (Wade hinten, Schienbein vorn). Die Figur schaut in den Posen nach rechts; „vorn“ ist für jedes Körperteil
 * die Seite, die bei aufrechtem Stand nach vorn zeigt.
 */

/** Stelle entlang des Knochens (0 = Gelenk am Rumpf, 1 = äußeres Gelenk), Dicke vorn, Dicke hinten */
type Profile = readonly (readonly [t: number, front: number, back: number])[]
/** Punkt und Richtung (vom Rumpf weg) an einer Stelle des Knochens */
type Axis = (t: number) => { p: Point; d: Point }

export type Shape = { d: string; part: Part; name: string }
export type Part = 'skin' | 'shirt' | 'shorts' | 'shoe' | 'sole' | 'hair' | 'ear' | 'eye'
/** Teile, die zusammen einen gemeinsamen Umriss bekommen, und Einzelheiten darauf */
export type Group = { shapes: Shape[]; details: Shape[] }
export type Figure = {
  backLeg: Group
  backArm: Group
  body: Group
  frontLeg: Group
  frontArm: Group
}

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k]
const unit = (a: Point): Point => {
  const l = Math.hypot(a[0], a[1]) || 1
  return [a[0] / l, a[1] / l]
}
/** Vorderseite eines Körperteils, das in Richtung d vom Rumpf weg zeigt */
const frontOf = (d: Point): Point => [d[1], -d[0]]
const fmt = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`

/** Geschlossene, weiche Linie durch alle Punkte (Catmull-Rom als Bézierkurven) */
export function smoothPath(points: Point[]): string {
  const n = points.length
  let d = `M${fmt(points[0]!)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!
    const p1 = points[i]!
    const p2 = points[(i + 1) % n]!
    const p3 = points[(i + 2) % n]!
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`
  }
  return d + 'Z'
}

const straight = (a: Point, b: Point): Axis => {
  const v = sub(b, a)
  const d = unit(v)
  return (t) => ({ p: add(a, scale(v, t)), d })
}

/** Körperteil als Schlauch; round = Enden abrunden (sonst gerade abgeschnitten wie ein Ärmel) */
function tube(axis: Axis, profile: Profile, round: [boolean, boolean] = [true, true]): string {
  const front: Point[] = []
  const back: Point[] = []
  for (const [t, f, b] of profile) {
    const { p, d } = axis(t)
    const n = frontOf(d)
    front.push(add(p, scale(n, f)))
    back.push(add(p, scale(n, -b)))
  }
  /** Halbkreis um das Ende: from = 0 außen (vorn → hinten), from = 1 innen (hinten → vorn) */
  const cap = ([t, f, b]: readonly [number, number, number], from: number): Point[] => {
    const { p, d } = axis(t)
    const n = frontOf(d)
    const r = (f + b) / 2
    const c = add(p, scale(n, (f - b) / 2))
    return [0.25, 0.5, 0.75].map((k) => {
      const a = (from + k) * Math.PI
      return add(c, add(scale(n, Math.cos(a) * r), scale(d, Math.sin(a) * r)))
    })
  }
  return smoothPath([
    ...front,
    ...(round[1] ? cap(profile[profile.length - 1]!, 0) : []),
    ...back.reverse(),
    ...(round[0] ? cap(profile[0]!, 1) : []),
  ])
}

const slice = (profile: Profile, from: number, to: number, wider = 0): Profile =>
  profile.filter(([t]) => t >= from && t <= to).map(([t, f, b]) => [t, f + wider, b + wider])

/* Körperformen in Einheiten des 300er-Felds (Kopf etwa 26 hoch, Figur im Stand gut 220) */
/** Rumpf von der Hüfte (0) zur Schulter (1): vorn Bauch und Brust, hinten Gesäß und Rücken */
const TORSO: Profile = [
  [-0.16, 6.5, 8.5],
  [-0.05, 8.6, 11.8],
  [0.07, 9, 12.6],
  [0.2, 9, 11],
  [0.34, 9, 9.2],
  [0.48, 9.6, 8.6],
  [0.62, 11, 9.2],
  [0.76, 12, 10],
  [0.9, 11, 10.4],
  [1, 8.6, 9.6],
  [1.09, 5, 6.8],
]
const THIGH: Profile = [
  [-0.08, 7.6, 9],
  [0.1, 8.6, 9.2],
  [0.35, 8.7, 7.8],
  [0.6, 7.7, 6.7],
  [0.85, 6, 5.5],
  [1, 5.6, 5],
]
const SHORTS_LEG = slice(THIGH, -0.1, 0.5, 0.8)
/** Unterschenkel: vorn das Schienbein, hinten die Wade */
const SHIN: Profile = [
  [0, 5.6, 5.2],
  [0.14, 5, 6.9],
  [0.32, 4.6, 7.5],
  [0.55, 4, 5.4],
  [0.8, 3.4, 3.8],
  [1, 3.4, 3.4],
]
const UPPER_ARM: Profile = [
  [-0.14, 5.8, 6],
  [0.1, 6, 6],
  [0.45, 5, 4.8],
  [0.8, 4.2, 4.2],
  [1, 3.9, 3.9],
]
const SLEEVE = slice(UPPER_ARM, -0.2, 0.46, 0.8)
const FOREARM: Profile = [
  [0, 3.9, 4],
  [0.22, 4.4, 4.6],
  [0.55, 3.6, 3.7],
  [0.9, 2.7, 2.8],
  [1, 2.6, 2.6],
]
const PALM: Profile = [
  [0, 2.8, 2.6],
  [0.45, 3.4, 3],
  [0.8, 3, 2.6],
  [1, 2.2, 2],
]
const FIST: Profile = [
  [0, 3.4, 3.4],
  [0.5, 4, 4],
  [1, 3.6, 3.6],
]
const NECK: Profile = [
  [0, 4.2, 4.6],
  [1, 5, 5.6],
]

/** Kopf im Profil: x nach vorn (Gesicht), y nach oben, Mitte = Gelenkpunkt „head“ */
const HEAD: Point[] = [
  [0, 13],
  [7.2, 11.2],
  [11, 7],
  [12.2, 3.2],
  [11.7, 1],
  [12.6, -1.2],
  [15, -4.4],
  [12.4, -5.6],
  [12.7, -7.4],
  [11.9, -8.6],
  [11.7, -10.8],
  [8.6, -13.4],
  [3, -12.6],
  [-1, -10],
  [-7.5, -8.6],
  [-11.6, -4],
  [-12.8, 2.5],
  [-9.4, 10.4],
]
const HAIR: Point[] = [
  [-13.3, 2.5],
  [-12.6, -3.5],
  [-10.4, -6.2],
  [-8.2, -3],
  [-5.6, 2.6],
  [-1, 6.4],
  [5, 8],
  [10.6, 8.6],
  [11.6, 10.4],
  [8, 13.6],
  [0, 15],
  [-8.8, 12.4],
]
const ring = (cx: number, cy: number, rx: number, ry: number): Point[] =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]
  })

/** Rumpf als Bogen von der Hüfte (0) zur Schulter (1) durch den Punkt in der Mitte der Wirbelsäule */
export function torsoAxis(pose: Required<Pose>): Axis {
  const a = pose.hip
  const b = pose.shoulder
  const c = sub(scale(pose.spine, 2), scale(add(a, b), 0.5))
  const at = (t: number): Point => [
    (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
    (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
  ]
  const towardsShoulder = (t: number): Point =>
    unit(add(scale(sub(c, a), 2 * (1 - t)), scale(sub(b, c), 2 * t)))
  return (t) => {
    const u = towardsShoulder(Math.min(1, Math.max(0, t)))
    const edge = t < 0 ? 0 : t > 1 ? 1 : t
    // über die Enden hinaus geradeaus weiter
    const p = add(at(edge), scale(u, (t - edge) * Math.hypot(b[0] - a[0], b[1] - a[1])))
    return { p, d: scale(u, -1) }
  }
}

/** Gesäß und Brust: der Rumpf zeigt mit der Vorderseite dahin, wo im Stand das Gesicht ist */
function body(pose: Required<Pose>, breath: number): Group {
  const axis = torsoAxis(pose)
  const torso: Profile = TORSO.map(([t, f, b]) => [
    t,
    f * (t > 0.5 && t < 0.95 ? 1 + 0.035 * breath : 1),
    b,
  ])
  const up = unit(sub(pose.head, pose.shoulder))
  const face: Point = [-up[1], up[0]]
  const local = ([x, y]: Point): Point => add(pose.head, add(scale(face, x), scale(up, y)))
  const neckTop = local([-2, -8])
  const neckBase = axis(1.02).p
  return {
    shapes: [
      { d: tube(straight(neckTop, neckBase), NECK), part: 'skin', name: 'neck' },
      {
        d: tube(axis, slice(torso, -0.2, 0.36, 0.6), [true, false]),
        part: 'shorts',
        name: 'pelvis',
      },
      { d: tube(axis, slice(torso, 0.25, 1.2), [false, true]), part: 'shirt', name: 'torso' },
      { d: smoothPath(HEAD.map(local)), part: 'skin', name: 'head' },
    ],
    details: [
      { d: smoothPath(HAIR.map(local)), part: 'hair', name: 'hair' },
      { d: smoothPath(ring(-2.8, -1, 2.4, 3.4).map(local)), part: 'ear', name: 'ear' },
      { d: smoothPath(ring(8.6, 2, 1.2, 1.2).map(local)), part: 'eye', name: 'eye' },
    ],
  }
}

/** Schuh vom Sprunggelenk zu den Zehen; kurze Angaben (Knien, Ballen) bekommen trotzdem einen ganzen Fuß */
function shoe(ankle: Point, toe: Point): Shape[] {
  let toward = sub(toe, ankle)
  if (Math.hypot(toward[0], toward[1]) < 20) toward = [toward[0], toward[1] * 0.4]
  const f = unit(toward)
  const length = Math.max(22, Math.hypot(toe[0] - ankle[0], toe[1] - ankle[1]))
  const upF: Point = [f[1], -f[0]]
  const local = ([x, y]: Point): Point => add(ankle, add(scale(f, x), scale(upF, y)))
  const L = length
  const upper: Point[] = [
    [-6.4, -2.4],
    [-8, 2.5],
    [-7.4, 8.6],
    [-4.4, 11.6],
    [0.2, 11.8],
    [4.2, 9.6],
    [L * 0.5, 6.6],
    [L * 0.85, 4.4],
    [L + 1.4, 1.6],
    [L + 1.2, -1.6],
    [L * 0.6, -2.8],
    [L * 0.15, -2.8],
  ]
  const sole: Point[] = [
    [-7.4, -0.2],
    [L * 0.5, -0.8],
    [L + 1.7, -0.1],
    [L + 1.2, -1.9],
    [L * 0.6, -3],
    [-6.2, -2.8],
  ]
  return [
    { d: smoothPath(upper.map(local)), part: 'shoe', name: 'shoe' },
    { d: smoothPath(sole.map(local)), part: 'sole', name: 'sole' },
  ]
}

function leg(hip: Point, knee: Point, ankle: Point, toe: Point): Group {
  const [upper, sole] = shoe(ankle, toe)
  return {
    shapes: [
      { d: tube(straight(knee, ankle), SHIN), part: 'skin', name: 'shin' },
      { d: tube(straight(hip, knee), THIGH), part: 'skin', name: 'thigh' },
      upper!,
    ],
    details: [
      { d: tube(straight(hip, knee), SHORTS_LEG, [true, false]), part: 'shorts', name: 'shorts' },
      sole!,
    ],
  }
}

function arm(shoulder: Point, elbow: Point, hand: Point, grip: boolean): Group {
  const d = unit(sub(hand, elbow))
  const palm = grip
    ? tube(straight(sub(hand, scale(d, 3)), add(hand, scale(d, 3.5))), FIST)
    : tube(straight(sub(hand, scale(d, 1.5)), add(hand, scale(d, 7.5))), PALM)
  return {
    shapes: [
      { d: tube(straight(shoulder, elbow), UPPER_ARM), part: 'skin', name: 'upper-arm' },
      { d: tube(straight(elbow, hand), FOREARM), part: 'skin', name: 'forearm' },
      { d: palm, part: 'skin', name: 'hand' },
    ],
    details: [
      { d: tube(straight(shoulder, elbow), SLEEVE, [true, false]), part: 'shirt', name: 'sleeve' },
    ],
  }
}

/** Steht das hintere Bein genau hinter dem vorderen, rückt es ein Stück nach hinten, damit man es sieht */
const STEP_BACK: Point = [-5, -1]

/**
 * Die ganze Figur zu einer Haltung. breath (-1 bis 1) hebt und senkt die Brust ein wenig, grip = die
 * Hände halten ein Gewicht (Faust statt offener Hand).
 */
export function figure(pose: Required<Pose>, { breath = 0, grip = false } = {}): Figure {
  const same =
    Math.hypot(pose.knee[0] - pose.knee2[0], pose.knee[1] - pose.knee2[1]) < 0.5 &&
    Math.hypot(pose.ankle[0] - pose.ankle2[0], pose.ankle[1] - pose.ankle2[1]) < 0.5
  const behind = (p: Point): Point => (same ? add(p, STEP_BACK) : p)
  return {
    backLeg: leg(pose.hip, behind(pose.knee2), behind(pose.ankle2), behind(pose.toe2)),
    backArm: arm(pose.shoulder, pose.elbow2, pose.hand2, grip),
    body: body(pose, breath),
    frontLeg: leg(pose.hip, pose.knee, pose.ankle, pose.toe),
    frontArm: arm(pose.shoulder, pose.elbow, pose.hand, grip),
  }
}
