// ⚠️⚠️⚠️ ВСТАВЬ СЮДА ССЫЛКУ NGROK ИЗ COLAB ⚠️⚠️⚠️
// (Ссылка, которую ты получаешь при запуске Ячейки 6)
const API_BASE_URL = "https://YOUR_NGROK_LINK_GOES_HERE.ngrok-free.app";
// ⚠️⚠️⚠️ (Не забудь вставить!)


// Помощник для ожидания
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для отрисовки результатов
function renderResults(data) {
    const container = document.getElementById('results-container');
    container.innerHTML = ''; 

    if (!data.clusters || data.clusters.length === 0) {
        container.innerHTML = '<h3>🤷‍♂️ Похоже, по вашему запросу ничего не найдено.</h3>';
        return;
    }

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
document.addEventListener('DOMContentLoaded', () => {

    // --- Настройка ---
    const genreSelect = document.getElementById('genre-select');
    const ratingSlider = document.getElementById('rating-slider');
    const ratingValue = document.getElementById('rating-value');
    const clusterBtn = document.getElementById('cluster-btn');
    const ticketWrapper = document.getElementById('ticket-wrapper');
    const clapperboard = document.getElementById('clapperboard');
    const resultsContainer = document.getElementById('results-container');

    // Обновляем текст рейтинга
    ratingSlider.addEventListener('input', () => {
        ratingValue.textContent = parseFloat(ratingSlider.value).toFixed(1);
    });

    // 1. Загружаем жанры с бэкенда (ИЗМЕНЕНО)
    fetch(`${API_BASE_URL}/genres`) // 👈 Добавлена API_BASE_URL
        .then(res => {
            if (!res.ok) { throw new Error(`Network response was not ok: ${res.statusText}`); }
            return res.json();
        })
        .then(data => {
            genreSelect.innerHTML = '';
            (data.genres || []).forEach(genre => {
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


    // 2. Слушаем клик по главной кнопке
    clusterBtn.addEventListener('click', async () => {
        
        // 0. Получаем значения
        const genre = genreSelect.value;
        const rating = ratingSlider.value;

        // --- НАЧАЛО АНИМАЦИИ ---
        document.getElementById('clapper-genre').textContent = genre;
        document.getElementById('clapper-rating').textContent = rating;
        resultsContainer.classList.remove('show');
        clapperboard.classList.add('show');
        await wait(600); 

        clapperboard.classList.add('clap');
        ticketWrapper.classList.add('eaten');

        // В этот момент запрашиваем данные у Python (ИЗМЕНЕНО)
        const responsePromise = fetch(`${API_BASE_URL}/cluster?genre=${genre}&rating=${rating}`); // 👈 Добавлена API_BASE_URL

        await wait(300); // Ждем хлопок

        clapperboard.classList.remove('show');
        await wait(600); 

        clapperboard.classList.remove('clap');
        ticketWrapper.classList.remove('eaten'); 
        
        // --- КОНЕЦ АНИМАЦИИ ---

        // 8. Дожидаемся ответа и рисуем результаты
        try {
            const response = await responsePromise;
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            renderResults(data);
            resultsContainer.classList.add('show');
        } catch (error) {
            console.error('Ошибка при запросе к API:', error);
            resultsContainer.innerHTML = '<h3>❌ Ой, что-то пошло не так с сервером.</h3>';
            resultsContainer.classList.add('show');
        }
    });
});
