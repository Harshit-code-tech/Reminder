/**
 * Birthday Card Module
 * Contains birthday-specific interactive logic.
 * Methods are mixed into GreetingCardApp prototype.
 */

(function() {
    'use strict';

    const BirthdayMixin = {

        _getBirthdayRuntime() {
            this.runtime = this.runtime || {};
            this.runtime.event = this.runtime.event || {};
            this.runtime.event.birthday = this.runtime.event.birthday || {};
            return this.runtime.event.birthday;
        },

        _runOnce(key, fn) {
            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            rt._once = rt._once || {};
            if (rt._once[key]) return;
            rt._once[key] = true;
            fn();
        },

        /* ─── Page 2: Slider + Countdown + Surprise Reveal ─── */

        /* ─── Birthday Loading Screen (Diya Wish Loader) ─── */

        initBirthdayLoadingScreen() {
            const loadingScreen = document.getElementById('birthday-loading');
            if (!loadingScreen) return;

            const confettiContainer = document.getElementById('birthday-loading-confetti');

            // Phase timeline:
            // 0ms    — spark appears (CSS handles this automatically)
            // 400ms  — diya grows (add class)
            // 800ms  — flame lights (add class)
            // 1200ms — flame flickers (CSS keyframe kicks in)
            // 1800ms — confetti burst
            // 2200ms — fade out + card begins

            const diya = loadingScreen.querySelector('.birthday-loading-diya');
            if (!diya) return;

            setTimeout(() => diya.classList.add('spark-visible'), 100);
            setTimeout(() => diya.classList.add('diya-grown'), 400);
            setTimeout(() => diya.classList.add('flame-lit'), 800);

            // Confetti burst before exit
            setTimeout(() => {
                if (confettiContainer) {
                    BirthdayMixin.spawnLoadingConfetti(confettiContainer);
                }
            }, 1800);

            // Fade out and remove
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 600);
            }, 2200);
        },

        spawnLoadingConfetti(container) {
            const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#60a5fa', '#34d399', '#fb923c'];
            const count = 30;
            for (let i = 0; i < count; i++) {
                const piece = document.createElement('div');
                piece.className = 'birthday-loading-confetti-piece';
                piece.style.left = `${40 + Math.random() * 20}%`;
                piece.style.top = `${35 + Math.random() * 10}%`;
                piece.style.background = colors[i % colors.length];
                const dx = (Math.random() - 0.5) * 300;
                const dy = (Math.random() - 0.7) * 350;
                piece.style.setProperty('--dx', `${dx}px`);
                piece.style.setProperty('--dy', `${dy}px`);
                piece.style.animationDelay = `${Math.random() * 0.15}s`;
                container.appendChild(piece);
            }
        },

        setupBirthdayPage2() {
            BirthdayMixin.setupSliderUnlock.call(this);
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
                    BirthdayMixin.unlockYesButton.call(this);
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
                    if (currentX >= maxMove - 5) BirthdayMixin.unlockYesButton.call(this);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentX = Math.max(currentX - step, 0);
                    this.elements.sliderThumb.style.left = currentX + 'px';
                }
            });

            if (this.elements.yesButton) {
                this.elements.yesButton.addEventListener('click', () => BirthdayMixin.startCountdown.call(this));
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
                    BirthdayMixin.revealBirthdaySurprise.call(this);

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

            BirthdayMixin.setupCandleBlowDetection.call(this);
            BirthdayMixin.setupWishStarSystem.call(this);

            this.elements.birthdayCake.addEventListener('click', () => {
                BirthdayMixin.blowOutCandles.call(this);
            });

            this.elements.birthdayCake.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    BirthdayMixin.blowOutCandles.call(this);
                }
            });
        },

        blowOutCandles() {
            if (this.elements.birthdayCake.classList.contains('blown-out')) return;

            this.elements.birthdayCake.classList.add('blown-out');

            BirthdayMixin.teardownCandleBlowDetection.call(this);
            BirthdayMixin.createCandleSmoke.call(this);

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
                instruction.textContent = 'Your wish has been made! 🌟 Tap a star…';
            }

            setTimeout(() => {
                this.showConfetti();
                BirthdayMixin.revealBirthdayWish.call(this);
                this.revealAudioOrQuote();
                BirthdayMixin.showNightSky.call(this);
                blowEffect.remove();
            }, 1000);
        },

        setupCandleBlowDetection() {
            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            if (rt.mic?.active) return;
            if (!navigator.mediaDevices?.getUserMedia) return;

            rt.mic = {
                active: true,
                stream: null,
                audioContext: null,
                analyser: null,
                data: null,
                rafId: null,
                baseline: 0,
                baselineSamples: 0,
                lastTriggerAt: 0
            };

            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    if (!rt.mic?.active) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }

                    rt.mic.stream = stream;
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;

                    rt.mic.audioContext = new AudioCtx();
                    rt.mic.audioContext.resume?.().catch(() => {});
                    const source = rt.mic.audioContext.createMediaStreamSource(stream);
                    rt.mic.analyser = rt.mic.audioContext.createAnalyser();
                    rt.mic.analyser.fftSize = 1024;
                    rt.mic.data = new Uint8Array(rt.mic.analyser.fftSize);
                    source.connect(rt.mic.analyser);

                    const detect = () => {
                        if (!rt.mic?.active || !rt.mic.analyser || !rt.mic.data) return;
                        rt.mic.analyser.getByteTimeDomainData(rt.mic.data);

                        // RMS amplitude in ~[0,1]
                        let sumSq = 0;
                        for (let i = 0; i < rt.mic.data.length; i++) {
                            const v = (rt.mic.data[i] - 128) / 128;
                            sumSq += v * v;
                        }
                        const rms = Math.sqrt(sumSq / rt.mic.data.length);

                        // Baseline calibration (first ~0.6s)
                        if (rt.mic.baselineSamples < 40) {
                            rt.mic.baseline = (rt.mic.baseline * rt.mic.baselineSamples + rms) / (rt.mic.baselineSamples + 1);
                            rt.mic.baselineSamples++;
                        } else {
                            // Slow baseline adaptation (ignore spikes)
                            const capped = Math.min(rms, rt.mic.baseline + 0.05);
                            rt.mic.baseline = rt.mic.baseline * 0.985 + capped * 0.015;
                        }

                        const now = Date.now();
                        const cooldownOk = now - rt.mic.lastTriggerAt > 1200;
                        const threshold = Math.max(0.06, rt.mic.baseline * 3.2 + 0.02);
                        if (cooldownOk && rms > threshold && this.elements.birthdayCake && !this.elements.birthdayCake.classList.contains('blown-out')) {
                            rt.mic.lastTriggerAt = now;
                            BirthdayMixin.blowOutCandles.call(this);
                            return;
                        }

                        rt.mic.rafId = window.requestAnimationFrame(detect);
                    };

                    rt.mic.rafId = window.requestAnimationFrame(detect);
                })
                .catch(() => {
                    // Permission denied / no mic — click fallback remains.
                });
        },

        teardownCandleBlowDetection() {
            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            if (!rt.mic) return;

            rt.mic.active = false;
            if (rt.mic.rafId) {
                window.cancelAnimationFrame(rt.mic.rafId);
            }
            if (rt.mic.stream) {
                rt.mic.stream.getTracks().forEach(t => t.stop());
            }
            if (rt.mic.audioContext) {
                rt.mic.audioContext.close?.().catch(() => {});
            }
            rt.mic = null;
        },

        createCandleSmoke() {
            const cake = this.elements.birthdayCake;
            if (!cake) return;

            const flames = cake.querySelectorAll('.candle-flame');
            const smokeCount = Math.max(3, Math.min(8, flames.length || 5));

            for (let i = 0; i < smokeCount; i++) {
                const smoke = document.createElement('div');
                smoke.className = 'candle-smoke';
                smoke.style.left = `${40 + Math.random() * 20}%`;
                smoke.style.top = `${12 + Math.random() * 10}%`;
                smoke.style.animationDelay = `${i * 0.07}s`;
                cake.appendChild(smoke);
                setTimeout(() => smoke.remove(), 1400);
            }
        },

        setupWishStarSystem() {
            BirthdayMixin._runOnce.call(this, 'wishStarsBound', () => {
                const sky = document.getElementById('birthday-night-sky');
                if (!sky) return;

                const starContainer = sky.querySelector('.night-sky-stars');
                const stars = Array.from(sky.querySelectorAll('.birthday-star'));
                const toast = document.getElementById('birthday-wish-toast');
                if (!starContainer || !stars.length) return;

                const positionStars = () => {
                    const rect = starContainer.getBoundingClientRect();
                    const pad = 14;
                    stars.forEach((star, idx) => {
                        const x = pad + Math.random() * Math.max(0, rect.width - pad * 2);
                        const y = pad + Math.random() * Math.max(0, rect.height - pad * 2);
                        star.style.left = `${x}px`;
                        star.style.top = `${y}px`;
                        star.style.opacity = `${0.65 + (idx % 3) * 0.1}`;
                    });
                };

                const fireShootingStar = (fromEl) => {
                    const starRect = fromEl.getBoundingClientRect();
                    const contRect = starContainer.getBoundingClientRect();
                    const x = starRect.left - contRect.left;
                    const y = starRect.top - contRect.top;

                    const shooting = document.createElement('div');
                    shooting.className = 'shooting-star';
                    shooting.style.left = `${x}px`;
                    shooting.style.top = `${y}px`;
                    starContainer.appendChild(shooting);
                    setTimeout(() => shooting.remove(), 900);

                    if (toast) {
                        toast.textContent = 'A wish has been sent to the stars ✨';
                        toast.style.opacity = '1';
                    }

                    // Small celebratory tone (safe, no dependency)
                    this.audioManager?.generateTone?.(659.25, 0.12, 'triangle');
                };

                // Reposition stars on resize (reposition on show happens in showNightSky)
                window.addEventListener('resize', positionStars);

                stars.forEach((star) => {
                    star.addEventListener('click', () => {
                        fireShootingStar(star);
                    });
                });

                // Store for reuse when the sky is shown.
                const rt = BirthdayMixin._getBirthdayRuntime.call(this);
                rt._positionWishStars = positionStars;
            });
        },

        showNightSky() {
            const sky = document.getElementById('birthday-night-sky');
            if (!sky) return;
            sky.classList.remove('hidden');

            const toast = document.getElementById('birthday-wish-toast');
            if (toast) toast.textContent = '';

            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            if (typeof rt._positionWishStars === 'function') {
                // Wait one frame so layout has non-zero dimensions
                window.requestAnimationFrame(() => rt._positionWishStars());
            }
        },

        hideNightSky() {
            const sky = document.getElementById('birthday-night-sky');
            if (!sky) return;
            sky.classList.add('hidden');
        },

        /* ─── Page 3: Pseudo-dynamic micro-sections ─── */

        setupBirthdayPage3() {
            if (this.eventType !== 'birthday') return;

            const container = document.querySelector('.birthday-page3[data-page3-sections="true"]');
            if (!container) return;

            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            rt.page3 = rt.page3 || { index: 0, messageTyped: false, timers: [] };

            const sections = Array.from(container.querySelectorAll('.page3-section'));
            const tabs = Array.from(container.querySelectorAll('.page3-tab'));
            const dots = Array.from(container.querySelectorAll('.page3-dot'));
            const prevBtn = document.getElementById('page3-prev-section');
            const nextBtn = document.getElementById('page3-next-section');

            const clampIndex = (i) => Math.max(0, Math.min(i, sections.length - 1));

            const showSection = (i) => {
                const idx = clampIndex(i);
                rt.page3.index = idx;

                sections.forEach((sec, sidx) => {
                    const active = sidx === idx;
                    sec.classList.toggle('active', active);
                    sec.setAttribute('aria-hidden', active ? 'false' : 'true');
                });
                tabs.forEach((tab, tidx) => {
                    const active = tidx === idx;
                    tab.classList.toggle('active', active);
                    tab.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                dots.forEach((dot, didx) => {
                    dot.classList.toggle('active', didx === idx);
                });

                if (prevBtn) prevBtn.disabled = idx === 0;
                if (nextBtn) nextBtn.disabled = idx === sections.length - 1;

                // One-time animations
                if (idx === 1 && !rt.page3.messageTyped) {
                    const typeEl = document.getElementById('birthday-message-typewriter');
                    const message = typeEl?.dataset?.message || '';
                    if (typeEl && message) {
                        rt.page3.messageTyped = true;
                        BirthdayMixin.startTypewriter.call(this, typeEl, message, rt.page3);
                    }
                }
            };

            BirthdayMixin._runOnce.call(this, 'page3Bound', () => {
                tabs.forEach((tab) => {
                    tab.addEventListener('click', () => showSection(Number(tab.dataset.section || 0)));
                });

                if (prevBtn) prevBtn.addEventListener('click', () => showSection(rt.page3.index - 1));
                if (nextBtn) nextBtn.addEventListener('click', () => showSection(rt.page3.index + 1));

                const timeline = document.getElementById('birthday-timeline');
                const fallback = container.querySelector('.timeline-fallback');
                if (timeline) {
                    const items = BirthdayMixin.buildTimelineItems.call(this);
                    timeline.innerHTML = '';
                    if (items.length >= 2) {
                        items.forEach((it) => timeline.appendChild(it));
                        if (fallback) fallback.style.display = 'none';
                    } else {
                        if (fallback) fallback.style.display = 'block';
                    }
                }
            });

            showSection(rt.page3.index);
        },

        buildTimelineItems() {
            let memoriesData = [];
            try {
                const memoriesStr = this.cardContainer?.dataset?.memories || '[]';
                memoriesData = JSON.parse(memoriesStr);
            } catch {
                memoriesData = [];
            }

            if (!Array.isArray(memoriesData)) return [];

            return memoriesData
                .filter(Boolean)
                .slice(0, 8)
                .map((memory) => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';

                    const year = document.createElement('div');
                    year.className = 'timeline-year';
                    year.textContent = memory.year || 'Moment';

                    const text = document.createElement('div');
                    text.className = 'timeline-text';
                    const title = memory.title || 'A special moment';
                    const desc = memory.description || '';
                    text.textContent = desc ? `${title} — ${desc}` : title;

                    item.appendChild(year);
                    item.appendChild(text);
                    return item;
                });
        },

        startTypewriter(el, text, page3State) {
            el.textContent = '';
            const chars = Array.from(String(text));

            let i = 0;
            const tick = () => {
                if (!el.isConnected) return;
                el.textContent += chars[i] || '';
                i++;
                if (i < chars.length) {
                    const t = window.setTimeout(tick, 18);
                    page3State?.timers?.push(t);
                }
            };
            tick();
        },

        teardownBirthdayPage3() {
            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            const timers = rt.page3?.timers || [];
            timers.forEach((t) => window.clearTimeout(t));
            if (rt.page3) rt.page3.timers = [];
        },

        /* ─── Page 5: interactive balloons (lightweight physics) ─── */

        setupInteractiveBalloons() {
            if (this.eventType !== 'birthday') return;

            const container = document.querySelector('.birthday-balloons');
            if (!container) return;

            const balloons = Array.from(container.querySelectorAll('.balloon'));
            if (!balloons.length) return;

            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            if (rt.balloonsSystem?.active) return;

            const rect = () => container.getBoundingClientRect();

            // First-time binding creates the state + listeners. Subsequent enters only restart the loop.
            if (!rt.balloonsSystem) {
                rt.balloonsSystem = {
                    active: false,
                    rafId: null,
                    container,
                    rect,
                    states: balloons.map((el) => ({
                        el,
                        x: 0,
                        y: 0,
                        vx: (Math.random() - 0.5) * 0.6,
                        vy: -0.5 - Math.random() * 0.6,
                        dragging: false,
                        pointerId: null,
                        downX: 0,
                        downY: 0,
                        moved: false,
                        lastMoveAt: 0
                    }))
                };
            }

            const sys = rt.balloonsSystem;
            const states = sys.states;

            const init = () => {
                const r = rect();
                states.forEach((s, i) => {
                    if (!s.el.isConnected) return;
                    s.x = 40 + Math.random() * Math.max(0, r.width - 80);
                    s.y = r.height - (40 + i * 18);
                    s.el.style.left = `${s.x}px`;
                    s.el.style.top = `${s.y}px`;
                });
            };

            const popAt = (s) => {
                if (!s.el.isConnected) return;
                if (s.el.classList.contains('popped')) return;

                s.el.classList.add('popped');
                this.audioManager?.generateTone?.(420, 0.07, 'square');

                // Small local confetti burst
                const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#60a5fa'];
                const pieces = 14;
                for (let i = 0; i < pieces; i++) {
                    const c = document.createElement('div');
                    c.className = 'birthday-pop-confetti';
                    c.style.left = `${s.x}px`;
                    c.style.top = `${s.y}px`;
                    c.style.background = colors[i % colors.length];
                    const dx = (Math.random() - 0.5) * 120;
                    const dy = (Math.random() - 0.8) * 140;
                    c.style.setProperty('--dx', `${dx}px`);
                    c.style.setProperty('--dy', `${dy}px`);
                    container.appendChild(c);
                    setTimeout(() => c.remove(), 700);
                }

                setTimeout(() => {
                    s.el.remove();
                }, 240);
            };

            BirthdayMixin._runOnce.call(this, 'balloonsBound', () => {
                states.forEach((s) => {
                    if (!s.el.isConnected) return;

                    s.el.addEventListener('pointerdown', (e) => {
                        s.dragging = true;
                        s.pointerId = e.pointerId;
                        s.downX = e.clientX;
                        s.downY = e.clientY;
                        s.moved = false;
                        s.lastMoveAt = Date.now();
                        s.el.setPointerCapture?.(e.pointerId);
                    });

                    s.el.addEventListener('pointermove', (e) => {
                        if (!s.dragging || s.pointerId !== e.pointerId) return;
                        const r = rect();
                        const x = e.clientX - r.left;
                        const y = e.clientY - r.top;
                        s.x = Math.max(12, Math.min(r.width - 12, x));
                        s.y = Math.max(12, Math.min(r.height - 12, y));
                        s.el.style.left = `${s.x}px`;
                        s.el.style.top = `${s.y}px`;
                        if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) > 6) s.moved = true;
                        s.lastMoveAt = Date.now();
                    });

                    s.el.addEventListener('pointerup', (e) => {
                        if (s.pointerId !== e.pointerId) return;
                        s.dragging = false;
                        s.pointerId = null;

                        // If barely moved: pop
                        if (!s.moved) {
                            popAt(s);
                            return;
                        }

                        // Give a gentle release impulse
                        s.vx = (Math.random() - 0.5) * 0.9;
                        s.vy = -0.6 - Math.random() * 0.8;
                    });
                });
            });

            init();

            let last = performance.now();
            sys.active = true;

            const tick = (now) => {
                if (!sys.active) return;
                const dt = Math.min(32, now - last);
                last = now;
                const r = rect();

                states.forEach((s) => {
                    if (!s.el.isConnected) return;
                    if (s.dragging || s.el.classList.contains('popped')) return;

                    // Upward float + small drift
                    s.vy += (-0.0009) * dt;
                    s.vx += ((Math.random() - 0.5) * 0.0007) * dt;
                    s.vx *= 0.995;
                    s.vy *= 0.995;

                    s.x += s.vx * dt;
                    s.y += s.vy * dt;

                    // Bounds (wrap to bottom when reaching top)
                    if (s.x < 10) { s.x = 10; s.vx = Math.abs(s.vx); }
                    if (s.x > r.width - 10) { s.x = r.width - 10; s.vx = -Math.abs(s.vx); }
                    if (s.y < 10) {
                        s.y = r.height - 10;
                        s.vy = -0.4 - Math.random() * 0.8;
                        s.x = 20 + Math.random() * Math.max(0, r.width - 40);
                    }
                    if (s.y > r.height - 10) { s.y = r.height - 10; s.vy = -Math.abs(s.vy); }

                    s.el.style.left = `${s.x}px`;
                    s.el.style.top = `${s.y}px`;
                });

                sys.rafId = window.requestAnimationFrame(tick);
            };

            sys.rafId = window.requestAnimationFrame(tick);
        },

        teardownInteractiveBalloons() {
            const rt = BirthdayMixin._getBirthdayRuntime.call(this);
            if (!rt.balloonsSystem) return;
            rt.balloonsSystem.active = false;
            if (rt.balloonsSystem.rafId) window.cancelAnimationFrame(rt.balloonsSystem.rafId);
            rt.balloonsSystem.rafId = null;
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
            BirthdayMixin.animateBirthdayBalloons.call(this);
            BirthdayMixin.animateBirthdayBadge.call(this);
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

    // Export EventModule interface — engine calls these hooks directly.
    // No prototype mutation.
    window.EventModules = window.EventModules || {};
    window.EventModules['birthday'] = {
        initialize(app) {
            app._birthday = app._birthday || {};
            BirthdayMixin.initBirthdayLoadingScreen.call(app);
        },
        onPageEnter(page, app) {
            if (page === 2) BirthdayMixin.setupBirthdayPage2.call(app);
            else if (page === 3) BirthdayMixin.setupBirthdayPage3.call(app);
            else if (page === 4) BirthdayMixin.setupBirthdayCake.call(app);
            else if (page === 5) {
                BirthdayMixin.setupInteractiveBalloons.call(app);
                BirthdayMixin.animateBirthdayBadge.call(app);
            }
        },
        onPageLeave(page, app) {
            if (page === 3) BirthdayMixin.teardownBirthdayPage3.call(app);
            if (page === 4) {
                BirthdayMixin.teardownCandleBlowDetection.call(app);
                BirthdayMixin.hideNightSky.call(app);
            }
            if (page === 5) BirthdayMixin.teardownInteractiveBalloons.call(app);
        },
        onUnlock(app) {}
    };

    console.log('Birthday module loaded');
})();
