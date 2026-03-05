/**
 * Birthday Card Module
 * Contains birthday-specific interactive logic.
 * Methods are mixed into GreetingCardApp prototype.
 */

(function() {
    'use strict';

    const BirthdayMixin = {

        /* ─── Page 2: Slider + Countdown + Surprise Reveal ─── */

        setupBirthdayPage2() {
            this.setupSliderUnlock();
        },

        setupSliderUnlock() {
            if (!this.elements.sliderTrack || !this.elements.sliderThumb || !this.elements.yesButton) return;

            let isDragging = false;
            let startX = 0;
            let currentX = 0;
            let maxMove = 0;

            const updateMaxMove = () => {
                maxMove = this.elements.sliderTrack.offsetWidth - this.elements.sliderThumb.offsetWidth;
            };

            updateMaxMove();
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

                if (currentX >= maxMove - 5) {
                    this.unlockYesButton();
                }
            };

            const onDragEnd = () => {
                if (!isDragging) return;
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

            this.elements.sliderThumb.addEventListener('mousedown', onDragStart);
            this.elements.sliderThumb.addEventListener('touchstart', onDragStart, { passive: false });

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

            if (this.elements.yesButton) {
                this.elements.yesButton.addEventListener('click', () => this.startCountdown());
            }
        },

        unlockYesButton() {
            if (!this.elements.sliderTrack || !this.elements.yesButton) return;

            this.elements.sliderTrack.classList.add('unlocked');
            setTimeout(() => {
                this.elements.sliderTrack.style.display = 'none';
                this.elements.yesButton.classList.remove('hidden');
                this.elements.yesButton.style.display = 'flex';
                this.elements.yesButton.focus();
            }, 300);
        },

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

                    // Show birthday surprise reveal
                    this.revealBirthdaySurprise();

                    const hasThreadOfMemories = this.cardContainer.dataset.threadOfMemories === 'true';
                    if (hasThreadOfMemories) {
                        this.showThreadOfMemories();
                    } else {
                        this.showMilestonePopup();
                    }
                }
            }, 1000);
        },

        revealBirthdaySurprise() {
            const surprise = document.getElementById('birthday-surprise');
            if (!surprise) return;

            surprise.classList.remove('hidden');
            surprise.style.animation = 'birthdaySurpriseReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

            // Animate the gift box
            const giftBox = surprise.querySelector('.gift-box');
            if (giftBox) {
                setTimeout(() => {
                    giftBox.classList.add('opened');
                }, 400);
            }

            this.showConfetti();
        },

        /* ─── Page 4: Cake + Wish ─── */

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
        },

        blowOutCandles() {
            if (this.elements.birthdayCake.classList.contains('blown-out')) return;

            this.elements.birthdayCake.classList.add('blown-out');

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

            const instruction = document.querySelector('.cake-instruction');
            if (instruction) {
                instruction.textContent = 'Your wish has been made! 🌟';
            }

            setTimeout(() => {
                this.showConfetti();
                this.revealBirthdayWish();
                this.revealAudioOrQuote();
                blowEffect.remove();
            }, 1000);

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
        },

        revealBirthdayWish() {
            const wishContainer = document.getElementById('birthday-wish-container');
            if (!wishContainer) return;

            wishContainer.classList.remove('hidden');
            wishContainer.style.animation = 'wishReveal 0.6s ease-out forwards';

            // Animate stars sequentially
            const stars = wishContainer.querySelectorAll('.wish-star');
            stars.forEach((star, i) => {
                setTimeout(() => {
                    star.style.animation = 'wishStarSparkle 1s ease-in-out forwards';
                    star.style.animationDelay = '0s';
                }, 300 + (i * 200));
            });

            // Show wish result after stars finish
            const wishResult = wishContainer.querySelector('.wish-result');
            if (wishResult) {
                setTimeout(() => {
                    wishResult.style.opacity = '1';
                    wishResult.style.animation = 'fadeInUp 0.5s ease-out forwards';
                }, 1500);
            }
        },

        /* ─── Page 5: Farewell — Balloons + Badge ─── */

        setupBirthdayPage5() {
            this.animateBirthdayBalloons();
            this.animateBirthdayBadge();
        },

        animateBirthdayBalloons() {
            const balloons = document.querySelectorAll('.birthday-balloons .balloon');
            if (!balloons.length) return;

            balloons.forEach((balloon, i) => {
                balloon.style.animation = `balloonFloat 3s ease-in-out ${i * 0.4}s infinite alternate`;
            });
        },

        animateBirthdayBadge() {
            const badge = document.querySelector('.birthday-badge');
            if (!badge) return;

            badge.style.animation = 'badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';

            const sparkle = badge.querySelector('.badge-sparkle');
            if (sparkle) {
                sparkle.style.animation = 'sparkleRotate 2s linear infinite';
            }
        },

        /* ─── Final Animation ─── */

        createBirthdayAnimation() {
            const elements = [];

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
    };

    // Apply mixin to GreetingCardApp prototype when available
    if (typeof GreetingCardApp !== 'undefined') {
        Object.keys(BirthdayMixin).forEach(key => {
            GreetingCardApp.prototype[key] = BirthdayMixin[key];
        });
        console.log('Birthday module loaded');
    } else {
        window._birthdayMixin = BirthdayMixin;
    }
})();
