document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("blur-overlay");
    const searchIcon = document.querySelector(".search-icon");
    const searchInput = document.querySelector(".search-input");
    const resultsBox = document.getElementById("search-results");
    const container = document.querySelector(".search-container");

    if (!searchIcon || !overlay || !searchInput) {
        console.log("Search elements missing on this page");
        return;
    }

    const API_KEY = "8ed56e921cd53c634a951f24cde49652";
    const IMG = "https://image.tmdb.org/t/p/w200";

    let timeout;

    searchIcon.addEventListener("click", () => {
        overlay.classList.add("active");
        setTimeout(() => searchInput.focus(), 100);
    });

    function closeOverlay() {
        overlay.classList.remove("active");
        searchInput.value = "";
        resultsBox.innerHTML = "";
        container.classList.remove("active");
    }

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeOverlay();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeOverlay();
    });

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();

        clearTimeout(timeout);

        if (!query) {
            resultsBox.innerHTML = "";
            container.classList.remove("active");
            return;
        }

        timeout = setTimeout(() => searchTMDB(query), 250);
    });

    async function searchTMDB(query) {
        const res = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );

        const data = await res.json();
        renderResults(data.results || []);
    }

    function renderResults(results) {
        resultsBox.innerHTML = "";

        if (!results.length) {
            container.classList.remove("active");
            return;
        }

        // 🔥 SMART SORTING (fixes "t shows random junk")
        const query = searchInput.value.trim().toLowerCase();

        results = results
            .filter(r => {
                const name = (r.title || r.name || "").toLowerCase();

                // ❌ remove garbage like "th", "con th", etc.
                if (!r.poster_path) return false;
                if (name.length < 3) return false;

                return true;
            })
            .map(r => {
                const name = (r.title || r.name || "").toLowerCase();

                let score = 0;

                // 🔥 STRONG BOOST: starts with query
                if (name.startsWith(query)) score += 50;

                // 🔥 MEDIUM BOOST: word starts with query
                if (name.split(" ").some(w => w.startsWith(query))) score += 25;

                // 🔥 SPECIAL CASE: "the X" matching "th"
                if ("the".startsWith(query) && name.startsWith("the ")) score += 80;

                // 🔥 BONUS: popularity
                score += (r.vote_average || 0);

                return { ...r, _score: score };
            })
            .sort((a, b) => b._score - a._score)
            .slice(0, 12);

        container.classList.add("active");

        results.forEach(item => {
            const type = item.media_type === "tv" ? "tv" : "movie";

            const year = (item.release_date || item.first_air_date || "")
                .split("-")[0];

            const el = document.createElement("div");
            el.className = "search-item";

            el.innerHTML = `
                <img src="https://image.tmdb.org/t/p/w200${item.poster_path}" />

                <div class="search-info">
                    <div class="search-title">
                        ${item.title || item.name}
                    </div>

                    <div class="search-meta">
                        ${type.toUpperCase()} • ${year || "N/A"} • ⭐ ${item.vote_average?.toFixed(1) || "N/A"}
                    </div>
                </div>
            `;

            el.addEventListener("click", () => {

                const CONTINUE_KEY = "continueWatching";

                // build continue item (same format as playMedia)
                let stored = JSON.parse(localStorage.getItem(CONTINUE_KEY)) || [];

                stored = stored.filter(i => i.id !== item.id);

                stored.unshift({
                    id: item.id,
                    type,
                    title: item.title || item.name,
                    overview: item.overview || "",
                    rating: item.vote_average?.toFixed(1) || "N/A",
                    year: (item.release_date || item.first_air_date || "").split("-")[0] || "N/A",
                    poster_path: item.poster_path || null
                });

                stored = stored.slice(0, 15);

                localStorage.setItem(CONTINUE_KEY, JSON.stringify(stored));

                // still pass data to player
                sessionStorage.setItem("mediaData", JSON.stringify({
                    id: item.id,
                    type,
                    title: item.title || item.name,
                    overview: item.overview || "",
                    year: (item.release_date || item.first_air_date || "").split("-")[0] || ""
                }));

                window.location.href = "player.html";
            });

            resultsBox.appendChild(el);
        });
    }
});