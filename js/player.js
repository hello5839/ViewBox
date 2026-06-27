const API_KEY = "8ed56e921cd53c634a951f24cde49652";
const BASE_URL = "https://api.themoviedb.org/3";

const STORAGE_KEY = "selectedServer";
const CONTINUE_KEY = "continueWatching";

let currentEpisodeState = {
    season: 1,
    episode: 1
};

console.log("PLAYER JS LOADED");

const servers = document.querySelectorAll(".panel-item");

let currentSeason = 1;
let episodeDataCache = {};

let currentMedia = null;

const SERVER_CONFIG = {
    filmu: {
        movie: (id) => `https://embed.filmu.in/movie/${id}`,
        tv: (id) => `https://embed.filmu.in/tv/${id}/1/1`
    },

    vidup: {
        movie: (id) =>
            `https://vidup.to/movie/${id}?autoPlay=true&theme=16A085&sub=en`,
        tv: (id) =>
            `https://vidup.to/tv/${id}/1/1?autoPlay=true&theme=16A085&nextButton=true&autoNext=true&sub=en`
    },

    vidcore: {
        movie: (id) =>
            `https://vidcore.net/movie/${id}?autoPlay=true&sub=en`,
        tv: (id) =>
            `https://vidcore.net/tv/${id}/1/1?autoPlay=true&sub=en`
    },

    videasy: {
        movie: (id) =>
            `https://player.videasy.to/movie/${id}?overlay=true&color=16A085`,
        tv: (id) =>
            `https://player.videasy.to/tv/${id}/1/1?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=16A085`
    },

    vidplus: {
        movie: (id) =>
            `https://player2.vidplus.pro/embed/movie/${id}`,
        tv: (id) =>
            `https://player2.vidplus.pro/embed/tv/${id}/1/1`
    },

    vidsrc0: {
        movie: (id) =>
            `https://vidsrc.mov/embed/movie/${id}`,
        tv: (id) =>
            `https://vidsrc.mov/embed/tv/${id}/1/1`
    },

    vidnest: {
        movie: (id) =>
            `https://vidnest.fun/movie/${id}`,
        tv: (id) =>
            `https://vidnest.fun/tv/${id}/1/1`
    },

    vidify: {
        movie: (id) =>
            `https://pro.vidify.top/embed/movie/${id}`,
        tv: (id) =>
            `https://pro.vidify.top/embed/tv/${id}/1/1`
    },

    vidzee: {
        movie: (id) =>
            `https://player.vidzee.wtf/embed/movie/${id}`,
        tv: (id) =>
            `https://player.vidzee.wtf/embed/tv/${id}/1/1`
    }
};

function getSavedEpisode() {
    if (!currentMedia) return null;

    const data =
        JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    return data.find(
        item =>
            item.id === currentMedia.id &&
            item.type === currentMedia.type
    );
}

function saveContinueWatching(season = 1, episode = 1) {
    if (!currentMedia) return;

    const data = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

    const filtered = data.filter(
        item => !(item.id === currentMedia.id && item.type === currentMedia.type)
    );

    filtered.unshift({
        id: currentMedia.id,
        type: currentMedia.type,
        season,
        episode,
        title: document.getElementById("player-title")?.textContent || ""
    });

    console.log("SAVE CW:", {
        id: currentMedia.id,
        type: currentMedia.type,
        season,
        episode
    });

    localStorage.setItem(CONTINUE_KEY, JSON.stringify(filtered.slice(0, 20)));
}

/* GET MOVIE/TV DATA FROM TMDB */
async function fetchMediaData(id, type) {
    const endpoint = type === "tv" ? `tv/${id}` : `movie/${id}`;

    const res = await fetch(`${BASE_URL}/${endpoint}?api_key=${API_KEY}`);
    if (!res.ok) throw new Error("Failed to fetch media data");

    return await res.json();
}

/* LOAD PLAYER */
async function loadPlayer() {
    try {
        const mediaData = sessionStorage.getItem("mediaData");
        if (!mediaData) throw new Error("No media data found");

        const { id, type, title, overview, year } = JSON.parse(mediaData);

        currentMedia = {
            id,
            type: type.toLowerCase()
        };

        const media = await fetchMediaData(id, type.toLowerCase());

        populateMovieInfo(media, type.toLowerCase());

        if (type.toLowerCase() === "tv") {

            document.getElementById("episode-panel").style.display = "block";

            const savedEpisode = getSavedEpisode();

            if (savedEpisode) {
                currentEpisodeState = {
                    season: savedEpisode.season || 1,
                    episode: savedEpisode.episode || 1
                };

                currentSeason = currentEpisodeState.season;
            }

            initSeasons(
                media.number_of_seasons,
                currentMedia.id
            );
        }

        document.getElementById("player-loading").style.display = "none";
        document.getElementById("player-wrapper").style.display = "block";
        document.getElementById("player-info").style.display = "block";

        const iframe = document.createElement("iframe");
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; encrypted-media";

        document.getElementById("player-wrapper").innerHTML = "";
        document.getElementById("player-wrapper").appendChild(iframe);

        // restore server
        const saved = localStorage.getItem(STORAGE_KEY);
        let target = [...servers].find(s =>
            s.textContent.trim().toLowerCase() === saved
        );

        if (!target) {
            target = [...servers].find(s =>
                s.textContent.trim().toLowerCase() === "filmu"
            );
        }

        if (target) setActiveServer(target);

        if (type.toLowerCase() === "tv") {
            saveContinueWatching(
                currentEpisodeState.season,
                currentEpisodeState.episode
            );
        }

        document.getElementById("player-title").textContent = title;
        document.getElementById("player-year").textContent = year;
        document.getElementById("player-type").textContent = type;
        document.getElementById("player-overview").textContent = overview;

        sessionStorage.removeItem("mediaData");

    } catch (err) {
        console.error(err);
    }

    fetchMoreLikeThis();
}

function populateMovieInfo(media, type) {

    const poster = document.getElementById("info-poster");
    const title = document.getElementById("info-title");
    const meta = document.getElementById("info-meta");
    const genres = document.getElementById("info-genres");
    const description = document.getElementById("info-description");

    poster.src =
        "https://image.tmdb.org/t/p/w500" +
        media.poster_path;

    title.textContent =
        media.title ||
        media.name;

    const rating =
        media.vote_average
            ? media.vote_average.toFixed(1)
            : "N/A";

    const year =
        (media.release_date || media.first_air_date || "")
            .split("-")[0] || "Unknown";

    let metaHTML = `
        <span>⭐ ${rating}</span>
        <span>${year}</span>
    `;

    if (type === "tv") {
        metaHTML += `<span>${media.number_of_seasons} Seasons</span>`;
        metaHTML += `
            <span>
                ${media.status === "Returning Series"
                    ? "Returning Series"
                    : "Ended"}
            </span>
        `;
    }

    meta.innerHTML = metaHTML;

    genres.innerHTML = media.genres
        .slice(0, 5)
        .map(g => `<span>${g.name}</span>`)
        .join("");

    description.textContent = media.overview || "";
}

document.addEventListener("DOMContentLoaded", () => {

    const downloadBtn = document.getElementById("download-btn");

    downloadBtn.addEventListener("click", () => {
        if (!currentMedia) return;

        const url = currentMedia.type === "movie"
            ? `https://vidvault.ru/movie/${currentMedia.id}`
            : `https://vidvault.ru/tv/${currentMedia.id}/1/1`;

        window.open(url, "_blank");
    });

    const refreshBtn = document.getElementById("refresh-btn");

    refreshBtn.addEventListener("click", () => {
        const activeServer =
            document.querySelector(".panel-item.active");

        if (!activeServer) return;

        // simulate clicking the current server again
        setActiveServer(activeServer);
    });

    function normalize(text) {
        return text.trim().toLowerCase();
    }

    function loadServer(serverName) {
        const server = SERVER_CONFIG[serverName];
        if (!server || !currentMedia) return;

        let url;

        if (currentMedia.type === "tv") {
            url = server.tv(currentMedia.id);

            // keep current episode when switching servers
            url = url.replace(
                /\/\d+\/\d+(\?|$)/,
                `/${currentEpisodeState.season}/${currentEpisodeState.episode}$1`
            );
        } else {
            url = server.movie(currentMedia.id);
        }

        const iframe = document.querySelector(".player-wrapper iframe");
        if (iframe) iframe.src = url;
    }

    function setActiveServer(serverEl) {
        servers.forEach(s => s.classList.remove("active"));
        serverEl.classList.add("active");

        const name = normalize(serverEl.textContent);

        localStorage.setItem(STORAGE_KEY, name);

        loadServer(name);
    }

    servers.forEach(server => {
        server.addEventListener("click", () => {
            setActiveServer(server);
        });
    });

    loadPlayer();
});

function openPlayer(id, type, title = "", overview = "") {
    sessionStorage.setItem("mediaData", JSON.stringify({
        id,
        type,
        title,
        overview
    }));

    window.location.href = "player.html";
}

async function fetchSeason(tvId, seasonNumber) {
    if (episodeDataCache[seasonNumber]) {
        return episodeDataCache[seasonNumber];
    }

    const res = await fetch(
        `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`
    );

    const data = await res.json();
    episodeDataCache[seasonNumber] = data;
    return data;
}

/* INIT SEASONS */
function initSeasons(totalSeasons, tvId) {
    const seasonList = document.getElementById("season-list");
    seasonList.innerHTML = "";

    for (let i = 1; i <= totalSeasons; i++) {
        const btn = document.createElement("div");
        btn.className = "season-btn";
        btn.textContent = `S${i}`;

        btn.addEventListener("click", async () => {
            document
                .querySelectorAll(".season-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");

            currentSeason = i;
            loadEpisodes(tvId, i);
        });

        seasonList.appendChild(btn);
    }

    const targetSeasonBtn = [...seasonList.children].find(
        btn =>
            parseInt(
                btn.textContent.replace("S", "")
            ) === currentEpisodeState.season
    );

    if (targetSeasonBtn) {
        targetSeasonBtn.click();
    }
}

/* LOAD EPISODES */
async function loadEpisodes(tvId, season) {
    const data = await fetchSeason(tvId, season);

    const list = document.getElementById("episode-list");
    list.innerHTML = "";

    data.episodes.forEach(ep => {
        const card = document.createElement("div");
        card.className = "episode-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w300${ep.still_path}" />
            <div class="episode-info">
                <div class="episode-number">Episode ${ep.episode_number}</div>
                <div class="episode-name">${ep.name}</div>
                <div class="episode-desc">${ep.overview || "No description available."}</div>
                <div class="episode-date">${ep.air_date || ""}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            changeEpisode(season, ep.episode_number);
        });

        list.appendChild(card);
    });

    highlightCurrentEpisode();

    if (
        season === currentEpisodeState.season
    ) {
        const iframe =
            document.querySelector(".player-wrapper iframe");

        const saved =
            localStorage.getItem(STORAGE_KEY) || "filmu";

        const server = SERVER_CONFIG[saved];

        if (iframe && server) {

            const url = server.tv(currentMedia.id)
                .replace(
                    /\/\d+\/\d+$/,
                    `/${currentEpisodeState.season}/${currentEpisodeState.episode}`
                );

            iframe.src = url;
        }
    }
}

/* CHANGE EPISODE */
function changeEpisode(season, episode) {
    const wrapper = document.querySelector(".player-wrapper");
    if (!wrapper || !currentMedia) return;

    const saved = localStorage.getItem("selectedServer") || "filmu";
    const server = SERVER_CONFIG[saved];
    if (!server) return;

    const url = server.tv(currentMedia.id)
        .replace(/\/\d+\/\d+$/, `/${season}/${episode}`);

    currentEpisodeState = { season, episode };

    // ❗ FULL iframe reset (this is the key)
    const iframe = document.createElement("iframe");
    iframe.allowFullscreen = true;
    iframe.allow = "autoplay; encrypted-media";
    iframe.src = "about:blank"; // force reset first

    wrapper.innerHTML = "";
    wrapper.appendChild(iframe);

    // small delay ensures full teardown before reload
    setTimeout(() => {
        iframe.src = url;
    }, 50);

    highlightCurrentEpisode();
    saveContinueWatching(season, episode);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function highlightCurrentEpisode() {
    document.querySelectorAll(".episode-card").forEach(card => {
        card.classList.remove("active");

        const epNumber = parseInt(
            card.querySelector(".episode-number")
                .textContent
                .replace("Episode ", "")
        );

        if (
            currentEpisodeState.episode === epNumber &&
            parseInt(document.querySelector(".season-btn.active")?.textContent.replace("S", "")) === currentEpisodeState.season
        ) {
            card.classList.add("active");
        }
    });
}

async function fetchMoreLikeThis() {
    if (!currentMedia) return;

    const endpoint =
        currentMedia.type === "tv"
            ? `tv/${currentMedia.id}/recommendations`
            : `movie/${currentMedia.id}/recommendations`;

    const res = await fetch(
        `${BASE_URL}/${endpoint}?api_key=${API_KEY}`
    );

    const data = await res.json();

    console.log("MORE LIKE THIS:", data); // DEBUG

    renderMoreLikeThis(data.results || []);
}

function renderMoreLikeThis(items) {
    const grid = document.getElementById("more-like-this-grid");
    if (!grid) return;

    grid.innerHTML = "";

    items.slice(0, 12).forEach(item => {
        const card = document.createElement("div");
        card.className = "movie-card"; // ✅ SAME AS HOME PAGE

        const poster = item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Image";

            const year = (item.release_date || item.first_air_date || "").split("-")[0];

            const typeLabel = item.title ? "Movie" : "TV";

            card.innerHTML = `
                <div class="movie-poster">
                    <img src="${poster}" />
                </div>

                <div class="movie-title">
                    ${item.title || item.name}
                </div>

                <div class="movie-meta">
                    ⭐ ${item.vote_average?.toFixed(1) || "N/A"} • ${year || "Unknown"} • ${typeLabel}
                </div>
            `;

        card.addEventListener("click", () => {
            openPlayer(
                item.id,
                item.title ? "movie" : "tv",
                item.title || item.name,
                item.overview || ""
            );
        });

        grid.appendChild(card);
    });
}

const profileMenu = document.querySelector(".profile-menu");
const profileBtn = document.querySelector(".profile-btn");

if (profileMenu && profileBtn) {
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle("open");
    });

    document.addEventListener("click", () => {
        profileMenu.classList.remove("open");
    });
}