import { getDashboardAccessForCurrentUser } from "../../../../src/modules/auth/dashboard-access";

export async function hasSpotifyDashboardAccess() {
  const access = await getDashboardAccessForCurrentUser();
  return access.ok;
}
