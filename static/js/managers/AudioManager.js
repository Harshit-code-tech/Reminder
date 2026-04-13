/**
 * AudioManager — manages all audio tracks, background music, and sound effects.
 * Extracted from greeting_card.js.
 */

class AudioManager {
    constructor(eventType) {
        this.eventType = eventType || 'birthday';
        this.backgroundVolume = this.eventType === 'birthday' ? 0.24 : (this.eventType === 'anniversary' ? 0.16 : 0.3);
        this.effectVolume = this.eventType === 'birthday' ? 0.45 : (this.eventType === 'anniversary' ? 0.45 : 0.6);
        this.isBackgroundPlaying = false;
        this.syntheticBirthdayBgmTimer = null;
        this.currentAnniversaryTrackKey = null;
        this.currentAnniversaryTrack = null;
        this.anniversaryTracks = {};
        this.anniversaryTrackSources = {
            1: '/static/audio/anniversary/welcome.mp3',
            2: '/static/audio/anniversary/our_story.mp3',
            3: '/static/audio/anniversary/dance_with_me.mp3',
            4: '/static/audio/anniversary/moonlit_memories.mp3',
            5: '/static/audio/anniversary/love_letter.mp3',
            6: '/static/audio/anniversary/forever_and_always.mp3'
        };
        this.anniversaryTrackVolumes = {
            1: 0.12,
            2: 0.13,
            3: 0.21,
            4: 0.10,
            5: 0.09,
            6: 0.15
        };

        this.tracks = {
            background: null,
            bell: null,
            success: null,
            pageTransition: null,
            blessing: null,
            celebration: null,
            birthdaySfx: {}
        };
        this.isEnabled = true;
        this.loadAudioTracks();
    }

    loadAudioTracks() {
        try {
            // Event-type-specific audio mapping
            const audioFiles = {
                pageTransition: '/static/audio/page-turn.mp3',
                success: '/static/audio/success-chime.mp3',
                celebration: '/static/audio/celebration.mp3'
            };

            // Only load Raksha Bandhan-specific audio for that event type
            if (this.eventType === 'raksha_bandhan') {
                audioFiles.background = '/static/audio/background-rakhi.mp3';
                audioFiles.bell = '/static/audio/bell-sacred.mp3';
                audioFiles.blessing = '/static/audio/blessing-sound.mp3';
            } else if (this.eventType === 'birthday') {
                audioFiles.background = '/static/audio/birthday/bgm_birthday_magic_loop.mp3';
            } else {
                // Generic ambient background for other events
                audioFiles.background = '/static/audio/Whispering Wind.mp3';
            }

            Object.keys(audioFiles).forEach(key => {
                try {
                    const audio = new Audio(audioFiles[key]);

                    // Set up error handling
                    audio.addEventListener('error', (e) => {
                        console.warn(`Failed to load audio: ${audioFiles[key]}`, e);
                        this.tracks[key] = null;
                    });

                    // Set up success handler
                    audio.addEventListener('canplaythrough', () => {
                        // Set volumes only after audio is loaded and validate they're finite numbers
                        if (key === 'background') {
                            if (typeof this.backgroundVolume === 'number' && isFinite(this.backgroundVolume)) {
                                audio.volume = Math.max(0, Math.min(1, this.backgroundVolume));
                            } else {
                                audio.volume = 0.3; // Safe fallback
                            }
                            audio.loop = true;
                        } else {
                            if (typeof this.effectVolume === 'number' && isFinite(this.effectVolume)) {
                                audio.volume = Math.max(0, Math.min(1, this.effectVolume));
                            } else {
                                audio.volume = 0.6; // Safe fallback
                            }
                        }
                    });

                    this.tracks[key] = audio;
                } catch (error) {
                    console.warn(`Error creating audio for ${key}:`, error);
                    this.tracks[key] = null;
                }
            });

            if (this.eventType === 'birthday') {
                this.loadBirthdaySfxTracks();
            } else if (this.eventType === 'anniversary') {
                this.loadAnniversaryTracks();
            }

        } catch (error) {
            console.warn('AudioManager initialization failed:', error);
            this.isEnabled = false;
        }
    }

    loadAnniversaryTracks() {
        Object.keys(this.anniversaryTrackSources).forEach(pageKey => {
            try {
                const audio = new Audio(this.anniversaryTrackSources[pageKey]);
                audio.preload = 'auto';
                audio.loop = true;
                audio.addEventListener('error', () => {
                    this.anniversaryTracks[pageKey] = null;
                });
                audio.addEventListener('canplaythrough', () => {
                    const v = this.anniversaryTrackVolumes[pageKey];
                    audio.volume = Math.max(0, Math.min(1, typeof v === 'number' ? v : this.backgroundVolume));
                });
                this.anniversaryTracks[pageKey] = audio;
            } catch (_error) {
                this.anniversaryTracks[pageKey] = null;
            }
        });
    }

    loadBirthdaySfxTracks() {
        const birthdaySfxVolumeMap = {
            gift_reveal_sparkle: 0.52,
            unwrap_tap: 0.34,
            reveal_chime: 0.50,
            candle_blow: 0.33,
            wish_complete: 0.48,
            star_click: 0.32,
            message_open: 0.36
        };

        const sfxMap = {
            gift_reveal_sparkle: '/static/audio/birthday/sfx_gift_reveal_sparkle.mp3',
            unwrap_tap: '/static/audio/birthday/sfx_unwrap_tap.mp3',
            reveal_chime: '/static/audio/birthday/sfx_reveal_chime.mp3',
            candle_blow: '/static/audio/birthday/sfx_candle_blow.mp3',
            wish_complete: '/static/audio/birthday/sfx_wish_complete.mp3',
            star_click: '/static/audio/birthday/sfx_star_click.mp3',
            message_open: '/static/audio/birthday/sfx_message_open.mp3'
        };

        Object.keys(sfxMap).forEach(name => {
            try {
                const audio = new Audio(sfxMap[name]);
                audio.preload = 'auto';
                audio.addEventListener('error', () => {
                    this.tracks.birthdaySfx[name] = null;
                });
                audio.addEventListener('canplaythrough', () => {
                    const v = birthdaySfxVolumeMap[name] || this.effectVolume || 0.45;
                    audio.volume = Math.max(0, Math.min(1, v));
                });
                this.tracks.birthdaySfx[name] = audio;
            } catch (_err) {
                this.tracks.birthdaySfx[name] = null;
            }
        });
    }


    // Fallback audio generation for missing files
    generateTone(frequency, duration, type = 'sine') {
        if (!this.isEnabled || !(window.AudioContext || window.webkitAudioContext)) {
            return;
        }

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            console.warn('Tone generation failed:', error);
        }
    }

    // Duck background music when other sounds play
    duckBackgroundAudio(shouldDuck = true) {
        if (this.eventType === 'anniversary' && this.currentAnniversaryTrack && this.isBackgroundPlaying) {
            const baseVolume = (typeof this.currentAnniversaryTrack.volume === 'number' && isFinite(this.currentAnniversaryTrack.volume))
                ? this.currentAnniversaryTrack.volume : this.backgroundVolume;
            const targetVolume = shouldDuck ? baseVolume * 0.2 : baseVolume;
            const currentVolume = (typeof this.currentAnniversaryTrack.volume === 'number' && isFinite(this.currentAnniversaryTrack.volume))
                ? this.currentAnniversaryTrack.volume : baseVolume;
            const step = (targetVolume - currentVolume) / 10;

            let steps = 0;
            const fadeInterval = setInterval(() => {
                if (steps >= 10 || !this.currentAnniversaryTrack) {
                    if (this.currentAnniversaryTrack && isFinite(targetVolume)) {
                        this.currentAnniversaryTrack.volume = Math.max(0, Math.min(1, targetVolume));
                    }
                    clearInterval(fadeInterval);
                    return;
                }

                const newVolume = currentVolume + (step * steps);
                if (this.currentAnniversaryTrack && isFinite(newVolume)) {
                    this.currentAnniversaryTrack.volume = Math.max(0, Math.min(1, newVolume));
                }
                steps++;
            }, 50);
            return;
        }

        if (this.tracks.background && this.isBackgroundPlaying) {
            // FIXED: Validate volumes are finite numbers
            const baseVolume = (typeof this.backgroundVolume === 'number' && isFinite(this.backgroundVolume))
                ? this.backgroundVolume : 0.3;
            const targetVolume = shouldDuck ? baseVolume * 0.2 : baseVolume;

            // Validate current volume
            const currentVolume = (typeof this.tracks.background.volume === 'number' && isFinite(this.tracks.background.volume))
                ? this.tracks.background.volume : 0.3;

            const step = (targetVolume - currentVolume) / 10;

            let steps = 0;
            const fadeInterval = setInterval(() => {
                if (steps >= 10 || !this.tracks.background) {
                    if (this.tracks.background && isFinite(targetVolume)) {
                        this.tracks.background.volume = Math.max(0, Math.min(1, targetVolume));
                    }
                    clearInterval(fadeInterval);
                    return;
                }

                const newVolume = currentVolume + (step * steps);
                if (this.tracks.background && isFinite(newVolume)) {
                    this.tracks.background.volume = Math.max(0, Math.min(1, newVolume));
                }
                steps++;
            }, 50);
        }
    }

    // Specific audio methods with fallbacks
    playBirthdaySfx(name) {
        if (this.eventType !== 'birthday') return;

        const duckMsMap = {
            gift_reveal_sparkle: 580,
            unwrap_tap: 260,
            reveal_chime: 720,
            candle_blow: 280,
            wish_complete: 780,
            star_click: 320,
            message_open: 520
        };

        const track = this.tracks.birthdaySfx ? this.tracks.birthdaySfx[name] : null;
        if (track && track.readyState >= 2) {
            this.duckBackgroundAudio(true);
            track.currentTime = 0;
            track.play().catch(() => {});
            setTimeout(() => this.duckBackgroundAudio(false), duckMsMap[name] || 500);
            return;
        }

        // WebAudio fallback for missing files to keep ceremony non-blocking.
        if (name === 'gift_reveal_sparkle') {
            [980, 1240, 1568].forEach((f, i) => setTimeout(() => this.generateTone(f, 0.08, 'triangle'), i * 55));
        } else if (name === 'unwrap_tap') {
            this.generateTone(720, 0.07, 'triangle');
        } else if (name === 'reveal_chime') {
            [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => this.generateTone(f, 0.16, 'triangle'), i * 95));
        } else if (name === 'candle_blow') {
            this.generateTone(220, 0.06, 'sine');
        } else if (name === 'wish_complete') {
            [659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.generateTone(f, 0.18, 'triangle'), i * 105));
        } else if (name === 'star_click') {
            this.generateTone(1046.5, 0.1, 'triangle');
        } else if (name === 'message_open') {
            this.generateTone(523.25, 0.2, 'sine');
        }
    }

    playBellSound() {
        if (this.tracks.bell && this.tracks.bell.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.bell.currentTime = 0;
            this.tracks.bell.play().catch(e => console.debug('Audio blocked:', e));

            // Restore background volume after bell finishes
            setTimeout(() => {
                this.duckBackgroundAudio(false);
            }, 2000);
        } else {
            this.generateTone(800, 1.0, 'triangle');
        }
    }

    playSuccessSound() {
        if (this.tracks.success && this.tracks.success.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.success.currentTime = 0;
            this.tracks.success.play().catch(e => console.debug('Audio blocked:', e));

            // Restore background volume after success sound
            setTimeout(() => {
                this.duckBackgroundAudio(false);
            }, 2000);
        } else {
            [523.25, 659.25, 783.99].forEach((freq, index) => {
                setTimeout(() => this.generateTone(freq, 0.5, 'triangle'), index * 100);
            });
        }
    }


    playPageTransition() {
        // For: Page navigation - keep minimal
        if (this.eventType === 'birthday') return;
        if (this.tracks.pageTransition && this.tracks.pageTransition.readyState >= 2) {
            this.tracks.pageTransition.currentTime = 0;
            this.tracks.pageTransition.play().catch(e => console.debug('Page Turn Audio blocked:', e));
        }
        else{
            this.generateTone(220, 0.3, 'sine');
        }
    }

    playBlessingSound() {
        if (this.tracks.blessing && this.tracks.blessing.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.blessing.currentTime = 0;
            this.tracks.blessing.play().catch(e => console.debug('Blessing audio blocked:', e));

            // Restore background volume after blessing
            setTimeout(() => {
                this.duckBackgroundAudio(false);
            }, 3000);
        } else {
            // Fallback: Gentle blessing chime
            this.generateTone(659.25, 0.8, 'sine');
        }
    }

    // FIXED: Celebration sound should only play on page 5 or ceremony completion
    playCelebrationSound() {
        if (this.eventType === 'birthday') {
            return;
        }
        if (this.eventType === 'anniversary') {
            this.playAnniversaryTrack(6);
            return;
        }
        if (this.tracks.celebration && this.tracks.celebration.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.celebration.currentTime = 0;
            this.tracks.celebration.play().catch(e => console.debug('Celebration audio blocked:', e));

            // Restore background volume after celebration
            setTimeout(() => {
                this.duckBackgroundAudio(false);
            }, 4000);
        } else {
            // Fallback: Celebration chord progression
            const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            frequencies.forEach((freq, index) => {
                setTimeout(() => this.generateTone(freq, 0.8, 'triangle'), index * 200);
            });
        }
    }
    startBackgroundMusic() {
        if (this.eventType === 'birthday') {
            this.stopSyntheticBirthdayBackground();
        }

        if (this.eventType === 'anniversary') {
            return this.playAnniversaryTrack(this.app?.currentPage || 1);
        }

        if (this.tracks.background && this.tracks.background.readyState >= 2) {
            // FIXED: Validate volume before setting
            const volume = (typeof this.backgroundVolume === 'number' && isFinite(this.backgroundVolume))
                ? Math.max(0, Math.min(1, this.backgroundVolume)) : 0.3;

            this.tracks.background.volume = volume;
            this.tracks.background.play()
                .then(() => {
                    this.isBackgroundPlaying = true;
                })
                .catch(e => {
                    console.debug('Background music blocked:', e);
                    // Try to start on first user interaction
                    this.setupUserInteractionAudio();
                    if (this.eventType === 'birthday') {
                        this.startSyntheticBirthdayBackground();
                    }
                });
        } else if (this.eventType === 'birthday') {
            this.startSyntheticBirthdayBackground();
        }
    }


    stopBackgroundMusic() {
        if (this.eventType === 'anniversary') {
            this.stopAnniversaryTrack();
            return;
        }
        if (this.tracks.background) {
            this.tracks.background.pause();
            this.tracks.background.currentTime = 0;
            this.isBackgroundPlaying = false;
        }
        this.stopSyntheticBirthdayBackground();
    }

    pauseBackgroundMusic() {
        if (this.eventType === 'anniversary') {
            if (this.currentAnniversaryTrack) {
                this.currentAnniversaryTrack.pause();
                this.isBackgroundPlaying = false;
            }
            return;
        }

        if (this.tracks.background) {
            this.tracks.background.pause();
            this.isBackgroundPlaying = false;
        }
    }

    playAnniversaryTrack(pageNumber) {
        if (this.eventType !== 'anniversary') {
            return Promise.resolve(null);
        }

        const pageKey = String(pageNumber || 1);
        const source = this.anniversaryTrackSources[pageKey] || this.anniversaryTrackSources['1'];
        const targetVolume = this.anniversaryTrackVolumes[pageKey] ?? this.backgroundVolume;

        let track = this.anniversaryTracks[pageKey];
        if (!track) {
            track = new Audio(source);
            track.preload = 'auto';
            track.loop = true;
            track.addEventListener('error', () => {
                this.anniversaryTracks[pageKey] = null;
            });
            this.anniversaryTracks[pageKey] = track;
        }

        if (this.currentAnniversaryTrack && this.currentAnniversaryTrack !== track) {
            this.currentAnniversaryTrack.pause();
            this.currentAnniversaryTrack.currentTime = 0;
        }

        this.currentAnniversaryTrack = track;
        this.currentAnniversaryTrackKey = pageKey;
        track.src = source;
        track.loop = true;
        track.volume = Math.max(0, Math.min(1, typeof targetVolume === 'number' ? targetVolume : this.backgroundVolume));

        const playResult = track.play();
        if (playResult && typeof playResult.then === 'function') {
            playResult.then(() => {
                this.isBackgroundPlaying = true;
            }).catch(e => {
                console.debug('Anniversary audio blocked:', e);
                this.isBackgroundPlaying = false;
            });
        } else {
            this.isBackgroundPlaying = true;
        }

        return playResult || Promise.resolve(track);
    }

    stopAnniversaryTrack() {
        if (!this.currentAnniversaryTrack) {
            this.currentAnniversaryTrackKey = null;
            this.isBackgroundPlaying = false;
            return;
        }

        this.currentAnniversaryTrack.pause();
        this.currentAnniversaryTrack.currentTime = 0;
        this.currentAnniversaryTrackKey = null;
        this.currentAnniversaryTrack = null;
        this.isBackgroundPlaying = false;
    }

    startSyntheticBirthdayBackground() {
        if (this.eventType !== 'birthday') return;
        if (this.syntheticBirthdayBgmTimer) return;

        // Quiet generative fallback loop that approximates soft magical ambience.
        const pattern = [
            { f: 261.63, d: 0.16, t: 'sine' },
            { f: 329.63, d: 0.14, t: 'triangle' },
            { f: 392.00, d: 0.18, t: 'sine' },
            { f: 523.25, d: 0.12, t: 'triangle' }
        ];

        let idx = 0;
        this.isBackgroundPlaying = true;
        this.syntheticBirthdayBgmTimer = window.setInterval(() => {
            const note = pattern[idx % pattern.length];
            this.generateTone(note.f, note.d, note.t);
            // Gentle sparkle accent every 4 beats.
            if (idx % 4 === 3) {
                this.generateTone(783.99, 0.06, 'triangle');
            }
            idx++;
        }, 1900);
    }

    stopSyntheticBirthdayBackground() {
        if (!this.syntheticBirthdayBgmTimer) return;
        window.clearInterval(this.syntheticBirthdayBgmTimer);
        this.syntheticBirthdayBgmTimer = null;
    }

    // Setup background music to start on user interaction
    setupUserInteractionAudio() {
        const startAudioOnInteraction = () => {
            if (!this.isBackgroundPlaying) {
                this.startBackgroundMusic();
            }
            document.removeEventListener('click', startAudioOnInteraction);
            document.removeEventListener('keydown', startAudioOnInteraction);
        };

        document.addEventListener('click', startAudioOnInteraction, { once: true });
        document.addEventListener('keydown', startAudioOnInteraction, { once: true });
    }
    initBackgroundMusic() {
        // No-op: retained for compatibility with earlier initialization calls.
    }
}

window.AudioManager = AudioManager;
