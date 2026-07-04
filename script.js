document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. SCROLL PROGRESS TRACKING & STICKY HEADER
    // ==========================================
    const header = document.getElementById('header');
    const progressBar = document.getElementById('scroll-progress');
    const whatsappBtn = document.getElementById('whatsapp-fab');
    const heroSection = document.getElementById('hero');
    
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

        // WhatsApp FAB visibility toggle (visible exactly when entering the About Anas section)
        const aboutSection = document.getElementById('about');
        if (whatsappBtn && aboutSection) {
            const aboutTop = aboutSection.offsetTop;
            if (scrollY >= aboutTop - 150) {
                whatsappBtn.classList.add('visible');
            } else {
                whatsappBtn.classList.remove('visible');
            }
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

            // Google Form Response endpoint
            const googleFormUrl = "https://docs.google.com/forms/u/0/d/e/1FAIpQLScM7tpfeBjfM4NLmbLHfNsZ9OQMLPEvvB2cLIObrWWQjU262Q/formResponse";
            
            const formData = new URLSearchParams();
            formData.append('entry.1451078961', nameVal);
            formData.append('entry.1433838400', emailVal);
            // Combine Subject and Message since Google Form has Name, Email, Message
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
                
                showFeedback('Thank you! Your message has been sent successfully.', 'success');
                contactForm.reset();
                
                setTimeout(() => {
                    formFeedback.classList.remove('success', 'error');
                    formFeedback.style.display = 'none';
                }, 5000);
            })
            .catch((error) => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                showFeedback('Oops! Something went wrong. Please try again.', 'error');
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
                    drawHeight = canvasHeight;
                    drawWidth = canvasHeight * imgRatio;
                    drawX = canvasWidth - drawWidth - (canvasWidth * 0.03);
                    drawY = 0;
                } else {
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

                // Deferred loading of remaining frames to boost initial page speed
                let preloadStarted = false;
                const startPreloadRemaining = () => {
                    if (preloadStarted) return;
                    preloadStarted = true;
                    for (let i = 0; i < totalFrames; i++) {
                        if (i === startFrame) continue;
                        images[i].src = framePaths[i];
                        images[i].onload  = () => { loadedCount++; };
                        images[i].onerror = () => { loadedCount++; };
                    }
                };

                // Trigger loading after 1.5s delay OR immediately on first user scroll
                const deferTimer = setTimeout(startPreloadRemaining, 1500);
                window.addEventListener('scroll', () => {
                    clearTimeout(deferTimer);
                    startPreloadRemaining();
                }, { once: true, passive: true });
            };

            firstImg.onerror = () => {
                // Fallback: load all frames
                imagesLoaded = true;
                for (let i = 0; i < totalFrames; i++) {
                    images[i].src = framePaths[i];
                }
            };
        }

        let targetScrollTop = 0;
        let currentScrollTop = 0;

        function updateTargetFrame() {
            targetScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        }

        function smoothScrollLoop() {
            // Buttery smooth ease-out inertia calculation
            const diff = targetScrollTop - currentScrollTop;
            if (Math.abs(diff) > 0.08) {
                currentScrollTop += diff * 0.09;
            } else {
                currentScrollTop = targetScrollTop;
            }

            if (imagesLoaded) {
                const heroHeight = heroSection?.offsetHeight || 0;
                const aboutHeight = aboutSection?.offsetHeight || 0;
                const expHeight = experienceSection?.offsetHeight || 0;
                
                const maxScroll = heroHeight + aboutHeight + expHeight;
                
                // Map the smooth scroll offset to frame indices
                const fraction = Math.min(1, Math.max(0, currentScrollTop / maxScroll));
                const startFrame = 20;
                const targetFrame = startFrame + Math.round(fraction * (totalFrames - 1 - startFrame));
                
                drawFrame(targetFrame);
                
                // Fade canvas out smoothly near the end of the timeline
                const fadeStart = maxScroll - 200;
                const fadeEnd = maxScroll + 200;
                
                if (currentScrollTop > fadeStart) {
                    const fadeProgress = Math.min(1, (currentScrollTop - fadeStart) / (fadeEnd - fadeStart));
                    heroCanvas.style.opacity = (0.8 * (1 - fadeProgress)).toString();
                    heroCanvas.style.visibility = fadeProgress === 1 ? 'hidden' : 'visible';
                } else {
                    heroCanvas.style.opacity = '0.8';
                    heroCanvas.style.visibility = 'visible';
                }
            }

            requestAnimationFrame(smoothScrollLoop);
        }

        // Start the smooth drawing animation loop
        smoothScrollLoop();

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
                
                // Trigger layout recalibration on active grid
                const grid = activeContent.querySelector('.skills-compact-grid');
                if (grid && typeof grid._updateRows === 'function') {
                    grid._updateRows();
                }
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
                
                // Toggle details-expanded state on the parent container card
                const parentCard = toggle.closest('.timeline-content') || toggle.closest('.about-info') || toggle.closest('.edu-card');
                if (parentCard) {
                    parentCard.classList.toggle('details-expanded', isExpanded);
                }
                
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

    // ==========================================
    // 12. DYNAMIC SKILLS SEE MORE / SHOW LESS
    // ==========================================
    function initSkillsSeeMore() {
        const tabs = ['creative', 'ai', 'capabilities'];
        
        tabs.forEach(tabId => {
            const tabContent = document.getElementById(`skills-tab-${tabId}`);
            if (!tabContent) return;
            
            const grid = tabContent.querySelector('.skills-compact-grid');
            if (!grid) return;
            
            const cards = grid.querySelectorAll('.skill-compact-card');
            if (cards.length === 0) return;
            
            // Create See More button wrap
            const btnWrap = document.createElement('div');
            btnWrap.className = 'skills-see-more-wrap';
            btnWrap.style.display = 'none';
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary skills-see-more-btn';
            btn.innerHTML = `See More <i class="fa-solid fa-chevron-down"></i>`;
            btnWrap.appendChild(btn);
            tabContent.appendChild(btnWrap);
            
            let isExpanded = false;
            
            const updateRows = () => {
                // Reset card display classes
                cards.forEach(c => c.classList.remove('hidden-row'));
                
                if (isExpanded) {
                    btn.innerHTML = `See Less <i class="fa-solid fa-chevron-up"></i>`;
                    btnWrap.style.display = 'flex';
                    return;
                }
                
                // Get unique offsetTops to determine row positions
                const offsets = Array.from(cards).map(c => c.offsetTop);
                const uniqueOffsets = [...new Set(offsets)].sort((a, b) => a - b);
                
                if (uniqueOffsets.length > 2) {
                    btnWrap.style.display = 'flex';
                    btn.innerHTML = `See More <i class="fa-solid fa-chevron-down"></i>`;
                    
                    const thirdRowOffset = uniqueOffsets[2];
                    cards.forEach(c => {
                        if (c.offsetTop >= thirdRowOffset) {
                            c.classList.add('hidden-row');
                        }
                    });
                } else {
                    btnWrap.style.display = 'none';
                }
            };
            
            btn.addEventListener('click', () => {
                isExpanded = !isExpanded;
                updateRows();
                
                // Scroll smoothly to the skills section title if collapsing
                if (!isExpanded) {
                    tabContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
            
            // Store update function on grid element to access it externally
            grid._updateRows = updateRows;
            
            // Run update layout
            if (tabContent.classList.contains('active')) {
                setTimeout(updateRows, 50);
            }
            
            // Debounced resize handler
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(updateRows, 100);
            });
        });
    }
    
    // ==========================================
    // 13. MINIMAL & LUXURY PARTICLES BACKGROUND
    // ==========================================
    function initParticles() {
        const canvas = document.getElementById('particles-bg-canvas');
        if (!canvas) return;
        
        // Hide particles completely on mobile screens
        if (window.innerWidth < 768) {
            canvas.style.display = 'none';
            return;
        }
        
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null };
        const maxParticles = 75; // Balanced for desktop and mobile performance

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 1.3 + 0.7; // Very small, delicate dots
                this.baseSpeedX = (Math.random() - 0.5) * 0.22; // Slow, luxurious drift
                this.baseSpeedY = (Math.random() - 0.5) * 0.22;
                this.speedX = this.baseSpeedX;
                this.speedY = this.baseSpeedY;
                // Soft blue & purple colors
                this.color = Math.random() > 0.5 ? 'rgba(168, 85, 247, 0.35)' : 'rgba(0, 210, 255, 0.35)';
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Bounce off canvas edges
                if (this.x < 0 || this.x > canvas.width) this.speedX = -this.speedX;
                if (this.y < 0 || this.y > canvas.height) this.speedY = -this.speedY;

                // Gentle interactive mouse repulsion
                if (mouse.x !== null && mouse.y !== null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    let maxDistance = 120;
                    if (distance < maxDistance) {
                        let force = (maxDistance - distance) / maxDistance;
                        // Move particles away from the mouse cursor
                        this.x -= (dx / distance) * force * 0.7;
                        this.y -= (dy / distance) * force * 0.7;
                    }
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        // Initialize particles
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle());
        }

        // Draw connections
        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particles.length; a++) {
                // Check distance to mouse for connecting lines
                if (mouse.x !== null && mouse.y !== null) {
                    let dx = mouse.x - particles[a].x;
                    let dy = mouse.y - particles[a].y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.strokeStyle = `rgba(0, 210, 255, ${(1 - dist / 120) * 0.08})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }

                // Check distance to other particles
                for (let b = a + 1; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 85) {
                        opacityValue = (1 - distance / 85) * 0.05;
                        ctx.strokeStyle = `rgba(168, 85, 247, ${opacityValue})`;
                        ctx.lineWidth = 0.4;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            connect();
            requestAnimationFrame(animate);
        }
        animate();
    }

    initSkillsSeeMore();
    initParticles();
    initPortfolioFilter();
});

// ==========================================
// 14. PORTFOLIO FILTER TABS
// ==========================================
function initPortfolioFilter() {
    const filterBtns = document.querySelectorAll('.portfolio-tab-btn');
    const items = document.querySelectorAll('.portfolio-grid .portfolio-item');
    const seeMoreBtnWrap = document.querySelector('.portfolio-more-video-btn-wrap');
    const seeMoreBtn = document.getElementById('portfolio-see-more-btn');
    
    if (filterBtns.length === 0) return;

    let videoLimitActive = true;

    function applyFilter(filter) {
        let visibleVideoCount = 0;

        items.forEach(item => {
            if (item.dataset.category === filter) {
                if (filter === 'video') {
                    if (videoLimitActive && visibleVideoCount >= 4) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'block';
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.96)';
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'scale(1)';
                            item.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                        }, 40);
                        visibleVideoCount++;
                    }
                } else {
                    // For graphic design design tab, show everything
                    item.style.display = 'block';
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.96)';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                        item.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    }, 40);
                }
            } else {
                item.style.display = 'none';
            }
        });

        // Toggle visibility of the See More Button
        if (seeMoreBtnWrap) {
            if (filter === 'video') {
                seeMoreBtnWrap.style.display = 'flex';
                if (seeMoreBtn) {
                    if (videoLimitActive) {
                        seeMoreBtn.innerHTML = 'See More Video Projects <i class="fa-solid fa-chevron-down"></i>';
                    } else {
                        seeMoreBtn.innerHTML = 'See Less Video Projects <i class="fa-solid fa-chevron-up"></i>';
                    }
                }
            } else {
                seeMoreBtnWrap.style.display = 'none';
            }
        }
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // Toggle active class on tab buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            applyFilter(filter);
        });
    });

    if (seeMoreBtn) {
        seeMoreBtn.addEventListener('click', () => {
            videoLimitActive = !videoLimitActive;
            
            // Re-apply filter to show/hide extra video projects
            const activeBtn = document.querySelector('.portfolio-tab-btn.active');
            if (activeBtn) {
                applyFilter(activeBtn.dataset.filter);
            }
        });
    }

    // Make sure initial active state triggers
    const activeBtn = document.querySelector('.portfolio-tab-btn.active');
    if (activeBtn) {
        activeBtn.click();
    }
}

// ==========================================
// 15. INTRO LOADER LIFECYCLE
// ==========================================
window.addEventListener('load', () => {
    const loader = document.getElementById('intro-loader');
    if (loader) {
        // Lock body scrolling temporarily while loading
        document.body.classList.add('overflow-hidden');
        
        setTimeout(() => {
            loader.classList.add('fade-out');
            document.body.classList.remove('overflow-hidden');
        }, 1300); // 1.3s duration matches progress animation perfectly
    }
});
