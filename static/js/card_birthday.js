/**
 * Birthday Card Module — Full Interactive Ceremony (5-Page)
 *
 * Ceremony arc:
 *   Page 1 — Welcome / Unlock (engine-owned, birthday-assisted via onUnlock)
 *   Page 2 — Open the Gift (3-step unwrap ritual, replaces old slider)
 *   Page 3 — Memory Snapshot (pseudo-dynamic micro-sections + caption spotlight)
 *   Page 4 — Make a Wish (multi-step candle blow + night-sky wish stars)
 *   Page 5 — Farewell / Celebration (balloons + badge + share cue)
 *
 * Registered via window.EventModules['birthday'].
 * No prototype mutation on GreetingCardApp.
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════
       Helpers
       ═══════════════════════════════════════════════════ */

    const BirthdayMixin = {

        _getBirthdayRuntime(app) {
            const ctx = app || this;
            ctx.runtime = ctx.runtime || {};
            ctx.runtime.event = ctx.runtime.event || {};
            ctx.runtime.event.birthday = ctx.runtime.event.birthday || {};
            return ctx.runtime.event.birthday;
        },

        /** Run fn at most once per key (runtime-scoped, not persisted). */
        _runOnce(app, key, fn) {
            const rt = BirthdayMixin._getBirthdayRuntime(app);
            rt._once = rt._once || {};
            if (rt._once[key]) return;
            // Allow deferred binding: if fn returns false, keep key unbound so a later page enter can retry.
            const bound = fn();
            if (bound !== false) rt._once[key] = true;
        },

        /* ═══════════════════════════════════════════════════
           Loading Screen — World-Entry Ceremony
           Full-screen blocking overlay. Card stays hidden
           until this completes.
           Timeline: spark → grow bowl → ignite → bloom light → room reveal → done → reveal card
           ═══════════════════════════════════════════════════ */

        initBirthdayLoadingScreen(app) {
            var loader = document.getElementById('bday-loader');
            if (!loader) {
                // No loader in DOM — just reveal card immediately
                BirthdayMixin._revealCardUI();
                return;
            }

            // Prevent double-start (e.g. EventModule.initialize + fallback boot)
            if (window.__bdayLoaderStarted) return;
            window.__bdayLoaderStarted = true;

            var log = function () {
                try {
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift('[bday-loader]');
                    console.log.apply(console, args);
                } catch (e) {}
            };

            var diya  = document.getElementById('bday-loader-diya');
            var bloom = document.getElementById('bday-loader-bloom');
            var room  = document.getElementById('bday-loader-room');
            var text  = document.getElementById('bday-loader-text');
            var spark = document.getElementById('bday-loader-spark');

            if (!diya) {
                loader.remove();
                BirthdayMixin._revealCardUI();
                return;
            }

            log('start', {
                hasDiya: !!diya,
                hasBloom: !!bloom,
                hasRoom: !!room,
                hasText: !!text,
                hasSpark: !!spark
            });

            // Timeline (all ms values from page-load):
            // 0ms       — text appears
            // 800ms     — bowl grows in
            // 2000ms    — spark strikes (sparkle of life)
            // 3300ms    — flame ignites + local glow
            // 3800ms    — bloom light starts expanding, room wallpaper fades in
            // 5500ms    — text changes to "bright" color
            // 6500ms    — loader fades out
            // 7500ms    — loader removed from DOM, card revealed

            // Step 0: Show text
            setTimeout(function() {
                if (text) text.classList.add('visible');
                log('step: text visible');
            }, 0);

            // Step 1: Bowl grows
            setTimeout(function() {
                diya.classList.add('grown');
                log('step: grown');
            }, 800);

            // Step 2: Spark strike
            setTimeout(function() {
                if (spark) spark.classList.add('spark-strike');
                log('step: spark strike');
            }, 2000);

            // Step 3: Ignite (flame + glow)
            setTimeout(function() {
                diya.classList.add('ignite');
                log('step: ignite');
            }, 3300);

            // Step 4: Light bloom expands + room reveals
            setTimeout(function() {
                if (bloom) bloom.classList.add('lit');
                if (room) room.classList.add('visible');
                if (text) text.classList.add('bright');
                log('step: bloom+room');
            }, 3800);

            // Step 5: Fade out loader
            setTimeout(function() {
                loader.classList.add('done');
                log('step: done (fade out)');
            }, 6500);

            // Step 6: Remove loader, reveal card
            setTimeout(function() {
                loader.remove();
                BirthdayMixin._revealCardUI();
                log('step: removed, revealed card');
            }, 7500);

            // Watchdog: if for any reason the timeline doesn't apply classes,
            // force a visible state so users never see "only dark".
            setTimeout(function () {
                if (!diya.isConnected) return;
                if (!diya.classList.contains('grown')) {
                    log('watchdog: forcing grown');
                    diya.classList.add('grown');
                }
            }, 1200);

            setTimeout(function () {
                if (!diya.isConnected) return;
                if (!diya.classList.contains('ignite')) {
                    log('watchdog: forcing ignite');
                    diya.classList.add('ignite');
                }
            }, 3800);

            setTimeout(function () {
                if (bloom && bloom.isConnected && !bloom.classList.contains('lit')) {
                    log('watchdog: forcing bloom');
                    bloom.classList.add('lit');
                }
                if (room && room.isConnected && !room.classList.contains('visible')) {
                    log('watchdog: forcing room');
                    room.classList.add('visible');
                }
                if (text && text.isConnected) {
                    text.classList.add('visible');
                    text.classList.add('bright');
                }
            }, 4500);
        },

        /** Remove the hiding class from card container + show nav/toggle */
        _revealCardUI() {
            var cc = document.querySelector('.card-container.bday-loader-hidden');
            if (cc) {
                cc.classList.remove('bday-loader-hidden');
                cc.style.opacity = '0';
                cc.style.transition = 'opacity 0.6s ease';
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        cc.style.opacity = '1';
                    });
                });
            }
            // Reveal nav, theme toggle, background effects
            document.querySelectorAll('.bday-loader-hidden-nav').forEach(function(el) {
                el.classList.remove('bday-loader-hidden-nav');
                el.style.opacity = '0';
                el.style.transition = 'opacity 0.6s ease';
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        el.style.opacity = '1';
                    });
                });
            });
        },

        /* ═══════════════════════════════════════════════════
           Page 1 — onUnlock: Birthday welcome toast
           ═══════════════════════════════════════════════════ */


onBirthdayUnlock(app) {
            if (!app.savedData.birthday_unlock_toast_shown) {
                app.showFeedback('🎉 Welcome to your birthday celebration!', 'success');
                app.saveData({ birthday_unlock_toast_shown: true });
            }
            app.audioManager?.startBackgroundMusic?.();
            
            // Re-trigger page 1 check to show tap-to-begin if they just unlocked
            if (app.currentPage === 1) {
                // If they just unlocked via password, we might want to hide the password container
                const pwdForm = document.querySelector('.password-container');
                if (pwdForm) pwdForm.style.transition = 'opacity 0.5s';
                if (pwdForm) pwdForm.style.opacity = '0';
                if (pwdForm) pwdForm.style.pointerEvents = 'none';
                if (pwdForm) pwdForm.setAttribute('aria-hidden', 'true');
                
                const puzzle = document.querySelector('.puzzle-container');
                if (puzzle) puzzle.style.transition = 'opacity 0.5s';
                if (puzzle) puzzle.style.opacity = '0';
                if (puzzle) puzzle.style.pointerEvents = 'none';
                if (puzzle) puzzle.setAttribute('aria-hidden', 'true');

                this.setupBirthdayPage1(app);
            }
        },

setupBirthdayPage1(app) {
            const page1 = document.getElementById('page-1');
            if (!page1) return;

            if (!app.savedData.birthday_page1_seen) {
                app.saveData({ birthday_page1_seen: true });
            }
            
            const rt = BirthdayMixin._getBirthdayRuntime(app);
            
            // Hide puzzle if unlocked (like if returning to session or no password needed)
            if (app.unlocked) {
                const puzzle = document.querySelector('.puzzle-container');
                if (puzzle) puzzle.style.display = 'none';
            }
            
            // Add background decorations (balloons, sparkles) ONLY once
            if (!rt.page1Decorated) {
                rt.page1Decorated = true;
                
                const decorContainer = document.createElement('div');
                decorContainer.className = 'bday-page1-decorations';
                decorContainer.style.position = 'absolute';
                decorContainer.style.inset = '0';
                decorContainer.style.pointerEvents = 'none';
                decorContainer.style.overflow = 'hidden';
                decorContainer.style.zIndex = '0';
                
                for(let i=0; i<6; i++) {
                    const b = document.createElement('div');
                    b.innerHTML = '🎈';
                    b.style.position = 'absolute';
                    b.style.left = (Math.random() * 80 + 10) + '%';
                    b.style.top = '100%';
                    b.style.fontSize = (Math.random() * 30 + 30) + 'px';
                    b.style.opacity = '0.6';
                    b.style.animation = `bday-float-up ${Math.random()*5+5}s infinite linear`;
                    b.style.animationDelay = `${Math.random()*3}s`;
                    decorContainer.appendChild(b);
                }
                
                page1.appendChild(decorContainer);
                
                if (!document.getElementById('bday-page1-styles')) {
                    const style = document.createElement('style');
                    style.id = 'bday-page1-styles';
                    style.textContent = `
                        @keyframes bday-float-up {
                            0% { transform: translateY(0) rotate(-10deg); opacity: 0; }
                            10% { opacity: 0.6; }
                            80% { opacity: 0.6; }
                            100% { transform: translateY(-80vh) rotate(10deg); opacity: 0; }
                        }
                        .tap-to-begin-prompt {
                            margin-top: 2rem;
                            animation: pulse-opacity 2s infinite;
                            cursor: pointer;
                            position: relative;
                            z-index: 10;
                            display: none;
                        }
                        @keyframes pulse-opacity {
                            0%, 100% { opacity: 0.4; }
                            50% { opacity: 1; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }

            // Create or show the Tap to Begin prompt
            let prompt = page1.querySelector('.tap-to-begin-prompt');
            if (!prompt) {
                prompt = document.createElement('div');
                prompt.className = 'tap-to-begin-prompt text-center font-semibold';
                prompt.style.color = 'var(--text-color, #ffffff)';
                prompt.style.fontSize = '1.2rem';
                prompt.innerHTML = 'Tap anywhere to begin ✨';
                
                const contentInner = page1.querySelector('.page-content');
                if (contentInner) contentInner.appendChild(prompt);
            }
            
            // Only show tap-to-begin if unlocked
            if (app.unlocked) {
                prompt.style.display = 'block';
                page1.setAttribute('tabindex', '-1');
            }

            // Screen-reader announcement for the ceremony start prompt.
            var announceEl = page1.querySelector('.birthday-start-aria-live');
            if (!announceEl) {
                announceEl = document.createElement('span');
                announceEl.className = 'birthday-start-aria-live';
                announceEl.setAttribute('aria-live', 'polite');
                announceEl.style.position = 'absolute';
                announceEl.style.width = '1px';
                announceEl.style.height = '1px';
                announceEl.style.overflow = 'hidden';
                announceEl.style.clip = 'rect(0,0,0,0)';
                page1.appendChild(announceEl);
            }
            if (app.unlocked && !rt.page1StartAnnounced) {
                rt.page1StartAnnounced = true;
                announceEl.textContent = 'Birthday celebration starts. Press Enter or tap to begin.';
            }

            var startCeremony = function(e) {
                if (!app.unlocked) return;
                if (e && e.target && e.target.closest && e.target.closest('form, button, input, .reveal-button')) return;

                app.saveData({ birthday_page1_seen: true });
                app.goToPage(2);
            };
            
            // Bind tap transition
            if (!rt.page1TapBound) {
                rt.page1TapBound = true;
                page1.addEventListener('click', startCeremony);
            }

            // Keyboard fallback (Enter/Space) for page 1 start.
            if (!rt.page1KeyboardBound) {
                rt.page1KeyboardBound = true;
                page1.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startCeremony(e);
                    }
                });
            }

            if (app.unlocked && !rt.page1FocusedAfterUnlock) {
                rt.page1FocusedAfterUnlock = true;
                window.requestAnimationFrame(function() {
                    try { page1.focus(); } catch (e) {}
                });
            }
        },
        /* ═══════════════════════════════════════════════════
           Page 2 — Open the Gift (3-step unwrap ritual)
           ═══════════════════════════════════════════════════ */

        setupBirthdayPage2(app) {
            const gift = document.getElementById('birthday-gift');
            if (!gift) return;

            const rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page2 = rt.page2 || {};
            if (rt.page2.finalizeTimer) {
                window.clearTimeout(rt.page2.finalizeTimer);
                rt.page2.finalizeTimer = null;
            }
            rt.page2.stepTimers = rt.page2.stepTimers || [];

            var savedStepRaw = Number.parseInt(String(app.savedData.birthday_unwrap_step || 0), 10);
            var step = Number.isNaN(savedStepRaw) ? 0 : Math.max(0, Math.min(3, savedStepRaw));
            if (app.savedData.birthday_page2_completed) step = 3;

            const layers = [
                gift.querySelector('.gift-wrapping'),
                gift.querySelector('.gift-ribbon-layer'),
                gift.querySelector('.gift-lid-layer')
            ];
            const revealContent = gift.querySelector('.gift-reveal-content');
            const continueBtn = document.getElementById('birthday-gift-continue');
            const stepHint = gift.querySelector('.gift-step-hint');
            const ariaLive = gift.querySelector('.gift-aria-live');

            const stepLabels = [
                'Tap to tear the wrapping!',
                'Tap to unwrap the ribbon!',
                'Tap to open the lid!'
            ];
            const ariaMessages = [
                'Wrapping removed',
                'Ribbon unwrapped',
                'Surprise revealed!'
            ];

            var applyState = function(s) {
                for (var i = 0; i < 3; i++) {
                    if (layers[i]) {
                        layers[i].classList.remove('removing');
                        layers[i].classList.toggle('removed', i < s);
                    }
                }
                if (s >= 3) {
                    if (revealContent) revealContent.classList.add('visible');
                    if (continueBtn) continueBtn.classList.remove('hidden');
                    if (stepHint) stepHint.textContent = '🎁 Surprise ready!';
                    gift.removeAttribute('tabindex');
                    gift.removeAttribute('role');
                    gift.classList.add('glow');
                } else {
                    gift.classList.remove('glow');
                    if (revealContent) revealContent.classList.remove('visible');
                    if (continueBtn) continueBtn.classList.add('hidden');
                    gift.setAttribute('tabindex', '0');
                    gift.setAttribute('role', 'button');
                    if (stepHint) stepHint.textContent = stepLabels[s];
                }
            };

            applyState(step);
            if (app.savedData.birthday_page2_completed) {
                app.saveData({ birthday_unwrap_step: 3 });
            }
            if (step >= 3) return;

            var advance = function() {
                if (step >= 3) return;
                if (rt.page2.isAdvancing) return;
                if (app.currentPage !== 2) return;

                rt.page2.isAdvancing = true;
                var unlockT = window.setTimeout(function() {
                    rt.page2.isAdvancing = false;
                }, 420);
                rt.page2.stepTimers.push(unlockT);

                if (layers[step]) {
                    layers[step].classList.add('removing');
                    var prevTimer = window.setTimeout(function() { layers[step - 1] && layers[step - 1].classList.add('removed'); }, 350);
                    rt.page2.stepTimers.push(prevTimer);
                    // The current layer being removed
                    var currentLayer = layers[step];
                    var currTimer = window.setTimeout(function() { currentLayer.classList.add('removed'); }, 350);
                    rt.page2.stepTimers.push(currTimer);
                }

                step++;
                app.saveData({ birthday_unwrap_step: step });

                if (ariaLive) ariaLive.textContent = ariaMessages[step - 1];

                if (step < 3) {
                    if (stepHint) stepHint.textContent = stepLabels[step];
                } else {
                    rt.page2.finalizeTimer = window.setTimeout(function() {
                        rt.page2.finalizeTimer = null;
                        gift.classList.add('glow');
                        app.showConfetti();
                        if (revealContent) revealContent.classList.add('visible');
                        if (continueBtn) continueBtn.classList.remove('hidden');
                        if (stepHint) stepHint.textContent = '🎁 Surprise ready!';
                        gift.removeAttribute('tabindex');
                        gift.removeAttribute('role');
                        app.saveData({ birthday_page2_completed: true });
                        app.audioManager?.generateTone?.(523.25, 0.15, 'triangle');
                    }, 400);
                }
            };

            BirthdayMixin._runOnce(app, 'page2Bound', function() {
                gift.addEventListener('click', advance);
                gift.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        advance();
                    }
                });
                if (continueBtn) {
                    continueBtn.addEventListener('click', function() { app.goToPage(3); });
                }
            });
        },

        /* ═══════════════════════════════════════════════════
           Page 3 — Memory Snapshot (micro-sections + spotlight)
           ═══════════════════════════════════════════════════ */

        setupBirthdayPage3(app) {
            if (app.eventType !== 'birthday') return;

            const container = document.querySelector('.birthday-page3[data-page3-sections="true"]');
            if (!container) return;

            const rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page3 = rt.page3 || { index: 0, messageTyped: false, timers: [], spotlightShown: false };

            const sections = Array.from(container.querySelectorAll('.page3-section'));
            const tabs = Array.from(container.querySelectorAll('.page3-tab'));
            const dots = Array.from(container.querySelectorAll('.page3-dot'));
            const prevBtn = document.getElementById('page3-prev-section');
            const nextBtn = document.getElementById('page3-next-section');

            var clampIndex = function(i) { return Math.max(0, Math.min(i, sections.length - 1)); };

            var showSection = function(i) {
                var idx = clampIndex(i);
                rt.page3.index = idx;

                sections.forEach(function(sec, sidx) {
                    var active = sidx === idx;
                    sec.classList.toggle('active', active);
                    sec.setAttribute('aria-hidden', active ? 'false' : 'true');
                });
                tabs.forEach(function(tab, tidx) {
                    var active = tidx === idx;
                    tab.classList.toggle('active', active);
                    tab.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                dots.forEach(function(dot, didx) {
                    dot.classList.toggle('active', didx === idx);
                });

                if (prevBtn) prevBtn.disabled = idx === 0;
                if (nextBtn) nextBtn.disabled = idx === sections.length - 1;

                if (idx === 1 && !rt.page3.messageTyped) {
                    var typeEl = document.getElementById('birthday-message-typewriter');
                    var message = typeEl?.dataset?.message || '';
                    if (typeEl && message) {
                        rt.page3.messageTyped = true;
                        BirthdayMixin._startTypewriter(typeEl, message, rt.page3);
                    }
                }

                if (idx === 0 && !rt.page3.spotlightShown) {
                    rt.page3.spotlightShown = true;
                    var caption = container.querySelector('.media-caption');
                    if (caption) {
                        caption.classList.add('spotlight-flash');
                        var spotlightTimer = window.setTimeout(function() { caption.classList.remove('spotlight-flash'); }, 1200);
                        if (rt.page3?.timers) rt.page3.timers.push(spotlightTimer);
                    }
                    app.showFeedback('📸 A memory for your special day', 'info');
                }
            };

            BirthdayMixin._runOnce(app, 'page3Bound', function() {
                tabs.forEach(function(tab) {
                    tab.addEventListener('click', function() { showSection(Number(tab.dataset.section || 0)); });
                });
                if (prevBtn) prevBtn.addEventListener('click', function() { showSection(rt.page3.index - 1); });
                if (nextBtn) nextBtn.addEventListener('click', function() { showSection(rt.page3.index + 1); });

                var calmingSound = document.getElementById('calming-sound');
                var audioControl = container.querySelector('.audio-control');
                if (calmingSound && audioControl) {
                    audioControl.addEventListener('click', function() {
                        // Check post-toggle state on next frame.
                        window.setTimeout(function() {
                            if (calmingSound.paused && !rt.page3AudioPauseHintShown) {
                                rt.page3AudioPauseHintShown = true;
                                app.showFeedback('Tip: play the wind sound for vibes.', 'info');
                            }
                        }, 0);
                    });
                }

                var timeline = document.getElementById('birthday-timeline');
                var fallback = container.querySelector('.timeline-fallback');
                if (timeline) {
                    var items = BirthdayMixin._buildTimelineItems(app);
                    timeline.innerHTML = '';
                    if (items.length >= 2) {
                        items.forEach(function(it) { timeline.appendChild(it); });
                        if (fallback) fallback.style.display = 'none';
                    } else {
                        if (fallback) fallback.style.display = 'block';
                    }
                }
            });

            showSection(rt.page3.index);
        },

        _buildTimelineItems(app) {
            var memoriesData = [];
            try {
                memoriesData = JSON.parse(app.cardContainer?.dataset?.memories || '[]');
            } catch (e) {
                memoriesData = [];
            }
            if (!Array.isArray(memoriesData)) return [];

            return memoriesData
                .filter(Boolean)
                .slice(0, 8)
                .map(function(memory) {
                    var item = document.createElement('div');
                    item.className = 'timeline-item';
                    var year = document.createElement('div');
                    year.className = 'timeline-year';
                    year.textContent = memory.year || 'Moment';
                    var text = document.createElement('div');
                    text.className = 'timeline-text';
                    var title = memory.title || 'A special moment';
                    var desc = memory.description || '';
                    text.textContent = desc ? (title + ' — ' + desc) : title;
                    item.appendChild(year);
                    item.appendChild(text);
                    return item;
                });
        },

        _startTypewriter(el, text, page3State) {
            el.textContent = '';
            var chars = Array.from(String(text));
            var i = 0;
            var tick = function() {
                if (!el.isConnected) return;
                el.textContent += chars[i] || '';
                i++;
                if (i < chars.length) {
                    var t = window.setTimeout(tick, 18);
                    if (page3State?.timers) page3State.timers.push(t);
                }
            };
            tick();
        },

        teardownBirthdayPage3(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            var timers = (rt.page3 && rt.page3.timers) || [];
            timers.forEach(function(t) { window.clearTimeout(t); });
            if (rt.page3) rt.page3.timers = [];
        },

        /* ═══════════════════════════════════════════════════
           Page 4 — Make a Wish (multi-step candle + night sky)
           ═══════════════════════════════════════════════════ */

        setupBirthdayCake(app) {
            if (!app.elements.birthdayCake || app.eventType !== 'birthday') return;

            var rt = BirthdayMixin._getBirthdayRuntime(app);
            var cake = app.elements.birthdayCake;

            // If wish was already made, restore completed state immediately
            if (app.savedData.birthday_page4_wish_made) {
                BirthdayMixin._restorePage4CompletedState(app);
                return;
            }

            // Initialize candle step tracking
            var persistedCandleRaw = Number.parseInt(String(app.savedData.birthday_candle_step || 0), 10);
            var persistedCandle = Number.isNaN(persistedCandleRaw) ? 0 : persistedCandleRaw;
            var candles = Array.from(cake.querySelectorAll('.candle'));
            var totalCandles = candles.length || 5;
            rt.candleStep = Math.max(0, Math.min(totalCandles, rt.candleStep || persistedCandle || 0));
            rt.page4WishTriggered = Boolean(rt.page4WishTriggered);
            rt.page4Timers = rt.page4Timers || [];

            // Rehydrate partial candle progress when revisiting page 4.
            candles.forEach(function(candle, idx) {
                candle.classList.toggle('blown-out', idx < rt.candleStep);
            });
            cake.classList.toggle('blown-out', rt.candleStep >= totalCandles);

            BirthdayMixin._setupCandleBlowDetection(app);
            BirthdayMixin._setupWishStarSystem(app);

            var blowOneCandle = function() {
                if (rt.page4WishTriggered) return;
                if (rt.candleStep >= totalCandles) return;

                var candle = candles[rt.candleStep];
                if (candle) {
                    candle.classList.add('blown-out');
                    BirthdayMixin._createSmokeOnCandle(cake, candle);
                }
                rt.candleStep++;
                app.saveData({ birthday_candle_step: rt.candleStep });

                var instruction = document.querySelector('.cake-instruction');
                if (instruction) {
                    var remaining = totalCandles - rt.candleStep;
                    if (remaining > 0) {
                        instruction.textContent = remaining + ' candle' + (remaining > 1 ? 's' : '') + ' left… blow again!';
                    }
                }

                app.audioManager?.generateTone?.(440 + rt.candleStep * 40, 0.08, 'triangle');

                if (rt.candleStep >= totalCandles) {
                    rt.page4WishTriggered = true;
                    cake.classList.add('blown-out');
                    BirthdayMixin._teardownCandleBlowDetection(app);

                    var blowEffect = document.createElement('div');
                    blowEffect.className = 'blow-effect';
                    blowEffect.textContent = '💨';
                    blowEffect.style.cssText =
                        'position:absolute;top:20%;left:50%;transform:translateX(-50%);' +
                        'font-size:2rem;animation:blowAway 1s ease-out forwards;pointer-events:none;';
                    cake.appendChild(blowEffect);

                    if (instruction) {
                        instruction.textContent = 'Your wish has been made! 🌟 Tap a star…';
                    }

                    if (rt.page4FinalizeTimer) {
                        window.clearTimeout(rt.page4FinalizeTimer);
                    }
                    rt.page4FinalizeTimer = window.setTimeout(function() {
                        app.showConfetti();
                        app.audioManager?.playSuccessSound?.();
                        BirthdayMixin._revealBirthdayWish(app);
                        app.revealAudioOrQuote();
                        BirthdayMixin._showNightSky(app);
                        blowEffect.remove();

                        // Thread of memories / milestone popup — triggered on page 4
                        var hasThreadOfMemories = app.cardContainer.dataset.threadOfMemories === 'true';
                        if (hasThreadOfMemories) {
                            app.showThreadOfMemories();
                        } else {
                            app.showMilestonePopup();
                        }

                        app.saveData({ birthday_page4_wish_made: true });
                        app.saveData({ birthday_candle_step: totalCandles });
                        rt.page4FinalizeTimer = null;
                    }, 1000);
                }
            };

            BirthdayMixin._runOnce(app, 'page4Bound', function() {
                cake.addEventListener('click', blowOneCandle);
                cake.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        blowOneCandle();
                    }
                });
            });
        },

        _restorePage4CompletedState(app) {
            var cake = app.elements.birthdayCake;
            if (cake) {
                cake.classList.add('blown-out');
                var candles = cake.querySelectorAll('.candle');
                candles.forEach(function(c) { c.classList.add('blown-out'); });
            }

            var instruction = document.querySelector('.cake-instruction');
            if (instruction) instruction.textContent = 'Your wish has been made! 🌟 Tap a star…';
            app.saveData({ birthday_candle_step: 5 });

            var wishContainer = document.getElementById('birthday-wish-container');
            if (wishContainer) {
                wishContainer.classList.remove('hidden');
                wishContainer.style.opacity = '1';
            }
            var wishResult = wishContainer?.querySelector('.wish-result');
            if (wishResult) wishResult.style.opacity = '1';

            BirthdayMixin._setupWishStarSystem(app);
            BirthdayMixin._showNightSky(app);
        },

        _createSmokeOnCandle(cake, candle) {
            var candleRect = candle.getBoundingClientRect();
            var cakeRect = cake.getBoundingClientRect();
            var leftPct = ((candleRect.left - cakeRect.left + candleRect.width / 2) / cakeRect.width) * 100;

            for (var i = 0; i < 3; i++) {
                var smoke = document.createElement('div');
                smoke.className = 'candle-smoke';
                smoke.style.left = (leftPct + (Math.random() - 0.5) * 4) + '%';
                smoke.style.top = (12 + Math.random() * 8) + '%';
                smoke.style.animationDelay = (i * 0.06) + 's';
                cake.appendChild(smoke);
                setTimeout(function(s) { s.remove(); }, 1400, smoke);
            }
        },

        _setupCandleBlowDetection(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (rt.mic?.active) return;
            if (!navigator.mediaDevices?.getUserMedia) {
                rt.page4MicUnavailable = true;
                return;
            }

            rt.mic = {
                active: true, stream: null, audioContext: null,
                analyser: null, data: null, rafId: null,
                baseline: 0, baselineSamples: 0, lastTriggerAt: 0
            };

            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    if (!rt.mic?.active) {
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        return;
                    }
                    rt.mic.stream = stream;
                    var AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) {
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        rt.mic = null;
                        rt.page4MicUnavailable = true;
                        return;
                    }

                    try {
                        rt.mic.audioContext = new AudioCtx();
                        rt.mic.audioContext.resume?.().catch(function() {});
                        var source = rt.mic.audioContext.createMediaStreamSource(stream);
                        rt.mic.analyser = rt.mic.audioContext.createAnalyser();
                        rt.mic.analyser.fftSize = 1024;
                        rt.mic.data = new Uint8Array(rt.mic.analyser.fftSize);
                        source.connect(rt.mic.analyser);
                    } catch (e) {
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        rt.mic.audioContext?.close?.().catch(function() {});
                        rt.mic = null;
                        rt.page4MicUnavailable = true;
                        return;
                    }

                    var detect = function() {
                        if (!rt.mic?.active || !rt.mic.analyser || !rt.mic.data) return;
                        rt.mic.analyser.getByteTimeDomainData(rt.mic.data);

                        var sumSq = 0;
                        for (var i = 0; i < rt.mic.data.length; i++) {
                            var v = (rt.mic.data[i] - 128) / 128;
                            sumSq += v * v;
                        }
                        var rms = Math.sqrt(sumSq / rt.mic.data.length);

                        if (rt.mic.baselineSamples < 40) {
                            rt.mic.baseline = (rt.mic.baseline * rt.mic.baselineSamples + rms) / (rt.mic.baselineSamples + 1);
                            rt.mic.baselineSamples++;
                        } else {
                            var capped = Math.min(rms, rt.mic.baseline + 0.05);
                            rt.mic.baseline = rt.mic.baseline * 0.985 + capped * 0.015;
                        }

                        var now = Date.now();
                        var cooldownOk = now - rt.mic.lastTriggerAt > 800;
                        var threshold = Math.max(0.06, rt.mic.baseline * 3.2 + 0.02);

                        if (cooldownOk && rms > threshold && app.elements.birthdayCake && !app.elements.birthdayCake.classList.contains('blown-out')) {
                            rt.mic.lastTriggerAt = now;
                            app.elements.birthdayCake.click();
                            if (app.elements.birthdayCake.classList.contains('blown-out')) return;
                        }

                        rt.mic.rafId = window.requestAnimationFrame(detect);
                    };
                    rt.mic.rafId = window.requestAnimationFrame(detect);
                })
                .catch(function() {
                    // No mic permission/device — click/Enter fallback stays active.
                    rt.page4MicUnavailable = true;
                    rt.mic = null;
                });
        },

        _teardownCandleBlowDetection(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (!rt.mic) return;
            rt.mic.active = false;
            if (rt.mic.rafId) window.cancelAnimationFrame(rt.mic.rafId);
            if (rt.mic.stream) rt.mic.stream.getTracks().forEach(function(t) { t.stop(); });
            if (rt.mic.audioContext) rt.mic.audioContext.close?.().catch(function() {});
            rt.mic = null;
        },

        _teardownBirthdayPage4(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            BirthdayMixin._teardownCandleBlowDetection(app);
            BirthdayMixin._hideNightSky();

            if (Array.isArray(rt.page4Timers) && rt.page4Timers.length) {
                rt.page4Timers.forEach(function(t) { window.clearTimeout(t); });
                rt.page4Timers = [];
            }

            if (rt._wishStarResizeHandler) {
                window.removeEventListener('resize', rt._wishStarResizeHandler);
                rt._wishStarResizeHandler = null;
                rt._positionWishStars = null;
                rt._once = rt._once || {};
                rt._once.wishStarsBound = false;
            }

            if (Array.isArray(rt._wishStarClickBindings)) {
                rt._wishStarClickBindings.forEach(function(binding) {
                    if (binding?.star && binding?.handler) {
                        binding.star.removeEventListener('click', binding.handler);
                    }
                });
                rt._wishStarClickBindings = [];
            }

            if (rt.page4FinalizeTimer) {
                window.clearTimeout(rt.page4FinalizeTimer);
                rt.page4FinalizeTimer = null;

                // If user navigates away mid-finalize and it is not persisted yet,
                // allow them to complete the wish flow on revisit.
                if (!app.savedData.birthday_page4_wish_made) {
                    rt.page4WishTriggered = false;
                }
            }
        },

        _teardownBirthdayPage2(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page2 = rt.page2 || {};
            if (rt.page2.finalizeTimer) {
                window.clearTimeout(rt.page2.finalizeTimer);
                rt.page2.finalizeTimer = null;
            }
            if (Array.isArray(rt.page2.stepTimers) && rt.page2.stepTimers.length) {
                rt.page2.stepTimers.forEach(function(t) { window.clearTimeout(t); });
                rt.page2.stepTimers = [];
            }
            rt.page2.isAdvancing = false;
        },

        _setupWishStarSystem(app) {
            BirthdayMixin._runOnce(app, 'wishStarsBound', function() {
                var sky = document.getElementById('birthday-night-sky');
                if (!sky) return false;

                var starContainer = sky.querySelector('.night-sky-stars');
                var stars = Array.from(sky.querySelectorAll('.birthday-star'));
                var toast = document.getElementById('birthday-wish-toast');
                if (!starContainer || !stars.length) return false;

                var positionStars = function() {
                    var rect = starContainer.getBoundingClientRect();
                    var pad = 14;
                    stars.forEach(function(star, idx) {
                        star.style.left = (pad + Math.random() * Math.max(0, rect.width - pad * 2)) + 'px';
                        star.style.top = (pad + Math.random() * Math.max(0, rect.height - pad * 2)) + 'px';
                        star.style.opacity = '' + (0.65 + (idx % 3) * 0.1);
                    });
                };

                var fireShootingStar = function(fromEl) {
                    var starRect = fromEl.getBoundingClientRect();
                    var contRect = starContainer.getBoundingClientRect();
                    var shooting = document.createElement('div');
                    shooting.className = 'shooting-star';
                    shooting.style.left = (starRect.left - contRect.left) + 'px';
                    shooting.style.top = (starRect.top - contRect.top) + 'px';
                    starContainer.appendChild(shooting);
                    setTimeout(function() { shooting.remove(); }, 900);

                    if (toast) {
                        toast.textContent = 'A wish has been sent to the stars ✨';
                        toast.style.opacity = '1';
                    }
                    app.audioManager?.generateTone?.(659.25, 0.12, 'triangle');
                };

                window.addEventListener('resize', positionStars);
                var clickBindings = [];
                stars.forEach(function(star) {
                    var handler = function() { fireShootingStar(star); };
                    star.addEventListener('click', handler);
                    clickBindings.push({ star: star, handler: handler });
                });

                var rt = BirthdayMixin._getBirthdayRuntime(app);
                rt._positionWishStars = positionStars;
                rt._wishStarResizeHandler = positionStars;
                rt._wishStarClickBindings = clickBindings;

                return true;
            });
        },

        _showNightSky(app) {
            var sky = document.getElementById('birthday-night-sky');
            if (!sky) return;
            sky.classList.remove('hidden');
            var toast = document.getElementById('birthday-wish-toast');
            if (toast) toast.textContent = '';
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (typeof rt._positionWishStars === 'function') {
                window.requestAnimationFrame(function() { rt._positionWishStars(); });
            }
        },

        _hideNightSky() {
            var sky = document.getElementById('birthday-night-sky');
            if (sky) sky.classList.add('hidden');
        },

        _revealBirthdayWish(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page4Timers = rt.page4Timers || [];

            var wishContainer = document.getElementById('birthday-wish-container');
            if (!wishContainer) return;

            wishContainer.classList.remove('hidden');
            wishContainer.style.animation = 'wishReveal 0.6s ease-out forwards';

            var stars = wishContainer.querySelectorAll('.wish-star');
            stars.forEach(function(star, i) {
                var starTimer = window.setTimeout(function() {
                    star.style.animation = 'wishStarSparkle 1s ease-in-out forwards';
                    star.style.animationDelay = '0s';
                }, 300 + (i * 200));
                rt.page4Timers.push(starTimer);
            });

            var wishResult = wishContainer.querySelector('.wish-result');
            if (wishResult) {
                var resultTimer = window.setTimeout(function() {
                    wishResult.style.opacity = '1';
                    wishResult.style.animation = 'fadeInUp 0.5s ease-out forwards';
                }, 1500);
                rt.page4Timers.push(resultTimer);
            }
        },

        /* ═══════════════════════════════════════════════════
           Page 5 — Farewell + Share cue
           ═══════════════════════════════════════════════════ */

        setupBirthdayPage5(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page5Timers = rt.page5Timers || [];
            if (rt.page5Timers.length) {
                rt.page5Timers.forEach(function(t) { window.clearTimeout(t); });
                rt.page5Timers = [];
            }

            BirthdayMixin._animateBirthdayBadge();
            BirthdayMixin._setupInteractiveBalloons(app);

            if (!app.savedData.birthday_page5_seen) {
                var feedbackTimer = window.setTimeout(function() {
                    app.showFeedback('🎈 Want to share this card? Tap Share below.', 'info');
                }, 1200);
                var confettiTimer = window.setTimeout(function() {
                    app.showConfetti();
                }, 800);
                rt.page5Timers.push(feedbackTimer, confettiTimer);
                app.saveData({ birthday_page5_seen: true });
            }
        },

        _animateBirthdayBadge() {
            var badge = document.querySelector('.birthday-badge');
            if (!badge) return;
            badge.style.animation = 'badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
            var sparkle = badge.querySelector('.badge-sparkle');
            if (sparkle) sparkle.style.animation = 'sparkleRotate 2s linear infinite';
        },

        _setupInteractiveBalloons(app) {
            if (app.eventType !== 'birthday') return;

            var container = document.querySelector('.birthday-balloons');
            if (!container) return;
            var balloons = Array.from(container.querySelectorAll('.balloon'));
            if (!balloons.length) return;

            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (rt.balloonsSystem?.active) return;

            var rect = function() { return container.getBoundingClientRect(); };

            if (!rt.balloonsSystem) {
                rt.balloonsSystem = {
                    active: false, rafId: null, container: container, rect: rect,
                    states: balloons.map(function(el) {
                        return {
                            el: el, x: 0, y: 0,
                            vx: (Math.random() - 0.5) * 0.6,
                            vy: -0.5 - Math.random() * 0.6,
                            dragging: false, pointerId: null,
                            downX: 0, downY: 0, moved: false, lastMoveAt: 0
                        };
                    })
                };
            }

            var sys = rt.balloonsSystem;
            var states = sys.states;

            var init = function() {
                var r = rect();
                states.forEach(function(s, i) {
                    if (!s.el.isConnected) return;
                    s.x = 40 + Math.random() * Math.max(0, r.width - 80);
                    s.y = r.height - (40 + i * 18);
                    s.el.style.left = s.x + 'px';
                    s.el.style.top = s.y + 'px';
                });
            };

            var popAt = function(s) {
                if (!s.el.isConnected || s.el.classList.contains('popped')) return;
                s.el.classList.add('popped');
                app.audioManager?.generateTone?.(420, 0.07, 'square');

                var colors = ['#f472b6', '#fbbf24', '#a78bfa', '#60a5fa'];
                for (var i = 0; i < 14; i++) {
                    var c = document.createElement('div');
                    c.className = 'birthday-pop-confetti';
                    c.style.left = s.x + 'px';
                    c.style.top = s.y + 'px';
                    c.style.background = colors[i % colors.length];
                    c.style.setProperty('--dx', ((Math.random() - 0.5) * 120) + 'px');
                    c.style.setProperty('--dy', ((Math.random() - 0.8) * 140) + 'px');
                    container.appendChild(c);
                    setTimeout(function(el) { el.remove(); }, 700, c);
                }
                setTimeout(function() { s.el.remove(); }, 240);
            };

            BirthdayMixin._runOnce(app, 'balloonsBound', function() {
                states.forEach(function(s) {
                    if (!s.el.isConnected) return;

                    s.el.addEventListener('pointerdown', function(e) {
                        s.dragging = true;
                        s.pointerId = e.pointerId;
                        s.downX = e.clientX;
                        s.downY = e.clientY;
                        s.moved = false;
                        s.lastMoveAt = Date.now();
                        s.el.setPointerCapture?.(e.pointerId);
                    });

                    s.el.addEventListener('pointermove', function(e) {
                        if (!s.dragging || s.pointerId !== e.pointerId) return;
                        var r = rect();
                        s.x = Math.max(12, Math.min(r.width - 12, e.clientX - r.left));
                        s.y = Math.max(12, Math.min(r.height - 12, e.clientY - r.top));
                        s.el.style.left = s.x + 'px';
                        s.el.style.top = s.y + 'px';
                        if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) > 6) s.moved = true;
                        s.lastMoveAt = Date.now();
                    });

                    s.el.addEventListener('pointerup', function(e) {
                        if (s.pointerId !== e.pointerId) return;
                        s.dragging = false;
                        s.pointerId = null;
                        if (!s.moved) { popAt(s); return; }
                        s.vx = (Math.random() - 0.5) * 0.9;
                        s.vy = -0.6 - Math.random() * 0.8;
                    });
                });
            });

            init();

            var last = performance.now();
            sys.active = true;

            var tick = function(now) {
                if (!sys.active) return;
                var dt = Math.min(32, now - last);
                last = now;
                var r = rect();

                states.forEach(function(s) {
                    if (!s.el.isConnected || s.dragging || s.el.classList.contains('popped')) return;

                    s.vy += (-0.0009) * dt;
                    s.vx += ((Math.random() - 0.5) * 0.0007) * dt;
                    s.vx *= 0.995;
                    s.vy *= 0.995;
                    s.x += s.vx * dt;
                    s.y += s.vy * dt;

                    if (s.x < 10) { s.x = 10; s.vx = Math.abs(s.vx); }
                    if (s.x > r.width - 10) { s.x = r.width - 10; s.vx = -Math.abs(s.vx); }
                    if (s.y < 10) {
                        s.y = r.height - 10;
                        s.vy = -0.4 - Math.random() * 0.8;
                        s.x = 20 + Math.random() * Math.max(0, r.width - 40);
                    }
                    if (s.y > r.height - 10) { s.y = r.height - 10; s.vy = -Math.abs(s.vy); }

                    s.el.style.left = s.x + 'px';
                    s.el.style.top = s.y + 'px';
                });

                sys.rafId = window.requestAnimationFrame(tick);
            };
            sys.rafId = window.requestAnimationFrame(tick);
        },

        _teardownInteractiveBalloons(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (!rt.balloonsSystem) return;
            rt.balloonsSystem.active = false;
            if (rt.balloonsSystem.rafId) window.cancelAnimationFrame(rt.balloonsSystem.rafId);
            rt.balloonsSystem.rafId = null;

            if (Array.isArray(rt.page5Timers) && rt.page5Timers.length) {
                rt.page5Timers.forEach(function(t) { window.clearTimeout(t); });
                rt.page5Timers = [];
            }
        }
    };

    /* ═══════════════════════════════════════════════════
       EventModule API Registration
       ═══════════════════════════════════════════════════ */

    window.EventModules = window.EventModules || {};
    window.EventModules['birthday'] = {

        initialize(app) {
            app._birthday = app._birthday || {};
            BirthdayMixin.initBirthdayLoadingScreen(app);
        },

        onUnlock(app) {
            BirthdayMixin.onBirthdayUnlock(app);
        },

        onPageEnter(page, app) {
            if (page === 1) BirthdayMixin.setupBirthdayPage1(app);
            else if (page === 2) BirthdayMixin.setupBirthdayPage2(app);
            else if (page === 3) BirthdayMixin.setupBirthdayPage3(app);
            else if (page === 4) BirthdayMixin.setupBirthdayCake(app);
            else if (page === 5) BirthdayMixin.setupBirthdayPage5(app);
        },

        onPageLeave(page, app) {
            if (page === 2) BirthdayMixin._teardownBirthdayPage2(app);
            if (page === 3) BirthdayMixin.teardownBirthdayPage3(app);
            if (page === 4) BirthdayMixin._teardownBirthdayPage4(app);
            if (page === 5) BirthdayMixin._teardownInteractiveBalloons(app);
        }
    };

    console.log('Birthday module loaded');

    // Safety net: if the app fails to call EventModule.initialize for any reason,
    // start the loader ceremony directly at DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('bday-loader')) return;
        if (window.__bdayLoaderStarted) return;
        BirthdayMixin.initBirthdayLoadingScreen(window.greetingCard || null);
    });
})();
