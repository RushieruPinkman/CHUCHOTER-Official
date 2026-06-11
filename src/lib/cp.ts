export const CP_TASK_REWARD = 10;
export const CP_DAILY_TASK_COUNT = 3;
export const CP_DAILY_TASK_TOTAL = CP_TASK_REWARD * CP_DAILY_TASK_COUNT;
export const CP_GACHA_SINGLE_COST = 100;
export const CP_GACHA_TEN_COST = 900;

export type DailyTaskId = "visit_entrance" | "visit_schedule" | "visit_residents";

export interface DailyTaskDefinition {
  id: DailyTaskId;
  title: string;
  description: string;
  href: string;
  cp: number;
}

export const DAILY_TASKS: DailyTaskDefinition[] = [
  {
    id: "visit_entrance",
    title: "エントランスを訪れる",
    description: "トップページを開いてクラブの雰囲気をチェック",
    href: "/",
    cp: CP_TASK_REWARD,
  },
  {
    id: "visit_schedule",
    title: "予定表を確認する",
    description: "今週の出勤予定・イベント情報を見る",
    href: "/schedule",
    cp: CP_TASK_REWARD,
  },
  {
    id: "visit_residents",
    title: "住人紹介を見る",
    description: "レジデンスのプロフィールをチェック",
    href: "/casts",
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
    enabled,
  };
}
