/**
 * Anniversary Card Module
 * Contains anniversary-specific interactive logic.
 * Methods are mixed into GreetingCardApp prototype.
 */

(function() {
    'use strict';

    const AnniversaryMixin = {

        /* ─── Page 2: Heart Timeline + Love Counter ─── */

        setupAnniversaryPage2() {
            this.animateHeartTimeline();
            this.setupLoveCounter();
        },

        animateHeartTimeline() {
            const timeline = document.querySelector('.heart-timeline');
            if (!timeline) return;

            const line = timeline.querySelector('.timeline-line');
            const hearts = timeline.querySelectorAll('.timeline-heart');

            // Animate the line drawing
            if (line) {
                line.style.animation = 'timelineGrow 1.5s ease-out forwards';
            }

            // Animate hearts sequentially
            hearts.forEach((heart, i) => {
                heart.style.opacity = '0';
                heart.style.transform = 'scale(0)';
                setTimeout(() => {
                    heart.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    heart.style.opacity = '1';
                    heart.style.transform = 'scale(1)';
                }, 600 + (i * 500));
            });
        },

        setupLoveCounter() {
            const yearsEl = document.getElementById('years-together');
            const monthsEl = document.getElementById('months-together');
            const daysEl = document.getElementById('days-together');
            if (!yearsEl && !monthsEl && !daysEl) return;

            const eventDateStr = this.cardContainer.dataset.eventDate;
            if (!eventDateStr) return;

            const eventDate = new Date(eventDateStr);
            const now = new Date();
            if (isNaN(eventDate.getTime())) return;

            // Calculate difference
            let years = now.getFullYear() - eventDate.getFullYear();
            let months = now.getMonth() - eventDate.getMonth();
            let days = now.getDate() - eventDate.getDate();

            if (days < 0) {
                months--;
                const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            // Animate the counter numbers
            this._animateCounter(yearsEl, Math.max(0, years));
            setTimeout(() => this._animateCounter(monthsEl, Math.max(0, months)), 300);
            setTimeout(() => this._animateCounter(daysEl, Math.max(0, days)), 600);
        },

        _animateCounter(el, target) {
            if (!el) return;
            let current = 0;
            const step = Math.max(1, Math.ceil(target / 30));
            const interval = setInterval(() => {
                current = Math.min(current + step, target);
                el.textContent = current;
                if (current >= target) clearInterval(interval);
            }, 40);
        },

        /* ─── Page 4: Dance + Love Letter ─── */

        setupDanceButton() {
            if (!this.elements.danceButton || this.eventType !== 'anniversary') return;

            this.elements.danceButton.addEventListener('click', () => {
                this.startDanceAnimation();
            });
        },

        startDanceAnimation() {
            const danceAnimation = document.querySelector('.dance-animation');
            if (!danceAnimation) return;

            danceAnimation.innerHTML = '';
            danceAnimation.classList.add('active');

            const dancers = document.createElement('div');
            dancers.textContent = '💃 🕺';
            dancers.style.fontSize = '3rem';
            dancers.style.animation = 'bounce 2s infinite';

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

            setTimeout(() => {
                this.revealAudioOrQuote();
            }, 2000);
        },

        setupLoveLetter() {
            const envelope = document.getElementById('letter-envelope');
            const letterContent = document.getElementById('letter-content');
            if (!envelope || !letterContent) return;

            const openHandler = () => {
                if (envelope.classList.contains('opened')) return;
                envelope.classList.add('opened');

                // Animate envelope flap
                const flap = envelope.querySelector('.envelope-flap');
                if (flap) {
                    flap.style.animation = 'envelopeOpen 0.6s ease-out forwards';
                }

                // Reveal letter after envelope opens
                setTimeout(() => {
                    envelope.style.animation = 'slideUp 0.4s ease-out forwards';

                    setTimeout(() => {
                        letterContent.classList.remove('hidden');
                        letterContent.style.animation = 'letterUnfold 0.8s ease-out forwards';

                        // Typewriter effect for the letter body
                        const letterBody = letterContent.querySelector('.letter-body');
                        if (letterBody) {
                            const text = letterBody.textContent;
                            letterBody.textContent = '';
                            letterBody.style.opacity = '1';

                            let charIndex = 0;
                            const typeInterval = setInterval(() => {
                                if (charIndex < text.length) {
                                    letterBody.textContent += text[charIndex];
                                    charIndex++;
                                } else {
                                    clearInterval(typeInterval);
                                    // Show closing
                                    const closing = letterContent.querySelector('.letter-closing');
                                    if (closing) {
                                        closing.style.animation = 'fadeInUp 0.5s ease-out forwards';
                                    }
                                }
                            }, 25);
                        }
                    }, 400);
                }, 600);
            };

            envelope.addEventListener('click', openHandler);
            envelope.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openHandler();
                }
            });
        },

        /* ─── Page 5: Farewell — Intertwined Hearts + Promise Rings ─── */

        setupAnniversaryPage5() {
            this.animateIntertwinedHearts();
            this.animatePromiseRings();
        },

        animateIntertwinedHearts() {
            const hearts = document.querySelectorAll('.heart-path');
            if (!hearts.length) return;

            hearts.forEach((path, i) => {
                const length = path.getTotalLength ? path.getTotalLength() : 200;
                path.style.strokeDasharray = length;
                path.style.strokeDashoffset = length;
                path.style.animation = `heartDraw 2s ease-out ${i * 0.5}s forwards`;
                path.style.fill = 'none';

                // Fill in after draw completes
                setTimeout(() => {
                    path.style.transition = 'fill 1s ease-in';
                    path.style.fill = 'rgba(233, 30, 99, 0.2)';
                }, 2000 + (i * 500));
            });
        },

        animatePromiseRings() {
            const rings = document.querySelectorAll('.promise-rings .ring');
            if (!rings.length) return;

            rings.forEach((ring, i) => {
                ring.style.opacity = '0';
                ring.style.transform = i === 0 ? 'translateX(-40px)' : 'translateX(40px)';
                setTimeout(() => {
                    ring.style.transition = 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    ring.style.opacity = '1';
                    ring.style.transform = 'translateX(0)';
                }, 500 + (i * 300));
            });

            // Interlock animation after both arrive
            setTimeout(() => {
                const container = document.querySelector('.promise-rings');
                if (container) {
                    container.style.animation = 'ringsGlow 2s ease-in-out infinite alternate';
                }
            }, 1500);
        },

        /* ─── Final Animation ─── */

        createAnniversaryAnimation() {
            const elements = [];

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
    };

    // Apply mixin
    if (typeof GreetingCardApp !== 'undefined') {
        Object.keys(AnniversaryMixin).forEach(key => {
            GreetingCardApp.prototype[key] = AnniversaryMixin[key];
        });
        console.log('Anniversary module loaded');
    } else {
        window._anniversaryMixin = AnniversaryMixin;
    }
})();
