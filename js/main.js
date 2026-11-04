document.addEventListener('DOMContentLoaded', () => {
    const about = document.querySelector('#about-dialog')
    let slider

    if (about) {
        const closeAbout = async () => {
            if (!about.open || about.classList.contains('is-closing')) return
            about.classList.add('is-closing')
            await Promise.allSettled(about.getAnimations().map((animation) => animation.finished))
            about.close()
        }

        document.querySelectorAll('[data-about-open]').forEach((button) => {
            button.addEventListener('click', () => {
                about.showModal()
                about.scrollTop = 0
                document.documentElement.classList.add('has-modal')
                slider?.pause()
            })
        })
        about.addEventListener('close', () => {
            about.classList.remove('is-closing')
            document.documentElement.classList.remove('has-modal')
        })
        about.querySelector('.about-modal__close-form').addEventListener('submit', (event) => {
            event.preventDefault()
            closeAbout()
        })
        about.addEventListener('cancel', (event) => {
            event.preventDefault()
            closeAbout()
        })
        about.addEventListener('click', (event) => {
            const rect = about.getBoundingClientRect()
            if (event.target === about && (
                event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom
            )) closeAbout()
        })
    }

    const hero = document.querySelector('.hero')
    if (!hero || typeof gsap === 'undefined') return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    gsap.matchMedia().add('(min-width: 741px)', () => {
        const viewport = hero.querySelector('.hero__slider')
        const track = hero.querySelector('.hero__track')
        const originals = [...track.children]
        const events = new AbortController()
        const options = { signal: events.signal }
        let slides = []
        let setters = []
        let width = 0
        let step = 0
        let total = 0
        let position = 0
        let target = 0
        let bend = 0
        let running = false
        let pointer = null
        let dragged = false
        let downX = 0
        let lastX = 0
        let lastTime = 0
        let velocity = 0

        hero.classList.add('hero--slider')

        const paint = () => {
            const center = (viewport.clientWidth - width) / 2
            const wrap = gsap.utils.wrap(-step, total - step)
            const inset = Math.abs(bend) * .7
            const shape = bend >= 0
                ? `polygon(${inset}% 0, 100% ${inset}%, ${100 - inset}% 100%, 0 ${100 - inset}%)`
                : `polygon(0 ${inset}%, ${100 - inset}% 0, 100% ${100 - inset}%, ${inset}% 100%)`

            setters.forEach((set, index) => {
                set.x(wrap(index * step + position + center))
                set.skew(bend)
                set.clip(shape)
            })
        }

        const stop = () => {
            gsap.ticker.remove(tick)
            running = false
        }

        const tick = () => {
            const delta = gsap.utils.clamp(.1, 3, gsap.ticker.deltaRatio())
            const previous = position
            position = reducedMotion.matches ? target : gsap.utils.interpolate(position, target, 1 - Math.pow(.82, delta))
            const distortion = reducedMotion.matches ? 0 : gsap.utils.clamp(-8, 8, (position - previous) / delta * -.16)
            bend = reducedMotion.matches ? 0 : gsap.utils.interpolate(bend, distortion, 1 - Math.pow(.75, delta))
            const cycles = Math.trunc(position / total) * total
            position -= cycles
            target -= cycles
            if (Math.abs(target - position) < .05 && Math.abs(bend) < .01) {
                position = target
                bend = 0
                stop()
            }
            paint()
        }

        const wake = () => {
            if (running) return
            running = true
            gsap.ticker.add(tick)
        }

        const release = (momentum = false) => {
            if (pointer === null) return
            const id = pointer
            pointer = null
            viewport.classList.remove('is-dragging')
            if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id)
            if (momentum && !reducedMotion.matches && performance.now() - lastTime < 100) {
                target += velocity * 9
            }
            velocity = 0
            wake()
        }

        const pause = () => {
            release()
            target = position
            bend = 0
            stop()
            paint()
        }

        const measure = () => {
            release()
            const progress = step ? position / step : 0
            track.querySelectorAll('[data-gallery-clone]').forEach((clone) => clone.remove())
            width = originals[0].offsetWidth
            step = width + parseFloat(getComputedStyle(track).columnGap)
            const copies = Math.ceil((viewport.clientWidth + step * 2) / (step * originals.length))
            const count = Math.max(1, copies) * originals.length
            for (let index = originals.length; index < count; index++) {
                const clone = originals[index % originals.length].cloneNode(true)
                clone.dataset.galleryClone = ''
                clone.setAttribute('aria-hidden', 'true')
                clone.inert = true
                track.append(clone)
            }
            slides = [...track.children]
            total = step * slides.length
            position = target = progress * step
            bend = 0
            gsap.set(slides, { yPercent: -50 })
            setters = slides.map((slide) => {
                const image = slide.querySelector('img')
                image.loading = 'eager'
                return {
                    x: gsap.quickSetter(slide, 'x', 'px'),
                    skew: gsap.quickSetter(image, 'skewX', 'deg'),
                    clip: gsap.quickSetter(image, 'clipPath'),
                }
            })
            paint()
        }

        viewport.addEventListener('pointerdown', (event) => {
            if (about?.open || event.button !== 0 || !event.isPrimary) return
            target = position
            pointer = event.pointerId
            dragged = false
            downX = lastX = event.clientX
            lastTime = performance.now()
            velocity = 0
            viewport.classList.add('is-dragging')
            viewport.focus({ preventScroll: true })
        }, options)

        viewport.addEventListener('pointermove', (event) => {
            if (event.pointerId !== pointer) return
            const now = performance.now()
            const distance = event.clientX - lastX
            dragged ||= Math.abs(event.clientX - downX) > 6
            if (dragged && !viewport.hasPointerCapture(pointer)) viewport.setPointerCapture(pointer)
            velocity = gsap.utils.clamp(-60, 60, distance / Math.max(8, now - lastTime) * 16.67)
            target += distance
            lastX = event.clientX
            lastTime = now
            wake()
        }, options)

        viewport.addEventListener('pointerup', () => release(true), options)
        viewport.addEventListener('pointercancel', () => release(), options)
        viewport.addEventListener('click', (event) => {
            if (!dragged) return
            event.preventDefault()
            event.stopPropagation()
            dragged = false
        }, { ...options, capture: true })
        viewport.addEventListener('lostpointercapture', () => release(), options)
        window.addEventListener('blur', pause, options)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) pause()
        }, options)

        window.addEventListener('wheel', (event) => {
            if (about?.open || event.ctrlKey || event.metaKey || pointer !== null) return
            event.preventDefault()
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1
            const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
            target -= gsap.utils.clamp(-viewport.clientWidth, viewport.clientWidth, distance * unit)
            wake()
        }, { ...options, passive: false })

        viewport.addEventListener('keydown', (event) => {
            if (about?.open || event.altKey || event.ctrlKey || event.metaKey) return
            const direction = { ArrowRight: -1, ArrowDown: -1, ArrowLeft: 1, ArrowUp: 1 }[event.key]
            if (!direction) return
            event.preventDefault()
            target += direction * step
            wake()
        }, options)

        reducedMotion.addEventListener('change', () => {
            release()
            wake()
        }, options)
        const observer = new ResizeObserver(measure)
        measure()
        observer.observe(viewport)
        slider = { pause }

        return () => {
            pause()
            events.abort()
            observer.disconnect()
            track.querySelectorAll('[data-gallery-clone]').forEach((clone) => clone.remove())
            gsap.set([...originals, ...originals.map((slide) => slide.querySelector('img'))], { clearProps: 'transform,clipPath' })
            hero.classList.remove('hero--slider')
            slider = null
        }
    })
})
