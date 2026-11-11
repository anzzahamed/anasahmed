
// ==========================================
// LENIS SMOOTH SCROLL + MASTER SINGLE-FRAME SYNC
// ==========================================
let lenis;
const _scrollSyncCallbacks = [];
const _scrollIdleCallbacks = [];
let _lastSyncedY = -1;
let _nativeScrollRaf = false;
let _scrollIdleTimer = null;
window._isUserScrolling = false;

window._onScrollSync = (fn) => {
    if (typeof fn === 'function') _scrollSyncCallbacks.push(fn);
};

window._onScrollIdle = (fn) => {
    if (typeof fn === 'function') _scrollIdleCallbacks.push(fn);
};

function _markScrollActive() {
    window._isUserScrolling = true;
    clearTimeout(_scrollIdleTimer);
    _scrollIdleTimer = setTimeout(() => {
        window._isUserScrolling = false;
        for (let i = 0; i < _scrollIdleCallbacks.length; i++) {
            _scrollIdleCallbacks[i]();
        }
    }, 150);
}

function _runScrollSync(force = false, explicitY = null) {
    const sy = explicitY !== null ? explicitY : (window.scrollY || document.documentElement.scrollTop || 0);
    if (!force && Math.abs(sy - _lastSyncedY) < 0.05) return;
    _lastSyncedY = sy;
    if (!force) _markScrollActive();
    for (let i = 0; i < _scrollSyncCallbacks.length; i++) {
        _scrollSyncCallbacks[i](sy);
    }
}

window._forceScrollSync = () => _runScrollSync(true);

if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
        lerp: 0.095,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        smoothTouch: false
    });
    lenis.on('scroll', ({ scroll }) => {
        _runScrollSync(false, scroll);
    });
    function lenisRaf(time) {
        lenis.raf(time);
        requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
} else {
    window.addEventListener('scroll', () => {
        if (!_nativeScrollRaf) {
            _nativeScrollRaf = true;
            requestAnimationFrame(() => {
                _nativeScrollRaf = false;
                _runScrollSync();
            });
        }
    }, { passive: true });
}

// ==========================================
// FRAMER-INSPIRED ODOMETER NUMBER ANIMATION
// ==========================================
function buildOdometer(el) {
    if (el.dataset.odometerBuilt) return;
    el.dataset.odometerBuilt = '1';

    const targetStr = String(el.dataset.count || '0').trim();
    const suffix = el.dataset.suffix || '';
    el.setAttribute('aria-label', targetStr + suffix);

    const wrap = document.createElement('span');
    wrap.className = 'framer-odometer';
    wrap.setAttribute('aria-hidden', 'true');

    Array.from(targetStr).forEach((ch, idx) => {
        const digit = parseInt(ch, 10);
        if (isNaN(digit)) {
            const span = document.createElement('span');
            span.textContent = ch;
            wrap.appendChild(span);
            return;
        }

        const slot = document.createElement('span');
        slot.className = 'digit-slot';

        const track = document.createElement('span');
        track.className = 'digit-track';
        // Roll smoothly through digits; 0 spins a full 0..9->0 cycle, tiny digits (1-2) get one clean cycle so every column visibly rolls
        const maxSteps = digit === 0 ? 10 : (digit <= 2 ? digit + 10 : digit);
        for (let n = 0; n <= maxSteps; n++) {
            const cell = document.createElement('span');
            cell.className = 'digit-cell';
            cell.textContent = String(n % 10);
            track.appendChild(cell);
        }

        track.dataset.steps = String(maxSteps);
        track.style.transitionDelay = `${idx * 180}ms`;
        slot.appendChild(track);
        wrap.appendChild(slot);
    });

    if (suffix) {
        const suf = document.createElement('span');
        suf.className = 'digit-suffix';
        suf.textContent = suffix;
        wrap.appendChild(suf);
    }

    el.textContent = '';
    el.appendChild(wrap);
}

function resetCounter(el) {
    buildOdometer(el);
    el.querySelectorAll('.digit-track').forEach(track => {
        track.style.transitionDuration = '0ms';
        track.style.transform = 'translate3d(0, 0, 0)';
    });
    delete el.dataset.counted;
}

function animateCounter(el, extraDelay = 0) {
    buildOdometer(el);
    const tracks = el.querySelectorAll('.digit-track');
    setTimeout(() => {
        requestAnimationFrame(() => {
            tracks.forEach((track, i) => {
                const steps = parseInt(track.dataset.steps || '0', 10);
                const durationMs = 2850 + i * 240;
                track.style.transitionDuration = `${durationMs}ms`;
                track.style.transitionDelay = `${extraDelay + i * 180}ms`;
                track.style.transform = `translate3d(0, -${steps * 1.05}em, 0)`;
            });
        });
    }, 60);
}

function initCounters() {
    const loader = document.getElementById('intro-loader');
    const loaderActive = Boolean(loader && !document.body.classList.contains('site-revealed'));
    const allNums = Array.from(document.querySelectorAll('.stat-num[data-count]'));

    allNums.forEach(buildOdometer);

    const heroNums = allNums.filter(el => el.closest('#hero'));
    const scrollNums = allNums.filter(el => !el.closest('#hero') && !el.classList.contains('tracer-num'));

    window._revealHeroCounters = () => {
        heroNums.forEach((el, idx) => {
            if (el.dataset.counted) return;
            el.dataset.counted = '1';
            animateCounter(el, idx * 280);
        });
    };

    if (!loaderActive) {
        window._revealHeroCounters();
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = '1';
                animateCounter(entry.target, 80);
            }
        });
    }, { threshold: 0.25 });

    scrollNums.forEach(el => counterObserver.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
    initCounters();
    // ==========================================
    // 1. SCROLL PROGRESS TRACKING & STICKY HEADER (Zero-Reflow Cached + RAF)
    // ==========================================
    const header = document.getElementById('header');
    const progressBar = document.getElementById('scroll-progress');
    const whatsappBtn = document.getElementById('whatsapp-fab');
    const heroSection = document.getElementById('hero');
    const aboutSectionEl = document.getElementById('about');

    // Cache layout offsets cleanly outside scroll
    let cachedMaxScrollHeight = 1;
    let cachedAboutTop = 900;
    let cachedSectionBounds = [];
    let prevScrolled = null;
    let prevWhatsappVisible = null;
    let prevActiveSectionId = null;

    function recalcLayoutCache() {
        cachedMaxScrollHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        cachedAboutTop = aboutSectionEl ? aboutSectionEl.offsetTop : 900;
        const allSections = document.querySelectorAll('section');
        cachedSectionBounds = Array.from(allSections).map(sec => ({
            id: sec.getAttribute('id'),
            top: sec.offsetTop,
            bottom: sec.offsetTop + sec.offsetHeight
        }));
    }

    window._layoutCacheRefreshers = window._layoutCacheRefreshers || [];
    window._layoutCacheRefreshers.push(recalcLayoutCache);
    window._refreshAllLayoutCaches = () => {
        window._layoutCacheRefreshers.forEach(fn => fn());
    };

    // ==========================================
    // 2. MOBILE NAVIGATION DRAWER
    // ==========================================
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    const toggleMenu = () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('overflow-hidden');
    };

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // ==========================================
    // 3. SCROLL REVEAL & ACTIVE LINK SECTIONS
    // ==========================================
    const revealElements = document.querySelectorAll('.scroll-reveal');

    const scrollObserverOptions = {
        root: null,
        threshold: 0.08,
        rootMargin: '0px'
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                if (entry.target.id === 'skills' || entry.target.closest('#skills')) {
                    animateSkillBars();
                }
                observer.unobserve(entry.target);
            }
        });
    }, scrollObserverOptions);

    revealElements.forEach(element => {
        scrollObserver.observe(element);
    });

    function updateScrollUI(scrollY = window.scrollY || 0) {
        const isScrolled = scrollY > 50;
        if (header && isScrolled !== prevScrolled) {
            prevScrolled = isScrolled;
            header.classList.toggle('scrolled', isScrolled);
        }

        if (progressBar) {
            const ratio = Math.min(1, Math.max(0, scrollY / cachedMaxScrollHeight));
            progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
        }

        if (whatsappBtn && aboutSectionEl) {
            const showWa = scrollY >= cachedAboutTop - 150;
            if (showWa !== prevWhatsappVisible) {
                prevWhatsappVisible = showWa;
                whatsappBtn.classList.toggle('visible', showWa);
            }
        }

        const scrollPosition = scrollY + 200;
        let current = '';
        for (let i = 0; i < cachedSectionBounds.length; i++) {
            const b = cachedSectionBounds[i];
            if (scrollPosition >= b.top && scrollPosition < b.bottom) {
                current = b.id;
                break;
            }
        }

        if (current && current !== prevActiveSectionId) {
            prevActiveSectionId = current;
            const targetHref = `#${current}`;
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === targetHref);
            });
        }
    }

    recalcLayoutCache();
    updateScrollUI(window.scrollY || 0);
    if (typeof window._onScrollSync === 'function') {
        window._onScrollSync(updateScrollUI);
    }
    window.addEventListener('resize', () => {
        recalcLayoutCache();
        if (typeof window._forceScrollSync === 'function') window._forceScrollSync();
    }, { passive: true });
    window.addEventListener('load', () => {
        recalcLayoutCache();
        if (typeof window._forceScrollSync === 'function') window._forceScrollSync();
    });

    // ==========================================
    // 4. ANIMATE SKILLS METER
    // ==========================================
    const skillBars = document.querySelectorAll('.skill-level-fill');

    function animateSkillBars() {
        skillBars.forEach(bar => {
            const progress = bar.getAttribute('data-progress');
            bar.style.width = progress;
        });
    }

    // Trigger skills if already loaded in viewport
    const skillsSection = document.getElementById('skills');
    if (skillsSection && skillsSection.classList.contains('reveal-active')) {
        animateSkillBars();
    }

    // ==========================================
    // 5. TIMELINE SCROLL-REVEAL LINE ANIMATION
    // ==========================================
    (function initTimelineAnimation() {
        const timeline = document.querySelector('.timeline');
        if (!timeline) return;

        const items = document.querySelectorAll('.timeline-item');

        // --- Inject the track + fill + glow tip elements ---
        const track = document.createElement('div');
        track.className = 'timeline-track';

        const fill = document.createElement('div');
        fill.className = 'timeline-line-fill';

        const tip = document.createElement('div');
        tip.className = 'timeline-glow-tip';

        track.appendChild(fill);
        track.appendChild(tip);
        timeline.prepend(track);

        // --- Cache layout offsets to prevent layout thrashing (reflow lag) ---
        let trackPageTop = 0;
        let trackHeight = 0;
        let cachedVh = window.innerHeight || 900;
        let itemTriggers = [];

        function updateLayoutMeasurements() {
            cachedVh = window.innerHeight || 900;
            const trackRect = track.getBoundingClientRect();
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            trackPageTop = trackRect.top + scrollY;
            trackHeight = trackRect.height;

            itemTriggers = Array.from(items).map(item => {
                const rect = item.getBoundingClientRect();
                return {
                    element: item,
                    pageTriggerY: rect.top + scrollY + 30 // Center of marker logo
                };
            });
        }

        // Initialize layout measurements
        updateLayoutMeasurements();

        // Re-measure when size changes or pages fully render
        window.addEventListener('resize', updateLayoutMeasurements);
        window.addEventListener('load', updateLayoutMeasurements);

        // Re-measure after read-more details toggle open/close (since section height shifts)
        document.querySelectorAll('.read-more-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(updateLayoutMeasurements, 350);
            });
        });

        // --- Pure GPU transform scroll logic ---
        let lastScaleY = '';
        let lastTipVisible = null;

        function updateTimeline(scrollY = window.scrollY || 0) {
            const triggerY = scrollY + (cachedVh * 0.60);

            let targetFillH = 0;
            if (triggerY < trackPageTop) {
                targetFillH = 0;
            } else if (triggerY > trackPageTop + trackHeight) {
                targetFillH = trackHeight;
            } else {
                targetFillH = triggerY - trackPageTop;
            }

            const ratio = trackHeight > 0 ? Math.min(1, Math.max(0, targetFillH / trackHeight)) : 0;
            const scaleKey = ratio.toFixed(4);
            if (scaleKey !== lastScaleY) {
                lastScaleY = scaleKey;
                fill.style.transform = `scaleY(${scaleKey})`;
                tip.style.transform = `translate3d(-50%, ${(targetFillH - 4).toFixed(1)}px, 0)`;

                const showTip = ratio > 0.005 && ratio < 0.995;
                if (showTip !== lastTipVisible) {
                    lastTipVisible = showTip;
                    tip.style.opacity = showTip ? '1' : '0';
                }

                const tipPageY = trackPageTop + targetFillH;
                for (let i = 0; i < itemTriggers.length; i++) {
                    const trigger = itemTriggers[i];
                    trigger.element.classList.toggle('active-item', tipPageY >= trigger.pageTriggerY);
                }
            }
        }

        if (window._layoutCacheRefreshers) window._layoutCacheRefreshers.push(updateLayoutMeasurements);
        if (typeof window._onScrollSync === 'function') window._onScrollSync(updateTimeline);

        updateTimeline(window.scrollY || 0);
    })();


    // ==========================================
    // ==========================================
    // 8. CONTACT FORM SIMULATION & TOAST FEEDBACK
    // ==========================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-popup toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        // Trigger slide in
        setTimeout(() => toast.classList.add('active'), 50);

        // Auto remove after 4.5 seconds
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }

    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('name').value.trim();
            const emailVal = document.getElementById('email').value.trim();
            const subjectVal = document.getElementById('subject').value.trim();
            const messageVal = document.getElementById('message').value.trim();

            if (!nameVal || !emailVal || !subjectVal || !messageVal) {
                showToast('Please fill out all fields.', 'error');
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';

            // Google Form Response endpoint
            const googleFormUrl = "https://docs.google.com/forms/u/0/d/e/1FAIpQLScM7tpfeBjfM4NLmbLHfNsZ9OQMLPEvvB2cLIObrWWQjU262Q/formResponse";

            const formData = new URLSearchParams();
            formData.append('entry.1451078961', nameVal);
            formData.append('entry.1433838400', emailVal);
            const combinedMessage = `Subject: ${subjectVal}\n\nMessage:\n${messageVal}`;
            formData.append('entry.59278504', combinedMessage);

            fetch(googleFormUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
                .then(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;

                    showToast('successfully sent the message', 'success');
                    contactForm.reset();
                })
                .catch((error) => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                    showToast('Oops! Something went wrong. Please try again.', 'error');
                    console.error('Submission error:', error);
                });
        });
    }

    function showFeedback(message, type) {
        if (!formFeedback) return;
        formFeedback.innerText = message;
        formFeedback.className = `form-feedback ${type}`;
        formFeedback.style.display = 'block';
    }

    // ==========================================
    // 5. HERO SCROLL IMAGE ANIMATION (Hero, About, Experience)
    //    Uses pre-scaled GPU ImageBitmaps + static vignette overlay for 120fps scrolling
    // ==========================================
    const heroCanvas = document.getElementById('hero-scroll-canvas');
    const heroVignetteCanvas = document.getElementById('hero-vignette-canvas');
    if (heroCanvas) {
        const heroCtx = heroCanvas.getContext('2d', { alpha: false });
        const heroSection = document.getElementById('hero');
        const aboutSection = document.getElementById('about');
        const experienceSection = document.getElementById('experience');
        const heroAmbientLayer = document.querySelector('.hero-ambient-layer');

        const totalFrames = 239;
        const startFrame = 20;
        const frameRatio = 3632 / 2514;
        const canUseBitmap = typeof createImageBitmap === 'function' && window.location.protocol !== 'file:';

        const framePaths = [];
        const images = new Array(totalFrames);
        const frameBlobs = new Array(totalFrames);
        const bitmaps = new Array(totalFrames);
        const decodingSet = new Set();

        for (let i = 1; i <= totalFrames; i++) {
            const frameNum = String(i).padStart(3, '0');
            framePaths.push(`assets/scroll-images/ezgif-frame-${frameNum}.jpg`);
        }

        let imagesLoaded = false;
        let lastDrawnFrame = -1;
        let lastWidth = 0;
        let lastHeight = 0;
        let portraitW = 0;
        let portraitH = 0;
        let drawX = 0;
        let drawY = 0;
        let currentTargetFrame = startFrame;
        let resizeEpoch = 0;

        const keyframeStride = 3;
        function isKeyframe(idx) {
            return idx === startFrame || idx === totalFrames - 1 || ((idx - startFrame) % keyframeStride === 0);
        }

        function paintVignetteOverlay(w, h) {
            if (!heroVignetteCanvas) return;
            const pad = 2;
            const cw = w + pad * 2;
            const ch = h + pad * 2;
            heroVignetteCanvas.width = cw;
            heroVignetteCanvas.height = ch;
            heroVignetteCanvas.style.width = `${cw}px`;
            heroVignetteCanvas.style.height = `${ch}px`;
            heroVignetteCanvas.style.transform = `translate3d(${Math.round(drawX) - pad}px, ${Math.round(drawY) - pad}px, 0)`;

            const vCtx = heroVignetteCanvas.getContext('2d');
            vCtx.clearRect(0, 0, cw, ch);
            vCtx.fillStyle = '#000000';
            vCtx.fillRect(0, 0, cw, pad);
            vCtx.fillRect(0, ch - pad, cw, pad);
            vCtx.fillRect(0, 0, pad, ch);
            vCtx.fillRect(cw - pad, 0, pad, ch);

            const leftG = vCtx.createLinearGradient(pad, 0, pad + w * 0.25, 0);
            leftG.addColorStop(0, 'rgba(0,0,0,1)');
            leftG.addColorStop(1, 'rgba(0,0,0,0)');
            vCtx.fillStyle = leftG;
            vCtx.fillRect(pad, pad, w * 0.26, h);

            const rightG = vCtx.createLinearGradient(pad + w * 0.85, 0, pad + w * 0.97, 0);
            rightG.addColorStop(0, 'rgba(0,0,0,0)');
            rightG.addColorStop(1, 'rgba(0,0,0,1)');
            vCtx.fillStyle = rightG;
            vCtx.fillRect(pad + w * 0.85, pad, w * 0.15, h);

            const topG = vCtx.createLinearGradient(0, pad, 0, pad + h * 0.16);
            topG.addColorStop(0, 'rgba(0,0,0,1)');
            topG.addColorStop(1, 'rgba(0,0,0,0)');
            vCtx.fillStyle = topG;
            vCtx.fillRect(pad, pad, w, h * 0.17);

            const botG = vCtx.createLinearGradient(0, pad + h * 0.74, 0, pad + h * 0.97);
            botG.addColorStop(0, 'rgba(0,0,0,0)');
            botG.addColorStop(1, 'rgba(0,0,0,1)');
            vCtx.fillStyle = botG;
            vCtx.fillRect(pad, pad + h * 0.74, w, h * 0.26);
        }

        function updatePortraitRect() {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            lastWidth = vw;
            lastHeight = vh;

            const canvasRatio = vw / vh;
            const scale = 0.82;
            let dw, dh;
            if (canvasRatio > frameRatio) {
                dh = vh * scale;
                dw = dh * frameRatio;
                drawX = vw - dw - (vw * 0.05);
                drawY = (vh - dh) / 2;
            } else {
                dw = vw * scale;
                dh = dw / frameRatio;
                drawX = (vw - dw) / 2;
                drawY = 85;
            }

            portraitW = Math.max(1, Math.round(dw));
            portraitH = Math.max(1, Math.round(dh));

            heroCanvas.width = portraitW;
            heroCanvas.height = portraitH;
            heroCanvas.style.width = `${portraitW}px`;
            heroCanvas.style.height = `${portraitH}px`;
            heroCanvas.style.transform = `translate3d(${Math.round(drawX)}px, ${Math.round(drawY)}px, 0)`;

            paintVignetteOverlay(portraitW, portraitH);
        }

        function evictDistantBitmaps(centerIdx) {
            for (let j = startFrame; j < totalFrames; j++) {
                if (bitmaps[j] && !isKeyframe(j) && Math.abs(j - centerIdx) > 36) {
                    bitmaps[j].close();
                    bitmaps[j] = null;
                }
            }
        }

        let decodeActive = 0;
        const decodeQueue = [];
        function pumpDecodeQueue() {
            if (window._isUserScrolling) return;
            while (decodeActive < 1 && decodeQueue.length > 0) {
                const idx = decodeQueue.shift();
                if (bitmaps[idx] || decodingSet.has(idx) || !frameBlobs[idx]) continue;
                decodingSet.add(idx);
                decodeActive++;
                const epoch = resizeEpoch;
                const w = portraitW;
                const h = portraitH;
                createImageBitmap(frameBlobs[idx], { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' })
                    .then((bmp) => {
                        if (epoch !== resizeEpoch) {
                            bmp.close();
                            return;
                        }
                        bitmaps[idx] = bmp;
                        if (idx === currentTargetFrame && lastDrawnFrame !== idx) {
                            drawFrame(idx);
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        decodingSet.delete(idx);
                        decodeActive--;
                        if (!window._isUserScrolling) {
                            setTimeout(pumpDecodeQueue, 12);
                        }
                    });
            }
        }

        if (typeof window._onScrollIdle === 'function') {
            window._onScrollIdle(pumpDecodeQueue);
        }

        function scheduleDecodeWindow(centerIdx) {
            if (!canUseBitmap || window._isUserScrolling) return;
            const radius = 12;
            for (let d = 0; d <= radius; d++) {
                const candidates = d === 0 ? [centerIdx] : [centerIdx + d, centerIdx - d];
                for (let c = 0; c < candidates.length; c++) {
                    const idx = candidates[c];
                    if (idx >= startFrame && idx < totalFrames && frameBlobs[idx] && !bitmaps[idx] && !decodingSet.has(idx)) {
                        if (decodeQueue.length < 24) decodeQueue.push(idx);
                    }
                }
            }
            pumpDecodeQueue();
        }

        function findNearestWarmBitmap(targetIndex) {
            if (bitmaps[targetIndex]) return targetIndex;
            for (let d = 1; d <= 16; d++) {
                if (targetIndex + d < totalFrames && bitmaps[targetIndex + d]) return targetIndex + d;
                if (targetIndex - d >= startFrame && bitmaps[targetIndex - d]) return targetIndex - d;
            }
            return -1;
        }

        function drawFrame(index) {
            const targetIndex = Math.min(totalFrames - 1, Math.max(startFrame, index));
            currentTargetFrame = targetIndex;

            if (canUseBitmap) {
                const bmp = bitmaps[targetIndex];
                if (bmp) {
                    if (targetIndex !== lastDrawnFrame) {
                        heroCtx.drawImage(bmp, 0, 0, portraitW, portraitH);
                        lastDrawnFrame = targetIndex;
                    }
                    scheduleDecodeWindow(targetIndex);
                    return;
                }
                const nearIdx = findNearestWarmBitmap(targetIndex);
                if (nearIdx !== -1 && nearIdx !== lastDrawnFrame) {
                    heroCtx.drawImage(bitmaps[nearIdx], 0, 0, portraitW, portraitH);
                    lastDrawnFrame = nearIdx;
                }
                scheduleDecodeWindow(targetIndex);
                return;
            }

            const img = images[targetIndex];
            if (img && img.complete && img.naturalWidth > 0 && targetIndex !== lastDrawnFrame) {
                heroCtx.drawImage(img, 0, 0, portraitW, portraitH);
                lastDrawnFrame = targetIndex;
            }
        }

        function fetchFrame(idx, priorityHigh = false) {
            if (frameBlobs[idx]) return Promise.resolve();
            const epoch = resizeEpoch;
            return fetch(framePaths[idx], { priority: priorityHigh ? 'high' : 'low' })
                .then(res => res.ok ? res.blob() : null)
                .then(blob => {
                    if (!blob) return;
                    frameBlobs[idx] = blob;
                    if (idx === startFrame) {
                        const w = portraitW;
                        const h = portraitH;
                        return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' })
                            .then(bmp => {
                                if (epoch !== resizeEpoch) {
                                    bmp.close();
                                    return;
                                }
                                bitmaps[idx] = bmp;
                                imagesLoaded = true;
                                drawFrame(currentTargetFrame);
                                heroCanvas.style.opacity = '0.8';
                                heroCanvas.style.visibility = 'visible';
                            });
                    }
                    if (isKeyframe(idx) || Math.abs(idx - currentTargetFrame) <= 10) {
                        if (decodeQueue.length < 48) decodeQueue.push(idx);
                        pumpDecodeQueue();
                    }
                })
                .catch(() => {});
        }

        function preload() {
            if (!canUseBitmap) {
                for (let i = startFrame; i < totalFrames; i++) images[i] = new Image();
                const firstImg = images[startFrame];
                firstImg.src = framePaths[startFrame];
                firstImg.onload = () => {
                    imagesLoaded = true;
                    drawFrame(startFrame);
                    heroCanvas.style.opacity = '0.8';
                    heroCanvas.style.visibility = 'visible';
                    setTimeout(() => {
                        for (let i = startFrame + 1; i < totalFrames; i++) images[i].src = framePaths[i];
                    }, 350);
                };
                return;
            }

            // 1. Fetch and display the exact initial frame immediately
            fetchFrame(startFrame, true).then(() => {
                // 2. Prioritize keyframes first (fast scrollbar jumps never hit blank frames), then remaining frames
                const order = [];
                for (let i = startFrame + 1; i < totalFrames; i++) {
                    if (isKeyframe(i)) order.push(i);
                }
                for (let i = startFrame + 1; i < totalFrames; i++) {
                    if (!isKeyframe(i)) order.push(i);
                }

                let cursor = 0;
                const workerCount = 2;
                function startRemaining() {
                    function next() {
                        if (cursor >= order.length) return Promise.resolve();
                        if (window._isUserScrolling) {
                            return new Promise(res => setTimeout(() => next().then(res), 160));
                        }
                        const idx = order[cursor++];
                        return fetchFrame(idx, false).then(next);
                    }
                    for (let w = 0; w < workerCount; w++) next();
                }
                setTimeout(startRemaining, 250);
            });
        }

        function resizeCanvas() {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            const heightDiff = Math.abs(newHeight - lastHeight);
            if (newWidth === lastWidth && heightDiff < 120) return;

            resizeEpoch++;
            for (let j = 0; j < totalFrames; j++) {
                if (bitmaps[j]) {
                    bitmaps[j].close();
                    bitmaps[j] = null;
                }
            }
            decodeQueue.length = 0;
            updatePortraitRect();
            if (imagesLoaded) {
                lastDrawnFrame = -1;
                scheduleDecodeWindow(currentTargetFrame);
                drawAndFade(window.scrollY || 0);
            }
        }

        updatePortraitRect();
        window.addEventListener('resize', resizeCanvas);

        let cachedHeroMaxScroll = 1800;
        let lastCanvasOpacity = '';
        let lastCanvasVisible = true;

        function recalcHeroBounds() {
            const heroH = heroSection?.offsetHeight || 0;
            const aboutH = aboutSection?.offsetHeight || 0;
            const expH = experienceSection?.offsetHeight || 0;
            cachedHeroMaxScroll = Math.max(1, heroH + aboutH + expH);
        }

        function drawAndFade(scrollY = window.scrollY || 0) {
            if (!imagesLoaded) return;

            const maxScroll = cachedHeroMaxScroll;
            const fadeStart = maxScroll - 200;
            const fadeEnd = maxScroll + 200;

            if (scrollY >= fadeEnd) {
                if (lastCanvasVisible) {
                    lastCanvasVisible = false;
                    lastCanvasOpacity = '0';
                    heroCanvas.style.opacity = '0';
                    heroCanvas.style.visibility = 'hidden';
                    if (heroVignetteCanvas) heroVignetteCanvas.style.visibility = 'hidden';
                    if (heroAmbientLayer) heroAmbientLayer.style.visibility = 'hidden';
                }
                return;
            }

            const fraction = Math.min(1, Math.max(0, scrollY / maxScroll));
            const targetFrame = startFrame + Math.round(fraction * (totalFrames - 1 - startFrame));
            drawFrame(targetFrame);

            if (scrollY > fadeStart) {
                const fadeProgress = Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart));
                const nextOpacity = (0.8 * (1 - fadeProgress)).toFixed(3);
                if (nextOpacity !== lastCanvasOpacity) {
                    lastCanvasOpacity = nextOpacity;
                    heroCanvas.style.opacity = nextOpacity;
                }
                if (!lastCanvasVisible) {
                    lastCanvasVisible = true;
                    heroCanvas.style.visibility = 'visible';
                    if (heroVignetteCanvas) heroVignetteCanvas.style.visibility = 'visible';
                    if (heroAmbientLayer) heroAmbientLayer.style.visibility = 'visible';
                }
            } else {
                if (lastCanvasOpacity !== '0.8') {
                    lastCanvasOpacity = '0.8';
                    heroCanvas.style.opacity = '0.8';
                }
                if (!lastCanvasVisible) {
                    lastCanvasVisible = true;
                    heroCanvas.style.visibility = 'visible';
                    if (heroVignetteCanvas) heroVignetteCanvas.style.visibility = 'visible';
                    if (heroAmbientLayer) heroAmbientLayer.style.visibility = 'visible';
                }
            }
        }

        recalcHeroBounds();
        if (window._layoutCacheRefreshers) window._layoutCacheRefreshers.push(recalcHeroBounds);
        if (typeof window._onScrollSync === 'function') window._onScrollSync(drawAndFade);
        window.addEventListener('resize', () => {
            recalcHeroBounds();
            drawAndFade(window.scrollY || 0);
        }, { passive: true });
        window.addEventListener('load', () => {
            recalcHeroBounds();
            drawAndFade(window.scrollY || 0);
        });

        preload();
    }

    // ==========================================
    // 9. SKILLS TABS TOGGLING
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.skills-tab-content');
    const skillsTabNav = document.querySelector('.skills-tab-nav');
    const skillsIndicator = document.querySelector('.tab-slider-indicator');

    function updateSkillsIndicator() {
        if (!skillsTabNav || !skillsIndicator) return;
        const activeBtn = skillsTabNav.querySelector('.tab-btn.active');
        if (activeBtn) {
            const navRect = skillsTabNav.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const leftOffset = btnRect.left - navRect.left;
            skillsIndicator.style.transform = `translateX(${leftOffset}px)`;
            skillsIndicator.style.width = `${btnRect.width}px`;
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            updateSkillsIndicator();

            const activeContent = document.getElementById(`skills-tab-${tabId}`);
            if (activeContent) {
                activeContent.classList.add('active');

                // Trigger layout recalibration on active grid
                const grid = activeContent.querySelector('.skills-compact-grid');
                if (grid && typeof grid._updateRows === 'function') {
                    grid._updateRows();
                }
            }
            if (typeof window._refreshAllLayoutCaches === 'function') {
                requestAnimationFrame(window._refreshAllLayoutCaches);
            }
        });
    });

    // Handle initial positions and resize shifts
    setTimeout(updateSkillsIndicator, 150);
    window.addEventListener('resize', updateSkillsIndicator, { passive: true });

    // ==========================================
    // 10. COLLAPSIBLE CONTENT (READ MORE) ON MOBILE
    // ==========================================
    const readMoreToggles = document.querySelectorAll('.read-more-toggle');

    readMoreToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);

            if (targetEl) {
                const isExpanded = targetEl.classList.toggle('expanded');
                toggle.classList.toggle('expanded');

                // Toggle details-expanded state on the parent container card
                const parentCard = toggle.closest('.timeline-content') || toggle.closest('.about-info') || toggle.closest('.edu-card');
                if (parentCard) {
                    parentCard.classList.toggle('details-expanded', isExpanded);
                }

                // Toggle text content
                const hasDetails = toggle.innerText.toLowerCase().includes('details');
                const actionText = isExpanded ? (hasDetails ? 'Hide Details' : 'Read Less') : (hasDetails ? 'Read Details' : 'Read More');
                toggle.innerHTML = `${actionText} <i class="fa-solid fa-chevron-down" style="transform: ${isExpanded ? 'rotate(180deg)' : 'none'}; transition: transform 0.3s ease;"></i>`;
                if (typeof window._refreshAllLayoutCaches === 'function') {
                    setTimeout(window._refreshAllLayoutCaches, 350);
                }
            }
        });
    });

    // ==========================================
    // 11. VIDEO MODAL — open on card click (with Reel Playlist Next/Prev)
    // ==========================================
    const vModal = document.getElementById('video-modal');
    const vIframe = document.getElementById('vmodal-iframe');
    const vVideo = document.getElementById('vmodal-video');
    const vCloseBtn = document.getElementById('vmodal-close');
    const vPrevBtn = document.getElementById('vmodal-prev');
    const vNextBtn = document.getElementById('vmodal-next');
    const vPrevMobile = document.getElementById('vmodal-prev-mobile');
    const vNextMobile = document.getElementById('vmodal-next-mobile');
    const vTitleLabel = document.getElementById('vmodal-title-label');
    const vSoundBtn = document.getElementById('vmodal-sound-btn');

    let modalPlaylist = [];
    let modalIndex = 0;
    let modalMuted = false;

    function syncModalSoundBtn() {
        if (!vSoundBtn || !vVideo) return;
        const isMuted = Boolean(vVideo.muted);
        modalMuted = isMuted;
        vSoundBtn.classList.toggle('is-muted', isMuted);
        vSoundBtn.setAttribute('aria-label', isMuted ? 'Unmute video' : 'Mute video');
        vSoundBtn.title = isMuted ? 'Unmute sound' : 'Mute sound';
        vSoundBtn.innerHTML = isMuted
            ? '<i class="fa-solid fa-volume-xmark"></i>'
            : '<i class="fa-solid fa-volume-high"></i>';
    }

    function openVideoModal(videoId, driveSrc = '', isVertical = false) {
        if (!vModal || !vIframe) return;
        modalPlaylist = [];
        vModal.classList.remove('has-playlist');

        if (vVideo) {
            vVideo.pause();
            vVideo.removeAttribute('src');
            vVideo.style.display = 'none';
        }
        vIframe.style.display = 'block';

        if (driveSrc) {
            vIframe.src = driveSrc;
        } else {
            vIframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
        }
        vModal.classList.toggle('vmodal-vertical', Boolean(isVertical));
        vModal.classList.add('active');
        vModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('vmodal-open');
        if (typeof window._syncReelsAudio === 'function') window._syncReelsAudio();
    }

    function showPlaylistItem(idx) {
        if (!vModal || !vVideo || modalPlaylist.length === 0) return;
        modalIndex = ((idx % modalPlaylist.length) + modalPlaylist.length) % modalPlaylist.length;
        const item = modalPlaylist[modalIndex];

        if (vIframe) {
            vIframe.src = '';
            vIframe.style.display = 'none';
        }
        vVideo.style.display = 'block';
        vVideo.src = item.src;
        if (item.poster) vVideo.poster = item.poster;
        vVideo.muted = modalMuted;
        vVideo.currentTime = 0;
        syncModalSoundBtn();
        vVideo.play().catch(() => {});

        if (vTitleLabel) {
            vTitleLabel.textContent = `${item.title} (${modalIndex + 1} / ${modalPlaylist.length})`;
        }
    }

    function openReelModal(playlist, startIndex = 0) {
        if (!vModal || !playlist || playlist.length === 0) return;
        modalPlaylist = playlist;
        modalMuted = false;
        vModal.classList.add('has-playlist', 'vmodal-vertical', 'active');
        vModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('vmodal-open');
        if (typeof window._syncReelsAudio === 'function') window._syncReelsAudio();
        showPlaylistItem(startIndex);
    }

    function closeVideoModal() {
        if (!vModal) return;
        vModal.classList.remove('active', 'vmodal-vertical', 'has-playlist');
        vModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('vmodal-open');
        modalPlaylist = [];
        if (vVideo) {
            vVideo.pause();
            setTimeout(() => {
                vVideo.removeAttribute('src');
                vVideo.load();
            }, 250);
        }
        if (vIframe) {
            setTimeout(() => { vIframe.src = ''; }, 250);
        }
        if (typeof window._syncReelsAudio === 'function') window._syncReelsAudio();
    }

    if (vSoundBtn && vVideo) {
        vSoundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            vVideo.muted = !vVideo.muted;
            syncModalSoundBtn();
        });
        vVideo.addEventListener('volumechange', syncModalSoundBtn);
    }

    // Attach click to every portfolio card that has a video id or drive src
    document.querySelectorAll('.portfolio-item[data-video-id], .portfolio-item[data-drive-src]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;

            const isVertical = card.dataset.vertical === 'true';
            if (card.dataset.driveSrc) {
                openVideoModal('', card.dataset.driveSrc, isVertical);
            } else {
                openVideoModal(card.dataset.videoId, '', isVertical);
            }
        });
        card.style.cursor = 'pointer';
    });

    if (vCloseBtn) vCloseBtn.addEventListener('click', closeVideoModal);
    if (vPrevBtn) vPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistItem(modalIndex - 1); });
    if (vNextBtn) vNextBtn.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistItem(modalIndex + 1); });
    if (vPrevMobile) vPrevMobile.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistItem(modalIndex - 1); });
    if (vNextMobile) vNextMobile.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistItem(modalIndex + 1); });

    if (vModal) {
        vModal.addEventListener('click', (e) => {
            if (e.target === vModal) closeVideoModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!vModal || !vModal.classList.contains('active')) return;
        if (e.key === 'Escape') closeVideoModal();
        if (modalPlaylist.length > 0) {
            if (e.key === 'ArrowRight') showPlaylistItem(modalIndex + 1);
            if (e.key === 'ArrowLeft') showPlaylistItem(modalIndex - 1);
        }
    });

    initPortfolioFilter();
});

// ==========================================
// 14. PORTFOLIO FILTER & HORIZONTAL SCROLL (1:1 Frame Synced + Lazy Embeds + Offscreen Pause)
// ==========================================
function initPortfolioFilter() {
    const filterBtns = document.querySelectorAll('.portfolio-tab-btn');
    const items = document.querySelectorAll('.portfolio-grid .portfolio-item');
    const stickyWrap = document.getElementById('portfolio-sticky-wrap');
    const grid = document.querySelector('.portfolio-grid');
    const portfolioSection = document.getElementById('portfolio');
    const brandsSection = document.getElementById('brands');

    if (filterBtns.length === 0) return;

    const vimeoEntries = [];
    const graphicIframes = [];
    items.forEach(item => {
        const iframe = item.querySelector('iframe.portfolio-iframe');
        if (!iframe) return;
        if (item.dataset.category === 'video') {
            vimeoEntries.push({ item, iframe, hydrated: Boolean(iframe.getAttribute('src')), left: 0, right: 0, isPlaying: false });
        } else if (item.dataset.category === 'graphic') {
            graphicIframes.push(iframe);
        }
    });

    let activeFilter = 'video';
    let cachedWrapTop = 0;
    let cachedWrapHeight = 1;
    let cachedVh = window.innerHeight || 900;
    let cachedContainerW = 1200;
    let cachedMaxTranslateX = 0;
    let lastTranslatedX = '';
    let currentTxNum = 0;
    let isPortfolioNear = false;
    let isPortfolioVisible = false;
    let graphicHydrated = false;
    let lastVimeoCheckTime = 0;

    let vimeoStaggered = false;
    function hydrateVimeoEmbeds() {
        if (vimeoStaggered) return;
        vimeoStaggered = true;
        vimeoEntries.forEach((entry, idx) => {
            if (entry.hydrated || !entry.iframe.dataset.src) return;
            setTimeout(() => {
                if (entry.hydrated || !entry.iframe.dataset.src) return;
                entry.hydrated = true;
                entry.iframe.addEventListener('load', () => {
                    const msg = entry.isPlaying ? '{"method":"play"}' : '{"method":"pause"}';
                    try { entry.iframe.contentWindow?.postMessage(msg, '*'); } catch (_) {}
                }, { once: true });
                entry.iframe.setAttribute('src', entry.iframe.dataset.src);
            }, idx * 180);
        });
    }

    function hydrateGraphicEmbeds() {
        if (graphicHydrated) return;
        graphicHydrated = true;
        graphicIframes.forEach(iframe => {
            if (!iframe.getAttribute('src') && iframe.dataset.src) {
                iframe.setAttribute('src', iframe.dataset.src);
            }
        });
    }

    function syncVimeoPlayback(force = false) {
        if (!portfolioSection) return;
        const now = performance.now();
        if (!force && now - lastVimeoCheckTime < 140) return;
        lastVimeoCheckTime = now;

        const playAllowed = isPortfolioVisible && activeFilter === 'video';
        const viewLeft = -currentTxNum - 120;
        const viewRight = -currentTxNum + cachedContainerW + 120;

        vimeoEntries.forEach(entry => {
            if (!entry.hydrated) return;
            const visibleHoriz = entry.right > viewLeft && entry.left < viewRight;
            const shouldPlay = playAllowed && visibleHoriz;
            if (force || entry.isPlaying !== shouldPlay) {
                entry.isPlaying = shouldPlay;
                const msg = shouldPlay ? '{"method":"play"}' : '{"method":"pause"}';
                try { entry.iframe.contentWindow?.postMessage(msg, '*'); } catch (_) {}
            }
        });
    }

    function refreshPortfolioMetrics() {
        if (!stickyWrap || !grid) return;
        const rect = stickyWrap.getBoundingClientRect();
        cachedWrapTop = rect.top + (window.scrollY || 0);
        cachedWrapHeight = rect.height || 1;
        cachedVh = window.innerHeight || 900;
        cachedContainerW = stickyWrap.offsetWidth || window.innerWidth || 1200;
        if (activeFilter === 'video') {
            cachedMaxTranslateX = Math.max(0, grid.scrollWidth - cachedContainerW + 48);
            vimeoEntries.forEach(entry => {
                entry.left = entry.item.offsetLeft;
                entry.right = entry.left + entry.item.offsetWidth;
            });
        } else {
            cachedMaxTranslateX = 0;
        }
    }

    function applyFilter(filter) {
        activeFilter = filter;
        if (filter === 'graphic') {
            hydrateGraphicEmbeds();
        } else if (isPortfolioNear) {
            hydrateVimeoEmbeds();
        }

        items.forEach(item => {
            if (item.dataset.category === filter) {
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            } else {
                item.style.display = 'none';
            }
        });

        if (stickyWrap) {
            if (filter === 'video') {
                stickyWrap.classList.remove('disable-horizontal-scroll');
            } else {
                stickyWrap.classList.add('disable-horizontal-scroll');
                if (grid) grid.style.transform = 'none';
                lastTranslatedX = '';
                currentTxNum = 0;
            }
        }

        requestAnimationFrame(() => {
            refreshPortfolioMetrics();
            if (typeof window._refreshAllLayoutCaches === 'function') {
                window._refreshAllLayoutCaches();
            }
            if (activeFilter === 'video') {
                updateTranslation(window.scrollY || 0);
            }
            syncVimeoPlayback(true);
        });
    }

    function updateTranslation(scrollY = window.scrollY || 0) {
        if (!stickyWrap || !grid || activeFilter !== 'video') return;

        const rectTop = cachedWrapTop - scrollY;
        const startY = 80;
        const endY = -(cachedWrapHeight - cachedVh);
        const denom = startY - endY;
        const progress = denom > 0 ? Math.min(1, Math.max(0, (startY - rectTop) / denom)) : 0;

        currentTxNum = -progress * cachedMaxTranslateX;
        const tx = currentTxNum.toFixed(2);
        if (tx !== lastTranslatedX) {
            lastTranslatedX = tx;
            grid.style.transform = `translate3d(${tx}px, 0, 0)`;
            syncVimeoPlayback(false);
        }
    }

    const portfolioTabs = document.querySelector('.portfolio-tabs');
    const portfolioIndicator = document.querySelector('.portfolio-slider-indicator');

    function updatePortfolioIndicator() {
        if (!portfolioTabs || !portfolioIndicator) return;
        const activeBtn = portfolioTabs.querySelector('.portfolio-tab-btn.active');
        if (activeBtn) {
            const navRect = portfolioTabs.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const leftOffset = btnRect.left - navRect.left;
            portfolioIndicator.style.transform = `translateX(${leftOffset}px)`;
            portfolioIndicator.style.width = `${btnRect.width}px`;
        }
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            applyFilter(filter);
            updatePortfolioIndicator();
        });
    });

    if ('IntersectionObserver' in window) {
        if (portfolioSection) {
            const portfolioPreloadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        isPortfolioNear = true;
                        if (activeFilter === 'video') hydrateVimeoEmbeds();
                        portfolioPreloadObserver.unobserve(portfolioSection);
                    }
                });
            }, { rootMargin: '550px 0px' });
            portfolioPreloadObserver.observe(portfolioSection);

            const portfolioVisObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    isPortfolioVisible = entry.isIntersecting;
                    if (isPortfolioVisible && activeFilter === 'video') hydrateVimeoEmbeds();
                    syncVimeoPlayback(true);
                });
            }, { rootMargin: '120px 0px' });
            portfolioVisObserver.observe(portfolioSection);
        }

        if (brandsSection) {
            brandsSection.classList.add('is-paused');
            const brandsVisObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    brandsSection.classList.toggle('is-paused', !entry.isIntersecting);
                });
            }, { rootMargin: '0px' });
            brandsVisObserver.observe(brandsSection);
        }
    }

    if (window._layoutCacheRefreshers) window._layoutCacheRefreshers.push(refreshPortfolioMetrics);
    if (typeof window._onScrollSync === 'function') window._onScrollSync(updateTranslation);

    window.addEventListener('resize', () => {
        refreshPortfolioMetrics();
        updateTranslation(window.scrollY || 0);
        updatePortfolioIndicator();
    }, { passive: true });
    window.addEventListener('load', () => {
        refreshPortfolioMetrics();
        updateTranslation(window.scrollY || 0);
        updatePortfolioIndicator();
    });

    const activeBtn = document.querySelector('.portfolio-tab-btn.active');
    if (activeBtn) {
        applyFilter(activeBtn.dataset.filter);
        setTimeout(() => {
            updatePortfolioIndicator();
            refreshPortfolioMetrics();
            updateTranslation(window.scrollY || 0);
        }, 150);
    }
}

// ==========================================
// 15. INTRO BUBBLE REVEAL LIFECYCLE (Instant DOMContentLoaded — never stalls on slow external embeds)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('intro-loader');
    if (loader) {
        document.body.classList.add('overflow-hidden');

        setTimeout(() => {
            loader.classList.add('fade-out');
            document.body.classList.remove('overflow-hidden');

            // Add entrance class to reveal hero elements with a smooth premium stagger motion
            document.body.classList.add('site-revealed');

            // Trigger Hero rolling numbers once loader opens and hero stats fade into view
            if (typeof window._revealHeroCounters === 'function') {
                setTimeout(window._revealHeroCounters, 650);
            }

            // Trigger Mobile Desktop Suggestion Popup
            const noticePopup = document.getElementById('mobile-notice-popup');
            if (noticePopup && window.innerWidth <= 768) {
                setTimeout(() => {
                    noticePopup.classList.add('active');

                    // Auto hide after 6.5 seconds
                    const autoHideTimer = setTimeout(() => {
                        closeNotice();
                    }, 6500);

                    function closeNotice() {
                        if (noticePopup.classList.contains('active')) {
                            noticePopup.classList.remove('active');
                            clearTimeout(autoHideTimer);
                            document.removeEventListener('click', handleOutsideTap);
                            document.removeEventListener('touchstart', handleOutsideTap);
                        }
                    }

                    // Close on X button click
                    const closeBtn = noticePopup.querySelector('.mobile-notice-close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            closeNotice();
                        });
                    }

                    // Close when user taps anywhere else
                    function handleOutsideTap() {
                        closeNotice();
                    }

                    setTimeout(() => {
                        document.addEventListener('click', handleOutsideTap);
                        document.addEventListener('touchstart', handleOutsideTap, { passive: true });
                    }, 200); // safety gap
                }, 2200); // display 2.2s after Loader finishes collapse
            }
        }, 1150);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // KEY SERVICES MOBILE TOGGLE (READ MORE)
    // ==========================================
    const servicesGrid = document.querySelector('.services-grid');
    const showMoreServicesBtn = document.getElementById('show-more-services-btn');

    if (showMoreServicesBtn && servicesGrid) {
        showMoreServicesBtn.addEventListener('click', () => {
            const isExpanded = servicesGrid.classList.toggle('expanded');
            if (isExpanded) {
                showMoreServicesBtn.innerHTML = 'Read Less <i class="fa-solid fa-chevron-up"></i>';
            } else {
                showMoreServicesBtn.innerHTML = 'Read More <i class="fa-solid fa-chevron-down"></i>';
                // Scroll back to the services section when collapsing
                const servicesSection = document.getElementById('services');
                if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
            if (typeof window._refreshAllLayoutCaches === 'function') {
                setTimeout(window._refreshAllLayoutCaches, 350);
            }
        });
    }

    // ==========================================
    // 13. VERTICAL REELS CONTINUOUS FLUID 3D COVERFLOW CAROUSEL
    // ==========================================
    function initReelsSlider() {
        const reelsSection = document.getElementById('reels');
        const stage = document.getElementById('reels-stage');
        const track = document.getElementById('reels-track');
        const prevBtn = document.getElementById('reel-prev-btn');
        const nextBtn = document.getElementById('reel-next-btn');
        const paginationWrap = document.getElementById('reels-pagination');
        if (!track || !stage) return;

        const cards = Array.from(track.querySelectorAll('.reel-card'));
        const total = cards.length;
        if (total === 0) return;

        const playlist = cards.map(card => ({
            src: card.dataset.videoSrc || '',
            poster: card.dataset.poster || '',
            title: card.dataset.title || card.querySelector('.reel-title')?.textContent || 'Reel'
        }));

        const videos = cards.map(card => card.querySelector('video.reel-video'));
        const medias = cards.map(card => card.querySelector('.reel-media'));
        const soundBtns = [];

        let currentPos = 0;
        let targetPos = 0;
        let isDragging = false;
        let animRunning = false;
        let settleTimer = null;
        let lastActiveInt = -1;
        let isSectionVisible = false;
        let isCarouselUnmuted = false;
        let dots = [];

        function ensureVideoHydrated(idx, autoPreload = false) {
            const vid = videos[idx];
            if (!vid) return;
            if (!vid.dataset.hydrated && vid.dataset.src) {
                vid.dataset.hydrated = '1';
                vid.preload = autoPreload ? 'auto' : 'metadata';
                vid.src = vid.dataset.src;
            } else if (autoPreload && vid.preload !== 'auto') {
                vid.preload = 'auto';
            }
        }

        function syncCarouselSoundBtns() {
            soundBtns.forEach(btn => {
                btn.classList.toggle('is-unmuted', isCarouselUnmuted);
                btn.setAttribute('aria-label', isCarouselUnmuted ? 'Mute reel' : 'Unmute reel');
                btn.title = isCarouselUnmuted ? 'Mute sound' : 'Unmute sound';
                btn.innerHTML = isCarouselUnmuted
                    ? '<i class="fa-solid fa-volume-high"></i>'
                    : '<i class="fa-solid fa-volume-xmark"></i>';
            });
        }

        cards.forEach((card, i) => {
            const media = card.querySelector('.reel-media');
            if (!media) return;

            if (!media.querySelector('.reel-sound-btn')) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'reel-sound-btn';
                btn.setAttribute('aria-label', 'Unmute reel');
                btn.title = 'Unmute sound';
                btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';

                ['mousedown', 'touchstart'].forEach(evt => {
                    btn.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isCarouselUnmuted = !isCarouselUnmuted;
                    syncCarouselSoundBtns();

                    const activeInt = ((Math.round(currentPos) % total) + total) % total;
                    const activeVid = videos[activeInt];
                    if (activeVid) {
                        activeVid.muted = !isCarouselUnmuted;
                        if (isCarouselUnmuted) {
                            activeVid.volume = 1;
                            activeVid.play().catch(() => {});
                        }
                    }
                    updateVideoPlayback();
                });

                media.appendChild(btn);
                soundBtns.push(btn);
            }

            if (!media.querySelector('.reel-progress-wrap')) {
                const progWrap = document.createElement('div');
                progWrap.className = 'reel-progress-wrap';
                progWrap.setAttribute('aria-label', 'Reel playback progress');

                const progTrack = document.createElement('div');
                progTrack.className = 'reel-progress-track';

                const progFill = document.createElement('div');
                progFill.className = 'reel-progress-fill';

                progTrack.appendChild(progFill);
                progWrap.appendChild(progTrack);
                media.appendChild(progWrap);

                const vid = videos[i];
                let progRafId = 0;

                const syncProgress = () => {
                    if (!vid || !vid.duration || !isFinite(vid.duration)) return;
                    const ratio = Math.min(1, Math.max(0, vid.currentTime / vid.duration));
                    progFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
                };

                const stepProgress = () => {
                    if (!card.classList.contains('is-active')) {
                        progRafId = 0;
                        return;
                    }
                    syncProgress();
                    if (progRafId) progRafId = requestAnimationFrame(stepProgress);
                };

                card.addEventListener('mouseenter', () => {
                    syncProgress();
                    if (!progRafId && card.classList.contains('is-active')) {
                        progRafId = requestAnimationFrame(stepProgress);
                    }
                });

                card.addEventListener('mouseleave', () => {
                    if (progRafId) {
                        cancelAnimationFrame(progRafId);
                        progRafId = 0;
                    }
                });

                ['mousedown', 'touchstart'].forEach(evt => {
                    progWrap.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
                });
                progWrap.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!vid || !vid.duration || !isFinite(vid.duration)) return;
                    const rect = progTrack.getBoundingClientRect();
                    if (rect.width > 0) {
                        const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                        vid.currentTime = pct * vid.duration;
                        syncProgress();
                    }
                });
            }
        });

        if (paginationWrap) {
            paginationWrap.innerHTML = '';
            cards.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'reel-dot' + (idx === 0 ? ' active' : '');
                dot.setAttribute('aria-label', `Go to reel ${idx + 1}`);
                dot.addEventListener('click', () => goToShortest(idx));
                paginationWrap.appendChild(dot);
                dots.push(dot);
            });
        }

        function getLayoutConfig() {
            const w = window.innerWidth;
            if (w <= 640) {
                return {
                    offsets: [0, 94, 166, 200, 200],
                    scales: [1, 0.86, 0.72, 0.6, 0.52],
                    opacities: [1, 0.78, 0.44, 0, 0],
                    maxVisible: 2.3,
                    dragDivisor: 170
                };
            }
            if (w <= 991) {
                return {
                    offsets: [0, 128, 226, 300, 342],
                    scales: [1, 0.86, 0.74, 0.63, 0.54],
                    opacities: total <= 6 ? [1, 0.8, 0.48, 0, 0] : [1, 0.8, 0.5, 0.24, 0],
                    maxVisible: Math.min(3.3, total / 2 - 0.15),
                    dragDivisor: 190
                };
            }
            return {
                offsets: [0, 170, 308, 418, 498],
                scales: [1, 0.87, 0.75, 0.64, 0.55],
                opacities: total <= 6 ? [1, 0.82, 0.52, 0, 0] : [1, 0.82, 0.54, 0.3, 0.12],
                maxVisible: Math.min(4.3, total / 2 - 0.15),
                dragDivisor: 215
            };
        }

        // Smooth piecewise linear interpolation over control points [0, 1, 2, 3, 4]
        function sampleCurve(arr, absDiff) {
            if (absDiff <= 0) return arr[0];
            const idx = Math.floor(absDiff);
            if (idx >= arr.length - 1) return arr[arr.length - 1];
            const frac = absDiff - idx;
            return arr[idx] + (arr[idx + 1] - arr[idx]) * frac;
        }

        let videoStaggerTimers = [];

        function clearVideoStaggers() {
            while (videoStaggerTimers.length) {
                clearTimeout(videoStaggerTimers.pop());
            }
        }

        let lastSweptIdx = -1;

        function triggerSweepForCard(idx) {
            if (idx === lastSweptIdx) return;
            const card = cards[idx];
            if (!card) return;
            lastSweptIdx = idx;

            clearTimeout(card._sweepTimer);
            if (card.classList.contains('play-sweep')) {
                card.classList.remove('play-sweep');
                void card.offsetWidth;
            }
            card.classList.add('play-sweep');
            card._sweepTimer = setTimeout(() => {
                card.classList.remove('play-sweep');
            }, 1500);
        }

        function updateVideoPlayback() {
            const modPos = ((currentPos % total) + total) % total;
            const activeInt = ((Math.round(currentPos) % total) + total) % total;
            const modalOpen = document.body.classList.contains('vmodal-open');
            const half = total / 2;

            clearVideoStaggers();

            if (!isSectionVisible || modalOpen) {
                if (!isSectionVisible) lastSweptIdx = -1;
                videos.forEach(vid => {
                    if (!vid) return;
                    vid.muted = true;
                    if (!vid.paused) vid.pause();
                });
                return;
            }

            triggerSweepForCard(activeInt);

            // Autoplay the 3 frontmost videos cleanly; during active page scrolling keep only center active playing
            let staggerIdx = 0;
            const scrollingNow = Boolean(window._isUserScrolling);
            videos.forEach((vid, i) => {
                if (!vid) return;
                let diff = i - modPos;
                if (diff > half) diff -= total;
                if (diff < -half) diff += total;
                const absDiff = Math.abs(diff);

                if (absDiff <= 1.25) {
                    const isCenter = (i === activeInt);
                    if (scrollingNow && !isCenter) {
                        vid.muted = true;
                        if (!vid.paused) vid.pause();
                        return;
                    }

                    const needsHydration = !vid.dataset.hydrated;
                    const shouldUnmute = isCarouselUnmuted && isCenter;
                    vid.muted = !shouldUnmute;
                    if (shouldUnmute) vid.volume = 1;

                    const startPlay = () => {
                        ensureVideoHydrated(i, true);
                        if (vid.paused && isSectionVisible && !document.body.classList.contains('vmodal-open')) {
                            vid.play().catch(() => {});
                        }
                    };

                    if (isCenter || !needsHydration) {
                        startPlay();
                    } else {
                        staggerIdx++;
                        videoStaggerTimers.push(setTimeout(startPlay, staggerIdx * 80));
                    }
                } else {
                    vid.muted = true;
                    if (!vid.paused) vid.pause();
                }
            });
        }

        if (typeof window._onScrollIdle === 'function') {
            window._onScrollIdle(() => {
                if (isSectionVisible) updateVideoPlayback();
            });
        }

        window._syncReelsAudio = () => updateVideoPlayback();

        function render() {
            const cfg = getLayoutConfig();
            const half = total / 2;
            const modPos = ((currentPos % total) + total) % total;
            const activeInt = ((Math.round(currentPos) % total) + total) % total;

            cards.forEach((card, i) => {
                let diff = i - modPos;
                if (diff > half) diff -= total;
                if (diff < -half) diff += total;

                const absDiff = Math.abs(diff);
                const sign = diff < 0 ? -1 : 1;

                if (absDiff > cfg.maxVisible) {
                    if (!card._isHidden) {
                        card._isHidden = true;
                        card.classList.add('is-hidden');
                        card.style.opacity = '0';
                        card.style.pointerEvents = 'none';
                        card.style.zIndex = '1';
                        card.classList.remove('is-active');
                    }
                    return;
                }

                if (card._isHidden) {
                    card._isHidden = false;
                    card.classList.remove('is-hidden');
                }

                const tx = diff === 0 ? 0 : sign * sampleCurve(cfg.offsets, absDiff);
                const scale = sampleCurve(cfg.scales, absDiff);
                const mediaOpacity = sampleCurve(cfg.opacities, absDiff);
                const edgeFadeStart = Math.max(2, cfg.maxVisible - 0.85);
                const cardOpacity = absDiff > edgeFadeStart
                    ? Math.max(0, 1 - (absDiff - edgeFadeStart) / (cfg.maxVisible - edgeFadeStart))
                    : 1;
                const zIndex = Math.round(100 - absDiff * 20);

                card.style.transform = `translate3d(-50%, -50%, 0) translateX(${tx.toFixed(2)}px) scale(${scale.toFixed(4)})`;
                card.style.opacity = cardOpacity.toFixed(3);
                if (medias[i]) medias[i].style.opacity = mediaOpacity.toFixed(3);
                card.style.zIndex = String(zIndex);
                card.style.pointerEvents = mediaOpacity > 0.08 ? 'auto' : 'none';

                if (absDiff < 0.35) {
                    card.classList.add('is-active');
                } else {
                    card.classList.remove('is-active');
                }
            });

            if (activeInt !== lastActiveInt) {
                lastActiveInt = activeInt;
                dots.forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === activeInt);
                });
                updateVideoPlayback();
            }
        }

        function tick() {
            const delta = targetPos - currentPos;
            const factor = isDragging ? 0.35 : 0.14;
            if (Math.abs(delta) > 0.0008) {
                currentPos += delta * factor;
                render();
                requestAnimationFrame(tick);
            } else {
                currentPos = targetPos;
                render();
                updateVideoPlayback();
                animRunning = false;
            }
        }

        function startAnim() {
            if (!animRunning) {
                animRunning = true;
                requestAnimationFrame(tick);
            }
        }

        function scheduleSnap(delay = 160) {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
                if (!isDragging) {
                    targetPos = Math.round(targetPos);
                    startAnim();
                }
            }, delay);
        }

        function goToShortest(index) {
            clearTimeout(settleTimer);
            const currentMod = ((Math.round(targetPos) % total) + total) % total;
            let diff = index - currentMod;
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;
            targetPos = Math.round(targetPos) + diff;
            startAnim();
        }

        function step(dir) {
            clearTimeout(settleTimer);
            targetPos = Math.round(targetPos) + dir;
            startAnim();
        }

        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); step(1); });

        // Continuous Mouse Drag with Velocity Momentum
        let dragStartX = 0;
        let dragStartTarget = 0;
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let blockClick = false;

        track.addEventListener('mousedown', (e) => {
            clearTimeout(settleTimer);
            isDragging = true;
            dragStartX = e.clientX;
            lastX = e.clientX;
            lastTime = performance.now();
            velocity = 0;
            dragStartTarget = targetPos;
            blockClick = false;
            track.classList.add('is-dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const now = performance.now();
            const dt = Math.max(8, now - lastTime);
            const dxStep = e.clientX - lastX;
            velocity = dxStep / dt; // px per ms
            lastX = e.clientX;
            lastTime = now;

            const totalDx = e.clientX - dragStartX;
            if (Math.abs(totalDx) > 8) blockClick = true;

            const div = getLayoutConfig().dragDivisor;
            targetPos = dragStartTarget - totalDx / div;
            startAnim();
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            track.classList.remove('is-dragging');
            // Throw momentum glide continuously, then settle cleanly
            const div = getLayoutConfig().dragDivisor;
            targetPos -= (velocity * 180) / div;
            startAnim();
            scheduleSnap(220);
            setTimeout(() => { blockClick = false; }, 90);
        });

        // Continuous Touch Swipe with Momentum
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTarget = 0;
        let touchMode = null; // 'h' or 'v'

        track.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            clearTimeout(settleTimer);
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            lastX = touchStartX;
            lastTime = performance.now();
            velocity = 0;
            touchStartTarget = targetPos;
            touchMode = null;
            isDragging = true;
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging || !e.touches || !e.touches[0]) return;
            const tx = e.touches[0].clientX;
            const ty = e.touches[0].clientY;
            const dx = tx - touchStartX;
            const dy = ty - touchStartY;

            if (!touchMode && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
                touchMode = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
            }
            if (touchMode !== 'h') return;

            const now = performance.now();
            const dt = Math.max(8, now - lastTime);
            velocity = (tx - lastX) / dt;
            lastX = tx;
            lastTime = now;

            const div = getLayoutConfig().dragDivisor;
            targetPos = touchStartTarget - dx / div;
            startAnim();
        }, { passive: true });

        track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            if (touchMode === 'h') {
                const div = getLayoutConfig().dragDivisor;
                targetPos -= (velocity * 160) / div;
                startAnim();
                scheduleSnap(220);
            }
            touchMode = null;
        }, { passive: true });

        // Continuous Fluid Horizontal Wheel / Trackpad Swipe (Shift + Wheel or horizontal swipe — never hijack vertical scroll)
        stage.addEventListener('wheel', (e) => {
            const isHoriz = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1;
            let scrollDelta = 0;

            if (isHoriz) {
                scrollDelta = e.deltaX;
            } else if (e.shiftKey && Math.abs(e.deltaY) > 1) {
                scrollDelta = e.deltaY;
            }

            if (scrollDelta !== 0) {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(settleTimer);
                targetPos += scrollDelta * 0.0042;
                startAnim();
                scheduleSnap(220);
            }
        }, { passive: false });

        // Card Clicks: flanking card glides to center; active center card opens popup with Next/Prev
        cards.forEach((card, idx) => {
            card.addEventListener('click', (e) => {
                if (blockClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                const activeInt = ((Math.round(currentPos) % total) + total) % total;
                if (idx !== activeInt) {
                    goToShortest(idx);
                    return;
                }
                if (typeof openReelModal === 'function') {
                    openReelModal(playlist, idx);
                }
            });
        });

        // Pause off-screen reel videos & light sweep when user is in other sections
        if (reelsSection && 'IntersectionObserver' in window) {
            reelsSection.classList.add('is-paused');
            const reelsVisObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    isSectionVisible = entry.isIntersecting;
                    reelsSection.classList.toggle('is-paused', !isSectionVisible);
                    updateVideoPlayback();
                });
            }, { rootMargin: '250px 0px' });
            reelsVisObserver.observe(reelsSection);
        } else {
            isSectionVisible = true;
            if (reelsSection) reelsSection.classList.remove('is-paused');
        }

        window.addEventListener('resize', render, { passive: true });
        render();
    }

    // ==========================================
    // 14. ABOUT SECTION — SMOOTH 3D BOTTOM-TO-TOP SCROLL UNFOLD (1:1 Frame Synced)
    // ==========================================
    function initAboutUnfold() {
        const wrap = document.getElementById('about-unfold-wrap');
        const grid = document.getElementById('about-unfold');
        if (!wrap || !grid) return;

        let cachedWrapTop = 0;
        let cachedVh = window.innerHeight || 900;
        let isDesktop = window.innerWidth >= 992;
        let lastKey = '';

        function measureAbout() {
            const rect = wrap.getBoundingClientRect();
            cachedWrapTop = rect.top + (window.scrollY || 0);
            cachedVh = window.innerHeight || 900;
            isDesktop = window.innerWidth >= 992;
        }

        function updateUnfold(scrollY = window.scrollY || 0) {
            const rectTop = cachedWrapTop - scrollY;
            const progress = Math.min(1, Math.max(0, (cachedVh * 0.98 - rectTop) / (cachedVh * 0.68)));
            const key = progress.toFixed(3);
            if (key === lastKey) return;
            lastKey = key;

            if (progress >= 0.999) {
                grid.style.transform = 'translate3d(0, 0, 0) scale(1)';
                grid.style.opacity = '1';
                grid.classList.add('is-settled');
                return;
            }
            grid.classList.remove('is-settled');

            const inv = 1 - progress;
            const ty = (isDesktop ? 44 : 26) * inv;
            const sc = (isDesktop ? 0.72 : 0.78) + (isDesktop ? 0.28 : 0.22) * progress;
            const op = 0.35 + 0.65 * progress;
            const rot = (isDesktop ? 30 : 20) * inv;
            grid.style.transform = `rotateX(${rot.toFixed(2)}deg) translate3d(0, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
            grid.style.opacity = op.toFixed(3);
        }

        if (window._layoutCacheRefreshers) window._layoutCacheRefreshers.push(measureAbout);
        if (typeof window._onScrollSync === 'function') window._onScrollSync(updateUnfold);

        window.addEventListener('resize', () => {
            measureAbout();
            lastKey = '';
            updateUnfold(window.scrollY || 0);
        }, { passive: true });
        window.addEventListener('load', () => {
            measureAbout();
            lastKey = '';
            updateUnfold(window.scrollY || 0);
        });

        measureAbout();
        updateUnfold(window.scrollY || 0);
    }

    initAboutUnfold();
    initReelsSlider();
});
