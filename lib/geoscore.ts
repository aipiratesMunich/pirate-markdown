import type { PageData } from "~lib/format"

type Status = "pass" | "partial" | "fail"

interface Check {
  label: string
  points: number
  earned: number
  status: Status
  detail: string
  fix: string
}

const ICON: Record<Status, string> = {
  pass: "✅",
  partial: "🟡",
  fail: "❌"
}

/**
 * Builds the instruction for the Fix Generator: turns the GEO gaps into a
 * concrete request for copy-paste-ready meta + schema.org markup. Passed as the
 * system/instruction to askLlm(), with the page Markdown as the user content.
 */
export function geoFixPrompt(pageData: PageData): string {
  const meta = pageData.meta || {}
  const hasDesc = !!meta["description"]
  const hasJsonLd = (pageData.jsonLd || []).length > 0
  return [
    "You are a GEO/SEO engineer. From the page content below, produce copy-paste-ready HTML that makes this page more legible to LLMs and search crawlers.",
    "",
    `Page URL: ${pageData.url || "unknown"}`,
    `Language: ${meta["lang"] || "infer from content"}`,
    `Current meta description: ${hasDesc ? "present" : "MISSING"}`,
    `Current structured data: ${hasJsonLd ? "present" : "MISSING"}`,
    "",
    "Produce exactly:",
    '1. An optimized <meta name="description"> tag (50–160 chars) that reflects the real content.',
    '2. A complete schema.org JSON-LD <script type="application/ld+json"> block. Pick the best-fitting @type (Article, WebPage, Organization, FAQPage, Product, …) and fill name/headline, description, author, datePublished, url, and relevant fields inferred from the content.',
    "",
    "Output only fenced HTML code blocks, no commentary. Write in the page's own language."
  ].join("\n")
}

function countHeadings(markdown: string): { levels: Set<number>; h1: number } {
  const levels = new Set<number>()
  let h1 = 0
  markdown.split("\n").forEach((line) => {
    const m = line.match(/^(#{1,6})\s+\S/)
    if (m) {
      const lvl = m[1].length
      levels.add(lvl)
      if (lvl === 1) h1++
    }
  })
  return { levels, h1 }
}

function grade(score: number): string {
  if (score >= 90) return "A · excellent"
  if (score >= 75) return "B · good"
  if (score >= 60) return "C · workable"
  if (score >= 40) return "D · weak"
  return "F · barely legible to machines"
}

/**
 * Scores a page for GEO / LLM readiness: the signals an answer engine or crawler
 * relies on to understand and cite a page. Returns a Markdown scorecard with a
 * 0–100 total, per-signal breakdown, and a prioritized fix list.
 */
export function generateGeoScore(pageData: PageData): string {
  const meta = pageData.meta || {}
  const md = pageData.markdown || ""
  const { levels, h1 } = countHeadings(md)
  const wordCount = md.split(/\s+/).filter(Boolean).length
  const desc = meta["description"] || ""
  const hasJsonLd = (pageData.jsonLd || []).length > 0
  const hasOg = ["og:title", "og:description", "og:image"].some((k) => meta[k])

  const checks: Check[] = []
  const add = (
    label: string,
    points: number,
    condition: boolean | number,
    detail: string,
    fix: string
  ) => {
    let earned: number
    let status: Status
    if (typeof condition === "number") {
      earned = Math.round(points * Math.max(0, Math.min(1, condition)))
      status = condition >= 1 ? "pass" : condition > 0 ? "partial" : "fail"
    } else {
      earned = condition ? points : 0
      status = condition ? "pass" : "fail"
    }
    checks.push({ label, points, earned, status, detail, fix })
  }

  // 1. Title (10)
  const titleLen = (pageData.title || "").trim().length
  add(
    "Title",
    10,
    titleLen === 0 ? 0 : titleLen >= 10 && titleLen <= 65 ? 1 : 0.5,
    titleLen ? `${titleLen} chars` : "missing",
    "Set a descriptive <title> of 10–65 characters."
  )

  // 2. Meta description (15)
  const dLen = desc.trim().length
  add(
    "Meta description",
    15,
    dLen === 0 ? 0 : dLen >= 50 && dLen <= 160 ? 1 : 0.5,
    dLen ? `${dLen} chars` : "missing",
    "Add a meta description of 50–160 characters."
  )

  // 3. Structured data (20) — the biggest single lever
  add(
    "Structured data (JSON-LD)",
    20,
    hasJsonLd,
    hasJsonLd ? `${(pageData.jsonLd || []).length} block(s)` : "none",
    "Add schema.org JSON-LD (Article, Organization, WebPage, FAQ …)."
  )

  // 4. Headings (15)
  const headingScore = h1 >= 1 ? (levels.size >= 2 ? 1 : 0.6) : levels.size ? 0.4 : 0
  add(
    "Heading structure",
    15,
    headingScore,
    h1 >= 1 ? `H1 present, ${levels.size} level(s)` : "no H1",
    "Use exactly one H1 and a nested H2/H3 hierarchy."
  )

  // 5. Open Graph (10)
  add(
    "Open Graph",
    10,
    hasOg,
    hasOg ? "present" : "missing",
    "Add og:title, og:description and og:image for rich sharing + AI previews."
  )

  // 6. Canonical (10)
  add(
    "Canonical URL",
    10,
    !!meta["canonical"],
    meta["canonical"] ? "set" : "missing",
    "Declare <link rel=\"canonical\"> to avoid duplicate-content ambiguity."
  )

  // 7. Content depth (10)
  add(
    "Content depth",
    10,
    wordCount >= 600 ? 1 : wordCount >= 250 ? 0.6 : wordCount > 0 ? 0.3 : 0,
    `${wordCount} words`,
    "Thin pages get ignored. Aim for 600+ words of substantive text."
  )

  // 8. Language (5)
  add(
    "Language declared",
    5,
    !!meta["lang"],
    meta["lang"] || "missing",
    "Set <html lang> so models know the page language."
  )

  // 9. Author / date (5)
  const hasAuthorDate = !!(pageData.author || pageData.date || meta["author"])
  add(
    "Author / date",
    5,
    hasAuthorDate,
    hasAuthorDate ? "present" : "missing",
    "Expose author and publish date (byline or JSON-LD) for E-E-A-T signals."
  )

  const total = checks.reduce((s, c) => s + c.earned, 0)
  const max = checks.reduce((s, c) => s + c.points, 0)

  const lines: string[] = []
  lines.push(`# GEO Score: ${total} / ${max}`)
  lines.push("")
  lines.push(`**Grade:** ${grade(total)}`)
  lines.push("")
  lines.push("| Signal | Status | Score | Detail |")
  lines.push("| --- | :---: | :---: | --- |")
  checks.forEach((c) =>
    lines.push(
      `| ${c.label} | ${ICON[c.status]} | ${c.earned}/${c.points} | ${c.detail} |`
    )
  )
  lines.push("")

  const fixes = checks
    .filter((c) => c.status !== "pass")
    .sort((a, b) => b.points - b.earned - (a.points - a.earned))
  if (fixes.length) {
    lines.push("## Top fixes")
    lines.push("")
    fixes.forEach((c) =>
      lines.push(`- **+${c.points - c.earned}** ${c.label}: ${c.fix}`)
    )
  } else {
    lines.push("Nothing to fix. This page is built for machines.")
  }

  return lines.join("\n").trim()
}
