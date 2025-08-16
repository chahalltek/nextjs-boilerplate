// app/admin/cws/page.jsx
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function CwsAlias() {
  redirect("/admin/recaps");
}
