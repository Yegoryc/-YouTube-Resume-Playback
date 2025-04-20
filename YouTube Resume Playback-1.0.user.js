// ==UserScript==
// @name         YouTube Resume Playback
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Запоминает позицию просмотра видео и возобновляет с этого места (минус 5 секунд)
// @author       YourName
// @match        https://www.youtube.com/watch*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Функция для получения ID видео из URL
    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    // Функция для сохранения времени просмотра
    function saveVideoTime(videoId, currentTime) {
        localStorage.setItem(`yt_time_${videoId}`, currentTime.toString());
    }

    // Функция для загрузки сохраненного времени
    function loadVideoTime(videoId) {
        const savedTime = localStorage.getItem(`yt_time_${videoId}`);
        return savedTime ? parseFloat(savedTime) : 0;
    }

    // Основная функция
    function init() {
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

        // Сохраняем время каждые 5 секунд
        setInterval(() => {
            if (!video.paused) {
                saveVideoTime(videoId, video.currentTime);
            }
        }, 5000);

        // Сохраняем время при закрытии страницы
        window.addEventListener('beforeunload', () => {
            saveVideoTime(videoId, video.currentTime);
        });
    }

    // Ждем когда видео будет готово
    const checkVideo = setInterval(() => {
        if (document.querySelector('video')) {
            clearInterval(checkVideo);
            init();
        }
    }, 500);
})();