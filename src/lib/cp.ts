export const CP_TASK_REWARD = 10;
export const CP_DAILY_TASK_COUNT = 3;
export const CP_DAILY_TASK_TOTAL = CP_TASK_REWARD * CP_DAILY_TASK_COUNT;
export const CP_GACHA_SINGLE_COST = 100;
export const CP_GACHA_TEN_COST = 900;

export type DailyTaskId = "draw_daily_gacha" | "share_gacha_on_x" | "visit_schedule";

export type DailyTaskKind = "draw" | "share" | "visit";

export interface DailyTaskDefinition {
  id: DailyTaskId;
  kind: DailyTaskKind;
  title: string;
  description: string;
  href?: string;
  cp: number;
}

export const DAILY_TASKS: DailyTaskDefinition[] = [
  {
    id: "draw_daily_gacha",
    kind: "draw",
    title: "無料ガチャを引く",
    description: "1日1回の無料抽選を運命の扉で引く",
    href: "/gacha",
    cp: CP_TASK_REWARD,
  },
  {
    id: "share_gacha_on_x",
    kind: "share",
    title: "Xで結果をシェア",
    description: "抽選結果画面の「Xで投稿」から当選・結果をポスト",
    cp: CP_TASK_REWARD,
  },
  {
    id: "visit_schedule",
    kind: "visit",
    title: "予定表を確認する",
    description: "今週の出勤予定・イベント情報をチェック",
    href: "/schedule",
    cp: CP_TASK_REWARD,
  },
];

const TASK_ID_SET = new Set<string>(DAILY_TASKS.map((task) => task.id));

export function isDailyTaskId(value: string): value is DailyTaskId {
  return TASK_ID_SET.has(value);
}

export function getDailyTaskById(taskId: string): DailyTaskDefinition | undefined {
  return DAILY_TASKS.find((task) => task.id === taskId);
}

export function isVisitDailyTask(taskId: DailyTaskId): boolean {
  return getDailyTaskById(taskId)?.kind === "visit";
}

export interface CpState {
  balance: number;
  taskDate: string;
  completedTaskIds: DailyTaskId[];
  tasks: Array<
    DailyTaskDefinition & {
      completed: boolean;
    }
  >;
  costs: {
    singleDraw: number;
    tenDraw: number;
  };
  freeDrawAvailable: boolean;
  enabled: boolean;
}

export function buildEmptyCpState(taskDate: string, enabled: boolean): CpState {
  return {
    balance: 0,
    taskDate,
    completedTaskIds: [],
    tasks: DAILY_TASKS.map((task) => ({ ...task, completed: false })),
    costs: {
      singleDraw: CP_GACHA_SINGLE_COST,
      tenDraw: CP_GACHA_TEN_COST,
    },
    freeDrawAvailable: enabled,
    enabled,
  };
}
