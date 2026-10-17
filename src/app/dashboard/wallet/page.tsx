import { redirect } from "next/navigation";

/** The wallet flow was replaced by direct course checkout + center codes. */
export default function WalletRedirect() {
  redirect("/dashboard/codes");
}
