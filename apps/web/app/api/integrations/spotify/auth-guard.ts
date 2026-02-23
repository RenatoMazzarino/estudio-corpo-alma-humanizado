import { createClient } from "../../../../lib/supabase/server";

const ALLOWED_APP_ROLES = new Set(["admin", "owner", "staff", "dashboard"]);

function getAppRole(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function hasSpotifyDashboardAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return false;
  }

  const platformRole = getAppRole(user.role);
  if (platformRole === "authenticated") {
    return true;
  }

  const metadataRole = getAppRole(user.app_metadata?.role);
  return ALLOWED_APP_ROLES.has(metadataRole);
}
