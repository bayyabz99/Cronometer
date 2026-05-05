// --- DOM Elementleri ---
const stopwatchDisplay = document.querySelector('.stopwatch-display');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const millisecondsEl = document.getElementById('milliseconds');

const startStopButton = document.getElementById('start-stop-button');
const lapResetButton = document.getElementById('lap-reset-button');
const lapsListEl = document.getElementById('laps-list');
const downloadCsvButton = document.getElementById('download-csv-button');
const themeToggleButton = document.getElementById('theme-toggle');
const fullscreenToggleButton = document.getElementById('fullscreen-toggle');
const audioCheckbox = document.getElementById('audio-checkbox');

// --- Kronometre Durumu ve Değişkenler ---
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let animationFrameId = null;
let lastLapTime = 0;
let laps = [];

// --- Yerel Depolama (localStorage) Anahtarları ---
const STORAGE_KEY_ELAPSED_TIME = 'stopwatchElapsedTime';
const STORAGE_KEY_IS_RUNNING = 'stopwatchIsRunning';
const STORAGE_KEY_START_TIME = 'stopwatchStartTime';
const STORAGE_KEY_LAPS = 'stopwatchLaps';
const STORAGE_KEY_THEME = 'stopwatchTheme';

// --- Yardımcı Fonksiyonlar ---

/**
 * Milisaniyeyi HH:MM:SS.mmm formatına dönüştürür.
 * @param {number} ms - Milisaniye cinsinden süre.
 * @returns {object} - Formatlanmış süre nesnesi.
 */
const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = String(ms % 1000).padStart(3, '0').slice(0, 3);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    
    return { hours, minutes, seconds, milliseconds };
};

/**
 * Kronometre göstergesini günceller.
 * @param {number} ms - Güncel geçen süre (elapsedTime).
 */
const updateDisplay = (ms) => {
    const { hours, minutes, seconds, milliseconds } = formatTime(ms);
    hoursEl.textContent = hours;
    minutesEl.textContent = minutes;
    secondsEl.textContent = seconds;
    millisecondsEl.textContent = milliseconds.slice(0, 3); // Sadece ilk 3 haneyi göster
};

// --- Kronometre Mekanizması ---

/**
 * requestAnimationFrame tabanlı zaman sayma döngüsü.
 * @param {number} timestamp - Geçen zaman damgası.
 */
const step = (timestamp) => {
    if (!isRunning) return;

    // Geçen süreyi hesapla
    const currentTime = Date.now();
    elapsedTime = currentTime - startTime;

    // Display'i güncelle
    updateDisplay(elapsedTime);

    // Bir sonraki frame için tekrar çağır
    animationFrameId = requestAnimationFrame(step);
    
    // Süre kalıcılığını (perma-running) korumak için her saniyede bir kaydet
    if (Math.floor(elapsedTime / 1000) !== Math.floor((elapsedTime - (currentTime - timestamp)) / 1000)) {
        saveState();
    }
};

/**
 * Kronometreyi başlatır.
 */
const start = () => {
    if (isRunning) return;

    if (audioCheckbox.checked) playSound();
    
    isRunning = true;
    startStopButton.textContent = 'Durdur';
    lapResetButton.textContent = 'Tur';
    document.body.classList.add('stopwatch-running');
    lapResetButton.disabled = false;
    
    // startTime'ı şimdiki zaman ve mevcut elapsedTime'a göre ayarla
    startTime = Date.now() - elapsedTime;
    
    // Animasyonu başlat
    animationFrameId = requestAnimationFrame(step);
    
    // Durumu kaydet
    saveState();
};

/**
 * Kronometreyi durdurur.
 */
const stop = () => {
    if (!isRunning) return;
    
    if (audioCheckbox.checked) playSound();

    isRunning = false;
    startStopButton.textContent = 'Başlat';
    lapResetButton.textContent = 'Sıfırla';
    document.body.classList.remove('stopwatch-running');
    
    // Animasyonu durdur
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    // Durumu kaydet (isRunning: false)
    saveState();
};

/**
 * Kronometreyi sıfırlar.
 */
const reset = () => {
    // Sadece durmuşken sıfırlanabilir
    if (isRunning) return;

    elapsedTime = 0;
    lastLapTime = 0;
    laps = [];
    updateDisplay(0);
    lapsListEl.innerHTML = ''; // Tur listesini temizle
    lapResetButton.textContent = 'Tur / Sıfırla';
    lapResetButton.disabled = true;
    downloadCsvButton.style.display = 'none';

    // Durumu temizle
    clearState();
};

// --- Lap Time (Tur Zamanı) Fonksiyonları ---

/**
 * Tur zamanını kaydeder ve listeye ekler.
 */
const recordLap = () => {
    if (!isRunning) return;

    const currentLapTime = elapsedTime - lastLapTime;
    const lapNumber = laps.length + 1;

    // Tur nesnesi
    const lap = {
        number: lapNumber,
        duration: currentLapTime,
        totalTime: elapsedTime
    };
    laps.push(lap);
    lastLapTime = elapsedTime;

    // Turu listeye ekle
    displayLap(lap);
    
    // CSV butonunu görünür yap ve durumu kaydet
    downloadCsvButton.style.display = 'block';
    downloadCsvButton.disabled = false;
    saveState();
};

/**
 * Tek bir tur zamanını HTML listesine ekler.
 * @param {object} lap - Tur nesnesi.
 */
const displayLap = (lap) => {
    const lapEl = document.createElement('li');
    lapEl.className = 'lap-item';

    const formattedDuration = formatTime(lap.duration);
    const formattedTotal = formatTime(lap.totalTime);

    lapEl.innerHTML = `
        <span class="lap-number">${lap.number}</span>
        <span class="lap-duration">${formattedDuration.minutes}:${formattedDuration.seconds}.${formattedDuration.milliseconds}</span>
        <span class="total-time">${formattedTotal.hours}:${formattedTotal.minutes}:${formattedTotal.seconds}.${formattedTotal.milliseconds}</span>
    `;

    // Yeni turu listenin başına ekle (en son tur en üstte)
    lapsListEl.prepend(lapEl);
};

// --- Olay Dinleyicileri ---

startStopButton.addEventListener('click', () => {
    if (isRunning) {
        stop();
    } else {
        start();
    }
});

lapResetButton.addEventListener('click', () => {
    if (isRunning) {
        recordLap(); // Çalışıyorken Tur Zamanı
    } else {
        reset(); // Durmuşken Sıfırla
    }
});

// --- Tema Değiştirme ---

themeToggleButton.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    themeToggleButton.querySelector('.icon').textContent = isLight ? '🌙' : '☀️';
    localStorage.setItem(STORAGE_KEY_THEME, isLight ? 'light' : 'dark');
});

// --- Tam Ekran Modu (Mobil İçin) ---

fullscreenToggleButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Tam ekran modu başlatılamadı: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// --- Sesli Uyarı (Ek Özellik) ---

const playSound = () => {
    const audio = new Audio('data:audio/mp3;base64,...'); // Minimal bip sesi data URL'si (Buraya gerçek ses data URL'si veya dosya yolu eklenebilir)
    // Şimdilik sadece bir uyarı sesi çal
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
        // Tarayıcı destekliyorsa minimal bir bip sesi üretelim
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 notası
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); // Kısa bir bip
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }
    // Eğer tarayıcı AudioContext'i desteklemiyorsa, sadece konsola log atılabilir.
    console.log('Sesli Uyarı: Bip!');
};


// --- Kalıcılık (localStorage) Fonksiyonları ---

/**
 * Kronometre durumunu localStorage'a kaydeder.
 */
const saveState = () => {
    localStorage.setItem(STORAGE_KEY_ELAPSED_TIME, elapsedTime);
    localStorage.setItem(STORAGE_KEY_IS_RUNNING, isRunning);
    localStorage.setItem(STORAGE_KEY_START_TIME, startTime);
    localStorage.setItem(STORAGE_KEY_LAPS, JSON.stringify(laps));
};

/**
 * localStorage'dan durumu yükler ve kronometreyi ayarlar.
 */
const loadState = () => {
    const savedElapsedTime = localStorage.getItem(STORAGE_KEY_ELAPSED_TIME);
    const savedIsRunning = localStorage.getItem(STORAGE_KEY_IS_RUNNING);
    const savedStartTime = localStorage.getItem(STORAGE_KEY_START_TIME);
    const savedLaps = localStorage.getItem(STORAGE_KEY_LAPS);
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    
    // Temayı yükle
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleButton.querySelector('.icon').textContent = '🌙';
    } else {
        document.body.classList.remove('light-theme');
        themeToggleButton.querySelector('.icon').textContent = '☀️';
    }

    if (savedElapsedTime) {
        elapsedTime = parseInt(savedElapsedTime, 10);
        updateDisplay(elapsedTime);
    }

    if (savedLaps) {
        laps = JSON.parse(savedLaps);
        laps.forEach(lap => displayLap(lap)); // Tur listesini yeniden oluştur
        if (laps.length > 0) {
            lastLapTime = laps[laps.length - 1].totalTime;
            downloadCsvButton.style.display = 'block';
            downloadCsvButton.disabled = false;
        }
    }
    
    // Çalışma durumunu kontrol et ve devam ettir
    if (savedIsRunning === 'true' && savedStartTime) {
        startTime = parseInt(savedStartTime, 10);
        
        // Tarayıcı kapatılıp açıldıysa geçen ek süreyi hesapla
        const timeSinceLastSave = Date.now() - startTime;
        elapsedTime = timeSinceLastSave; 
        
        // Çalışmaya devam et
        start(); 
    } else {
        // Eğer durmuşsa, Durdur düğmesi metnini Sıfırla yap
        if (elapsedTime > 0) {
            lapResetButton.textContent = 'Sıfırla';
            lapResetButton.disabled = false;
        } else {
            lapResetButton.disabled = true;
        }
    }
};

/**
 * localStorage'daki tüm kronometre verilerini temizler.
 */
const clearState = () => {
    localStorage.removeItem(STORAGE_KEY_ELAPSED_TIME);
    localStorage.removeItem(STORAGE_KEY_IS_RUNNING);
    localStorage.removeItem(STORAGE_KEY_START_TIME);
    localStorage.removeItem(STORAGE_KEY_LAPS);
};

// --- CSV İndirme (Ek Özellik) ---

/**
 * Tur zamanlarını CSV formatında indirir.
 */
downloadCsvButton.addEventListener('click', () => {
    if (laps.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Başlık Satırı
    csvContent += "Tur Numarası,Tur Süresi (HH:MM:SS.mmm),Toplam Süre (HH:MM:SS.mmm)\n";

    // Veri Satırları
    laps.forEach(lap => {
        const duration = formatTime(lap.duration);
        const total = formatTime(lap.totalTime);
        
        const durationStr = `${duration.hours}:${duration.minutes}:${duration.seconds}.${duration.milliseconds}`;
        const totalStr = `${total.hours}:${total.minutes}:${total.seconds}.${total.milliseconds}`;

        csvContent += `${lap.number},"${durationStr}","${totalStr}"\n`;
    });

    // İndirme işlemini tetikle
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kronometre_tur_zamanlari.csv");
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
});

// --- Uygulama Başlangıcı ---
document.addEventListener('DOMContentLoaded', loadState);

    link.click(); 
    document.body.removeChild(link);
});

// --- Uygulama Başlangıcı ---
document.addEventListener('DOMContentLoaded', loadState);

