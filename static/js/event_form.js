// static/js/event_form.js
document.addEventListener('DOMContentLoaded', () => {
    const mediaInput = document.querySelector('#id_media');
    const previewContainer = document.querySelector('#media-preview');
    const removeCheckbox = document.querySelector('input[name="remove_media"]');

    function updatePreview(file) {
        previewContainer.innerHTML = '';
        if (!file) return;
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'max-w-xs mt-2 rounded-lg shadow-md';
            previewContainer.appendChild(img);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = URL.createObjectURL(file);
            previewContainer.appendChild(audio);
        } else if (file.type === 'application/pdf') {
            const embed = document.createElement('embed');
            embed.src = URL.createObjectURL(file);
            embed.type = 'application/pdf';
            embed.className = 'w-full h-64 mt-2 rounded shadow';
            previewContainer.appendChild(embed);
        }
    }

    if (mediaInput && previewContainer) {
        mediaInput.addEventListener('change', (event) => {
            updatePreview(event.target.files[0]);
        });
    }

    if (removeCheckbox && previewContainer) {
        removeCheckbox.addEventListener('change', function() {
            previewContainer.style.display = this.checked ? 'none' : '';
        });
    }

    // Download links (for event_list.html)
    const downloadLinks = document.querySelectorAll('a[data-download="media"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Default browser download is usually enough, but you can enhance as needed
        });
    });
});