import { readWork } from "@/lib/store";
import { view } from "@/lib/workspace";
import { Workspace } from "@/components/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AppPage() {
  const work = readWork();
  if (!work.started) redirect("/");
  return <Workspace initial={view()} />;
}
