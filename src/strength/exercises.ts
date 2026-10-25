/**
 * Kraftübungen für Radfahrer – mit zwei Posen je Übung (Start und Endposition) als Gelenkpunkte einer
 * Strichfigur in Seitenansicht. Die Bewegung dazwischen rechnet die Animation aus. Koordinaten in einem
 * 300 × 300-Feld, Boden bei y = 270.
 */
import type { Phase } from '../types/plan'

export type Point = [number, number]

/** Gelenke; leg2 = das hintere Bein (bei Übungen mit beiden Beinen an derselben Stelle wie das vordere) */
export type Pose = {
  head: Point
  shoulder: Point
  elbow: Point
  hand: Point
  hip: Point
  knee: Point
  ankle: Point
  toe: Point
  knee2: Point
  ankle2: Point
  toe2: Point
}

export type Exercise = {
  id: string
  name: string
  /** was die Übung fürs Radfahren bringt */
  why: string
  /** Hinweise zur Ausführung */
  cues: string[]
  /** typischer Fehler */
  mistake: string
  /** leichtere Variante */
  easier: string
  /** Kurzhanteln in den Händen, Bank hinter der Figur */
  weights?: boolean
  bench?: boolean
  /** gehalten statt wiederholt (Stütz) */
  hold?: boolean
  start: Pose
  end: Pose
  /** Hinweis während der Bewegung hin zur Endposition / zurück */
  cueTowardsEnd: string
  cueBack: string
}

/** Gleiche Beinstellung für beide Beine */
function legs(knee: Point, ankle: Point, toe: Point) {
  return { knee, ankle, toe, knee2: knee, ankle2: ankle, toe2: toe }
}

export const exercises: Record<string, Exercise> = {
  squat: {
    id: 'squat',
    name: 'Kniebeuge (Goblet)',
    why: 'Kräftigt Oberschenkel und Gesäß – genau die Muskeln, die beim Treten drücken.',
    cues: [
      'Füße schulterbreit, Fußspitzen leicht nach außen',
      'Hüfte nach hinten, Knie in Richtung Fußspitzen',
      'Rücken lang, Brust bleibt oben',
      'Durch die ganze Fußsohle hochdrücken',
    ],
    mistake: 'Knie fallen nach innen oder die Fersen heben ab.',
    easier: 'Auf einen Stuhl setzen und wieder aufstehen.',
    start: {
      head: [152, 52],
      shoulder: [150, 76],
      elbow: [182, 80],
      hand: [212, 80],
      hip: [148, 140],
      ...legs([150, 205], [150, 270], [176, 272]),
    },
    end: {
      head: [174, 146],
      shoulder: [160, 164],
      elbow: [192, 164],
      hand: [224, 162],
      hip: [118, 214],
      ...legs([190, 226], [150, 270], [176, 272]),
    },
    cueTowardsEnd: 'Runter: Hüfte nach hinten, Rücken lang',
    cueBack: 'Hoch: durch die Fersen drücken',
  },
  deadlift: {
    id: 'deadlift',
    name: 'Rumänisches Kreuzheben',
    why: 'Stärkt die Rückseite der Beine und den unteren Rücken – hält dich auf langen Fahrten stabil.',
    cues: [
      'Knie leicht gebeugt, die Beugung bleibt gleich',
      'Hüfte weit nach hinten schieben, bis die Rückseite der Beine zieht',
      'Hanteln nah an den Beinen führen',
      'Rücken bleibt gerade, kein Rundrücken',
    ],
    mistake: 'Rundrücken oder die Bewegung kommt aus den Knien statt aus der Hüfte.',
    easier: 'Ohne Gewicht, Hände an der Hüfte – nur die Bewegung üben.',
    weights: true,
    start: {
      head: [152, 52],
      shoulder: [150, 76],
      elbow: [152, 108],
      hand: [153, 138],
      hip: [150, 140],
      ...legs([152, 206], [150, 270], [176, 272]),
    },
    end: {
      head: [214, 125],
      shoulder: [191, 131],
      elbow: [191, 163],
      hand: [191, 193],
      hip: [128, 148],
      ...legs([160, 207], [150, 270], [176, 272]),
    },
    cueTowardsEnd: 'Runter: Hüfte nach hinten, Rücken gerade',
    cueBack: 'Hoch: Hüfte nach vorn strecken',
  },
  bridge: {
    id: 'bridge',
    name: 'Hüftheben',
    why: 'Aktiviert das Gesäß – der stärkste Muskel für den Tritt, der beim Sitzen gern einschläft.',
    cues: [
      'Rückenlage, Füße hüftbreit nah am Gesäß',
      'Hüfte hochdrücken, bis Schultern, Hüfte und Knie eine Linie bilden',
      'Oben kurz halten und das Gesäß anspannen',
      'Langsam wieder absenken',
    ],
    mistake: 'Ins Hohlkreuz drücken statt die Hüfte aus dem Gesäß zu heben.',
    easier: 'Kleinerer Bewegungsweg, oben nicht halten.',
    start: {
      head: [60, 256],
      shoulder: [84, 262],
      elbow: [112, 266],
      hand: [140, 268],
      hip: [150, 264],
      ...legs([196, 218], [214, 268], [238, 270]),
    },
    end: {
      head: [60, 256],
      shoulder: [84, 262],
      elbow: [112, 266],
      hand: [140, 268],
      hip: [150, 222],
      ...legs([208, 200], [214, 268], [238, 270]),
    },
    cueTowardsEnd: 'Hoch: Gesäß anspannen, Hüfte strecken',
    cueBack: 'Runter: langsam absenken',
  },
  plank: {
    id: 'plank',
    name: 'Unterarmstütz',
    why: 'Ein fester Rumpf überträgt die Kraft der Beine aufs Rad, statt sie im Oberkörper zu verlieren.',
    cues: [
      'Ellbogen unter den Schultern',
      'Kopf, Schultern, Hüfte und Fersen in einer Linie',
      'Bauch und Gesäß fest, ruhig weiteratmen',
    ],
    mistake: 'Hüfte hängt durch oder ragt nach oben.',
    easier: 'Knie am Boden lassen.',
    hold: true,
    start: {
      head: [272, 226],
      shoulder: [250, 232],
      elbow: [250, 266],
      hand: [282, 268],
      hip: [187, 242],
      ...legs([125, 252], [64, 262], [56, 270]),
    },
    end: {
      head: [272, 225],
      shoulder: [250, 231],
      elbow: [250, 266],
      hand: [282, 268],
      hip: [187, 239],
      ...legs([125, 251], [64, 262], [56, 270]),
    },
    cueTowardsEnd: 'Halten: Körper in einer Linie',
    cueBack: 'Weiteratmen, Bauch fest',
  },
  splitSquat: {
    id: 'splitSquat',
    name: 'Bulgarian Split Squat',
    why: 'Trainiert jedes Bein einzeln – wie beim Treten, wo auch immer nur ein Bein drückt.',
    cues: [
      'Hinterer Fuß mit dem Spann auf der Bank',
      'Vorderes Bein trägt das Gewicht, Knie zeigt über den Fuß',
      'Senkrecht nach unten, bis der vordere Oberschenkel fast waagerecht ist',
      'Über die vordere Ferse hochdrücken',
    ],
    mistake: 'Vorderes Knie knickt nach innen oder der Oberkörper kippt weit nach vorn.',
    easier: 'Ohne Bank als normaler Ausfallschritt im Stand.',
    weights: true,
    bench: true,
    start: {
      head: [159, 58],
      shoulder: [158, 82],
      elbow: [158, 114],
      hand: [159, 144],
      hip: [156, 146],
      knee: [176, 206],
      ankle: [180, 270],
      toe: [206, 272],
      knee2: [110, 184],
      ankle2: [72, 224],
      toe2: [60, 228],
    },
    end: {
      head: [143, 129],
      shoulder: [140, 153],
      elbow: [140, 185],
      hand: [141, 214],
      hip: [132, 216],
      knee: [196, 210],
      ankle: [180, 270],
      toe: [206, 272],
      knee2: [98, 262],
      ankle2: [72, 224],
      toe2: [60, 228],
    },
    cueTowardsEnd: 'Runter: senkrecht, vorderes Knie über den Fuß',
    cueBack: 'Hoch: über die vordere Ferse drücken',
  },
  lunge: {
    id: 'lunge',
    name: 'Ausfallschritt rückwärts',
    why: 'Kräftigt die Beine einzeln und schult das Gleichgewicht – gut für Antritte aus dem Sattel.',
    cues: [
      'Großer Schritt nach hinten',
      'Hinteres Knie fast bis zum Boden',
      'Oberkörper aufrecht, vorderes Knie über dem Fuß',
      'Mit dem vorderen Bein zurück in den Stand drücken',
    ],
    mistake: 'Zu kleiner Schritt – dann schiebt sich das vordere Knie weit über die Zehen.',
    easier: 'Kleinerer Schritt, mit einer Hand an der Wand abstützen.',
    weights: true,
    start: {
      head: [207, 52],
      shoulder: [206, 76],
      elbow: [206, 108],
      hand: [207, 138],
      hip: [206, 140],
      ...legs([208, 205], [210, 270], [236, 272]),
    },
    end: {
      head: [147, 120],
      shoulder: [146, 144],
      elbow: [146, 176],
      hand: [147, 206],
      hip: [144, 208],
      knee: [210, 208],
      ankle: [210, 270],
      toe: [236, 272],
      knee2: [109, 264],
      ankle2: [54, 258],
      toe2: [44, 270],
    },
    cueTowardsEnd: 'Zurück: großer Schritt, Knie Richtung Boden',
    cueBack: 'Vor: mit dem vorderen Bein hochdrücken',
  },
  deadBug: {
    id: 'deadBug',
    name: 'Dead Bug',
    why: 'Hält den Rücken stabil, während sich Arme und Beine bewegen – wie auf dem Rad.',
    cues: [
      'Rückenlage, Arme senkrecht nach oben, Knie über der Hüfte',
      'Unteren Rücken fest an den Boden drücken',
      'Einen Arm nach hinten und das gegenüberliegende Bein nach vorn strecken',
      'Langsam zurück, dann Seite wechseln',
    ],
    mistake: 'Der untere Rücken hebt vom Boden ab.',
    easier: 'Nur die Beine abwechselnd strecken, Arme bleiben oben.',
    start: {
      head: [66, 256],
      shoulder: [90, 262],
      elbow: [92, 230],
      hand: [94, 200],
      hip: [156, 264],
      ...legs([158, 200], [218, 202], [226, 192]),
    },
    end: {
      head: [66, 256],
      shoulder: [90, 262],
      elbow: [60, 252],
      hand: [30, 246],
      hip: [156, 264],
      knee: [220, 252],
      ankle: [280, 246],
      toe: [288, 236],
      knee2: [158, 200],
      ankle2: [218, 202],
      toe2: [226, 192],
    },
    cueTowardsEnd: 'Strecken: Rücken bleibt am Boden',
    cueBack: 'Zurück: langsam, dann Seite wechseln',
  },
  sidePlank: {
    id: 'sidePlank',
    name: 'Seitstütz',
    why: 'Kräftigt die seitliche Rumpfmuskulatur – weniger Wackeln im Wiegetritt und am Berg.',
    cues: [
      'Seitlich auf den Unterarm, Ellbogen unter der Schulter',
      'Hüfte anheben, bis der Körper eine Linie bildet',
      'Halten, ohne die Hüfte nach hinten kippen zu lassen',
    ],
    mistake: 'Die Hüfte sinkt ab oder dreht sich nach vorn.',
    easier: 'Mit gebeugten Knien, die unten aufliegen.',
    hold: true,
    start: {
      head: [258, 230],
      shoulder: [236, 236],
      elbow: [236, 266],
      hand: [266, 268],
      hip: [176, 260],
      ...legs([118, 262], [60, 266], [52, 270]),
    },
    end: {
      head: [258, 228],
      shoulder: [236, 234],
      elbow: [236, 266],
      hand: [266, 268],
      hip: [177, 245],
      ...legs([119, 255], [60, 266], [52, 270]),
    },
    cueTowardsEnd: 'Hoch: Hüfte anheben, Körper in einer Linie',
    cueBack: 'Halten oder kurz absetzen',
  },
}

export type SessionExercise = { exercise: Exercise; sets: number; reps: string }

/** Workout-IDs der Krafteinheiten (wie im Backend) */
export const STRENGTH_SESSIONS: Record<number, { id: string; reps: [string, number, string][] }> = {
  40: {
    id: 'A',
    reps: [
      ['squat', 3, '8'],
      ['deadlift', 3, '8'],
      ['bridge', 3, '12'],
      ['plank', 3, '40 s'],
    ],
  },
  41: {
    id: 'B',
    reps: [
      ['splitSquat', 3, '8 je Bein'],
      ['lunge', 3, '10 je Bein'],
      ['deadBug', 3, '10'],
      ['sidePlank', 3, '30 s je Seite'],
    ],
  },
  42: {
    id: 'Erhalten',
    reps: [
      ['squat', 2, '6 (etwas schwerer)'],
      ['deadlift', 2, '6'],
      ['bridge', 2, '10'],
      ['plank', 2, '40 s'],
    ],
  },
}

export function exercisesOf(workoutId: number): SessionExercise[] {
  return (STRENGTH_SESSIONS[workoutId]?.reps ?? []).map(([id, sets, reps]) => ({
    exercise: exercises[id]!,
    sets,
    reps,
  }))
}

/** Hinweis je Phase: in der Grundlage aufbauen, später nur halten */
export const strengthPhaseNotes: Partial<Record<Phase, string>> = {
  BASE: 'Grundlagenphase: Kraft aufbauen. Gewicht so wählen, dass die letzten zwei Wiederholungen fordern.',
  BUILD:
    'Aufbauphase: Kraft halten. Weniger Sätze, damit die Beine für die harten Radeinheiten frisch bleiben.',
  PEAK: 'Spitze: nur noch erhalten – lieber eine Wiederholung zu wenig als eine zu viel.',
  RECOVERY: 'Erholungswoche: leicht und sauber, nicht bis an die Grenze.',
}
