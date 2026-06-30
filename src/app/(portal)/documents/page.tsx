import { Download, FileText, Image, ShieldCheck } from "lucide-react"
import { SectionHeader } from "@/components/portal-shell"

const documents = [
  {
    title: "Catalog PDF",
    description: "Current Aozoom product catalog for dealer ordering and shop reference.",
    icon: FileText,
    status: "Coming soon",
  },
  {
    title: "MAP Policy",
    description: "Minimum advertised price guidance and channel rules.",
    icon: ShieldCheck,
    status: "Coming soon",
  },
  {
    title: "Warranty Guide",
    description: "Warranty terms, claim preparation, and customer support routing.",
    icon: FileText,
    status: "Coming soon",
  },
  {
    title: "Marketing Assets",
    description: "Approved logos, product photos, banners, and social media materials.",
    icon: Image,
    status: "Coming soon",
  },
]

export default function DocumentsPage() {
  return (
    <>
      <SectionHeader
        eyebrow="Dealer Resources"
        title="Documents"
        description="Phase 1 keeps this as a clean resource center. Files can later come from Medusa metadata, S3/R2, or a CMS."
      />
      <div className="grid cards-3">
        {documents.map((item) => {
          const Icon = item.icon

          return (
            <article key={item.title} className="card">
              <Icon color="#ef4b2a" aria-hidden="true" />
              <h2 style={{ marginTop: 14 }}>{item.title}</h2>
              <p className="muted" style={{ marginTop: 10 }}>
                {item.description}
              </p>
              <button
                className="btn btn-secondary"
                type="button"
                disabled
                style={{ marginTop: 18 }}
              >
                <Download size={16} aria-hidden="true" />
                {item.status}
              </button>
            </article>
          )
        })}
      </div>
    </>
  )
}
