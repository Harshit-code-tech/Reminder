// Helper to get cookie by name
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
    let previewUrl = null;

    function updatePreview(file) {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
        previewContainer.innerHTML = '';
        if (!file) return;
        previewUrl = URL.createObjectURL(file);
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = previewUrl;
            img.className = 'max-w-xs mt-2 rounded-lg shadow-md';
            previewContainer.appendChild(img);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = previewUrl;
            previewContainer.appendChild(audio);
        } else if (file.type === 'application/pdf') {
            const embed = document.createElement('embed');
            embed.src = previewUrl;
            embed.type = 'application/pdf';
            embed.className = 'w-full h-64 mt-2 rounded shadow';
            previewContainer.appendChild(embed);
        }
    }

    if (mediaInput && previewContainer) {
        mediaInput.addEventListener('change', (event) => {
            // updatePreview(event.target.files[0]);
            previewContainer.innerHTML = '';
            Array.from(event.target.files).slice(0, 3).forEach(file => {
                const previewUrl = URL.createObjectURL(file);
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = previewUrl;
                    img.className = 'max-w-xs mt-2 rounded-lg shadow-md';
                    previewContainer.appendChild(img);
                } else if (file.type.startsWith('audio/')) {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = previewUrl;
                    previewContainer.appendChild(audio);
                }
            });
        });
    }

    if (removeCheckbox && previewContainer) {
        removeCheckbox.addEventListener('change', function() {
            previewContainer.style.display = this.checked ? 'none' : '';
            if (this.checked && previewUrl) {
                URL.revokeObjectURL(previewUrl);
                previewUrl = null;
            }
        });
    }

    // Download links (for event_list.html)
    const downloadLinks = document.querySelectorAll('a[data-download="media"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.href;
            const jwt = getCookie('jwt');
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
                    a.click();
                    URL.revokeObjectURL(downloadUrl);
                })
                .catch(err => {
                    console.error('Download failed:', err);
                    alert('Failed to download media.');
                });
        });
    });
});