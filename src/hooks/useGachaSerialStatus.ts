"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applySerialStatusToDraw,
  fetchGachaSerialStatuses,
  GACHA_SERIAL_STATUS_UPDATED_EVENT,
} from "@/lib/gacha-serial-client";
import type { GachaDrawResult } from "@/lib/gacha";
import type { GachaSerialStatus } from "@/lib/gacha-serial";
import {
  buildGachaHistoryKey,
  updateGachaDrawHistorySerialStatus,
} from "@/lib/gacha-history";

function buildSerialsKey(serials: string[]): string {
  return [...new Set(serials.map((serial) => serial.trim()).filter(Boolean))].sort().join("\0");
}

function statusMapsEqual(
  left: Record<string, GachaSerialStatus>,
  right: Record<string, GachaSerialStatus>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return rightKeys.every((key) => left[key] === right[key]);
}

export function useGachaSerialStatusSync(
  draw: GachaDrawResult | null,
  userKey: string | null
): GachaDrawResult | null {
  const [syncedDraw, setSyncedDraw] = useState(draw);
  const drawSerial = draw?.serialNumber?.trim() ?? "";

  useEffect(() => {
    setSyncedDraw(draw);
  }, [draw]);

  const refreshStatus = useCallback(async () => {
    if (!drawSerial) return;

    const statusMap = await fetchGachaSerialStatuses([drawSerial]);
    const status = statusMap[drawSerial];
    if (!status) return;

    setSyncedDraw((current) => {
      if (!current) return current;
      const next = applySerialStatusToDraw(current, statusMap);
      return next === current ? current : next;
    });

    const historyKey = buildGachaHistoryKey(userKey);
    if (historyKey) {
      updateGachaDrawHistorySerialStatus(historyKey, drawSerial, status);
    }
  }, [drawSerial, userKey]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const onUpdated = () => {
      void refreshStatus();
    };

    window.addEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 30000);

    return () => {
      window.removeEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, [refreshStatus]);

  return syncedDraw;
}

export function useGachaSerialStatusMap(serials: string[]): Record<string, GachaSerialStatus> {
  const [statusMap, setStatusMap] = useState<Record<string, GachaSerialStatus>>({});
  const serialsKey = buildSerialsKey(serials);

  const refresh = useCallback(async () => {
    const unique = serialsKey ? serialsKey.split("\0") : [];
    if (unique.length === 0) {
      setStatusMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const nextMap = await fetchGachaSerialStatuses(unique);
    setStatusMap((prev) => (statusMapsEqual(prev, nextMap) ? prev : nextMap));
  }, [serialsKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };

    window.addEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(GACHA_SERIAL_STATUS_UPDATED_EVENT, onUpdated);
  }, [refresh]);

  return statusMap;
}
