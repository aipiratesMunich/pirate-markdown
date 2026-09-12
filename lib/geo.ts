import { generatePageMap, type PageData } from "~lib/format"

/**
 * Flattens a JSON-LD graph into { type, name } entity rows. Handles both single
 * objects and @graph arrays, and skips nodes without a recognizable @type.
 */
function extractEntities(jsonLd: any[]): { type: string; name: string }[] {
  const rows: { type: string; name: string }[] = []
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (node["@graph"]) visit(node["@graph"])
    const type = node["@type"]
    if (type) {
      const typeStr = Array.isArray(type) ? type.join(", ") : String(type)
      const name =
        node.name ||
        node.headline ||
        node.title ||
        node.legalName ||
        node["@id"] ||
        ""
      rows.push({ type: typeStr, name: String(name) })
    }
  }
  visit(jsonLd)
  return rows
}

const OG_KEYS = [
  "og:title",
  "og:description",
  "og:type",
  "og:site_name",
  "og:image",
  "og:url"
]

const TW_KEYS = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image"
]

/**
 * Builds a structured GEO/SEO extract: the signals an LLM or search crawler
 * reads to understand a page — meta basics, Open Graph, Twitter cards, declared
 * schema.org entities, and the heading outline.
 */
export function generateGeoExtract(pageData: PageData): string {
  const meta = pageData.meta || {}
  const jsonLd = pageData.jsonLd || []
  const lines: string[] = ["# GEO / SEO Extract", ""]

  // Core SEO signals
  lines.push("## SEO Basics", "")
  const core: [string, string | undefined][] = [
    ["Title", pageData.title],
    ["Meta Description", meta["description"]],
    ["Canonical", meta["canonical"]],
    ["Language", meta["lang"]],
    ["Robots", meta["robots"]],
    ["Keywords", meta["keywords"]],
    ["Author", pageData.author || meta["author"]]
  ]
  const coreRows = core.filter(([, v]) => v && v.trim())
  if (coreRows.length) {
    coreRows.forEach(([k, v]) => lines.push(`- **${k}:** ${v}`))
  } else {
    lines.push("- _No SEO basics found._")
  }
  lines.push("")

  // Open Graph
  const og = OG_KEYS.filter((k) => meta[k]).map((k) => `- **${k}:** ${meta[k]}`)
  if (og.length) {
    lines.push("## Open Graph", "", ...og, "")
  }

  // Twitter card
  const tw = TW_KEYS.filter((k) => meta[k]).map((k) => `- **${k}:** ${meta[k]}`)
  if (tw.length) {
    lines.push("## Twitter Card", "", ...tw, "")
  }

  // Structured data entities
  const entities = extractEntities(jsonLd)
  lines.push("## Structured Entities (schema.org)", "")
  if (entities.length) {
    lines.push("| @type | Name |", "| --- | --- |")
    entities.forEach((e) =>
      lines.push(`| ${e.type || "—"} | ${e.name || "—"} |`)
    )
  } else {
    lines.push("- _No JSON-LD / structured data found._")
  }
  lines.push("")

  // Heading outline (reuses the tree renderer from format.ts)
  const outline = generatePageMap(pageData.markdown || "", "Heading Structure")
  if (outline) {
    lines.push(outline.replace(/^# Page Structure Map/, "## Heading Structure"))
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
