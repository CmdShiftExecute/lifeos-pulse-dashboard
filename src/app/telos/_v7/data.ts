// TELOS data model — 11 first-class primitives with bidirectional links.
// IdealState -> Problems -> Mission -> Goals -> Metrics -> Challenges -> Strategies -> Projects -> Work -> Team -> Budget

export interface Owner {
  name: string;
  day: string;
  streak: number;
}

export interface IdealState {
  horizon: string;
  note: string;
}

export interface Dimension {
  id: string;
  label: string;
  cur: number;
  ideal: number;
  velo: number;
  color: string;
}

export interface SnapshotMetric {
  id: string;
  label: string;
  v: number;
  of: number;
}

export interface Problem {
  id: string;
  title: string;
  summary?: string;
  note: string;
  severity: "high" | "med" | "low";
  affects: readonly string[];
  /** forward edges to Goals affected by this problem (server-derived union) */
  goals?: readonly string[];
}

export interface Mission {
  id: string;
  title: string;
  summary?: string;
  horizon: string;
  active?: boolean;
  addresses?: readonly string[];
  /** goals serving this mission (server-derived union of References + serves) */
  goals?: readonly string[];
  /** strategies implementing this mission's goals (server-derived) */
  strategies?: readonly string[];
}

export interface Goal {
  id: string;
  title: string;
  summary?: string;
  /** reverse edges to Problems, parsed from TELOS.md References lines */
  addresses?: readonly string[];
  /** parent missions this goal serves (M ids, from References/Serves) */
  serves?: readonly string[];
  /** Detail prose from TELOS.md — long-form context under the summary */
  body?: string;
  kpi: string;
  target: string;
  pct: number;
  delta: number;
  dims: readonly string[];
  metrics: readonly string[];
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: number;
  spark: readonly number[];
  feeds: readonly string[];
  color: string;
}

export interface Challenge {
  id: string;
  title: string;
  summary?: string;
  note: string;
  blocks: readonly string[];
}

export interface Strategy {
  id: string;
  title: string;
  summary?: string;
  overcomes: readonly string[];
  implements: readonly string[];
  active?: boolean;
}

export interface Work {
  id: string;
  title: string;
  strategy: string;
  eta: string;
  status: "green" | "amber" | "red";
  owner: string;
}

export interface Project {
  id: string;
  title: string;
  strategy: string;
  dims: readonly string[];
  status: "green" | "amber" | "red";
  work: readonly Work[];
  team?: readonly string[];
}

export interface Team {
  id: string;
  name: string;
  role: string;
  kind: "human" | "agent";
  owns: readonly string[];
  avatar: string;
  note: string;
}

export interface Budget {
  id: string;
  kind: "money" | "time" | "attention";
  label: string;
  value: string;
  of: string;
  pct: number;
  funds: readonly string[];
  note: string;
  warn?: boolean;
}

export interface Recommendation {
  id: string;
  action: string;
  because: string;
  upstream: readonly string[];
  effort: string;
  impact: "high" | "med" | "low";
}

export interface StrandedWork {
  id: string;
  title: string;
  owner: string;
  age: string;
}

export interface StrandedGoal {
  id: string;
  title: string;
  reason: string;
}

export interface StrandedStrategy {
  id: string;
  title: string;
  reason: string;
}

export interface Stranded {
  work_no_goal: readonly StrandedWork[];
  goals_no_strategy: readonly StrandedGoal[];
  strategies_idle: readonly StrandedStrategy[];
}

export interface Subtab {
  id: string;
  label: string;
  dim: string;
  cur: number;
  ideal: number;
  velo: number;
  target: string;
  top: string;
}

export interface PreferenceContext {
  books: readonly string[];
  films: readonly string[];
  anime: readonly string[];
  characters: readonly string[];
  aphorisms: readonly string[];
  hobbies: readonly string[];
  literature: readonly string[];
}

export interface NarrativeSeed {
  days_into: number;
  push_name: string;
  current_work: string;
  via_strategy: string;
  addresses: string;
  moves_goal: string;
  serves_mission: string;
}

export interface WorkNarrative {
  summary: string;
  inProgress: number;
  done: number;
  ready: number;
  inbox: number;
}

export interface Telos {
  owner: Owner;
  idealState: IdealState;
  dimensions: readonly Dimension[];
  snapshot: readonly SnapshotMetric[];
  problems: readonly Problem[];
  missions: readonly Mission[];
  goals: readonly Goal[];
  metrics: readonly Metric[];
  challenges: readonly Challenge[];
  strategies: readonly Strategy[];
  projects: readonly Project[];
  team: readonly Team[];
  budget: readonly Budget[];
  recommendations: readonly Recommendation[];
  stranded: Stranded;
  subtabs: readonly Subtab[];
  preferences: PreferenceContext;
  narrativeSeed: NarrativeSeed;
  workNarrative: WorkNarrative | null;
  // Server-synthesized prose. All are null on a fresh install with no
  // populated TELOS.md — never empty strings, never fixture text.
  currentStateNarrative: string | null;
  idealStateNarrative: string | null;
  currentStateBullets: ReadonlyArray<{ label: string; value: string }> | null;
  idealStateBullets: ReadonlyArray<{ label: string; value: string }> | null;
  synthesisParagraph: string | null;
  synthesisSegments: ReadonlyArray<SynthesisSegment> | null;
  recommendedNextAction: string | null;
}

// Structured synthesis — typed segments rendered as runs of styled (and
// optionally clickable) inline tokens. `kind: "text"` is plain prose; the
// other kinds map to TELOS primitives and route through the trace overlay
// when the renderer wires `id` to onTrace.
export type SynthesisSegment =
  | { kind: "text"; text: string }
  | { kind: "mission" | "problem" | "challenge" | "strategy" | "goal" | "work"; text: string; id?: string };

// ─────────────────────────────────────────────────────────────────
// DEMO TELOS DATA — fictional persona (Alex Carter). Used as the
// fallback/example dataset when no live TELOS.md is populated. Shape
// mirrors the parsed API payload; every id and edge is internally
// consistent so the v7 dashboard renders fully. Tune values in place.
// ─────────────────────────────────────────────────────────────────
export const TELOS = {
  owner: { name: 'Alex Carter', day: 'Wed · 8 Jul', streak: 4 },

  // 1. IDEAL STATE — seven dimensions with targets
  idealState: {
    horizon: 'by Jun 2027',
    note: 'Independent studio with three retainers, a published essay habit, a sub-55 10K, and a full emergency fund. Aria running the system.',
  },
  dimensions: [
    { id:'health',         label:'Health',         cur:45, ideal:90, velo:+0.6, color:'--health'         },
    { id:'money',          label:'Money',          cur:40, ideal:90, velo:+1.0, color:'--money'          },
    { id:'freedom',        label:'Freedom',        cur:50, ideal:90, velo:+0.8, color:'--freedom'        },
    { id:'creative',       label:'Creative',       cur:65, ideal:90, velo:+0.6, color:'--creative'       },
    { id:'relationships',  label:'Relationships',  cur:75, ideal:90, velo:+0.2, color:'--relationships'  },
    { id:'rhythms',        label:'Rhythms',        cur:45, ideal:85, velo:+0.5, color:'--rhythms'        },
    { id:'infrastructure', label:'Infrastructure', cur:70, ideal:95, velo:+2.0, color:'--infrastructure' },
  ],

  snapshot: [
    { id:'mood',   label:'Mood',   v:7.0, of:10 },
    { id:'energy', label:'Energy', v:6.0, of:10 },
    { id:'focus',  label:'Focus',  v:6.5, of:10 },
  ],

  // 2. PROBLEMS — the systemic issues above Mission
  problems: [
    { id:'PB0', title:'Feast-famine income, no recurring base',
      note:'Revenue swings month to month; a slow pipeline turns straight into runway anxiety.',
      severity:'high', affects:['M0','M2'] },
    { id:'PB1', title:'Low-energy afternoons drain the deep-work hours',
      note:'The best design and writing time gets eaten by a mid-afternoon dip. Protect it or lose it.',
      severity:'high', affects:['M0','M1'] },
    { id:'PB2', title:'Notes scattered across four apps',
      note:'Ideas, clips and drafts live in four places, so nothing compounds and search is a chore.',
      severity:'med', affects:['M0','M3'] },
    { id:'PB3', title:'Writing happens in bursts, not on a cadence',
      note:'Essays ship in occasional sprints. The habit, not the talent, is the missing piece.',
      severity:'med', affects:['M3'] },
    { id:'PB4', title:'No emergency buffer yet, one slow month hurts',
      note:'The fund is building but still thin. Until it is full, every quiet month is a stressor.',
      severity:'med', affects:['M2'] },
  ],

  // 3. MISSION — horizons
  missions: [
    { id:'M0', title:'Become a world-class independent product designer', horizon:'10y', active:true, addresses:['PB0','PB1'] },
    { id:'M1', title:'Rebuild an aerobic base after a sedentary decade', horizon:'5y', active:true, addresses:['PB1'] },
    { id:'M2', title:'Solid financial foundation: 12-month runway, zero consumer debt', horizon:'5y', active:true, addresses:['PB0','PB4'] },
    { id:'M3', title:'Write and publish consistently', horizon:'lifetime', active:true, addresses:['PB2','PB3'] },
  ],

  // 4. GOALS — outcomes serving Mission
  goals: [
    { id:'G0', title:'Land 3 retainer clients for Northslope Studio', kpi:'1 signed', target:'3 · Dec', pct:30, delta:+10, dims:['freedom','money'], metrics:['MT0','MT1'] },
    { id:'G1', title:'Run a sub-55 10K', kpi:'58:30', target:'sub-55 · Oct', pct:45, delta:+8, dims:['health','rhythms'], metrics:['MT2','MT3'] },
    { id:'G2', title:'6-month emergency fund', kpi:'$12.4k', target:'$18k · Nov', pct:69, delta:+6, dims:['money'], metrics:['MT4','MT5'] },
    { id:'G3', title:'Publish 24 essays this year', kpi:'9 live', target:'24 · Dec', pct:38, delta:+12, dims:['creative','rhythms'], metrics:['MT6'] },
    { id:'G4', title:'Ship Fieldnote v1, a personal notes app', kpi:'beta', target:'v1 · Sep', pct:55, delta:+15, dims:['infrastructure','creative'], metrics:['MT7'] },
  ],

  // 5. METRICS — first-class, tracked independently of Goals
  metrics: [
    { id:'MT0', label:'Discovery calls / week', value:'2',      unit:'/4',  trend:0,   spark:[1,2,1,3,2,2,1,2,3,2,2,2],                                      feeds:['G0'], color:'--freedom' },
    { id:'MT1', label:'Proposals sent / month', value:'3',      unit:'/6',  trend:+1,  spark:[1,1,2,2,3,2,3,3,4,3,3,3],                                      feeds:['G0'], color:'--money' },
    { id:'MT2', label:'Runs / week',            value:'3',      unit:'/4',  trend:0,   spark:[2,3,2,3,4,3,3,4,3,3,3,3],                                      feeds:['G1'], color:'--health' },
    { id:'MT3', label:'10K time (min)',         value:'58.5',   unit:'',    trend:-1,  spark:[61,60.5,60,59.5,59.2,59,58.9,58.8,58.7,58.6,58.5,58.5],        feeds:['G1'], color:'--health' },
    { id:'MT4', label:'Emergency fund ($)',     value:'12,400', unit:'',    trend:+6,  spark:[8200,8800,9400,9900,10400,10900,11300,11700,12000,12200,12400,12400], feeds:['G2'], color:'--money' },
    { id:'MT5', label:'Monthly savings ($)',    value:'1,150',  unit:'',    trend:+1,  spark:[900,950,1000,1050,1100,1100,1150,1150,1150,1150,1150,1150],    feeds:['G2'], color:'--money' },
    { id:'MT6', label:'Essays / month',         value:'2',      unit:'/2',  trend:0,   spark:[1,2,1,2,2,1,2,2,2,2,2,2],                                      feeds:['G3'], color:'--creative' },
    { id:'MT7', label:'Fieldnote completion',   value:'55',     unit:'%',   trend:+15, spark:[15,22,28,34,40,44,47,50,52,53,55,55],                          feeds:['G4'], color:'--infrastructure' },
  ],

  // 6. CHALLENGES
  challenges: [
    { id:'C0', title:'Afternoon energy crashes',        note:'The mid-afternoon dip eats deep-work time. Easy runs and a hard stop protect it better than willpower.', blocks:['G0','G1','G3'] },
    { id:'C1', title:'Scope creep on client work',      note:'Open-ended projects expand until the margin is gone. A fixed-scope offer is the fix.',                 blocks:['G0'] },
    { id:'C2', title:'Perfectionism stalls shipping',   note:'Essays and features sit at 90 percent. Ship weekly and let feedback do the last 10.',                  blocks:['G3','G4'] },
    { id:'C3', title:'Runway anxiety pushes toward any project', note:'A thin buffer tempts saying yes to bad-fit work. Steady outreach plus a fund removes the pressure.', blocks:['G0','G2'] },
    { id:'C4', title:'Context-switching across four note apps',  note:'Ideas fragment across tools, so nothing compounds. One inbox fixes it.',                        blocks:['G3','G4'] },
  ],

  // 7. STRATEGIES
  strategies: [
    { id:'S0', title:'Weekly outreach: 4 discovery calls, warm network first', overcomes:['C3'], implements:['G0'], active:true },
    { id:'S1', title:'Productize one fixed-scope design sprint',                overcomes:['C1'], implements:['G0'], active:true },
    { id:'S2', title:'Base-building runs: easy pace, heart-rate capped, 4x/week', overcomes:['C0'], implements:['G1'], active:true },
    { id:'S3', title:'Essay engine: batch-draft a month of essays',           overcomes:['C2'], implements:['G3'] },
    { id:'S4', title:'Automate savings on every paid invoice',                 overcomes:['C3'], implements:['G2'], active:true },
    { id:'S5', title:'Consolidate everything into Fieldnote, one inbox',      overcomes:['C4'], implements:['G4'], active:true },
  ],

  // 8. PROJECTS · 9. WORK
  projects: [
    { id:'P0', title:'Northslope client pipeline', strategy:'S0', dims:['freedom','money'], status:'amber',
      work:[
        { id:'W0', title:'Book 4 discovery calls this week',        strategy:'S0', eta:'this wk', status:'amber', owner:'AC' },
        { id:'W1', title:'Send 2 proposals',                        strategy:'S1', eta:'this wk', status:'amber', owner:'AC' },
        { id:'W2', title:'Publish the fixed-scope sprint offer',    strategy:'S1', eta:'Jul',     status:'red',   owner:'AC' },
      ]},
    { id:'P1', title:'Fieldnote app', strategy:'S5', dims:['infrastructure','creative'], status:'green',
      work:[
        { id:'W3', title:'Ship the beta to 10 testers',            strategy:'S5', eta:'Aug',     status:'green', owner:'AR' },
        { id:'W4', title:'Wire the four-app note import',          strategy:'S5', eta:'this wk',  status:'amber', owner:'AR' },
      ]},
    { id:'P2', title:'10K training block', strategy:'S2', dims:['health'], status:'green',
      work:[
        { id:'W5', title:'Long run Sunday, easy pace',            strategy:'S2', eta:'this wk',  status:'green', owner:'AC' },
        { id:'W6', title:'Log 4 runs this week',                  strategy:'S2', eta:'weekly',   status:'green', owner:'AC' },
      ]},
    { id:'P3', title:'Essay engine', strategy:'S3', dims:['creative'], status:'amber',
      work:[
        { id:'W7', title:'Draft essays 10 and 11',               strategy:'S3', eta:'this wk',  status:'amber', owner:'AR' },
        { id:'W8', title:'Batch outlines for the month',         strategy:'S3', eta:'Jul',      status:'amber', owner:'AR' },
      ]},
    { id:'P4', title:'Runway and savings', strategy:'S4', dims:['money'], status:'green',
      work:[
        { id:'W9',  title:'Automate the invoice-to-savings transfer', strategy:'S4', eta:'Jul',  status:'green', owner:'AC' },
        { id:'W10', title:'Close the last credit-card balance',       strategy:'S4', eta:'Aug',  status:'amber', owner:'AC' },
      ]},
  ],

  // 10. TEAM — humans + agents
  team: [
    { id:'T0', name:'Alex', role:'Principal', kind:'human',
      owns:['P0','P2','P4'], avatar:'AC', note:'Sets direction, makes the calls, does the reps.' },
    { id:'T1', name:'Aria', role:'Primary DA · context + coaching + execution', kind:'agent',
      owns:['P1','P3'], avatar:'AR', note:'Full context; candid by duty; keeps the pipeline and the essays moving.' },
    { id:'T2', name:'Sam', role:'Accountability partner', kind:'human',
      owns:[], avatar:'SM', note:'Weekly check-in on runs and shipping. Keeps the streaks honest.' },
  ],

  // 11. BUDGET — money, time, attention
  budget: [
    { id:'B0', kind:'money',     label:'Monthly outflow',       value:'$4.8k', of:'$5.5k',      pct:87, warn:true,
      funds:['P4'], note:'Lean months; margin about $1,150 after fixed costs.' },
    { id:'B1', kind:'money',     label:'Consumer debt',         value:'$2.1k', of:'$0 target',  pct:15,
      funds:['P4'], note:'One card balance left, on track to clear by August.' },
    { id:'B2', kind:'money',     label:'Emergency fund',        value:'$12.4k', of:'$18k',      pct:69, warn:true,
      funds:['G2'], note:'Six months of fixed expenses. About $5,600 to go.' },
    { id:'B3', kind:'time',      label:'Discovery calls / wk',  value:'2',     of:'4 calls',    pct:50,
      funds:['P0'], note:'The controllable input the pipeline runs on.' },
    { id:'B4', kind:'time',      label:'Runs / wk',             value:'3',     of:'4',          pct:75,
      funds:['P2'], note:'Easy pace, heart-rate capped. Consistency over intensity.' },
    { id:'B5', kind:'attention', label:'Active priorities',     value:'3',     of:'3',          pct:100,
      funds:['P0','P1','P2'], note:'Client pipeline, Fieldnote, training. Everything else waits.' },
  ],

  // Auto-generated next moves
  recommendations: [
    { id:'R0',
      action:'Book this week\'s four discovery calls before Wednesday.',
      because:'G0 runs on outreach volume, and the pipeline is the binding input for runway.',
      upstream:['MT0','S0','G0','M2'],
      effort:'45 min',
      impact:'high' },
    { id:'R1',
      action:'Ship the Fieldnote four-app import this week.',
      because:'It unblocks the beta and fixes the scattered-notes problem in one move.',
      upstream:['W4','S5','G4','PB2'],
      effort:'half a day',
      impact:'high' },
    { id:'R2',
      action:'Automate the invoice-to-savings transfer.',
      because:'Every paid invoice should move money to the fund without a decision.',
      upstream:['MT5','S4','G2','M2'],
      effort:'one setup',
      impact:'med' },
  ],

  // Orphans
  stranded: {
    work_no_goal: [],
    goals_no_strategy: [],
    strategies_idle: [
      { id:'S3', title:'Essay engine: batch a month of drafts', reason:'parked until the client pipeline is steady' },
    ],
  },

  subtabs: [
    { id:'business',  label:'Studio',    dim:'money',         cur:40, ideal:90, velo:+1.0, target:'Dec',
      top:'1 of 3 retainers signed. 4 discovery calls + 2 proposals a week is the whole game right now' },
    { id:'finances',  label:'Finances',  dim:'money',         cur:40, ideal:90, velo:+1.0, target:'Nov',
      top:'Fund $12.4k of $18k · one card balance ($2.1k) left · margin about $1,150/mo' },
    { id:'health',    label:'Health',    dim:'health',        cur:45, ideal:90, velo:+0.6, target:'Oct',
      top:'10K at 58:30, chasing sub-55 · 4 easy runs a week, heart-rate capped' },
    { id:'work',      label:'Career',    dim:'freedom',       cur:50, ideal:90, velo:+0.8, target:'Dec',
      top:'Going independent: 1 retainer signed, Fieldnote beta in Aug, essays publishing on cadence' },
    { id:'life',      label:'Life',      dim:'relationships', cur:75, ideal:90, velo:+0.2, target:'ongoing',
      top:'Steady with friends and family; weekly check-ins with Sam keep the streaks honest' },
  ],

  // Preference context — quiet strip below primitives
  preferences: {
    books:      ['Design and systems thinking', 'Habit design and cognitive science', 'Essays on craft', 'Long-form nonfiction'],
    films:      ['—'],
    anime:      ['—'],
    characters: ['—'],
    aphorisms:  ['Ship before it is perfect', 'Volume is the strategy', 'Easy pace builds the base', 'One inbox, not four'],
    hobbies:    ['Running', 'Sketching', 'Coffee', 'Reading', 'Writing'],
    literature: ['Design essays', 'Systems and complexity', 'Stoic and pragmatic philosophy'],
  },

  narrativeSeed: {
    days_into: 5,
    push_name: 'Client pipeline push',
    current_work: 'W0',
    via_strategy: 'S0',
    addresses: 'C3',
    moves_goal: 'G0',
    serves_mission: 'M2',
  },
  workNarrative: null,
  currentStateNarrative: 'Going independent as a product designer with one retainer signed and a pipeline to fill. Feast-famine income and afternoon energy dips are the two binding constraints. Emergency fund at $12.4k of $18k; Fieldnote beta close; essays publishing on cadence.',
  idealStateNarrative: 'By mid-2027: three retainer clients under Northslope Studio, zero consumer debt with a full six-month fund, a sub-55 10K held for months, and 24 essays published. Fieldnote shipped and Aria running the daily system.',
  currentStateBullets: [
    { label: 'Focus', value: 'Client pipeline + Fieldnote beta' },
    { label: 'Energy', value: '6/10, afternoons dip' },
    { label: 'Fund', value: '$12.4k of $18k' },
    { label: 'Debt', value: '$2.1k, clearing by Aug' },
    { label: 'Runway', value: 'about 8 months' },
  ],
  idealStateBullets: [
    { label: 'Craft', value: 'World-class independent product designer' },
    { label: 'Health', value: 'Sub-55 10K held; 4 easy runs a week' },
    { label: 'Money', value: 'Zero consumer debt; 6-month fund' },
    { label: 'Freedom', value: '3 retainers; Northslope Studio steady' },
    { label: 'Relationships', value: 'Steady, with a weekly accountability check-in' },
    { label: 'Infrastructure', value: 'Aria as daily driver; Fieldnote shipped' },
  ],
  synthesisParagraph: 'Everything points at going independent without a cash scare. The client pipeline buys runway, automated savings builds the buffer, and the running block buys back the afternoon energy to do both. The binding gap is steady outreach, so the strategy reduces to a few controllable inputs each week.',
  synthesisSegments: [
    { kind: 'text', text: 'Right now your work is pointed at ' },
    { kind: 'mission', text: 'a solid financial foundation', id: 'M2' },
    { kind: 'text', text: '. That is where everything lines up. The two gaps you keep running into are ' },
    { kind: 'problem', text: 'feast-famine income', id: 'PB0' },
    { kind: 'text', text: ' and ' },
    { kind: 'problem', text: 'low-energy afternoons', id: 'PB1' },
    { kind: 'text', text: '. Which is exactly why you are leaning on ' },
    { kind: 'strategy', text: 'weekly outreach, four discovery calls', id: 'S0' },
    { kind: 'text', text: ' as your strategy stack. ' },
    { kind: 'work', text: '11 work items' },
    { kind: 'text', text: ' across 5 projects in motion.' },
  ],
  recommendedNextAction: 'Book this week\'s four discovery calls, and ship the Fieldnote import. Those two inputs move G0 and G4 before the week even starts.',
} as const satisfies Telos;
