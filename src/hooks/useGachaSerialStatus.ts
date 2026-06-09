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

export function useGachaSerialStatusSync(
  draw: GachaDrawResult | null,
  userKey: string | null
): GachaDrawResult | null {
  const [syncedDraw, setSyncedDraw] = useState(draw);

  useEffect(() => {
    setSyncedDraw(draw);
  }, [draw]);

  const refreshStatus = useCallback(async () => {
    const serial = draw?.serialNumber?.trim();
    if (!serial) return;

    const statusMap = await fetchGachaSerialStatuses([serial]);
    const status = statusMap[serial];
    if (!status) return;

    setSyncedDraw((current) => {
      if (!current) return current;
      return applySerialStatusToDraw(current, statusMap);
    });

    const historyKey = buildGachaHistoryKey(userKey);
    if (historyKey) {
      updateGachaDrawHistorySerialStatus(historyKey, serial, status);
    }
  }, [draw, userKey]);

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

  const refresh = useCallback(async () => {
    const unique = [...new Set(serials.map((serial) => serial.trim()).filter(Boolean))];
    if (unique.length === 0) {
      setStatusMap({});
      return;
    }

    const nextMap = await fetchGachaSerialStatuses(unique);
    setStatusMap(nextMap);
  }, [serials]);

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
