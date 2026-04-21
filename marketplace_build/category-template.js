function renderCategoryPage(categoryId, title, description, targetId) {
  const box = document.getElementById(targetId);
  const profiles = MarketplaceStore.getProfiles({ category: categoryId });

  document.getElementById("page-title").textContent = title;
  document.getElementById("page-description").textContent = description;

  if (!profiles.length) {
    box.innerHTML = '<div class="empty">В этой категории пока нет опубликованных профилей. Исполнители могут заполнить анкету и отправить ее на модерацию.</div>';
    return;
  }

  box.innerHTML = profiles.map(function (profile) {
    const rating = MarketplaceStore.getProfileRating(profile.id);
    return '' +
      '<article class="card">' +
        '<div class="card-top">' +
          '<img class="avatar" src="' + profile.media.photo + '" alt="' + profile.name + '">' +
          '<div>' +
            '<div class="badge-row">' +
              '<span class="badge accent">' + MarketplaceStore.categoryLabel(profile.categories[0]) + '</span>' +
    (profile.featured ? '<span class="badge gold">Витрина</span>' : '') +
            '</div>' +
            '<h3>' + profile.name + '</h3>' +
            '<div class="muted">' + (profile.title || profile.tagline || "") + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="price">от ' + Number(profile.priceFrom || 0).toLocaleString("ru-RU") + ' ₽</div>' +
        '<div class="muted">' + profile.city + ' · рейтинг ' + rating.average.toFixed(1) + ' · отзывов ' + rating.count + '</div>' +
        '<div>' + (profile.tagline || profile.description || "") + '</div>' +
        '<div class="skills">' + profile.eventFormats.slice(0, 3).map(function (item) { return '<span class="skill">' + item + '</span>'; }).join("") + '</div>' +
        '<div class="card-actions">' +
          '<a class="primary-btn" href="zayavka.html?profile=' + encodeURIComponent(profile.id) + '">Оставить заявку</a>' +
          '<a class="ghost-btn" href="zayavka.html?profile=' + encodeURIComponent(profile.id) + '&mode=chat">Открыть чат</a>' +
          '<a class="ghost-btn" href="index.html#catalog">На витрину</a>' +
        '</div>' +
      '</article>';
  }).join("");
}
