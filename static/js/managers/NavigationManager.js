/**
 * NavigationManager — manages page navigation, transitions, and page initialization.
 * Extracted from greeting_card.js.
 */

class NavigationManager {
    constructor(app) {
        this.app = app;
    }

    get currentPage() { return this.app.currentPage; }
    set currentPage(v) { this.app.currentPage = v; }

    get totalPages() { return this.app.totalPages; }
    get elements() { return this.app.elements; }
    get unlocked() { return this.app.unlocked; }
    get eventType() { return this.app.eventType; }
    get cardContainer() { return this.app.cardContainer; }
    get audioManager() { return this.app.audioManager; }
    get themes() { return this.app.themes; }

    setupNavigation() {
        this.updateNavigationState();
    }

    goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages) return;

        const previousPage = this.currentPage;

        // Enforce birthday ceremony flow: only current/next page navigation.
        if (this.eventType === 'birthday' && previousPage && pageNum > previousPage + 1) {
            this.app.showFeedback?.('Follow the birthday ceremony step by step.', 'info');
            return;
        }

        // Check if page is unlocked
        if (pageNum > 1 && !this.unlocked) {
            this.app.shakePasswordInput('Please unlock the card first');
            return;
        }

        if (this.eventType !== 'birthday' && Math.abs(pageNum - this.currentPage) >= 1 && this.currentPage !== 0) {
            this.audioManager.playPageTransition();
        }

        // Give event modules (and core) a chance to clean up loops/streams.
        if (previousPage && previousPage !== pageNum) {
            const eventModule = this.app.getEventModule();
            try {
                eventModule?.onPageLeave?.(previousPage, this.app);
            } catch (e) {
                console.warn('Error in eventModule.onPageLeave:', e);
            }

            // Core cleanup for known looping media
            if (previousPage === 3 && this.elements.calmingSound) {
                this.elements.calmingSound.pause();
                this.elements.calmingSound.currentTime = 0;
            }
        }

        this.currentPage = pageNum;
        this.app.saveData({ lastPage: this.currentPage });

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
            const isAccessible = this.eventType === 'birthday'
                ? pageNum <= this.currentPage + 1
                : (pageNum <= this.currentPage + 1 || this.unlocked);

            item.classList.toggle('active', isActive);
            item.style.opacity = isAccessible ? '1' : '0.5';
            item.style.pointerEvents = isAccessible ? 'auto' : 'none';
            item.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    initializePage(pageNum) {
        const eventModule = this.app.getEventModule();
        switch (pageNum) {
            case 1:
                this.initializeQuotes();
                if (eventModule?.onPageEnter) eventModule.onPageEnter(1, this.app);
                break;
            case 2:
                if (eventModule?.onPageEnter) eventModule.onPageEnter(2, this.app);
                break;
            case 3:
                this.app.setupMediaDisplays();
                // Birthday handles its own audio via the in-page control; skip auto-play
                // to avoid audio starting while the user is looking at a different tab.
                if (this.eventType !== 'birthday' && this.elements.calmingSound) {
                    this.elements.calmingSound.volume = 0.5;
                    this.elements.calmingSound.play().catch(e =>
                        console.log('Audio autoplay prevented:', e)
                    );
                }
                if (eventModule?.onPageEnter) eventModule.onPageEnter(3, this.app);
                break;
            case 4:
                this.app.setupInteractiveElements();
                if (eventModule?.onPageEnter) eventModule.onPageEnter(4, this.app);
                break;
            case 5:
                this.app.playFinalAnimation();
                if (eventModule?.onPageEnter) eventModule.onPageEnter(5, this.app);
                break;
        }
    }

    initializeQuotes() {
        const quoteElements = document.querySelectorAll('.inspiration-quote');
        const quotes = this.themes[this.eventType]?.quotes || this.themes.birthday.quotes;

        quoteElements.forEach(quoteEl => {
            quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        });
    }
}

window.NavigationManager = NavigationManager;
