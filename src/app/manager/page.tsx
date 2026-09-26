import { redirect } from "next/navigation";

/** Old manager desk URL — keep bookmarks working after the logistics rename. */
export default function ManagerRedirect() {
  redirect("/logistics");
}
