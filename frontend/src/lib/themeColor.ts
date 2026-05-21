function ensureThemeMeta() {
    let meta = document.querySelector('meta[name="theme-color"]')

    if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
    }

    return meta
}

export function setThemeColor(color: string) {
    const meta = ensureThemeMeta()
    meta.setAttribute('content', color)
}

export function syncThemeColorWithSections(selector = '[data-theme-sync]') {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (!sections.length) return () => { }

    const meta = ensureThemeMeta()
    const originalColor = meta.getAttribute('content') || '#ffffff'

    const getSectionColor = (element: HTMLElement) => {
        const explicit = element.dataset.themeColor?.trim()
        if (explicit) return explicit

        const computed = window.getComputedStyle(element).backgroundColor
        return computed || originalColor
    }

    let activeSection: HTMLElement | null = null

    const applyFromSection = (section: HTMLElement | null) => {
        if (!section) {
            meta.setAttribute('content', originalColor)
            return
        }

        const color = getSectionColor(section)
        meta.setAttribute('content', color)
    }

    const pickMostRelevantSection = () => {
        const viewportMiddle = window.innerHeight * 0.35

        let best: { el: HTMLElement; distance: number } | null = null

        for (const section of sections) {
            const rect = section.getBoundingClientRect()
            const sectionTop = Math.max(rect.top, 0)
            const sectionBottom = Math.min(rect.bottom, window.innerHeight)
            const visibleHeight = sectionBottom - sectionTop

            if (visibleHeight <= 0) continue

            const sectionAnchor = rect.top + Math.min(rect.height * 0.35, 160)
            const distance = Math.abs(sectionAnchor - viewportMiddle)

            if (!best || distance < best.distance) {
                best = { el: section, distance }
            }
        }

        activeSection = best?.el ?? null
        applyFromSection(activeSection)
    }

    const observer = new IntersectionObserver(
        () => {
            pickMostRelevantSection()
        },
        {
            threshold: [0, 0.15, 0.35, 0.6, 0.85, 1],
            rootMargin: '-1px 0px -45% 0px',
        }
    )

    sections.forEach((section) => observer.observe(section))

    const onResize = () => pickMostRelevantSection()
    window.addEventListener('resize', onResize, { passive: true })

    pickMostRelevantSection()

    return () => {
        observer.disconnect()
        window.removeEventListener('resize', onResize)
        meta.setAttribute('content', originalColor)
    }
}