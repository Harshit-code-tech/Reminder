/**
 * UnlockManager — password validation, slider unlock, and countdown logic.
 * Extracted from greeting_card.js.
 */

class UnlockManager {
    constructor(app) {
        this.app = app;
    }

    get elements() { return this.app.elements; }
    get cardContainer() { return this.app.cardContainer; }
    get audioManager() { return this.app.audioManager; }

    // ===== PASSWORD SYSTEM =====
    validatePassword() {
        const inputValue = this.elements.passwordInput?.value?.trim() || '';
        const eventId = this.cardContainer.dataset.eventId;
        const csrftoken = this.app.getCookie('csrftoken');

        if (!inputValue) {
            this.shakePasswordInput('Please enter a password');
            return;
        }

        // Show loading state
        this.elements.unlockButton.disabled = true;
        this.elements.unlockButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        fetch(`/reminders/card/${eventId}/validate-password/`, {
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
                this.app.unlocked = true;
                this.app.saveData({ unlocked: true });
                localStorage.removeItem('incorrectAttempts');
                const eventModule = this.app.getEventModule();
                if (eventModule?.onUnlock) eventModule.onUnlock(this.app);

                this.elements.passwordInput.classList.add('success');
                this.audioManager.playSuccessSound();
                this.app.showConfetti();
                this.app.showFeedback('Card unlocked successfully! 🎉', 'success');

                setTimeout(() => this.app.goToPage(2), 1000);
            } else {
                this.app.incorrectAttempts++;
                localStorage.setItem('incorrectAttempts', this.app.incorrectAttempts);

                if (this.app.incorrectAttempts >= 2 && this.elements.passwordHint) {
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
            this.app.showFeedback(message, 'error');
        }

        setTimeout(() => {
            this.elements.passwordInput.style.animation = '';
            this.elements.passwordInput.classList.remove('error');
        }, 500);
    }

    revealPassword() {
        if (!this.elements.revealPassword) return;

        const eventId = this.cardContainer.dataset.eventId;
        const csrftoken = this.app.getCookie('csrftoken');

        this.elements.revealPassword.textContent = 'Loading...';
        this.elements.revealPassword.style.pointerEvents = 'none';

        fetch(`/reminders/reveal-password/${eventId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
        })
        .then(res => res.json())
        .then(data => {
            if (data.password) {
                this.elements.revealPassword.textContent = data.password;
                this.elements.revealPassword.classList.add('unblur');
            } else {
                this.elements.revealPassword.textContent = 'Unable to reveal';
            }
        })
        .catch(() => {
            this.elements.revealPassword.textContent = 'Error - try again';
            this.elements.revealPassword.style.pointerEvents = 'auto';
        });
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
                    this.app.showThreadOfMemories();
                } else {
                    this.app.showMilestonePopup();
                }
            }
        }, 1000);
    }
}

window.UnlockManager = UnlockManager;
