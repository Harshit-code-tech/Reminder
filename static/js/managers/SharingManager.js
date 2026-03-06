/**
 * SharingManager — share link generation and social link management.
 * Extracted from greeting_card.js.
 */

class SharingManager {
    constructor(app) {
        this.app = app;
    }

    get elements() { return this.app.elements; }

    setupSharing() {
        if (!this.elements.shareButton || !this.elements.shareModal) return;

        const sharePasswordInput = document.querySelector('#share-password');
        const generateLinkButton = document.querySelector('#generate-share-link');
        const closeModalButton = document.querySelector('#close-share-modal');
        const shareUrlContainer = document.querySelector('#share-url-container');

        this.elements.shareButton.addEventListener('click', () => {
            this.elements.shareModal.style.display = 'flex';
            sharePasswordInput.focus();
        });

        closeModalButton.addEventListener('click', () => {
            this.elements.shareModal.style.display = 'none';
            sharePasswordInput.value = '';
            shareUrlContainer.classList.add('hidden');
        });

        generateLinkButton.addEventListener('click', () => {
            this.generateShareLink(sharePasswordInput.value.trim());
        });

        // Close modal on escape or outside click
        this.elements.shareModal.addEventListener('click', (e) => {
            if (e.target === this.elements.shareModal) {
                closeModalButton.click();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.shareModal.style.display === 'flex') {
                closeModalButton.click();
            }
        });
    }

    generateShareLink(password) {
        // password is optional — backend handles empty password gracefully
        const eventId = this.elements.shareButton.dataset.eventId;
        const csrftoken = this.app.getCookie('csrftoken');

        fetch(`/reminders/card/${eventId}/generate-share/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                this.app.showFeedback(`Error: ${data.error}`, 'error');
                return;
            }

            const shareUrlContainer = document.querySelector('#share-url-container');
            const shareUrlElement = document.querySelector('#share-url');

            shareUrlElement.textContent = data.share_url;
            shareUrlContainer.classList.remove('hidden');

            // Update social links
            this.updateSocialLinks(data.share_url);

            if (data.warning) {
                this.app.showFeedback(data.warning, 'warning');
            } else {
                this.app.showFeedback('Share link generated successfully!', 'success');
            }
        })
        .catch(error => {
            console.error('Share link generation error:', error);
            this.app.showFeedback('Failed to generate share link.', 'error');
        });
    }

    updateSocialLinks(shareUrl) {
        const whatsappLink = document.querySelector('#whatsapp-share');
        const twitterLink = document.querySelector('#twitter-share');
        const emailLink = document.querySelector('#email-share');

        if (whatsappLink) {
            whatsappLink.href = `https://api.whatsapp.com/send?text=Check%20out%20my%20greeting%20card:%20${encodeURIComponent(shareUrl)}`;
        }

        if (twitterLink) {
            twitterLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=Check%20out%20my%20greeting%20card!`;
        }

        if (emailLink) {
            emailLink.href = `mailto:?subject=Greeting%20Card&body=Check%20out%20my%20greeting%20card:%20${encodeURIComponent(shareUrl)}`;
        }
    }
}

window.SharingManager = SharingManager;
