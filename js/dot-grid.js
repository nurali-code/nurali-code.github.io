(() => {
    const createDotGrid = (canvas) => {
        const context = canvas.getContext('2d')
        const base = document.createElement('canvas')
        const baseContext = base.getContext('2d')
        if (!context || !baseContext) return { destroy() {} }

        const animation = window.gsap
        const desktop = window.matchMedia('(min-width: 741px)')
        const finePointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)')
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
        const events = new AbortController()
        const options = { signal: events.signal, passive: true }
        const radius = 1.2
        const reach = 150
        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
        // Precompute colours; no colour parsing or tweens per dot during movement.
        const colours = Array.from({ length: 64 }, (_, index) => {
            const amount = index / 63
            return `rgba(255,255,255,${.8 * amount})`
        })
        let dots = []
        let width = 0
        let height = 0
        let tracking = false
        let running = false
        let inside = false
        let strength = 0
        let lastMove = -Infinity
        let resizeFrame = 0

        const drawBase = () => {
            context.clearRect(0, 0, width, height)
            context.drawImage(base, 0, 0, width, height)
        }

        const stop = () => {
            animation?.ticker.remove(tick)
            running = false
        }

        const reset = () => {
            stop()
            inside = false
            strength = 0
            lastMove = -Infinity
            dots.forEach((dot) => { dot.amount = 0 })
            drawBase()
        }

        const tick = (_time, deltaTime) => {
            const delta = Math.min(deltaTime / 1000, .05)
            const follow = 1 - Math.exp(-delta / .12)
            const response = 1 - Math.exp(-delta / .16)
            pointer.x += (pointer.targetX - pointer.x) * follow
            pointer.y += (pointer.targetY - pointer.y) * follow
            const target = inside && performance.now() - lastMove < 180 ? 1 : 0
            strength += (target - strength) * (1 - Math.exp(-delta / (target ? .12 : .45)))
            drawBase()

            // One restrained halo for the whole field, without per-dot blur.
            if (strength > .002) {
                const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, reach)
                glow.addColorStop(0, `rgba(255,255,255,${strength * .04})`)
                glow.addColorStop(.45, `rgba(255,255,255,${strength * .02})`)
                glow.addColorStop(1, 'rgba(255,255,255,0)')
                context.fillStyle = glow
                context.fillRect(pointer.x - reach, pointer.y - reach, reach * 2, reach * 2)
            }

            let active = false
            dots.forEach((dot) => {
                const dx = dot.x - pointer.x
                const dy = dot.y - pointer.y
                const distanceSquared = dx * dx + dy * dy
                const proximity = distanceSquared < reach * reach ? 1 - Math.sqrt(distanceSquared) / reach : 0
                const influence = proximity * proximity * (3 - 2 * proximity) * strength
                dot.amount += (influence - dot.amount) * response
                if (dot.amount < .002) {
                    dot.amount = 0
                    return
                }
                active = true
                context.beginPath()
                context.arc(dot.x, dot.y, radius * (1 + .85 * dot.amount), 0, Math.PI * 2)
                context.fillStyle = colours[Math.round(dot.amount * 63)]
                context.fill()
            })

            if (!target && strength < .002 && !active) {
                reset()
            }
        }

        const onPointerMove = (event) => {
            if (event.pointerType === 'touch' || document.hidden) return
            if (event.clientX < 0 || event.clientX > width || event.clientY < 0 || event.clientY > height) {
                leave()
                return
            }
            pointer.targetX = event.clientX
            pointer.targetY = event.clientY
            if (!running) {
                pointer.x = pointer.targetX
                pointer.y = pointer.targetY
            }
            inside = true
            lastMove = performance.now()
            if (!running) {
                running = true
                animation.ticker.add(tick)
            }
        }

        const leave = () => {
            inside = false
            lastMove = -Infinity
        }

        const setTracking = (enabled) => {
            if (enabled === tracking) return
            tracking = enabled
            if (enabled) {
                window.addEventListener('pointermove', onPointerMove, options)
                document.documentElement.addEventListener('pointerleave', leave, options)
                window.addEventListener('pointercancel', leave, options)
            } else {
                window.removeEventListener('pointermove', onPointerMove)
                document.documentElement.removeEventListener('pointerleave', leave)
                window.removeEventListener('pointercancel', leave)
            }
        }

        const measure = () => {
            resizeFrame = 0
            stop()
            const rect = canvas.getBoundingClientRect()
            width = Math.max(1, rect.width)
            height = Math.max(1, rect.height)
            // Desktop only: below the 741px breakpoint the grid is not rendered at all.
            if (!desktop.matches) {
                canvas.width = canvas.height = base.width = base.height = 0
                dots = []
                setTracking(false)
                context.clearRect(0, 0, width, height)
                return
            }
            const interactive = Boolean(animation) && finePointer.matches && !reducedMotion.matches
            setTracking(interactive)
            // Cap backing-store memory on large/Retina displays.
            const dpr = Math.min(window.devicePixelRatio || 1, interactive ? 2 : 1.5, Math.sqrt(4000000 / Math.max(1, width * height)))
            canvas.width = base.width = Math.max(1, Math.round(width * dpr))
            canvas.height = base.height = Math.max(1, Math.round(height * dpr))
            context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
            baseContext.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
            const gap = 18
            const columns = Math.max(1, Math.floor(width / gap))
            const rows = Math.max(1, Math.floor(height / gap))
            const startX = (width - (columns - 1) * gap) / 2
            const startY = (height - (rows - 1) * gap) / 2
            dots = []
            baseContext.beginPath()
            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    const x = startX + column * gap
                    const y = startY + row * gap
                    dots.push({ x, y, amount: 0 })
                    baseContext.moveTo(x + radius, y)
                    baseContext.arc(x, y, radius, 0, Math.PI * 2)
                }
            }
            baseContext.fillStyle = 'rgba(255,255,255,.14)'
            baseContext.fill()
            reset()
        }

        const scheduleMeasure = () => {
            if (!resizeFrame) resizeFrame = requestAnimationFrame(measure)
        }

        const onModeChange = () => {
            cancelAnimationFrame(resizeFrame)
            measure()
        }

        const observer = new ResizeObserver(scheduleMeasure)
        observer.observe(canvas)
        window.addEventListener('resize', scheduleMeasure, options)
        window.addEventListener('blur', reset, options)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) reset()
        }, options)
        ;[desktop, finePointer, reducedMotion].forEach((query) => {
            query.addEventListener('change', onModeChange, options)
        })
        measure()

        return {
            destroy() {
                stop()
                setTracking(false)
                events.abort()
                observer.disconnect()
                cancelAnimationFrame(resizeFrame)
                context.clearRect(0, 0, width, height)
                base.width = base.height = 0
                dots = []
            },
        }
    }

    const canvas = document.querySelector('.dot-grid')
    if (!canvas) return
    let grid = createDotGrid(canvas)
    window.addEventListener('pagehide', () => {
        grid?.destroy()
        grid = null
    })
    // Recreate after back/forward cache restoration, including event listeners.
    window.addEventListener('pageshow', () => {
        if (!grid) grid = createDotGrid(canvas)
    })
})()
