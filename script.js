// Помощник для ожидания (асинхронная задержка).
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Глобальные переменные для хранения данных и текущей сортировки.
let currentData = null; // Хранит данные кластеров после запроса.
let currentSort = 'none'; // Текущий тип сортировки: 'none' (по умолчанию), 'title' или 'rating'.

// Функция для сортировки данных внутри кластеров.
// Эта функция модифицирует currentData, сортируя фильмы в каждом кластере в зависимости от типа.
function sortData(type) {
    if (!currentData || !currentData.clusters) return; // Если данных нет, выходим.
    
    currentSort = type; // Обновляем текущий тип сортировки.
    
    currentData.clusters.forEach(cluster => {
        if (type === 'title') {
            // Сортировка по названию (алфавитно, ascending).
            cluster.items.sort((a, b) => a.title.localeCompare(b.title));
        } else if (type === 'rating') {
            // Сортировка по рейтингу (descending, от высокого к низкому).
            cluster.items.sort((a, b) => b.rating - a.rating);
        }
        // Если 'none', не сортируем (остается как от сервера).
    });
}

// Функция для отрисовки результатов.
// Очищает контейнер, добавляет панель сортировки (если данные есть), сортирует данные (если нужно) и рендерит кластеры.
function renderResults(data) {
    const container = document.getElementById('results-container');
    container.innerHTML = ''; // Очищаем предыдущий контент.
    
    if (!data.clusters || data.clusters.length === 0) {
        // Если нет кластеров, показываем сообщение.
        container.innerHTML = '<h3>🤷‍♂️ Похоже, по вашему запросу ничего не найдено.</h3>';
        return;
    }
    
    // Добавляем панель сортировки (отдельные кнопки после кластеризации).
    const sortBar = document.createElement('div');
    sortBar.className = 'sort-bar';
    sortBar.innerHTML = `
        <button class="sort-btn" id="sort-none">Без сортировки</button>
        <button class="sort-btn" id="sort-title">Сортировать по названию</button>
        <button class="sort-btn" id="sort-rating">Сортировать по рейтингу</button>
    `;
    container.appendChild(sortBar);
    
    // Прикрепляем слушатели к кнопкам сортировки (после создания).
    document.getElementById('sort-none').addEventListener('click', () => {
        sortData('none');
        renderResults(currentData);
    });
    document.getElementById('sort-title').addEventListener('click', () => {
        sortData('title');
        renderResults(currentData);
    });
    document.getElementById('sort-rating').addEventListener('click', () => {
        sortData('rating');
        renderResults(currentData);
    });
    
    // Рендерим кластеры.
    data.clusters.forEach((cluster, index) => {
        const clusterDiv = document.createElement('div');
        clusterDiv.className = 'cluster';
        
        clusterDiv.innerHTML = `
            <h3>Кластер ${index + 1} (Средний рейтинг: ${cluster.avg_rating.toFixed(1)})</h3>
            <div class="cluster-grid">
                ${cluster.items.map(movie => `
                    <div class="movie-card">
                        <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='https://picsum.photos/seed/${movie.id}/240/360'">
                        <div class="movie-card-info">
                            <h4>${movie.title}</h4>
                            <p class="rating">⭐️ ${movie.rating}</p>
                            <p>${movie.genres.join(', ')}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(clusterDiv);
    });
}

// ---- Главный код ----
// Ждем загрузки DOM перед инициализацией.
document.addEventListener('DOMContentLoaded', () => {
    // --- Настройка элементов интерфейса ---
    const genreSelect = document.getElementById('genre-select'); // Select для жанра.
    const ratingSlider = document.getElementById('rating-slider'); // Слайдер рейтинга.
    const ratingValue = document.getElementById('rating-value'); // Текст текущего рейтинга.
    const clusterBtn = document.getElementById('cluster-btn'); // Кнопка кластеризации.
    const ticketWrapper = document.getElementById('ticket-wrapper'); // Обертка билета.
    const clapperboard = document.getElementById('clapperboard'); // Хлопушка.
    const resultsContainer = document.getElementById('results-container'); // Контейнер результатов.
    
    // Обновляем текст рейтинга при изменении слайдера.
    ratingSlider.addEventListener('input', () => {
        ratingValue.textContent = parseFloat(ratingSlider.value).toFixed(1);
    });
    
    // 1. Загружаем жанры с бэкенда (относительный путь к API).
    fetch('/genres')
        .then(res => {
            if (!res.ok) { throw new Error(`Network response was not ok: ${res.statusText}`); }
            return res.json();
        })
        .then(data => {
            genreSelect.innerHTML = ''; // Очищаем select.
            (data.genres || []).forEach(genre => {
                // Добавляем опции жанров.
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке жанров:', error);
            genreSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        });
    
    // 2. Слушаем клик по главной кнопке кластеризации.
    clusterBtn.addEventListener('click', async () => {
        // Получаем значения фильтров.
        const genre = genreSelect.value;
        const rating = ratingSlider.value;
        
        // --- НАЧАЛО АНИМАЦИИ ---
        // Устанавливаем значения на хлопушке.
        document.getElementById('clapper-genre').textContent = genre;
        document.getElementById('clapper-rating').textContent = rating;
        
        resultsContainer.classList.remove('show'); // Скрываем результаты.
        clapperboard.classList.add('show'); // Показываем хлопушку.
        await wait(600); // Ждем анимацию.
        
        clapperboard.classList.add('clap'); // Хлопок.
        ticketWrapper.classList.add('eaten'); // "Съедаем" билет.
        
        // Запрашиваем данные у сервера (относительный путь).
        const responsePromise = fetch(`/cluster?genre=${genre}&rating=${rating}`);
        
        await wait(300); // Ждем хлопок.
        clapperboard.classList.remove('show'); // Скрываем хлопушку.
        await wait(600);
        clapperboard.classList.remove('clap'); // Сбрасываем хлопок.
        ticketWrapper.classList.remove('eaten'); // Возвращаем билет.
        
        // --- КОНЕЦ АНИМАЦИИ ---
        
        // Обрабатываем ответ от сервера.
        try {
            const response = await responsePromise;
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            currentData = data; // Сохраняем данные глобально.
            currentSort = 'none'; // Сбрасываем сортировку по умолчанию.
            renderResults(currentData); // Рендерим.
            resultsContainer.classList.add('show'); // Показываем результаты.
        } catch (error) {
            console.error('Ошибка при запросе к API:', error);
            resultsContainer.innerHTML = '<h3>❌ Ой, что-то пошло не так с сервером.</h3>';
            resultsContainer.classList.add('show');
        }
    });
});
