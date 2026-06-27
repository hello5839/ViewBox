const API_KEY = "8ed56e921cd53c634a951f24cde49652";
const IMG = "https://image.tmdb.org/t/p/w500";

const CONTINUE_KEY = "continueWatching";

let currentGenre = null;
let currentPage = 1;
let totalPages = null;

const GENRES = {
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    mystery: 9648,
    romance: 10749,
    "sci-fi": 878,
    thriller: 53,
    music: 10402,
};

async function getUserCountry() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        return data.country_name || "United States";
    } catch {
        return "United States";
    }
}

async function loadGenrePage(genreName, page = 1) {

    const genreId = GENRES[genreName];
    if (!genreId) return;

    currentGenre = genreName;
    currentPage = page;

    document.getElementById("genre-browser").classList.add("active");

    document.querySelectorAll(".content-section").forEach(section => {
        section.style.display = "none";
    });

    document.getElementById("genre-browser-title").textContent =
        genreName.charAt(0).toUpperCase() + genreName.slice(1);

    const [movies, tv] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`)
            .then(r => r.json()),

        fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&page=${page}`)
            .then(r => r.json())
    ]);

    totalPages = Math.max(
        movies.total_pages || 1,
        tv.total_pages || 1
    );

    let items = [
        ...(movies.results || []),
        ...(tv.results || [])
    ];

    items = items
        .filter(i => i.poster_path)
        .sort((a, b) => b.popularity - a.popularity);

    renderGenreGrid(items);

    updatePaginationButtons();
}

function updatePaginationButtons() {
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (!prevBtn || !nextBtn) return;

    // Previous page logic
    if (currentPage <= 1) {
        prevBtn.classList.add("disabled");
        prevBtn.disabled = true;
    } else {
        prevBtn.classList.remove("disabled");
        prevBtn.disabled = false;
    }

    // Next page logic
    if (totalPages && currentPage >= totalPages) {
        nextBtn.classList.add("disabled");
        nextBtn.disabled = true;
    } else {
        nextBtn.classList.remove("disabled");
        nextBtn.disabled = false;
    }
}

function renderGenreGrid(items) {

    const grid =
        document.getElementById("genre-grid");

    grid.innerHTML = "";

    items.forEach(item => {

        const card = document.createElement("div");

        card.className = "movie-card";

        const title =
            item.title || item.name;

        const year =
            item.release_date?.split("-")[0] ||
            item.first_air_date?.split("-")[0] ||
            "N/A";

        const rating =
            item.vote_average
            ? item.vote_average.toFixed(1)
            : "N/A";

        const type =
            item.title ? "movie" : "tv";

        card.innerHTML = `
            <div class="movie-poster">
                <img src="${IMG + item.poster_path}">
            </div>

            <div class="movie-title">
                ${title}
            </div>

            <div class="movie-meta">
                ⭐ ${rating} • ${year}
            </div>
        `;

        card.addEventListener("click", () =>
            playMedia(
                item.id,
                type,
                title,
                item.overview,
                rating,
                year,
                item.poster_path
            )
        );

        grid.appendChild(card);

    });

}

document
.querySelectorAll(".genre-nav-btn")
.forEach(btn => {

    btn.addEventListener("click", () => {

        document
        .querySelectorAll(".genre-nav-btn")
        .forEach(b =>
            b.classList.remove("active")
        );

        btn.classList.add("active");

        const genre =
            btn.dataset.genre;

        if (genre === "home") {

            document
            .getElementById("genre-browser")
            .classList.remove("active");

            document
            .querySelectorAll(".content-section")
            .forEach(section => {
                section.style.display = "";
            });

            if (typeof updateGlobalTopBtn === "function") {
                updateGlobalTopBtn();
            }

            return;
        }

        loadGenrePage(genre, 1);

    });

});

async function loadContinueWatching() {
    const data = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    const section = document.getElementById("continue-section");
    const row = document.getElementById("continue-row");

    if (!data.length) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    row.innerHTML = "";

    const items = await Promise.all(
        data.map(async (item) => {
            const url = `https://api.themoviedb.org/3/${item.type}/${item.id}?api_key=${API_KEY}`;
            const res = await fetch(url);
            return res.json();
        })
    );

    items.forEach((item, index) => {
        const original = data[index]; // from localStorage

        const typeLabel = original.type === "movie" ? "Movie" : "TV";

        const card = document.createElement("div");
        card.className = "movie-card";

        const title = item.title || item.name || "Unknown Title";
        const year =
            item.release_date?.split("-")[0] ||
            item.first_air_date?.split("-")[0] ||
            "N/A";

        const rating = item.vote_average?.toFixed(1) || "N/A";

        card.innerHTML = `
            <button class="continue-delete-btn">
                <img src="logos/trash.png" alt="Delete">
            </button>

            <div class="movie-poster">
                <img src="${IMG + item.poster_path}" />
            </div>

            <div class="movie-title">${title}</div>

            <div class="movie-meta">
                ⭐ ${rating} • ${year} • ${typeLabel}
            </div>
        `;

        const deleteBtn = card.querySelector(".continue-delete-btn");

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            let continueData =
                JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

            continueData = continueData.filter(
                entry =>
                    !(entry.id === original.id &&
                    entry.type === original.type)
            );

            localStorage.setItem(
                CONTINUE_KEY,
                JSON.stringify(continueData)
            );

            // Remove from UI immediately
            card.remove();

            // Hide section if empty
            if (!continueData.length) {
                document.getElementById("continue-section").style.display = "none";
            }

            // Refresh recommendation rows
            loadBecauseYouWatchedRows();
        });

        card.addEventListener("click", () =>
            playMedia(
                item.id,
                item.title ? "movie" : "tv",
                title,
                item.overview,
                rating,
                year,
                item.poster_path
            )
        );

        row.appendChild(card);
    });
}

async function loadRecommendedRow() {
    const data = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    const section = document.getElementById("recommended-section");
    const row = document.getElementById("recommended-row");

    if (!row) return;

    row.innerHTML = "";

    if (!data.length) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    try {
        // 🔥 aggregate ALL continue watching items properly
        const allResults = await Promise.all(
            data.map(async (item) => {
                const res = await fetch(
                    `https://api.themoviedb.org/3/${item.type}/${item.id}/recommendations?api_key=${API_KEY}`
                );
                const json = await res.json();

                return (json.results || []).map(r => ({
                    ...r,
                    _score: 1 // base weight
                }));
            })
        );

        let items = allResults.flat();

        // 🔥 boost items that appear multiple times (VERY IMPORTANT FIX)
        const scoreMap = new Map();

        for (const item of items) {
            if (!item || !item.id) continue;

            const key = item.id;

            if (!scoreMap.has(key)) {
                scoreMap.set(key, { ...item, score: 1 });
            } else {
                scoreMap.get(key).score += 1;
            }
        }

        items = Array.from(scoreMap.values())
            .filter(i => i.poster_path)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        renderRow("recommended-row", items);

    } catch (err) {
        console.error("Recommended row error:", err);
    }
}

async function loadPopularRow() {
    try {
        const [movies, tv] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}`).then(r => r.json())
        ]);

        const items = [
            ...(movies.results || []),
            ...(tv.results || [])
        ]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 15);

        renderRow("popular-row", items);

    } catch (err) {
        console.error(err);
    }
}

async function loadEditorsMoviesRow() {
    try {
        const [movies, tv] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${API_KEY}`).then(r => r.json())
        ]);

        const items = [
            ...(movies.results || []),
            ...(tv.results || [])
        ]
        .filter(i => i.poster_path)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 20);

        renderRow("editors-movies-row", items);

    } catch (err) {
        console.error(err);
    }
}

async function loadTrendingMoviesRow() {
    try {
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${API_KEY}`).then(r => r.json())
        ]);

        const items = [
            ...(moviesRes.results || []),
            ...(tvRes.results || [])
        ]
        .filter(i => i.poster_path)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20);

        renderRow("trending-movies-row", items);

    } catch (err) {
        console.error(err);
    }
}

async function loadBecauseYouWatchedRows() {
    const data = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    const section1 = document.getElementById("because-section-1");
    const section2 = document.getElementById("because-section-2");

    const title1 = document.getElementById("because-title-1");
    const title2 = document.getElementById("because-title-2");

    const row1 = document.getElementById("because-row-1");
    const row2 = document.getElementById("because-row-2");

    // reset UI immediately
    row1.innerHTML = "";
    row2.innerHTML = "";
    section1.style.display = "none";
    section2.style.display = "none";

    if (!data.length) return;

    const picked = [];
    const seen = new Set();

    for (let i = 0; i < data.length && picked.length < 2; i++) {
        if (!seen.has(data[i].id)) {
            picked.push(data[i]);
            seen.add(data[i].id);
        }
    }

    async function fetchHybridRecommendations(item) {
        try {
            const [similarRes, trendingRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/${item.type}/${item.id}/similar?api_key=${API_KEY}`)
                    .then(r => r.json()),
                fetch(`https://api.themoviedb.org/3/trending/${item.type}/week?api_key=${API_KEY}`)
                    .then(r => r.json())
            ]);

            let results = (similarRes.results || [])
                .sort((a, b) => b.popularity - a.popularity);

            if (!results.length) {
                results = (trendingRes.results || [])
                    .sort((a, b) => b.popularity - a.popularity);
            }

            return results.slice(0, 15);

        } catch {
            const fallback = await fetch(
                `https://api.themoviedb.org/3/${item.type}/popular?api_key=${API_KEY}`
            ).then(r => r.json());

            return (fallback.results || []).slice(0, 15);
        }
    }

    // ROW 1
    if (picked[0]) {
        section1.style.display = "block";

        const detailsRes = await fetch(
            `https://api.themoviedb.org/3/${picked[0].type}/${picked[0].id}?api_key=${API_KEY}`
        );
        const details = await detailsRes.json();

        const titleText = details.title || details.name || "Unknown Title";
        title1.textContent = `Because you watched ${titleText}`;

        const items1 = await fetchHybridRecommendations(picked[0]);
        renderRow("because-row-1", items1);
    }

    // ROW 2
    if (picked[1]) {
        section2.style.display = "block";

        const detailsRes = await fetch(
            `https://api.themoviedb.org/3/${picked[1].type}/${picked[1].id}?api_key=${API_KEY}`
        );
        const details = await detailsRes.json();

        const titleText = details.title || details.name || "Unknown Title";
        title2.textContent = `Because you also watched ${titleText}`;

        const items2 = await fetchHybridRecommendations(picked[1]);
        renderRow("because-row-2", items2);
    }
}

async function loadFamilyMoviesRow() {
    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=10751&sort_by=popularity.desc`
        );

        const data = await res.json();

        const items = (data.results || [])
            .filter(m => m.poster_path) // safety filter
            .slice(0, 15);

        renderRow("family-row", items);

    } catch (err) {
        console.error("Family row error:", err);
    }
}

async function loadGenreRow(genreId, rowId) {
    try {
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`).then(r => r.json())
        ]);

        let items = [
            ...(moviesRes.results || []),
            ...(tvRes.results || [])
        ];

        items = items
            .filter(i => i.poster_path)
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, 20);

        renderRow(rowId, items);

    } catch (err) {
        console.error("Genre row error:", err);
    }
}

function loadComedyRow() {
    loadGenreRow(35, "comedy-row");
}

function loadHorrorRow() {
    loadGenreRow(27, "horror-row");
}

function loadThrillerRow() {
    loadGenreRow(53, "thriller-row");
}

async function loadLatestReleasesRow() {
    try {
        const [movies, tv] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}`).then(r => r.json())
        ]);

        const items = [
            ...(movies.results || []),
            ...(tv.results || [])
        ]
        .filter(i => i.poster_path)
        .sort((a, b) =>
            new Date(b.release_date || b.first_air_date) -
            new Date(a.release_date || a.first_air_date)
        )
        .slice(0, 20);

        renderRow("latest-releases-row", items);

    } catch (err) {
        console.error(err);
    }
}

async function loadPopularInCountryRow() {
    const country = await getUserCountry();

    try {
        const [movies, tv] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&region=US`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}`).then(r => r.json())
        ]);

        const items = [
            ...(movies.results || []),
            ...(tv.results || [])
        ]
        .filter(i => i.poster_path)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20);

        document.getElementById("popular-country-title").textContent =
            `Popular In ${country}`;

        renderRow("popular-country-row", items);

    } catch (err) {
        console.error(err);
    }
}

/* GENERIC RENDER */
function renderRow(rowId, items) {
    const row = document.getElementById(rowId);
    row.innerHTML = "";

    items.forEach(item => {
        const title = item.title || item.name;

        const year =
            item.release_date?.split("-")[0] ||
            item.first_air_date?.split("-")[0] ||
            "N/A";

        const type = item.title ? "movie" : "tv";
        const typeLabel = item.title ? "Movie" : "TV";

        const rating = item.vote_average
            ? item.vote_average.toFixed(1)
            : "N/A";

        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <div class="movie-poster">
                <img src="${IMG + item.poster_path}" />
            </div>

            <div class="movie-title">${title}</div>
            <div class="movie-meta">⭐ ${rating} • ${year} • ${typeLabel}</div>
        `;

        card.addEventListener("click", () =>
            playMedia(
                item.id,
                type,
                title,
                item.overview,
                rating,
                year,
                item.poster_path
            )
        );

        row.appendChild(card);
    });
}

/* PLAY MEDIA */
function playMedia(id, type, title, overview, rating, year, posterPath) {
    sessionStorage.setItem(
        "mediaData",
        JSON.stringify({
            id,
            type,
            title,
            overview,
            rating,
            year,
            poster_path: posterPath
        })
    );

    let stored = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    stored = stored.filter(item => item.id !== id);

    stored.unshift({
        id,
        type,
        progress: 0 // optional later
    });

    stored = stored.slice(0, 15);

    localStorage.setItem(CONTINUE_KEY, JSON.stringify(stored));

    window.location.href = "player.html";

    loadContinueWatching();
    loadRecommendedRow();
    loadBecauseYouWatchedRows();
    loadDynamicGenreRows();
    loadTrendingMoviesRow();
    loadPopularRow();
}

function setPaginationVisible(isVisible) {
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (!prevBtn || !nextBtn) return;

    prevBtn.style.opacity = isVisible ? "1" : "0.3";
    nextBtn.style.opacity = isVisible ? "1" : "0.3";

    prevBtn.disabled = !isVisible;
    nextBtn.disabled = !isVisible;
}

const nextBtn = document.getElementById("next-page");
const prevBtn = document.getElementById("prev-page");

document.getElementById("next-page").addEventListener("click", () => {
    if (!currentGenre) return;
    if (currentPage >= totalPages) return;

    loadGenrePage(currentGenre, currentPage + 1);

    const browser = document.getElementById("genre-browser");

    window.scrollTo({
        top: browser.offsetTop - 80, // Adjust 80 to match your top bar height
        behavior: "smooth"
    });
});

document.getElementById("prev-page").addEventListener("click", () => {
    if (!currentGenre) return;
    if (currentPage <= 1) return;

    loadGenrePage(currentGenre, currentPage - 1);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

const globalTopBtn = document.getElementById("back-to-top-global");

function updateGlobalTopBtn() {
    if (!globalTopBtn) return;

    // ONLY depend on scroll now
    if (window.scrollY < 400) {
        globalTopBtn.classList.remove("show");
    } else {
        globalTopBtn.classList.add("show");
    }
}

if (globalTopBtn) {
    globalTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", updateGlobalTopBtn);

    // important: initial state
    updateGlobalTopBtn();
}

async function loadDynamicGenreRows() {
    const data = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    if (!data.length) return;

    // reset per session load
    usedGenresGlobal.clear();

    const genreKeys = Object.keys(GENRES);

    function pickRandomGenre() {
        const available = genreKeys.filter(g => !usedGenresGlobal.has(g));
        if (!available.length) return null;

        const pick = available[Math.floor(Math.random() * available.length)];
        usedGenresGlobal.add(pick);
        return pick;
    }

    async function loadGenreRowSmart(genreName, rowId, titleId) {
        if (!genreName) return;

        const genreId = GENRES[genreName];

        const [movies, tv] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`).then(r => r.json())
        ]);

        let items = [
            ...(movies.results || []),
            ...(tv.results || [])
        ]
        .filter(i => i.poster_path)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 15);

        const title = document.getElementById(titleId);
        if (title) {
            title.textContent =
                genreName.charAt(0).toUpperCase() + genreName.slice(1);
        }

        renderRow(rowId, items);
    }

    // generate 3 unique genres
    const g1 = pickRandomGenre();
    const g2 = pickRandomGenre();
    const g3 = pickRandomGenre();

    await loadGenreRowSmart(g1, "genre-row-1", "genre-title-1");
    await loadGenreRowSmart(g2, "genre-row-2", "genre-title-2");
    await loadGenreRowSmart(g3, "genre-row-3", "genre-title-3");
}

// track scroll
window.addEventListener("scroll", updateGlobalTopBtn);

const usedGenresGlobal = new Set();

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
    loadPopularRow();
    loadEditorsMoviesRow();
    loadTrendingMoviesRow();
    loadLatestReleasesRow();
    loadContinueWatching();
    loadBecauseYouWatchedRows();
    loadRecommendedRow();

    loadPopularInCountryRow(); // ✅ ADD THIS

    loadDynamicGenreRows();
});

const profileMenu = document.querySelector(".profile-menu");
const profileBtn = document.querySelector(".profile-btn");

profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
});

document.addEventListener("click", () => {
    profileMenu.classList.remove("open");
});

document.addEventListener("click", (e) => {
    if (e.target.id !== "clear-continue-btn") return;

    const confirmed = confirm("Clear your Continue Watching list?");
    if (!confirmed) return;

    localStorage.removeItem(CONTINUE_KEY);

    // clear UI immediately
    document.getElementById("continue-row").innerHTML = "";
    document.getElementById("continue-section").style.display = "none";

    document.getElementById("because-row-1").innerHTML = "";
    document.getElementById("because-row-2").innerHTML = "";

    document.getElementById("because-section-1").style.display = "none";
    document.getElementById("because-section-2").style.display = "none";

    // refresh state safely
    loadBecauseYouWatchedRows();
});