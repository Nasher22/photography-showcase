/* ==========================================================================
   PhotoVoyage - site behaviour
   No dependencies, no build step. Every module is defensive: it no-ops when
   the markup it needs is absent from the current page.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Configuration
   -------------------------------------------------------------------------- */

/**
 * Form relay endpoint. Paste your Formspree form ID here to enable real
 * submissions, e.g. 'https://formspree.io/f/abcdwxyz'.
 * While empty the forms validate normally and show a simulated success
 * toast - nothing is sent anywhere.
 */
const FORM_ENDPOINT = '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SWIPE_THRESHOLD = 50;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* --------------------------------------------------------------------------
   Toast notifications
   -------------------------------------------------------------------------- */
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

/* --------------------------------------------------------------------------
   Mobile navigation
   -------------------------------------------------------------------------- */
function initMobileMenu() {
    const toggle = $('.menu-toggle');
    const links = $('#nav-menu');
    const backdrop = $('#nav-backdrop');
    if (!toggle || !links) return;

    const mobile = window.matchMedia('(max-width: 768px)');

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        links.classList.toggle('active', open);
        if (backdrop) backdrop.hidden = !open;
        // Only lock scrolling while the panel is actually on screen.
        document.body.style.overflow = open && mobile.matches ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', links).forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
    });

    // Clicking anywhere outside the panel or the toggle dismisses it.
    document.addEventListener('click', (e) => {
        if (toggle.getAttribute('aria-expanded') !== 'true') return;
        if (links.contains(e.target) || toggle.contains(e.target)) return;
        setOpen(false);
    });

    backdrop?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            setOpen(false);
            toggle.focus();
        }
    });

    // Close the panel if the viewport grows past the mobile breakpoint.
    window.matchMedia('(min-width: 769px)').addEventListener('change', (mq) => {
        if (mq.matches) setOpen(false);
    });
}

/* --------------------------------------------------------------------------
   Header condensed-on-scroll state
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
    const header = $('.header');
    if (!header) return;

    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 24);

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* --------------------------------------------------------------------------
   Scroll reveal
   -------------------------------------------------------------------------- */
function initReveal() {
    const sections = $$('section');
    if (!sections.length) return;

    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
        sections.forEach((s) => s.classList.add('animate-in'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    sections.forEach((s) => observer.observe(s));
}

/* --------------------------------------------------------------------------
   Gallery: category filter + text search
   -------------------------------------------------------------------------- */
const galleryState = { visible: [], activeFilter: 'all' };

function initGalleryFilters() {
    const grid = $('#gallery-grid');
    if (!grid) return;

    const items = $$('.gallery-item', grid);
    const filterBtns = $$('.filter-btn');
    const searchForm = $('#gallery-search');
    const searchInput = $('#gallerySearch');
    const status = $('#gallery-status');
    galleryState.visible = items.slice();

    function apply() {
        const query = (searchInput?.value || '').trim().toLowerCase();
        let shown = 0;

        items.forEach((item) => {
            const categoryOk =
                galleryState.activeFilter === 'all' ||
                item.dataset.category === galleryState.activeFilter;

            const haystack = [
                item.dataset.title,
                item.dataset.desc,
                item.dataset.category,
                $('.image-title', item)?.textContent,
                $('.image-desc', item)?.textContent,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const visible = categoryOk && (!query || haystack.includes(query));
            item.hidden = !visible;
            if (visible) shown += 1;
        });

        galleryState.visible = items.filter((item) => !item.hidden);

        if (status) {
            status.textContent = shown
                ? `Showing ${shown} of ${items.length} photos`
                : 'No photos match your search.';
        }

        // Let the lightbox know which photos are now reachable.
        document.dispatchEvent(new CustomEvent('gallery:filtered'));
    }

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            galleryState.activeFilter = btn.dataset.filter || 'all';
            filterBtns.forEach((other) => {
                const isActive = other === btn;
                other.classList.toggle('active', isActive);
                other.setAttribute('aria-pressed', String(isActive));
            });
            apply();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', apply);
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            apply();
        });
    }
}

/* --------------------------------------------------------------------------
   Lightbox
   -------------------------------------------------------------------------- */
const lightboxState = { index: 0, isOpen: false, lastFocused: null };

function initLightbox() {
    const lightbox = $('#lightbox');
    const image = $('#lightbox-img');
    if (!lightbox || !image) return;

    const captionTitle = $('#lightbox-title');
    const captionDesc = $('#lightbox-desc');
    const counter = $('#lightbox-counter');
    const closeBtn = $('.close-lightbox', lightbox);
    const prevBtn = $('.lightbox-arrow.prev', lightbox);
    const nextBtn = $('.lightbox-arrow.next', lightbox);

    const items = galleryState.visible.length ? galleryState.visible.slice() : $$('.gallery-item');
    if (!items.length) return;

    const focusables = () => $$('button', lightbox);

    function render() {
        const item = items[lightboxState.index];
        const img = item && $('img', item);
        if (!img) return;

        image.src = img.currentSrc || img.src;
        image.alt = img.alt || '';

        const title = item.dataset.title || img.alt || '';
        const desc = item.dataset.desc || '';
        if (captionTitle) captionTitle.textContent = title;
        if (captionDesc) captionDesc.textContent = desc;
        if (counter) counter.textContent = `${lightboxState.index + 1} / ${items.length}`;

        // Warm the neighbouring images so arrow keys feel instant.
        [lightboxState.index - 1, lightboxState.index + 1].forEach((offset) => {
            const neighbour = items[(offset + items.length) % items.length];
            const neighbourImg = neighbour && $('img', neighbour);
            if (neighbourImg) new Image().src = neighbourImg.currentSrc || neighbourImg.src;
        });
    }

    function step(delta) {
        lightboxState.index = (lightboxState.index + delta + items.length) % items.length;
        render();
    }

    function open(item) {
        lightboxState.index = items.indexOf(item);
        lightboxState.isOpen = true;
        // Prefer the tile that opened us - document.activeElement is unreliable
        // when the lightbox is opened programmatically.
        lightboxState.lastFocused = item || document.activeElement;

        render();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        (closeBtn || lightbox).focus?.();
    }

    function close() {
        lightboxState.isOpen = false;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxState.lastFocused?.focus?.();
    }

    $$('.gallery-item').forEach((item) => {
        item.addEventListener('click', () => open(item));
    });

    // Filtering changes which photos are reachable - keep the index aligned.
    document.addEventListener('gallery:filtered', () => {
        const active = items[lightboxState.index];
        const next = galleryState.visible.slice();
        const position = next.indexOf(active);
        items.length = 0;
        items.push(...next);
        lightboxState.index = position >= 0 ? position : 0;
    });

    closeBtn?.addEventListener('click', close);
    prevBtn?.addEventListener('click', () => step(-1));
    nextBtn?.addEventListener('click', () => step(1));

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightboxState.isOpen) return;

        switch (e.key) {
            case 'Escape':
                close();
                break;
            case 'ArrowLeft':
                step(-1);
                break;
            case 'ArrowRight':
                step(1);
                break;
            case 'Tab': {
                // Trap focus inside the dialog.
                const nodes = focusables();
                if (!nodes.length) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
                break;
            }
        }
    });

    // Touch swipe.
    let touchStartX = 0;
    let touchStartY = 0;
    const content = $('.lightbox-content', lightbox);

    content?.addEventListener(
        'touchstart',
        (e) => {
            touchStartX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
        },
        { passive: true }
    );

    content?.addEventListener(
        'touchend',
        (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
                step(dx > 0 ? -1 : 1);
            }
        },
        { passive: true }
    );
}

/* --------------------------------------------------------------------------
   Back to top
   -------------------------------------------------------------------------- */
function initBackToTop() {
    const button = $('#back-to-top');
    if (!button) return;

    const update = () => button.classList.toggle('show', window.scrollY > 400);

    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    });
    update();
}

/* --------------------------------------------------------------------------
   Animated stat counters
   -------------------------------------------------------------------------- */
function initCounters() {
    const container = $('#stats-counter');
    if (!container) return;

    const numbers = $$('.counter-number', container);

    const finish = (el) => {
        el.textContent = `${Number(el.dataset.target) || 0}${el.dataset.suffix || ''}`;
    };

    const count = (el) => {
        const target = Number(el.dataset.target) || 0;
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();

        const frame = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = `${Math.round(target * eased)}${progress === 1 ? suffix : ''}`;
            if (progress < 1) requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
    };

    const run = () => numbers.forEach(REDUCED_MOTION ? finish : count);

    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
        run();
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                run();
                observer.disconnect();
            });
        },
        { threshold: 0.4 }
    );

    observer.observe(container);
}

/* --------------------------------------------------------------------------
   Testimonial slider
   -------------------------------------------------------------------------- */
function initTestimonials() {
    const slider = $('#testimonial-slider');
    const dotsHost = $('#testimonial-dots');
    if (!slider || !dotsHost) return;

    const slides = $$('.testimonial', slider);
    if (slides.length < 2) return;

    let index = slides.findIndex((s) => s.classList.contains('active'));
    if (index < 0) index = 0;
    let timer = null;

    const dots = slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'testimonial-dot';
        dot.setAttribute('aria-label', `Show testimonial ${i + 1}`);
        dot.addEventListener('click', () => {
            go(i);
            restart();
        });
        dotsHost.appendChild(dot);
        return dot;
    });

    function go(n) {
        index = (n + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }

    function restart() {
        clearInterval(timer);
        if (REDUCED_MOTION) return;
        timer = setInterval(() => go(index + 1), 7000);
    }

    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', restart);
    slider.addEventListener('focusin', () => clearInterval(timer));
    slider.addEventListener('focusout', restart);

    go(index);
    restart();
}

/* --------------------------------------------------------------------------
   Forms
   -------------------------------------------------------------------------- */
const EMAIL_MESSAGE = 'Please enter a valid email address.';
const REQUIRED_MESSAGE = 'This field is required.';

function validateField(field) {
    const value = (field.value || '').trim();
    if (!value) return REQUIRED_MESSAGE;
    if (field.type === 'email' && !EMAIL_RE.test(value)) return EMAIL_MESSAGE;
    return '';
}

function setFieldError(field, message) {
    const target = document.getElementById(`${field.id}-error`);
    if (target) target.textContent = message;
    if (message) {
        field.setAttribute('aria-invalid', 'true');
    } else {
        field.removeAttribute('aria-invalid');
    }
}

function addHoneypot(form) {
    if ($('input[name="_gotcha"]', form)) return;
    const trap = document.createElement('input');
    trap.type = 'text';
    trap.name = '_gotcha';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    Object.assign(trap.style, {
        position: 'absolute',
        left: '-9999px',
        opacity: '0',
        height: '0',
        width: '0',
    });
    form.appendChild(trap);
}

async function submitForm(form) {
    const button = $('button[type="submit"]', form);
    const originalLabel = button ? button.textContent : '';
    const isBooking = form.id === 'booking-form';

    if (button) {
        button.disabled = true;
        button.textContent = 'Sending...';
    }

    try {
        if (!FORM_ENDPOINT) {
            // No endpoint configured yet - simulate, but be explicit about it.
            await new Promise((resolve) => setTimeout(resolve, 900));
            showNotification(
                isBooking
                    ? 'Thanks! Your booking request has been recorded.'
                    : 'Thank you for your message! We will get back to you soon.'
            );
            form.reset();
            return;
        }

        const response = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
        });

        if (!response.ok) throw new Error(`Form relay responded ${response.status}`);

        showNotification(
            isBooking
                ? 'Thanks! Your booking request has been sent.'
                : 'Thank you for your message! We will get back to you soon.'
        );
        form.reset();
    } catch (error) {
        console.error(error);
        showNotification('Something went wrong. Please email us directly.', 'error');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalLabel;
        }
    }
}

function initForms() {
    $$('.contact-form, .booking-form').forEach((form) => {
        addHoneypot(form);

        const fields = $$('[required]', form);

        fields.forEach((field) => {
            field.addEventListener('blur', () => {
                if (field.value.trim()) setFieldError(field, validateField(field));
            });
            field.addEventListener('input', () => {
                if (field.getAttribute('aria-invalid') === 'true') {
                    setFieldError(field, validateField(field));
                }
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            let firstInvalid = null;
            fields.forEach((field) => {
                const message = validateField(field);
                setFieldError(field, message);
                if (message && !firstInvalid) firstInvalid = field;
            });

            if (firstInvalid) {
                firstInvalid.focus();
                showNotification('Please fix the highlighted fields.', 'error');
                return;
            }

            submitForm(form);
        });
    });
}

/* --------------------------------------------------------------------------
   Misc
   -------------------------------------------------------------------------- */
function initMisc() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.warn('Service worker registration failed:', err);
            });
        });
    }
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function init() {
    initMobileMenu();
    initHeaderScroll();
    initReveal();
    initGalleryFilters();
    initLightbox();
    initBackToTop();
    initCounters();
    initTestimonials();
    initForms();
    initMisc();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}