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
        let loadedCount = 0;
        let imagesLoaded = false;

        let lastDrawnFrame = -1;
        let canvasWidth = 0;
        let canvasHeight = 0;

        // Generate file paths (optimized resolution saved locally)
        const framePaths = [];
        for (let i = 1; i <= totalFrames; i++) {
            const frameNum = String(i).padStart(3, '0');
            framePaths.push(`assets/scroll-images/ezgif-frame-${frameNum}.jpg`);
        }

        function resizeCanvas() {
            canvasWidth = window.innerWidth;
            canvasHeight = window.innerHeight;
            heroCanvas.width = canvasWidth;
            heroCanvas.height = canvasHeight;
            
            if (imagesLoaded) {
                lastDrawnFrame = -1;
                updateTargetFrame();
            }
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function drawFrame(index) {
            const img = images[index];
            if (img && img.complete && index !== lastDrawnFrame) {
                heroCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                
                // Draw contain image (no crop, fits entirely inside the canvas)
                const imgWidth = img.width;
                const imgHeight = img.height;
                const imgRatio = imgWidth / imgHeight;
                const canvasRatio = canvasWidth / canvasHeight;
                
                let drawWidth, drawHeight, drawX, drawY;
                if (canvasRatio > imgRatio) {
                    // Desktop view: height is 100% of viewport, width scales proportionally.
                    // Positioned on the right side with a 3% screen width margin from the right edge.
                    drawHeight = canvasHeight;
                    drawWidth = canvasHeight * imgRatio;
                    drawX = canvasWidth - drawWidth - (canvasWidth * 0.03);
                    drawY = 0;
                } else {
                    // Mobile view: width is 100% of viewport, height scales proportionally, centered.
                    drawWidth = canvasWidth;
                    drawHeight = canvasWidth / imgRatio;
                    drawX = 0;
                    drawY = (canvasHeight - drawHeight) / 2;
                }
                
                heroCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                lastDrawnFrame = index;
            }
        }

        function preload() {
            for (let i = 0; i < totalFrames; i++) {
                const img = new Image();
                img.src = framePaths[i];
                img.onload = () => {
                    loadedCount++;
                    if (loadedCount === totalFrames) {
                        onPreloadComplete();
                    }
                };
                img.onerror = () => {
                    loadedCount++;
                    if (loadedCount === totalFrames) {
                        onPreloadComplete();
                    }
                };
                images.push(img);
            }
        }

        function onPreloadComplete() {
            imagesLoaded = true;
            resizeCanvas(); // Draw initial frame on complete
        }

        function updateTargetFrame() {
            if (!imagesLoaded) return;

            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const heroHeight = heroSection?.offsetHeight || 0;
            const aboutHeight = aboutSection?.offsetHeight || 0;
            const expHeight = experienceSection?.offsetHeight || 0;
            
            const maxScroll = heroHeight + aboutHeight + expHeight;
            
            // Map scroll within the 3 sections directly to animation frames
            const fraction = Math.min(1, Math.max(0, scrollTop / maxScroll));
            const targetFrame = Math.round(fraction * (totalFrames - 1));
            
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
});
