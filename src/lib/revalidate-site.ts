import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA_CACHE_TAG } from "@/lib/site-storage";

const PUBLIC_PATHS = ["/", "/casts", "/gacha", "/collection", "/schedule", "/system", "/media"] as const;

/** 管理画面からの保存後、公開ページのキャッシュを破棄する */
export function revalidateSiteContent() {
  revalidateTag(SITE_DATA_CACHE_TAG);
  revalidatePath("/", "layout");
  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }
}
