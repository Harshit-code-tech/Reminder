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
            rt._once = rt._once || {};
            rt._once.page4Bound = false;
            rt.page4AutoAdvanceTimer = null;

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

                app.audioManager?.startBackgroundMusic?.();
                app.audioManager?.playBirthdaySfx?.('gift_reveal_sparkle');

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
                    app.audioManager?.playBirthdaySfx?.('unwrap_tap');
                    ribbonLayer.classList.add('removing');
                    var ribbonTimer = window.setTimeout(function() {
                        ribbonLayer.classList.add('removed');
                    }, 300);
                    rt.page2.stepTimers.push(ribbonTimer);
                }

                if (step === 1 && lidLayer) {
                    app.audioManager?.playBirthdaySfx?.('unwrap_tap');
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
                        app.audioManager?.playBirthdaySfx?.('reveal_chime');
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

            // Inject sparkles with angle-based diagonal paths + bg birthday emojis
            if (!rt.page2.sparklesSpawned) {
                rt.page2.sparklesSpawned = true;
                var sparklesContainer = document.getElementById('bday-p2-sparkles');
                if (sparklesContainer) {
                    // Colourful sparkle chars — bigger and tinted so they're clearly visible
                    var sparkChars = ['\u2B50', '\u2728', '\u2726', '\u2605', '\u2736', '\u2665', '\u25C6', '\u2739',
                                      '\u2B50', '\u2728', '\u2726', '\u2605', '\u2736', '\u2665'];
                    var sparkColours = ['#ffd700','#ff6b9d','#a78bfa','#60afff','#6bcb77','#ff9f43',
                                        '#fff','#ffd700','#ff6b9d','#a78bfa','#60afff','#6bcb77','#ff9f43','#fff'];
                    for (var si = 0; si < 14; si++) {
                        var sp2 = document.createElement('span');
                        sp2.className = 'bday-p2-sparkle';
                        sp2.textContent = sparkChars[si];
                        sp2.style.color = sparkColours[si];

                        sp2.style.left = (4 + Math.random() * 92).toFixed(1) + '%';
                        sp2.style.top  = (22 + Math.random() * 56).toFixed(1) + '%';

                        // Angle from vertical: 35-75° → clearly diagonal, never a vertical log
                        var sAngle = (35 + Math.random() * 40) * (Math.random() < 0.5 ? 1 : -1);
                        var sDist  = 130 + Math.random() * 100;
                        var sTx = (Math.sin(sAngle * Math.PI / 180) * sDist).toFixed(1);
                        var sTy = (-Math.abs(Math.cos(sAngle * Math.PI / 180) * sDist)).toFixed(1);
                        var sRot = (sAngle * (0.55 + Math.random() * 0.70)).toFixed(1);

                        sp2.style.setProperty('--tx', sTx + 'px');
                        sp2.style.setProperty('--ty', sTy + 'px');
                        sp2.style.setProperty('--rot', sRot + 'deg');
                        sp2.style.animationDuration = (5.5 + Math.random() * 4.5).toFixed(2) + 's';
                        sp2.style.animationDelay = '-' + (Math.random() * 7).toFixed(2) + 's';
                        sp2.style.fontSize = (11 + Math.random() * 8) + 'px';  // larger = visible
                        sparklesContainer.appendChild(sp2);
                    }

                    // 5 bg birthday emoji glows: larger, slow, gentle diagonal drift
                    var bgElems = ['\uD83C\uDF1F', '\u2728', '\uD83C\uDF1F', '\uD83D\uDCAB', '\u2728'];
                    for (var bi = 0; bi < 5; bi++) {
                        var bg = document.createElement('span');
                        bg.className = 'bday-p2-bg-elem';
                        bg.textContent = bgElems[bi];

                        bg.style.left = (5 + Math.random() * 90).toFixed(1) + '%';
                        bg.style.top  = (18 + Math.random() * 62).toFixed(1) + '%';
                        bg.style.fontSize = (16 + Math.random() * 8).toFixed(0) + 'px';

                        var bAngle = (25 + Math.random() * 40) * (Math.random() < 0.5 ? 1 : -1);
                        var bDist  = 85 + Math.random() * 70;
                        var bTx = (Math.sin(bAngle * Math.PI / 180) * bDist).toFixed(1);
                        var bTy = (-Math.abs(Math.cos(bAngle * Math.PI / 180) * bDist)).toFixed(1);
                        bg.style.setProperty('--tx', bTx + 'px');
                        bg.style.setProperty('--ty', bTy + 'px');
                        bg.style.setProperty('--rot', ((Math.random() - 0.5) * 28).toFixed(1) + 'deg');
                        bg.style.setProperty('--peak-opacity', (0.35 + Math.random() * 0.20).toFixed(2));
                        bg.style.animationDuration = (11 + Math.random() * 8).toFixed(1) + 's';
                        bg.style.animationDelay = '-' + (Math.random() * 11).toFixed(2) + 's';
                        sparklesContainer.appendChild(bg);
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

            // Inject slow ambient dust particles (once)
            var ambientContainer = document.querySelector('.bday-p3-ambient');
            if (ambientContainer && !ambientContainer.dataset.populated) {
                ambientContainer.dataset.populated = '1';
                for (var _p = 0; _p < 14; _p++) {
                    var dot = document.createElement('span');
                    dot.className = 'bday-p3-ambient-dot';
                    var size = (Math.random() * 6 + 3); // 3–9 px
                    var left = (Math.random() * 96 + 2); // 2–98%
                    var delay = (Math.random() * 18).toFixed(1);
                    var dur   = (Math.random() * 12 + 14).toFixed(1); // 14–26s (very slow)
                    dot.style.cssText = [
                        'width:' + size + 'px',
                        'height:' + size + 'px',
                        'left:' + left + '%',
                        'bottom:-10px',
                        'animation-duration:' + dur + 's',
                        'animation-delay:-' + delay + 's',
                        'opacity:0'
                    ].join(';');
                    ambientContainer.appendChild(dot);
                }
            }

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
                        var spotlightTimer = window.setTimeout(function() { caption.classList.remove('spotlight-flash'); }, 1600);
                        if (rt.page3?.timers) rt.page3.timers.push(spotlightTimer);
                    }
                    app.showFeedback('🕯 A memory for your special day', 'info');
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
                                app.showFeedback('🎧 Let the music hold this memory', 'info');
                            }
                        }
                    });
                } else if (audioControl && app.audioManager?.tracks?.background) {
                    var bgm = app.audioManager.tracks.background;
                    var syncBgmBtn = function() {
                        var icon = audioControl.querySelector('i');
                        var playing = !bgm.paused && !bgm.ended;
                        if (icon) icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
                        audioControl.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
                    };

                    syncBgmBtn();
                    audioControl.addEventListener('click', function() {
                        if (bgm.paused) {
                            app.audioManager.startBackgroundMusic();
                        } else {
                            bgm.pause();
                            app.audioManager.isBackgroundPlaying = false;
                        }
                        window.setTimeout(syncBgmBtn, 50);
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
            el.innerHTML = '';
            // Normalise Windows (CRLF) and old Mac (CR) line endings to LF
            var normalized = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            var chars = Array.from(normalized);
            var currentNode = document.createTextNode('');
            el.appendChild(currentNode);
            var i = 0;
            var tick = function() {
                if (!el.isConnected) return;
                var ch = chars[i] || '';
                if (ch === '\n') {
                    el.appendChild(document.createElement('br'));
                    currentNode = document.createTextNode('');
                    el.appendChild(currentNode);
                } else {
                    currentNode.nodeValue += ch;
                }
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

            // Ceremony is session-only — always reset state on each page enter
            // so the wish experience replays fresh every visit (like page 2).
            rt.page4WishTriggered = false;
            rt.candleStep = 0;
            rt.page4Timers = rt.page4Timers || [];
            rt._once = rt._once || {};

            var candles = Array.from(cake.querySelectorAll('.candle'));
            var totalCandles = candles.length || 5;

            // Restore candle DOM to unblown state
            candles.forEach(function(candle) { candle.classList.remove('blown-out'); });
            cake.classList.remove('blown-out', 'ceremony-complete');
            cake.style.pointerEvents = '';

            // Reset instruction text
            var instruction = document.querySelector('.cake-instruction');
            if (instruction) instruction.textContent = 'Tap the cake to blow the candles!';

            // Reset mic hint visibility in case it was hidden from a prior visit
            var micHint = document.getElementById('bday-p4-mic-hint');
            if (micHint) {
                micHint.style.display = '';
                micHint.classList.remove('dismissed');
            }

            BirthdayMixin._showMicHint(app);
            BirthdayMixin._setupWishStarSystem(app);

            var blowOneCandle = function() {
                if (rt.page4WishTriggered) return;
                if (rt.candleStep >= totalCandles) return;

                // First tap: dismiss mic hint and start detection if not yet running
                if (rt.candleStep === 0) {
                    var _mh = document.getElementById('bday-p4-mic-hint');
                    if (_mh) {
                        _mh.classList.add('dismissed');
                        window.setTimeout(function() { _mh.style.display = 'none'; }, 380);
                    }
                    if (!rt.mic?.active && !rt.page4MicUnavailable) {
                        BirthdayMixin._setupCandleBlowDetection(app);
                    }
                }

                var candle = candles[rt.candleStep];
                if (candle) {
                    candle.classList.add('blown-out');
                    BirthdayMixin._createSmokeOnCandle(cake, candle);
                }
                rt.candleStep++;

                if (instruction) {
                    var remaining = totalCandles - rt.candleStep;
                    if (remaining > 0) {
                        instruction.textContent = remaining + ' candle' + (remaining > 1 ? 's' : '') + ' left… blow again!';
                    }
                }

                app.audioManager?.playBirthdaySfx?.('candle_blow');

                if (rt.candleStep >= totalCandles) {
                    rt.page4WishTriggered = true;
                    cake.classList.add('blown-out');
                    BirthdayMixin._teardownCandleBlowDetection(app);


                    // Dismiss mic hint (in case mic was never tapped)
                    var _mhFinal = document.getElementById('bday-p4-mic-hint');
                    if (_mhFinal) { _mhFinal.classList.add('dismissed'); window.setTimeout(function() { _mhFinal.style.display = 'none'; }, 380); }

                    // Warm golden burst
                    var warmBurst = document.getElementById('bday-p4-warm-burst');
                    if (warmBurst) {
                        warmBurst.classList.add('active');
                        rt.page4Timers.push(window.setTimeout(function() { warmBurst.classList.remove('active'); }, 1600));
                    }

                    // 350ms: cake slice ceremony
                    rt.page4Timers.push(window.setTimeout(function() {
                        var sliceEl = document.getElementById('bday-p4-cake-slice');
                        if (sliceEl) sliceEl.classList.add('active');
                    }, 350));

                    // 500ms: cake fades out gracefully before night sky appears
                    rt.page4Timers.push(window.setTimeout(function() {
                        cake.classList.add('ceremony-complete');
                    }, 500));

                    if (instruction) {
                        instruction.textContent = 'Your wish has been made! 🌟 Tap a star…';
                    }

                    if (rt.page4FinalizeTimer) {
                        window.clearTimeout(rt.page4FinalizeTimer);
                    }
                    rt.page4FinalizeTimer = window.setTimeout(function() {
                        BirthdayMixin._showBirthdayCelebration(app);
                        app.audioManager?.playBirthdaySfx?.('wish_complete');
                        app.revealAudioOrQuote();
                        BirthdayMixin._showNightSky(app);
                        rt.page4FinalizeTimer = null;
                    }, 1300);
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

        _showMicHint(app) {
            var hint    = document.getElementById('bday-p4-mic-hint');
            var allowBtn = document.getElementById('bday-p4-mic-allow');
            var skipBtn  = document.getElementById('bday-p4-mic-skip');
            if (allowBtn && !allowBtn.dataset.bound) {
                allowBtn.dataset.bound = '1';
                allowBtn.addEventListener('click', function() {
                    if (hint) { hint.classList.add('dismissed'); window.setTimeout(function() { hint.style.display = 'none'; }, 380); }
                    BirthdayMixin._setupCandleBlowDetection(app);
                }, { once: true });
            }
            if (skipBtn && !skipBtn.dataset.bound) {
                skipBtn.dataset.bound = '1';
                skipBtn.addEventListener('click', function() {
                    if (hint) { hint.classList.add('dismissed'); window.setTimeout(function() { hint.style.display = 'none'; }, 380); }
                }, { once: true });
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
            }
            if (rt.page4AutoAdvanceTimer) {
                window.clearTimeout(rt.page4AutoAdvanceTimer);
                rt.page4AutoAdvanceTimer = null;
            }

            // Ensure full reset for next visit
            rt.page4WishTriggered = false;
            rt.candleStep = 0;
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
                var counter = document.getElementById('bday-p4-star-counter');
                if (!starContainer || !stars.length) return false;

                // Reset star DOM state for a clean replay
                stars.forEach(function(star) {
                    star.dataset.used = 'false';
                    star.style.visibility = '';
                    star.style.pointerEvents = '';
                    star.style.opacity = '';
                    star.style.transform = '';
                    star.style.filter = '';
                    star.style.transition = '';
                });
                if (counter) counter.classList.remove('done');

                var totalStars = stars.length;
                var starsLeft = totalStars;

                function updateCounter() {
                    if (!counter) return;
                    if (starsLeft > 0) {
                        counter.textContent = starsLeft + ' ✦ remaining';
                        counter.classList.remove('done');
                    } else {
                        counter.textContent = '';
                    }
                }
                updateCounter();

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

                    // Decrement counter
                    starsLeft = Math.max(0, starsLeft - 1);
                    updateCounter();

                    if (toast) {
                        toast.style.opacity = '0';
                        var isLast = starsLeft === 0;
                        toast.textContent = isLast
                            ? 'Your wishes are on their way ✨'
                            : _wishMessages[_wishMsgIdx % _wishMessages.length];
                        _wishMsgIdx++;
                        // Fade in message
                        window.requestAnimationFrame(function() {
                            toast.style.transition = 'opacity 0.35s ease';
                            toast.style.opacity = '1';
                        });
                    }
                    app.audioManager?.playBirthdaySfx?.('star_click');

                    // All stars used — show completion, then advance to page 5
                    if (starsLeft === 0) {
                        if (counter) {
                            counter.textContent = 'All wishes sent ✨';
                            counter.classList.add('done');
                        }
                        if (rt.page4AutoAdvanceTimer) {
                            window.clearTimeout(rt.page4AutoAdvanceTimer);
                        }
                        rt.page4AutoAdvanceTimer = window.setTimeout(function() {
                            app.goToPage(5);
                            rt.page4AutoAdvanceTimer = null;
                        }, 1500);
                    }
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

        /**
         * Launch birthday-themed celebration particles after the cake-cut ceremony.
         * Emits emoji party symbols + coloured confetti with varied speed, drift,
         * and rotation — much more festive than plain falling squares.
         */
        _showBirthdayCelebration(app) {
            var container = app.cardContainer;
            if (!container) return;
            var emojis  = ['\uD83C\uDF82','\uD83C\uDF89','\u2728','\uD83C\uDF88','\u2B50','\uD83C\uDF1F','\uD83C\uDF8A','\uD83D\uDCAB'];
            var colors  = ['#ff8c94','#ffd86e','#86efac','#93c5fd','#c084fc','#fb923c','#fca5a5','#fde68a'];
            var count   = Math.min(26, Math.max(12, (window.innerWidth / 18) | 0));

            for (var i = 0; i < count; i++) {
                (function() {
                    var el       = document.createElement('div');
                    var useEmoji = Math.random() > 0.44;
                    var delay    = (Math.random() * 850)  | 0;
                    var dur      = (1700 + Math.random() * 1300) | 0;
                    var drift    = (((Math.random() - 0.5) * 90) | 0) + 'px';
                    var rot      = (((Math.random() - 0.5) * 580) | 0) + 'deg';
                    var size     = (13 + Math.random() * 10).toFixed(1);

                    el.className = 'bday-p4-celebration-particle';
                    el.style.setProperty('--drift', drift);
                    el.style.setProperty('--rot',   rot);
                    el.style.left              = (Math.random() * 94).toFixed(1) + '%';
                    el.style.animationDuration = dur   + 'ms';
                    el.style.animationDelay    = delay + 'ms';
                    el.style.fontSize          = size  + 'px';

                    if (useEmoji) {
                        el.textContent = emojis[(Math.random() * emojis.length) | 0];
                    } else {
                        var w = (6 + Math.random() * 7).toFixed(0);
                        var h = (4 + Math.random() * 8).toFixed(0);
                        el.style.width        = w + 'px';
                        el.style.height       = h + 'px';
                        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                        el.style.background   = colors[(Math.random() * colors.length) | 0];
                    }

                    container.appendChild(el);
                    window.setTimeout(function() {
                        if (el.parentNode) el.parentNode.removeChild(el);
                    }, delay + dur + 200);
                })();
            }
        },

        _showNightSky(app) {
            var sky = document.getElementById('birthday-night-sky');
            if (!sky) return;

            // Starfield background is now pure CSS (radial-gradient on .bday-p4-starfield).
            // No DOM dots needed — just remove the old populated flag if migrating.

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

            // Reset entrance states so replay works on each page entry
            var _warmEl  = document.getElementById('bday-p5-warm-msg');
            var _chipsEl = document.querySelector('.birthday-finale-chips');
            var _btnEl   = document.getElementById('bday-p5-msg-btn');
            if (_warmEl)  _warmEl.classList.remove('revealed');
            if (_chipsEl) _chipsEl.classList.remove('revealed');
            if (_btnEl && !_btnEl.classList.contains('dismissed')) _btnEl.classList.remove('revealed');

            // Stars twinkle via CSS — no JS needed

            // 300ms: warm message fades in
            var t1 = window.setTimeout(function() {
                var warm = document.getElementById('bday-p5-warm-msg');
                if (warm) warm.classList.add('revealed');
            }, 300);

            // 700ms: decorative chips appear
            var t2 = window.setTimeout(function() {
                var chips = document.querySelector('.birthday-finale-chips');
                if (chips) chips.classList.add('revealed');
            }, 700);

            // 1100ms: message button appears
            var t3 = window.setTimeout(function() {
                var btn = document.getElementById('bday-p5-msg-btn');
                if (btn && !btn.classList.contains('dismissed')) btn.classList.add('revealed');
            }, 1100);

            rt.page5Timers.push(t1, t2, t3);

            BirthdayMixin._setupMsgReveal(app);

            // One-time share nudge
            if (!rt.p5CelebFired) {
                rt.p5CelebFired = true;
                var feedbackTimer = window.setTimeout(function() {
                    app.showFeedback('🎈 Want to share this card? Tap Share below.', 'info');
                }, 2400);
                rt.page5Timers.push(feedbackTimer);
            }
        },

        _startPage5Sky(app) {
            // Sky is now a CSS full-bleed background (.bday-p5-bg) — no canvas animation needed.
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
            badge.classList.remove('glowing');
            badge.style.animation = 'badgePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
            var sparkle = badge.querySelector('.badge-sparkle');
            if (sparkle) sparkle.style.animation = 'wishStarSparkle 0.5s ease-out 1';
            window.setTimeout(function() { badge.classList.add('glowing'); }, 700);
        },

        _setupInteractiveBalloons(app) {
            if (app.eventType !== 'birthday') return;

            var container = document.querySelector('.birthday-balloons');
            if (!container) return;
            var balloons = Array.from(container.querySelectorAll('.balloon'));
            if (!balloons.length) return;

            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (rt.balloonsSystem?.active) return;

            rt.balloonsSystem = { active: true, rafId: null };

            // Assign random positions, speed, and sway; use larger --dx so the
            // bdayP5BalloonSway oscillation is clearly visible (±0.6 × dx).
            var swayDurs = ['3.2s', '4.1s', '3.7s', '4.8s', '3.5s', '4.4s'];
            balloons.forEach(function(el, i) {
                if (el.classList.contains('floating')) return;
                el.style.left = (6 + Math.random() * 86) + '%';
                // dx ±55-95px → sway covers ±33-57px per oscillation — clearly visible
                el.style.setProperty('--dx', (Math.random() < 0.5 ? -1 : 1) * (55 + (Math.random() * 40 | 0)) + 'px');
                el.style.setProperty('--dur', (12.5 + Math.random() * 6.5).toFixed(2) + 's');
                el.style.setProperty('--delay', (Math.random() * 1.9).toFixed(2) + 's');
                el.style.setProperty('--sway-dur', swayDurs[i % swayDurs.length]);
                // Stagger starts so the bottom doesn't feel like a single launch line.
                window.setTimeout(function() {
                    if (rt.balloonsSystem?.active && el.isConnected) el.classList.add('floating');
                }, (Math.random() * 880) | 0);
            });

            var popBalloon = function(el) {
                if (!el.isConnected || el.classList.contains('popped')) return;

                // Freeze the balloon at its current visual position before stopping animation
                var elRect = el.getBoundingClientRect();
                var cRect = container.getBoundingClientRect();
                var cx = elRect.left - cRect.left + elRect.width / 2;
                var cy = elRect.top  - cRect.top  + elRect.height / 2;

                el.classList.remove('floating');
                el.style.left   = cx + 'px';
                el.style.top    = cy + 'px';
                el.style.bottom = 'auto';
                el.style.transform = '';
                el.classList.add('popped');

                var colors = ['#f472b6', '#fbbf24', '#a78bfa', '#60a5fa'];
                for (var i = 0; i < 14; i++) {
                    var c = document.createElement('div');
                    c.className = 'birthday-pop-confetti';
                    c.style.left = cx + 'px';
                    c.style.top  = cy + 'px';
                    c.style.background = colors[i % colors.length];
                    c.style.setProperty('--dx', ((Math.random() - 0.5) * 120) + 'px');
                    c.style.setProperty('--dy', ((Math.random() - 0.8) * 140) + 'px');
                    container.appendChild(c);
                    setTimeout(function(el) { el.remove(); }, 700, c);
                }
                setTimeout(function() { el.remove(); }, 240);
            };

            BirthdayMixin._runOnce(app, 'balloonsBound', function() {
                balloons.forEach(function(el) {
                    el.addEventListener('click', function() { popBalloon(el); });
                });
            });
        },

        _setupMsgReveal(app) {
            var btn    = document.getElementById('bday-p5-msg-btn');
            var reveal = document.getElementById('bday-p5-msg-reveal');
            if (!btn || !reveal) return;
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            var appRef = app;
            btn.addEventListener('click', function() {
                btn.classList.add('dismissed');
                btn.setAttribute('aria-expanded', 'true');
                reveal.classList.remove('hidden');
                reveal.classList.add('showing');
                appRef.audioManager?.playBirthdaySfx?.('message_open');
                BirthdayMixin._launchPage5Floaters(appRef, 7, 0.12);
            });
        },

        _launchPage5Floaters(app, count, _unused) {
            var layer = document.getElementById('bday-p5-celebration');
            if (!layer) return;
            var rt = BirthdayMixin._getBirthdayRuntime(app);
            rt.page5FloaterTimers = rt.page5FloaterTimers || [];

            // Soft celestial symbols only — keep finale calm and non-cluttered
            var tokens  = ['\u2728', '\u2726', '\u2736', '\u2739', '\u2605'];
            var colours = ['#ffd700', '#ffe7ad', '#a78bfa', '#fff2cf', '#ffffff'];
            var total = Math.max(6, count | 0);

            for (var i = 0; i < total; i++) {
                (function(idx) {
                    // Stagger launch times so confetti appears over several seconds, not all at once
                    var t = window.setTimeout(function() {
                        if (!layer.isConnected) return;
                        var el = document.createElement('span');
                        el.className = 'bday-p5-floater';

                        el.textContent = tokens[(Math.random() * tokens.length) | 0];
                        el.style.color    = colours[(Math.random() * colours.length) | 0];
                        el.style.fontSize = (11 + Math.random() * 13).toFixed(0) + 'px';

                        // 1. Random X — spawn anywhere across the full container width
                        el.style.left = (2 + Math.random() * 96).toFixed(1) + '%';
                        // top: -12px is provided by the CSS rule

                        // 2. Random delay + 3. Random fall duration (speed)
                        var delay = (Math.random() * 2.4).toFixed(2);
                        var dur   = (3.5 + Math.random() * 4.0).toFixed(2);
                        el.style.setProperty('--delay',  delay + 's');
                        el.style.setProperty('--dur',    dur   + 's');

                        // 4. S-curve horizontal drift: swing one way at mid-fall, then opposite
                        var driftSign = Math.random() < 0.5 ? 1 : -1;
                        el.style.setProperty('--driftA', (driftSign  * (28 + Math.random() * 50)).toFixed(0) + 'px');
                        el.style.setProperty('--driftB', (-driftSign * (22 + Math.random() * 45)).toFixed(0) + 'px');

                        // 5. Rotation through the fall
                        el.style.setProperty('--rot50',  (100 + Math.random() * 160).toFixed(0) + 'deg');
                        el.style.setProperty('--rot100', (280 + Math.random() * 160).toFixed(0) + 'deg');

                        layer.appendChild(el);
                        window.setTimeout(function() {
                            if (el.parentNode) el.parentNode.removeChild(el);
                        }, (parseFloat(dur) + parseFloat(delay) + 0.5) * 1000);
                    }, idx * 80);
                    rt.page5FloaterTimers.push(t);
                })(i);
            }
        },

        _updateBirthdayTree(page) {
            var tree = document.querySelector('.tree-animation');
            if (!tree) return;
            tree.removeAttribute('data-stage');
            if (page >= 2) tree.setAttribute('data-stage', String(Math.min(page, 5)));
        },

        _teardownInteractiveBalloons(app) {            var rt = BirthdayMixin._getBirthdayRuntime(app);
            if (rt.balloonsSystem) {
                rt.balloonsSystem.active = false;
                if (rt.balloonsSystem.rafId) window.cancelAnimationFrame(rt.balloonsSystem.rafId);
                rt.balloonsSystem.rafId = null;
            }
            if (rt._once) rt._once.balloonsBound = false;

            if (Array.isArray(rt.page5FloaterTimers) && rt.page5FloaterTimers.length) {
                rt.page5FloaterTimers.forEach(function(t) { window.clearTimeout(t); });
                rt.page5FloaterTimers = [];
            }
            var floaterLayer = document.getElementById('bday-p5-celebration');
            if (floaterLayer) floaterLayer.innerHTML = '';

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
            if (!app._birthday.beforeUnloadBound) {
                app._birthday.beforeUnloadBound = true;
                window.addEventListener('beforeunload', function() {
                    app.audioManager?.stopBackgroundMusic?.();
                });
            }
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

    // Safety net: if the app fails to call EventModule.initialize for any reason,
    // start the loader ceremony directly at DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('bday-loader')) return;
        if (window.__bdayLoaderStarted) return;
        BirthdayMixin.initBirthdayLoadingScreen(window.greetingCard || null);
    });
})();
