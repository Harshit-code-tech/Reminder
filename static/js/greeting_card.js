/**
 * Enhanced Greeting Card JavaScript
 * Modern, modular, and accessible greeting card implementation
 */

// ===== CONFIGURATION & CONSTANTS =====
const CONFIG = {
    TRANSITIONS: {
        FAST: 200,
        MEDIUM: 300,
        SLOW: 500,
        THEME: 800
    },
    TIMEOUTS: {
        CONFETTI: 5000,
        FEEDBACK: 3000,
        SLIDESHOW: 5000
    },
    BREAKPOINTS: {
        MOBILE: 768,
        SMALL: 480
    }
};

// ===== MAIN APPLICATION CLASS =====
class GreetingCardApp {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 5;
        this.unlocked = false;
        this.incorrectAttempts = 0;
        this.cardContainer = null;
        this.eventType = 'birthday';
        this.themes = this.initializeThemes();
        this.elements = {};
        this.storageKey = '';
        this.savedData = {};

        this.init();
    }

    // ===== INITIALIZATION =====
    init() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.initializeCard();
            this.setupThemeSystem();
            this.setupNavigation();
            this.initializeBackgroundEffects();
            console.log('Greeting card initialized successfully');
        } catch (error) {
            console.error('Error initializing greeting card:', error);
            this.showFeedback('An error occurred while loading the card.', 'error');
        }
    }

    // ===== ELEMENT CACHING =====
    cacheElements() {
        this.cardContainer = document.querySelector('.card-container');
        if (!this.cardContainer) {
            throw new Error('Card container not found');
        }

        this.elements = {
            // Navigation
            navItems: document.querySelectorAll('.nav-item'),

            // Theme toggle
            themeToggle: document.querySelector('.theme-toggle'),

            // Pages
            cardPages: document.querySelectorAll('.card-page'),

            // Password elements
            passwordInput: document.querySelector('.password-input'),
            unlockButton: document.querySelector('.unlock-button'),
            passwordHint: document.querySelector('#password-hint'),
            revealPassword: document.querySelector('#reveal-password'),
            actualPassword: document.querySelector('#actual-password'),

            // Slider elements
            sliderTrack: document.querySelector('.slider-track'),
            sliderThumb: document.querySelector('.slider-thumb'),
            yesButton: document.querySelector('#yes-unlocked-button'),

            // Media elements
            mediaDisplays: document.querySelectorAll('.media-display'),
            audioControl: document.querySelector('.audio-control'),
            calmingSound: document.querySelector('#calming-sound'),

            // Interactive elements
            birthdayCake: document.querySelector('.birthday-cake'),
            danceButton: document.querySelector('.dance-button'),
            memoryTree: document.querySelector('.memory-tree'),

            // Share elements
            shareButton: document.querySelector('.share-card'),
            shareModal: document.querySelector('#share-modal'),

            // Voice note
            playVoiceNote: document.querySelector('.play-voice-note'),
            voiceNoteText: document.querySelector('.voice-note-text')
        };

        // Extract data attributes
        this.eventType = this.cardContainer.dataset.theme || 'birthday';
        this.storageKey = `cardState_${window.location.pathname}`;
        this.savedData = this.getSavedData();
    }

    // ===== EVENT LISTENERS SETUP =====
    setupEventListeners() {
        // Navigation
        this.elements.navItems.forEach((item, index) => {
            item.addEventListener('click', () => this.goToPage(index + 1));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.goToPage(index + 1);
                }
            });
        });

        // Password validation
        if (this.elements.passwordInput && this.elements.unlockButton) {
            this.elements.unlockButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.validatePassword();
            });

            this.elements.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.validatePassword();
                }
            });
        }

        // Password reveal
        if (this.elements.revealPassword) {
            this.elements.revealPassword.addEventListener('click', this.revealPassword.bind(this));
            this.elements.revealPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.revealPassword();
                }
            });
        }

        // Slider unlock
        this.setupSliderUnlock();

        // Interactive elements
        this.setupInteractiveElements();

        // Share functionality
        this.setupSharing();

        // Voice note
        this.setupVoiceNote();

        // Global keyboard navigation
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    }

    // ===== THEME SYSTEM =====
    initializeThemes() {
        return {
            birthday: {
                password: (name) => name.trim().toLowerCase(),
                quotes: [
                    "May your day be as bright as your smile!",
                    "Another year of awesome you!",
                    "Age is merely the number of years the world has been enjoying you.",
                    "Shine bright today and always!",
                    "You're not getting older, you're getting better!",
                    "May your birthday be filled with laughter and joy!"
                ],
                confettiColors: ['#fde68a', '#fbbf24', '#f59e0b', '#d97706']
            },
            anniversary: {
                password: (date) => date,
                quotes: [
                    "Love grows stronger every year!",
                    "The best is yet to come.",
                    "Forever isn't long enough with you.",
                    "Through all the seasons, my love for you grows.",
                    "Every moment with you is a blessing.",
                    "Here's to many more years of happiness together."
                ],
                confettiColors: ['#fbcfe8', '#f472b6', '#db2777', '#be185d']
            },
            other: {
                password: (label) => label.trim().toLowerCase(),
                quotes: [
                    "Cherish every moment of your journey!",
                    "Keep shining your light on the world!",
                    "The adventure continues!",
                    "You're making a difference every day.",
                    "The best journeys are shared with friends like you.",
                    "Celebrating this special occasion with you!"
                ],
                confettiColors: ['#a5f3fc', '#22d3ee', '#0891b2', '#0e7490']
            }
        };
    }

    setupThemeSystem() {
        if (!this.elements.themeToggle) return;

        // Get saved theme or system preference
        const savedTheme = localStorage.getItem('cardTheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

        // Apply initial theme
        this.setTheme(isDark ? 'dark' : 'light');

        // Theme toggle click handler
        this.elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('cardTheme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        // Add transition class
        document.documentElement.classList.add('theme-transition');

        // Set theme
        document.documentElement.setAttribute('data-theme', theme);

        // Update toggle button
        this.elements.themeToggle.setAttribute('aria-pressed', theme === 'dark');

        // Add active animation
        this.elements.themeToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.elements.themeToggle.style.transform = '';
        }, 150);

        // Update background effects
        this.updateBackgroundEffects(theme);

        // Save preference
        localStorage.setItem('cardTheme', theme);

        // Remove transition class
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, CONFIG.TRANSITIONS.THEME);
    }

    // ===== BACKGROUND EFFECTS =====
    initializeBackgroundEffects() {
        this.createStars();
        this.createClouds();
    }

    createStars() {
        const starsContainer = document.querySelector('.stars-container');
        if (!starsContainer) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.className = 'star-bg';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${3 + Math.random() * 7}s`;
            fragment.appendChild(star);
        }
        starsContainer.appendChild(fragment);
    }

    createClouds() {
        const cloudsContainer = document.querySelector('.clouds-container');
        if (!cloudsContainer) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 5; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-bg';
            cloud.style.left = `${Math.random() * 100}%`;
            cloud.style.top = `${Math.random() * 40}%`;
            cloud.style.animationDelay = `${Math.random() * 20}s`;
            cloud.style.animationDuration = `${30 + Math.random() * 30}s`;
            cloud.style.opacity = `${0.2 + Math.random() * 0.3}`;
            cloud.style.transform = `scale(${0.5 + Math.random() * 0.5})`;
            fragment.appendChild(cloud);
        }
        cloudsContainer.appendChild(fragment);
    }

    updateBackgroundEffects(theme) {
        const starsContainer = document.querySelector('.stars-container');
        const cloudsContainer = document.querySelector('.clouds-container');

        if (starsContainer && cloudsContainer) {
            if (theme === 'dark') {
                starsContainer.style.opacity = '1';
                cloudsContainer.style.opacity = '0';
            } else {
                starsContainer.style.opacity = '0';
                cloudsContainer.style.opacity = '1';
            }
        }
    }

    // ===== NAVIGATION SYSTEM =====
    setupNavigation() {
        this.updateNavigationState();
    }

    goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages) return;

        // Check if page is unlocked
        if (pageNum > 1 && !this.unlocked) {
            this.shakePasswordInput('Please unlock the card first');
            return;
        }

        this.currentPage = pageNum;
        this.saveData({ lastPage: this.currentPage });

        // Update page visibility
        this.elements.cardPages.forEach((page, index) => {
            const isActive = index + 1 === this.currentPage;
            page.classList.toggle('active', isActive);
            page.style.display = isActive ? 'flex' : 'none';
            page.setAttribute('aria-hidden', !isActive);
        });

        // Update navigation state
        this.updateNavigationState();

        // Initialize page-specific features
        this.initializePage(pageNum);

        // Smooth scroll to top
        this.cardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateNavigationState() {
        this.elements.navItems.forEach((item, index) => {
            const pageNum = index + 1;
            const isActive = pageNum === this.currentPage;
            const isAccessible = pageNum <= this.currentPage + 1 || this.unlocked;

            item.classList.toggle('active', isActive);
            item.style.opacity = isAccessible ? '1' : '0.5';
            item.style.pointerEvents = isAccessible ? 'auto' : 'none';
            item.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    // ===== PASSWORD SYSTEM =====
    validatePassword() {
        const inputValue = this.elements.passwordInput?.value?.trim() || '';
        const eventId = this.cardContainer.dataset.eventId;
        const csrftoken = this.getCookie('csrftoken');

        if (!inputValue) {
            this.shakePasswordInput('Please enter a password');
            return;
        }

        // Show loading state
        this.elements.unlockButton.disabled = true;
        this.elements.unlockButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        fetch(`/validate-password/${eventId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ card_password: inputValue })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.unlocked = true;
                this.saveData({ unlocked: true });
                localStorage.removeItem('incorrectAttempts');

                this.elements.passwordInput.classList.add('success');
                this.showConfetti();
                this.showFeedback('Card unlocked successfully! 🎉', 'success');

                setTimeout(() => this.goToPage(2), 1000);
            } else {
                this.incorrectAttempts++;
                localStorage.setItem('incorrectAttempts', this.incorrectAttempts);

                if (this.incorrectAttempts >= 2 && this.elements.passwordHint) {
                    this.elements.passwordHint.classList.remove('hidden');
                }

                this.shakePasswordInput(data.error || 'Incorrect password');
            }
        })
        .catch(error => {
            console.error('Password validation error:', error);
            this.shakePasswordInput('An error occurred. Please try again.');
        })
        .finally(() => {
            // Reset button state
            this.elements.unlockButton.disabled = false;
            this.elements.unlockButton.innerHTML = '<i class="fas fa-unlock"></i> Unlock';
        });
    }

    shakePasswordInput(message) {
        if (!this.elements.passwordInput) return;

        this.elements.passwordInput.classList.add('error');
        this.elements.passwordInput.style.animation = 'shake 0.5s ease';

        if (message) {
            this.showFeedback(message, 'error');
        }

        setTimeout(() => {
            this.elements.passwordInput.style.animation = '';
            this.elements.passwordInput.classList.remove('error');
        }, 500);
    }

    revealPassword() {
        if (!this.elements.revealPassword || !this.elements.actualPassword) return;

        this.elements.revealPassword.textContent = this.elements.actualPassword.textContent;
        this.elements.revealPassword.classList.add('unblur');
        this.elements.revealPassword.style.pointerEvents = 'none';
    }

    // ===== SLIDER UNLOCK SYSTEM =====
    setupSliderUnlock() {
        if (!this.elements.sliderTrack || !this.elements.sliderThumb || !this.elements.yesButton) return;

        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let maxMove = 0;

        const updateMaxMove = () => {
            maxMove = this.elements.sliderTrack.offsetWidth - this.elements.sliderThumb.offsetWidth;
        };

        // Calculate initial max move
        updateMaxMove();

        // Recalculate on resize
        window.addEventListener('resize', updateMaxMove);

        const onDragStart = (e) => {
            isDragging = true;
            startX = (e.touches ? e.touches[0].clientX : e.clientX) - this.elements.sliderThumb.offsetLeft;

            this.elements.sliderThumb.style.cursor = 'grabbing';

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;

            e.preventDefault();
            currentX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
            currentX = Math.max(0, Math.min(currentX, maxMove));

            this.elements.sliderThumb.style.left = currentX + 'px';

            // Check if fully unlocked
            if (currentX >= maxMove - 5) {
                this.unlockYesButton();
            }
        };

        const onDragEnd = () => {
            if (!isDragging) return;

            // Snap back if not fully unlocked
            if (currentX < maxMove - 5) {
                this.elements.sliderThumb.style.left = '0px';
                currentX = 0;
            }

            isDragging = false;
            this.elements.sliderThumb.style.cursor = 'grab';

            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
        };

        // Mouse and touch events
        this.elements.sliderThumb.addEventListener('mousedown', onDragStart);
        this.elements.sliderThumb.addEventListener('touchstart', onDragStart, { passive: false });

        // Keyboard navigation
        this.elements.sliderThumb.addEventListener('keydown', (e) => {
            const step = 20;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                currentX = Math.min(currentX + step, maxMove);
                this.elements.sliderThumb.style.left = currentX + 'px';
                if (currentX >= maxMove - 5) this.unlockYesButton();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                currentX = Math.max(currentX - step, 0);
                this.elements.sliderThumb.style.left = currentX + 'px';
            }
        });

        // Yes button click
        if (this.elements.yesButton) {
            this.elements.yesButton.addEventListener('click', () => this.startCountdown());
        }
    }

    unlockYesButton() {
        if (!this.elements.sliderTrack || !this.elements.yesButton) return;

        this.elements.sliderTrack.classList.add('unlocked');

        setTimeout(() => {
            this.elements.sliderTrack.style.display = 'none';
            this.elements.yesButton.classList.remove('hidden');
            this.elements.yesButton.style.display = 'flex';
            this.elements.yesButton.focus();
        }, 300);
    }

    startCountdown() {
        const countdownElement = document.querySelector('.countdown');
        if (!countdownElement || !this.elements.yesButton) return;

        this.elements.yesButton.style.display = 'none';

        let count = 5;
        countdownElement.textContent = count;
        countdownElement.setAttribute('aria-live', 'assertive');

        const interval = setInterval(() => {
            count--;
            countdownElement.textContent = count;

            if (count <= 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';

                // Check for thread of memories or show milestone popup
                const hasThreadOfMemories = this.cardContainer.dataset.threadOfMemories === 'true';

                if (hasThreadOfMemories) {
                    this.showThreadOfMemories();
                } else {
                    this.showMilestonePopup();
                }
            }
        }, 1000);
    }

    // ===== THREAD OF MEMORIES =====
    showThreadOfMemories() {
        // Remove existing thread container
        const existingThread = document.querySelector('.thread-of-memories-container');
        if (existingThread) existingThread.remove();

        this.initializeThreadOfMemories();

        const threadContainer = document.querySelector('.thread-of-memories-container');
        if (threadContainer) {
            threadContainer.style.animation = 'fadeInUp 1s ease-out';
            this.showFeedback('✨ Your thread of memories is now active! Hover over the dots to explore.');
        }
    }

    initializeThreadOfMemories() {
        let memoriesData = [];

        try {
            const memoriesStr = this.cardContainer.dataset.memories || "[]";
            if (!memoriesStr || memoriesStr.trim() === '' || memoriesStr === 'null') {
                console.log('No memories data available');
                return;
            }
            memoriesData = JSON.parse(memoriesStr);
        } catch (e) {
            console.error('Invalid JSON in data-memories:', e);
            return;
        }

        if (!Array.isArray(memoriesData) || memoriesData.length < 2) {
            console.log('Not enough memories to display thread');
            return;
        }

        const page2 = document.querySelector('#page-2 .page-content');
        if (!page2) return;

        // Create thread container
        const threadContainer = document.createElement('div');
        threadContainer.className = 'thread-of-memories-container';

        // Create thread line
        const threadLine = document.createElement('div');
        threadLine.className = 'thread-line';
        threadContainer.appendChild(threadLine);

        // Add memory points
        memoriesData.forEach((memory, index) => {
            const memoryPoint = document.createElement('div');
            memoryPoint.className = 'memory-point';
            memoryPoint.style.left = `${10 + (index / Math.max(memoriesData.length - 1, 1)) * 80}%`;
            memoryPoint.setAttribute('tabindex', '0');
            memoryPoint.setAttribute('role', 'button');
            memoryPoint.setAttribute('aria-label', `Memory from ${memory.year}: ${memory.title}`);

            // Create popup
            const memoryPopup = document.createElement('div');
            memoryPopup.className = 'memory-popup hidden';
            memoryPopup.innerHTML = `
                <h4 class="popup-year">${memory.year || 'Memory'}</h4>
                <h3 class="popup-title">${memory.title || 'Special Moment'}</h3>
                <p class="popup-description">${memory.description || 'A cherished memory'}</p>
            `;

            // Event handlers
            const showPopup = () => {
                document.querySelectorAll('.memory-popup').forEach(popup => {
                    if (popup !== memoryPopup) {
                        popup.classList.add('hidden');
                        popup.style.opacity = '0';
                    }
                });
                memoryPopup.classList.remove('hidden');
                memoryPopup.style.opacity = '1';
            };

            const hidePopup = () => {
                memoryPopup.style.opacity = '0';
                setTimeout(() => memoryPopup.classList.add('hidden'), 300);
            };

            memoryPoint.addEventListener('mouseenter', showPopup);
            memoryPoint.addEventListener('mouseleave', hidePopup);
            memoryPoint.addEventListener('focus', showPopup);
            memoryPoint.addEventListener('blur', hidePopup);
            memoryPoint.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = memoryPopup.classList.contains('hidden');
                if (isHidden) showPopup();
                else hidePopup();
            });

            memoryPoint.appendChild(memoryPopup);
            threadContainer.appendChild(memoryPoint);
        });

        page2.appendChild(threadContainer);

        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.memory-point')) {
                document.querySelectorAll('.memory-popup').forEach(popup => {
                    popup.style.opacity = '0';
                    setTimeout(() => popup.classList.add('hidden'), 300);
                });
            }
        });
    }

    showMilestonePopup() {
        if (document.querySelector('.milestone-popup')) return;

        const eventId = this.cardContainer.dataset.eventId;
        const csrftoken = this.getCookie('csrftoken');

        fetch(`/get_event_highlights/${eventId}/`, {
            method: 'GET',
            headers: { 'X-CSRFToken': csrftoken }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch highlights');
            return response.json();
        })
        .then(data => {
            this.createMilestonePopup(data.highlights || 'No special milestones were added for this event.');
        })
        .catch(error => {
            console.error('Error fetching highlights:', error);
            this.createMilestonePopup('Unable to load milestones. Please try again later.');
        });
    }

    createMilestonePopup(content) {
        const popup = document.createElement('div');
        popup.className = 'milestone-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-labelledby', 'popup-title');
        popup.innerHTML = `
            <div class="milestone-popup-content">
                <h3 id="popup-title">Special Milestones</h3>
                <p>${content.replace(/\n/g, '<br>')}</p>
                <button class="close-popup" aria-label="Close popup">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;

        // Styling
        Object.assign(popup.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-heavy)',
            zIndex: '1000',
            maxWidth: '400px',
            textAlign: 'center',
            border: '2px solid var(--border-color)',
            animation: 'fadeInUp 0.3s ease-out'
        });

        document.body.appendChild(popup);
        popup.focus();

        // Close handler
        popup.querySelector('.close-popup').addEventListener('click', () => popup.remove());

        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                popup.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // ===== INTERACTIVE ELEMENTS =====
    setupInteractiveElements() {
        this.setupBirthdayCake();
        this.setupDanceButton();
        this.setupMemoryTree();
        this.setupMediaDisplays();
        this.setupAudioControls();
    }

    setupBirthdayCake() {
        if (!this.elements.birthdayCake || this.eventType !== 'birthday') return;

        this.elements.birthdayCake.addEventListener('click', () => {
            this.blowOutCandles();
        });

        this.elements.birthdayCake.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.blowOutCandles();
            }
        });
    }

    blowOutCandles() {
        if (this.elements.birthdayCake.classList.contains('blown-out')) return;

        this.elements.birthdayCake.classList.add('blown-out');

        // Add blow effect
        const blowEffect = document.createElement('div');
        blowEffect.className = 'blow-effect';
        blowEffect.textContent = '💨';
        blowEffect.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 2rem;
            animation: blowAway 1s ease-out forwards;
            pointer-events: none;
        `;
        this.elements.birthdayCake.appendChild(blowEffect);

        // Update instruction
        const instruction = document.querySelector('.cake-instruction');
        if (instruction) {
            instruction.textContent = 'Your wish has been made! 🌟';
        }

        // Show confetti and reveal audio/quote
        setTimeout(() => {
            this.showConfetti();
            this.revealAudioOrQuote();
            blowEffect.remove();
        }, 1000);

        // Add blow away animation
        if (!document.querySelector('#blow-away-animation')) {
            const style = document.createElement('style');
            style.id = 'blow-away-animation';
            style.textContent = `
                @keyframes blowAway {
                    0% { transform: translateX(-50%) scale(1); opacity: 1; }
                    100% { transform: translateX(-50%) translateY(-50px) scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupDanceButton() {
        if (!this.elements.danceButton || this.eventType !== 'anniversary') return;

        this.elements.danceButton.addEventListener('click', () => {
            this.startDanceAnimation();
        });
    }

    startDanceAnimation() {
        const danceAnimation = document.querySelector('.dance-animation');
        if (!danceAnimation) return;

        danceAnimation.innerHTML = '';
        danceAnimation.classList.add('active');

        // Create dancers
        const dancers = document.createElement('div');
        dancers.textContent = '💃 🕺';
        dancers.style.fontSize = '3rem';
        dancers.style.animation = 'bounce 2s infinite';

        // Create floating hearts
        const heartsContainer = document.createElement('div');
        heartsContainer.style.position = 'absolute';
        heartsContainer.style.width = '100%';
        heartsContainer.style.height = '100%';

        for (let i = 0; i < 15; i++) {
            const heart = document.createElement('span');
            heart.textContent = '❤️';
            heart.style.cssText = `
                position: absolute;
                left: ${Math.random() * 80 + 10}%;
                animation: float-up ${Math.random() * 2 + 2}s ease-out ${Math.random() * 3}s infinite;
                font-size: ${Math.random() * 10 + 15}px;
                opacity: ${Math.random() * 0.5 + 0.5};
            `;
            heartsContainer.appendChild(heart);
        }

        danceAnimation.appendChild(dancers);
        danceAnimation.appendChild(heartsContainer);

        this.elements.danceButton.textContent = 'Keep Dancing! 💃';

        // Reveal audio/quote after animation
        setTimeout(() => {
            this.revealAudioOrQuote();
        }, 2000);
    }

    setupMemoryTree() {
        if (!this.elements.memoryTree) return;

        // Load saved leaves
        if (this.savedData.leaves && Array.isArray(this.savedData.leaves)) {
            this.savedData.leaves.forEach(leaf => {
                this.createMemoryLeaf(leaf.x, leaf.y);
            });
        }

        this.elements.memoryTree.addEventListener('click', (e) => {
            this.addMemoryLeaf(e);
        });
    }

    addMemoryLeaf(event) {
        const rect = this.elements.memoryTree.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.createMemoryLeaf(x, y);

        // Save leaf position
        if (!this.savedData.leaves) this.savedData.leaves = [];
        this.savedData.leaves.push({ x, y });
        this.saveData();

        // Update instruction
        const instruction = document.querySelector('.tree-instruction');
        if (instruction && this.elements.memoryTree.children.length > 5) {
            instruction.textContent = 'Your tree is flourishing! 🌳';
        }

        // Reveal audio/quote after several clicks
        if (this.elements.memoryTree.children.length >= 3) {
            this.revealAudioOrQuote();
        }
    }

    createMemoryLeaf(x, y) {
        const leaf = document.createElement('div');
        leaf.className = 'memory-leaf';
        leaf.style.left = `${x}px`;
        leaf.style.top = `${y}px`;
        this.elements.memoryTree.appendChild(leaf);
    }

    // ===== MEDIA AND AUDIO =====
    setupMediaDisplays() {
        this.elements.mediaDisplays.forEach(display => {
            this.initializeMediaDisplay(display);
        });
    }

    initializeMediaDisplay(display) {
        const mediaUrls = display.dataset.mediaUrls
            ? display.dataset.mediaUrls.split(',').map(url => url.trim()).filter(url => url)
            : [];
        const fallbackUrl = display.dataset.fallbackUrl || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e';

        if (!mediaUrls.length) {
            mediaUrls.push(fallbackUrl);
        }

        display.innerHTML = '';
        const fragment = document.createDocumentFragment();

        mediaUrls.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = decodeURIComponent(url);
            img.alt = `Event media ${index + 1}`;
            img.className = 'media-image';
            img.loading = 'lazy';
            img.style.display = index === 0 ? 'block' : 'none';

            img.onerror = () => console.error(`Failed to load image: ${url}`);
            fragment.appendChild(img);
        });

        display.appendChild(fragment);

        // Setup slideshow if multiple images
        if (mediaUrls.length > 1) {
            this.setupSlideshow(display);
        }
    }

    setupSlideshow(display) {
        const images = display.querySelectorAll('.media-image');
        const container = display.parentElement;

        let currentIndex = 0;

        // Create controls
        const controls = document.createElement('div');
        controls.className = 'slideshow-controls';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'slideshow-btn prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.setAttribute('aria-label', 'Previous image');

        const nextBtn = document.createElement('button');
        nextBtn.className = 'slideshow-btn next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.setAttribute('aria-label', 'Next image');

        const indicators = document.createElement('div');
        indicators.className = 'slideshow-indicators';

        // Create indicators
        images.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = index === 0 ? 'indicator active' : 'indicator';
            dot.setAttribute('data-index', index);
            indicators.appendChild(dot);
        });

        const showSlide = (index) => {
            currentIndex = (index + images.length) % images.length;

            images.forEach((img, i) => {
                img.style.display = i === currentIndex ? 'block' : 'none';
            });

            indicators.querySelectorAll('.indicator').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        };

        // Event listeners
        prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
        nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));

        indicators.addEventListener('click', (e) => {
            if (e.target.classList.contains('indicator')) {
                showSlide(parseInt(e.target.dataset.index));
            }
        });

        // Touch/swipe support
        let touchStartX = 0;
        display.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        display.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchEndX - touchStartX;

            if (Math.abs(diff) > 50) {
                showSlide(currentIndex + (diff > 0 ? -1 : 1));
            }
        }, { passive: true });

        // Auto-advance
        let autoAdvance = setInterval(() => showSlide(currentIndex + 1), CONFIG.TIMEOUTS.SLIDESHOW);

        container.addEventListener('mouseenter', () => clearInterval(autoAdvance));
        container.addEventListener('mouseleave', () => {
            autoAdvance = setInterval(() => showSlide(currentIndex + 1), CONFIG.TIMEOUTS.SLIDESHOW);
        });

        // Append controls
        controls.appendChild(prevBtn);
        controls.appendChild(indicators);
        controls.appendChild(nextBtn);
        container.appendChild(controls);
    }

    setupAudioControls() {
        if (this.elements.audioControl && this.elements.calmingSound) {
            this.elements.audioControl.addEventListener('click', () => {
                this.toggleAudio(this.elements.calmingSound, this.elements.audioControl);
            });
        }
    }

    toggleAudio(audioElement, controlButton) {
        if (audioElement.paused) {
            audioElement.play().catch(e => {
                console.error('Audio playback failed:', e);
                this.showFeedback('Unable to play audio. Please check your browser settings.', 'error');
            });
            controlButton.innerHTML = '<i class="fas fa-pause"></i> Pause Sound';
        } else {
            audioElement.pause();
            controlButton.innerHTML = '<i class="fas fa-play"></i> Play Sound';
        }
    }

    revealAudioOrQuote() {
        const audioContainer = document.querySelector('.audio-player-container');
        const quoteContainer = document.querySelector('.fallback-quote');
        const audioUrl = this.cardContainer.dataset.audioUrl;

        if (audioUrl && audioUrl !== 'null' && audioContainer) {
            audioContainer.style.display = 'block';
            this.showFeedback('🎵 Click to listen to a special message!');
        } else if (quoteContainer) {
            quoteContainer.style.display = 'block';
            const quoteEl = quoteContainer.querySelector('.inspiration-quote');
            if (quoteEl) {
                const quotes = this.themes[this.eventType]?.quotes || this.themes.birthday.quotes;
                quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
            }
        }
    }

    // ===== VOICE NOTE =====
    setupVoiceNote() {
        if (!this.elements.playVoiceNote || !this.elements.voiceNoteText) return;

        this.elements.playVoiceNote.addEventListener('click', () => {
            const isHidden = this.elements.voiceNoteText.classList.contains('hidden');

            if (isHidden) {
                this.elements.voiceNoteText.classList.remove('hidden');
                this.elements.playVoiceNote.innerHTML = '<i class="fas fa-stop"></i> Hide Reflection';

                // Text-to-speech
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(this.elements.voiceNoteText.textContent);
                    speechSynthesis.speak(utterance);
                }
            } else {
                this.elements.voiceNoteText.classList.add('hidden');
                this.elements.playVoiceNote.innerHTML = '<i class="fas fa-microphone"></i> Play Reflection';

                if (window.speechSynthesis) {
                    speechSynthesis.cancel();
                }
            }
        });
    }

    // ===== SHARING SYSTEM =====
    setupSharing() {
        if (!this.elements.shareButton || !this.elements.shareModal) return;

        const sharePasswordInput = document.querySelector('#share-password');
        const generateLinkButton = document.querySelector('#generate-share-link');
        const closeModalButton = document.querySelector('#close-share-modal');
        const shareUrlContainer = document.querySelector('#share-url-container');

        this.elements.shareButton.addEventListener('click', () => {
            this.elements.shareModal.style.display = 'flex';
            sharePasswordInput.focus();
        });

        closeModalButton.addEventListener('click', () => {
            this.elements.shareModal.style.display = 'none';
            sharePasswordInput.value = '';
            shareUrlContainer.classList.add('hidden');
        });

        generateLinkButton.addEventListener('click', () => {
            this.generateShareLink(sharePasswordInput.value.trim());
        });

        // Close modal on escape or outside click
        this.elements.shareModal.addEventListener('click', (e) => {
            if (e.target === this.elements.shareModal) {
                closeModalButton.click();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.shareModal.style.display === 'flex') {
                closeModalButton.click();
            }
        });
    }

    generateShareLink(password) {
        if (!password) {
            this.showFeedback('Please enter a password for sharing.', 'error');
            return;
        }

        const eventId = this.elements.shareButton.dataset.eventId;
        const csrftoken = this.getCookie('csrftoken');

        fetch(`/share/generate/${eventId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                this.showFeedback(`Error: ${data.error}`, 'error');
                return;
            }

            const shareUrlContainer = document.querySelector('#share-url-container');
            const shareUrlElement = document.querySelector('#share-url');

            shareUrlElement.textContent = data.share_url;
            shareUrlContainer.classList.remove('hidden');

            // Update social links
            this.updateSocialLinks(data.share_url);

            if (data.warning) {
                this.showFeedback(data.warning, 'warning');
            } else {
                this.showFeedback('Share link generated successfully!', 'success');
            }
        })
        .catch(error => {
            console.error('Share link generation error:', error);
            this.showFeedback('Failed to generate share link.', 'error');
        });
    }

    updateSocialLinks(shareUrl) {
        const whatsappLink = document.querySelector('#whatsapp-share');
        const twitterLink = document.querySelector('#twitter-share');
        const emailLink = document.querySelector('#email-share');

        if (whatsappLink) {
            whatsappLink.href = `https://api.whatsapp.com/send?text=Check%20out%20my%20greeting%20card:%20${encodeURIComponent(shareUrl)}`;
        }

        if (twitterLink) {
            twitterLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=Check%20out%20my%20greeting%20card!`;
        }

        if (emailLink) {
            emailLink.href = `mailto:?subject=Greeting%20Card&body=Check%20out%20my%20greeting%20card:%20${encodeURIComponent(shareUrl)}`;
        }
    }

    // ===== PAGE INITIALIZATION =====
    initializePage(pageNum) {
        switch (pageNum) {
            case 1:
                this.initializeQuotes();
                break;
            case 2:
                if (this.eventType === 'birthday') {
                    this.setupSliderUnlock();
                }
                break;
            case 3:
                this.setupMediaDisplays();
                if (this.elements.calmingSound) {
                    this.elements.calmingSound.volume = 0.5;
                    this.elements.calmingSound.play().catch(e =>
                        console.log('Audio autoplay prevented:', e)
                    );
                }
                break;
            case 4:
                this.setupInteractiveElements();
                break;
            case 5:
                this.playFinalAnimation();
                break;
        }
    }

    initializeQuotes() {
        const quoteElements = document.querySelectorAll('.inspiration-quote');
        const quotes = this.themes[this.eventType]?.quotes || this.themes.birthday.quotes;

        quoteElements.forEach(quoteEl => {
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteEl.textContent = randomQuote;
        });
    }

    // ===== ANIMATIONS =====
    showConfetti() {
        const colors = this.themes[this.eventType]?.confettiColors || this.themes.birthday.confettiColors;
        const container = this.cardContainer;

        const confettiPieces = [];
        const confettiCount = Math.min(50, window.innerWidth / 20);

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: absolute;
                left: ${Math.random() * 100}%;
                top: -20px;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 1000;
                pointer-events: none;
            `;

            container.appendChild(confetti);
            confettiPieces.push(confetti);
        }

        // Remove confetti after animation
        setTimeout(() => {
            confettiPieces.forEach(piece => {
                if (piece.parentNode) {
                    piece.parentNode.removeChild(piece);
                }
            });
        }, CONFIG.TIMEOUTS.CONFETTI);
    }

    playFinalAnimation() {
        const finalAnimation = document.querySelector('.final-animation');
        if (!finalAnimation) return;

        finalAnimation.innerHTML = '';

        let animationElements = [];

        if (this.eventType === 'birthday') {
            animationElements = this.createBirthdayAnimation();
        } else if (this.eventType === 'anniversary') {
            animationElements = this.createAnniversaryAnimation();
        } else {
            animationElements = this.createGenericAnimation();
        }

        const fragment = document.createDocumentFragment();
        animationElements.forEach(el => fragment.appendChild(el));
        finalAnimation.appendChild(fragment);

        // Clean up after animation
        setTimeout(() => {
            animationElements.forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }, 10000);
    }

    createBirthdayAnimation() {
        const elements = [];

        // Balloons
        for (let i = 0; i < 8; i++) {
            const balloon = document.createElement('div');
            balloon.innerHTML = '🎈';
            balloon.style.cssText = `
                position: absolute;
                left: ${Math.random() * 80 + 10}%;
                font-size: ${Math.random() * 20 + 20}px;
                animation: float-up ${Math.random() * 3 + 4}s ease-out ${Math.random() * 2}s infinite;
                pointer-events: none;
            `;
            elements.push(balloon);
        }

        // Gifts
        for (let i = 0; i < 4; i++) {
            const gift = document.createElement('div');
            gift.innerHTML = '🎁';
            gift.style.cssText = `
                position: absolute;
                left: ${Math.random() * 80 + 10}%;
                font-size: ${Math.random() * 15 + 25}px;
                animation: bounce ${Math.random() * 2 + 2}s ease-in-out ${Math.random() * 2}s infinite;
                pointer-events: none;
            `;
            elements.push(gift);
        }

        return elements;
    }

    createAnniversaryAnimation() {
        const elements = [];

        // Hearts
        for (let i = 0; i < 12; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = ['❤️', '💖', '💘', '💕', '💗'][Math.floor(Math.random() * 5)];
            heart.style.cssText = `
                position: absolute;
                left: ${Math.random() * 80 + 10}%;
                font-size: ${Math.random() * 15 + 20}px;
                animation: float-up ${Math.random() * 3 + 3}s ease-out ${Math.random() * 3}s infinite;
                pointer-events: none;
            `;
            elements.push(heart);
        }

        // Rings
        const rings = document.createElement('div');
        rings.innerHTML = '💍 💍';
        rings.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            animation: pulse 2s ease-in-out infinite;
            pointer-events: none;
        `;
        elements.push(rings);

        return elements;
    }

    createGenericAnimation() {
        const elements = [];

        // Stars
        for (let i = 0; i < 15; i++) {
            const star = document.createElement('div');
            star.innerHTML = ['✨', '🌟', '⭐', '💫', '🌠'][Math.floor(Math.random() * 5)];
            star.style.cssText = `
                position: absolute;
                left: ${Math.random() * 80 + 10}%;
                font-size: ${Math.random() * 15 + 18}px;
                animation: twinkle ${Math.random() * 2 + 2}s ease-in-out ${Math.random() * 2}s infinite alternate;
                pointer-events: none;
            `;
            elements.push(star);
        }

        return elements;
    }

    // ===== UTILITY FUNCTIONS =====
    initializeCard() {
        // Extract card data
        this.eventType = this.cardContainer.dataset.theme || 'birthday';

        // Load saved state
        if (this.savedData.unlocked || document.querySelector('.card-page.active')?.id !== 'page-1') {
            this.unlocked = true;
            this.goToPage(this.savedData.lastPage || 2);
        }

        // Check for password attempts
        this.incorrectAttempts = parseInt(localStorage.getItem('incorrectAttempts') || '0');
        if (this.incorrectAttempts >= 2 && this.elements.passwordHint) {
            this.elements.passwordHint.classList.remove('hidden');
        }

        // Initialize quotes
        this.initializeQuotes();
    }

    handleKeyboardNavigation(e) {
        // Arrow key navigation
        if (e.key === 'ArrowLeft' && this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        } else if (e.key === 'ArrowRight' && this.currentPage < this.totalPages) {
            if (this.currentPage === 1 && !this.unlocked) return;
            this.goToPage(this.currentPage + 1);
        }

        // Number key navigation
        const pageNum = parseInt(e.key);
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            if (pageNum === 1 || this.unlocked || pageNum <= this.currentPage + 1) {
                this.goToPage(pageNum);
            }
        }
    }

    getSavedData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {
                leaves: [],
                unlocked: false,
                lastVisited: Date.now(),
                lastPage: 1
            };
        } catch (e) {
            console.error('Error parsing saved card data:', e);
            return {
                leaves: [],
                unlocked: false,
                lastVisited: Date.now(),
                lastPage: 1
            };
        }
    }

    saveData(data = {}) {
        try {
            this.savedData = { ...this.savedData, ...data, lastVisited: Date.now() };
            localStorage.setItem(this.storageKey, JSON.stringify(this.savedData));
            return true;
        } catch (e) {
            console.error('Error saving card data:', e);
            return false;
        }
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    showFeedback(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.feedback-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `feedback-toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('role', 'alert');

        // Style based on type
        const colors = {
            success: 'var(--accent-primary)',
            error: '#ef4444',
            warning: '#f59e0b',
            info: 'var(--text-primary)'
        };

        toast.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Animate out
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TIMEOUTS.FEEDBACK);
    }

    // ===== PUBLIC API =====
    unlock() {
        this.unlocked = true;
        this.saveData({ unlocked: true });
        this.updateNavigationState();
    }

    lock() {
        this.unlocked = false;
        this.saveData({ unlocked: false });
        this.updateNavigationState();
        this.goToPage(1);
    }

    reset() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('incorrectAttempts');
        location.reload();
    }

    // ===== ERROR HANDLING =====
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        this.showFeedback(`An error occurred in ${context}. Please try again.`, 'error');
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize the greeting card application
        window.greetingCard = new GreetingCardApp();

        // Add global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            if (window.greetingCard) {
                window.greetingCard.showFeedback('An unexpected error occurred.', 'error');
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            if (window.greetingCard) {
                window.greetingCard.showFeedback('A network error occurred.', 'error');
            }
        });

        console.log('Greeting card application loaded successfully');

    } catch (error) {
        console.error('Failed to initialize greeting card:', error);

        // Fallback error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #fee2e2;
            color: #dc2626;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            text-align: center;
            max-width: 400px;
            border: 1px solid #fecaca;
        `;
        errorDiv.textContent = 'Failed to load the greeting card. Please refresh the page.';
        document.body.appendChild(errorDiv);
    }
});

// ===== PERFORMANCE MONITORING =====
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`Card loaded in ${Math.round(perfData.loadEventEnd - perfData.loadEventStart)}ms`);
            }
        }, 0);
    });
}

// ===== EXPORT FOR TESTING =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GreetingCardApp;
}