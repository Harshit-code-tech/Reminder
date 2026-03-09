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
        this.animationInProgress = false;
        this.themeManager = new ThemeManager(this);
        this.themes = this.themeManager.themes;
        this.elements = {};
        this.storageKey = '';
        this.savedData = {};
        // Detect event type early so AudioManager can use it
        const tempContainer = document.querySelector('.card-container');
        const detectedType = tempContainer ? (tempContainer.dataset.theme || 'birthday') : 'birthday';
        this.audioManager = new AudioManager(detectedType);
        this.effectManager = new EffectManager(this);
        this.mediaManager = new MediaManager(this);
        this.navigationManager = new NavigationManager(this);
        this.unlockManager = new UnlockManager(this);
        this.sharingManager = new SharingManager(this);
        this.interactionManager = new InteractionManager(this);
        this.lastPage = 1;
        this.init();
    }

    // ===== INITIALIZATION =====
    init() {
        try {
            this.cardContainer = document.querySelector('.card-container');
            if (!this.cardContainer) {
                throw new Error('Card container not found');
            }
            this.eventType = this.cardContainer.dataset.theme || 'birthday';

            // Fire event module early initialization (e.g. raksha loading screen)
            const initEventModule = this.getEventModule();
            if (initEventModule?.initialize) initEventModule.initialize(this);

            this.cacheElements();
            this.setupEventListeners();
            this.initializeCard();
            this.themeManager.setupThemeSystem();
            this.setupNavigation();
            this.initializeBackgroundEffects();

            setTimeout(() => {
                this.audioManager.setupUserInteractionAudio();
            }, 1000);
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

    // ===== EVENT MODULE API =====
    getEventModule() {
        return (window.EventModules && window.EventModules[this.eventType]) || null;
    }

    // ===== THEME MANAGER DELEGATORS =====
    initializeThemes() { return this.themeManager.initializeThemes(); }
    setupThemeSystem() { return this.themeManager.setupThemeSystem(); }
    setTheme(theme) { return this.themeManager.setTheme(theme); }


    // ===== EFFECT MANAGER DELEGATORS (background effects) =====
    initializeRakhiLoadingScreen() {
        return this.effectManager.initializeRakhiLoadingScreen();
    }

    createFloatingPetals() {
        return this.effectManager.createFloatingPetals();
    }

    initializeBackgroundEffects() {
        return this.effectManager.initializeBackgroundEffects();
    }

    createStars() {
        return this.effectManager.createStars();
    }

    createClouds() {
        return this.effectManager.createClouds();
    }

    updateBackgroundEffects(theme) {
        return this.effectManager.updateBackgroundEffects(theme);
    }

    // ===== NAVIGATION MANAGER DELEGATORS =====
    setupNavigation() { return this.navigationManager.setupNavigation(); }
    goToPage(pageNum) { return this.navigationManager.goToPage(pageNum); }
    updateNavigationState() { return this.navigationManager.updateNavigationState(); }

    // ===== UNLOCK MANAGER DELEGATORS =====
    validatePassword() { return this.unlockManager.validatePassword(); }
    shakePasswordInput(message) { return this.unlockManager.shakePasswordInput(message); }
    revealPassword() { return this.unlockManager.revealPassword(); }

    // ===== INTERACTION MANAGER DELEGATORS (memory thread) =====
    initializeMemoryThread() { return this.interactionManager.initializeMemoryThread(); }
    showMemoryPopup(point, popup) { return this.interactionManager.showMemoryPopup(point, popup); }
    hideMemoryPopup(popup) { return this.interactionManager.hideMemoryPopup(popup); }

    // DEAD CODE REMOVED: setupRakhiSVGCeremony and related methods were duplicates
    // of the card_raksha_bandhan.js mixin which overrides them on the prototype.


    // ===== UNLOCK MANAGER DELEGATORS (slider) =====
    setupSliderUnlock() { return this.unlockManager.setupSliderUnlock(); }
    unlockYesButton() { return this.unlockManager.unlockYesButton(); }
    startCountdown() { return this.unlockManager.startCountdown(); }

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
            this.getEventModule()?.onMemoryPopupCreate?.(memoryPopup, this);
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
                this.getEventModule()?.onMemoryPopupShow?.(this);
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

        fetch(`/reminders/api/event/${eventId}/highlights/`, {
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

    // Loading Screen Blessing

    initializeBlessingRain() {
        return this.effectManager.initializeBlessingRain();
    }
    // ===== INTERACTION MANAGER DELEGATORS =====
    setupPage4()          { return this.interactionManager.setupPage4(); }
    setupInteractiveElements() { return this.interactionManager.setupInteractiveElements(); }
    addDecorativeLeaves(container)              { return this.interactionManager.addDecorativeLeaves(container); }
    setupBlessingShower()                       { return this.interactionManager.setupBlessingShower(); }
    createBlessingParticles(blessingShower)     { return this.interactionManager.createBlessingParticles(blessingShower); }
    setupMemoryTree()                           { return this.interactionManager.setupMemoryTree(); }
    addMemoryLeaf(event)                        { return this.interactionManager.addMemoryLeaf(event); }
    createMemoryLeaf(x, y)                      { return this.interactionManager.createMemoryLeaf(x, y); }
    // Ceremony stubs — actual logic lives in each EventModule.onPageEnter(4)
    setupRakhiBlessings() {}
    setupPromiseTree()    {}
    setupDiyaCeremony()   {}
    setupBirthdayCake()   {}
    blowOutCandles()      {}
    setupDanceButton()    {}
    startDanceAnimation() {}

    // ===== PAGE-SPECIFIC STUBS (overridden by event modules) =====
    // These no-ops prevent errors when a module hasn't loaded.
    setupBirthdayPage2() {}
    setupBirthdayPage5() {}
    revealBirthdaySurprise() {}
    revealBirthdayWish() {}
    setupAnniversaryPage2() {}
    setupAnniversaryPage5() {}
    setupLoveLetter() {}
    setupLoveCounter() {}
    animateHeartTimeline() {}
    animateIntertwinedHearts() {}
    animatePromiseRings() {}
    setupOtherPage2() {}
    setupOtherPage5() {}
    setupQuoteReveal() {}
    setupMagicReveal() {}
    setupWishJar() {}
    animateFarewellStars() {}

    // ===== MEDIA MANAGER DELEGATORS =====
    setupMediaDisplays() {
        return this.mediaManager.setupMediaDisplays();
    }

    initializeMediaDisplay(display) {
        return this.mediaManager.initializeMediaDisplay(display);
    }

    addTraditionalFrame(display) {
        return this.mediaManager.addTraditionalFrame(display);
    }

    showImageModal(imageSrc, imageAlt) {
        return this.mediaManager.showImageModal(imageSrc, imageAlt);
    }

    hideImageModal() {
        return this.mediaManager.hideImageModal();
    }

    setupSlideshow(display) {
        return this.mediaManager.setupSlideshow(display);
    }

    setupAudioControls() {
        return this.mediaManager.setupAudioControls();
    }

    toggleAudio(audioElement, controlButton) {
        return this.mediaManager.toggleAudio(audioElement, controlButton);
    }

    revealAudioOrQuote() {
        return this.mediaManager.revealAudioOrQuote();
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

    // ===== SHARING MANAGER DELEGATORS =====
    setupSharing() { return this.sharingManager.setupSharing(); }
    generateShareLink(password) { return this.sharingManager.generateShareLink(password); }
    updateSocialLinks(shareUrl) { return this.sharingManager.updateSocialLinks(shareUrl); }

    // ===== NAVIGATION MANAGER DELEGATORS (page init) =====
    initializePage(pageNum) { return this.navigationManager.initializePage(pageNum); }
    initializeQuotes() { return this.navigationManager.initializeQuotes(); }

    // ===== EFFECT MANAGER DELEGATORS (animations) =====
    showConfetti() {
        return this.effectManager.showConfetti();
    }

    playFinalAnimation() {
        return this.effectManager.playFinalAnimation();
    }

    createRakhiAnimation() {
        return this.effectManager.createRakhiAnimation();
    }

    createBirthdayAnimation() {
        return this.effectManager.createBirthdayAnimation();
    }

    createAnniversaryAnimation() {
        return this.effectManager.createAnniversaryAnimation();
    }

    createGenericAnimation() {
        return this.effectManager.createGenericAnimation();
    }

    // ===== UTILITY FUNCTIONS =====
    initializeCard() {
        // Extract card data
        this.eventType = this.cardContainer.dataset.theme || 'birthday';

        // Hydrate birthday ceremony state from server-rendered dataset.
        // Local state still takes precedence when present.
        if (this.eventType === 'birthday') {
            const ds = this.cardContainer.dataset;
            const unwrapStepRaw = Number.parseInt(ds.birthdayUnwrapStep || '0', 10);
            const backendUnwrapStep = Number.isNaN(unwrapStepRaw) ? 0 : Math.max(0, Math.min(3, unwrapStepRaw));
            const backendState = {
                birthday_page1_seen: ds.birthdayPage1Seen === 'true',
                birthday_unwrap_step: backendUnwrapStep,
                birthday_page2_completed: ds.birthdayPage2Completed === 'true',
                birthday_page4_wish_made: ds.birthdayPage4WishMade === 'true',
                birthday_page5_seen: ds.birthdayPage5Seen === 'true'
            };
            const localUnwrapStepRaw = Number.parseInt(String(this.savedData.birthday_unwrap_step ?? ''), 10);
            const localUnwrapStep = Number.isNaN(localUnwrapStepRaw) ? backendState.birthday_unwrap_step : localUnwrapStepRaw;

            this.savedData = {
                ...backendState,
                ...this.savedData,
                birthday_page1_seen: Boolean(this.savedData.birthday_page1_seen || backendState.birthday_page1_seen),
                birthday_unwrap_step: Math.max(0, Math.min(3, localUnwrapStep)),
                birthday_page2_completed: Boolean(this.savedData.birthday_page2_completed || backendState.birthday_page2_completed),
                birthday_page4_wish_made: Boolean(this.savedData.birthday_page4_wish_made || backendState.birthday_page4_wish_made),
                birthday_page5_seen: Boolean(this.savedData.birthday_page5_seen || backendState.birthday_page5_seen)
            };

            localStorage.setItem(this.storageKey, JSON.stringify(this.savedData));
        }

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

        // Initialize page 1 explicitly
        this.initializePage(1);
    }

    closeAllRakhiPopups() {
        const giftPopup = document.getElementById('gift-popup');
        const rakhiContainer = document.getElementById('beautiful-rakhi');

        if (giftPopup && giftPopup.classList.contains('show')) {
            this.closeRakhiGiftPopup();
        } else if (rakhiContainer && rakhiContainer.classList.contains('show')) {
            this.closeRakhiDisplay();
        }
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

    async saveBackendData(data = {}) {
        const eventId = this.cardContainer ? this.cardContainer.dataset.eventId : null;
        if (!eventId) return;
        try {
            const response = await fetch(`/api/event/${eventId}/update-state/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) console.error("Failed to sync backend state");
        } catch (e) {
            console.error("Error syncing backend state:", e);
        }
    }

    saveData(data = {}) {
        try {
            this.savedData = { ...this.savedData, ...data, lastVisited: Date.now() };
            localStorage.setItem(this.storageKey, JSON.stringify(this.savedData));
            
            // Sync birthday ceremony progression keys to backend.
            const backendKeys = [
                'birthday_page1_seen',
                'birthday_unwrap_step',
                'birthday_page2_completed',
                'birthday_page4_wish_made',
                'birthday_page5_seen'
            ];
            if (Object.keys(data).some(key => backendKeys.includes(key))) {
                this.saveBackendData(data);
            }
            
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
        return this.effectManager.showFeedback(message, type);
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

function positionCornerDiyas() {
    const diyaPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    diyaPositions.forEach(position => {
        const diya = document.querySelector(`.rakhi-diya.${position}`);
        if (diya) {
            diya.style.position = 'absolute';
            if (position.includes('top')) diya.style.top = '10px';
            if (position.includes('bottom')) diya.style.bottom = '10px';
            if (position.includes('left')) diya.style.left = '10px';
            if (position.includes('right')) diya.style.right = '10px';
        }
    });
}

function glowrangoli(){

    // Target all page content divs
      const allPages = document.querySelectorAll('.card-page .page-content');

      allPages.forEach(page => {
        // Check if this page already has rangoli
        if (!page.querySelector('.rakhi-rangoli-container')) {
          // Create rangoli container
          const rangoliContainer = document.createElement('div');
          rangoliContainer.className = 'rakhi-rangoli-container';
          rangoliContainer.innerHTML = `
            <div class="rakhi-rangoli top-left-rangoli"></div>
            <div class="rakhi-rangoli top-right-rangoli"></div>
            <div class="rakhi-rangoli bottom-left-rangoli"></div>
            <div class="rakhi-rangoli bottom-right-rangoli"></div>
          `;

          // Add to page
          page.appendChild(rangoliContainer);

          // Apply random rotation to each rangoli
          const rangolis = rangoliContainer.querySelectorAll('.rakhi-rangoli');
          rangolis.forEach(el => {
            const angle = Math.floor(Math.random() * 360);
            el.style.transform = `rotate(${angle}deg)`;
          });
        }
      });

      // Apply fabric background to body if not already applied
      document.body.classList.add('fabric-bg');
}

function initPage1Decor() {
    const page1 = document.querySelector('#page-1 .page-content');
    if (!page1) return;



    // Marigold Garland
    const garland = document.createElement('div');
    garland.className = 'marigold-garland';
    garland.innerHTML = '🌼🌼🌼🌼🌼🌼🌼🌼🌼🌼🌼';

    // Append to page
    page1.insertBefore(garland, page1.firstChild);

}


// ===== APPLY EVENT-SPECIFIC MIXINS =====
// Module files loaded after this script set window._*Mixin objects.
// Apply them to the prototype before DOMContentLoaded creates the instance.
function _applyPendingMixins() {
    // Prototype mutation replaced by EventModule API.
    // Event modules now register on window.EventModules[eventType] instead of modifying the prototype.
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Apply any event-specific mixins before creating the instance
        _applyPendingMixins();
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
    positionCornerDiyas();
    initPage1Decor();

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