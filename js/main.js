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
                slider?.keyboard.disable()
                slider?.mousewheel.disable()
            })
        })
        about.addEventListener('close', () => {
            about.classList.remove('is-closing')
            document.documentElement.classList.remove('has-modal')
            slider?.keyboard.enable()
            slider?.mousewheel.enable()
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
    if (!hero || typeof Swiper === 'undefined') return

    const desktop = window.matchMedia('(min-width: 741px)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const navigation = hero.querySelector('.hero__nav')
    const buttons = [...hero.querySelectorAll('[data-project]')]
    const slides = [...hero.querySelectorAll('.hero__slide')]
    let activeIndex = 0

    const updateActiveProject = (instance) => {
        activeIndex = instance.activeIndex
        buttons.forEach((button, index) => {
            if (index === activeIndex) button.setAttribute('aria-current', 'true')
            else button.removeAttribute('aria-current')
        })
        slides.forEach((slide, index) => {
            slide.inert = index !== activeIndex
            slide.setAttribute('aria-hidden', String(index !== activeIndex))
        })
    }

    const updateLayout = () => {
        if (desktop.matches && !slider) {
            hero.classList.add('hero--slider')
            navigation.hidden = false
            slider = new Swiper(hero.querySelector('.hero__slider'), {
                direction: 'vertical',
                slidesPerView: 1,
                initialSlide: activeIndex,
                speed: reducedMotion.matches ? 0 : 650,
                spaceBetween: 32,
                grabCursor: true,
                mousewheel: { enabled: !about?.open, forceToAxis: true, releaseOnEdges: true },
                keyboard: { enabled: !about?.open, onlyInViewport: true, pageUpDown: false },
                a11y: {
                    slideLabelMessage: 'Проект {{index}} из {{slidesLength}}',
                },
                on: { init: updateActiveProject, slideChange: updateActiveProject },
            })
        } else if (!desktop.matches && slider) {
            slider.destroy(true, true)
            slider = null
            hero.classList.remove('hero--slider')
            navigation.hidden = true
            slides.forEach((slide) => {
                slide.inert = false
                slide.removeAttribute('aria-hidden')
                slide.removeAttribute('aria-label')
                slide.removeAttribute('role')
            })
        }
    }

    buttons.forEach((button, index) => {
        button.addEventListener('click', () => slider?.slideTo(index))
    })
    reducedMotion.addEventListener('change', () => {
        if (slider) slider.params.speed = reducedMotion.matches ? 0 : 650
    })
    desktop.addEventListener('change', updateLayout)
    updateLayout()
})
