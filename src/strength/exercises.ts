/**
 * Kraft- und Mobility-Übungen für Radfahrer – alle zu Hause ohne Geräte machbar – mit zwei Posen je Übung (Start und Endposition) als Gelenkpunkte einer
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
  /** Mitte der Wirbelsäule – nur wo sich der Rücken rundet (z. B. Katze-Kuh), sonst ist der Rücken gerade */
  spine?: Point
}

export type Exercise = {
  id: string
  name: string
  /** Mobility läuft langsamer und ohne Gewichte */
  kind: 'strength' | 'mobility'
  /** was die Übung fürs Radfahren bringt */
  why: string
  /** Hinweise zur Ausführung */
  cues: string[]
  /** typischer Fehler */
  mistake: string
  /** leichtere Variante */
  easier: string
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
    kind: 'strength',
    name: 'Kniebeuge',
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
  singleLegDeadlift: {
    id: 'singleLegDeadlift',
    kind: 'strength',
    name: 'Einbeiniges Kreuzheben',
    why: 'Stärkt Beinrückseite, Gesäß und Gleichgewicht – ganz ohne Gewicht, weil ein Bein die Arbeit macht.',
    cues: [
      'Auf einem Bein stehen, Knie leicht gebeugt',
      'Oberkörper nach vorn kippen, das freie Bein geht gestreckt nach hinten',
      'Rücken und hinteres Bein bilden eine Linie',
      'Über das Gesäß zurück in den Stand',
    ],
    mistake:
      'Die Hüfte dreht auf: Die Fußspitze des hinteren Beins zeigt nach außen statt zum Boden.',
    easier: 'Mit einer Hand an der Wand abstützen, nur so weit runter, wie es ruhig bleibt.',
    start: {
      head: [152, 52],
      shoulder: [150, 76],
      elbow: [152, 108],
      hand: [153, 138],
      hip: [150, 140],
      ...legs([152, 206], [150, 270], [176, 272]),
    },
    end: {
      head: [233, 131],
      shoulder: [210, 136],
      elbow: [210, 168],
      hand: [211, 198],
      hip: [146, 146],
      knee: [156, 208],
      ankle: [150, 270],
      toe: [176, 272],
      knee2: [84, 155],
      ankle2: [24, 163],
      toe2: [20, 174],
    },
    cueTowardsEnd: 'Runter: Oberkörper vor, Bein nach hinten',
    cueBack: 'Hoch: über das Gesäß zurück in den Stand',
  },
  bridge: {
    id: 'bridge',
    kind: 'strength',
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
    kind: 'strength',
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
  calfRaise: {
    id: 'calfRaise',
    kind: 'strength',
    name: 'Wadenheben',
    why: 'Kräftige Waden stabilisieren das Sprunggelenk und den Druck über den Fuß – besonders im Wiegetritt.',
    cues: [
      'Füße hüftbreit, Gewicht auf den Fußballen',
      'Langsam so hoch wie möglich auf die Zehen',
      'Oben eine Sekunde halten',
      'Langsam wieder absenken',
    ],
    mistake: 'Schwungvoll hochwippen statt kontrolliert zu drücken.',
    easier: 'Mit einer Hand an der Wand festhalten. Schwerer: einbeinig.',
    start: {
      head: [152, 52],
      shoulder: [150, 76],
      elbow: [152, 108],
      hand: [153, 138],
      hip: [150, 140],
      ...legs([151, 205], [150, 270], [176, 272]),
    },
    end: {
      head: [152, 38],
      shoulder: [150, 62],
      elbow: [152, 94],
      hand: [153, 124],
      hip: [150, 126],
      ...legs([151, 191], [154, 256], [176, 272]),
    },
    cueTowardsEnd: 'Hoch: auf die Zehen, oben halten',
    cueBack: 'Runter: langsam absenken',
  },
  lunge: {
    id: 'lunge',
    kind: 'strength',
    name: 'Ausfallschritt rückwärts',
    why: 'Kräftigt die Beine einzeln und schult das Gleichgewicht – gut für Antritte aus dem Sattel.',
    cues: [
      'Hände an die Hüfte, großer Schritt nach hinten',
      'Hinteres Knie fast bis zum Boden',
      'Oberkörper aufrecht, vorderes Knie über dem Fuß',
      'Mit dem vorderen Bein zurück in den Stand drücken',
    ],
    mistake: 'Zu kleiner Schritt – dann schiebt sich das vordere Knie weit über die Zehen.',
    easier: 'Kleinerer Schritt, mit einer Hand an der Wand abstützen.',
    start: {
      head: [207, 52],
      shoulder: [206, 76],
      elbow: [190, 100],
      hand: [204, 138],
      hip: [206, 140],
      ...legs([208, 205], [210, 270], [236, 272]),
    },
    end: {
      head: [147, 120],
      shoulder: [146, 144],
      elbow: [130, 168],
      hand: [144, 206],
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
    kind: 'strength',
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
    kind: 'strength',
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
  catCow: {
    id: 'catCow',
    kind: 'mobility',
    name: 'Katze-Kuh',
    why: 'Lockert die Wirbelsäule, die auf dem Rad stundenlang in derselben Haltung steht.',
    cues: [
      'Vierfüßlerstand: Hände unter den Schultern, Knie unter der Hüfte',
      'Einatmen: Bauch sinkt, Blick leicht nach vorn',
      'Ausatmen: Rücken rund machen, Kinn zur Brust',
      'Langsam und im Atemrhythmus',
    ],
    mistake: 'Die Bewegung kommt nur aus dem Nacken statt aus dem ganzen Rücken.',
    easier: 'Kleinere Bewegung, nur so weit es angenehm ist.',
    start: {
      head: [258, 188],
      shoulder: [236, 206],
      elbow: [236, 238],
      hand: [236, 268],
      hip: [140, 206],
      spine: [188, 222],
      ...legs([140, 268], [80, 266], [72, 270]),
    },
    end: {
      head: [250, 226],
      shoulder: [236, 206],
      elbow: [236, 238],
      hand: [236, 268],
      hip: [140, 206],
      spine: [188, 184],
      ...legs([140, 268], [80, 266], [72, 270]),
    },
    cueTowardsEnd: 'Ausatmen: Rücken rund, Kinn zur Brust',
    cueBack: 'Einatmen: Bauch sinkt, Blick nach vorn',
  },
  childPose: {
    id: 'childPose',
    kind: 'mobility',
    name: 'Kindhaltung',
    why: 'Dehnt unteren Rücken und Gesäß sanft – gut zum Ankommen vor dem Krafttraining.',
    cues: [
      'Aus dem Vierfüßlerstand das Gesäß Richtung Fersen schieben',
      'Arme lang nach vorn, Stirn sinkt Richtung Boden',
      'Kurz halten, ruhig in den Rücken atmen',
      'Zurück in den Vierfüßlerstand',
    ],
    mistake: 'Schultern zu den Ohren ziehen statt locker zu lassen.',
    easier: 'Knie weiter auseinander oder ein Kissen zwischen Gesäß und Fersen.',
    start: {
      head: [258, 200],
      shoulder: [236, 206],
      elbow: [236, 238],
      hand: [236, 268],
      hip: [140, 206],
      spine: [188, 206],
      ...legs([140, 268], [80, 266], [72, 270]),
    },
    end: {
      head: [218, 256],
      shoulder: [196, 248],
      elbow: [228, 262],
      hand: [262, 266],
      hip: [96, 236],
      spine: [148, 238],
      ...legs([140, 268], [80, 266], [72, 270]),
    },
    cueTowardsEnd: 'Zurück: Gesäß zu den Fersen, Arme lang',
    cueBack: 'Vor: zurück in den Vierfüßlerstand',
  },
  hipFlexor: {
    id: 'hipFlexor',
    kind: 'mobility',
    name: 'Hüftbeuger-Dehnung im Halbknien',
    why: 'Auf dem Rad sind die Hüftbeuger dauernd verkürzt – das zieht am unteren Rücken.',
    cues: [
      'Halbkniestand: hinteres Knie am Boden (gern auf einem Kissen)',
      'Gesäß des hinteren Beins anspannen',
      'Hüfte langsam nach vorn schieben, Oberkörper bleibt aufrecht',
      'Ziehen vorn an der hinteren Hüfte – kein Hohlkreuz',
    ],
    mistake: 'Ins Hohlkreuz ausweichen statt die Hüfte nach vorn zu schieben.',
    easier: 'Kleinerer Schritt, mit einer Hand an einer Stuhllehne festhalten.',
    start: {
      head: [143, 118],
      shoulder: [142, 142],
      elbow: [170, 170],
      hand: [196, 200],
      hip: [140, 206],
      knee: [200, 208],
      ankle: [200, 270],
      toe: [226, 272],
      knee2: [130, 268],
      ankle2: [70, 266],
      toe2: [62, 270],
    },
    end: {
      head: [163, 126],
      shoulder: [162, 150],
      elbow: [188, 176],
      hand: [210, 206],
      hip: [162, 214],
      knee: [214, 212],
      ankle: [200, 270],
      toe: [226, 272],
      knee2: [130, 268],
      ankle2: [70, 266],
      toe2: [62, 270],
    },
    cueTowardsEnd: 'Vor: Hüfte schieben, Gesäß fest',
    cueBack: 'Halten und ruhig atmen',
  },
  hamstring: {
    id: 'hamstring',
    kind: 'mobility',
    name: 'Beinrückseite dehnen',
    why: 'Die Beinrückseite verkürzt durch die gebeugte Haltung auf dem Rad – das bremst die tiefe Aeroposition.',
    cues: [
      'Rückenlage, ein Bein lang am Boden',
      'Das andere Bein gestreckt anheben, Hände halten hinter dem Oberschenkel oder bleiben am Boden',
      'Nur so weit, bis es hinten am Oberschenkel zieht',
      'Halten, dann Seite wechseln',
    ],
    mistake: 'Das Bein am Boden hebt ab oder das Knie wird stark gebeugt.',
    easier: 'Das angehobene Knie leicht beugen.',
    start: {
      head: [60, 256],
      shoulder: [84, 262],
      elbow: [112, 266],
      hand: [140, 268],
      hip: [150, 264],
      knee: [194, 220],
      ankle: [238, 176],
      toe: [248, 168],
      knee2: [212, 266],
      ankle2: [272, 268],
      toe2: [280, 258],
    },
    end: {
      head: [60, 256],
      shoulder: [84, 262],
      elbow: [112, 266],
      hand: [140, 268],
      hip: [150, 264],
      knee: [161, 203],
      ankle: [172, 142],
      toe: [184, 136],
      knee2: [212, 266],
      ankle2: [272, 268],
      toe2: [280, 258],
    },
    cueTowardsEnd: 'Hoch: Bein gestreckt, bis es zieht',
    cueBack: 'Etwas nachlassen, weiteratmen',
  },
}

/** warmup = vorher mobilisieren, main = Kraft, cooldown = zum Schluss dehnen */
export type Block = 'warmup' | 'main' | 'cooldown'

export type SessionExercise = { exercise: Exercise; sets: number; reps: string; block: Block }

export const blockLabels: Record<Block, string> = {
  warmup: 'Mobilisieren',
  main: 'Kraft',
  cooldown: 'Dehnen zum Schluss',
}

/** Workout-IDs der Krafteinheiten (wie im Backend) */
export const STRENGTH_SESSIONS: Record<
  number,
  { id: string; reps: [id: string, sets: number, reps: string, block: Block][] }
> = {
  40: {
    id: 'A',
    reps: [
      ['catCow', 1, '8 langsam', 'warmup'],
      ['squat', 3, '12', 'main'],
      ['singleLegDeadlift', 3, '8 je Bein', 'main'],
      ['bridge', 3, '15', 'main'],
      ['plank', 3, '30 s', 'main'],
      ['hipFlexor', 2, '30 s je Seite', 'cooldown'],
    ],
  },
  41: {
    id: 'B',
    reps: [
      ['childPose', 1, '6 × 5 s', 'warmup'],
      ['lunge', 3, '10 je Bein', 'main'],
      ['calfRaise', 3, '15', 'main'],
      ['deadBug', 3, '10', 'main'],
      ['sidePlank', 3, '20 s je Seite', 'main'],
      ['hamstring', 2, '30 s je Seite', 'cooldown'],
    ],
  },
  42: {
    id: 'Erhalten',
    reps: [
      ['catCow', 1, '8 langsam', 'warmup'],
      ['squat', 2, '12, 3 s runter', 'main'],
      ['singleLegDeadlift', 2, '8 je Bein', 'main'],
      ['bridge', 2, '15', 'main'],
      ['plank', 2, '30 s', 'main'],
      ['hipFlexor', 2, '30 s je Seite', 'cooldown'],
    ],
  },
}

export function exercisesOf(workoutId: number): SessionExercise[] {
  return (STRENGTH_SESSIONS[workoutId]?.reps ?? []).map(([id, sets, reps, block]) => ({
    exercise: exercises[id]!,
    sets,
    reps,
    block,
  }))
}

/** Hinweis je Phase: in der Grundlage aufbauen, später nur halten */
export const strengthPhaseNotes: Partial<Record<Phase, string>> = {
  BASE: 'Grundlagenphase: Kraft aufbauen. Wird es zu leicht: langsamer runter (3 s) oder ein paar Wiederholungen mehr.',
  BUILD:
    'Aufbauphase: Kraft halten. Weniger Sätze, damit die Beine für die harten Radeinheiten frisch bleiben.',
  PEAK: 'Spitze: nur noch erhalten – lieber eine Wiederholung zu wenig als eine zu viel.',
  RECOVERY: 'Erholungswoche: leicht und sauber, nicht bis an die Grenze.',
}
