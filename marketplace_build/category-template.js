function escapeCategoryHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCategoryCityTools(currentCity, title, targetId) {
  const box = document.getElementById(targetId);
  if (!box || document.getElementById("category-city-tools")) return;

  const cities = MarketplaceStore.getCities ? MarketplaceStore.getCities() : [];
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const cityLinks = cities.map(function (city) {
    const active = currentCity && city.toLowerCase() === currentCity.toLowerCase();
    return '<a class="mini-chip' + (active ? ' is-active' : '') + '" href="' + currentPage + '?city=' + encodeURIComponent(city) + '">' + escapeCategoryHtml(city) + '</a>';
  }).join("");

  const tools = document.createElement("div");
  tools.id = "category-city-tools";
  tools.className = "category-city-tools";
  tools.innerHTML = '' +
    '<div class="category-city-head">' +
      '<div><strong>Город</strong><span>Выберите город, чтобы увидеть подходящих исполнителей.</span></div>' +
      '<a class="ghost-btn" href="' + currentPage + '">Все города</a>' +
    '</div>' +
    '<form class="category-city-search" id="category-city-search">' +
      '<input name="city" type="text" list="category-city-options" placeholder="Например, Чебоксары" value="' + escapeCategoryHtml(currentCity || "") + '" aria-label="Город для категории ' + escapeCategoryHtml(title) + '">' +
      '<button class="primary-btn" type="submit">Показать</button>' +
    '</form>' +
    '<datalist id="category-city-options">' + cities.map(function (city) { return '<option value="' + escapeCategoryHtml(city) + '"></option>'; }).join("") + '</datalist>' +
    '<div class="category-city-list">' + cityLinks + '</div>';

  box.parentNode.insertBefore(tools, box);
  document.getElementById("category-city-search").addEventListener("submit", function (event) {
    event.preventDefault();
    const city = String(new FormData(event.currentTarget).get("city") || "").trim();
    location.href = city ? currentPage + "?city=" + encodeURIComponent(city) : currentPage;
  });
}

function renderCategoryPage(categoryId, title, description, targetId) {
  const box = document.getElementById(targetId);
  const params = new URLSearchParams(location.search);
  const city = (params.get("city") || "").trim();
  let profiles = MarketplaceStore.getProfiles({ category: categoryId });
  if (city) {
    profiles = profiles.filter(function (profile) {
      return String(profile.city || "").toLowerCase() === city.toLowerCase();
    });
  }

  renderCategoryCityTools(city, title, targetId);

  document.getElementById("page-title").textContent = city ? (title + " — " + city) : title;
  document.getElementById("page-description").textContent = city
    ? ("Исполнители категории «" + title.toLowerCase() + "» в городе " + city + ".")
    : description;

  if (!profiles.length) {
    box.innerHTML = '<div class="empty">В этой категории пока нет опубликованных профилей для выбранного города. Попробуйте другой город или оставьте общую заявку.</div>';
    return;
  }

  box.innerHTML = profiles.map(function (profile) {
    const rating = MarketplaceStore.getProfileRating(profile.id);
    const photo = profile.media && profile.media.photo ? profile.media.photo : "";
    const formats = Array.isArray(profile.eventFormats) ? profile.eventFormats : [];
    const categories = Array.isArray(profile.categories) ? profile.categories : [profile.role || categoryId];
    return '' +
      '<article class="card">' +
        '<div class="card-top">' +
          '<img class="avatar" src="' + escapeCategoryHtml(photo) + '" alt="' + escapeCategoryHtml(profile.name) + '">' +
          '<div>' +
            '<div class="badge-row">' +
              '<span class="badge accent">' + escapeCategoryHtml(MarketplaceStore.categoryLabel(categories[0])) + '</span>' +
              (profile.featured ? '<span class="badge gold">Витрина</span>' : '') +
            '</div>' +
            '<h3>' + escapeCategoryHtml(profile.name) + '</h3>' +
            '<div class="muted">' + escapeCategoryHtml(profile.title || profile.tagline || "") + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="price">от ' + Number(profile.priceFrom || 0).toLocaleString("ru-RU") + ' ₽</div>' +
        '<div class="muted">' + escapeCategoryHtml(profile.city) + ' · рейтинг ' + rating.average.toFixed(1) + ' · отзывов ' + rating.count + '</div>' +
        '<div>' + escapeCategoryHtml(profile.tagline || profile.description || "") + '</div>' +
        '<div class="skills">' + formats.slice(0, 3).map(function (item) { return '<span class="skill">' + escapeCategoryHtml(item) + '</span>'; }).join("") + '</div>' +
        '<div class="card-actions">' +
          '<a class="primary-btn" href="zayavka.html?profile=' + encodeURIComponent(profile.id) + '">Оставить заявку</a>' +
          '<a class="ghost-btn" href="zayavka.html?profile=' + encodeURIComponent(profile.id) + '&mode=chat">Открыть чат</a>' +
          '<a class="ghost-btn" href="index.html#catalog">На витрину</a>' +
        '</div>' +
      '</article>';
  }).join("");
}
