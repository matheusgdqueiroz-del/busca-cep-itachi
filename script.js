document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cep-form');
    const cepInput = document.getElementById('cep');
    const estadoInput = document.getElementById('estado');
    const cidadeInput = document.getElementById('cidade');
    const bairroInput = document.getElementById('bairro');
    const logradouroInput = document.getElementById('logradouro');
    const numeroInput = document.getElementById('numero');
    const btnBuscar = document.getElementById('btn-buscar');
    const groupCep = document.getElementById('group-cep');
    const statusChip = document.getElementById('status-chip');
    const soundToggle = document.getElementById('sound-toggle');
    const bgTrack = document.getElementById('bg-track');
    const slashField = document.getElementById('slash-field');
    const root = document.documentElement;

    const audio = {
        ctx: null,
        master: null,
        desired: true,
        playing: false
    };

    let sceneTimer = null;

    createRain(92);
    createCrows(7);
    initPointerFx();
    initAudio();
    scheduleAmbientStrikes();

    cepInput.addEventListener('input', async (event) => {
        tryStartAudioFromGesture(event);

        let value = event.target.value.replace(/\D/g, '');

        if (value.length > 5) {
            value = `${value.substring(0, 5)}-${value.substring(5, 8)}`;
        }

        event.target.value = value;

        if (value.length === 9) {
            if (validateCepFormat(value)) {
                await fetchAddress(value.replace(/\D/g, ''));
            }
        } else {
            groupCep.classList.remove('valid-input', 'invalid-input');
            setStatus('ViaCEP online', 'idle');
        }
    });

    cepInput.addEventListener('blur', async () => {
        const cleanCep = cepInput.value.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            await fetchAddress(cleanCep);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        tryStartAudioFromGesture(event);

        const cleanCep = cepInput.value.replace(/\D/g, '');

        if (cleanCep.length !== 8) {
            showError('Por favor, insira um CEP com 8 dígitos.');
            return;
        }

        await fetchAddress(cleanCep);
    });

    cepInput.addEventListener('keydown', async (event) => {
        tryStartAudioFromGesture(event);

        if (event.key === 'Enter') {
            event.preventDefault();
            const cleanCep = cepInput.value.replace(/\D/g, '');
            if (cleanCep.length === 8) {
                await fetchAddress(cleanCep);
            } else {
                showError('Formato de CEP incorreto.');
            }
        }
    });

    function validateCepFormat(cep) {
        const regex = /^[0-9]{5}-[0-9]{3}$/;
        if (regex.test(cep)) {
            groupCep.classList.remove('invalid-input');
            groupCep.classList.add('valid-input');
            return true;
        }

        showError('Formato de CEP inválido.');
        return false;
    }

    function showError(message) {
        groupCep.classList.remove('valid-input');
        groupCep.classList.add('invalid-input');

        const errorSpan = document.getElementById('error-cep');
        errorSpan.textContent = message;

        cepInput.classList.add('shake');
        setTimeout(() => cepInput.classList.remove('shake'), 450);

        setStatus('Falha na consulta', 'error');
        setSceneState('error');
        burstSlashes(4);
        playCue('error');
    }

    function clearError() {
        groupCep.classList.remove('invalid-input');
    }

    function clearAddressFields() {
        estadoInput.value = '';
        cidadeInput.value = '';
        bairroInput.value = '';
        logradouroInput.value = '';
        numeroInput.value = '';
    }

    async function fetchAddress(cep) {
        btnBuscar.classList.add('loading');
        btnBuscar.disabled = true;
        clearError();
        setStatus('Consultando', 'loading');
        setSceneState('loading');
        burstSlashes(2);
        playCue('search');

        const addressInputs = [estadoInput, cidadeInput, bairroInput, logradouroInput];
        addressInputs.forEach(input => {
            input.style.opacity = '0.62';
        });

        try {
            const url = `https://viacep.com.br/ws/${cep}/json/`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Falha na conexão com a API.');
            }

            const data = await response.json();

            if (data.erro) {
                showError('CEP não encontrado. Verifique e tente novamente.');
                clearAddressFields();
                groupCep.classList.remove('valid-input');
            } else {
                estadoInput.value = data.uf || '';
                cidadeInput.value = data.localidade || '';
                bairroInput.value = data.bairro || '';
                logradouroInput.value = data.logradouro || '';

                groupCep.classList.add('valid-input');
                setStatus('Endereço capturado', 'success');
                setSceneState('success');
                burstSlashes(7);
                playCue('success');
                numeroInput.focus();
            }
        } catch (error) {
            console.error('Erro ao buscar o CEP:', error);
            showError('Erro ao consultar o CEP. Tente mais tarde.');
        } finally {
            btnBuscar.classList.remove('loading');
            btnBuscar.disabled = false;
            addressInputs.forEach(input => {
                input.style.opacity = '1';
            });

            document.body.classList.remove('is-loading');
        }
    }

    function setStatus(text, state) {
        if (!statusChip) return;
        statusChip.textContent = text;
        statusChip.dataset.state = state;
    }

    function setSceneState(state) {
        clearTimeout(sceneTimer);
        document.body.classList.remove('is-loading', 'is-success', 'is-error');

        if (!state) return;

        document.body.classList.add(`is-${state}`);

        if (state !== 'loading') {
            sceneTimer = setTimeout(() => {
                document.body.classList.remove(`is-${state}`);
            }, 1400);
        }
    }

    function createRain(numDrops) {
        const container = document.getElementById('rain-field');
        if (!container) return;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < numDrops; i++) {
            const drop = document.createElement('span');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 112}%`;
            drop.style.setProperty('--height', `${Math.random() * 88 + 42}px`);
            drop.style.setProperty('--duration', `${Math.random() * 1.3 + 0.85}s`);
            drop.style.setProperty('--delay', `${Math.random() * -3.8}s`);
            drop.style.setProperty('--opacity', `${Math.random() * 0.2 + 0.08}`);
            fragment.appendChild(drop);
        }

        container.appendChild(fragment);
    }

    function createCrows(numCrows) {
        const container = document.getElementById('crow-field');
        if (!container) return;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < numCrows; i++) {
            const crow = document.createElement('span');
            crow.className = 'crow';
            crow.style.setProperty('--top', `${Math.random() * 54 + 10}%`);
            crow.style.setProperty('--size', `${Math.random() * 64 + 42}px`);
            crow.style.setProperty('--duration', `${Math.random() * 12 + 16}s`);
            crow.style.setProperty('--delay', `${Math.random() * -18}s`);
            crow.style.setProperty('--opacity', `${Math.random() * 0.16 + 0.08}`);
            crow.style.setProperty('--sway', `${Math.random() * 90 - 45}px`);
            fragment.appendChild(crow);
        }

        container.appendChild(fragment);
    }

    function burstSlashes(count) {
        if (!slashField) return;

        for (let i = 0; i < count; i++) {
            const slash = document.createElement('span');
            slash.className = 'slash';
            slash.style.setProperty('--left', `${Math.random() * 88 + 6}%`);
            slash.style.setProperty('--top', `${Math.random() * 74 + 12}%`);
            slash.style.setProperty('--width', `${Math.random() * 260 + 160}px`);
            slash.style.setProperty('--angle', `${Math.random() * 54 - 27}deg`);
            slash.style.animationDelay = `${Math.random() * 0.12}s`;
            slashField.appendChild(slash);
            setTimeout(() => slash.remove(), 800);
        }
    }

    function scheduleAmbientStrikes() {
        setTimeout(() => {
            if (Math.random() > 0.35) {
                burstSlashes(1);
            }
            scheduleAmbientStrikes();
        }, Math.random() * 3600 + 2800);
    }

    function initPointerFx() {
        const card = document.querySelector('.address-console');

        window.addEventListener('pointermove', (event) => {
            const x = (event.clientX / window.innerWidth) * 100;
            const y = (event.clientY / window.innerHeight) * 100;
            root.style.setProperty('--mouse-x', `${x}%`);
            root.style.setProperty('--mouse-y', `${y}%`);
        }, { passive: true });

        if (!card) return;

        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;
            const tiltY = ((localX / rect.width) - 0.5) * 3;
            const tiltX = ((localY / rect.height) - 0.5) * -3;
            root.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
            root.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        }, { passive: true });

        card.addEventListener('pointerleave', () => {
            root.style.setProperty('--tilt-x', '0deg');
            root.style.setProperty('--tilt-y', '0deg');
        });
    }

    function initAudio() {
        if (!bgTrack || !soundToggle) return;

        bgTrack.volume = 0.42;
        bgTrack.loop = true;

        soundToggle.addEventListener('click', async (event) => {
            event.stopPropagation();

            if (audio.playing) {
                pauseBackgroundAudio();
                return;
            }

            audio.desired = true;
            await startBackgroundAudio(false);
        });

        ['pointerdown', 'click', 'keydown', 'touchstart', 'focusin', 'input'].forEach(eventName => {
            window.addEventListener(eventName, tryStartAudioFromGesture, { passive: true });
        });

        startBackgroundAudio(true);

        setTimeout(() => {
            if (audio.desired && !audio.playing && bgTrack.paused) {
                setSoundButton(true, true);
            }
        }, 450);
    }

    async function tryStartAudioFromGesture(event) {
        if (event?.target?.closest?.('#sound-toggle')) return;
        if (!audio.desired || audio.playing) return;
        await startBackgroundAudio(false);
    }

    async function startBackgroundAudio(isAutoplayAttempt) {
        if (!bgTrack) return;

        audio.desired = true;

        try {
            if (!isAutoplayAttempt) {
                ensureAudioContext();
                if (audio.ctx && audio.ctx.state === 'suspended') {
                    await audio.ctx.resume();
                }
            }

            await bgTrack.play();
            audio.playing = true;
            setSoundButton(true, false);

            if (!isAutoplayAttempt) {
                ensureAudioContext();
                playCue('open');
            }
        } catch (error) {
            audio.playing = false;
            setSoundButton(true, true);
        }
    }

    function pauseBackgroundAudio() {
        bgTrack.pause();
        audio.playing = false;
        audio.desired = false;
        setSoundButton(false, false);
    }

    function setSoundButton(active, blocked) {
        soundToggle.classList.toggle('active', active);
        soundToggle.classList.toggle('blocked', blocked);
        soundToggle.innerHTML = active
            ? '<i class="fa-solid fa-volume-high"></i>'
            : '<i class="fa-solid fa-volume-xmark"></i>';

        if (active) {
            soundToggle.title = blocked ? 'Iniciar trilha sonora' : 'Desativar trilha sonora';
            soundToggle.setAttribute('aria-label', blocked ? 'Iniciar trilha sonora' : 'Desativar trilha sonora');
        } else {
            soundToggle.title = 'Ativar trilha sonora';
            soundToggle.setAttribute('aria-label', 'Ativar trilha sonora');
        }
    }

    function ensureAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audio.ctx) {
            audio.ctx = new AudioContext();
            audio.master = audio.ctx.createGain();
            audio.master.gain.value = 0.38;
            audio.master.connect(audio.ctx.destination);
        }
    }

    function playCue(type) {
        if (!audio.ctx || !audio.master) return;

        if (type === 'open') {
            playTone(146.83, 0.16, 'triangle', 0.04, 220);
        }

        if (type === 'search') {
            playTone(92.5, 0.22, 'sawtooth', 0.04, 55);
            playNoise(0.14, 0.035, 720);
        }

        if (type === 'success') {
            playTone(392, 0.12, 'triangle', 0.04, 392);
            playTone(523.25, 0.18, 'sine', 0.035, 659.25, 0.08);
        }

        if (type === 'error') {
            playTone(146.83, 0.22, 'sawtooth', 0.05, 73.42);
            playNoise(0.16, 0.04, 360);
        }
    }

    function playTone(startFrequency, duration, type, peakGain, endFrequency, delay = 0) {
        const ctx = audio.ctx;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + delay;
        const end = start + duration;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, start);

        if (endFrequency) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), end);
        }

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(audio.master);
        oscillator.start(start);
        oscillator.stop(end + 0.03);
    }

    function playNoise(duration, peakGain, frequency) {
        const ctx = audio.ctx;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const start = ctx.currentTime;

        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = 3.4;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(audio.master);
        source.start(start);
        source.stop(start + duration + 0.02);
    }
});
