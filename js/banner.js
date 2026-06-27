const API_KEY = "8ed56e921cd53c634a951f24cde49652";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/original";

let movies = [];
let index = 0;
let interval;

/* Genre map */
const GENRES = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    878: "Sci-Fi",
    53: "Thriller",
    10749: "Romance"
};

/* GET MOVIE LOGO */
async function getMovieLogo(id) {
    try {
        const res = await fetch(
            `${BASE_URL}/movie/${id}/images?api_key=${API_KEY}`
        );
        const data = await res.json();

        return data.logos?.[0]?.file_path || null;
    } catch (err) {
        console.error("Logo fetch error:", err);
        return null;
    }
}

/* FETCH MOVIES */
async function fetchMovies() {
    try {
        const res = await fetch(
            `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`
        );

        const data = await res.json();

        movies = (data.results || []).slice(0, 5);

        if (!movies.length) {
            console.error("No movies found");
            return;
        }

        createDots();
        showMovie();
        startAuto();
    } catch (err) {
        console.error("TMDB error:", err);
    }
}

/* SHOW MOVIE */
async function showMovie() {
    const movie = movies[index];
    const banner = document.querySelector(".banner");

    /* TITLE LOGO */
    const logo = await getMovieLogo(movie.id);
    const logoEl = document.getElementById("banner-title-logo");
    const textEl = document.getElementById("banner-title-text");

    if (logo && logoEl) {
        logoEl.src = IMG + logo;
        logoEl.style.display = "block";
        if (textEl) textEl.style.display = "none";
    } else {
        if (logoEl) logoEl.style.display = "none";
        if (textEl) {
            textEl.style.display = "block";
            textEl.textContent = movie.title || movie.name;
        }
    }

    /* OVERVIEW */
    document.getElementById("banner-overview").textContent = movie.overview;

    /* RATING */
    const rating = movie.vote_average
        ? movie.vote_average.toFixed(1)
        : "N/A";

    document.getElementById("banner-rating").textContent = `⭐ ${rating}`;

    /* YEAR ONLY */
    const year = movie.release_date
        ? movie.release_date.split("-")[0]
        : "Unknown";

    document.getElementById("banner-date").textContent = `${year}`;

    /* GENRES */
    const genres = (movie.genre_ids || [])
        .map(id => GENRES[id])
        .filter(Boolean)
        .slice(0, 3)
        .join(" • ");

    document.getElementById("banner-genres").textContent = genres;

    updateDots();

    /* FADE TRANSITION */
    banner.style.opacity = 0;

    setTimeout(() => {
        banner.style.backgroundImage = `url(${IMG + movie.backdrop_path})`;
        banner.style.opacity = 1;
    }, 300);
}

/* NAVIGATION */
function nextMovie() {
    index = (index + 1) % movies.length;
    showMovie();
    resetAuto();
}

function prevMovie() {
    index = (index - 1 + movies.length) % movies.length;
    showMovie();
    resetAuto();
}

function goToMovie(i) {
    index = i;
    showMovie();
    resetAuto();
}

/* AUTO ROTATE */
function startAuto() {
    interval = setInterval(() => {
        nextMovie();
    }, 10000);
}

function resetAuto() {
    clearInterval(interval);
    startAuto();
}

/* DOTS */
function createDots() {
    const container = document.createElement("div");
    container.className = "dots";

    movies.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.addEventListener("click", () => goToMovie(i));
        container.appendChild(dot);
    });

    document.querySelector(".banner").appendChild(container);
}

function updateDots() {
    const dots = document.querySelectorAll(".dot");

    dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
    });
}

/* WATCH NOW - NAVIGATE TO PLAYER */
function watchNow() {
    const movie = movies[index];

    const title = movie.title || movie.name;
    const type = movie.title ? "movie" : "tv";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
    const year = movie.release_date
        ? movie.release_date.split("-")[0]
        : (movie.first_air_date
            ? movie.first_air_date.split("-")[0]
            : "Unknown");

    const mediaData = {
        id: movie.id,
        type,
        title,
        overview: movie.overview,
        rating,
        year,
        poster_path: movie.poster_path   // IMPORTANT
    };

    sessionStorage.setItem("mediaData", JSON.stringify(mediaData));

    // ✅ THIS is the missing piece (update Continue Watching)
    let stored = JSON.parse(localStorage.getItem("continueWatching")) || [];

    stored = stored.filter(item => item.id !== movie.id);

    stored.unshift(mediaData);

    stored = stored.slice(0, 10);

    localStorage.setItem("continueWatching", JSON.stringify(stored));

    window.location.href = "player.html";
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
    fetchMovies();

    // Add click listener to watch button
    const watchBtn = document.querySelector(".watch-btn");
    if (watchBtn) {
        watchBtn.addEventListener("click", watchNow);
    }
});