import { PortalShell } from "@/components/portal-shell"

export default function DealerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PortalShell>{children}</PortalShell>
}
