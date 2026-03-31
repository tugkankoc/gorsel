document.addEventListener('DOMContentLoaded', () => {
    const promptEl = document.getElementById('prompt');
    const charCount = document.getElementById('charCount');
    const providerEl = document.getElementById('provider');
    const modelEl = document.getElementById('model');
    const modelGroup = document.getElementById('modelGroup');
    const resolutionEl = document.getElementById('resolution');
    const resolutionGroup = document.getElementById('resolutionGroup');
    const aspectRatioEl = document.getElementById('aspectRatio');
    const imageCountEl = document.getElementById('imageCount');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const newTabBtn = document.getElementById('newTabBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');
    const retryBtn = document.getElementById('retryBtn');
    const clearGalleryBtn = document.getElementById('clearGallery');
    const errorMessage = document.getElementById('errorMessage');
    const loadingStatus = document.getElementById('loadingStatus');
    const activeBadge = document.getElementById('activeBadge');
    const translationNote = document.getElementById('translationNote');
    const translatedTextEl = document.getElementById('translatedText');
    const resultGrid = document.getElementById('resultGrid');

    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultState = document.getElementById('resultState');
    const errorState = document.getElementById('errorState');
    const galleryGrid = document.getElementById('galleryGrid');

    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxDots = document.getElementById('lightboxDots');
    const lightboxDownload = document.getElementById('lightboxDownload');

    let gallery = JSON.parse(localStorage.getItem('gorselAjansGallery') || '[]');
    let currentImageUrls = [];
    let currentImageUrl = null;
    let currentPrompt = null;
    let lightboxIndex = 0;

    const ASPECT_SIZES = {
        '1:1': [1024, 1024],
        '16:9': [1344, 768],
        '9:16': [768, 1344],
        '4:3': [1152, 864],
        '3:4': [864, 1152],
        '3:2': [1216, 832],
        '2:3': [832, 1216],
    };

    const COMFYUI_URL = '/comfyui';

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

        if (isPollinations) {
            activeBadge.textContent = `Pollinations - ${modelEl.options[modelEl.selectedIndex].text}`;
        } else if (isComfy) {
            activeBadge.textContent = 'ComfyUI - Z-Image-Turbo (Lokal)';
        } else {
            activeBadge.textContent = 'Higgsfield - Nano Banana Pro';
        }
    }

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            promptEl.value = chip.dataset.prompt;
            charCount.textContent = promptEl.value.length;
            translationNote.style.display = 'none';
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

    // --- AI Prompt Iyilestirme ---
    async function enhancePrompt(text) {
        try {
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: `You are an image prompt optimizer. Enhance the user's description into a detailed English prompt for AI image generation.

STRICT RULES:
- Stay FAITHFUL to the user's EXACT subject. Do NOT change or replace what they asked for.
- Do NOT add cultural stereotypes. "Istanbul" does NOT mean mosque. "Paris" does NOT mean Eiffel Tower. Focus on what the user specifically described.
- If the user says "plaza", show a modern plaza. If they say "woman on mountain", show exactly that.
- Add only TECHNICAL enhancements: lighting (golden hour, dramatic, soft), camera (85mm, wide angle, close-up), quality (photorealistic, ultra detailed, 8K, cinematic).
- Add atmosphere and mood that fits the scene naturally.
- Keep it under 80 words.
- NEVER include any text, brand names, or words that might appear ON the image. Describe visuals only.
- Always end with: no text, no letters, no watermark
- Return ONLY the prompt. No explanations, no quotes, no prefixes.`
                        },
                        { role: 'user', content: text }
                    ],
                    model: 'openai'
                })
            });
            const enhanced = (await res.text()).trim().replace(/^["']|["']$/g, '');
            if (enhanced && enhanced.length > 15 && !enhanced.includes('```')) {
                translatedTextEl.textContent = enhanced;
                translationNote.style.display = 'flex';
                return enhanced;
            }
        } catch {}
        translationNote.style.display = 'none';
        return text;
    }

    // --- Ana uretim fonksiyonu ---
    async function generate() {
        const prompt = promptEl.value.trim();
        if (!prompt) { promptEl.focus(); return; }

        currentPrompt = prompt;
        generateBtn.disabled = true;
        generateBtn.classList.add('loading');
        generateBtn.querySelector('span').textContent = 'Üretiliyor...';
        showState('loading');

        loadingStatus.textContent = 'AI prompt iyileştiriliyor...';
        const translatedPrompt = await enhancePrompt(prompt);

        const provider = providerEl.value;

        if (provider === 'pollinations') {
            await generateWithPollinations(translatedPrompt);
        } else if (provider === 'comfyui') {
            await generateWithComfyUI(translatedPrompt);
        } else {
            await generateWithHiggsfield(translatedPrompt);
        }
    }

    // --- Pollinations ---
    async function generateWithPollinations(prompt) {
        const aspect = aspectRatioEl.value;
        const [w, h] = ASPECT_SIZES[aspect] || [1024, 1024];
        const model = modelEl.value;
        const count = parseInt(imageCountEl.value);

        loadingStatus.textContent = 'Pollinations API ile görseller üretiliyor...';

        const statusMessages = ['AI modeli yükleniyor...', 'Prompt analiz ediliyor...', 'Görseller oluşturuluyor...', 'Detaylar ekleniyor...', 'Son rötuşlar yapılıyor...'];
        let msgIndex = 0;
        const statusInterval = setInterval(() => {
            if (msgIndex < statusMessages.length) { loadingStatus.textContent = statusMessages[msgIndex]; msgIndex++; }
        }, 3000);

        const encoded = encodeURIComponent(prompt);
        const promises = [];

        for (let i = 0; i < count; i++) {
            const seed = Math.floor(Math.random() * 999999);
            const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true&enhance=true`;

            promises.push(new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(imageUrl);
                img.onerror = () => reject(new Error('Yüklenemedi'));
                img.src = imageUrl;
            }));
        }

        try {
            const results = await Promise.allSettled(promises);
            clearInterval(statusInterval);
            const urls = results.filter(r => r.status === 'fulfilled').map(r => r.value);
            if (urls.length > 0) {
                showResults(urls);
            } else {
                showError('Görseller yüklenemedi. Lütfen tekrar deneyin.');
            }
        } catch {
            clearInterval(statusInterval);
            showError('Görseller yüklenemedi. Lütfen tekrar deneyin.');
        }
    }

    // --- ComfyUI - Z-Image-Turbo ---
    function buildComfyWorkflow(prompt, w, h, seed) {
        return {
            "1": {
                "class_type": "UNETLoader",
                "inputs": { "unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default" }
            },
            "2": {
                "class_type": "CLIPLoader",
                "inputs": { "clip_name": "qwen_3_4b.safetensors", "type": "qwen_image" }
            },
            "3": {
                "class_type": "VAELoader",
                "inputs": { "vae_name": "ae.safetensors" }
            },
            "4": {
                "class_type": "TextEncodeZImageOmni",
                "inputs": { "prompt": prompt, "clip": ["2", 0], "auto_resize_images": true }
            },
            "5": {
                "class_type": "TextEncodeZImageOmni",
                "inputs": { "prompt": "text, letters, words, writing, watermark, signature, logo, caption, label, numbers, typo, font, alphabet, subtitle", "clip": ["2", 0], "auto_resize_images": true }
            },
            "6": {
                "class_type": "EmptyLatentImage",
                "inputs": { "width": w, "height": h, "batch_size": 1 }
            },
            "7": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": 8,
                    "cfg": 1.0,
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["4", 0],
                    "negative": ["5", 0],
                    "latent_image": ["6", 0]
                }
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": { "samples": ["7", 0], "vae": ["3", 0] }
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": { "filename_prefix": "GorselAjans", "images": ["8", 0] }
            }
        };
    }

    async function generateWithComfyUI(prompt) {
        loadingStatus.textContent = 'ComfyUI bağlantısı kontrol ediliyor...';

        const aspect = aspectRatioEl.value;
        const [w, h] = ASPECT_SIZES[aspect] || [1024, 1024];
        const count = parseInt(imageCountEl.value);

        try {
            loadingStatus.textContent = `${count} farklı görsel üretimi başlatılıyor...`;

            // Her görsel için tamamen farklı random seed ile ayrı istek gönder
            const promptIds = [];
            for (let i = 0; i < count; i++) {
                const seed = Math.floor(Math.random() * 999999999);
                const workflow = buildComfyWorkflow(prompt, w, h, seed);

                const queueRes = await fetch(`${COMFYUI_URL}/prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: workflow })
                });

                if (!queueRes.ok) {
                    const err = await queueRes.json().catch(() => ({}));
                    throw new Error(err.error?.message || 'ComfyUI isteği başarısız');
                }

                const data = await queueRes.json();
                promptIds.push(data.prompt_id);
            }

            loadingStatus.textContent = `Z-Image-Turbo ${count} görsel üretiyor...`;

            // Tüm sonuçları bekle
            const allUrls = [];
            for (let i = 0; i < promptIds.length; i++) {
                loadingStatus.textContent = `Görsel ${i + 1}/${count} işleniyor...`;
                const urls = await waitForComfyResults(promptIds[i]);
                allUrls.push(...urls);
            }

            showResults(allUrls);

        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                showError('ComfyUI bağlantısı kurulamadı. Pinokio\'dan ComfyUI\'ın çalıştığından emin olun.');
            } else {
                showError(err.message);
            }
        }
    }

    async function waitForComfyResults(promptId) {
        const statusMessages = ['Z-Image-Turbo modeli yükleniyor...', 'Qwen text encoder çalışıyor...', 'Sampling yapılıyor (8 adım)...', 'VAE decode ediliyor...'];
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

                        for (const nodeId in outputs) {
                            if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                                const urls = outputs[nodeId].images.map(img =>
                                    `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`
                                );
                                resolve(urls);
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

    // --- Higgsfield ---
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
            showResults([data.url]);
        } catch (err) {
            showError(err.message);
        }
    }

    // --- Sonuclari goster (coklu gorsel) ---
    function showResults(imageUrls) {
        currentImageUrls = imageUrls;
        currentImageUrl = imageUrls[0];

        resultGrid.innerHTML = '';

        const gridClass = imageUrls.length === 1 ? 'single' : imageUrls.length === 2 ? 'double' : 'triple';
        resultGrid.className = `result-grid ${gridClass}`;

        imageUrls.forEach((url, i) => {
            const card = document.createElement('div');
            card.className = `result-card ${i === 0 ? 'selected' : ''}`;
            card.innerHTML = `
                <img src="${url}" alt="Sonuç ${i + 1}">
                ${imageUrls.length > 1 ? `<span class="result-badge">${i + 1}</span>` : ''}
            `;
            card.addEventListener('click', () => openLightbox(i));
            resultGrid.appendChild(card);
        });

        showState('result');
        resetButton();

        imageUrls.forEach(url => {
            gallery.unshift({ url, prompt: currentPrompt, date: new Date().toISOString() });
        });
        if (gallery.length > 30) gallery = gallery.slice(0, 30);
        localStorage.setItem('gorselAjansGallery', JSON.stringify(gallery));
        renderGallery();
    }

    function selectResult(index) {
        currentImageUrl = currentImageUrls[index];
        resultGrid.querySelectorAll('.result-card').forEach((card, i) => {
            card.classList.toggle('selected', i === index);
        });
    }

    // --- Fullscreen Lightbox ---
    function openLightbox(index) {
        lightboxIndex = index;
        updateLightbox();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightbox() {
        lightboxImg.classList.add('switching');
        setTimeout(() => {
            lightboxImg.src = currentImageUrls[lightboxIndex];
            lightboxImg.classList.remove('switching');
        }, 150);

        lightboxCounter.textContent = `${lightboxIndex + 1} / ${currentImageUrls.length}`;

        lightboxPrev.classList.toggle('hidden', lightboxIndex === 0);
        lightboxNext.classList.toggle('hidden', lightboxIndex === currentImageUrls.length - 1);

        // Dots
        lightboxDots.innerHTML = '';
        if (currentImageUrls.length > 1) {
            currentImageUrls.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = `lightbox-dot ${i === lightboxIndex ? 'active' : ''}`;
                dot.addEventListener('click', () => { lightboxIndex = i; updateLightbox(); });
                lightboxDots.appendChild(dot);
            });
        }

        selectResult(lightboxIndex);
    }

    lightboxClose.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

    lightboxPrev.addEventListener('click', () => {
        if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
    });

    lightboxNext.addEventListener('click', () => {
        if (lightboxIndex < currentImageUrls.length - 1) { lightboxIndex++; updateLightbox(); }
    });

    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
        if (e.key === 'ArrowRight' && lightboxIndex < currentImageUrls.length - 1) { lightboxIndex++; updateLightbox(); }
    });

    // Touch swipe
    let touchStartX = 0;
    let touchStartY = 0;
    lightbox.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0 && lightboxIndex < currentImageUrls.length - 1) { lightboxIndex++; updateLightbox(); }
        if (dx > 0 && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
    }, { passive: true });

    lightboxDownload.addEventListener('click', async () => {
        const url = currentImageUrls[lightboxIndex];
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `tugkanapp-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, '_blank');
        }
    });

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
                currentImageUrls = [item.url];
                currentImageUrl = item.url;
                currentPrompt = item.prompt;
                promptEl.value = item.prompt;
                charCount.textContent = item.prompt.length;
                showResults([item.url]);
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
            a.download = `tugkanapp-${Date.now()}.png`;
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
