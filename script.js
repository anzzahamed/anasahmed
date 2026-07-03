document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. SCROLL PROGRESS TRACKING & STICKY HEADER
    // ==========================================
    const header = document.getElementById('header');
    const progressBar = document.getElementById('scroll-progress');
    
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // Header background fade
        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Scroll progress bar width
        const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScroll > 0) {
            const scrolledPercentage = (scrollY / totalScroll) * 100;
            progressBar.style.width = scrolledPercentage + '%';
        }
    });

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
    const sections = document.querySelectorAll('section');

    const scrollObserverOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px'
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                if (entry.target.id === 'skills') {
                    animateSkillBars();
                }
                observer.unobserve(entry.target);
            }
        });
    }, scrollObserverOptions);

    revealElements.forEach(element => {
        scrollObserver.observe(element);
    });

    // Navbar link highlighter on scroll
    const navObserverOptions = {
        root: null,
        threshold: 0.4,
        rootMargin: '-20% 0px -40% 0px'
    };

    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${activeId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, navObserverOptions);

    sections.forEach(section => {
        navObserver.observe(section);
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
    // 8. CONTACT FORM SIMULATION
    // ==========================================
    const contactForm = document.getElementById('contact-form');
    const formFeedback = document.getElementById('form-feedback');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('name').value.trim();
            const emailVal = document.getElementById('email').value.trim();
            const subjectVal = document.getElementById('subject').value.trim();
            const messageVal = document.getElementById('message').value.trim();

            if (!nameVal || !emailVal || !subjectVal || !messageVal) {
                showFeedback('Please fill out all fields.', 'error');
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending... <i class="fa-solid fa-spinner fa-spin"></i>';

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                showFeedback('Thank you! Your message has been sent successfully.', 'success');
                contactForm.reset();
                
                setTimeout(() => {
                    formFeedback.classList.remove('success', 'error');
                    formFeedback.style.display = 'none';
                }, 5000);
            }, 1800);
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
    // ==========================================
    const heroCanvas = document.getElementById('hero-scroll-canvas');
    if (heroCanvas) {
        const heroCtx = heroCanvas.getContext('2d');
        const heroSection = document.getElementById('hero');
        const aboutSection = document.getElementById('about');
        const experienceSection = document.getElementById('experience');

        const totalFrames = 239;
        const images = [];
        for (let i = 0; i < totalFrames; i++) {
            images.push(new Image());
        }
        let loadedCount = 0;
        let imagesLoaded = false;

        let lastDrawnFrame = -1;
        let canvasWidth = 0;
        let canvasHeight = 0;
        let lastWidth = 0;
        let lastHeight = 0;

        // Generate file paths
        const framePaths = [];
        for (let i = 1; i <= totalFrames; i++) {
            const frameNum = String(i).padStart(3, '0');
            framePaths.push(`assets/scroll-images/ezgif-frame-${frameNum}.jpg`);
        }

        // Always sets canvas size — called once on load and on real resize/rotation
        function initCanvas() {
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            lastWidth = canvasWidth;
            lastHeight = canvasHeight;
            heroCanvas.width = canvasWidth;
            heroCanvas.height = canvasHeight;
        }

        // Only responds to real layout changes (not iOS address-bar micro-resizes)
        function resizeCanvas() {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;
            const heightDiff = Math.abs(newHeight - lastHeight);
            // Skip if width is same AND height shift is tiny (iOS address bar)
            if (newWidth === lastWidth && heightDiff < 120) return;

            lastWidth = newWidth;
            lastHeight = newHeight;
            canvasWidth = newWidth;
            canvasHeight = newHeight;
            heroCanvas.width = canvasWidth;
            heroCanvas.height = canvasHeight;

            if (imagesLoaded) {
                lastDrawnFrame = -1;
                updateTargetFrame();
            }
        }

        initCanvas(); // Set canvas size BEFORE any image loads
        window.addEventListener('resize', resizeCanvas);

        function drawFrame(index) {
            const img = images[index];
            if (img && img.complete && img.naturalWidth > 0 && index !== lastDrawnFrame) {
                heroCtx.clearRect(0, 0, canvasWidth, canvasHeight);

                const imgRatio = img.naturalWidth / img.naturalHeight;
                const canvasRatio = canvasWidth / canvasHeight;

                let drawWidth, drawHeight, drawX, drawY;
                if (canvasRatio > imgRatio) {
                    // Desktop: image fills full height, placed on right
                    drawHeight = canvasHeight;
                    drawWidth = canvasHeight * imgRatio;
                    drawX = canvasWidth - drawWidth - (canvasWidth * 0.03);
                    drawY = 0;
                } else {
                    // Mobile: image fills full width, offset down past header
                    drawWidth = canvasWidth;
                    drawHeight = canvasWidth / imgRatio;
                    drawX = 0;
                    drawY = 75;
                }

                heroCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                lastDrawnFrame = index;
            }
        }

        function preload() {
            const startFrame = 20; // Skip initial camera zoom-in frames

            // Load the start frame FIRST so it displays immediately
            const firstImg = images[startFrame];
            firstImg.src = framePaths[startFrame];

            firstImg.onload = () => {
                imagesLoaded = true;
                // Draw directly — do NOT call resizeCanvas (iOS guard would block it)
                drawFrame(startFrame);
                heroCanvas.style.opacity = '0.8';
                heroCanvas.style.visibility = 'visible';

                // Background-load all remaining frames after first is shown
                for (let i = 0; i < totalFrames; i++) {
                    if (i === startFrame) continue;
                    images[i].src = framePaths[i];
                    images[i].onload  = () => { loadedCount++; };
                    images[i].onerror = () => { loadedCount++; };
                }
            };

            firstImg.onerror = () => {
                // Fallback: load all frames
                imagesLoaded = true;
                for (let i = 0; i < totalFrames; i++) {
                    images[i].src = framePaths[i];
                }
            };
        }

        function updateTargetFrame() {
            if (!imagesLoaded) return;

            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const heroHeight = heroSection?.offsetHeight || 0;
            const aboutHeight = aboutSection?.offsetHeight || 0;
            const expHeight = experienceSection?.offsetHeight || 0;
            
            const maxScroll = heroHeight + aboutHeight + expHeight;
            
            // Map scroll within the 3 sections directly to animation frames, bypassing the initial camera zoom stretch frames
            const fraction = Math.min(1, Math.max(0, scrollTop / maxScroll));
            const startFrame = 20;
            const targetFrame = startFrame + Math.round(fraction * (totalFrames - 1 - startFrame));
            
            // Render frame instantly for zero lag responsiveness
            drawFrame(targetFrame);
            
            // Smoothly fade out canvas as we scroll past the Experience section
            const fadeStart = maxScroll - 200; // start fading slightly before the section ends
            const fadeEnd = maxScroll + 200;
            
            if (scrollTop > fadeStart) {
                const fadeProgress = Math.min(1, (scrollTop - fadeStart) / (fadeEnd - fadeStart));
                heroCanvas.style.opacity = (0.8 * (1 - fadeProgress)).toString();
                heroCanvas.style.visibility = fadeProgress === 1 ? 'hidden' : 'visible';
            } else {
                heroCanvas.style.opacity = '0.8';
                heroCanvas.style.visibility = 'visible';
            }
        }

        window.addEventListener('scroll', updateTargetFrame, { passive: true });
        


        preload();
    }

    // ==========================================
    // 9. SKILLS TABS TOGGLING
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.skills-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const activeContent = document.getElementById(`skills-tab-${tabId}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

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
                
                // Toggle text content
                const hasDetails = toggle.innerText.toLowerCase().includes('details');
                const actionText = isExpanded ? (hasDetails ? 'Hide Details' : 'Read Less') : (hasDetails ? 'Read Details' : 'Read More');
                toggle.innerHTML = `${actionText} <i class="fa-solid fa-chevron-down" style="transform: ${isExpanded ? 'rotate(180deg)' : 'none'}; transition: transform 0.3s ease;"></i>`;
            }
        });
    });

    // ==========================================
    // 11. VIDEO MODAL — open on card click
    // ==========================================
    const vModal      = document.getElementById('video-modal');
    const vIframe     = document.getElementById('vmodal-iframe');
    const vCloseBtn   = document.getElementById('vmodal-close');

    function openVideoModal(videoId) {
        if (!vModal || !vIframe) return;
        // Full Vimeo player — no background/muted/loop so audio and controls work
        vIframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
        vModal.classList.add('active');
        vModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('vmodal-open');
    }

    function closeVideoModal() {
        if (!vModal || !vIframe) return;
        vModal.classList.remove('active');
        vModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('vmodal-open');
        // Clear src to actually stop the video & free memory
        setTimeout(() => { vIframe.src = ''; }, 300);
    }

    // Attach click to every portfolio card that has a video id
    document.querySelectorAll('.portfolio-item[data-video-id]').forEach(card => {
        card.addEventListener('click', () => {
            openVideoModal(card.dataset.videoId);
        });
        card.style.cursor = 'pointer';
    });

    // Close button
    if (vCloseBtn) vCloseBtn.addEventListener('click', closeVideoModal);

    // Click on dark backdrop to close
    if (vModal) {
        vModal.addEventListener('click', (e) => {
            if (e.target === vModal) closeVideoModal();
        });
    }

    // Keyboard ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeVideoModal();
    });
});
