/**
 * Other/Generic Card Module
 * Contains generic event interactive logic.
 * Methods are mixed into GreetingCardApp prototype.
 */

(function() {
    'use strict';

    const OtherMixin = {

        /* ─── Page 2: Quote Reveal + Magic Particles ─── */

        setupOtherPage2() {
            OtherMixin.setupQuoteReveal.call(this);
            OtherMixin.setupMagicReveal.call(this);
        },

        setupQuoteReveal() {
            const quoteEl = document.querySelector('.inspiration-quote');
            if (!quoteEl) return;

            const quotes = this.themes[this.eventType]?.quotes || this.themes.birthday?.quotes || [
                "Every day is a new beginning.",
                "The best is yet to come.",
                "You make the world a better place.",
                "Here's to the moments that matter.",
                "Celebrate every tiny victory."
            ];

            const quote = quotes[Math.floor(Math.random() * quotes.length)];

            // Typewriter effect
            quoteEl.textContent = '';
            quoteEl.style.minHeight = '3em';
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < quote.length) {
                    quoteEl.textContent += quote[i];
                    i++;
                } else {
                    clearInterval(typeInterval);
                    quoteEl.style.animation = 'quoteGlow 2s ease-in-out infinite alternate';
                }
            }, 40);
        },

        setupMagicReveal() {
            const magicBtn = document.getElementById('magic-reveal-btn');
            const particlesContainer = document.getElementById('magic-particles');
            if (!magicBtn || !particlesContainer) return;

            magicBtn.addEventListener('click', () => {
                magicBtn.disabled = true;
                magicBtn.innerHTML = '<i class="fas fa-magic"></i> Magical!';

                // Create particle shower
                const emojis = ['✨', '🌟', '⭐', '💫', '🔮', '🌈', '💜', '🦋'];
                for (let i = 0; i < 25; i++) {
                    const particle = document.createElement('span');
                    particle.className = 'magic-particle';
                    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                    particle.style.cssText = `
                        position: absolute;
                        left: ${Math.random() * 100}%;
                        top: 0;
                        font-size: ${Math.random() * 16 + 14}px;
                        animation: magicFall ${Math.random() * 2 + 1.5}s ease-out ${Math.random() * 0.5}s forwards;
                        pointer-events: none;
                        opacity: 0;
                    `;
                    particlesContainer.appendChild(particle);
                }

                // Show confetti and reveal audio
                setTimeout(() => {
                    this.showConfetti();
                    this.revealAudioOrQuote();
                }, 1000);

                // Clean particles and re-enable
                setTimeout(() => {
                    particlesContainer.innerHTML = '';
                    magicBtn.disabled = false;
                    magicBtn.innerHTML = '<i class="fas fa-magic"></i> More Magic!';
                }, 3000);
            });
        },

        /* ─── Page 4: Memory Tree + Wish Jar ─── */

        setupMemoryTree() {
            if (!this.elements.memoryTree) return;

            if (this.savedData.leaves && Array.isArray(this.savedData.leaves)) {
                this.savedData.leaves.forEach(leaf => {
                    OtherMixin.createMemoryLeaf.call(this, leaf.x, leaf.y);
                });
            }

            this.elements.memoryTree.addEventListener('click', (e) => {
                OtherMixin.addMemoryLeaf.call(this, e);
            });
        },

        addMemoryLeaf(event) {
            const rect = this.elements.memoryTree.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            OtherMixin.createMemoryLeaf.call(this, x, y);

            if (!this.savedData.leaves) this.savedData.leaves = [];
            this.savedData.leaves.push({ x, y });
            this.saveData();

            const instruction = document.querySelector('.tree-instruction');
            if (instruction && this.elements.memoryTree.children.length > 5) {
                instruction.textContent = 'Your tree is flourishing! 🌳';
            }

            if (this.elements.memoryTree.children.length >= 3) {
                this.revealAudioOrQuote();
            }
        },

        createMemoryLeaf(x, y) {
            const leaf = document.createElement('div');
            leaf.className = 'memory-leaf';
            leaf.style.left = `${x}px`;
            leaf.style.top = `${y}px`;
            this.elements.memoryTree.appendChild(leaf);
        },

        setupWishJar() {
            const addWishBtn = document.getElementById('add-wish-btn');
            const wishNotes = document.getElementById('wish-notes');
            if (!addWishBtn || !wishNotes) return;

            const wishes = this.savedData.wishes || [];

            // Restore saved wishes
            wishes.forEach(wish => OtherMixin._createWishNote.call(this, wishNotes, wish));

            addWishBtn.addEventListener('click', () => {
                const defaultWishes = [
                    'Happiness always! 🌟',
                    'Dreams come true! 💫',
                    'Love & laughter! 😊',
                    'Peace & joy! 🕊️',
                    'Success & growth! 🌱',
                    'Health & harmony! 🍀',
                    'Adventure awaits! 🌈',
                    'Shine bright! ✨'
                ];

                const wish = defaultWishes[Math.floor(Math.random() * defaultWishes.length)];
                OtherMixin._createWishNote.call(this, wishNotes, wish);

                // Save wish
                if (!this.savedData.wishes) this.savedData.wishes = [];
                this.savedData.wishes.push(wish);
                this.saveData();

                // Animate jar
                const jar = document.querySelector('.wish-jar');
                if (jar) {
                    jar.style.animation = 'jarShake 0.4s ease-out';
                    setTimeout(() => { jar.style.animation = ''; }, 400);
                }
            });
        },

        _createWishNote(container, text) {
            const note = document.createElement('div');
            note.className = 'wish-note';
            note.textContent = text;
            note.style.cssText = `
                left: ${Math.random() * 60 + 10}%;
                animation: wishFloat ${Math.random() * 2 + 3}s ease-in-out ${Math.random() * 0.5}s infinite alternate;
            `;
            container.appendChild(note);
        },

        /* ─── Page 5: Farewell Stars ─── */

        setupOtherPage5() {
            OtherMixin.animateFarewellStars.call(this);
        },

        animateFarewellStars() {
            const stars = document.querySelectorAll('.farewell-star');
            if (!stars.length) return;

            stars.forEach((star, i) => {
                star.style.opacity = '0';
                star.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    star.style.transition = 'all 0.6s ease-out';
                    star.style.opacity = '1';
                    star.style.transform = 'translateY(0)';
                    // Continue twinkling
                    setTimeout(() => {
                        star.style.animation = `twinkle ${Math.random() * 2 + 2}s ease-in-out infinite alternate`;
                    }, 600);
                }, i * 300);
            });
        },

        /* ─── Final Animation ─── */

        createGenericAnimation() {
            const elements = [];

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
    };

    // Export EventModule interface — engine calls these hooks directly.
    // No prototype mutation.
    window.EventModules = window.EventModules || {};
    window.EventModules['other'] = {
        initialize(app) {},
        onPageEnter(page, app) {
            if (page === 2) OtherMixin.setupOtherPage2.call(app);
            else if (page === 4) OtherMixin.setupWishJar.call(app);
            else if (page === 5) OtherMixin.setupOtherPage5.call(app);
        },
        onUnlock(app) {}
    };

    console.log('Other/Generic module loaded');
})();
