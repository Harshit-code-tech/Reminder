function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.querySelector('#id_image_files');
    const audioInput = document.querySelector('#id_audio_files');
    const previewContainer = document.querySelector('#media-preview');
    const removeCheckbox = document.querySelector('input[name="remove_media"]');
    const eventTypeSelect = document.getElementById('id_event_type');
    const recurringField = document.getElementById('recurring-field');
    const customLabelField = document.getElementById('custom-label-field');
    const recipientEmailInput = document.getElementById('id_recipient_email');
    const form = document.querySelector('form');
    let previewUrls = [];

    function clearPreviews() {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        previewUrls = [];
        previewContainer.innerHTML = '';
    }

    function createPreview(file) {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.push(previewUrl);
        const element = document.createElement(
            file.type.startsWith('image/') ? 'img' :
            file.type.startsWith('audio/') ? 'audio' : null
        );

        if (!element) return;

        element.src = previewUrl;
        if (file.type.startsWith('image/')) {
            element.className = 'max-w-xs mt-2 rounded-lg shadow-md';
        } else if (file.type.startsWith('audio/')) {
            element.controls = true;
            element.className = 'mt-2';
        }

        previewContainer.appendChild(element);
    }

    if (imageInput && audioInput && previewContainer) {
        imageInput.addEventListener('change', (event) => {
            clearPreviews();
            Array.from(event.target.files).slice(0, 3).forEach(createPreview);
        });
        audioInput.addEventListener('change', (event) => {
            Array.from(event.target.files).slice(0, 1).forEach(createPreview);
        });
    }

    if (removeCheckbox && previewContainer) {
        removeCheckbox.addEventListener('change', () => {
            previewContainer.style.display = removeCheckbox.checked ? 'none' : '';
            if (removeCheckbox.checked) clearPreviews();
        });
    }

    if (eventTypeSelect && recurringField && customLabelField) {
        const toggleFields = () => {
            const isOther = eventTypeSelect.value === 'other';
            const isRecurringEvent = ['birthday', 'anniversary'].includes(eventTypeSelect.value);

            recurringField.style.display = isRecurringEvent ? 'block' : 'none';

            const recurringCheckbox = recurringField.querySelector('input[type="checkbox"]');
            if (recurringCheckbox) {
                if (!isRecurringEvent) {
                    recurringCheckbox.checked = false;
                    recurringCheckbox.disabled = true;
                } else {
                    recurringCheckbox.disabled = false;
                }
            }
        };

        toggleFields();
        eventTypeSelect.addEventListener('change', toggleFields);
    }

    if (recipientEmailInput) {
        form.addEventListener('submit', (event) => {
            if (recipientEmailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmailInput.value)) {
                event.preventDefault();
                alert('Please enter a valid email address for the recipient.');
                recipientEmailInput.focus();
            }
        });
    }

    const downloadLinks = document.querySelectorAll('a[data-download="media"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.href;
            const jwt = getCookie('jwt');
            if (!jwt) {
                alert('Authentication required.');
                return;
            }
            fetch(url, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                    return res.blob();
                })
                .then(blob => {
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = url.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(downloadUrl);
                })
                .catch(err => {
                    console.error('Download failed:', err);
                    alert('Failed to download media.');
                });
        });
    });
});