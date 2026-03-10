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
            // Birthday has no password — mark unlocked immediately
            app.unlocked = true;
            app.saveData({ unlocked: true, birthday_page1_seen: true });

            var page1 = document.getElementById('page-1');
            if (!page1) return;

            var rt = BirthdayMixin._getBirthdayRuntime(app);

            // Spawn 4 slow ambient balloons — calm, not festive
            if (!rt.page1BalloonsSpawned) {
                rt.page1BalloonsSpawned = true;
                var balloonContainer = document.getElementById('bday-p1-balloons');
                if (balloonContainer) {
                    var emojis = ['🎈', '🎈', '🎈', '🎈'];
                    for (var i = 0; i < 4; i++) {
                        var b = document.createElement('div');
                        b.className = 'bday-p1-balloon';
                        b.textContent = emojis[i];
                        b.style.left = (12 + (i * 22) + Math.random() * 10) + '%';
                        b.style.animationDuration = (15 + Math.random() * 7) + 's';
                        b.style.animationDelay = (i * 3 + Math.random() * 2) + 's';
                        b.style.fontSize = (20 + Math.random() * 10) + 'px';
                        b.style.opacity = (0.30 + Math.random() * 0.20).toFixed(2);
                        balloonContainer.appendChild(b);
                    }
                }
            }

            // Ambient sparkles — reduced to 7, slow twinkle
            if (!rt.page1SparklesSpawned) {
                rt.page1SparklesSpawned = true;
                var sparkleContainer = document.getElementById('bday-p1-sparkles');
                if (sparkleContainer) {
                    var sparkleChars = ['✦', '✧', '⋆', '✨', '✦', '✧', '⋆'];
                    for (var j = 0; j < 7; j++) {
                        var sp = document.createElement('div');
                        sp.className = 'bday-p1-sparkle';
                        sp.textContent = sparkleChars[j % sparkleChars.length];
                        sp.style.left = (Math.random() * 92) + '%';
                        sp.style.top = (Math.random() * 92) + '%';
                        sp.style.animationDuration = (8 + Math.random() * 6) + 's';
                        sp.style.animationDelay = (Math.random() * 5) + 's';
                        sp.style.fontSize = (9 + Math.random() * 9) + 'px';
                        sp.style.opacity = '0';
                        sparkleContainer.appendChild(sp);
                    }
                }
            }

            // Inject ambient star particles into #bday-p1-stars
            if (!rt.page1StarsSpawned) {
                rt.page1StarsSpawned = true;
                var starsContainer = document.getElementById('bday-p1-stars');
                if (starsContainer) {
                    for (var s = 0; s < 30; s++) {
                        var star = document.createElement('div');
                        star.className = 'bday-p1-star';
                        star.style.left = (Math.random() * 98) + '%';
                        star.style.top = (Math.random() * 98) + '%';
                        var sz = (1 + Math.random() * 1.8).toFixed(1);
                        star.style.width = sz + 'px';
                        star.style.height = sz + 'px';
                        star.style.animationDuration = (6 + Math.random() * 8) + 's';
                        star.style.animationDelay = (Math.random() * 6) + 's';
                        starsContainer.appendChild(star);
                    }
                }
            }

            // Bind tap/keyboard: sparkle burst near gift → fade-out → page 2
            var startCeremony = function(e) {
                if (e && e.target && e.target.closest && e.target.closest('button')) return;
                if (rt.page1Transitioning) return;
                rt.page1Transitioning = true;

                // Sparkle burst originating near the gift icon
                var giftEl = page1.querySelector('.bday-p1-gift-icon');
                if (giftEl) {
                    var giftRect = giftEl.getBoundingClientRect();
                    var pageRect = page1.getBoundingClientRect();
                    var cx = giftRect.left - pageRect.left + giftRect.width / 2;
                    var cy = giftRect.top  - pageRect.top  + giftRect.height / 2;
                    var burstChars = ['✦', '✧', '✨', '⋆', '✦', '✨', '✧'];
                    for (var bi = 0; bi < 7; bi++) {
                        var spark = document.createElement('span');
                        spark.className = 'bday-p1-tap-spark';
                        var angle = (bi / 7) * Math.PI * 2;
                        var dist = 38 + Math.random() * 26;
                        spark.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
                        spark.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
                        spark.style.left = cx + 'px';
                        spark.style.top  = cy + 'px';
                        spark.style.animationDelay = (bi * 0.028) + 's';
                        spark.textContent = burstChars[bi];
                        page1.appendChild(spark);
                    }
                }

                // Fade page out then navigate
                setTimeout(function() {
                    page1.style.transition = 'opacity 0.28s ease-out';
                    page1.style.opacity = '0';
                    setTimeout(function() {
                        app.goToPage(2);
                        page1.style.opacity = '';
                        page1.style.transition = '';
                    }, 300);
                }, 110);
            };

            if (!rt.page1TapBound) {
                rt.page1TapBound = true;
                page1.addEventListener('click', startCeremony);
                page1.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startCeremony(e); }
                });
                page1.setAttribute('tabindex', '0');
                page1.setAttribute('aria-label', 'Birthday celebration starts. Press Enter or tap to begin.');
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

            // Page 2 unwrap is intentionally session-only so users can replay the ritual
            // on every fresh visit/reload. Persisted values are ignored here.
            var step = 0;
            if (rt.page2.completedInSession) {
                step = 3;
            } else if (typeof rt.page2.lastStep === 'number') {
                step = Math.max(0, Math.min(2, rt.page2.lastStep));
            }

            const wrapping = gift.querySelector('.gift-wrapping');
            const ribbonLayer = gift.querySelector('.gift-ribbon-layer');
            const lidLayer = gift.querySelector('.gift-lid-layer');
            const revealContent = gift.querySelector('.gift-reveal-content');
            const continueBtn = document.getElementById('birthday-gift-continue');
            const stepHint = document.querySelector('.gift-step-hint');
            const ariaLive = document.querySelector('.gift-aria-live');
            const envLight = document.getElementById('bday-p2-env-light');
            const unlockSubtitle = document.querySelector('.gift-unlock-subtitle');

            const stepLabels = [
                'Tap to unwrap the ribbon!',
                'Tap to open the box lid!',
                'Tap once more and reveal your present!'
            ];
            const ariaMessages = [
                'Ribbon unwrapped',
                'Gift box opened',
                'Present revealed'
            ];

            var applyState = function(s) {
                if (wrapping) {
                    wrapping.classList.remove('removing', 'removed');
                }
                if (ribbonLayer) {
                    ribbonLayer.classList.remove('removing');
                    ribbonLayer.classList.toggle('removed', s >= 1);
                }
                if (lidLayer) {
                    lidLayer.classList.remove('removing', 'opened');
                    if (s >= 2) {
                        lidLayer.classList.add('opened');
                    }
                }

                if (s >= 3) {
                    if (revealContent) revealContent.classList.add('visible');
                    if (continueBtn) continueBtn.classList.remove('hidden');
                    if (stepHint) stepHint.textContent = '🎁 Present unlocked!';
                    if (envLight) envLight.classList.add('active');
                    if (unlockSubtitle) unlockSubtitle.classList.add('visible');
                    gift.removeAttribute('tabindex');
                    gift.removeAttribute('role');
                    gift.classList.add('glow');
                } else {
                    gift.classList.remove('glow');
                    if (revealContent) revealContent.classList.remove('visible');
                    if (continueBtn) continueBtn.classList.add('hidden');
                    if (envLight) envLight.classList.remove('active');
                    if (unlockSubtitle) unlockSubtitle.classList.remove('visible');
                    gift.setAttribute('tabindex', '0');
                    gift.setAttribute('role', 'button');
                    if (stepHint) stepHint.textContent = stepLabels[s];
                }
            };

            applyState(step);
            // Always bind the continue button — needed when returning with step already = 3
            BirthdayMixin._runOnce(app, 'page2ContinueBound', function() {
                if (continueBtn) continueBtn.addEventListener('click', function() { app.goToPage(3); });
            });
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

                if (step === 0 && ribbonLayer) {
                    ribbonLayer.classList.add('removing');
                    var ribbonTimer = window.setTimeout(function() {
                        ribbonLayer.classList.add('removed');
                    }, 300);
                    rt.page2.stepTimers.push(ribbonTimer);
                }

                if (step === 1 && lidLayer) {
                    lidLayer.classList.add('removing');
                    var lidTimer = window.setTimeout(function() {
                        lidLayer.classList.remove('removing');
                        lidLayer.classList.add('opened');
                    }, 300);
                    rt.page2.stepTimers.push(lidTimer);
                }

                step++;
                rt.page2.lastStep = step;

                if (ariaLive) ariaLive.textContent = ariaMessages[step - 1];

                if (step < 3) {
                    if (stepHint) stepHint.textContent = stepLabels[step];
                } else {
                    rt.page2.finalizeTimer = window.setTimeout(function() {
                        rt.page2.finalizeTimer = null;
                        rt.page2.completedInSession = true;
                        gift.classList.add('glow');
                        app.showConfetti();
                        if (revealContent) revealContent.classList.add('visible');
                        if (continueBtn) continueBtn.classList.remove('hidden');
                        if (stepHint) stepHint.textContent = '🎁 Present unlocked!';
                        if (envLight) envLight.classList.add('active');
                        if (unlockSubtitle) unlockSubtitle.classList.add('visible');
                        gift.removeAttribute('tabindex');
                        gift.removeAttribute('role');
                        rt.page2.lastStep = 3;
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
            });

            // Inject ambient sparkle particles that float upward near the gift
            if (!rt.page2.sparklesSpawned) {
                rt.page2.sparklesSpawned = true;
                var sparklesContainer = document.getElementById('bday-p2-sparkles');
                if (sparklesContainer) {
                    var sparkChars = ['✦', '✧', '✨', '⋆', '✦', '✧', '✨', '⋆'];
                    for (var si = 0; si < 8; si++) {
                        var sp2 = document.createElement('span');
                        sp2.className = 'bday-p2-sparkle';
                        sp2.textContent = sparkChars[si];
                        sp2.style.left = (18 + Math.random() * 64) + '%';
                        sp2.style.top  = (35 + Math.random() * 30) + '%';
                        sp2.style.animationDuration = (7 + Math.random() * 6) + 's';
                        sp2.style.animationDelay = (Math.random() * 7) + 's';
                        sp2.style.fontSize = (8 + Math.random() * 9) + 'px';
                        sparklesContainer.appendChild(sp2);
                    }
                }
            }
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

            // Sections/tabs are conditionally rendered server-side; read from DOM
            const sections = Array.from(container.querySelectorAll('.page3-section'));
            const tabs = Array.from(container.querySelectorAll('.page3-tab'));
            const dots = Array.from(container.querySelectorAll('.page3-dot'));
            const hasMoments = container.dataset.hasMoments === 'true';
            const hasTimeline = container.dataset.hasTimeline === 'true';
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

                // Section 1 can be Moments (typewriter) or Timeline depending on what was rendered
                if (idx === 1) {
                    if (hasMoments && !rt.page3.messageTyped) {
                        var typeEl = document.getElementById('birthday-message-typewriter');
                        var message = typeEl ? (typeEl.dataset.message || '') : '';
                        if (typeEl && message) {
                            rt.page3.messageTyped = true;
                            BirthdayMixin._startTypewriter(typeEl, message, rt.page3);
                        }
                    } else if (hasTimeline && !rt.page3.timelineBuilt) {
                        rt.page3.timelineBuilt = true;
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
                    // Keep button in sync with actual audio state
                    var _syncAudioBtn = function() {
                        var icon = audioControl.querySelector('i');
                        var playing = !calmingSound.paused && !calmingSound.ended;
                        if (icon) icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
                        for (var _n = 0; _n < audioControl.childNodes.length; _n++) {
                            if (audioControl.childNodes[_n].nodeType === 3 && audioControl.childNodes[_n].nodeValue.trim()) {
                                audioControl.childNodes[_n].nodeValue = playing ? ' Pause Sound' : ' Play Sound';
                                break;
                            }
                        }
                        audioControl.setAttribute('aria-label', playing ? 'Pause calming sound' : 'Play calming sound');
                    };
                    calmingSound.addEventListener('play', _syncAudioBtn);
                    calmingSound.addEventListener('pause', _syncAudioBtn);
                    window.requestAnimationFrame(_syncAudioBtn);

                    audioControl.addEventListener('click', function() {
                        var icon = audioControl.querySelector('i');
                        if (calmingSound.paused) {
                            calmingSound.play().catch(function() {});
                            if (icon) icon.className = 'fas fa-pause';
                            for (var n = 0; n < audioControl.childNodes.length; n++) {
                                if (audioControl.childNodes[n].nodeType === 3 && audioControl.childNodes[n].nodeValue.trim()) {
                                    audioControl.childNodes[n].nodeValue = ' Pause Sound';
                                    break;
                                }
                            }
                            audioControl.setAttribute('aria-label', 'Pause calming sound');
                        } else {
                            calmingSound.pause();
                            if (icon) icon.className = 'fas fa-play';
                            for (var n = 0; n < audioControl.childNodes.length; n++) {
                                if (audioControl.childNodes[n].nodeType === 3 && audioControl.childNodes[n].nodeValue.trim()) {
                                    audioControl.childNodes[n].nodeValue = ' Play Sound';
                                    break;
                                }
                            }
                            audioControl.setAttribute('aria-label', 'Play calming sound');
                            if (!rt.page3AudioPauseHintShown) {
                                rt.page3AudioPauseHintShown = true;
                                app.showFeedback('Tip: play the wind sound for vibes.', 'info');
                            }
                        }
                    });
                }

                // Timeline is now built lazily in showSection above when hasTimeline is true
                // Only need it here for section 2 if both moments and timeline exist (which can't happen per new template)
                // so this block is intentionally left empty — handled inside showSection above
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
                cake.style.opacity = '0';
                cake.style.pointerEvents = 'none';
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
                var instructionNoApi = document.querySelector('.cake-instruction');
                if (instructionNoApi) {
                    instructionNoApi.textContent = 'Mic unavailable on this browser. Click the cake to blow the candles.';
                }
                return;
            }

            rt.mic = {
                active: true, stream: null, audioContext: null,
                analyser: null, data: null, freqData: null, rafId: null,
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
                        rt.mic.analyser.fftSize = 2048;
                        rt.mic.analyser.smoothingTimeConstant = 0.72;
                        rt.mic.data = new Uint8Array(rt.mic.analyser.fftSize);
                        rt.mic.freqData = new Uint8Array(rt.mic.analyser.frequencyBinCount);
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

                        // Breath noise is easier to detect in mid frequencies than raw volume.
                        rt.mic.analyser.getByteFrequencyData(rt.mic.freqData);
                        var midBandStart = Math.floor(rt.mic.freqData.length * 0.06);
                        var midBandEnd = Math.floor(rt.mic.freqData.length * 0.34);
                        var midSum = 0;
                        var midCount = 0;
                        for (var f = midBandStart; f < midBandEnd; f++) {
                            midSum += rt.mic.freqData[f];
                            midCount++;
                        }
                        var breathEnergy = midCount ? (midSum / midCount) / 255 : 0;

                        if (rt.mic.baselineSamples < 40) {
                            rt.mic.baseline = (rt.mic.baseline * rt.mic.baselineSamples + rms) / (rt.mic.baselineSamples + 1);
                            rt.mic.baselineSamples++;
                        } else {
                            var capped = Math.min(rms, rt.mic.baseline + 0.05);
                            rt.mic.baseline = rt.mic.baseline * 0.985 + capped * 0.015;
                        }

                        var now = Date.now();
                        var cooldownOk = now - rt.mic.lastTriggerAt > 600;
                        var rmsThreshold = Math.max(0.035, rt.mic.baseline * 2.25 + 0.012);
                        var energyThreshold = Math.max(0.065, rt.mic.baseline * 1.75 + 0.02);
                        var breathDetected = (rms > rmsThreshold) || (breathEnergy > energyThreshold);

                        if (cooldownOk && breathDetected && app.elements.birthdayCake && !app.elements.birthdayCake.classList.contains('blown-out')) {
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
                    var instructionDenied = document.querySelector('.cake-instruction');
                    if (instructionDenied) {
                        instructionDenied.textContent = 'Mic permission not granted. Click the cake to blow the candles.';
                    }
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

                var _wishMessages = [
                    'Your wish is soaring through the cosmos! ✨',
                    'The stars heard you! May it come true 🌠',
                    'A wish sent with love always reaches its destination 💫',
                    'The universe is listening… believe! ⭐',
                    'Magic is real when you wish from the heart 🌟',
                    'Your wish has been written in stardust ✦',
                    'Something wonderful is on its way to you 🎇',
                    'The night sky carries your wish forward 🌌'
                ];
                var _wishMsgIdx = 0;

                var fireShootingStar = function(fromEl) {
                    if (!fromEl || fromEl.dataset.used === 'true') return;
                    var starRect = fromEl.getBoundingClientRect();
                    var contRect = starContainer.getBoundingClientRect();
                    var startX = starRect.left - contRect.left + starRect.width / 2;
                    var startY = starRect.top - contRect.top + starRect.height / 2;

                    fromEl.dataset.used = 'true';

                    // Flash the tapped star briefly
                    fromEl.style.transition = 'transform 0.12s ease, opacity 0.12s ease';
                    fromEl.style.transform = 'scale(2.2)';
                    fromEl.style.opacity = '1';
                    fromEl.style.filter = 'drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #ffe680)';
                    setTimeout(function() {
                        fromEl.style.transition = 'transform 0.28s ease, opacity 0.28s ease, filter 0.28s ease';
                        fromEl.style.transform = 'scale(0.2)';
                        fromEl.style.opacity = '0';
                        fromEl.style.filter = 'none';
                        setTimeout(function() {
                            fromEl.style.pointerEvents = 'none';
                            fromEl.style.visibility = 'hidden';
                        }, 260);
                    }, 120);

                    // Create a shooting-star trail that accelerates downward-right from the star
                    var shooting = document.createElement('div');
                    shooting.className = 'shooting-star-trail';
                    shooting.style.left = startX + 'px';
                    shooting.style.top = startY + 'px';
                    // Random diagonal: mostly down, slightly random horizontal
                    var angle = 30 + Math.random() * 40; // 30-70 degrees from horizontal
                    var dist = 90 + Math.random() * 60;
                    var dx = Math.cos(angle * Math.PI / 180) * dist * (Math.random() < 0.5 ? 1 : -1);
                    var dy = Math.sin(angle * Math.PI / 180) * dist;
                    shooting.style.setProperty('--dx', dx + 'px');
                    shooting.style.setProperty('--dy', dy + 'px');
                    starContainer.appendChild(shooting);
                    setTimeout(function() { shooting.remove(); }, 700);

                    // Sparkle burst at origin
                    for (var pi = 0; pi < 6; pi++) {
                        var p = document.createElement('div');
                        p.className = 'wish-star-spark';
                        p.style.left = startX + 'px';
                        p.style.top = startY + 'px';
                        var pAngle = (pi / 6) * Math.PI * 2;
                        p.style.setProperty('--px', (Math.cos(pAngle) * 28) + 'px');
                        p.style.setProperty('--py', (Math.sin(pAngle) * 28) + 'px');
                        starContainer.appendChild(p);
                        setTimeout(function(el) { el.remove(); }, 500, p);
                    }

                    if (toast) {
                        toast.style.opacity = '0';
                        toast.textContent = _wishMessages[_wishMsgIdx % _wishMessages.length];
                        _wishMsgIdx++;
                        // Fade in message
                        window.requestAnimationFrame(function() {
                            toast.style.transition = 'opacity 0.3s ease';
                            toast.style.opacity = '1';
                        });
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
            var wishMessages = [
                'Your wish is pure gold! ⭐',
                'The universe heard you! 🌟',
                'May it come true! ✨',
                'Stars are listening! 💫',
                'A wish worth granting! ⭐'
            ];
            stars.forEach(function(star, i) {
                var starTimer = window.setTimeout(function() {
                    star.style.animation = 'wishStarSparkle 1s ease-in-out forwards';
                    star.style.animationDelay = '0s';
                }, 300 + (i * 200));
                rt.page4Timers.push(starTimer);
                star.style.cursor = 'pointer';
                star.addEventListener('click', function() {
                    app.showFeedback(wishMessages[i % wishMessages.length], 'success');
                    star.style.animation = 'none';
                    void star.offsetWidth;
                    star.style.animation = 'wishStarSparkle 0.6s ease-in-out forwards';
                });
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
            BirthdayMixin._startPage5Sky(app);

            if (!app.savedData.birthday_page5_seen) {
                var confettiTimer = window.setTimeout(function() { app.showConfetti(); }, 600);
                var feedbackTimer = window.setTimeout(function() {
                    app.showFeedback('🎈 Want to share this card? Tap Share below.', 'info');
                }, 1800);
                rt.page5Timers.push(confettiTimer, feedbackTimer);
                app.saveData({ birthday_page5_seen: true });
            }
        },

        _startPage5Sky(app) {
            var canvas = document.getElementById('bday-p5-canvas');
            if (!canvas) return;
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (rt._page5SkyActive) return;
            rt._page5SkyActive = true;

            var ctx = canvas.getContext('2d');
            var sky = canvas.parentElement;

            var resize = function() {
                canvas.width = sky.offsetWidth || 340;
                canvas.height = sky.offsetHeight || 160;
            };
            resize();
            window.addEventListener('resize', resize);
            rt._page5SkyResize = resize;

            // Static background stars
            var bgStars = [];
            for (var i = 0; i < 55; i++) {
                bgStars.push({
                    x: Math.random(),
                    y: Math.random(),
                    r: 0.6 + Math.random() * 1.2,
                    a: 0.4 + Math.random() * 0.6,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.01 + Math.random() * 0.02
                });
            }

            // Shooting stars pool
            var shooters = [];
            var spawnShooter = function() {
                shooters.push({
                    x: 0.05 + Math.random() * 0.7,
                    y: Math.random() * 0.5,
                    vx: 0.004 + Math.random() * 0.003,
                    vy: 0.002 + Math.random() * 0.002,
                    len: 0.08 + Math.random() * 0.10,
                    life: 1.0,
                    decay: 0.018 + Math.random() * 0.012
                });
            };

            // Spawn first one immediately, then random interval
            spawnShooter();
            var scheduleShooter = function() {
                if (!rt._page5SkyActive) return;
                spawnShooter();
                rt._page5SkyShooterTimeout = window.setTimeout(scheduleShooter, 1600 + Math.random() * 2200);
            };
            rt._page5SkyShooterTimeout = window.setTimeout(scheduleShooter, 900);

            var frame = function() {
                if (!rt._page5SkyActive) return;
                var W = canvas.width;
                var H = canvas.height;
                ctx.clearRect(0, 0, W, H);

                // Draw stars with twinkle
                bgStars.forEach(function(s) {
                    s.twinklePhase += s.twinkleSpeed;
                    var alpha = s.a * (0.7 + 0.3 * Math.sin(s.twinklePhase));
                    ctx.beginPath();
                    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,220,' + alpha + ')';
                    ctx.fill();
                });

                // Draw shooting stars
                shooters = shooters.filter(function(s) { return s.life > 0; });
                shooters.forEach(function(s) {
                    s.life -= s.decay;
                    if (s.life <= 0) return;
                    var tailX = (s.x - s.vx * s.len * W / H) * W;
                    var tailY = (s.y - s.vy * s.len * W / H) * H;
                    var headX = s.x * W;
                    var headY = s.y * H;
                    var grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
                    grad.addColorStop(0, 'rgba(255,255,255,0)');
                    grad.addColorStop(0.4, 'rgba(255,240,180,' + (s.life * 0.6) + ')');
                    grad.addColorStop(1, 'rgba(255,255,255,' + s.life + ')');
                    ctx.beginPath();
                    ctx.moveTo(tailX, tailY);
                    ctx.lineTo(headX, headY);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    // Glow at head
                    ctx.beginPath();
                    ctx.arc(headX, headY, 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,220,' + s.life + ')';
                    ctx.fill();
                    s.x += s.vx;
                    s.y += s.vy;
                });

                rt._page5SkyRaf = window.requestAnimationFrame(frame);
            };
            rt._page5SkyRaf = window.requestAnimationFrame(frame);
        },

        _stopPage5Sky(app) {
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            rt._page5SkyActive = false;
            if (rt._page5SkyRaf) window.cancelAnimationFrame(rt._page5SkyRaf);
            if (rt._page5SkyShooterTimeout) window.clearTimeout(rt._page5SkyShooterTimeout);
            if (rt._page5SkyResize) window.removeEventListener('resize', rt._page5SkyResize);
            rt._page5SkyRaf = null;
            rt._page5SkyShooterTimeout = null;
            rt._page5SkyResize = null;
        },

        _animateBirthdayBadge() {
            var badge = document.querySelector('.birthday-badge');
            if (!badge) return;
            badge.style.animation = 'badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
            var sparkle = badge.querySelector('.badge-sparkle');
            if (sparkle) sparkle.style.animation = 'wishStarSparkle 0.5s ease-out 1';
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
                            vx: (Math.random() - 0.5) * 0.25,
                            vy: -0.18 - Math.random() * 0.22,
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
                        s.vx = (Math.random() - 0.5) * 0.35;
                        s.vy = -0.25 - Math.random() * 0.3;
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

                    s.vy += (-0.0004) * dt;
                    s.vx += ((Math.random() - 0.5) * 0.0007) * dt;
                    s.vx *= 0.995;
                    s.vy *= 0.995;
                    s.x += s.vx * dt;
                    s.y += s.vy * dt;

                    if (s.x < 10) { s.x = 10; s.vx = Math.abs(s.vx); }
                    if (s.x > r.width - 10) { s.x = r.width - 10; s.vx = -Math.abs(s.vx); }
                    if (s.y < 10) {
                        s.y = r.height - 10;
                        s.vy = -0.15 - Math.random() * 0.2;
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

        _updateBirthdayTree(page) {
            var tree = document.querySelector('.tree-animation');
            if (!tree) return;
            tree.removeAttribute('data-stage');
            if (page >= 2) tree.setAttribute('data-stage', String(Math.min(page, 5)));
        },

        _teardownInteractiveBalloons(app) {            var rt = BirthdayMixin._getBirthdayRuntime(app);
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
            // Birthday cards no longer use a card-level password — unlock immediately
            app.unlocked = true;
            app.saveData({ unlocked: true });
            BirthdayMixin.initBirthdayLoadingScreen(app);
        },

        onUnlock(app) {
            BirthdayMixin.onBirthdayUnlock(app);
        },

        onPageEnter(page, app) {
            BirthdayMixin._updateBirthdayTree(page);
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
            if (page === 5) {
                BirthdayMixin._teardownInteractiveBalloons(app);
                BirthdayMixin._stopPage5Sky(app);
            }
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
