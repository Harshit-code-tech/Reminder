/**
 * MediaManager
 *
 * Manages all media rendering, image slideshows, modal zoom,
 * audio controls, and media-related UI for greeting cards.
 *
 * Extracted from greeting_card.js — no logic changes.
 * Attached to window.MediaManager for classic <script> loading.
 */

class MediaManager {
    /**
     * @param {Object} app - The GreetingCardApp instance
     */
    constructor(app) {
        this.app = app;
    }

    // --- Transparent accessors into the app context ---
    get eventType()     { return this.app.eventType; }
    get elements()      { return this.app.elements; }
    get cardContainer() { return this.app.cardContainer; }
    get themes()        { return this.app.themes; }

    // Delegate showFeedback to the app (handled by EffectManager delegator)
    showFeedback(message, type = 'info') {
        return this.app.showFeedback(message, type);
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
        let fallbackUrl = display.dataset.fallbackUrl || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e';
        // Rakhi-specific fallback
        if (this.eventType === 'raksha_bandhan' && !mediaUrls.length) {
            fallbackUrl = 'https://images.unsplash.com/photo-1597149493807-4b9f73995e45'; // Rakhi siblings image
        }

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

            // Calculate and maintain aspect ratio
            img.onload = () => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const containerWidth = display.clientWidth;
                const maxHeight = window.innerWidth <= 768 ? 300 : 500;
                
                if (aspectRatio > 1.5) {
                    // Wide images
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.maxHeight = maxHeight + 'px';
                } else {
                    // Portrait or square images
                    img.style.height = 'auto';
                    img.style.width = '100%';
                    img.style.maxHeight = maxHeight + 'px';
                }
                
                // Center the image in container
                display.style.alignItems = 'center';
                display.style.justifyContent = 'center';
            };

            img.onerror = () => {
                console.error(`Failed to load image: ${url}`);
                // Fallback to default Rakhi image
                if (this.eventType === 'raksha_bandhan') {
                    img.src = fallbackUrl;
                }
            };
            fragment.appendChild(img);
        });

        display.appendChild(fragment);

        // Add click handler for full-size view
        display.addEventListener('click', (e) => {
            if (e.target.classList.contains('media-image')) {
                this.showImageModal(e.target.src, e.target.alt);
            }
        });

        // Add zoom hint
        const zoomHint = document.createElement('div');
        zoomHint.className = 'zoom-hint';
        zoomHint.innerHTML = '🔍 Click to zoom';
        display.appendChild(zoomHint);

        // Add fit toggle button
        const fitToggle = document.createElement('button');
        fitToggle.className = 'image-fit-toggle';
        fitToggle.innerHTML = '📐 Fit: Contain';
        fitToggle.title = 'Toggle image fit mode';
        
        let fitMode = 'contain';
        fitToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            fitMode = fitMode === 'contain' ? 'cover' : fitMode === 'cover' ? 'fill' : 'contain';
            
            display.className = display.className.replace(/fit-(contain|cover|fill)/, '') + ` fit-${fitMode}`;
            fitToggle.innerHTML = `📐 Fit: ${fitMode.charAt(0).toUpperCase() + fitMode.slice(1)}`;
        });
        
        display.appendChild(fitToggle);
        display.classList.add('fit-contain'); // Default fit mode

        // Setup slideshow if multiple images
        if (mediaUrls.length > 1) {
            this.setupSlideshow(display);
        }
        // Add traditional frame animation for Rakhi
        if (this.eventType === 'raksha_bandhan') {
            this.addTraditionalFrame(display);
        }
    }

    addTraditionalFrame(display) {
        const frame = document.createElement('div');
        frame.className = 'traditional-frame';
        frame.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 5px solid var(--rakhi-gold);
            border-image: linear-gradient(45deg, var(--rakhi-gold), var(--rakshi-saffron)) 1;
            pointer-events: none;
            border-radius: 10px;
        `;

        display.style.position = 'relative';
        display.appendChild(frame);
    }

    // ===== IMAGE MODAL FUNCTIONALITY =====
    showImageModal(imageSrc, imageAlt) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('imageModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'imageModal';
            modal.className = 'image-modal';
            modal.innerHTML = `
                <div class="image-modal-content">
                    <span class="image-modal-close">&times;</span>
                    <img src="" alt="" />
                </div>
            `;
            document.body.appendChild(modal);

            // Close modal handlers
            const closeBtn = modal.querySelector('.image-modal-close');
            closeBtn.addEventListener('click', () => this.hideImageModal());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideImageModal();
                }
            });

            // ESC key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    this.hideImageModal();
                }
            });
        }

        // Set image and show modal
        const modalImg = modal.querySelector('img');
        modalImg.src = imageSrc;
        modalImg.alt = imageAlt;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideImageModal() {
        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    setupSlideshow(display) {
        const existingControls = display.parentElement.querySelector('.slideshow-controls');
        if (existingControls) {
            existingControls.remove();
        }
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
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.MediaManager = MediaManager;
