(function () {
  const DB_KEY = "palan_marketplace_db_v6";
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
    const profiles = [
      {
        id: "profile-demo-host",
        artistId: "artist-demo-host",
        ownerName: "Анна Вельвет",
        role: "host",
        categories: ["host", "planner"],
        planId: "featured",
        featured: true,
        verified: true,
        hidden: false,
        status: "approved",
        name: "Анна Вельвет",
        title: "Ведущая свадеб и корпоративов",
        city: "Чебоксары",
        region: "Чувашия, Россия и выезд по миру",
        travelRadiusKm: 120,
        tagline: "Интеллигентный event-хостинг из Чебоксар для свадеб, корпоративов и частных событий в России и мире.",
        description: "Провожу свадьбы, корпоративы, городские вечера и камерные private events. Базовый фокус по Чебоксарам и Чувашии, работаю по всей России и на выездных международных событиях.",
        workStyle: "Спокойная подача, плотная драматургия вечера, ненавязчивый юмор, адаптация под возраст и формат гостей.",
        eventFormats: ["Свадьбы", "Корпоративы", "Частные вечеринки", "Премии и деловые ужины"],
        serviceFeatures: ["Сценарный созвон", "Тайминг и чек-лист", "Подбор интерактивов без кринжа"],
        languages: ["Русский", "Английский"],
        priceFrom: 45000,
        packages: [
          { name: "Камерный вечер", duration: "4 часа", price: 45000, description: "Ведение + тайминг + коммуникация с подрядчиками." },
          { name: "Свадебный день", duration: "6 часов", price: 70000, description: "Ведение, welcome-блок, координация подрядчиков." }
        ],
        addOns: [
          { name: "Дополнительный час", price: 8000, description: "Продление программы после основной смены." },
          { name: "Выезд в другой город", price: 5000, description: "Транспорт и логистика по России и за рубежом." }
        ],
        availability: [
          { date: "2026-04-12", status: "busy" },
          { date: "2026-04-19", status: "busy" },
          { date: "2026-04-26", status: "available" }
        ],
        faq: DEFAULT_FAQ,
        policies: {
          deposit: "30% для фиксации даты.",
          cancellation: "Бесплатная отмена более чем за 21 день, далее удерживается депозит.",
          technical: "Нужен комплект звука от площадки или DJ."
        },
        media: {
          photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80"
          ],
          video: ["https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"],
          audio: []
        },
        socials: {
          instagram: "https://instagram.com",
          website: "https://example.com/host"
        },
        contact: {
          phone: "+7 999 111-22-33",
          email: "anna@palan.market",
          telegram: "@anna_host"
        },
        stats: {
          profileViews: 248,
          leadCount: 18,
          quoteCount: 11,
          bookingCount: 7,
          responseRate: 96,
          avgTicket: 72000
        }
      },
      {
        id: "profile-demo-dj",
        artistId: "artist-demo-dj",
        ownerName: "NEON DRIVE",
        role: "dj",
        categories: ["dj", "musician"],
        planId: "pro",
        featured: false,
        verified: true,
        hidden: false,
        status: "approved",
        name: "NEON DRIVE",
        title: "DJ и музыкальный продюсер",
        city: "Санкт-Петербург",
        region: "Санкт-Петербург и область",
        travelRadiusKm: 180,
        tagline: "House, disco и pop edits для свадеб, премиум-корпоративов и rooftop-вечеринок.",
        description: "Собираю сет под аудиторию, тайминг и возраст гостей. Веду музыкальную драматургию, работаю с live-перкуссией и welcome-сетами.",
        workStyle: "Современный саунд без случайных треков, чистая смена темпа, подготовка плейлиста под event goals.",
        eventFormats: ["Свадьбы", "Ресторанные события", "Rooftop party", "Корпоративы"],
        serviceFeatures: ["Персональный плейлист", "Саундчек", "Работа со светом"],
        languages: ["Русский"],
        priceFrom: 30000,
        packages: [
          { name: "DJ set", duration: "3 часа", price: 30000, description: "Подготовка сета и 1 саундчек." },
          { name: "DJ + afterparty", duration: "5 часов", price: 47000, description: "Основной сет плюс ночной блок." }
        ],
        addOns: [
          { name: "Live percussion", price: 12000, description: "Сет с живой перкуссией." }
        ],
        availability: [
          { date: "2026-04-11", status: "available" },
          { date: "2026-04-18", status: "busy" }
        ],
        faq: DEFAULT_FAQ,
        policies: {
          deposit: "20% для подтверждения даты.",
          cancellation: "Перенос даты по возможности без штрафа.",
          technical: "Пульт Pioneer или эквивалент, монитор и стабильное питание."
        },
        media: {
          photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80"
          ],
          video: ["https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"],
          audio: []
        },
        socials: {
          instagram: "https://instagram.com",
          youtube: "https://youtube.com"
        },
        contact: {
          phone: "+7 999 444-55-66",
          email: "neondrive@palan.market",
          telegram: "@neondrive"
        },
        stats: {
          profileViews: 167,
          leadCount: 12,
          quoteCount: 8,
          bookingCount: 5,
          responseRate: 92,
          avgTicket: 51000
        }
      },
      {
        id: "profile-demo-photo",
        artistId: "artist-demo-photo",
        ownerName: "Мария Frame",
        role: "photographer",
        categories: ["photographer", "videographer"],
        planId: "basic",
        featured: false,
        verified: true,
        hidden: false,
        status: "approved",
        name: "Мария Frame",
        title: "Фотограф и видеограф мероприятий",
        city: "Казань",
        region: "Казань и Татарстан",
        travelRadiusKm: 150,
        tagline: "Эмоциональный репортаж, быстрая отдача превью и спокойная коммуникация с парой.",
        description: "Снимаю свадьбы, семейные события и бренд-мероприятия. Отдаю превью в течение 48 часов, полный материал в оговоренный срок.",
        workStyle: "Репортаж + постановка без перегруза, работа со светом площадки, комфорт для гостей.",
        eventFormats: ["Свадьбы", "Частные вечеринки", "Family day", "Бренд-съемки"],
        serviceFeatures: ["Превью за 48 часов", "Портретная съемка гостей", "Облачная галерея"],
        languages: ["Русский", "Татарский"],
        priceFrom: 25000,
        packages: [
          { name: "Репортаж", duration: "4 часа", price: 25000, description: "Фоторепортаж события и онлайн-галерея." },
          { name: "Фото + видео", duration: "6 часов", price: 52000, description: "Оператор и монтаж highlight ролика." }
        ],
        addOns: [
          { name: "Love story", price: 15000, description: "Отдельный съемочный день до события." }
        ],
        availability: [
          { date: "2026-04-05", status: "busy" },
          { date: "2026-04-20", status: "available" }
        ],
        faq: DEFAULT_FAQ,
        policies: {
          deposit: "20% для брони даты.",
          cancellation: "Перенос даты при наличии свободного окна.",
          technical: "Важно заранее согласовать свет и тайминг ключевых блоков."
        },
        media: {
          photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80"
          ],
          video: [],
          audio: []
        },
        socials: {
          website: "https://example.com/photo"
        },
        contact: {
          phone: "+7 999 777-88-99",
          email: "maria@palan.market",
          telegram: "@mariaframe"
        },
        stats: {
          profileViews: 123,
          leadCount: 9,
          quoteCount: 6,
          bookingCount: 4,
          responseRate: 89,
          avgTicket: 43000
        }
      }
    ];

    return {
      meta: {
        project: "Паланарт",
        updatedAt: now,
        schemaVersion: 6
      },
      settings: {
        commissionsEnabled: false,
        moderationMode: "manual",
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
      users: [
        {
          id: "user-demo-client",
          name: "Елена Романова",
          email: "client@palan.market",
          phone: "+7 999 222-33-44",
          password: "client12345",
          city: "Чебоксары",
          createdAt: now,
          savedProfiles: ["profile-demo-host", "profile-demo-dj"],
          compareProfiles: ["profile-demo-host", "profile-demo-dj"]
        }
      ],
      artists: [
        {
          id: "artist-demo-host",
          name: "Анна Вельвет",
          email: "anna@palan.market",
          phone: "+7 999 111-22-33",
          telegram: "@anna_host",
          socials: { instagram: "https://instagram.com", website: "https://example.com/host" },
          photo: profiles[0].media.photo,
          password: "artist12345",
          profileId: "profile-demo-host",
          createdAt: now
        },
        {
          id: "artist-demo-dj",
          name: "NEON DRIVE",
          email: "neondrive@palan.market",
          phone: "+7 999 444-55-66",
          telegram: "@neondrive",
          socials: { instagram: "https://instagram.com", youtube: "https://youtube.com" },
          photo: profiles[1].media.photo,
          password: "artist12345",
          profileId: "profile-demo-dj",
          createdAt: now
        }
      ],
      profiles: profiles,
      leads: [
        {
          id: "lead-demo-1",
          userId: "user-demo-client",
          profileId: "profile-demo-host",
          profileName: "Анна Вельвет",
          artistId: "artist-demo-host",
          customerName: "Елена Романова",
          customerPhone: "+7 999 222-33-44",
          customerEmail: "client@palan.market",
          city: "Чебоксары",
          venue: "Volga Hall",
          eventType: "Свадьба",
          guestCount: 60,
          eventDate: "2026-05-16",
          eventTime: "17:00",
          budget: 90000,
          language: "Русский",
          requirements: "Нужен интеллигентный ведущий без кринж-интерактивов.",
          status: "quoted",
          createdAt: now
        }
      ],
      quotes: [
        {
          id: "quote-demo-1",
          leadId: "lead-demo-1",
          profileId: "profile-demo-host",
          artistId: "artist-demo-host",
          packageName: "Свадебный день",
          amount: 70000,
          depositPercent: 30,
          includes: "Ведение 6 часов, сценарный созвон, welcome-блок, тайминг вечера.",
          comment: "Готова подключиться к координации и совместной работе с площадкой.",
          status: "sent",
          createdAt: now
        }
      ],
      deals: [
        {
          id: "deal-demo-1",
          leadId: "lead-demo-1",
          quoteId: "quote-demo-1",
          profileId: "profile-demo-host",
          profileName: "Анна Вельвет",
          artistId: "artist-demo-host",
          clientUserId: "user-demo-client",
          clientName: "Елена Романова",
          clientPhone: "+7 999 222-33-44",
          clientEmail: "client@palan.market",
          agreedAmount: 70000,
          status: "quoted",
          createdAt: now
        }
      ],
      chats: [
        {
          id: "chat-demo-1",
          dealId: "deal-demo-1",
          leadId: "lead-demo-1",
          profileId: "profile-demo-host",
          profileName: "Анна Вельвет",
          artistId: "artist-demo-host",
          clientUserId: "user-demo-client",
          clientName: "Елена Романова",
          status: "open",
          messages: [
            { id: "msg-demo-1", sender: "system", text: "Чат открыт по заявке. Здесь можно обсуждать детали до подтверждения брони.", createdAt: now },
            { id: "msg-demo-2", sender: "artist", text: "Здравствуйте! Отправила предложение и могу прислать черновой тайминг.", createdAt: now }
          ]
        }
      ],
      boardPosts: [
        {
          id: "board-demo-1",
          authorType: "client",
          postType: "request",
          authorId: "user-demo-client",
          title: "Ищу DJ на корпоратив в Чебоксарах",
          description: "Нужен энергичный сет на 4 часа, аудитория 25-35 лет. Рассмотрим и локальных DJ, и выезд из соседних городов.",
          category: "DJ",
          city: "Чебоксары",
          budget: "до 55 000 ₽",
          contactName: "Елена",
          contactInfo: "Через платформу",
          replies: [],
          createdAt: now
        }
      ],
      reviews: [
        {
          id: "review-demo-1",
          profileId: "profile-demo-host",
          authorName: "Ксения и Артем",
          rating: 5,
          criteria: { communication: 5, punctuality: 5, quality: 5, value: 5 },
          text: "Вечер прошел точно в нужном настроении: спокойно, интеллигентно и очень живо.",
          featured: true,
          createdAt: now
        },
        {
          id: "review-demo-2",
          profileId: "profile-demo-dj",
          authorName: "Event Team Sfera",
          rating: 5,
          criteria: { communication: 5, punctuality: 5, quality: 5, value: 4 },
          text: "Отличный feel по аудитории, чистый саунд и хороший темп вечера.",
          featured: false,
          createdAt: now
        }
      ],
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
    result.media.photo = (result.media.photo || result.photo || "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80").trim();
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
      verified: profile ? profile.verified : false,
      hidden: false,
      status: "pending",
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

  function ensureDealForLead(lead) {
    const db = getDb();
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
    const deal = ensureDealForLead(lead);
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
      const deal = db.deals.find(function (item) { return item.quoteId === quote.id || item.leadId === quote.leadId; });
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
    return getDb().deals.filter(function (deal) {
      return deal.clientUserId === user.id || deal.clientEmail === user.email || deal.clientPhone === user.phone;
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
