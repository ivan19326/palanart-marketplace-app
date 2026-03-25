(function () {
  const DB_KEY = "palan_marketplace_db_v7";
  const LEGACY_DB_KEYS = ["palan_marketplace_db_v2"];
  const SESSION_KEY = "palan_marketplace_session_v3";

  const CATEGORY_OPTIONS = [
    { id: "host", label: "Ведущие", group: "Сцена и шоу" },
    { id: "dj", label: "DJ", group: "Сцена и шоу" },
    { id: "musician", label: "Музыканты", group: "Сцена и шоу" },
    { id: "band", label: "Группы", group: "Сцена и шоу" },
    { id: "animator", label: "Аниматоры", group: "Детские и family" },
    { id: "photographer", label: "Фотографы", group: "Продакшн" },
    { id: "videographer", label: "Видеографы", group: "Продакшн" },
    { id: "decorator", label: "Декораторы", group: "Декор и продюсирование" },
    { id: "planner", label: "Организаторы", group: "Декор и продюсирование" },
    { id: "catering", label: "Кейтеринг", group: "Сервис" }
  ];

  const PLAN_OPTIONS = [
    { id: "basic", label: "Basic", categoriesLimit: 2, featured: false, featuredReviews: 0 },
    { id: "pro", label: "Pro", categoriesLimit: 6, featured: false, featuredReviews: 2 },
    { id: "featured", label: "Featured", categoriesLimit: 12, featured: true, featuredReviews: 4 }
  ];

  const DEFAULT_FAQ = [
    { q: "Какой депозит нужен?", a: "Обычно 20-30% после согласования деталей." },
    { q: "Работаете ли вы за городом?", a: "Да, с учетом радиуса выезда и транспортных расходов." }
  ];

  function createSeed() {
    const now = new Date().toISOString();
    const profiles = [];

    return {
      meta: {
        project: "Паланарт",
        updatedAt: now,
        schemaVersion: 6
      },
      settings: {
        commissionsEnabled: false,
        moderationMode: "auto",
        defaultDepositPercent: 30,
        leadResponseHours: 2
      },
      dictionaries: {
        categories: CATEGORY_OPTIONS,
        plans: PLAN_OPTIONS
      },
      admins: [
        {
          id: "admin-main",
          email: "admin@palan.market",
          password: "admin12345",
          name: "Главный администратор"
        }
      ],
      users: [],
      artists: [],
      profiles: profiles,
      leads: [],
      quotes: [],
      deals: [],
      chats: [],
      boardPosts: [],
      reviews: [],
      tickets: []
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function newId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function categoryLabel(id) {
    const item = CATEGORY_OPTIONS.find(function (entry) {
      return entry.id === id;
    });
    return item ? item.label : id;
  }

  function roleLabel(role) {
    return categoryLabel(role || "host");
  }

  function getPlan(planId) {
    return PLAN_OPTIONS.find(function (item) {
      return item.id === planId;
    }) || PLAN_OPTIONS[0];
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      return value.split(",").map(function (item) {
        return item.trim();
      }).filter(Boolean);
    }
    return [];
  }

  function numeric(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function average(values) {
    const list = values.filter(function (item) {
      return Number.isFinite(item);
    });
    if (!list.length) return 0;
    return list.reduce(function (sum, item) { return sum + item; }, 0) / list.length;
  }

  function normalizeReview(review) {
    review.criteria = review.criteria || { communication: review.rating || 5, punctuality: review.rating || 5, quality: review.rating || 5, value: review.rating || 5 };
    review.rating = Number(review.rating || average(Object.keys(review.criteria).map(function (key) { return Number(review.criteria[key] || 0); })) || 5);
    review.featured = Boolean(review.featured);
    return review;
  }

  function normalizeMediaEntry(entry, kind, index) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return {
        id: kind + "-" + index,
        src: entry.trim(),
        caption: "",
        poster: ""
      };
    }
    return {
      id: (entry.id || (kind + "-" + index)).trim(),
      src: (entry.src || "").trim(),
      caption: (entry.caption || "").trim(),
      poster: (entry.poster || "").trim()
    };
  }

  function normalizeProfile(profile) {
    const result = Object.assign({}, profile || {});
    result.role = result.role || (Array.isArray(result.categories) && result.categories[0]) || "host";
    result.categories = normalizeArray(result.categories);
    if (!result.categories.length) result.categories = [result.role];
    result.planId = result.planId || "basic";
    result.featured = Boolean(result.featured || getPlan(result.planId).featured);
    result.verified = Boolean(result.verified);
    result.hidden = Boolean(result.hidden);
    result.status = result.status || "pending";
    result.name = (result.name || "").trim();
    result.title = (result.title || result.subtitle || "").trim();
    result.city = (result.city || "").trim();
    result.region = (result.region || result.city || "").trim();
    result.travelRadiusKm = numeric(result.travelRadiusKm, 50);
    result.tagline = (result.tagline || result.subtitle || "").trim();
    result.description = (result.description || "").trim();
    result.workStyle = (result.workStyle || "").trim();
    result.eventFormats = normalizeArray(result.eventFormats);
    result.serviceFeatures = normalizeArray(result.serviceFeatures);
    result.languages = normalizeArray(result.languages);
    result.priceFrom = numeric(result.priceFrom, 0);
    result.packages = Array.isArray(result.packages) ? result.packages : [];
    result.addOns = Array.isArray(result.addOns) ? result.addOns : [];
    result.availability = Array.isArray(result.availability) ? result.availability : [];
    result.faq = Array.isArray(result.faq) && result.faq.length ? result.faq : clone(DEFAULT_FAQ);
    result.policies = result.policies || {
      deposit: "Депозит по договоренности.",
      cancellation: "Условия отмены согласуются до бронирования.",
      technical: "Технический райдер по запросу."
    };
    result.media = result.media || {};
    result.media.photo = (result.media.photo || result.photo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%23ff8a5b'/><stop offset='1' stop-color='%235dd1c2'/></linearGradient></defs><rect width='600' height='600' rx='120' fill='%230d1626'/><circle cx='300' cy='220' r='96' fill='url(%23g)' opacity='0.95'/><path d='M150 470c32-88 112-138 150-138s118 50 150 138' fill='url(%23g)' opacity='0.95'/></svg>").trim();
    result.media.gallery = (Array.isArray(result.media.gallery) ? result.media.gallery : []).map(function (entry, index) { return normalizeMediaEntry(entry, "gallery", index); }).filter(Boolean).filter(function (entry) { return entry.src; });
    result.media.video = (Array.isArray(result.media.video) ? result.media.video : []).map(function (entry, index) { return normalizeMediaEntry(entry, "video", index); }).filter(Boolean).filter(function (entry) { return entry.src; });
    result.media.audio = (Array.isArray(result.media.audio) ? result.media.audio : []).map(function (entry, index) { return normalizeMediaEntry(entry, "audio", index); }).filter(Boolean).filter(function (entry) { return entry.src; });
    result.socials = result.socials || {};
    result.contact = result.contact || {};
    result.contact.phone = (result.contact.phone || result.phone || "").trim();
    result.contact.email = (result.contact.email || result.email || "").trim().toLowerCase();
    result.contact.telegram = (result.contact.telegram || result.telegram || "").trim();
    result.stats = Object.assign({
      profileViews: 0,
      leadCount: 0,
      quoteCount: 0,
      bookingCount: 0,
      responseRate: 0,
      avgTicket: 0
    }, result.stats || {});
    return result;
  }

  function normalizeUser(user) {
    const result = Object.assign({}, user || {});
    result.name = (result.name || "").trim();
    result.email = (result.email || "").trim().toLowerCase();
    result.phone = (result.phone || "").trim();
    result.city = (result.city || "").trim();
    result.savedProfiles = normalizeArray(result.savedProfiles);
    result.compareProfiles = normalizeArray(result.compareProfiles);
    return result;
  }

  function getLegacyDb() {
    for (let index = 0; index < LEGACY_DB_KEYS.length; index += 1) {
      const raw = localStorage.getItem(LEGACY_DB_KEYS[index]);
      if (!raw) continue;
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function migrateLegacyDb(legacy) {
    const migrated = createSeed();
    if (!legacy) return migrated;
    migrated.users = Array.isArray(legacy.users) ? legacy.users.map(normalizeUser) : migrated.users;
    migrated.artists = Array.isArray(legacy.artists) ? legacy.artists.map(function (artist) {
      return Object.assign({
        socials: {},
        telegram: "",
        profileId: null
      }, artist);
    }) : migrated.artists;
    migrated.profiles = Array.isArray(legacy.profiles) && legacy.profiles.length ? legacy.profiles.map(function (profile) {
      return normalizeProfile({
        id: profile.id,
        artistId: profile.artistId || null,
        ownerName: profile.name,
        role: profile.role,
        categories: profile.categories || [profile.role],
        planId: profile.featured ? "featured" : "basic",
        featured: profile.featured,
        verified: profile.verified,
        hidden: profile.hidden,
        status: profile.status,
        name: profile.name,
        title: profile.title || profile.subtitle,
        city: profile.city,
        region: profile.region || profile.city,
        travelRadiusKm: profile.travelRadiusKm || 50,
        tagline: profile.tagline || profile.subtitle,
        description: profile.description,
        workStyle: profile.workStyle || "",
        eventFormats: profile.eventFormats || [],
        serviceFeatures: profile.skills || [],
        languages: profile.languages || [],
        priceFrom: profile.priceFrom,
        packages: profile.packages || [],
        addOns: profile.addOns || [],
        availability: profile.availability || [],
        faq: profile.faq || [],
        policies: profile.policies || null,
        media: {
          photo: profile.media && profile.media.photo ? profile.media.photo : "",
          gallery: profile.media && profile.media.gallery ? profile.media.gallery : [],
          video: profile.media && profile.media.video ? profile.media.video : [],
          audio: profile.media && profile.media.audio ? profile.media.audio : []
        },
        socials: profile.socials || {},
        contact: profile.contact || {},
        stats: profile.stats || {}
      });
    }) : migrated.profiles;
    migrated.boardPosts = Array.isArray(legacy.boardPosts) ? legacy.boardPosts : migrated.boardPosts;
    migrated.reviews = Array.isArray(legacy.reviews) ? legacy.reviews.map(normalizeReview) : migrated.reviews;
    migrated.chats = Array.isArray(legacy.chats) ? legacy.chats : migrated.chats;
    migrated.deals = Array.isArray(legacy.deals) ? legacy.deals.map(function (deal) {
      return Object.assign({
        leadId: deal.leadId || null,
        quoteId: deal.quoteId || null,
        artistId: deal.artistId || null,
        agreedAmount: numeric(deal.agreedAmount || deal.orderAmount, 0)
      }, deal);
    }) : migrated.deals;
    migrated.leads = Array.isArray(legacy.orders) ? legacy.orders.map(function (order) {
      return {
        id: order.id || newId("lead"),
        userId: order.userId || null,
        profileId: order.profileId || null,
        profileName: order.profileName || "",
        artistId: null,
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        customerEmail: order.customerEmail || "",
        city: order.city || "",
        venue: order.venue || "",
        eventType: order.eventType || "",
        guestCount: numeric(order.guestCount, 0),
        eventDate: order.eventDate || "",
        eventTime: order.eventTime || "",
        budget: numeric(order.budget, 0),
        language: order.language || "",
        requirements: order.comment || order.requirements || "",
        status: order.status || "new",
        createdAt: order.createdAt || new Date().toISOString()
      };
    }) : migrated.leads;
    migrated.quotes = Array.isArray(legacy.quotes) ? legacy.quotes : [];
    migrated.settings = Object.assign({}, migrated.settings, legacy.settings || {});
    return migrated;
  }

  function ensureDb() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsed.meta = parsed.meta || {};
        parsed.meta.schemaVersion = 6;
        parsed.dictionaries = parsed.dictionaries || { categories: CATEGORY_OPTIONS, plans: PLAN_OPTIONS };
        parsed.settings = Object.assign({}, createSeed().settings, parsed.settings || {});
        parsed.users = Array.isArray(parsed.users) ? parsed.users.map(normalizeUser) : [];
        parsed.artists = Array.isArray(parsed.artists) ? parsed.artists : [];
        parsed.profiles = Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeProfile) : [];
        parsed.leads = Array.isArray(parsed.leads) ? parsed.leads : [];
        parsed.quotes = Array.isArray(parsed.quotes) ? parsed.quotes : [];
        parsed.deals = Array.isArray(parsed.deals) ? parsed.deals : [];
        parsed.chats = Array.isArray(parsed.chats) ? parsed.chats : [];
        parsed.boardPosts = Array.isArray(parsed.boardPosts) ? parsed.boardPosts : [];
        parsed.reviews = Array.isArray(parsed.reviews) ? parsed.reviews.map(normalizeReview) : [];
        parsed.tickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
        localStorage.setItem(DB_KEY, JSON.stringify(parsed));
        return parsed;
      } catch (error) {}
    }
    const migrated = migrateLegacyDb(getLegacyDb());
    localStorage.setItem(DB_KEY, JSON.stringify(migrated));
    return clone(migrated);
  }

  function saveDb(data) {
    data.meta = data.meta || {};
    data.meta.updatedAt = new Date().toISOString();
    data.meta.schemaVersion = 6;
    data.dictionaries = data.dictionaries || { categories: CATEGORY_OPTIONS, plans: PLAN_OPTIONS };
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    return data;
  }

  function getDb() {
    return ensureDb();
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session || session.type !== "user") return null;
    return getDb().users.find(function (user) { return user.id === session.id; }) || null;
  }

  function getCurrentArtist() {
    const session = getSession();
    if (!session || session.type !== "artist") return null;
    return getDb().artists.find(function (artist) { return artist.id === session.id; }) || null;
  }

  function getCurrentAdmin() {
    const session = getSession();
    if (!session || session.type !== "admin") return null;
    return getDb().admins.find(function (admin) { return admin.id === session.id; }) || null;
  }

  function registerUser(payload) {
    const db = getDb();
    const email = (payload.email || "").trim().toLowerCase();
    if (!email || !payload.password || !(payload.name || "").trim()) {
      return { ok: false, message: "Заполните имя, e-mail и пароль." };
    }
    if (db.users.some(function (user) { return user.email === email; })) {
      return { ok: false, message: "Клиент с таким e-mail уже зарегистрирован." };
    }
    const user = normalizeUser({
      id: newId("user"),
      name: payload.name,
      email: email,
      phone: payload.phone || "",
      password: payload.password,
      city: payload.city || "",
      createdAt: new Date().toISOString(),
      savedProfiles: [],
      compareProfiles: []
    });
    db.users.unshift(user);
    saveDb(db);
    setSession({ type: "user", id: user.id });
    return { ok: true, user: user };
  }

  function loginUser(email, password) {
    const user = getDb().users.find(function (item) {
      return item.email === (email || "").trim().toLowerCase() && item.password === password;
    });
    if (!user) return { ok: false, message: "Неверный e-mail или пароль." };
    setSession({ type: "user", id: user.id });
    return { ok: true, user: user };
  }

  function registerArtistAccount(payload) {
    const db = getDb();
    const email = (payload.email || "").trim().toLowerCase();
    if (!email || !payload.password || !(payload.name || "").trim()) {
      return { ok: false, message: "Заполните имя, e-mail и пароль." };
    }
    if (db.artists.some(function (artist) { return artist.email === email; })) {
      return { ok: false, message: "Исполнитель с таким e-mail уже зарегистрирован." };
    }
    const artist = {
      id: newId("artist"),
      name: (payload.name || "").trim(),
      email: email,
      phone: (payload.phone || "").trim(),
      telegram: (payload.telegram || "").trim(),
      socials: {
        instagram: (payload.instagram || "").trim(),
        youtube: (payload.youtube || "").trim(),
        vk: (payload.vk || "").trim(),
        website: (payload.website || "").trim()
      },
      photo: (payload.photo || "").trim(),
      password: payload.password,
      profileId: null,
      createdAt: new Date().toISOString()
    };
    db.artists.unshift(artist);
    saveDb(db);
    setSession({ type: "artist", id: artist.id });
    return { ok: true, artist: artist };
  }

  function loginArtist(email, password) {
    const artist = getDb().artists.find(function (item) {
      return item.email === (email || "").trim().toLowerCase() && item.password === password;
    });
    if (!artist) return { ok: false, message: "Неверный e-mail или пароль исполнителя." };
    setSession({ type: "artist", id: artist.id });
    return { ok: true, artist: artist };
  }

  function loginAdmin(email, password) {
    const admin = getDb().admins.find(function (item) {
      return item.email === (email || "").trim().toLowerCase() && item.password === password;
    });
    if (!admin) return { ok: false, message: "Неверный логин администратора." };
    setSession({ type: "admin", id: admin.id });
    return { ok: true, admin: admin };
  }

  function logout() {
    clearSession();
  }

  function getArtistProfile(artistId) {
    return getDb().profiles.find(function (profile) {
      return profile.artistId === artistId;
    }) || null;
  }

  function getProfileById(profileId) {
    return getDb().profiles.find(function (profile) {
      return profile.id === profileId;
    }) || null;
  }

  function createOrUpdateArtistProfile(artistId, payload) {
    const db = getDb();
    const artist = db.artists.find(function (item) { return item.id === artistId; });
    if (!artist) return { ok: false, message: "Аккаунт исполнителя не найден." };
    let profile = db.profiles.find(function (item) {
      return item.artistId === artistId || item.id === artist.profileId;
    });
    const categories = normalizeArray(payload.categories || payload.role || "host");
    const draft = normalizeProfile({
      id: profile ? profile.id : newId("profile"),
      artistId: artistId,
      ownerName: payload.name || artist.name,
      role: categories[0] || payload.role || "host",
      categories: categories,
      planId: payload.planId || (profile && profile.planId) || "basic",
      featured: getPlan(payload.planId || (profile && profile.planId) || "basic").featured,
      verified: (db.settings.moderationMode || "auto") === "auto" ? true : (profile ? profile.verified : false),
      hidden: false,
      status: (db.settings.moderationMode || "auto") === "auto" ? "approved" : "pending",
      name: payload.name,
      title: payload.title,
      city: payload.city,
      region: payload.region,
      travelRadiusKm: payload.travelRadiusKm,
      tagline: payload.tagline,
      description: payload.description,
      workStyle: payload.workStyle,
      eventFormats: normalizeArray(payload.eventFormats),
      serviceFeatures: normalizeArray(payload.serviceFeatures),
      languages: normalizeArray(payload.languages),
      priceFrom: payload.priceFrom,
      packages: Array.isArray(payload.packages) ? payload.packages : (profile && profile.packages) || [],
      addOns: Array.isArray(payload.addOns) ? payload.addOns : (profile && profile.addOns) || [],
      availability: Array.isArray(payload.availability) ? payload.availability : (profile && profile.availability) || [],
      faq: Array.isArray(payload.faq) && payload.faq.length ? payload.faq : (profile && profile.faq) || DEFAULT_FAQ,
      policies: payload.policies || (profile && profile.policies) || null,
      media: {
        photo: payload.photo || (profile && profile.media && profile.media.photo) || artist.photo || "",
        gallery: Array.isArray(payload.galleryFiles) && payload.galleryFiles.length ? payload.galleryFiles : ((profile && profile.media && profile.media.gallery) || []),
        video: Array.isArray(payload.videoFiles) ? payload.videoFiles : ((profile && profile.media && profile.media.video) || []),
        audio: Array.isArray(payload.audioFiles) ? payload.audioFiles : ((profile && profile.media && profile.media.audio) || [])
      },
      socials: {
        instagram: payload.instagram,
        youtube: payload.youtube,
        vk: payload.vk,
        website: payload.website
      },
      contact: {
        phone: payload.phone || artist.phone,
        email: payload.email || artist.email,
        telegram: payload.telegram || artist.telegram
      },
      stats: (profile && profile.stats) || null
    });

    if (profile) {
      Object.keys(profile).forEach(function (key) {
        delete profile[key];
      });
      Object.assign(profile, draft);
    } else {
      profile = draft;
      db.profiles.unshift(profile);
    }

    artist.name = draft.name;
    artist.phone = draft.contact.phone;
    artist.telegram = draft.contact.telegram;
    artist.socials = clone(draft.socials);
    artist.photo = draft.media.photo;
    artist.profileId = draft.id;
    saveDb(db);
    return { ok: true, profile: profile, artist: artist };
  }

  function updateProfile(id, updates) {
    const db = getDb();
    const profile = db.profiles.find(function (item) { return item.id === id; });
    if (!profile) return null;
    Object.assign(profile, updates || {});
    const normalized = normalizeProfile(profile);
    Object.keys(profile).forEach(function (key) { delete profile[key]; });
    Object.assign(profile, normalized);
    saveDb(db);
    return profile;
  }

  function deleteProfile(id) {
    const db = getDb();
    db.profiles = db.profiles.filter(function (profile) { return profile.id !== id; });
    db.leads = db.leads.filter(function (lead) { return lead.profileId !== id; });
    db.quotes = db.quotes.filter(function (quote) { return quote.profileId !== id; });
    db.deals = db.deals.filter(function (deal) { return deal.profileId !== id; });
    db.chats = db.chats.filter(function (chat) { return chat.profileId !== id; });
    saveDb(db);
  }

  function getProfiles(filters) {
    const options = filters || {};
    const db = getDb();
    return db.profiles.filter(function (profile) {
      if (!options.includeHidden && profile.hidden) return false;
      if (!options.includePending && profile.status !== "approved") return false;
      if (options.category && profile.categories.indexOf(options.category) === -1) return false;
      if (options.city && profile.city.toLowerCase().indexOf(String(options.city).trim().toLowerCase()) === -1) return false;
      if (options.maxPrice && Number(profile.priceFrom || 0) > Number(options.maxPrice || 0)) return false;
      if (options.hasVideo && !(profile.media.video && profile.media.video.length)) return false;
      if (options.language) {
        const languageNeedle = String(options.language).trim().toLowerCase();
        if (!profile.languages.some(function (item) { return item.toLowerCase().indexOf(languageNeedle) !== -1; })) return false;
      }
      if (options.search) {
        const haystack = [
          profile.name,
          profile.title,
          profile.tagline,
          profile.description,
          profile.workStyle
        ].concat(profile.categories.map(categoryLabel), profile.eventFormats, profile.serviceFeatures, profile.languages).join(" ").toLowerCase();
        if (haystack.indexOf(String(options.search).trim().toLowerCase()) === -1) return false;
      }
      return true;
    }).sort(function (left, right) {
      const leftRating = getProfileRating(left.id).average;
      const rightRating = getProfileRating(right.id).average;
      if (options.sortBy === "price_asc") return left.priceFrom - right.priceFrom;
      if (options.sortBy === "price_desc") return right.priceFrom - left.priceFrom;
      if (options.sortBy === "reviews") return getReviewsForProfile(right.id).length - getReviewsForProfile(left.id).length;
      if (options.sortBy === "popular") return (right.stats.profileViews || 0) - (left.stats.profileViews || 0);
      if (options.sortBy === "rating") return rightRating - leftRating;
      return scoreProfile(right, options) - scoreProfile(left, options);
    });
  }

  function scoreProfile(profile, options) {
    let score = 0;
    if (profile.featured) score += 30;
    if (profile.verified) score += 20;
    score += getProfileRating(profile.id).average * 10;
    score += Math.min(Number(profile.stats.responseRate || 0), 100) / 4;
    score += Math.min(Number(profile.stats.bookingCount || 0), 20);
    if (options && options.category && profile.categories.indexOf(options.category) !== -1) score += 10;
    if (options && options.city && profile.city.toLowerCase().indexOf(String(options.city).trim().toLowerCase()) !== -1) score += 6;
    return score;
  }

  function getProfileRating(profileId) {
    const reviews = getReviewsForProfile(profileId);
    if (!reviews.length) return { average: 5, count: 0 };
    const total = reviews.reduce(function (sum, review) { return sum + Number(review.rating || 0); }, 0);
    return { average: Number((total / reviews.length).toFixed(1)), count: reviews.length };
  }

  function getLeadById(leadId) {
    return getDb().leads.find(function (lead) { return lead.id === leadId; }) || null;
  }

  function createLead(payload) {
    const db = getDb();
    const user = payload.userId ? db.users.find(function (item) { return item.id === payload.userId; }) : null;
    const profile = payload.profileId ? db.profiles.find(function (item) { return item.id === payload.profileId; }) : null;
    const lead = {
      id: newId("lead"),
      userId: payload.userId || null,
      profileId: profile ? profile.id : null,
      profileName: profile ? profile.name : (payload.profileName || "Каталог"),
      artistId: profile ? profile.artistId : null,
      customerName: (payload.customerName || (user && user.name) || "").trim(),
      customerPhone: (payload.customerPhone || (user && user.phone) || "").trim(),
      customerEmail: (payload.customerEmail || (user && user.email) || "").trim(),
      city: (payload.city || "").trim(),
      venue: (payload.venue || "").trim(),
      eventType: (payload.eventType || "").trim(),
      guestCount: numeric(payload.guestCount, 0),
      eventDate: payload.eventDate || "",
      eventTime: payload.eventTime || "",
      budget: numeric(payload.budget, 0),
      language: (payload.language || "").trim(),
      requirements: (payload.requirements || payload.comment || "").trim(),
      status: "new",
      createdAt: new Date().toISOString()
    };
    db.leads.unshift(lead);
    if (profile) {
      profile.stats.leadCount = Number(profile.stats.leadCount || 0) + 1;
    }
    saveDb(db);
    return lead;
  }

  function updateLeadStatus(id, status) {
    const db = getDb();
    const lead = db.leads.find(function (item) { return item.id === id; });
    if (!lead) return null;
    lead.status = status;
    saveDb(db);
    return lead;
  }

  function getLeadsForUser(userId) {
    return getDb().leads.filter(function (lead) {
      return lead.userId === userId;
    });
  }

  function getLeadsForArtist(artistId) {
    const profile = getArtistProfile(artistId);
    if (!profile) return [];
    return getDb().leads.filter(function (lead) {
      return lead.profileId === profile.id;
    });
  }

  function ensureDealForLeadInDb(db, lead) {
    let deal = db.deals.find(function (item) { return item.leadId === lead.id; });
    if (deal) return deal;
    deal = {
      id: newId("deal"),
      leadId: lead.id,
      quoteId: null,
      profileId: lead.profileId,
      profileName: lead.profileName,
      artistId: lead.artistId,
      clientUserId: lead.userId || null,
      clientName: lead.customerName,
      clientPhone: lead.customerPhone,
      clientEmail: lead.customerEmail,
      agreedAmount: 0,
      status: lead.status === "booked" ? "booked" : "new",
      createdAt: new Date().toISOString()
    };
    db.deals.unshift(deal);
    db.chats.unshift({
      id: newId("chat"),
      dealId: deal.id,
      leadId: lead.id,
      profileId: lead.profileId,
      profileName: lead.profileName,
      artistId: lead.artistId,
      clientUserId: lead.userId || null,
      clientName: lead.customerName,
      status: "open",
      messages: [
        {
          id: newId("msg"),
          sender: "system",
          text: "Чат открыт по заявке. До подтверждения брони контакты защищены платформой.",
          createdAt: new Date().toISOString()
        }
      ]
    });
    return deal;
  }

  function ensureDealForLead(lead) {
    const db = getDb();
    const deal = ensureDealForLeadInDb(db, lead);
    saveDb(db);
    return deal;
  }

  function createOrOpenChat(payload) {
    const db = getDb();
    if (payload.leadId) {
      const lead = db.leads.find(function (item) { return item.id === payload.leadId; });
      if (lead) return ensureDealForLead(lead);
    }
    const lead = createLead(payload);
    return ensureDealForLead(lead);
  }

  function createQuote(payload) {
    const db = getDb();
    const lead = db.leads.find(function (item) { return item.id === payload.leadId; });
    if (!lead) return { ok: false, message: "Заявка не найдена." };
    const quote = {
      id: newId("quote"),
      leadId: lead.id,
      profileId: lead.profileId,
      artistId: lead.artistId,
      packageName: (payload.packageName || "").trim(),
      amount: numeric(payload.amount, 0),
      depositPercent: numeric(payload.depositPercent, db.settings.defaultDepositPercent),
      includes: (payload.includes || "").trim(),
      comment: (payload.comment || "").trim(),
      status: "sent",
      createdAt: new Date().toISOString()
    };
    db.quotes.unshift(quote);
    const deal = ensureDealForLeadInDb(db, lead);
    deal.quoteId = quote.id;
    deal.agreedAmount = quote.amount;
    deal.status = "quoted";
    lead.status = "quoted";
    const profile = db.profiles.find(function (item) { return item.id === lead.profileId; });
    if (profile) {
      profile.stats.quoteCount = Number(profile.stats.quoteCount || 0) + 1;
    }
    const chat = db.chats.find(function (item) { return item.dealId === deal.id; });
    if (chat) {
      chat.messages.push({
        id: newId("msg"),
        sender: "artist",
        text: "Отправлено предложение: " + (quote.packageName || "персональный пакет") + " на " + Number(quote.amount).toLocaleString("ru-RU") + " ₽.",
        createdAt: new Date().toISOString()
      });
    }
    saveDb(db);
    return { ok: true, quote: quote, deal: deal };
  }

  function getQuotesForLead(leadId) {
    return getDb().quotes.filter(function (quote) { return quote.leadId === leadId; });
  }

  function getQuotesForUser(userId) {
    const leads = getLeadsForUser(userId).map(function (lead) { return lead.id; });
    return getDb().quotes.filter(function (quote) { return leads.indexOf(quote.leadId) !== -1; });
  }

  function getQuotesForArtist(artistId) {
    return getDb().quotes.filter(function (quote) { return quote.artistId === artistId; });
  }

  function updateQuoteStatus(id, status) {
    const db = getDb();
    const quote = db.quotes.find(function (item) { return item.id === id; });
    if (!quote) return null;
    quote.status = status;
    if (status === "accepted") {
      const lead = db.leads.find(function (item) { return item.id === quote.leadId; });
      const deal = lead
        ? ensureDealForLeadInDb(db, lead)
        : db.deals.find(function (item) { return item.quoteId === quote.id || item.leadId === quote.leadId; });
      if (lead) lead.status = "booked";
      if (deal) {
        deal.quoteId = quote.id;
        deal.agreedAmount = quote.amount;
        deal.status = "booked";
      }
      const profile = db.profiles.find(function (item) { return item.id === quote.profileId; });
      if (profile) {
        profile.stats.bookingCount = Number(profile.stats.bookingCount || 0) + 1;
        const nextCount = Number(profile.stats.bookingCount || 1);
        profile.stats.avgTicket = Math.round(((Number(profile.stats.avgTicket || 0) * Math.max(nextCount - 1, 0)) + Number(quote.amount || 0)) / nextCount);
      }
    }
    saveDb(db);
    return quote;
  }

  function getDealsForUser(user) {
    if (!user) return [];
    const userRecord = typeof user === "string"
      ? getDb().users.find(function (item) { return item.id === user || item.email === user; })
      : user;
    if (!userRecord) return [];
    return getDb().deals.filter(function (deal) {
      return deal.clientUserId === userRecord.id || deal.clientEmail === userRecord.email || deal.clientPhone === userRecord.phone;
    });
  }

  function getDealsForArtist(artistId) {
    const profile = getArtistProfile(artistId);
    if (!profile) return [];
    return getDb().deals.filter(function (deal) { return deal.profileId === profile.id; });
  }

  function updateDealStatus(id, status) {
    const db = getDb();
    const deal = db.deals.find(function (item) { return item.id === id; });
    if (!deal) return null;
    deal.status = status;
    const lead = db.leads.find(function (item) { return item.id === deal.leadId; });
    if (lead && (status === "done" || status === "cancelled")) {
      lead.status = status;
    }
    saveDb(db);
    return deal;
  }

  function getChatByDealId(dealId) {
    return getDb().chats.find(function (chat) { return chat.dealId === dealId; }) || null;
  }

  function addChatMessage(dealId, sender, text) {
    const db = getDb();
    const chat = db.chats.find(function (item) { return item.dealId === dealId; });
    if (!chat) return null;
    const cleanText = String(text || "").trim();
    if (!cleanText) return chat;
    chat.messages.push({
      id: newId("msg"),
      sender: sender,
      text: cleanText,
      createdAt: new Date().toISOString()
    });
    saveDb(db);
    return chat;
  }

  function getChatsForArtist(artistId) {
    const profile = getArtistProfile(artistId);
    if (!profile) return [];
    return getDb().chats.filter(function (chat) { return chat.profileId === profile.id; });
  }

  function createBoardPost(payload) {
    const db = getDb();
    const post = {
      id: newId("board"),
      authorType: payload.authorType || "client",
      postType: payload.postType || "request",
      authorId: payload.authorId || null,
      title: (payload.title || "").trim(),
      description: (payload.description || "").trim(),
      category: (payload.category || "").trim(),
      city: (payload.city || "").trim(),
      budget: (payload.budget || "").trim(),
      contactName: (payload.contactName || "").trim(),
      contactInfo: (payload.contactInfo || "").trim(),
      replies: Array.isArray(payload.replies) ? payload.replies : [],
      createdAt: new Date().toISOString()
    };
    db.boardPosts.unshift(post);
    saveDb(db);
    return post;
  }

  function getBoardPosts(filter) {
    const settings = filter || {};
    return getDb().boardPosts.filter(function (post) {
      if (settings.postType && post.postType !== settings.postType) return false;
      return true;
    });
  }

  function getBoardPostsForOwner(authorType, authorId) {
    return getDb().boardPosts.filter(function (post) {
      return post.authorType === authorType && post.authorId === authorId;
    });
  }

  function replyToBoardPost(postId, payload) {
    const db = getDb();
    const post = db.boardPosts.find(function (item) { return item.id === postId; });
    if (!post) return { ok: false, message: "Объявление не найдено." };
    const reply = {
      id: newId("reply"),
      authorType: payload.authorType || "artist",
      authorId: payload.authorId || null,
      authorName: (payload.authorName || "").trim(),
      contactInfo: (payload.contactInfo || "").trim(),
      message: (payload.message || "").trim(),
      createdAt: new Date().toISOString()
    };
    post.replies.unshift(reply);
    saveDb(db);
    return { ok: true, post: post, reply: reply };
  }

  function createReview(payload) {
    const db = getDb();
    const review = normalizeReview({
      id: newId("review"),
      profileId: payload.profileId,
      authorName: (payload.authorName || "").trim(),
      rating: payload.rating,
      criteria: payload.criteria || null,
      text: (payload.text || "").trim(),
      featured: Boolean(payload.featured),
      createdAt: new Date().toISOString()
    });
    db.reviews.unshift(review);
    saveDb(db);
    return review;
  }

  function getReviewsForProfile(profileId) {
    return getDb().reviews.filter(function (review) { return review.profileId === profileId; });
  }

  function toggleFeaturedReview(reviewId) {
    const db = getDb();
    const review = db.reviews.find(function (item) { return item.id === reviewId; });
    if (!review) return null;
    review.featured = !review.featured;
    saveDb(db);
    return review;
  }

  function toggleFavoriteProfile(userId, profileId) {
    const db = getDb();
    const user = db.users.find(function (item) { return item.id === userId; });
    if (!user) return [];
    user.savedProfiles = normalizeArray(user.savedProfiles);
    const index = user.savedProfiles.indexOf(profileId);
    if (index === -1) user.savedProfiles.push(profileId);
    else user.savedProfiles.splice(index, 1);
    saveDb(db);
    return user.savedProfiles.slice();
  }

  function toggleCompareProfile(userId, profileId) {
    const db = getDb();
    const user = db.users.find(function (item) { return item.id === userId; });
    if (!user) return [];
    user.compareProfiles = normalizeArray(user.compareProfiles);
    const index = user.compareProfiles.indexOf(profileId);
    if (index === -1) {
      if (user.compareProfiles.length >= 3) user.compareProfiles.shift();
      user.compareProfiles.push(profileId);
    } else {
      user.compareProfiles.splice(index, 1);
    }
    saveDb(db);
    return user.compareProfiles.slice();
  }

  function getFavoriteProfiles(userId) {
    const user = getDb().users.find(function (item) { return item.id === userId; });
    if (!user) return [];
    return user.savedProfiles.map(getProfileById).filter(Boolean);
  }

  function getCompareProfiles(userId) {
    const user = getDb().users.find(function (item) { return item.id === userId; });
    if (!user) return [];
    return user.compareProfiles.map(getProfileById).filter(Boolean);
  }

  function getStats() {
    const db = getDb();
    return {
      approvedProfiles: db.profiles.filter(function (profile) { return profile.status === "approved" && !profile.hidden; }).length,
      pendingProfiles: db.profiles.filter(function (profile) { return profile.status === "pending"; }).length,
      users: db.users.length,
      artists: db.artists.length,
      leads: db.leads.length,
      newLeads: db.leads.filter(function (lead) { return lead.status === "new"; }).length,
      quotes: db.quotes.length,
      bookedDeals: db.deals.filter(function (deal) { return deal.status === "booked" || deal.status === "done"; }).length,
      chats: db.chats.length,
      reviews: db.reviews.length,
      featuredProfiles: db.profiles.filter(function (profile) { return profile.featured && profile.status === "approved" && !profile.hidden; }).length
    };
  }

  function getSettings() {
    return getDb().settings;
  }

  function updateSettings(patch) {
    const db = getDb();
    db.settings = Object.assign({}, db.settings || {}, patch || {});
    saveDb(db);
    return db.settings;
  }

  function getDictionaries() {
    const db = getDb();
    return db.dictionaries || { categories: CATEGORY_OPTIONS, plans: PLAN_OPTIONS };
  }

  function getOrdersForArtist(artistId) {
    return getLeadsForArtist(artistId);
  }

  function updateOrderStatus(id, status) {
    return updateLeadStatus(id, status);
  }

  function respondToOrder(orderId, artistId, message) {
    const db = getDb();
    const lead = db.leads.find(function (item) { return item.id === orderId; });
    if (!lead) return { ok: false, message: "Заявка не найдена." };
    if (lead.artistId && lead.artistId !== artistId) return { ok: false, message: "Эта заявка не относится к вашему профилю." };
    const deal = ensureDealForLead(lead);
    lead.status = "replied";
    deal.status = "replied";
    addChatMessage(deal.id, "artist", message || "Здравствуйте! Посмотрел заявку и готов обсудить детали.");
    updateLeadStatus(orderId, "replied");
    updateDealStatus(deal.id, "replied");
    return { ok: true, order: lead, deal: deal };
  }

  function resetDb() {
    const fresh = createSeed();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    clearSession();
    return clone(fresh);
  }

  window.MarketplaceStore = {
    DB_KEY: DB_KEY,
    SESSION_KEY: SESSION_KEY,
    roleLabel: roleLabel,
    categoryLabel: categoryLabel,
    getPlan: getPlan,
    getDb: getDb,
    getSession: getSession,
    getCurrentUser: getCurrentUser,
    getCurrentArtist: getCurrentArtist,
    getCurrentAdmin: getCurrentAdmin,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getDictionaries: getDictionaries,
    registerUser: registerUser,
    loginUser: loginUser,
    registerArtistAccount: registerArtistAccount,
    loginArtist: loginArtist,
    loginAdmin: loginAdmin,
    logout: logout,
    getProfiles: getProfiles,
    getProfileById: getProfileById,
    getProfileRating: getProfileRating,
    getArtistProfile: getArtistProfile,
    createOrUpdateArtistProfile: createOrUpdateArtistProfile,
    updateProfile: updateProfile,
    deleteProfile: deleteProfile,
    createLead: createLead,
    getLeadById: getLeadById,
    getLeadsForUser: getLeadsForUser,
    getLeadsForArtist: getLeadsForArtist,
    updateLeadStatus: updateLeadStatus,
    createQuote: createQuote,
    getQuotesForLead: getQuotesForLead,
    getQuotesForUser: getQuotesForUser,
    getQuotesForArtist: getQuotesForArtist,
    updateQuoteStatus: updateQuoteStatus,
    ensureDealForLead: ensureDealForLead,
    createOrOpenChat: createOrOpenChat,
    getDealsForUser: getDealsForUser,
    getDealsForArtist: getDealsForArtist,
    updateDealStatus: updateDealStatus,
    getChatsForArtist: getChatsForArtist,
    getChatByDealId: getChatByDealId,
    addChatMessage: addChatMessage,
    getOrdersForArtist: getOrdersForArtist,
    updateOrderStatus: updateOrderStatus,
    respondToOrder: respondToOrder,
    createBoardPost: createBoardPost,
    getBoardPosts: getBoardPosts,
    getBoardPostsForOwner: getBoardPostsForOwner,
    replyToBoardPost: replyToBoardPost,
    createReview: createReview,
    getReviewsForProfile: getReviewsForProfile,
    toggleFeaturedReview: toggleFeaturedReview,
    toggleFavoriteProfile: toggleFavoriteProfile,
    toggleCompareProfile: toggleCompareProfile,
    getFavoriteProfiles: getFavoriteProfiles,
    getCompareProfiles: getCompareProfiles,
    getStats: getStats,
    resetDb: resetDb
  };
})();
