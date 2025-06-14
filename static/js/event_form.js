function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const mediaInput = document.querySelector('#id_media_files');
    const previewContainer = document.querySelector('#media-preview');
    const removeCheckbox = document.querySelector('input[name="remove_media"]');
    const eventTypeSelect = document.getElementById('id_event_type');
    const recurringField = document.getElementById('recurring-field');
    const customLabelField = document.getElementById('custom-label-field');
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
            file.type.startsWith('audio/') ? 'audio' :
            file.type === 'application/pdf' ? 'embed' : null
        );

        if (!element) return;

        element.src = previewUrl;
        if (file.type.startsWith('image/')) {
            element.className = 'max-w-xs mt-2 rounded-lg shadow-md';
        } else if (file.type.startsWith('audio/')) {
            element.controls = true;
        } else if (file.type === 'application/pdf') {
            element.type = 'application/pdf';
            element.className = 'w-full h-64 mt-2 rounded shadow';
        }

        previewContainer.appendChild(element);
    }

    if (mediaInput && previewContainer) {
        mediaInput.addEventListener('change', (event) => {
            clearPreviews();
            Array.from(event.target.files).slice(0, 3).forEach(createPreview);
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
            // customLabelField.style.display = isOther ? 'block' : 'none';

            // Ensure recurring checkbox is properly set
            const recurringCheckbox = recurringField.querySelector('input[type="checkbox"]');
            if (recurringCheckbox) {
                if (!isRecurringEvent) {
                    recurringCheckbox.checked = false;  // force uncheck
                    recurringCheckbox.disabled = true;  // disable input
                } else {
                    recurringCheckbox.disabled = false;
                }
            }

        };

        toggleFields();
        eventTypeSelect.addEventListener('change', toggleFields);
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