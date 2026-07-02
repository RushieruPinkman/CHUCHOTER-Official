export type PushNotificationKind = "dm_reply" | "bonus_reminder" | "gacha_free";

export interface PushSubscriptionPreferences {
  notifyDm: boolean;
  notifyBonus: boolean;
  notifyGacha: boolean;
}

export interface PushSubscriptionRecord extends PushSubscriptionPreferences {
  id: string;
  userKey: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface PushSubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  preferences?: Partial<PushSubscriptionPreferences>;
}
