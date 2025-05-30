import Compressor from 'compressorjs';

document.getElementById('id_media').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    new Compressor(file, {
        quality: 0.8,
        maxWidth: 800,
        success(result) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(new File([result], file.name, { type: result.type }));
            e.target.files = dataTransfer.files;
        },
        error(err) {
            console.error('Compression error:', err);
        },
    });
});