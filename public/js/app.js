document.addEventListener('DOMContentLoaded', () => {
    const promptEl = document.getElementById('prompt');
    const charCount = document.getElementById('charCount');
    const providerEl = document.getElementById('provider');
    const modelEl = document.getElementById('model');
    const modelGroup = document.getElementById('modelGroup');
    const resolutionEl = document.getElementById('resolution');
    const resolutionGroup = document.getElementById('resolutionGroup');
    const aspectRatioEl = document.getElementById('aspectRatio');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const newTabBtn = document.getElementById('newTabBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');
    const retryBtn = document.getElementById('retryBtn');
    const clearGalleryBtn = document.getElementById('clearGallery');
    const resultImage = document.getElementById('resultImage');
    const errorMessage = document.getElementById('errorMessage');
    const loadingStatus = document.getElementById('loadingStatus');
    const activeBadge = document.getElementById('activeBadge');

    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultState = document.getElementById('resultState');
    const errorState = document.getElementById('errorState');
    const galleryGrid = document.getElementById('galleryGrid');

    let gallery = JSON.parse(localStorage.getItem('gorselAjansGallery') || '[]');
    let currentImageUrl = null;
    let currentPrompt = null;

    const ASPECT_SIZES = {
        '1:1': [1024, 1024],
        '16:9': [1344, 768],
        '9:16': [768, 1344],
        '4:3': [1152, 864],
        '3:4': [864, 1152],
        '3:2': [1216, 832],
        '2:3': [832, 1216],
    };

    const COMFYUI_URL = 'http://127.0.0.1:8188';

    renderGallery();
    updateProviderUI();

    promptEl.addEventListener('input', () => {
        charCount.textContent = promptEl.value.length;
    });

    providerEl.addEventListener('change', updateProviderUI);
    modelEl.addEventListener('change', updateProviderUI);

    function updateProviderUI() {
        const provider = providerEl.value;
        const isPollinations = provider === 'pollinations';
        const isComfy = provider === 'comfyui';

        modelGroup.style.display = isPollinations ? '' : 'none';
        resolutionGroup.style.display = 'none';

        if (isPollinations) {
            activeBadge.textContent = `Pollinations - ${modelEl.options[modelEl.selectedIndex].text}`;
        } else if (isComfy) {
            activeBadge.textContent = 'ComfyUI - FLUX Schnell (Lokal)';
        } else {
            activeBadge.textContent = 'Higgsfield - Nano Banana Pro';
        }
    }

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            promptEl.value = chip.dataset.prompt;
            charCount.textContent = promptEl.value.length;
            promptEl.focus();
        });
    });

    function showState(state) {
        emptyState.style.display = 'none';
        loadingState.style.display = 'none';
        resultState.style.display = 'none';
        errorState.style.display = 'none';
        if (state === 'empty') emptyState.style.display = '';
        if (state === 'loading') loadingState.style.display = '';
        if (state === 'result') resultState.style.display = '';
        if (state === 'error') errorState.style.display = '';
    }

    async function generate() {
        const prompt = promptEl.value.trim();
        if (!prompt) { promptEl.focus(); return; }

        currentPrompt = prompt;
        generateBtn.disabled = true;
        generateBtn.classList.add('loading');
        generateBtn.querySelector('span').textContent = 'Üretiliyor...';
        showState('loading');

        const provider = providerEl.value;

        if (provider === 'pollinations') {
            await generateWithPollinations(prompt);
        } else if (provider === 'comfyui') {
            await generateWithComfyUI(prompt);
        } else {
            await generateWithHiggsfield(prompt);
        }
    }

    // Pollinations
    async function generateWithPollinations(prompt) {
        const aspect = aspectRatioEl.value;
        const [w, h] = ASPECT_SIZES[aspect] || [1024, 1024];
        const model = modelEl.value;
        const seed = Math.floor(Math.random() * 999999);
        const encoded = encodeURIComponent(prompt);

        const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true&enhance=true`;

        loadingStatus.textContent = 'Pollinations API ile görsel üretiliyor...';

        const img = new Image();
        img.crossOrigin = 'anonymous';

        const statusMessages = ['AI modeli yükleniyor...', 'Prompt analiz ediliyor...', 'Görsel oluşturuluyor...', 'Detaylar ekleniyor...', 'Son rötuşlar yapılıyor...'];
        let msgIndex = 0;
        const statusInterval = setInterval(() => {
            if (msgIndex < statusMessages.length) { loadingStatus.textContent = statusMessages[msgIndex]; msgIndex++; }
        }, 3000);

        img.onload = () => { clearInterval(statusInterval); showResult(imageUrl); };
        img.onerror = () => { clearInterval(statusInterval); showError('Görsel yüklenemedi. Lütfen tekrar deneyin.'); };
        img.src = imageUrl;
    }

    // ComfyUI - Lokal FLUX Schnell
    async function generateWithComfyUI(prompt) {
        loadingStatus.textContent = 'ComfyUI bağlantısı kontrol ediliyor...';

        const aspect = aspectRatioEl.value;
        const [w, h] = ASPECT_SIZES[aspect] || [1024, 1024];
        const seed = Math.floor(Math.random() * 999999999);

        const workflow = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": { "ckpt_name": "flux1-schnell-fp8.safetensors" }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": prompt, "clip": ["1", 1] }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": { "text": "text, watermark, blurry, low quality", "clip": ["1", 1] }
            },
            "4": {
                "class_type": "EmptyLatentImage",
                "inputs": { "width": w, "height": h, "batch_size": 1 }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": 4,
                    "cfg": 1.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0]
                }
            },
            "6": {
                "class_type": "VAEDecode",
                "inputs": { "samples": ["5", 0], "vae": ["1", 2] }
            },
            "7": {
                "class_type": "SaveImage",
                "inputs": { "filename_prefix": "GorselAjans", "images": ["6", 0] }
            }
        };

        try {
            loadingStatus.textContent = 'Görsel üretimi başlatılıyor...';

            // Prompt gönder
            const queueRes = await fetch(`${COMFYUI_URL}/prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: workflow })
            });

            if (!queueRes.ok) {
                const err = await queueRes.json().catch(() => ({}));
                throw new Error(err.error?.message || 'ComfyUI isteği başarısız');
            }

            const { prompt_id } = await queueRes.json();
            loadingStatus.textContent = 'RTX 5090 görsel üretiyor...';

            // Sonucu bekle
            const imageUrl = await waitForComfyResult(prompt_id);
            showResult(imageUrl);

        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                showError('ComfyUI bağlantısı kurulamadı. Pinokio\'dan ComfyUI\'ın çalıştığından emin olun.');
            } else {
                showError(err.message);
            }
        }
    }

    async function waitForComfyResult(promptId) {
        const statusMessages = ['GPU modeli yüklüyor...', 'Latent space oluşturuluyor...', 'Sampling yapılıyor...', 'VAE decode ediliyor...'];
        let msgIndex = 0;
        const statusInterval = setInterval(() => {
            if (msgIndex < statusMessages.length) { loadingStatus.textContent = statusMessages[msgIndex]; msgIndex++; }
        }, 2000);

        return new Promise((resolve, reject) => {
            const checkHistory = async () => {
                try {
                    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
                    const data = await res.json();

                    if (data[promptId]) {
                        clearInterval(statusInterval);
                        const outputs = data[promptId].outputs;

                        // SaveImage node'unun çıktısını bul
                        for (const nodeId in outputs) {
                            if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                                const img = outputs[nodeId].images[0];
                                const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                                resolve(imageUrl);
                                return;
                            }
                        }
                        reject(new Error('Görsel çıktısı bulunamadı'));
                        return;
                    }

                    setTimeout(checkHistory, 1000);
                } catch (err) {
                    clearInterval(statusInterval);
                    reject(err);
                }
            };
            checkHistory();
        });
    }

    // Higgsfield
    async function generateWithHiggsfield(prompt) {
        loadingStatus.textContent = 'Higgsfield API\'ye istek gönderiliyor...';

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: 'nano-banana-pro',
                    resolution: resolutionEl.value,
                    aspect_ratio: aspectRatioEl.value
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'İstek başarısız');
            showResult(data.url);
        } catch (err) {
            showError(err.message);
        }
    }

    function showResult(imageUrl) {
        currentImageUrl = imageUrl;
        resultImage.src = imageUrl;
        showState('result');
        resetButton();

        gallery.unshift({ url: imageUrl, prompt: currentPrompt, date: new Date().toISOString() });
        if (gallery.length > 20) gallery = gallery.slice(0, 20);
        localStorage.setItem('gorselAjansGallery', JSON.stringify(gallery));
        renderGallery();
    }

    function showError(message) {
        errorMessage.textContent = message;
        showState('error');
        resetButton();
    }

    function resetButton() {
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
        generateBtn.querySelector('span').textContent = 'Görsel Üret';
    }

    function renderGallery() {
        galleryGrid.innerHTML = '';
        clearGalleryBtn.style.display = gallery.length > 0 ? '' : 'none';

        gallery.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.url}" alt="Üretilen görsel" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-prompt">${escapeHtml(item.prompt)}</span>
                </div>
            `;
            div.addEventListener('click', () => {
                currentImageUrl = item.url;
                currentPrompt = item.prompt;
                resultImage.src = item.url;
                promptEl.value = item.prompt;
                charCount.textContent = item.prompt.length;
                showState('result');
            });
            galleryGrid.appendChild(div);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateBtn.addEventListener('click', generate);
    promptEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) generate(); });

    downloadBtn.addEventListener('click', async () => {
        if (!currentImageUrl) return;
        try {
            const res = await fetch(currentImageUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gorsel-ajans-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(currentImageUrl, '_blank');
        }
    });

    newTabBtn.addEventListener('click', () => { if (currentImageUrl) window.open(currentImageUrl, '_blank'); });
    regenerateBtn.addEventListener('click', generate);
    retryBtn.addEventListener('click', generate);

    clearGalleryBtn.addEventListener('click', () => {
        gallery = [];
        localStorage.removeItem('gorselAjansGallery');
        renderGallery();
    });
});
