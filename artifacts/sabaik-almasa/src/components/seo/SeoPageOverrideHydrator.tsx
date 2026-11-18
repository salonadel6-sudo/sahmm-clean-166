import { useEffect } from "react"
import { useLocation } from "wouter"
import { normalizeSeoOverridePath, sanitizeSeoOverrideText } from "@workspace/seo-rank-math"

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || ""

type PublicSeoOverride = {
  path: string
  seoTitle: string
  description: string
  focusKeyword: string
  h1: string
  content: string
}

function setMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement("meta")
    element.name = name
    document.head.appendChild(element)
  }
  if (element.content !== content) element.content = content
}

function fillVisibleContent(target: HTMLElement, content: string) {
  const lines = content.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  const listItems: string[] = []
  const flushList = () => {
    if (!listItems.length) return
    const list = document.createElement("ul")
    list.className = "my-4 list-disc space-y-2 pr-6"
    for (const text of listItems.splice(0)) {
      const item = document.createElement("li")
      item.textContent = text
      list.appendChild(item)
    }
    target.appendChild(list)
  }
  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listItems.push(line.slice(2).trim())
      continue
    }
    flushList()
    if (line.startsWith("## ")) {
      const heading = document.createElement("h2")
      heading.className = "mb-3 mt-7 text-xl font-bold text-slate-900"
      heading.textContent = line.slice(3).trim()
      target.appendChild(heading)
    } else {
      const paragraph = document.createElement("p")
      paragraph.className = "my-3 leading-8"
      paragraph.textContent = line
      target.appendChild(paragraph)
    }
  }
  flushList()
}

function parseOverride(value: unknown, routePath: string): PublicSeoOverride | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (normalizeSeoOverridePath(String(record.path ?? "")) !== routePath) return null
  return {
    path: routePath,
    seoTitle: sanitizeSeoOverrideText(record.seoTitle, 180),
    description: sanitizeSeoOverrideText(record.description, 500),
    focusKeyword: sanitizeSeoOverrideText(record.focusKeyword, 200),
    h1: sanitizeSeoOverrideText(record.h1, 220),
    content: sanitizeSeoOverrideText(record.content),
  }
}

export default function SeoPageOverrideHydrator() {
  const [location] = useLocation()

  useEffect(() => {
    let cancelled = false
    let observer: MutationObserver | null = null
    let animationFrame = 0
    let override: PublicSeoOverride | null = null

    const currentPath = (() => {
      try {
        return normalizeSeoOverridePath(decodeURIComponent(new URL(location, window.location.origin).pathname))
      } catch {
        return null
      }
    })()
    if (!currentPath) return

    const removeInjectedContent = () => {
      document.querySelectorAll("[data-seo-page-override='true']").forEach(element => element.remove())
    }

    const apply = () => {
      if (cancelled || !override) return
      if (override.seoTitle && document.title !== override.seoTitle) document.title = override.seoTitle
      if (override.description) setMeta("description", override.description)
      if (override.focusKeyword) setMeta("seo-focus-keyword", override.focusKeyword)

      const main = document.querySelector<HTMLElement>("main")
      const heading = main?.querySelector<HTMLElement>("h1")
      if (!main || !heading) return
      if (override.h1 && heading.textContent?.trim() !== override.h1) heading.textContent = override.h1

      const existing = main.querySelector<HTMLElement>("[data-seo-page-override='true']")
      if (!override.content) {
        existing?.remove()
        return
      }
      if (existing) return
      const section = document.createElement("section")
      section.dataset.seoPageOverride = "true"
      section.className = "mx-auto w-full max-w-5xl px-4 py-6 text-slate-700"
      section.setAttribute("aria-label", "معلومات إضافية عن الصفحة")
      fillVisibleContent(section, override.content)
      heading.insertAdjacentElement("afterend", section)
    }

    const scheduleApply = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(apply)
    }

    void fetch(`${API_BASE}/api/seo-page-overrides?path=${encodeURIComponent(currentPath)}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled) return
        override = parseOverride(data?.override, currentPath)
        if (!override) return
        observer = new MutationObserver(scheduleApply)
        if (document.body) observer.observe(document.body, { childList: true, subtree: true })
        scheduleApply()
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      observer?.disconnect()
      cancelAnimationFrame(animationFrame)
      removeInjectedContent()
    }
  }, [location])

  return null
}
