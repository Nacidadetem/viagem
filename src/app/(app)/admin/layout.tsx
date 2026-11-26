import { exigirAdmin } from "@/lib/sessao";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return children;
}
