// app/admin/recaps/page.jsx
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function RecapsAlias() {
  redirect("/admin/cws");
}
