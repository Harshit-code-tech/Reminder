// Event Listener for DOM Content Loaded
// Initializes the greeting card application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {


    // Get event type from card container
    const cardContainer = document.querySelector('.card-container');
    const hasThreadOfMemories = cardContainer && cardContainer.dataset.threadOfMemories === 'true';
    if (hasThreadOfMemories) {
        initializeThreadOfMemories();
    }

    /**
     * Initialize the Thread of Memories visualization
     */
    function initializeThreadOfMemories() {
        let memoriesData = [];
        try {
            const memoriesStr = cardContainer.dataset.memories || "[]";
            console.log('Attempting to parse JSON:', memoriesStr);
            memoriesData = JSON.parse(memoriesStr);
            console.log('Parsed memories data:', memoriesData);
        } catch (e) {
            console.error('Invalid JSON in data-memories:', e);
            return;
        }

        if (!Array.isArray(memoriesData) || memoriesData.length < 2) {
            console.log('Not enough memories to display thread');
            return;
        }

        // Create the thread container
        const threadContainer = document.createElement('div');
        threadContainer.className = 'thread-of-memories-container';

        // Create the thread line
        const threadLine = document.createElement('div');
        threadLine.className = 'thread-line';
        threadContainer.appendChild(threadLine);

        // Add memory points along the thread
        memoriesData.forEach((memory, index) => {
            const memoryPoint = document.createElement('div');
            memoryPoint.className = 'memory-point';
            memoryPoint.style.left = `${(index / (memoriesData.length - 1)) * 100}%`;

            // Create popup for each memory
            const memoryPopup = document.createElement('div');
            memoryPopup.className = 'memory-popup hidden';
            memoryPopup.innerHTML = `
                <h4>${memory.year || ''}</h4>
                <h3>${memory.title || 'Memory'}</h3>
                <p>${memory.description || ''}</p>
            `;

            // Toggle popup on hover/click
            memoryPoint.addEventListener('mouseenter', () => {
                memoryPopup.classList.remove('hidden');
            });

            memoryPoint.addEventListener('mouseleave', () => {
                memoryPopup.classList.add('hidden');
            });

            // For mobile support
            memoryPoint.addEventListener('click', () => {
                document.querySelectorAll('.memory-popup').forEach(popup => {
                    if (popup !== memoryPopup) {
                        popup.classList.add('hidden');
                    }
                });
                memoryPopup.classList.toggle('hidden');
            });

            memoryPoint.appendChild(memoryPopup);
            threadContainer.appendChild(memoryPoint);
        });

        // Add thread container to the card
        const memoryPage = document.querySelector('.card-page[data-memory-page="true"]');
        if (memoryPage) {
            memoryPage.appendChild(threadContainer);
        } else {
            // Fallback to adding it to the third page
            const thirdPage = document.querySelector('#page-3');
            if (thirdPage) {
                thirdPage.appendChild(threadContainer);
            }
        }
    }


    const eventType = cardContainer ? cardContainer.classList[1].replace('event-', '') : 'birthday';
    console.log('Event type detected:', eventType);

    // Apply event-specific initializations
    initializeEventSpecificBehavior(eventType);

    function initializeEventSpecificBehavior(eventType) {
        console.log('Initializing event-specific behavior for:', eventType);

        // Common elements that might need event-specific styling
        const pageIndicators = document.querySelectorAll('.indicator');
        const navButtons = document.querySelectorAll('.nav-button');
        const pageTitles = document.querySelectorAll('.page-title');

        // Event-specific animations and effects
        switch(eventType) {
            case 'birthday':
                // Add birthday-specific animations
                addFloatingBalloons();
                enhanceBirthdayCake();
                break;

            case 'anniversary':
                // Add anniversary-specific animations
                addFloatingHearts();
                enhanceAnniversaryElements();
                break;



            case 'other':
                // Add generic animations for other event types
                addGenericAnimations();
                break;

            default:
                console.log('No specific behavior for event type:', eventType);
        }
    }

    /**
     * Add floating balloon animations for birthday events
     */
    function addFloatingBalloons() {
        const container = document.querySelector('.card-container');
        if (!container) return;

        // Create balloon elements
        for (let i = 0; i < 5; i++) {
            const balloon = document.createElement('div');
            balloon.className = 'floating-balloon';
            balloon.style.left = `${Math.random() * 90}%`;
            balloon.style.animationDelay = `${Math.random() * 5}s`;
            balloon.style.backgroundColor = getRandomBalloonColor();
            container.appendChild(balloon);
        }
    }

    /**
     * Get a random balloon color
     * @returns {string} A random color for balloons
     */
    function getRandomBalloonColor() {
        const colors = ['#ff6b6b', '#ffa5a5', '#ffd166', '#06d6a0', '#118ab2'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Enhance the birthday cake with additional animations
     */
    function enhanceBirthdayCake() {
        const cake = document.querySelector('.birthday-cake');
        if (!cake) return;

        cake.classList.add('enhanced');

        // Add glow effect to candles
        const candles = document.createElement('div');
        candles.className = 'cake-candles';
        cake.appendChild(candles);
    }

    /**
     * Add floating heart animations for anniversary events
     */
    function addFloatingHearts() {
        const container = document.querySelector('.card-container');
        if (!container) return;

        // Create heart elements
        for (let i = 0; i < 7; i++) {
            const heart = document.createElement('div');
            heart.className = 'floating-heart';
            heart.style.left = `${Math.random() * 90}%`;
            heart.style.animationDelay = `${Math.random() * 5}s`;
            heart.innerHTML = '❤️';
            heart.style.opacity = 0.7;
            container.appendChild(heart);
        }
    }

    /**
     * Enhance anniversary-specific elements
     */
    function enhanceAnniversaryElements() {
        const danceContainer = document.querySelector('.dance-container');
        if (!danceContainer) return;

        danceContainer.classList.add('enhanced');

        // Add special effects to dance button
        const danceButton = danceContainer.querySelector('.dance-button');
        if (danceButton) {
            danceButton.classList.add('glowing');
        }
    }


    /**
     * Add generic animations for other event types
     */
    function addGenericAnimations() {
        const container = document.querySelector('.card-container');
        if (!container) return;

        // Create generic decorative elements
        for (let i = 0; i < 5; i++) {
            const decoration = document.createElement('div');
            decoration.className = 'generic-decoration';
            decoration.style.left = `${Math.random() * 90}%`;
            decoration.style.top = `${Math.random() * 90}%`;
            decoration.style.animationDelay = `${Math.random() * 5}s`;
            decoration.innerHTML = '✨';
            container.appendChild(decoration);
        }
    }

    // Utility Function: Get Cookie Value
    // Retrieves a specific cookie by name from document.cookie
    function getCookie(name) {
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

    // Initialize Active Page
    // Sets the initial active page to visible and logs its status
    try {
        const activePage = document.querySelector('.card-page.active');
        if (activePage) {
            activePage.style.display = 'block';
            console.log('Active page set to visible:', activePage.id);
        } else {
            console.warn('No active page found');
        }
    } catch (e) {
        console.error('Error initializing greeting card:', e);
    }

    // Password Hint and Reveal Logic
    // Tracks incorrect attempts and handles password reveal
    const passwordForm = document.querySelector('.password-container form');
    const passwordHint = document.querySelector('#password-hint');
    const revealPassword = document.querySelector('#reveal-password');
    const actualPassword = document.querySelector('#actual-password');
    const errorMessage = document.querySelector('.error-message');
    let incorrectAttempts = parseInt(localStorage.getItem('incorrectAttempts') || '0');

    // Check for error message on page load and increment attempts
    if (errorMessage && errorMessage.textContent.trim()) {
        incorrectAttempts++;
        localStorage.setItem('incorrectAttempts', incorrectAttempts);
        if (incorrectAttempts >= 1 && passwordHint) {
            passwordHint.style.display = 'block';
        }
    }

    // Handle form submission to track attempts
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            // Increment attempts before submission
            incorrectAttempts++;
            localStorage.setItem('incorrectAttempts', incorrectAttempts);
        });
    }

    // Handle click to reveal password
    if (revealPassword && actualPassword) {
        revealPassword.addEventListener('click', () => {
            revealPassword.textContent = actualPassword.textContent;
            revealPassword.classList.add('unblur');
            revealPassword.setAttribute('aria-label', 'Password revealed');
        });

        // Allow keyboard activation for accessibility
        revealPassword.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                revealPassword.textContent = actualPassword.textContent;
                revealPassword.classList.add('unblur');
                revealPassword.setAttribute('aria-label', 'Password revealed');
            }
        });
    }

    // Enhanced Configuration with Themes and Quotes
    // Defines themes for different events with passwords, quotes, and confetti colors
    const themes = {
        'birthday': {
            password: function(name) { return name.trim().toLowerCase(); },
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
        'anniversary': {
            password: function(date) { return date; },
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

        'other': {
            password: function(label) { return label.trim().toLowerCase(); },
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

    // Card Element Selection
    // Caches DOM elements for the card and extracts dataset attributes

    const culturalTheme = cardContainer?.dataset.culturalTheme === 'true';
    const customLabel = cardContainer?.dataset.customLabel || '';
    const cardPages = document.querySelectorAll('.card-page');
    const pageIndicators = document.querySelectorAll('.page-indicator .indicator');
    const recipientNameElements = document.querySelectorAll('.recipient-name');

    // Interactive Element Cache
    // Stores references to interactive DOM elements with error handling
    const elements = {
        passwordInput: document.querySelector('.password-input'),
        unlockButton: document.querySelector('.unlock-button'),
        passwordHint: document.querySelector('.password-hint'),
        nextButtons: document.querySelectorAll('.nav-button.next'),
        prevButtons: document.querySelectorAll('.nav-button.prev'),
        saveButton: document.querySelector('.save-button'),
        saveCardButton: document.querySelector('.save-card'),
        shareButton: document.querySelector('.share-card'),
        voiceNote: document.querySelector('.voice-note-text'),
        playVoiceNote: document.querySelector('.play-voice-note')
    };

    // State Management
    // Tracks current page, unlock status, and persistent data
    let currentPage = 1;
    let unlocked = false;
    const storageKey = `cardState_${window.location.pathname}`;
    let savedData = getSavedData();

    // Retrieve Saved Data
    // Loads card state from localStorage with error handling
    function getSavedData() {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || {
                leaves: [],
                unlocked: false,
                lastVisited: Date.now()
            };
        } catch (e) {
            console.error('Error parsing saved card data:', e);
            return { leaves: [], unlocked: false, lastVisited: Date.now() };
        }
    }

    // Save Data to LocalStorage
    // Persists card state with updated data and timestamp
    function saveData(data = {}) {
        try {
            savedData = {...savedData, ...data, lastVisited: Date.now()};
            localStorage.setItem(storageKey, JSON.stringify(savedData));
            return true;
        } catch (e) {
            console.error('Error saving card data:', e);
            return false;
        }
    }

    // Load Saved State
    // Restores card state if unlocked or active page is not page-1
    if (savedData.unlocked || document.querySelector('.card-page.active')?.id !== 'page-1') {
        unlocked = true;
        goToPage(savedData.lastPage || 2);
    }

    // Cultural Theme Initialization
    // Creates diyas for cultural theme if enabled
    if (culturalTheme) {
        createDiyas();
    }

    // Initialize Quotes
    // Sets random motivational quotes for the event type
    initializeQuotes();

    // Set Random Motivational Quote
    // Assigns a random quote from the theme to all .inspiration-quote elements
    function initializeQuotes() {
        try {
            const quoteElements = document.querySelectorAll('.inspiration-quote');
            const themeQuotes = themes[eventType]?.quotes || themes.birthday.quotes;
            quoteElements.forEach(quoteEl => {
                const randomQuote = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
                quoteEl.textContent = randomQuote;
            });
        } catch (e) {
            console.error('Error initializing quotes:', e);
        }
    }

    // Create Floating Diyas
    // Generates animated diyas for cultural theme with performance optimization
    function createDiyas() {
        try {
            const diyaContainers = document.querySelectorAll('.diya-container');
            diyaContainers.forEach(container => {
                const fragment = document.createDocumentFragment();
                const positions = [
                    { left: '10px', top: '10px' },  // Top-left
                    { left: 'calc(100% - 40px)', top: '10px' }, // Top-right
                    { left: '10px', top: 'calc(100% - 40px)' }, // Bottom-left
                    { left: 'calc(100% - 40px)', top: 'calc(100% - 40px)' } // Bottom-right
                ];
                positions.forEach(pos => {
                    const diya = document.createElement('div');
                    diya.className = 'diya';
                    diya.style.left = pos.left;
                    diya.style.top = pos.top;
                    diya.style.animationDelay = `${Math.random() * 2}s`;
                    const flame = document.createElement('div');
                    flame.className = 'flame';
                    diya.appendChild(flame);
                    fragment.appendChild(diya);
                });
                container.appendChild(fragment);
            });
        } catch (e) {
            console.error('Error creating diyas:', e);
        }
    }

    // Setup Media Displays
    // Configures image slideshows with lazy loading and fallback support
    function setupMediaDisplays() {
        try {
            console.log('Initializing media display');
            const mediaDisplays = document.querySelectorAll('.media-display');
            if (!mediaDisplays.length) {
                console.warn('No media-display elements found');
                return;
            }
            mediaDisplays.forEach(display => {
                console.log('data-media-urls:', display.dataset.mediaUrls);
                if (!display.dataset.mediaUrls && !display.dataset.fallbackUrl) {
                    console.warn('No media URLs or fallback URL');
                    return;
                }
                let mediaUrls = display.dataset.mediaUrls
                    ? display.dataset.mediaUrls.split(',').map(url => url.trim().replace(/\?$/, '')).filter(url => url)
                    : [];
                const fallbackUrl = display.dataset.fallbackUrl || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e';
                if (!mediaUrls.length) {
                    console.log('Using fallback URL:', fallbackUrl);
                    mediaUrls = [fallbackUrl];
                }
                display.innerHTML = '';
                const fragment = document.createDocumentFragment();
                const caption = display.parentElement.querySelector('.media-caption')?.textContent || 'Event media';
                const eventName = document.querySelector('.recipient-name')?.textContent || 'event';
                mediaUrls.forEach((url, i) => {
                    try {
                        const img = document.createElement('img');
                        img.src = decodeURIComponent(url);
                        img.alt = `${caption} for ${eventName}`;
                        img.className = 'media-image';
                        img.loading = 'lazy';
                        img.style.display = i > 0 ? 'none' : 'block';
                        img.onerror = () => console.error(`Failed to load image: ${url}`);
                        img.onload = () => console.log(`Loaded image: ${url}`);
                        fragment.appendChild(img);
                    } catch (e) {
                        console.error(`Error creating image for URL ${url}:`, e);
                    }
                });
                display.appendChild(fragment);
                const images = display.querySelectorAll('.media-image');
                if (images.length > 1) {
                    setupSlideshow(display, images);
                }
            });
        } catch (e) {
            console.error('Error setting up media display:', e);
        }
    }
    function setupThemeSystem() {
        // Create theme toggle button in a fixed position
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.setAttribute('aria-label', 'Toggle dark mode');
        themeToggle.innerHTML = `
            <div class="theme-toggle-wrapper">
                <div class="theme-icon sun">

                    <div class="sun-core"></div>
                </div>
                <div class="theme-icon moon">
                    <div class="moon-body"></div>
                    <div class="moon-crater moon-crater-1"></div>
                    <div class="moon-crater moon-crater-2"></div>
                    <div class="moon-crater moon-crater-3"></div>
                </div>
                <div class="toggle-background"></div>
            </div>
        `;
        document.body.appendChild(themeToggle);

        // Get preferred color scheme from localStorage or system preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: light)').matches;
        const savedTheme = localStorage.getItem('cardTheme');
        const isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDarkMode;

        // Apply saved theme on load
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        // Update toggle button appearance
        updateToggleState(isDarkMode);
        addBackgroundEffects();

        // Handle toggle click
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            // Add transition class for smooth color transitions
            document.documentElement.classList.add('theme-transition');

            // Set the new theme
            document.documentElement.setAttribute('data-theme', newTheme);

            // Remove transition class after transition completes
            // Animate the toggle
            themeToggle.classList.add('theme-toggle-active');
            setTimeout(() => {
                themeToggle.classList.remove('theme-toggle-active');
            }, 700);

            // Update background effects
            updateBackgroundEffects(newTheme);

            // Remove transition class after transition completes
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 800);

            // Save preference
            localStorage.setItem('cardTheme', newTheme);

            // Update toggle appearance
            updateToggleState(newTheme === 'dark');
        });

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            // Only update if user hasn't set a preference
            if (!localStorage.getItem('cardTheme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                updateToggleState(e.matches);
                updateBackgroundEffects(newTheme);
            }
        });

        // Update toggle button appearance
        function updateToggleState(isDark) {
            const toggleWrapper = themeToggle.querySelector('.theme-toggle-wrapper');

            if (isDark) {
                toggleWrapper.classList.add('dark-mode');
                toggleWrapper.classList.remove('light-mode');
                themeToggle.setAttribute('aria-pressed', 'true');
            } else {
                toggleWrapper.classList.add('light-mode');
                toggleWrapper.classList.remove('dark-mode');
                themeToggle.setAttribute('aria-pressed', 'false');
            }
        }

        // Add animated background elements
        function addBackgroundEffects() {
            const backgroundEffects = document.createElement('div');
            backgroundEffects.className = 'background-effects';

            // Create stars for dark mode
            const starsContainer = document.createElement('div');
            starsContainer.className = 'stars-container';
            for (let i = 0; i < 50; i++) {
                const star = document.createElement('div');
                star.className = 'star-bg';
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.animationDelay = `${Math.random() * 5}s`;
                star.style.animationDuration = `${3 + Math.random() * 7}s`;
                starsContainer.appendChild(star);
            }

            // Create clouds for light mode
            const cloudsContainer = document.createElement('div');
            cloudsContainer.className = 'clouds-container';
            for (let i = 0; i < 5; i++) {
                const cloud = document.createElement('div');
                cloud.className = 'cloud-bg';
                cloud.style.left = `${Math.random() * 100}%`;
                cloud.style.top = `${Math.random() * 40}%`;
                cloud.style.animationDelay = `${Math.random() * 20}s`;
                cloud.style.animationDuration = `${30 + Math.random() * 30}s`;
                cloud.style.opacity = `${0.2 + Math.random() * 0.3}`;
                cloud.style.transform = `scale(${0.5 + Math.random() * 0.5})`;
                cloudsContainer.appendChild(cloud);
            }

            backgroundEffects.appendChild(starsContainer);
            backgroundEffects.appendChild(cloudsContainer);
            document.body.insertBefore(backgroundEffects, document.body.firstChild);

            // Set initial state based on theme
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            updateBackgroundEffects(currentTheme);
        }

        // Update background effects based on theme
        function updateBackgroundEffects(theme) {
            const starsContainer = document.querySelector('.stars-container');
            const cloudsContainer = document.querySelector('.clouds-container');

            if (theme === 'dark') {
                starsContainer.style.opacity = '1';
                cloudsContainer.style.opacity = '0';
            } else {
                starsContainer.style.opacity = '0';
                cloudsContainer.style.opacity = '1';
            }
        }
        // Add rotation effect during transition
        toggleWrapper.style.transform = `rotate(${isDark ? '180deg' : '0deg'})`;
    }

    // Add theme setup to window load
    window.addEventListener('DOMContentLoaded', () => {
        setupThemeSystem();
    });

    // Setup Slideshow
    // Initializes slideshow with navigation controls and touch/keyboard support
    function setupSlideshow(display, images) {
        try {
            console.log('Initializing slideshow with', images.length, 'images');
            const oldControls = display.parentElement.querySelector('.slideshow-controls');
            if (oldControls) oldControls.remove();
            let currentIndex = 0;
            const mediaContainer = display.parentElement;
            const controls = document.createElement('div');
            controls.className = 'slideshow-controls';
            const prevBtn = document.createElement('button');
            prevBtn.className = 'slideshow-btn prev nav-button prev';
            prevBtn.innerHTML = '← ';
            prevBtn.setAttribute('aria-label', 'Previous image');
            const nextBtn = document.createElement('button');
            nextBtn.className = 'slideshow-btn next nav-button next';
            nextBtn.innerHTML = '→';
            nextBtn.setAttribute('aria-label', 'Next image');
            const indicators = document.createElement('div');
            indicators.className = 'slideshow-indicators';
            for (let i = 0; i < images.length; i++) {
                const dot = document.createElement('span');
                dot.className = i === 0 ? 'indicator active' : 'indicator';
                dot.setAttribute('data-index', i);
                indicators.appendChild(dot);
            }
            function showSlide(index) {
                try {
                    currentIndex = (index + images.length) % images.length;
                    images.forEach((img, i) => {
                        img.style.display = i === currentIndex ? 'block' : 'none';
                    });
                    const dots = indicators.querySelectorAll('.indicator');
                    dots.forEach((dot, i) => {
                        dot.classList.toggle('active', i === currentIndex);
                    });
                    console.log('Showing slide:', currentIndex);
                } catch (e) {
                    console.error('Error in showSlide:', e);
                }
            }
            prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
            nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
            indicators.addEventListener('click', (e) => {
                if (e.target.classList.contains('indicator')) {
                    const index = parseInt(e.target.dataset.index);
                    showSlide(index);
                }
            });
            let touchStartX = 0;
            display.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            display.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const diff = touchEndX - touchStartX;
                if (diff > 50) {
                    showSlide(currentIndex - 1);
                } else if (diff < -50) {
                    showSlide(currentIndex + 1);
                }
            }, { passive: true });
            display.setAttribute('tabindex', '0');
            display.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    showSlide(currentIndex - 1);
                } else if (e.key === 'ArrowRight') {
                    showSlide(currentIndex + 1);
                }
            });
            controls.appendChild(prevBtn);
            controls.appendChild(indicators);
            controls.appendChild(nextBtn);
            mediaContainer.appendChild(controls);
            if (images.length > 1) {
                let slideshowInterval = setInterval(() => {
                    showSlide(currentIndex + 1);
                }, 5000);
                display.addEventListener('mouseenter', () => clearInterval(slideshowInterval));
                display.addEventListener('focus', () => clearInterval(slideshowInterval));
                display.addEventListener('mouseleave', () => {
                    slideshowInterval = setInterval(() => {
                        showSlide(currentIndex + 1);
                    }, 5000);
                });
                display.addEventListener('blur', () => {
                    slideshowInterval = setInterval(() => {
                        showSlide(currentIndex + 1);
                    }, 5000);
                });
            }
        } catch (e) {
            console.error('Error in setupSlideshow:', e);
        }
    }

    // Setup Audio Player
    // Configures an audio player with multiple source URLs
    function setupAudioPlayer(audioUrls) {
        try {
            const audioPlayer = document.querySelector('.audio-player');
            if (!audioPlayer) return;
            audioPlayer.innerHTML = '';
            const audio = document.createElement('audio');
            audio.controls = true;
            audioUrls.forEach(url => {
                const source = document.createElement('source');
                source.src = url;
                audio.appendChild(source);
            });
            audioPlayer.appendChild(audio);
        } catch (e) {
            console.error('Error setting up audio player:', e);
        }
    }

    // Stop All Audio
    // Pauses all audio elements except the specified one
    function stopAllAudio(exceptId = null) {
        try {
            const audios = document.querySelectorAll('audio');
            audios.forEach(audio => {
                if (audio.id !== exceptId && !audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
        } catch (e) {
            console.error('Error stopping audio:', e);
        }
    }

    // Setup Audio or Quote
    // Configures audio playback or displays a fallback quote
    function setupAudioOrQuote() {
        try {
            const eventType = document.querySelector('.card-container').dataset.eventType || 'other';
            const audioContainer = document.getElementById(`audio-player-${eventType}`);
            const quoteContainer = document.getElementById(`fallback-quote-${eventType}`);
            const audioPlayer = document.getElementById(`user-audio-${eventType}`);
            const audioControl = audioContainer?.querySelector('.audio-control');
            const audioUrl = document.querySelector('.card-container').dataset.audioUrl;

            console.log(`Setting up audio for event type: ${eventType}, audio URL: ${audioUrl}`);

            // Check browser audio support
            const audioSupport = !!document.createElement('audio').canPlayType;
            if (!audioSupport || !audioPlayer) {
                console.warn('Browser does not support <audio> element');
                if (audioContainer) audioContainer.style.display = 'none';
                if (quoteContainer) {
                    quoteContainer.style.display = 'block';
                    const quoteEl = quoteContainer.querySelector('.inspiration-quote');
                    const themeQuotes = themes[eventType]?.quotes || themes.birthday.quotes;
                    quoteEl.textContent = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
                }
                return;
            }

            if (audioUrl && audioUrl !== 'null' && audioContainer && audioControl) {
                // Check supported formats
                const mimeTypes = {
                    'mpeg': 'audio/mpeg',
                    'flac': 'audio/flac',
                    'wav': 'audio/wav',
                    'ogg': 'audio/ogg',
                    'aac': 'audio/aac'
                };
                let supportedType = '';
                for (const [ext, mime] of Object.entries(mimeTypes)) {
                    if (audioPlayer.canPlayType(mime) && audioUrl.toLowerCase().endsWith(`.${ext}`)) {
                        supportedType = mime;
                        break;
                    }
                }

                if (supportedType) {
                    console.log(`Using audio format: ${supportedType}`);
                    audioPlayer.load();
                    audioControl.addEventListener('click', () => {
                        stopAllAudio(`user-audio-${eventType}`);
                        if (audioPlayer.paused) {
                            audioPlayer.play().catch(e => {
                                console.error('Audio playback failed:', e);
                                alert('Unable to play audio. Please check your browser settings or try a different browser.');
                            });
                            audioControl.textContent = 'Pause Message';
                        } else {
                            audioPlayer.pause();
                            audioControl.textContent = audioControl.getAttribute('aria-label');
                        }
                    });
                    audioPlayer.addEventListener('ended', () => {
                        audioControl.textContent = audioControl.getAttribute('aria-label');
                    });
                } else {
                    console.warn('No supported audio format found');
                    audioContainer.style.display = 'none';
                    if (quoteContainer) quoteContainer.style.display = 'block';
                }
            } else {
                console.log('No audio URL provided, showing quote');
                audioContainer.style.display = 'none';
                if (quoteContainer) {
                    quoteContainer.style.display = 'block';
                    const quoteEl = quoteContainer.querySelector('.inspiration-quote');
                    const themeQuotes = themes[eventType]?.quotes || themes.birthday.quotes;
                    quoteEl.textContent = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
                }
            }
        } catch (e) {
            console.error('Error setting up audio or quote:', e);
        }
    }

    // Navigate to Page
    // Updates the active page with accessibility attributes
    function goToPage(pageNum) {
        if (!pageNum || pageNum < 1 || pageNum > cardPages.length) return;
        if (pageNum > 1 && !unlocked) {
            shakePasswordInput();
            return;
        }
        currentPage = pageNum;
        saveData({ lastPage: currentPage });
        cardPages.forEach((page, index) => {
            const isActive = index + 1 === currentPage;
            page.classList.toggle('active', isActive);
            page.setAttribute('aria-hidden', !isActive);
            page.style.display = isActive ? 'block' : 'none';
        });
        pageIndicators.forEach((indicator, index) => {
            const isActive = index + 1 === currentPage;
            indicator.textContent = isActive ? '●' : '○';
            indicator.classList.toggle('active', isActive);
            indicator.setAttribute('aria-selected', isActive);
        });
        initPage(pageNum);
    }

    // Validate Password
    // Checks password via server request and unlocks card if valid
    function validatePassword() {
        try {
            const recipientName = recipientNameElements[0]?.textContent || '';
            const inputValue = elements.passwordInput?.value?.trim().toLowerCase() || '';
            const eventId = cardContainer.dataset.eventId || '';
            const csrftoken = getCookie('csrftoken');
            if (!inputValue) {
                shakePasswordInput('Please enter a password');
                return false;
            }
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
                    unlocked = true;
                    saveData({ unlocked: true });
                    localStorage.removeItem('incorrectAttempts'); // Reset attempts on success
                    showConfetti();
                    elements.passwordInput.classList.add('success');
                    setTimeout(() => goToPage(2), 1000);
                } else {
                    incorrectAttempts++;
                    localStorage.setItem('incorrectAttempts', incorrectAttempts);
                    if (incorrectAttempts >= 1 && passwordHint) {
                        passwordHint.style.display = 'block';
                    }
                    shakePasswordInput(data.error || 'Incorrect password, please try again');
                }
            })
            .catch(err => {
                console.error('Error validating password:', err);
                shakePasswordInput('An error occurred, please try again');
            });
            return true;
        } catch (e) {
            console.error('Error validating password:', e);
            return false;
        }
    }

    // Setup Password Input
    // Adds event listeners for password validation
    if (elements.unlockButton && elements.passwordInput) {
        elements.unlockButton.addEventListener('click', (e) => {
            e.preventDefault();
            validatePassword();
        });
        elements.passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                validatePassword();
            }
        });
    }

    // Shake Password Input
    // Animates password input on error with optional message
    function shakePasswordInput(message = null) {
        if (!elements.passwordInput) return;
        elements.passwordInput.classList.add('error');
        elements.passwordInput.style.animation = 'shake 0.5s ease';
        if (message && elements.passwordHint) {
            const originalHint = elements.passwordHint.innerHTML;
            elements.passwordHint.innerHTML = `<span class="error-message">${message}</span>`;
            setTimeout(() => {
                elements.passwordHint.innerHTML = originalHint;
            }, 3000);
        }
        setTimeout(() => {
            elements.passwordInput.style.animation = '';
            elements.passwordInput.classList.remove('error');
        }, 500);
    }

    function setupSliderUnlock() {
        const sliderTrack = document.querySelector('.slider-track');
        const sliderThumb = document.querySelector('.slider-thumb');
        const yesButton = document.getElementById('yes-unlocked-button');
        let isDragging = false, startX = 0, currentX = 0, maxMove = 0;

        if (!sliderTrack || !sliderThumb || !yesButton) return;

        maxMove = sliderTrack.offsetWidth - sliderThumb.offsetWidth;

        function onDragStart(e) {
            isDragging = true;
            startX = (e.touches ? e.touches[0].clientX : e.clientX) - sliderThumb.offsetLeft;
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove, {passive: false});
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        }

        function onDragMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            currentX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
            currentX = Math.max(0, Math.min(currentX, maxMove));
            sliderThumb.style.left = currentX + 'px';
            if (currentX >= maxMove - 5) unlockYesButton();
        }

        function onDragEnd() {
            if (!isDragging) return;
            if (currentX < maxMove - 5) {
                sliderThumb.style.left = '0px';
            }
            isDragging = false;
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchend', onDragEnd);
        }

        function unlockYesButton() {
            sliderTrack.classList.add('unlocked');
            sliderThumb.style.left = maxMove + 'px';
            setTimeout(() => {
                sliderTrack.style.display = 'none';
                yesButton.style.display = 'inline-block';
            }, 300);
        }

        sliderThumb.addEventListener('mousedown', onDragStart);
        sliderThumb.addEventListener('touchstart', onDragStart, {passive: false});
        sliderThumb.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                currentX = Math.min(currentX + 20, maxMove);
                sliderThumb.style.left = currentX + 'px';
                if (currentX >= maxMove - 5) unlockYesButton();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                currentX = Math.max(currentX - 20, 0);
                sliderThumb.style.left = currentX + 'px';
            }
        });

        yesButton.addEventListener('click', startCountdown);
    }

    function startCountdown() {
        const countdownElement = document.querySelector('.countdown');
        const yesButton = document.getElementById('yes-unlocked-button');
        if (!countdownElement || !yesButton) return;

        let count = 5;
        yesButton.style.display = 'none';
        countdownElement.textContent = count;
        countdownElement.setAttribute('aria-live', 'assertive');
        const interval = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            if (count < 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';
                showMilestonePopup();
            }
        }, 1000);
    }

    function showMilestonePopup() {
        if (document.querySelector('.milestone-popup')) return;

        const eventId = document.querySelector('.card-container').dataset.eventId;

        fetch(`/get_event_highlights/${eventId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            },
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch highlights');
            return response.json();
        })
        .then(data => {
            let content = '';

            if (data.highlights && data.highlights.trim() !== '') {
                content = `
                    <h3 id="popup-title">Special Milestones</h3>
                    <p>${data.highlights.replace(/\n/g, '<br>')}</p>
                `;
            } else if (data.thread_of_memories && data.thread_of_memories.trim() !== '') {
                content = `
                    <h3 id="popup-title">Thread of Memories</h3>
                    <p>${data.thread_of_memories.replace(/\n/g, '<br>')}</p>
                `;
            } else {
                content = `
                    <h3 id="popup-title">No Milestones</h3>
                    <p>No special milestones or memories were added for this event.</p>
                `;
            }

            const popup = document.createElement('div');
            popup.className = 'milestone-popup';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-labelledby', 'popup-title');
            popup.innerHTML = `
                <div class="milestone-popup-content">
                    ${content}
                    <button class="close-popup" aria-label="Close popup">Close</button>
                </div>
            `;
            document.body.appendChild(popup);

            // Style popup
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.background = 'rgba(255, 255, 255, 0.95)';
            popup.style.padding = '20px';
            popup.style.borderRadius = '10px';
            popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            popup.style.zIndex = '1000';
            popup.style.maxWidth = '400px';
            popup.style.textAlign = 'center';

            popup.focus();

            // Trap focus inside popup
            const focusableElements = popup.querySelectorAll('button, [tabindex="0"]');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            popup.addEventListener('keydown', function trapFocus(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });

            popup.querySelector('.close-popup').addEventListener('click', () => {
                popup.remove();
            });

            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    popup.remove();
                    document.removeEventListener('keydown', handler);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching highlights:', error);
            const popup = document.createElement('div');
            popup.className = 'milestone-popup';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-labelledby', 'popup-title');
            popup.innerHTML = `
                <div class="milestone-popup-content">
                    <h3 id="popup-title">Error</h3>
                    <p>Unable to load milestones. Please try again later.</p>
                    <button class="close-popup" aria-label="Close popup">Close</button>
                </div>
            `;
            document.body.appendChild(popup);

            // Style popup
            popup.style.position = 'fixed';
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
            popup.style.background = 'rgba(255, 255, 255, 0.95)';
            popup.style.padding = '20px';
            popup.style.borderRadius = '10px';
            popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            popup.style.zIndex = '1000';
            popup.style.maxWidth = '400px';
            popup.style.textAlign = 'center';
            popup.focus();

            popup.querySelector('.close-popup').addEventListener('click', () => {
                popup.remove();
            });
        });
    }


    function setupBirthdayCountdown() {
        setupSliderUnlock();
    }

    function setupMemoryTree() {
        const tree = document.querySelector('.memory-tree');
        const treeInstruction = document.querySelector('.tree-instruction');
        if (!tree) return;
        if (savedData.leaves && Array.isArray(savedData.leaves)) {
            const fragment = document.createDocumentFragment();
            savedData.leaves.forEach(leaf => {
                const leafEl = document.createElement('div');
                leafEl.className = 'memory-leaf';
                leafEl.style.left = `${leaf.x}px`;
                leafEl.style.top = `${leaf.y}px`;
                fragment.appendChild(leafEl);
            });
            tree.appendChild(fragment);
        }
        tree.addEventListener('click', function(e) {
            const rect = tree.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const leaf = document.createElement('div');
            leaf.className = 'memory-leaf';
            leaf.style.left = `${x}px`;
            leaf.style.top = `${y}px`;
            tree.appendChild(leaf);
            leaf.animate([
                { transform: 'scale(0)', opacity: 0 },
                { transform: 'scale(1.2)', opacity: 0.8 },
                { transform: 'scale(1)', opacity: 1 }
            ], {
                duration: 500,
                easing: 'ease-out'
            });
            if (!savedData.leaves) savedData.leaves = [];
            savedData.leaves.push({ x, y });
            saveData();
            if (tree.querySelectorAll('.memory-leaf').length > 5 && treeInstruction) {
                treeInstruction.textContent = 'Your tree is flourishing!';
            }
            const audioContainer = document.getElementById('audio-player-container');
            const quoteContainer = document.getElementById('fallback-quote');
            if (cardContainer.dataset.audioUrl && audioContainer) {
                audioContainer.style.display = 'block';
                showFeedback('Click to listen to our memory!');
            } else if (quoteContainer) {
                quoteContainer.style.display = 'block';
            }
        });
    }

    // Show Confetti
    // Displays animated confetti with theme-specific colors
    function showConfetti() {
        const colors = themes[eventType]?.confettiColors || themes.birthday.confettiColors;
        const container = document.getElementById('page-1');
        if (!container) return;
        const confettiPieces = [];
        const confettiDensity = Math.min(100, window.innerWidth / 10);
        for (let i = 0; i < confettiDensity; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = `-20px`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.speedY = Math.random() * 3 + 2;
            confetti.speedX = Math.random() * 2 - 1;
            confetti.rotateSpeed = Math.random() * 6 - 3;
            container.appendChild(confetti);
            confettiPieces.push({
                element: confetti,
                x: parseFloat(confetti.style.left),
                y: -20,
                speedY: confetti.speedY,
                speedX: confetti.speedX,
                rotate: Math.random() * 360,
                rotateSpeed: confetti.rotateSpeed
            });
        }
        let animationId;
        const animate = () => {
            confettiPieces.forEach((piece, i) => {
                piece.y += piece.speedY;
                piece.x += piece.speedX;
                piece.rotate += piece.rotateSpeed;
                piece.element.style.top = `${piece.y}px`;
                piece.element.style.left = `${piece.x}%`;
                piece.element.style.transform = `rotate(${piece.rotate}deg)`;
                if (piece.y > container.offsetHeight + 100) {
                    piece.element.remove();
                    confettiPieces.splice(i, 1);
                }
            });
            if (confettiPieces.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };
        animationId = requestAnimationFrame(animate);
        setTimeout(() => {
            cancelAnimationFrame(animationId);
            confettiPieces.forEach(piece => piece.element.remove());
            confettiPieces.length = 0;
        }, 5000);
    }

    // Setup Anniversary Clock
    // Animates a clock for anniversary theme
    function setupAnniversaryClock() {
        if (eventType !== 'anniversary') return;
        const clockContainer = document.querySelector('.anniversary-clock');
        if (!clockContainer) return;
        const clockFace = document.createElement('div');
        clockFace.className = 'clock-face';
        const hourHand = document.createElement('div');
        hourHand.className = 'clock-hand hour';
        const minuteHand = document.createElement('div');
        minuteHand.className = 'clock-hand minute';
        const secondHand = document.createElement('div');
        secondHand.className = 'clock-hand second';
        const clockCenter = document.createElement('div');
        clockCenter.className = 'clock-center';
        for (let i = 1; i <= 12; i++) {
            const marker = document.createElement('div');
            marker.className = 'clock-marker';
            marker.textContent = i;
            marker.style.transform = `rotate(${i * 30}deg) translateY(-40px) rotate(${-i * 30}deg)`;
            clockFace.appendChild(marker);
        }
        clockFace.appendChild(hourHand);
        clockFace.appendChild(minuteHand);
        clockFace.appendChild(secondHand);
        clockFace.appendChild(clockCenter);
        clockContainer.appendChild(clockFace);
        const milestoneText = document.querySelector('.milestone-text');
        let animationStartTime = null;
        let animationSpeed = 50;
        function animateClock(timestamp) {
            if (!animationStartTime) animationStartTime = timestamp;
            const progress = (timestamp - animationStartTime) * animationSpeed;
            const date = new Date(progress);
            const seconds = date.getSeconds();
            const minutes = date.getMinutes();
            const hours = date.getHours() % 12;
            secondHand.style.transform = `rotate(${(seconds * 6)}deg)`;
            minuteHand.style.transform = `rotate(${(minutes * 6)}deg)`;
            hourHand.style.transform = `rotate(${(hours * 30) + (minutes * 0.5)}deg)`;
            if (progress < 86400000) {
                requestAnimationFrame(animateClock);
            } else {
                if (milestoneText) {
                    milestoneText.classList.add('highlight');
                    milestoneText.textContent = "Here's to many more years together! 💕";
                }
            }
        }
    }

    // Setup Anniversary Dance
    // Triggers dance animation with music and hearts
    function setupAnniversaryDance() {
        if (eventType !== 'anniversary') return;
        const danceButton = document.querySelector('.dance-button');
        const danceAnimation = document.querySelector('.dance-animation');
        if (!danceButton || !danceAnimation) return;
        danceButton.addEventListener('click', function() {
            danceAnimation.innerHTML = '';
            danceAnimation.classList.add('active');
            const dancers = document.createElement('div');
            dancers.className = 'dancers';
            dancers.textContent = '💃 🕺';
            const hearts = document.createElement('div');
            hearts.className = 'hearts';
            for (let i = 0; i < 15; i++) {
                const heart = document.createElement('span');
                heart.textContent = '❤️';
                heart.className = 'heart';
                heart.style.left = `${Math.random() * 80 + 10}%`;
                heart.style.animationDuration = `${Math.random() * 2 + 2}s`;
                heart.style.animationDelay = `${Math.random() * 3}s`;
                hearts.appendChild(heart);
            }
            const notes = ['🎵', '🎶', '♪', '♫', '🎼'];
            for (let i = 0; i < 10; i++) {
                const note = document.createElement('span');
                note.textContent = notes[Math.floor(Math.random() * notes.length)];
                note.className = 'music-note';
                note.style.left = `${Math.random() * 80 + 10}%`;
                note.style.animationDuration = `${Math.random() * 2 + 1}s`;
                note.style.animationDelay = `${Math.random() * 2}s`;
                hearts.appendChild(note);
            }
            danceAnimation.appendChild(dancers);
            danceAnimation.appendChild(hearts);
            danceButton.textContent = 'Keep Dancing!';
            try {
                if (window.AudioContext || window.webkitAudioContext) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    const audioCtx = new AudioContext();
                    const playNote = (frequency, startTime, duration) => {
                        const oscillator = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        oscillator.type = 'sine';
                        oscillator.frequency.value = frequency;
                        gainNode.gain.setValueAtTime(0.3, startTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        oscillator.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        oscillator.start(startTime);
                        oscillator.stop(startTime + duration);
                    };
                    const now = audioCtx.currentTime;
                    const waltzNotes = [
                        { note: 440, time: 0, duration: 0.5 },
                        { note: 493.88, time: 0.5, duration: 0.5 },
                        { note: 523.25, time: 1, duration: 0.5 },
                        { note: 440, time: 1.5, duration: 0.5 },
                        { note: 493.88, time: 2, duration: 0.5 },
                        { note: 523.25, time: 2.5, duration: 0.5 }
                    ];
                    waltzNotes.forEach(noteObj => {
                        playNote(noteObj.note, now + noteObj.time, noteObj.duration);
                    });
                }
            } catch (e) {
                console.error('Error playing music:', e);
            }
            const audioContainer = document.getElementById('audio-player-container');
            const quoteContainer = document.getElementById('fallback-quote');
            if (cardContainer.dataset.audioUrl && audioContainer) {
                audioContainer.style.display = 'block';
                showFeedback('Click to hear our song!');
            } else if (quoteContainer) {
                quoteContainer.style.display = 'block';
            }
        });
    }

    // Thread of memories
    function setupTimeline() {
        try {
            const timelineContainer = document.querySelector('.timeline');
            if (!timelineContainer) {
                console.log('No timeline container found on page 2');
                return;
            }

            // First check if we have milestones
            const milestones = document.querySelectorAll('.milestone');

            // Then check for memory thread items
            const memoryThreadItems = document.querySelectorAll('.memory-thread-item');

            if (!milestones.length && !memoryThreadItems.length) {
                console.log('No milestones or memory thread items found in timeline');
                return;
            }

            // Click-to-expand description for milestones
            if (milestones.length > 0) {
                milestones.forEach(milestone => {
                    const content = milestone.querySelector('.milestone-content');
                    if (!content) return;
                    content.addEventListener('click', () => {
                        const description = content.querySelector('p');
                        if (!description) return;
                        if (description.classList.contains('line-clamp-3')) {
                            description.classList.remove('line-clamp-3');
                            description.setAttribute('aria-expanded', 'true');
                        } else {
                            description.classList.add('line-clamp-3');
                            description.setAttribute('aria-expanded', 'false');
                        }
                    });
                });
            }

            // Handle memory thread items separately if they exist
            if (memoryThreadItems.length > 0) {
                memoryThreadItems.forEach(item => {
                    const content = item.querySelector('.memory-content');
                    if (!content) return;
                    content.addEventListener('click', () => {
                        const description = content.querySelector('p');
                        if (!description) return;
                        if (description.classList.contains('line-clamp-3')) {
                            description.classList.remove('line-clamp-3');
                            description.setAttribute('aria-expanded', 'true');
                        } else {
                            description.classList.add('line-clamp-3');
                            description.setAttribute('aria-expanded', 'false');
                        }
                    });
                });
            }

            // Fade-in animation on page 2 visibility
            const page2 = document.getElementById('page-2');
            const observer = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) {
                    // Animate milestones if they exist
                    if (milestones.length > 0) {
                        milestones.forEach((milestone, index) => {
                            setTimeout(() => {
                                milestone.classList.add('animate-fade-in');
                            }, index * 100);
                        });
                    }

                    // Animate memory thread items if they exist
                    if (memoryThreadItems.length > 0) {
                        memoryThreadItems.forEach((item, index) => {
                            setTimeout(() => {
                                item.classList.add('animate-fade-in');
                            }, index * 100);
                        });
                    }

                    observer.unobserve(page2);
                }
            }, { threshold: 0.5 });

            observer.observe(page2);

            console.log('Timeline setup complete with',
                        milestones.length, 'milestones and',
                        memoryThreadItems.length, 'memory thread items');
        } catch (e) {
            console.error('Error setting up timeline:', e);
        }
    }


    // Setup Birthday Cake
    // Implements candle-blowing interaction with confetti
    function setupBirthdayCake() {
        if (eventType !== 'birthday') return;
        const cake = document.querySelector('.birthday-cake');
        const instruction = document.querySelector('.cake-instruction');
        if (!cake) return;
        const candles = document.createElement('div');
        candles.className = 'candles';
        for (let i = 0; i < 5; i++) {
            const candle = document.createElement('div');
            candle.className = 'candle';
            const flame = document.createElement('div');
            flame.className = 'flame';
            candle.appendChild(flame);
            candles.appendChild(candle);
        }
        cake.appendChild(candles);
        let isBurning = true;
        cake.addEventListener('click', function() {
            if (!isBurning) return;
            const blowAnimation = document.createElement('div');
            blowAnimation.className = 'blow-animation';
            cake.appendChild(blowAnimation);
            const flames = cake.querySelectorAll('.flame');
            flames.forEach(flame => {
                flame.classList.add('extinguished');
            });
            if (instruction) {
                instruction.textContent = 'Your wish has been made! 🌟';
            }
            isBurning = false;
            setTimeout(() => {
                showConfetti();
                const wishGranted = document.createElement('div');
                wishGranted.className = 'wish-granted';
                wishGranted.textContent = 'Wish Granted!';
                wishGranted.style.opacity = '0';
                cake.appendChild(wishGranted);
                setTimeout(() => {
                    wishGranted.style.opacity = '1';
                }, 100);
                const audioContainer = document.getElementById('audio-player-container');
                const quoteContainer = document.getElementById('fallback-quote');
                if (cardContainer.dataset.audioUrl && audioContainer) {
                    audioContainer.style.display = 'block';
                    showFeedback('Click to hear a special message!');
                } else if (quoteContainer) {
                    quoteContainer.style.display = 'block';
                }
            }, 1000);
        });
    }

    // Play Final Animation
    // Displays event-specific animations on the last page
    function playFinalAnimation() {
        const finalAnimation = document.querySelector('.final-animation');
        if (!finalAnimation) return;
        const fragment = document.createDocumentFragment();
        let animationElements = [];
        if (eventType === 'birthday') {
            for (let i = 0; i < 10; i++) {
                const balloon = document.createElement('div');
                balloon.className = 'balloon';
                balloon.innerHTML = '🎈';
                balloon.style.left = `${Math.random() * 80 + 10}%`;
                balloon.style.animationDuration = `${Math.random() * 5 + 5}s`;
                balloon.style.animationDelay = `${Math.random() * 2}s`;
                fragment.appendChild(balloon);
                animationElements.push(balloon);
            }
            for (let i = 0; i < 5; i++) {
                const gift = document.createElement('div');
                gift.className = 'gift';
                gift.innerHTML = '🎁';
                gift.style.left = `${Math.random() * 80 + 10}%`;
                gift.style.animationDuration = `${Math.random() * 3 + 3}s`;
                gift.style.animationDelay = `${Math.random() * 2}s`;
                fragment.appendChild(gift);
                animationElements.push(gift);
            }
        } else if (eventType === 'anniversary') {
            const rings = document.createElement('div');
            rings.className = 'rings';
            rings.innerHTML = '💍 💍';
            fragment.appendChild(rings);
            animationElements.push(rings);
            for (let i = 0; i < 15; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart';
                heart.innerHTML = ['❤️', '💖', '💘', '💕', '💗'][Math.floor(Math.random() * 5)];
                heart.style.left = `${Math.random() * 80 + 10}%`;
                heart.style.animationDuration = `${Math.random() * 4 + 4}s`;
                heart.style.animationDelay = `${Math.random() * 3}s`;
                fragment.appendChild(heart);
                animationElements.push(heart);
            }
        } else {
            for (let i = 0; i < 20; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.innerHTML = ['✨', '🌟', '⭐', '💫', '🌠'][Math.floor(Math.random() * 5)];
                star.style.left = `${Math.random() * 80 + 10}%`;
                star.style.animationDuration = `${Math.random() * 4 + 3}s`;
                star.style.animationDelay = `${Math.random() * 2}s`;
                fragment.appendChild(star);
                animationElements.push(star);
            }
        }
        finalAnimation.appendChild(fragment);
        setTimeout(() => {
            animationElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            animationElements = [];
        }, 10000);
    }

    // Setup Sharing
    // Enables card sharing via modal with social media links
    function setupSharing() {
        const shareButton = document.querySelector('.share-card');
        const shareModal = document.querySelector('#share-modal');
        const generateLinkButton = document.querySelector('#generate-share-link');
        const closeModalButton = document.querySelector('#close-share-modal');
        const sharePasswordInput = document.querySelector('#share-password');
        const shareUrlContainer = document.querySelector('#share-url-container');
        const shareUrlElement = document.querySelector('#share-url');
        const whatsappLink = document.querySelector('#whatsapp-share');
        const twitterLink = document.querySelector('#twitter-share');
        const emailLink = document.querySelector('#email-share');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                shareModal.style.display = 'flex';
                sharePasswordInput.focus();
            });
        }
        if (closeModalButton) {
            closeModalButton.addEventListener('click', () => {
                shareModal.style.display = 'none';
                sharePasswordInput.value = '';
                shareUrlContainer.style.display = 'none';
            });
        }
        if (generateLinkButton) {
            generateLinkButton.addEventListener('click', () => {
                const password = sharePasswordInput.value.trim();
                if (!password) {
                    showFeedback('Please enter a password for sharing.');
                    return;
                }
                const eventId = shareButton.dataset.eventId;
                if (!eventId) {
                    showFeedback('Error: Event ID not found.');
                    return;
                }
                const csrftoken = getCookie('csrftoken');
                console.log("CSRF token from cookie:", csrftoken);
                fetch(`/share/generate/${eventId}/`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrftoken
                    },
                    body: JSON.stringify({ password: password }),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showFeedback(`Error: ${data.error}`);
                        return;
                    }
                    const shareUrl = data.share_url;
                    shareUrlElement.textContent = shareUrl;
                    shareUrlContainer.style.display = 'block';
                    if (data.warning) {
                        showFeedback(data.warning);
                    }
                    whatsappLink.href = `https://api.whatsapp.com/send?text=View%20my%20card:%20${encodeURIComponent(shareUrl)}`;
                    twitterLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=Check%20out%20my%20greeting%20card!`;
                    emailLink.href = `mailto:?subject=Greeting%20Card&body=View%20my%20card:%20${encodeURIComponent(shareUrl)}`;
                    if (navigator.share) {
                        navigator.share({
                            title: 'Greeting Card',
                            text: 'Check out my greeting card!',
                            url: shareUrl
                        }).catch(err => console.error('Share failed:', err));
                    }
                })
                .catch(err => {
                    console.error('Error generating share link:', err);
                    showFeedback('Failed to generate share link.');
                });
            });
        }
    }

    // Initialize Page-Specific Features
    // Sets up features based on the current page number
    function initPage(pageNum) {
        try {
            const calmingSound = document.getElementById('calming-sound');
            const audioControl = document.querySelector('.audio-control');
            if (currentPage === 3 && pageNum !== 3 && calmingSound) {
                calmingSound.pause();
                calmingSound.currentTime = 0;
                if (audioControl) audioControl.textContent = 'Play Sound';
                audioControl.classList.remove('paused');
            }
            switch (pageNum) {
                case 1:
                    if (elements.unlockButton && elements.passwordInput) {
                        elements.unlockButton.addEventListener('click', validatePassword);
                        elements.passwordInput.addEventListener('keypress', function(e) {
                            if (e.key === 'Enter') validatePassword();
                        });
                    }
                    break;
                case 2:
                    setupBirthdayCountdown();
                    setupAnniversaryClock();
                    break;
                case 3:
                    setupMediaDisplays();
                    if (calmingSound && audioControl) {
                        calmingSound.volume = 0.5;
                        calmingSound.play().catch(e => console.error('Audio playback failed:', e));
                        audioControl.textContent = 'Pause Sound';
                        audioControl.classList.add('paused');
                        audioControl.addEventListener('click', () => {
                            if (calmingSound.paused) {
                                calmingSound.play();
                                audioControl.textContent = 'Pause Sound';
                                audioControl.classList.add('paused');
                            } else {
                                calmingSound.pause();
                                audioControl.textContent = 'Play Sound';
                                audioControl.classList.remove('paused');
                            }
                        });
                    }
                    break;
                case 4:
                    setupBirthdayCake();
                    setupAnniversaryDance();
                    setupMemoryTree();
                    setupAudioOrQuote();
                    break;
                case 5:
                    playFinalAnimation();
                    setupVoiceNotePlayer();
                    break;
            }
        } catch (e) {
            console.error(`Error initializing page ${pageNum}:`, e);
        }
    }

    // Setup Voice Note Player
    // Toggles voice note visibility and plays text via speech synthesis
    function setupVoiceNotePlayer() {
        if (!elements.playVoiceNote || !elements.voiceNote) return;
        elements.playVoiceNote.addEventListener('click', function() {
            elements.voiceNote.hidden = !elements.voiceNote.hidden;
            if (!elements.voiceNote.hidden) {
                this.textContent = 'Hide Reflection';
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(elements.voiceNote.textContent);
                    speechSynthesis.speak(utterance);
                }
            } else {
                this.textContent = 'Play Reflection';
                if (window.speechSynthesis) {
                    speechSynthesis.cancel();
                }
            }
        });
    }

    // Setup Navigation Buttons
    // Adds event listeners for next/previous page navigation
    if (elements.nextButtons) {
        elements.nextButtons.forEach(button => {
            button.addEventListener('click', () => goToPage(currentPage + 1));
        });
    }

    if (elements.prevButtons) {
        elements.prevButtons.forEach(button => {
            button.addEventListener('click', () => goToPage(currentPage - 1));
        });
    }

    // Setup Page Indicators
    // Enables page navigation via indicators with accessibility
    pageIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            if (index + 1 <= currentPage + 1) {
                goToPage(index + 1);
            }
        });
        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (index + 1 <= currentPage + 1) {
                    goToPage(index + 1);
                }
            }
        });
    });

    // Setup Save Buttons
    // Saves card state and shows feedback
    if (elements.saveButton) {
        elements.saveButton.addEventListener('click', function() {
            saveData();
            showFeedback('Memory saved successfully!');
        });
    }

    if (elements.saveCardButton) {
        elements.saveCardButton.addEventListener('click', function() {
            saveData();
            showFeedback('Card saved successfully!');
        });
    }

    // Show Feedback Toast
    // Displays temporary feedback messages with animations
    function showFeedback(message) {
        const toast = document.createElement('div');
        toast.className = 'feedback-toast';
        toast.textContent = message;
        toast.setAttribute('aria-live', 'assertive');
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initialize Sharing
    // Sets up sharing functionality
    setupSharing();

    // Initialize First Page
    // Navigates to page 1 if not unlocked
    if (!savedData.unlocked && !document.querySelector('.card-page.active')?.id.includes('page-2')) {
        goToPage(1);
    }
});
