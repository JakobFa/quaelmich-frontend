import type { Exercise, Point, Pose } from './exercises'

/**
 * Bewegung zwischen Start- und Endposition einer Übung. Statt jedes Gelenk geradlinig zu verschieben (dann
 * schrumpfen Arme und Oberkörper mitten in der Bewegung), drehen sich die Körperteile um ihr Gelenk:
 * Der Oberkörper klappt um die Hüfte, Arme und freie Beine schwingen im Bogen. Füße und Hände, die in beiden
 * Posen am Boden sind, bleiben stehen – Knie und Ellbogen rechnet dann eine Zwei-Gelenk-Kette aus.
 */

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const length = ([x, y]: Point) => Math.hypot(x, y)
const distance = (a: Point, b: Point) => length(sub(a, b))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mix = (a: Point, b: Point, t: number): Point => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
]

/** Boden bei y = 270: tiefer als das gilt ein Fuß oder eine Hand als aufgesetzt */
const ON_GROUND = 248

/** Punkt, der sich im Bogen um origin dreht: Winkel und Abstand wandern von der Start- zur Endposition */
function swing(origin: Point, from: [Point, Point], to: [Point, Point], t: number): Point {
  const a = sub(from[1], from[0])
  const b = sub(to[1], to[0])
  const angleA = Math.atan2(a[1], a[0])
  let turn = Math.atan2(b[1], b[0]) - angleA
  // immer den kürzeren Weg drehen
  while (turn > Math.PI) turn -= 2 * Math.PI
  while (turn < -Math.PI) turn += 2 * Math.PI
  const angle = angleA + turn * t
  const reach = lerp(length(a), length(b), t)
  return [origin[0] + Math.cos(angle) * reach, origin[1] + Math.sin(angle) * reach]
}

const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]

/** Seite, zu der das mittlere Gelenk ausknickt (Knie nach vorn, Ellbogen nach hinten …) */
function bendOf(root: Point, middle: Point, end: Point) {
  const along = sub(end, root)
  const side = cross(along, sub(middle, root))
  return side / Math.max(1, length(along) * distance(middle, root))
}

/** Zwei-Gelenk-Kette: Wo liegt das mittlere Gelenk, wenn Anfang und Ende feststehen? */
function joint(root: Point, end: Point, upper: number, lower: number, bend: number): Point {
  const along = sub(end, root)
  const reach = Math.min(upper + lower, Math.max(Math.abs(upper - lower), length(along)))
  if (reach === 0) return [root[0], root[1] + upper]
  const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach)
  const angle =
    Math.atan2(along[1], along[0]) +
    Math.sign(bend || 1) * Math.acos(Math.min(1, Math.max(-1, cos)))
  return [root[0] + Math.cos(angle) * upper, root[1] + Math.sin(angle) * upper]
}

type Chain = { root: keyof Pose; middle: keyof Pose; end: keyof Pose }

/** Oberschenkel/Unterschenkel oder Oberarm/Unterarm zwischen zwei Posen bewegen */
function limb(
  start: Pose,
  end: Pose,
  root: Point,
  { root: r, middle: m, end: e }: Chain,
  t: number,
  planted: boolean,
): [Point, Point] {
  const s = { root: start[r]!, middle: start[m]!, end: start[e]! }
  const f = { root: end[r]!, middle: end[m]!, end: end[e]! }
  const bendStart = bendOf(s.root, s.middle, s.end)
  const bendEnd = bendOf(f.root, f.middle, f.end)
  // Knie oder Ellbogen bleibt am Boden (Kindhaltung, Stütz): es ist der Drehpunkt, der Rest schwingt darum
  if (s.middle[1] >= ON_GROUND && f.middle[1] >= ON_GROUND) {
    const middle = mix(s.middle, f.middle, t)
    return [middle, swing(middle, [s.middle, s.end], [f.middle, f.end], t)]
  }
  const flips = bendStart * bendEnd < 0 && Math.min(Math.abs(bendStart), Math.abs(bendEnd)) > 0.05
  if (planted && !flips) {
    const tip = mix(s.end, f.end, t)
    const upper = lerp(distance(s.root, s.middle), distance(f.root, f.middle), t)
    const lower = lerp(distance(s.middle, s.end), distance(f.middle, f.end), t)
    const bend = Math.abs(bendStart) >= Math.abs(bendEnd) ? bendStart : bendEnd
    return [joint(root, tip, upper, lower, bend), tip]
  }
  const middle = swing(root, [s.root, s.middle], [f.root, f.middle], t)
  return [middle, swing(middle, [s.middle, s.end], [f.middle, f.end], t)]
}

const onGround = (start: Pose, end: Pose, key: keyof Pose) =>
  start[key]![1] >= ON_GROUND && end[key]![1] >= ON_GROUND

/** Die hintere Hand: eigene Angaben oder knapp hinter der vorderen (wirkt wie der zweite Arm) */
const BEHIND: Point = [-5, -3]
export function withBackArm(pose: Pose): Required<Pick<Pose, 'elbow2' | 'hand2'>> & Pose {
  return {
    ...pose,
    elbow2: pose.elbow2 ?? [pose.elbow[0] + BEHIND[0], pose.elbow[1] + BEHIND[1]],
    hand2: pose.hand2 ?? [pose.hand[0] + BEHIND[0], pose.hand[1] + BEHIND[1]],
  }
}

/** Haltung zum Zeitpunkt t (0 = Start, 1 = Endposition) */
export function poseAt(exercise: Exercise, t: number): Required<Pose> {
  const start = withBackArm(exercise.start)
  const end = withBackArm(exercise.end)
  const hip = mix(start.hip, end.hip, t)

  // Bewegt sich die Schulter mehr als die Hüfte, klappt der Oberkörper um die Hüfte (Kniebeuge,
  // Kreuzheben). Sonst trägt die Schulter (Liegestütz, Hüftheben) und wandert gerade mit.
  const shoulder =
    distance(start.shoulder, end.shoulder) > distance(start.hip, end.hip) + 0.5
      ? swing(hip, [start.hip, start.shoulder], [end.hip, end.shoulder], t)
      : mix(start.shoulder, end.shoulder, t)
  const head = swing(shoulder, [start.shoulder, start.head], [end.shoulder, end.head], t)
  const spine = mix(
    start.spine ?? mix(start.hip, start.shoulder, 0.5),
    end.spine ?? mix(end.hip, end.shoulder, 0.5),
    t,
  )

  const [elbow, hand] = limb(
    start,
    end,
    shoulder,
    { root: 'shoulder', middle: 'elbow', end: 'hand' },
    t,
    onGround(start, end, 'hand'),
  )
  const [elbow2, hand2] = limb(
    start,
    end,
    shoulder,
    { root: 'shoulder', middle: 'elbow2', end: 'hand2' },
    t,
    onGround(start, end, 'hand2'),
  )

  const leg = (knee: keyof Pose, ankle: keyof Pose, toe: keyof Pose) => {
    const planted = onGround(start, end, ankle)
    const [k, a] = limb(start, end, hip, { root: 'hip', middle: knee, end: ankle }, t, planted)
    const foot = planted
      ? mix(start[toe]!, end[toe]!, t)
      : swing(a, [start[ankle]!, start[toe]!], [end[ankle]!, end[toe]!], t)
    return [k, a, foot] as const
  }
  const [knee, ankle, toe] = leg('knee', 'ankle', 'toe')
  const [knee2, ankle2, toe2] = leg('knee2', 'ankle2', 'toe2')

  return {
    head,
    shoulder,
    elbow,
    hand,
    elbow2,
    hand2,
    hip,
    spine,
    knee,
    ankle,
    toe,
    knee2,
    ankle2,
    toe2,
  }
}

/** Der Punkt, der sich am weitesten bewegt (Hand beim Schwung, Hüfte beim Hüftheben …) – seine Bahn wird angedeutet */
export function mainMover(exercise: Exercise): keyof Pose | null {
  const keys: (keyof Pose)[] = ['hand', 'hip', 'ankle', 'ankle2', 'head']
  let best: keyof Pose | null = null
  let most = 24
  for (const key of keys) {
    const moved = distance(exercise.start[key]!, exercise.end[key]!)
    if (moved > most) {
      most = moved
      best = key
    }
  }
  return best
}

/** Mittelpunkt eines Gewichts: Hantel in der Hand, Kettlebell hängt unter der Hand oder verlängert den Arm im Schwung */
export function loadCenter(exercise: Exercise, pose: Required<Pose>, back = false): Point | null {
  const load = exercise.load
  if (!load) return null
  if (load.at === 'hip')
    return [pose.hip[0] - 2, pose.hip[1] - (load.kind === 'kettlebell' ? 16 : 11)]
  const hand = back ? pose.hand2 : pose.hand
  const elbow = back ? pose.elbow2 : pose.elbow
  if (load.kind === 'dumbbell') return load.vertical ? [hand[0], hand[1] + 9] : hand
  const arm = sub(hand, elbow)
  const along =
    length(arm) > 0 ? ([arm[0] / length(arm), arm[1] / length(arm)] as Point) : ([0, 1] as Point)
  // zeigt der Unterarm nach oben (Goblet, Bodendrücken), hängt die Kugel unter den Händen
  const direction: Point = along[1] > -0.2 ? along : [0, 1]
  return [hand[0] + direction[0] * 15, hand[1] + direction[1] * 15]
}
