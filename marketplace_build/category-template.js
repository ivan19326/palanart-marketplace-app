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
              (profile.featured ? '<span class="badge gold">Featured</span>' : '') +
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
          '<button class="ghost-btn" type="button" onclick="openCategoryChat(\'' + profile.id + '\')">Открыть чат</button>' +
          '<a class="ghost-btn" href="index.html#catalog">На витрину</a>' +
        '</div>' +
      '</article>';
  }).join("");
}

function openCategoryChat(profileId) {
  const profile = MarketplaceStore.getProfileById(profileId);
  if (!profile) return;
  const user = MarketplaceStore.getCurrentUser();
  const deal = MarketplaceStore.createOrOpenChat({
    userId: user ? user.id : null,
    profileId: profile.id,
    profileName: profile.name,
    customerName: user ? user.name : prompt("Ваше имя:", ""),
    customerPhone: user ? user.phone : prompt("Телефон:", ""),
    customerEmail: user ? user.email : prompt("E-mail:", ""),
    city: prompt("Город события:", profile.city || ""),
    eventType: prompt("Тип события:", "Частная вечеринка"),
    requirements: prompt("Что важно обсудить?", "Хочу уточнить пакет и свободную дату.")
  });
  alert("Чат открыт. Продолжить можно в кабинете клиента. ID сделки: " + deal.id);
}
