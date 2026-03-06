/**
 * EffectManager
 *
 * Manages all visual effects, animations, particles, confetti, toast
 * notifications, and background effects for greeting cards.
 *
 * Extracted from greeting_card.js — no logic changes.
 * Attached to window.EffectManager for classic <script> loading.
 */

class EffectManager {
    /**
     * @param {Object} app - The GreetingCardApp instance
     */
    constructor(app) {
        this.app = app;
    }

    // --- Transparent accessors into the app context ---
    get audioManager()  { return this.app.audioManager; }
    get eventType()     { return this.app.eventType; }
    get themes()        { return this.app.themes; }
    get cardContainer() { return this.app.cardContainer; }

    // ===== BACKGROUND EFFECTS =====

    initializeRakhiLoadingScreen() {
        const loadingScreen = document.getElementById('rakhi-loading');
        if (!loadingScreen) {
            console.error('Rakhi loading screen element not found');
            return;
        }
        console.log('Rakhi loading screen found');

        // Start petal animation
        this.createFloatingPetals();

        // Hide loading screen after 3 seconds
        setTimeout(() => {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1000);
        }, 3000);
    }

    createFloatingPetals() {
        const petalsContainer = document.querySelector('.floating-petals');
        if (!petalsContainer) return;

        const petalTypes = ['petal', 'petal marigold', 'petal rose'];

        setInterval(() => {
            if (this.eventType !== 'raksha_bandhan') return;

            const petal = document.createElement('div');
            petal.className = petalTypes[Math.floor(Math.random() * petalTypes.length)];
            petal.style.left = Math.random() * 100 + '%';
            petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
            petal.style.animationDelay = Math.random() * 2 + 's';

            petalsContainer.appendChild(petal);

            // Remove petal after animation
            setTimeout(() => {
                if (petal.parentNode) {
                    petal.parentNode.removeChild(petal);
                }
            }, 6000);
        }, 800);
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
        const petalsContainer = document.querySelector('.floating-petals');

        if (starsContainer && cloudsContainer) {
            if (theme === 'dark') {
                starsContainer.style.opacity = '1';
                cloudsContainer.style.opacity = '0';
            } else {
                starsContainer.style.opacity = '0';
                cloudsContainer.style.opacity = '1';
            }
        }
        // Special handling for Raksha Bandhan theme
        if (this.eventType === 'raksha_bandhan') {
            if (petalsContainer) {
                petalsContainer.style.opacity = theme === 'dark' ? '0.5' : '0.8';
            }
        }
    }

    // ===== BLESSING EFFECTS =====

    initializeBlessingRain() {
        const blessingRainContainer = document.getElementById('blessing-rain');
        if (!blessingRainContainer) return;

        const blessings = ['🌸', '🌼', '🙏', '✨', '💝', '❤️'];
        const createBlessing = () => {
            const blessing = document.createElement('div');
            blessing.className = 'blessing-particle';
            blessing.textContent = blessings[Math.floor(Math.random() * blessings.length)];
            blessing.style.left = `${Math.random() * 100}%`;
            blessing.style.animationDuration = `${Math.random() * 2 + 2}s`;
            blessing.style.animationDelay = `${Math.random() * 1}s`;
            blessingRainContainer.appendChild(blessing);

            setTimeout(() => {
                if (blessing.parentNode) {
                    blessing.parentNode.removeChild(blessing);
                }
            }, 4000);
        };

        // Create blessings at intervals
        setInterval(createBlessing, 300);
    }

    setupBlessingShower() {
        const blessingBtn = document.getElementById('blessing-shower-btn');
        const blessingShower = document.getElementById('blessing-shower');

        if (blessingBtn && blessingShower) {
            blessingBtn.addEventListener('click', () => {
                console.log('Blessing button clicked');
                this.audioManager.playBlessingSound();
                this.createBlessingParticles(blessingShower);
            });
        }else {
            console.error('Blessing button or shower container not found');
        }
    }

    createBlessingParticles(blessingShower) {
        const blessings = ['🌸', '🌼', '💰', '🪙', '✨', '💝', '🙏', '❤️'];

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'blessing-particle';
                particle.textContent = blessings[Math.floor(Math.random() * blessings.length)];
                particle.style.position = 'fixed';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = -30 + 'px';
                particle.style.animationDelay = `${Math.random()}s`;
                blessingShower.appendChild(particle);

                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 3500);
            }, i * 100);
        }
    }

    // ===== DECORATIVE HELPERS =====

    addDecorativeLeaves(container) {
        const leafEmojis = ['🍃', '🌿', '☘️'];
        for (let i = 0; i < 8; i++) {
            const leaf = document.createElement('div');
            leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
            leaf.style.position = 'absolute';
            leaf.style.fontSize = `${Math.random() * 8 + 12}px`;
            leaf.style.top = `${Math.random() * 80 + 10}%`;
            leaf.style.left = `${Math.random() * 80 + 10}%`;
            leaf.style.opacity = '0.7';
            leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
            leaf.style.pointerEvents = 'none';
            container.appendChild(leaf);
        }
    }

    // ===== CONFETTI =====

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

    // ===== PAGE-5 FINALE ANIMATIONS =====

    playFinalAnimation() {
        const finalAnimation = document.querySelector('.final-animation');
        if (!finalAnimation) return;
        this.audioManager.playCelebrationSound();
        finalAnimation.innerHTML = '';

        let animationElements = [];

        if (this.eventType === 'raksha_bandhan') {
            animationElements = this.createRakhiAnimation();

        } else if (this.eventType === 'birthday') {
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


    createRakhiAnimation() {
        const elements = [];

        // Sacred symbols
        const symbols = ['🕉️', '🪔', '🌸', '🌺', '💐', '✨'];
        for (let i = 0; i < 20; i++) { // Increased count for better coverage
            const symbol = document.createElement('div');
            symbol.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
            symbol.style.cssText = `
                position: fixed;
                left: ${Math.random() * 95}vw;
                top: ${Math.random() * 95}vh;
                font-size: ${Math.random() * 15 + 25}px;
                animation: floatUp ${Math.random() * 3 + 3}s ease-out ${Math.random() * 2}s infinite;
                pointer-events: none;
                color: var(--rakhi-gold);
                z-index: 9999;
                text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
            `;
            document.body.appendChild(symbol);
            elements.push(symbol);
        }


        return elements;
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

    // ===== TOAST / FEEDBACK NOTIFICATIONS =====

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
}

// ===== EXPORT TO GLOBAL SCOPE =====
window.EffectManager = EffectManager;
