import { redirect } from "next/navigation";

export const metadata = { title: "Applications · Admin" };

export default function AdminApplicationsRedirect() {
  redirect("/admin/partners/applications");
}
