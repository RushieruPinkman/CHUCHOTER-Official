"use client";

import { useEffect, useRef } from "react";
import type { DailyTaskId } from "@/lib/cp";
import { isVisitDailyTask } from "@/lib/cp";
import { completeDailyTaskFromClient } from "@/lib/cp-client";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";

interface DailyTaskTrackerProps {
  taskId: DailyTaskId;
}

export default function DailyTaskTracker({ taskId }: DailyTaskTrackerProps) {
  const { userKey, ready } = useCollectionUserKey();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isVisitDailyTask(taskId)) return;
    if (!ready || !userKey || attemptedRef.current) return;
    attemptedRef.current = true;

    void completeDailyTaskFromClient(taskId).catch(() => {
      /* 既に完了済みなどは無視 */
    });
  }, [ready, taskId, userKey]);

  return null;
}
