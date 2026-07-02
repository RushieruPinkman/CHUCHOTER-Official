/* CHUCHOTER Web Push Service Worker */

self.addEventListener("push", (event) => {
  let payload = {
    title: "CHUCHOTER",
    body: "新しいお知らせがあります。",
    url: "/",
    tag: "chuchoter",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || "chuchoter",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          const clientUrl = new URL(client.url);
          const nextUrl = new URL(targetUrl, clientUrl.origin).href;
          if (clientUrl.pathname === new URL(nextUrl).pathname) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
