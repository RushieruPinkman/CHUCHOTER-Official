"use client";

const STAGES = [
  { n: 1 as const, label: "閉", desc: "扉の前" },
  { n: 2 as const, label: "開", desc: "扉が開く" },
  { n: 3 as const, label: "全開", desc: "向こう側" },
];

interface GachaStageIndicatorProps {
  current: 1 | 2 | 3;
}

export default function GachaStageIndicator({ current }: GachaStageIndicatorProps) {
  return (
    <div className="gacha-stage-indicator" aria-label={`扉の演出 ${current} / 3`}>
      {STAGES.map(({ n, label, desc }, index) => {
        const isActive = current === n;
        const isDone = current > n;

        return (
          <div key={n} className="gacha-stage-indicator__group">
            <div
              className={[
                "gacha-stage-indicator__step",
                isActive ? "is-active" : "",
                isDone ? "is-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="gacha-stage-indicator__num">{n}</span>
              <span className="gacha-stage-indicator__label">{label}</span>
              {isActive && <span className="gacha-stage-indicator__desc">{desc}</span>}
            </div>
            {index < STAGES.length - 1 && (
              <span
                className={`gacha-stage-indicator__connector ${isDone ? "is-done" : ""}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
