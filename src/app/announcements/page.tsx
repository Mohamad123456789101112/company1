import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Announcements are delivered as bell notifications now. */
export default async function AnnouncementsRedirect() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard/notifications" : "/login?next=%2Fdashboard%2Fnotifications");
}
