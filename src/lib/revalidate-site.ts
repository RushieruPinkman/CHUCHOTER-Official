import { revalidatePath } from "next/cache";

const PUBLIC_PATHS = ["/", "/casts", "/schedule", "/system", "/media"] as const;

/** 管理画面からの保存後、公開ページのキャッシュを破棄する */
export function revalidateSiteContent() {
  revalidatePath("/", "layout");
  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }
}
