'use server';

import { ApifyClient } from 'apify-client';

export interface ZoneConfig {
  id: string;
  location: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isCustomRadius?: boolean;
}

export interface CompanyLead {
  id: string;
  title: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  telegram?: string;
  rating?: number;
  reviewsCount?: number;
  googleUrl?: string;
  lat?: number;
  lng?: number;
}

export async function fastEstimateCompaniesAction(params: ParseGoogleMapsParams) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return { success: false, error: 'APIFY_API_TOKEN не настроен в .env.local' };
  }

  const { category, customQuery, limit = 20, zones } = params;

  const searchQuery = (customQuery && customQuery.trim()) 
    ? customQuery.trim() 
    : (category && category.trim()) ? category.trim() : '';

  if (!searchQuery || !zones || zones.length === 0) {
    return { success: false, error: 'Укажите запрос и зоны для оценки' };
  }

  try {
    const client = new ApifyClient({ token });

    // Параллельная БЫСТРАЯ оценка каждой зоны без захода на сайты
    const estimatePromises = zones.map(async (z) => {
      const latDelta = (z.radiusKm * 1000) / 111000;
      const lngDelta = (z.radiusKm * 1000) / (111000 * Math.cos((z.centerLat * Math.PI) / 180));

      const zoneConfig: any = {
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: limit, // Применяем выбранный пользователем лимит!
        language: 'ru',
        scrapeContactDetails: false, // НЕ сканируем сайты (быстро!)
        onlyDataFromSearchPage: true, // Только данные поисковой выдачи
        skipClosedPlaces: true,
        customGeolocation: {
          type: 'Polygon',
          coordinates: [
            [
              [z.centerLng - lngDelta, z.centerLat - latDelta],
              [z.centerLng + lngDelta, z.centerLat - latDelta],
              [z.centerLng + lngDelta, z.centerLat + latDelta],
              [z.centerLng - lngDelta, z.centerLat + latDelta],
              [z.centerLng - lngDelta, z.centerLat - latDelta],
            ],
          ],
        },
      };

      if (z.location && !z.location.startsWith('Точка')) {
        zoneConfig.locationQuery = z.location;
      }

      const run = await client.actor('compass/crawler-google-places').call(zoneConfig);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      const previewCompanies: CompanyLead[] = (items || []).map((item: any, idx: number) => {
        const locationObj = item.location || item.geo || {};
        const lat = item.latitude ?? locationObj.lat ?? item.lat;
        const lng = item.longitude ?? locationObj.lng ?? item.lng;
        return {
          id: item.placeId || item.id || `est-${z.id}-${idx}`,
          title: item.title || item.name || 'Компания',
          category: item.categoryName || '',
          address: item.address || '',
          phone: item.phone || '',
          rating: item.totalScore || item.rating,
          googleUrl: item.url || '',
          lat: typeof lat === 'number' ? lat : (lat ? parseFloat(lat) : undefined),
          lng: typeof lng === 'number' ? lng : (lng ? parseFloat(lng) : undefined),
        };
      });

      return {
        zoneId: z.id,
        count: previewCompanies.length,
        companies: previewCompanies,
      };
    });

    const estimates = await Promise.all(estimatePromises);
    const allPreviewCompanies = estimates.flatMap((e) => e.companies);

    return {
      success: true,
      estimates,
      totalFound: allPreviewCompanies.length,
      companies: allPreviewCompanies,
    };
  } catch (error: any) {
    console.error('Fast estimate error:', error);
    return { success: false, error: error?.message || 'Ошибка быстрой оценки' };
  }
}

export async function geocodeAddressAction(address: string) {
  if (!address || address.trim().length < 2 || address.startsWith('Точка')) {
    return { success: false };
  }

  try {
    // Используем проверенный надежный геокодер Komoot Photon (на базе OSM)
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address.trim())}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates; // [lng, lat]
        const lng = coords[0];
        const lat = coords[1];
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { success: true, lat, lng };
        }
      }
    }
    
    // Резервный вызов через OpenStreetMap
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address.trim())}&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'InsurvoiceMapApp/1.0 (admin@insurvoice.com)',
      },
    });
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        const lat = parseFloat(osmData[0].lat);
        const lng = parseFloat(osmData[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { success: true, lat, lng };
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.error('Geocoding server action error:', error);
    return { success: false };
  }
}

export interface ParseGoogleMapsParams {
  category?: string;
  customQuery?: string;
  limit?: number;
  zones: ZoneConfig[];
}

export async function parseGoogleMapsCompaniesAction(params: ParseGoogleMapsParams) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return { success: false, error: 'APIFY_API_TOKEN не настроен в .env.local' };
  }

  const { category, customQuery, limit = 20, zones } = params;

  // Формируем чистую поисковую строку (только ключевые слова)
  const searchQuery = (customQuery && customQuery.trim()) 
    ? customQuery.trim() 
    : (category && category.trim()) ? category.trim() : '';

  if (!searchQuery) {
    return { success: false, error: 'Укажите тематику бизнеса или поисковый запрос' };
  }

  if (!zones || zones.length === 0) {
    return { success: false, error: 'Добавьте хотя бы одну зону для поиска на карте' };
  }

  try {
    const client = new ApifyClient({ token });

    // Выполняем параллельный сбор для КАЖДОЙ зоны со строгим соблюдением лимита компаний на зону
    const zonePromises = zones.map(async (z) => {
      const latDelta = (z.radiusKm * 1000) / 111000;
      const lngDelta = (z.radiusKm * 1000) / (111000 * Math.cos((z.centerLat * Math.PI) / 180));

      const minLat = z.centerLat - latDelta;
      const maxLat = z.centerLat + latDelta;
      const minLng = z.centerLng - lngDelta;
      const maxLng = z.centerLng + lngDelta;

      const zonePolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ],
        ],
      };

      const zoneConfig: any = {
        searchStringsArray: [searchQuery],
        maxCrawledPlacesPerSearch: limit, // СТРОГО лимит для ЭТОЙ конкретной зоны!
        language: 'ru',
        scrapeContactDetails: true,
        skipClosedPlaces: true,
        customGeolocation: zonePolygon,
      };

      if (z.location && !z.location.startsWith('Точка')) {
        zoneConfig.locationQuery = z.location;
      }

      const run = await client.actor('compass/crawler-google-places').call(zoneConfig);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      return items || [];
    });

    const resultsPerZone = await Promise.all(zonePromises);
    const rawItems = resultsPerZone.flat();

    // Дедупликация компаний
    const seenIds = new Set<string>();
    const items = rawItems.filter((item: any) => {
      const key = item.placeId || item.id || item.title || item.name;
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    });

    if (items.length > 0) {
      console.log('Sample Apify Item Keys:', Object.keys(items[0]));
      console.log('Sample Apify Item Contact Details:', {
        email: items[0].email,
        emails: items[0].emails,
        contactDetails: items[0].contactDetails,
        socialMedia: items[0].socialMedia,
        socials: items[0].socials,
        contact: items[0].contact,
        contacts: items[0].contacts,
        websiteContacts: items[0].websiteContacts,
      });
    }

    const companies: CompanyLead[] = items.map((item: any, index: number) => {
      // Соцсети и дополнительные контакты
      const socials = item.socialMedia || item.socials || item.social_media || {};
      
      // Ищем email во всех возможных местах, которые может возвращать Apify
      let extractedEmails: string[] = [];
      if (Array.isArray(item.emails) && item.emails.length > 0) {
        extractedEmails = item.emails;
      } else if (item.email) {
        extractedEmails = [item.email];
      } else if (item.contactDetails?.emails && Array.isArray(item.contactDetails.emails)) {
        extractedEmails = item.contactDetails.emails;
      } else if (item.contactDetails?.email) {
        extractedEmails = [item.contactDetails.email];
      } else if (item.additionalContactDetails?.emails) {
        extractedEmails = item.additionalContactDetails.emails;
      } else if (item.websiteContacts?.emails) {
        extractedEmails = item.websiteContacts.emails;
      }

      const locationObj = item.location || item.geo || item.position || {};
      let rawLat = item.latitude ?? locationObj.lat ?? item.location?.lat ?? item.lat;
      let rawLng = item.longitude ?? locationObj.lng ?? item.location?.lng ?? item.lng;

      if (rawLat === undefined && item.googleMapsUrl) {
        // Запасной парсинг координат из url карты google if present (!3d43.25!4d76.95)
        const matchLat = item.googleMapsUrl.match(/!3d(-?\d+\.\d+)/);
        const matchLng = item.googleMapsUrl.match(/!4d(-?\d+\.\d+)/);
        if (matchLat) rawLat = parseFloat(matchLat[1]);
        if (matchLng) rawLng = parseFloat(matchLng[1]);
      }

      const parsedLat = typeof rawLat === 'number' ? rawLat : (rawLat ? parseFloat(rawLat) : undefined);
      const parsedLng = typeof rawLng === 'number' ? rawLng : (rawLng ? parseFloat(rawLng) : undefined);

      return {
        id: item.placeId || item.id || `lead-${index}-${Date.now()}`,
        title: item.title || item.name || 'Без названия',
        category: item.categoryName || item.categories?.[0] || '',
        address: item.address || item.street || '',
        city: item.city || '',
        phone: item.phone || item.phoneUnformatted || item.sitePhone || '',
        website: item.website || item.domain || '',
        email: extractedEmails.length > 0 ? extractedEmails.filter(Boolean).join(', ') : '',
        instagram: socials.instagram || item.instagram || '',
        facebook: socials.facebook || item.facebook || '',
        linkedin: socials.linkedin || item.linkedin || '',
        youtube: socials.youtube || item.youtube || '',
        telegram: socials.telegram || item.telegram || '',
        rating: item.totalScore || item.rating || undefined,
        reviewsCount: item.reviewsCount || item.reviewsCount || undefined,
        googleUrl: item.url || item.googleUrl || '',
        lat: parsedLat,
        lng: parsedLng,
      };
    });

    return { success: true, companies };
  } catch (error: any) {
    console.error('Apify Google Maps Scraper error:', error);
    return {
      success: false,
      error: error?.message || 'Произошла ошибка при выполнении парсинга в Apify',
    };
  }
}
