// ==UserScript==
// @name         YouTube Enhanced Player
// @name:en      YouTube Enhanced Player
// @name:es      YouTube Reproductor Mejorado
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Запоминает позицию просмотра видео и возобновляет с этого места (минус 5 секунд)
// @description:en Remembers video playback position and resumes from that point (minus 5 seconds)
// @description:es Recuerda la posición de reproducción y continúa desde ese punto (menos 5 segundos)
// @author       LegonYY
// @icon         https://images.icon-icons.com/2248/PNG/512/youtube_studio_icon_138004.png
// @match        https://www.youtube.com/*
// @grant        none
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/533450/YouTube%20Enhanced%20Player.user.js
// @updateURL https://update.greasyfork.org/scripts/533450/YouTube%20Enhanced%20Player.meta.js
// @grant        GM_registerMenuCommand

// ==/UserScript==

(function() {
    'use strict';

    // ==================== Часть 1: Возобновление воспроизведения ====================
    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }
    function saveVideoTime(videoId, currentTime) {
    localStorage.setItem(`yt_time_${videoId}`, currentTime.toString());
}

    function loadVideoTime(videoId) {
        const savedTime = localStorage.getItem(`yt_time_${videoId}`);
        return savedTime ? parseFloat(savedTime) : 0;
    }
function showSaveNotification() {
    // 1) Находим актуальный контейнер оверлея плеера
    const overlay = document.querySelector('.html5-video-player .ytp-player-content')
                 || document.querySelector('.ytp-chrome-top')
                 || document.body;

    // 2) Делаем его position: relative (если ещё не установлен)
    if (getComputedStyle(overlay).position === 'static') {
        overlay.style.position = 'relative';
    }

    // 3) Удаляем старое уведомление (если есть)
    const old = overlay.querySelector('.timeSaveNotification');
    if (old) old.remove();

    // 4) Создаём новое уведомление
    const notif = document.createElement('div');
    notif.className = 'timeSaveNotification';
    Object.assign(notif.style, {
        position: 'absolute',
        bottom:  '0px',
        right:   '5px',
        background: 'rgba(0,0,0,0.7)',
        color:   '#fff',
        padding: '5px 5px',
        borderRadius: '5px',
        zIndex:  '9999',
        fontSize: '14px',
        transition: 'opacity 0.3s ease',
        opacity: '0',
    });
    notif.innerText = 'Время просмотра сохранено!';

    overlay.appendChild(notif);

    // 5) Запустить анимацию «появления»
    //    (нужен небольшой таймаут, чтобы браузер успел «нарисовать» с opacity=0)
    setTimeout(() => notif.style.opacity = '1', 10);

    // 6) И плавно убрать через 3 секунды
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => {
            if (notif.parentNode) notif.remove();
        }, 300);
    }, 3000);
}



    function initResumePlayback() {
    const video = document.querySelector('video');
    if (!video) return;

    const videoId = getVideoId();
    if (!videoId) return;

    // Загружаем сохраненное время
    const savedTime = loadVideoTime(videoId);
    if (savedTime > 0) {
        // Устанавливаем время на 5 секунд раньше сохраненного
        const resumeTime = Math.max(0, savedTime - 5);
        video.currentTime = resumeTime;
    }

    // Сохраняем время каждые 5 секунд (без уведомления)
    setInterval(() => {
        if (!video.paused) {
            const videoId = getVideoId();
            if (videoId) {
                localStorage.setItem(`yt_time_${videoId}`, video.currentTime.toString());
            }
        }
    }, 5000);

    // Сохраняем время при закрытии страницы (без уведомления)
    window.addEventListener('beforeunload', () => {
        const videoId = getVideoId();
        if (videoId) {
            localStorage.setItem(`yt_time_${videoId}`, video.currentTime.toString());
        }
    });
}

    // ==================== Часть 2: Усилитель громкости ====================
    function calculateVolume(position, sliderWidth) {
        const volume = (position / sliderWidth) * 1400;
        return volume.toFixed(3);
    }

function updateVolumeDisplay(volume) {
    // Удаляем старый индикатор (если остался)
    const old = document.getElementById('customVolumeDisplay');
    if (old) old.remove();

    // Находим кнопку усилителя громкости
    const btn = document.getElementById('volumeBoostButton');
    if (!btn) return;

    // Создаём индикатор
    const volumeDisplay = document.createElement('div');
    volumeDisplay.id = 'customVolumeDisplay';
    volumeDisplay.innerText = `${volume}%`;

    // Применяем ваш набор стилей
    Object.assign(volumeDisplay.style, {
        position: 'absolute',
        padding: '0px 0px',
        fontSize: '14px',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        borderRadius: '5px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease',
        opacity: '0'
    });

    // Вставляем в контейнер кнопки
    const btnContainer = btn.parentElement;
    btnContainer.style.position = 'relative';
    btnContainer.appendChild(volumeDisplay);

    // Позиционируем над кнопкой
    const btnRect = btn.getBoundingClientRect();
    const containerRect = btnContainer.getBoundingClientRect();
    const offsetX = btnRect.left - containerRect.left + btnRect.width / 2;
    const offsetY = btnRect.top - containerRect.top;

    volumeDisplay.style.left = `${offsetX}px`;
    volumeDisplay.style.top  = `${offsetY}px`;
    volumeDisplay.style.transform = 'translate(-50%, -100%)';

    // Плавно показываем
    requestAnimationFrame(() => {
        volumeDisplay.style.opacity = '1';
    });

    // Убираем через секунду
    setTimeout(() => {
        volumeDisplay.style.opacity = '0';
        setTimeout(() => volumeDisplay.remove(), 200);
    }, 1000);
}



    // ==================== Часть 3: Создание панели управления ====================
    function createControlPanel(video) {
        const videoId = getVideoId();
        if (!videoId) return;

        // Кнопка сохранения времени
        const saveButton = document.createElement('button');
        saveButton.id = 'manualSaveButton';
        saveButton.style.background = 'none';
        saveButton.style.border = 'none';
        saveButton.style.cursor = 'pointer';
        saveButton.style.marginRight = '5px';
        saveButton.innerText = '💾';
        saveButton.style.color = '#fff';
        saveButton.style.fontWeight = 'bold';
        saveButton.title = 'Сохранить текущее время просмотра';

        // В коде кнопки сохранения нужно вызвать эту функцию:
saveButton.addEventListener('click', function() {
    saveVideoTime(videoId, video.currentTime);
    showSaveNotification(); // Показываем уведомление только при нажатии
});

        // Кнопка усилителя громкости
        const volumeBoostButton = document.createElement('button');
        volumeBoostButton.id = 'volumeBoostButton';
        volumeBoostButton.style.background = 'none';
        volumeBoostButton.style.border = 'none';
        volumeBoostButton.style.cursor = 'pointer';
        volumeBoostButton.style.marginRight = '5px';
        volumeBoostButton.innerText = '🔊';
        volumeBoostButton.style.color = '#fff';
        volumeBoostButton.style.fontWeight = 'bold';
        volumeBoostButton.title = 'Усилитель громкости';

        // Ползунок громкости
        const customVolumeSlider = document.createElement('input');
        customVolumeSlider.type = 'range';
        customVolumeSlider.min = '0';
        customVolumeSlider.max = '1400';
        customVolumeSlider.step = '1';
        customVolumeSlider.style.width = '120px';
        customVolumeSlider.style.display = 'none';

        // Настройка AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);

        const videoSource = audioContext.createMediaElementSource(video);
        videoSource.connect(gainNode);

        customVolumeSlider.addEventListener('input', function() {
            const volume = calculateVolume(this.value, this.max);
            gainNode.gain.value = volume / 100;
            updateVolumeDisplay(volume);
        });

        function resetCustomVolumeSlider() {
            customVolumeSlider.value = '100';
            const initialVolume = calculateVolume(100, customVolumeSlider.max);
            gainNode.gain.value = initialVolume / 100;
            updateVolumeDisplay(initialVolume);
        }

        function toggleCustomVolumeSlider() {
            const isSliderHidden = customVolumeSlider.style.display === 'none';
            customVolumeSlider.style.display = isSliderHidden ? 'block' : 'none';
        }

        volumeBoostButton.addEventListener('click', function() {
            toggleCustomVolumeSlider();
            resetCustomVolumeSlider();
        });

        // Вставка кнопок в один контейнер слева
        const controls = document.querySelector('.ytp-chrome-controls');
        if (controls) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.marginRight = '10px';

            buttonContainer.appendChild(saveButton);
            buttonContainer.appendChild(volumeBoostButton);
            buttonContainer.appendChild(customVolumeSlider);
            controls.insertBefore(buttonContainer, controls.firstChild);
            buttonContainer.addEventListener('wheel', function(e) {
                e.preventDefault();
                const step = 50;
                let val = parseInt(customVolumeSlider.value, 10);
                if (e.deltaY < 0) {
                    val = Math.min(val + step, parseInt(customVolumeSlider.max, 10));
                } else {
                    val = Math.max(val - step, parseInt(customVolumeSlider.min, 10));
                }

                customVolumeSlider.value = val;
                customVolumeSlider.dispatchEvent(new Event('input'));
            });
        }

        resetCustomVolumeSlider();
    }

    // ==================== Основная инициализация ====================
    function init() {
        // Инициализация возобновления воспроизведения
        initResumePlayback();

        // Создаем панель управления
        const video = document.querySelector('video');
        if (video) {
            createControlPanel(video);
        }
    }

    // Ждем когда видео будет готово
    const checkVideo = setInterval(() => {
        if (document.querySelector('video') && document.querySelector('.ytp-chrome-controls')) {
            clearInterval(checkVideo);
            init();
        }
    }, 500);

})();
