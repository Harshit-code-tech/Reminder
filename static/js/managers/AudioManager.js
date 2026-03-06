/**
 * AudioManager — manages all audio tracks, background music, and sound effects.
 * Extracted from greeting_card.js.
 */

class AudioManager {
    constructor(eventType) {
        this.eventType = eventType || 'birthday';
        this.backgroundVolume = 0.3;
        this.effectVolume = 0.6;
        this.isBackgroundPlaying = false;

        this.tracks = {
            background: null,
            bell: null,
            success: null,
            pageTransition: null,
            blessing: null,
            celebration: null
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

        } catch (error) {
            console.warn('AudioManager initialization failed:', error);
            this.isEnabled = false;
        }
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
    playBellSound() {
        if (this.tracks.bell && this.tracks.bell.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.bell.currentTime = 0;
            this.tracks.bell.play().catch(e => console.log('Audio blocked:', e));

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
            this.tracks.success.play().catch(e => console.log('Audio blocked:', e));

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
        if (this.tracks.pageTransition && this.tracks.pageTransition.readyState >= 2) {
            this.tracks.pageTransition.currentTime = 0;
            this.tracks.pageTransition.play().catch(e => console.log('Page Turn Audio blocked:', e));
        }
        else{
            this.generateTone(220, 0.3, 'sine');
        }
    }

    playBlessingSound() {
        console.log('Playing blessing sound');
        if (this.tracks.blessing && this.tracks.blessing.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.blessing.currentTime = 0;
            this.tracks.blessing.play().catch(e => console.log('Blessing audio blocked:', e));

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
        console.log('Playing celebration sound');
        if (this.tracks.celebration && this.tracks.celebration.readyState >= 2) {
            this.duckBackgroundAudio(true);
            this.tracks.celebration.currentTime = 0;
            this.tracks.celebration.play().catch(e => console.log('Celebration audio blocked:', e));

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
        if (this.tracks.background && this.tracks.background.readyState >= 2) {
            // FIXED: Validate volume before setting
            const volume = (typeof this.backgroundVolume === 'number' && isFinite(this.backgroundVolume))
                ? Math.max(0, Math.min(1, this.backgroundVolume)) : 0.3;

            this.tracks.background.volume = volume;
            this.tracks.background.play()
                .then(() => {
                    this.isBackgroundPlaying = true;
                    console.log('Background music started');
                })
                .catch(e => {
                    console.log('Background music blocked:', e);
                    // Try to start on first user interaction
                    this.setupUserInteractionAudio();
                });
        }
    }


    stopBackgroundMusic() {
        if (this.tracks.background) {
            this.tracks.background.pause();
            this.tracks.background.currentTime = 0;
            this.isBackgroundPlaying = false;
        }
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

        console.log('Background music system initialized (files not found, using fallbacks)');
    }
}

window.AudioManager = AudioManager;
