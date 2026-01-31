import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type NotificationJobInsert = Database["public"]["Tables"]["notification_jobs"]["Insert"];

export async function insertNotificationJob(payload: NotificationJobInsert) {
  const supabase = createServiceClient();
  return supabase.from("notification_jobs").insert(payload);
}
