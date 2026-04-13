/**
 * Anniversary Card — "Celestial Love" Module
 *
 * Registers window.EventModules['anniversary'] following the same
 * pattern as BirthdayMixin.  Six-page ceremony arc with:
 *   1. Written in the Stars  (welcome)
 *   2. Our Story             (highlights or timeline + love counter)
 *   3. Dance With Me         (couple dancing + music)
 *   4. Moonlit Memories      (images)
 *   5. Words From the Heart  (love letter + audio)
 *   6. Forever & Always      (farewell)
 */

/* ================================================================
   ANNIVERSARY MIXIN
   ================================================================ */

const AnniversaryMixin = {

    /* ----- per-card runtime state ----- */
    _getAnnivRuntime(app) {
        if (!app._annivRuntime) {
            app._annivRuntime = {
                loaderDone: false,
                constellationDrawn: false,
                page2Init: false,
                danceInit: false,
                danceAudioPlaying: false,
                danceInterval: null,
                danceNoteInterval: null,
                page4PetalInterval: null,
                page5Init: false,
                envelopeOpened: false,
                typewriterTimer: null,
                page6Init: false,
                page6PetalInterval: null,
            };
        }
        return app._annivRuntime;
    },


    /* ================================================================
       LOADING SCREEN — "The Grand Clock"
       ================================================================ */

    initAnnivLoader(app) {
        const loader = document.getElementById('anniv-loader');
        if (!loader) { this._revealCard(app); return; }

        const rt = this._getAnnivRuntime(app);

        // Inject 60 tick marks
        const ticks = document.getElementById('anniv-loader-ticks');
        if (ticks) {
            for (let i = 0; i < 60; i++) {
                const tick = document.createElement('div');
                tick.className = i % 5 === 0 ? 'anniv-tick anniv-tick--major' : 'anniv-tick';
                tick.style.transform = `rotate(${i * 6}deg)`;
                ticks.appendChild(tick);
            }
        }

        // Inject golden dust particles
        const dustContainer = document.getElementById('anniv-loader-dust');
        if (dustContainer) {
            for (let i = 0; i < 25; i++) {
                const p = document.createElement('div');
                p.className = 'anniv-dust-particle';
                p.style.left = `${40 + Math.random() * 20}%`;
                p.style.top = `${30 + Math.random() * 40}%`;
                p.style.animationDelay = `${Math.random() * 3}s`;
                p.style.animationDuration = `${3 + Math.random() * 2}s`;
                dustContainer.appendChild(p);
            }
        }

        // At 4.5s: pulse the pivot (hands have settled)
        setTimeout(() => {
            const clock = document.getElementById('anniv-loader-clock');
            if (clock) clock.classList.add('pulse-active');
        }, 4500);

        // At 5.5s: add fade-out
        setTimeout(() => {
            loader.classList.add('fade-out');
        }, 5500);

        // At 6.5s: remove loader, reveal card
        setTimeout(() => {
            rt.loaderDone = true;
            loader.remove();
            this._revealCard(app);
        }, 6500);
    },

    _revealCard(app) {
        // Remove anniv-loader-hidden from card, nav, background
        document.querySelectorAll('.anniv-loader-hidden').forEach(el => {
            el.classList.add('anniv-revealed');
        });

        // Small delay then go to page 1
        setTimeout(() => {
            app.goToPage(1);
            // Trigger setup explicitly in case goToPage(1) was already called during init
            this.setupAnnivPage1(app);
        }, 200);
    },


    /* ================================================================
       PAGE 1 — "Written in the Stars"
       ================================================================ */

    setupAnnivPage1(app) {
        const rt = this._getAnnivRuntime(app);
        // Do not trigger animations while loader is still active
        if (!rt.loaderDone && document.getElementById('anniv-loader')) return;

        const bg = document.querySelector('.anniv-p1-bg');
        if (!bg) return;

        // Inject twinkling stars (once)
        const starsContainer = document.getElementById('anniv-p1-stars');
        if (starsContainer && starsContainer.childElementCount === 0) {
            for (let i = 0; i < 60; i++) {
                const star = document.createElement('div');
                const isLarge = Math.random() > 0.85;
                star.className = `anniv-p1-star${isLarge ? ' anniv-p1-star--large' : ''}`;
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.setProperty('--twinkle-dur', `${2 + Math.random() * 4}s`);
                star.style.setProperty('--twinkle-delay', `${Math.random() * 3}s`);
                starsContainer.appendChild(star);
            }
        }

        // Trigger constellation draw
        if (!rt.constellationDrawn) {
            // First visit — animate the drawing
            setTimeout(() => {
                bg.classList.add('constellation-active');
                rt.constellationDrawn = true;
                // After animation completes, switch to "done" state
                setTimeout(() => {
                    bg.classList.remove('constellation-active');
                    bg.classList.add('constellation-done');
                }, 3000);
            }, 800);
        } else {
            // Revisit — show instantly, no re-animation
            bg.classList.remove('constellation-active');
            bg.classList.add('constellation-done');
        }

        // Tap-to-begin → page 2 (meteor shower handled by onPageLeaveAnimation)
        const page1 = document.getElementById('page-1');
        if (page1 && !page1._annivTapBound) {
            page1._annivTapBound = true;
            page1.addEventListener('click', (e) => {
                // Don't fire if clicking navigation or other controls
                if (e.target.closest('.page-navigator, .share-card, button')) return;
                if (!app.unlocked) return;

                // Play a brief chime
                try { app.audioManager.generateTone(880, 0.15, 'triangle'); } catch(e) {}
                app.goToPage(2);
            });
        }
    },


    /* ================================================================
       PAGE 2 — "Our Story"
       ================================================================ */

    setupAnnivPage2(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.page2Init) return;
        rt.page2Init = true;

        // Setup timeline (Mode B)
        this._setupTimeline(app);
        // Setup milestones (Mode A)
        this._setupMilestones(app);
        // Love counter
        this._animateLoveCounter(app);
    },

    _setupTimeline(app) {
        const container = document.getElementById('anniv-p2-timeline');
        if (!container) return;

        let memoriesData = [];
        try {
            const raw = container.dataset.memories || '[]';
            memoriesData = JSON.parse(raw);
        } catch (e) {
            console.warn('Anniversary: could not parse timeline data', e);
            return;
        }

        if (!Array.isArray(memoriesData) || memoriesData.length < 2) return;

        memoriesData.forEach((memory, idx) => {
            const node = document.createElement('div');
            node.className = 'anniv-timeline-node';
            node.innerHTML = `
                <div class="anniv-timeline-dot"></div>
                <div class="anniv-timeline-content">
                    <div class="anniv-timeline-year">${memory.year || ''}</div>
                    <div class="anniv-timeline-title">${memory.title || 'Special Moment'}</div>
                    <div class="anniv-timeline-desc">${memory.description || ''}</div>
                </div>
            `;

            // Toggle expand on click/tap
            node.addEventListener('click', () => {
                const wasExpanded = node.classList.contains('expanded');
                // Close all others
                container.querySelectorAll('.anniv-timeline-node.expanded').forEach(n => {
                    n.classList.remove('expanded');
                });
                if (!wasExpanded) {
                    node.classList.add('expanded');
                    try { app.audioManager.generateTone(659 + idx * 40, 0.1, 'triangle'); } catch(e) {}
                }
            });

            container.appendChild(node);

            // Stagger reveal
            setTimeout(() => {
                node.classList.add('visible');
            }, 300 + idx * 200);
        });
    },

    _setupMilestones(app) {
        const container = document.getElementById('anniv-p2-milestones');
        if (!container) return;

        const rawHighlights = container.dataset.highlights || '';
        if (!rawHighlights.trim()) return;

        const lines = rawHighlights.split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach((line, idx) => {
            const card = document.createElement('div');
            card.className = 'anniv-milestone-card';
            card.innerHTML = `<span class="anniv-ms-icon">✦</span><span class="anniv-ms-text">${line}</span>`;
            container.appendChild(card);

            // Stagger reveal
            setTimeout(() => {
                card.classList.add('visible');
            }, 400 + idx * 250);
        });
    },

    _animateLoveCounter(app) {
        const container = app.cardContainer;
        if (!container) return;

        const eventDateStr = container.dataset.eventDate;
        if (!eventDateStr) return;

        const eventDate = new Date(eventDateStr + 'T00:00:00');
        const now = new Date();

        // Calculate difference — use absolute values so future dates don't go negative.
        // For anniversaries the stored date is typically the upcoming occurrence;
        // what matters is how long they've been together (years since original date).
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

        // If event is in the future (years negative), show absolute countdown instead
        if (years < 0) {
            years = Math.abs(years);
            months = Math.abs(months);
            days = Math.abs(days);
        }

        const yearsEl = document.getElementById('anniv-years');
        const monthsEl = document.getElementById('anniv-months');
        const daysEl = document.getElementById('anniv-days');

        if (!yearsEl || !monthsEl || !daysEl) return;

        // Animate counting up
        this._countUp(yearsEl, years, 800);
        this._countUp(monthsEl, months, 1000);
        this._countUp(daysEl, days, 1200);
    },

    _countUp(el, target, duration) {
        const start = 0;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * easedProgress);
            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = target;
                el.classList.add('counting');
                setTimeout(() => el.classList.remove('counting'), 300);
            }
        };

        requestAnimationFrame(tick);
    },


    /* ================================================================
       PAGE 3 — "Dance With Me"
       ================================================================ */

    setupAnnivPage3(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.danceInit) return;
        rt.danceInit = true;

        // Start petal loop with immediate initial burst
        this._startDancePetals(app);

        // Couple tap → hearts
        const couple = document.getElementById('anniv-couple');
        if (couple) {
            couple.addEventListener('click', () => {
                this._spawnHeartBurst(couple);
            });
        }

        // Music button
        const musicBtn = document.getElementById('anniv-music-btn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this._toggleDanceMusic(app);
            });
        }
    },

    _startDancePetals(app) {
        const rt = this._getAnnivRuntime(app);
        const container = document.getElementById('anniv-dance-petals');
        if (!container) return;

        const petals = ['🌸', '🌹', '💮', '🪷', '✨'];

        // Immediate burst — scatter 8 petals on entry
        for (let i = 0; i < 8; i++) {
            const petal = document.createElement('div');
            petal.className = 'anniv-dance-petal';
            petal.textContent = petals[Math.floor(Math.random() * petals.length)];
            petal.style.left = `${5 + Math.random() * 90}%`;
            petal.style.setProperty('--fall-dur', `${5 + Math.random() * 4}s`);
            petal.style.setProperty('--fall-delay', `${i * 0.4}s`);
            container.appendChild(petal);
            setTimeout(() => petal.remove(), 10000);
        }

        // Ongoing loop — new petal every 1.2s
        rt.danceInterval = setInterval(() => {
            const petal = document.createElement('div');
            petal.className = 'anniv-dance-petal';
            petal.textContent = petals[Math.floor(Math.random() * petals.length)];
            petal.style.left = `${Math.random() * 100}%`;
            petal.style.setProperty('--fall-dur', `${5 + Math.random() * 3}s`);
            petal.style.setProperty('--fall-delay', '0s');
            container.appendChild(petal);
            setTimeout(() => petal.remove(), 9000);
        }, 1200);
    },



    _spawnHeartBurst(couple) {
        const trail = document.getElementById('anniv-heart-trail');
        if (!trail) return;

        const hearts = ['💕', '💖', '💗', '❤️', '💛'];
        for (let i = 0; i < 6; i++) {
            const heart = document.createElement('div');
            heart.className = 'anniv-heart-particle';
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.left = `${30 + Math.random() * 40}%`;
            heart.style.top = `${20 + Math.random() * 40}%`;
            heart.style.animationDelay = `${i * 0.1}s`;
            trail.appendChild(heart);

            setTimeout(() => heart.remove(), 1600);
        }
    },

    _toggleDanceMusic(app) {
        const rt = this._getAnnivRuntime(app);
        const btn = document.getElementById('anniv-music-btn');
        const couple = document.getElementById('anniv-couple');
        const notesContainer = document.getElementById('anniv-dance-notes');

        if (!btn) return;

        if (rt.danceAudioPlaying) {
            // Stop
            rt.danceAudioPlaying = false;
            btn.classList.remove('playing');
            btn.querySelector('i').className = 'fas fa-play';
            btn.querySelector('.anniv-music-label').textContent = 'Play Our Song';
            if (couple) couple.classList.remove('dancing');

            // Stop notes
            if (rt.danceNoteInterval) {
                clearInterval(rt.danceNoteInterval);
                rt.danceNoteInterval = null;
            }

            // Try pausing audio
            const audioUrl = app.cardContainer.dataset.audioUrl;
            if (audioUrl) {
                const audio = document.getElementById('anniv-dance-audio');
                if (audio) audio.pause();
            } else {
                // Pause background music
                try { app.audioManager.pauseBackgroundMusic(); } catch(e) {}
            }
        } else {
            // Play
            rt.danceAudioPlaying = true;
            btn.classList.add('playing');
            btn.querySelector('i').className = 'fas fa-pause';
            btn.querySelector('.anniv-music-label').textContent = 'Pause';
            if (couple) couple.classList.add('dancing');

            // Play audio
            const audioUrl = app.cardContainer.dataset.audioUrl;
            if (audioUrl) {
                let audio = document.getElementById('anniv-dance-audio');
                if (!audio) {
                    audio = document.createElement('audio');
                    audio.id = 'anniv-dance-audio';
                    audio.loop = true;
                    const decodedUrl = decodeURIComponent(audioUrl);
                    audio.src = decodedUrl;
                    document.body.appendChild(audio);
                }
                audio.play().catch(e => console.log('Dance audio play prevented:', e));
            } else {
                // Play background music + arpeggio
                try {
                    app.audioManager.playBgm();
                    // 3 note arpeggio
                    app.audioManager.generateTone(523, 0.2, 'sine');
                    setTimeout(() => app.audioManager.generateTone(659, 0.2, 'sine'), 200);
                    setTimeout(() => app.audioManager.generateTone(784, 0.2, 'sine'), 400);
                } catch(e) {}
            }

            // Floating music notes
            if (notesContainer) {
                rt.danceNoteInterval = setInterval(() => {
                    const notes = ['♪', '♫', '♬', '♩'];
                    const note = document.createElement('div');
                    note.className = 'anniv-dance-note';
                    note.textContent = notes[Math.floor(Math.random() * notes.length)];
                    note.style.left = `${30 + Math.random() * 40}%`;
                    note.style.bottom = '30%';
                    notesContainer.appendChild(note);
                    setTimeout(() => note.remove(), 3000);
                }, 800);
            }
        }
    },

    teardownPage3(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.danceInterval) {
            clearInterval(rt.danceInterval);
            rt.danceInterval = null;
        }
        if (rt.danceNoteInterval) {
            clearInterval(rt.danceNoteInterval);
            rt.danceNoteInterval = null;
        }
        // Pause dance audio if exists
        const audio = document.getElementById('anniv-dance-audio');
        if (audio) audio.pause();
        rt.danceAudioPlaying = false;

        const btn = document.getElementById('anniv-music-btn');
        if (btn) {
            btn.classList.remove('playing');
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-play';
            const label = btn.querySelector('.anniv-music-label');
            if (label) label.textContent = 'Play Our Song';
        }

        const couple = document.getElementById('anniv-couple');
        if (couple) {
            couple.classList.remove('dancing');
            couple.classList.remove('spinning');
        }
    },


    /* ================================================================
       PAGE 4 — "Moonlit Memories"
       ================================================================ */

    setupAnnivPage4(app) {
        const rt = this._getAnnivRuntime(app);

        // Run media display setup on page 4
        app.setupMediaDisplays();

        // Start calming sound
        const calmingSound = document.getElementById('calming-sound');
        if (calmingSound) {
            calmingSound.volume = 0.4;
            calmingSound.play().catch(e => console.log('Calming sound prevented:', e));
        }

        // Start sparse petals
        if (!rt.page4PetalInterval) {
            const container = document.getElementById('anniv-mem-petals');
            if (container) {
                const petals = ['🌸', '🪷'];
                rt.page4PetalInterval = setInterval(() => {
                    const petal = document.createElement('div');
                    petal.className = 'anniv-dance-petal'; // reuse same style
                    petal.textContent = petals[Math.floor(Math.random() * petals.length)];
                    petal.style.left = `${Math.random() * 100}%`;
                    petal.style.setProperty('--fall-dur', `${7 + Math.random() * 3}s`);
                    petal.style.setProperty('--fall-delay', '0s');
                    container.appendChild(petal);
                    setTimeout(() => petal.remove(), 10000);
                }, 3000);
            }
        }
    },

    teardownPage4(app) {
        const rt = this._getAnnivRuntime(app);

        // Pause calming sound
        const calmingSound = document.getElementById('calming-sound');
        if (calmingSound) { calmingSound.pause(); }

        // Stop petals
        if (rt.page4PetalInterval) {
            clearInterval(rt.page4PetalInterval);
            rt.page4PetalInterval = null;
        }
    },


    /* ================================================================
       PAGE 5 — "Words From the Heart"
       ================================================================ */

    setupAnnivPage5(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.page5Init) return;
        rt.page5Init = true;

        const envelopeWrap = document.getElementById('anniv-envelope-wrap');
        const envelope = document.getElementById('anniv-envelope');

        if (!envelope || !envelopeWrap) return;

        envelope.addEventListener('click', () => {
            if (rt.envelopeOpened) return;
            rt.envelopeOpened = true;

            // Chime sound
            try { app.audioManager.generateTone(523, 0.3, 'sine'); } catch(e) {}

            // Open envelope animation
            envelopeWrap.classList.add('opened');

            // After envelope opens, hide it and show letter
            setTimeout(() => {
                envelopeWrap.style.display = 'none';

                const letterContainer = document.getElementById('anniv-letter-container');
                if (letterContainer) {
                    letterContainer.classList.remove('hidden');
                    // Trigger visibility after a frame
                    requestAnimationFrame(() => {
                        letterContainer.classList.add('visible');
                    });

                    // Start typewriter
                    setTimeout(() => {
                        this._startTypewriter(app);
                    }, 600);
                }
            }, 1200);
        });
    },

    _startTypewriter(app) {
        const rt = this._getAnnivRuntime(app);
        const bodyEl = document.getElementById('anniv-letter-body');
        if (!bodyEl) return;

        const fallbackSpan = bodyEl.querySelector('.anniv-fallback-msg');
        if (fallbackSpan) {
            const fallbackQuotes = [
                "With you, every moment feels like a page from the most beautiful love story ever written. Through every season we've shared, my love for you has only grown deeper. You are my favourite chapter, my best adventure, and my forever home.",
                "In a lifetime of choices, choosing you was the easiest and best decision I've ever made. Thank you for walking by my side and holding my hand through it all. Here's to us, today and always.",
                "I never knew what it meant to find a soulmate until I met you. You understand my silence, you celebrate my joy, and you are the calm in my storms. I love you more with every passing day.",
                "Every day with you is a gift I promise never to take for granted. You are my brightest star, my deepest comfort, and the love of my life. Happy Anniversary, my heart.",
                "They say true love gets stronger over time, and watching our journey unfold has proven it true. You are my rock, my sanctuary, and the most beautiful part of my world.",
                "Sometimes I pause and just marvel at how lucky I am to share this life with you. To love you and to be loved by you is everything I could ever ask for.",
                "Through the highs and lows, your love has been my constant anchor. I wouldn't want to navigate this beautiful, chaotic life with anyone else but you.",
                "A million times over, I would still choose you. You make the ordinary moments magical and the difficult times bearable. Happy Anniversary to my person.",
                "Looking into your eyes still gives me the same butterflies as the day we first met. Thank you for building a wonderful life and a beautiful love with me.",
                "You are my heart's permanent address. With each anniversary, I realize more fully that you are the greatest blessing of my life. I love you endlessly."
            ];
            const randomMsg = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            fallbackSpan.outerHTML = randomMsg;
        }

        const fullText = bodyEl.innerHTML.trim();
        bodyEl.innerHTML = '';
        bodyEl.classList.add('typing');

        let charIndex = 0;
        const speed = 35; // ms per character

        rt.typewriterTimer = setInterval(() => {
            if (charIndex < fullText.length) {
                // Handle HTML tags — don't break them
                if (fullText[charIndex] === '<') {
                    const closingIndex = fullText.indexOf('>', charIndex);
                    if (closingIndex !== -1) {
                        bodyEl.innerHTML += fullText.substring(charIndex, closingIndex + 1);
                        charIndex = closingIndex + 1;
                    } else {
                        bodyEl.innerHTML += fullText[charIndex];
                        charIndex++;
                    }
                } else {
                    bodyEl.innerHTML += fullText[charIndex];
                    charIndex++;
                }

                // Typewriter tick sound (sparse)
                if (charIndex % 3 === 0) {
                    try { app.audioManager.generateTone(1200, 0.02, 'square'); } catch(e) {}
                }
            } else {
                clearInterval(rt.typewriterTimer);
                bodyEl.classList.remove('typing');

                // Show closing
                setTimeout(() => {
                    const closing = document.getElementById('anniv-letter-closing');
                    if (closing) {
                        closing.classList.remove('hidden');
                        closing.classList.add('visible');
                    }

                    // Reveal audio or quote
                    setTimeout(() => {
                        this._revealAnnivAudio(app);
                    }, 800);
                }, 600);
            }
        }, speed);
    },

    _revealAnnivAudio(app) {
        const revealContainer = document.getElementById('anniv-audio-reveal');
        if (!revealContainer) return;

        const audioUrl = app.cardContainer.dataset.audioUrl;

        if (audioUrl) {
            const decodedUrl = decodeURIComponent(audioUrl);
            revealContainer.innerHTML = `
                <div class="anniv-audio-player">
                    <label>A message just for you… 🎵</label>
                    <audio controls>
                        <source src="${decodedUrl}" type="audio/mpeg">
                        <source src="${decodedUrl}" type="audio/wav">
                        <source src="${decodedUrl}" type="audio/flac">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
        } else {
            // Fallback quote — 15 curated love quotes
            const quotes = [
                '"Love is composed of a single soul inhabiting two bodies." — Aristotle',
                '"In all the world, there is no heart for me like yours." — Maya Angelou',
                '"I would rather share one lifetime with you than face all the ages of this world alone." — J.R.R. Tolkien',
                '"Whatever our souls are made of, his and mine are the same." — Emily Brontë',
                '"Grow old along with me! The best is yet to be." — Robert Browning',
                '"The best thing to hold onto in life is each other." — Audrey Hepburn',
                '"You know you\'re in love when you can\'t fall asleep because reality is finally better than your dreams." — Dr. Seuss',
                '"I have found the one whom my soul loves." — Song of Solomon 3:4',
                '"To love and be loved is to feel the sun from both sides." — David Viscott',
                '"You are my today and all of my tomorrows." — Leo Christopher',
                '"In your light I learn how to love." — Rumi',
                '"Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope." — Maya Angelou',
                '"Being deeply loved by someone gives you strength, while loving someone deeply gives you courage." — Lao Tzu',
                '"If I had a flower for every time I thought of you, I could walk through my garden forever." — Alfred Tennyson',
                '"The greatest thing you\'ll ever learn is just to love and be loved in return." — Eden Ahbez',
            ];
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            revealContainer.innerHTML = `<div class="anniv-fallback-quote">${quote}</div>`;

            // Play a gentle arpeggio
            try {
                app.audioManager.generateTone(523, 0.15, 'sine');
                setTimeout(() => app.audioManager.generateTone(659, 0.15, 'sine'), 200);
                setTimeout(() => app.audioManager.generateTone(784, 0.15, 'sine'), 400);
            } catch(e) {}
        }

        revealContainer.classList.remove('hidden');
        requestAnimationFrame(() => {
                    revealContainer.classList.add('visible');
        });
    },


    /* ================================================================
       PAGE 6 — "Forever & Always"
       ================================================================ */

    setupAnnivPage6(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.page6Init) return;
        rt.page6Init = true;

        // Play celebration sound
        try {
            app.audioManager.playCelebrationSound();
        } catch(e) {}

        // We do NOT call app.playFinalAnimation() because Tree of Love replaces standard generic animations

        const treeScene = document.getElementById('anniv-tree-scene');
        const message = document.getElementById('anniv-farewell-msg');

        // Step 1: Trace the roots, trunk, and branches
        setTimeout(() => {
            if (treeScene) treeScene.classList.add('active');
        }, 500);

        // Step 2: Bloom the tree & fireflies
        setTimeout(() => {
            if (treeScene) treeScene.classList.add('blooming');
            try { app.audioManager.generateTone(880, 0.2, 'triangle'); } catch(e) {}
            this._startTreeBloom(app);
            this._startTreeFireflies(app);
        }, 3000);

        // Step 3: Reveal farewell message gracefully
        setTimeout(() => {
            if (message) message.classList.add('visible');
            // Play a gentle chord
            try {
                app.audioManager.generateTone(523, 0.15, 'sine');
                setTimeout(() => app.audioManager.generateTone(659, 0.15, 'sine'), 200);
            } catch(e) {}
        }, 5000);
    },

    _startTreeBloom(app) {
        const container = document.getElementById('anniv-tree-blossoms');
        if (!container) return;
        
        // Spawn around 25 blossoms on branches
        for (let i = 0; i < 25; i++) {
            const blossom = document.createElement('div');
            blossom.className = 'anniv-tree-blossom';
            // Scatter mainly in the top half (branches)
            blossom.style.left = `${10 + Math.random() * 80}%`;
            blossom.style.top = `${10 + Math.random() * 50}%`;
            blossom.style.animationDelay = `${Math.random() * 1.5}s`;
            
            // Randomly pick a color tint (pink or gold)
            const isGold = Math.random() > 0.7;
            if (isGold) {
                blossom.style.background = 'radial-gradient(circle, #f5c842 0%, rgba(245,200,66,0) 80%)';
            }
            container.appendChild(blossom);
        }
    },

    _startTreeFireflies(app) {
        const rt = this._getAnnivRuntime(app);
        const container = document.getElementById('anniv-tree-fireflies');
        if (!container) return;

        let count = 0;
        rt.page6PetalInterval = setInterval(() => {
            if (count > 30) {
                clearInterval(rt.page6PetalInterval);
                rt.page6PetalInterval = null;
                return;
            }
            const ff = document.createElement('div');
            ff.className = 'anniv-tree-firefly';
            ff.style.left = `${Math.random() * 100}%`;
            ff.style.top = `${60 + Math.random() * 40}%`; // Start near ground
            ff.style.setProperty('--ff-dur', `${3 + Math.random() * 3}s`);
            ff.style.setProperty('--ff-delay', `${Math.random()}s`);
            ff.style.setProperty('--ff-x', `${-50 + Math.random() * 100}px`);
            ff.style.setProperty('--ff-y', `${-100 - Math.random() * 100}px`); // Float up
            container.appendChild(ff);
            count++;
            
            setTimeout(() => ff.remove(), 6000);
        }, 300);
    },

    teardownPage6(app) {
        const rt = this._getAnnivRuntime(app);
        if (rt.page6PetalInterval) {
            clearInterval(rt.page6PetalInterval);
            rt.page6PetalInterval = null;
        }
    },
};


/* ================================================================
   MODULE REGISTRATION
   ================================================================ */

window.EventModules = window.EventModules || {};
window.EventModules['anniversary'] = {

    initialize(app) {
        // Set 6-page layout
        app.totalPages = 6;

        // Auto-unlock (no password gate, like birthday)
        app.unlocked = true;
        app.saveData({ unlocked: true });

        // Start the clock loading screen
        AnniversaryMixin.initAnnivLoader(app);
    },

    onUnlock(app) {
        // No-op — auto-unlocked
    },

    onPageEnter(page, app) {
        switch (page) {
            case 1: AnniversaryMixin.setupAnnivPage1(app); break;
            case 2: AnniversaryMixin.setupAnnivPage2(app); break;
            case 3: AnniversaryMixin.setupAnnivPage3(app); break;
            case 4: AnniversaryMixin.setupAnnivPage4(app); break;
            case 5: AnniversaryMixin.setupAnnivPage5(app); break;
            case 6: AnniversaryMixin.setupAnnivPage6(app); break;
        }
    },

    onPageLeave(page, app) {
        switch (page) {
            case 3: AnniversaryMixin.teardownPage3(app); break;
            case 4: AnniversaryMixin.teardownPage4(app); break;
            case 6: AnniversaryMixin.teardownPage6(app); break;
        }
    },

    onPageLeaveAnimation(page, _nextPage, app, callback) {
        const overlay = document.getElementById('anniv-transition-overlay');
        if (!overlay) {
            callback();
            return;
        }

        const applyOverlay = (className, callbackDelay, resetDelay, toneFreq, toneDur = 0.15) => {
            overlay.className = className;
            try { app.audioManager.generateTone(toneFreq, toneDur, 'sine'); } catch (e) {}
            setTimeout(() => callback(), callbackDelay);
            setTimeout(() => { overlay.className = ''; }, resetDelay);
        };

        const launchMeteorBurst = () => {
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    const star = document.createElement('div');
                    star.className = 'anniv-p1-shooting-star';
                    star.style.top = Math.random() * 50 + 'vh';
                    star.style.left = Math.random() * 100 + 'vw';
                    star.style.animation = 'annivMeteor 1s linear forwards';
                    document.body.appendChild(star);
                    setTimeout(() => star.remove(), 1000);
                }, i * 50);
            }
        };

        // Page-source-led transitions so reverse/jump navigation still feels intentional.
        switch (page) {
            case 1:
                launchMeteorBurst();
                setTimeout(() => {
                    applyOverlay('active-flash', 600, 1500, 880, 0.1);
                }, 600);
                return;
            case 2:
                applyOverlay('active-spotlight', 800, 1600, 440, 0.2);
                return;
            case 3:
                applyOverlay('active-sparkle', 700, 1400, 659, 0.15);
                return;
            case 4:
                applyOverlay('active-blur', 600, 1200, 523, 0.15);
                return;
            case 5:
                applyOverlay('active-ambient', 900, 1800, 392, 0.25);
                return;
            case 6:
                // Back-navigation from finale uses a soft fade instead of full ambient bloom.
                applyOverlay('active-fade', 550, 1000, 349, 0.12);
                return;
            default:
                applyOverlay('active-fade', 500, 1000, 330, 0.12);
        }
    }
};
