import { faker } from '@faker-js/faker';
import { JwtService } from '@nestjs/jwt';

import { envConfig } from '../../src/config/env.config';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { ListingsService } from '../../src/modules/listings/application/listings.service';
import { PropertiesService } from '../../src/modules/properties/application/properties.service';

describe('Real estate simulated flow', () => {
  it('registra dos usuarios y el segundo encuentra el listing en su feed', async () => {
    const logStep = (step: number, message: string, payload?: unknown) => {
      if (payload !== undefined) {
        console.log(`[SIM_FLOW][STEP ${step}] ${message}`, payload);
        return;
      }
      console.log(`[SIM_FLOW][STEP ${step}] ${message}`);
    };

    faker.seed(2026);
    logStep(0, 'Seed inicializada', 2026);

    const users: Array<{
      id: string;
      email: string;
      passwordHash: string;
      isActive: boolean;
      userType: 'buyer' | 'seller' | 'agent' | 'investor';
      country: string;
    }> = [];

    const sessions: Array<{
      id: string;
      userId: string;
      deviceId?: string;
      deviceName?: string;
      deviceLocation?: string;
      refreshTokenHash: string;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
      isRevoked: boolean;
      createdAt: Date;
    }> = [];

    const properties: Array<{
      id: string;
      advertiserUserId: string;
      operationType: 'rent' | 'buy';
      bedrooms: number;
      availability: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
      mapLocation: { lat: number; lng: number; city?: string; country?: string };
      [k: string]: unknown;
    }> = [];

    const listings: Array<{
      id: string;
      propertyId: string;
      status: 'available' | 'paused';
      price: string;
      viewsCount: number;
      savesCount: number;
      leadsCount: number;
      applicationsCount: number;
      [k: string]: unknown;
    }> = [];

    const searchHistory: Array<{
      userId: string;
      operationType?: string;
      country?: string;
      city?: string;
      distanceRangeKm?: string;
      userLat?: string;
      userLng?: string;
      minPrice?: string;
      maxPrice?: string;
    }> = [];

    const authRepository = {
      findUserByEmail: jest.fn(
        async (email: string) => users.find((u) => u.email === email) ?? null,
      ),
      findUserById: jest.fn(async (id: string) => users.find((u) => u.id === id) ?? null),
      createSession: jest.fn(
        async (input: Omit<(typeof sessions)[number], 'isRevoked' | 'createdAt'>) => {
          sessions.push({ ...input, isRevoked: false, createdAt: new Date() });
        },
      ),
      findActiveSession: jest.fn(
        async (id: string, userId: string) =>
          sessions.find((s) => s.id === id && s.userId === userId && !s.isRevoked) ?? null,
      ),
      revokeSession: jest.fn(async (id: string) => {
        const session = sessions.find((s) => s.id === id);
        if (session) session.isRevoked = true;
      }),
      revokeSessionForUser: jest.fn(async (id: string, userId: string) => {
        const session = sessions.find((s) => s.id === id && s.userId === userId);
        if (session) session.isRevoked = true;
      }),
      revokeAllSessionsExcept: jest.fn(async (userId: string, keepSessionId: string) => {
        sessions.forEach((session) => {
          if (session.userId === userId && session.id !== keepSessionId) {
            session.isRevoked = true;
          }
        });
      }),
      listActiveSessions: jest.fn(async (userId: string) =>
        sessions
          .filter((s) => s.userId === userId && !s.isRevoked)
          .map((s) => ({
            id: s.id,
            deviceId: s.deviceId ?? 'unknown-device',
            deviceName: s.deviceName ?? null,
            deviceLocation: s.deviceLocation ?? null,
            ipAddress: s.ipAddress ?? null,
            userAgent: s.userAgent ?? null,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
          })),
      ),
      ensureSeedUser: jest.fn(async (email: string, passwordHash: string) => {
        if (users.some((u) => u.email === email)) return;
        users.push({
          id: faker.string.uuid(),
          email,
          passwordHash,
          isActive: true,
          userType: 'agent',
          country: 'MX',
        });
      }),
      createUser: jest.fn(
        async (input: {
          email: string;
          passwordHash: string;
          userType: 'buyer' | 'seller' | 'agent' | 'investor';
          country: string;
        }) => {
          const user = {
            id: faker.string.uuid(),
            email: input.email,
            passwordHash: input.passwordHash,
            isActive: true,
            userType: input.userType,
            country: input.country,
          };
          users.push(user);
          return user;
        },
      ),
    };

    const propertiesRepository = {
      create: jest.fn(
        async (
          input: Record<string, unknown> & {
            mapLocation?: {
              lat: number;
              lng: number;
              address?: string;
              city?: string;
              country?: string;
            };
          },
        ) => {
          const row = { id: faker.string.uuid(), ...input };
          properties.push(row as (typeof properties)[number]);
          return row;
        },
      ),
      findAllVisible: jest.fn(async () => [...properties]),
      findByIdVisible: jest.fn(
        async (propertyId: string) => properties.find((p) => p.id === propertyId) ?? null,
      ),
      update: jest.fn(async (propertyId: string, body: Record<string, unknown>) => {
        const property = properties.find((p) => p.id === propertyId);
        if (!property) return null;
        Object.assign(property, body);
        return property;
      }),
      remove: jest.fn(async (propertyId: string) => {
        const idx = properties.findIndex((p) => p.id === propertyId);
        if (idx >= 0) properties.splice(idx, 1);
      }),
      registerVisit: jest.fn(async () => undefined),
      changeAvailability: jest.fn(
        async (input: {
          propertyId: string;
          toStatus: (typeof properties)[number]['availability'];
        }) => {
          const property = properties.find((p) => p.id === input.propertyId);
          if (!property) return null;
          property.availability = input.toStatus;
          return property;
        },
      ),
    };

    const listingsRepository = {
      create: jest.fn(
        async (input: { propertyId: string; title: string; summary?: string; price: number }) => {
          const row = {
            id: faker.string.uuid(),
            propertyId: input.propertyId,
            title: input.title,
            summary: input.summary ?? null,
            status: 'available' as const,
            price: String(input.price),
            viewsCount: 0,
            savesCount: 0,
            leadsCount: 0,
            visitsScheduledCount: 0,
            applicationsCount: 0,
            chatMessagesCount: 0,
            metadata: {},
          };
          listings.push(row);
          return row;
        },
      ),
      findAllAvailable: jest.fn(async () =>
        listings
          .filter((l) => l.status === 'available')
          .map((listing) => {
            const property = properties.find((p) => p.id === listing.propertyId);
            return property ? { listing, property } : null;
          })
          .filter(
            (
              row,
            ): row is {
              listing: (typeof listings)[number];
              property: (typeof properties)[number];
            } => row !== null,
          ),
      ),
      findByIdAvailable: jest.fn(async (listingId: string) => {
        const listing = listings.find((l) => l.id === listingId && l.status === 'available');
        if (!listing) return null;
        const property = properties.find((p) => p.id === listing.propertyId);
        return property ? { listing, property } : null;
      }),
      update: jest.fn(async (listingId: string, body: Record<string, unknown>) => {
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) return null;
        Object.assign(listing, body);
        return listing;
      }),
      remove: jest.fn(async (listingId: string) => {
        const idx = listings.findIndex((l) => l.id === listingId);
        if (idx >= 0) listings.splice(idx, 1);
      }),
      changeStatus: jest.fn(async (listingId: string, status: 'available' | 'paused') => {
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) return null;
        listing.status = status;
        return listing;
      }),
      getAnalytics: jest.fn(async (listingId: string) => {
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) return null;
        return {
          listingId,
          counters: {
            views: listing.viewsCount,
            saves: listing.savesCount,
            leads: listing.leadsCount,
            visitsScheduled: 0,
            applications: listing.applicationsCount,
            chatMessages: 0,
          },
          lastInteractionAt: null,
          recentEvents: [],
        };
      }),
      getFeedCandidates: jest.fn(
        async (filters?: {
          operationType?: string;
          minPrice?: number;
          maxPrice?: number;
          country?: string;
          city?: string;
          bedrooms?: number;
        }) =>
          (await listingsRepository.findAllAvailable()).filter((row) => {
            const price = Number(row.listing.price);
            const country = String(row.property.mapLocation.country ?? '').toLowerCase();
            const city = String(row.property.mapLocation.city ?? '').toLowerCase();
            if (filters?.operationType && row.property.operationType !== filters.operationType)
              return false;
            if (filters?.minPrice !== undefined && price < filters.minPrice) return false;
            if (filters?.maxPrice !== undefined && price > filters.maxPrice) return false;
            if (filters?.country && country !== filters.country.toLowerCase()) return false;
            if (filters?.city && city !== filters.city.toLowerCase()) return false;
            if (filters?.bedrooms !== undefined && row.property.bedrooms < filters.bedrooms)
              return false;
            return true;
          }),
      ),
      getUserProfile: jest.fn(async (userId: string) => {
        const user = users.find((u) => u.id === userId);
        return user ? { userType: user.userType, country: user.country } : null;
      }),
      getRecentSearchHistory: jest.fn(async (userId: string) =>
        searchHistory
          .filter((item) => item.userId === userId)
          .slice(-20)
          .reverse(),
      ),
      recordSearchHistory: jest.fn(
        async (input: {
          userId: string;
          queryText?: string;
          operationType?: string;
          country?: string;
          city?: string;
          minPrice?: number;
          maxPrice?: number;
          distanceRangeKm?: number;
          userLat?: number;
          userLng?: number;
        }) => {
          searchHistory.push({
            userId: input.userId,
            operationType: input.operationType,
            country: input.country,
            city: input.city,
            minPrice: input.minPrice !== undefined ? String(input.minPrice) : undefined,
            maxPrice: input.maxPrice !== undefined ? String(input.maxPrice) : undefined,
            distanceRangeKm:
              input.distanceRangeKm !== undefined ? String(input.distanceRangeKm) : undefined,
            userLat: input.userLat !== undefined ? String(input.userLat) : undefined,
            userLng: input.userLng !== undefined ? String(input.userLng) : undefined,
          });
        },
      ),
      trackListingView: jest.fn(async (listingId: string) => {
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) return null;
        listing.viewsCount += 1;
        return listing;
      }),
    };

    const authService = new AuthService(new JwtService(), authRepository as never, envConfig());
    const propertiesService = new PropertiesService(propertiesRepository as never);
    const listingsService = new ListingsService(listingsRepository as never);

    const ownerEmail = faker.internet.email().toLowerCase();
    const seekerEmail = faker.internet.email().toLowerCase();
    const password = 'KeuwoPass123!';

    logStep(1, 'Registrando usuario anunciante', { ownerEmail });
    await authService.register({
      email: ownerEmail,
      password,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      birthday: '1992-03-15',
      phone: faker.phone.number(),
      country: 'MX',
      occupation: 'Seller',
      city: 'Monterrey',
      userType: 'seller',
      preferredContactMethod: 'whatsapp',
      deviceId: 'owner-device',
      deviceName: 'Owner iPhone',
      deviceLocation: 'Monterrey, MX',
      userAgent: 'jest',
      ipAddress: '10.10.10.10',
    });

    logStep(2, 'Registrando usuario buscador', { seekerEmail });
    await authService.register({
      email: seekerEmail,
      password,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      birthday: '1994-09-09',
      phone: faker.phone.number(),
      country: 'MX',
      occupation: 'Buyer',
      city: 'Monterrey',
      userType: 'buyer',
      preferredContactMethod: 'email',
      deviceId: 'seeker-device',
      deviceName: 'Seeker Pixel',
      deviceLocation: 'Monterrey, MX',
      userAgent: 'jest',
      ipAddress: '10.10.10.11',
    });

    logStep(3, 'Login de anunciante');
    const ownerLogin = await authService.login({
      email: ownerEmail,
      password,
      deviceId: 'owner-device-login',
      deviceName: 'Owner Macbook',
      deviceLocation: 'Monterrey, MX',
      userAgent: 'jest',
      ipAddress: '10.10.10.12',
    });
    logStep(4, 'Login anunciante correcto (tokens generados)', {
      hasAccessToken: Boolean(ownerLogin.accessToken),
      hasRefreshToken: Boolean(ownerLogin.refreshToken),
    });

    const owner = users.find((u) => u.email === ownerEmail);
    const seeker = users.find((u) => u.email === seekerEmail);
    expect(owner).toBeDefined();
    expect(seeker).toBeDefined();
    if (!owner || !seeker) {
      throw new Error('No se pudieron resolver usuarios luego del registro');
    }

    logStep(5, 'Creando propiedad');
    const property = await propertiesService.create({
      advertiserUserId: owner.id,
      operationType: 'buy',
      areaM2: 120,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ['pool', 'gym'],
      photos: [{ url: faker.image.url(), category: 'cover' }],
      description: faker.lorem.paragraph(),
      cost: 3500000,
      requirements: ['official_id'],
      availability: 'available_soon',
      nearbyPoints: [{ name: 'Metro', distanceM: 800, category: 'transport' }],
      mapLocation: { lat: 25.6866, lng: -100.3161, address: 'Zona Centro, Monterrey' },
    });
    const propertyId = String(property.id);
    logStep(6, 'Propiedad creada', { propertyId, availability: property.availability });

    logStep(7, 'Cambiando disponibilidad de propiedad a available');
    await propertiesService.changeAvailability(
      propertyId,
      { toStatus: 'available', reason: 'Lista para publicacion' },
      owner.id,
    );
    logStep(8, 'Disponibilidad actualizada');

    logStep(9, 'Creando listing para la propiedad');
    const listing = await listingsService.create({
      propertyId,
      title: 'Departamento premium',
      summary: 'Excelente ubicacion',
      price: 3500000,
    });
    const listingId = String(listing.id);
    logStep(10, 'Listing creado', { listingId, propertyId });

    logStep(11, 'Login de usuario buscador');
    const seekerLogin = await authService.login({
      email: seekerEmail,
      password,
      deviceId: 'seeker-device-login',
      deviceName: 'Seeker Laptop',
      deviceLocation: 'Monterrey, MX',
      userAgent: 'jest',
      ipAddress: '10.10.10.13',
    });
    logStep(12, 'Login buscador correcto (tokens generados)', {
      hasAccessToken: Boolean(seekerLogin.accessToken),
      hasRefreshToken: Boolean(seekerLogin.refreshToken),
    });

    logStep(13, 'Registrando historico de busquedas del usuario buscador');
    await listingsRepository.recordSearchHistory({
      userId: seeker.id,
      operationType: 'buy',
      queryText: 'departamento 3 recamaras',
      country: 'MX',
      city: 'Monterrey',
      minPrice: 1000000,
      maxPrice: 5000000,
      userLat: 25.6866,
      userLng: -100.3161,
      distanceRangeKm: 20,
    });

    await listingsRepository.recordSearchHistory({
      userId: seeker.id,
      operationType: 'buy',
      queryText: 'zona centro',
      country: 'MX',
      city: 'Monterrey',
      minPrice: 2000000,
      maxPrice: 4500000,
      userLat: 25.68,
      userLng: -100.31,
      distanceRangeKm: 15,
    });
    logStep(14, 'Historico de busquedas guardado', {
      searchHistoryEntries: searchHistory.filter((entry) => entry.userId === seeker.id).length,
    });

    logStep(15, 'Consultando feed sin filtros (solo userId, basado en historial)');
    const recordSearchHistoryCallsBeforeFeed =
      listingsRepository.recordSearchHistory.mock.calls.length;
    const feed = await listingsService.getFeed({
      userId: seeker.id,
    });
    logStep(16, 'Feed personalizado recibido', {
      totalResults: feed.length,
      listingIds: feed.map((entry) => entry.listing.id),
    });

    logStep(17, 'Consultando feed sin input para fallback global');
    const feedWithoutInput = await listingsService.getFeed();
    logStep(18, 'Feed global recibido', {
      totalResults: feedWithoutInput.length,
      listingIds: feedWithoutInput.map((entry) => entry.listing.id),
    });

    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((entry) => entry.listing.id === listingId)).toBe(true);
    expect(feedWithoutInput.length).toBeGreaterThan(0);
    expect(listingsRepository.recordSearchHistory).toHaveBeenCalledTimes(2);
    expect(listingsRepository.recordSearchHistory.mock.calls.length).toBe(
      recordSearchHistoryCallsBeforeFeed,
    );
    expect(listingsRepository.trackListingView).toHaveBeenCalled();
    logStep(19, 'Flujo validado exitosamente');
  });
});
