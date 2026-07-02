import { faker } from '@faker-js/faker';
import { JwtService } from '@nestjs/jwt';

import { envConfig } from '../../src/config/env.config';
import { AnalyticsService } from '../../src/modules/analytics/application/analytics.service';
import { BehaviorEventsConsumer } from '../../src/modules/analytics/application/behavior-events.consumer';
import { AuthService } from '../../src/modules/auth/application/auth.service';
import { ListingsService } from '../../src/modules/listings/application/listings.service';
import { NotificationsService } from '../../src/modules/notifications/application/notifications.service';
import { PropertiesService } from '../../src/modules/properties/application/properties.service';
import { SearchService } from '../../src/modules/search/application/search.service';
import { buildPaginatedResult } from '../../src/shared/application/pagination/pagination';
import { DomainEvent } from '../../src/shared/domain/events/domain-event';

describe('Real estate simulated flow', () => {
  it('publica propiedad y listing, busca con filtros y genera insights de comportamiento', async () => {
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

    interface PropertyRecord {
      id: string;
      advertiserUserId: string;
      status: 'draft' | 'published' | 'archived';
      operationType: 'rent' | 'buy';
      developerId?: string;
      bedrooms: number;
      bathrooms: number;
      furnished: boolean;
      cost: string;
      amenities: string[];
      availability: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
      mapLocation: { lat: number; lng: number; address?: string; city: string; country: string };
      publishedAt: Date | null;
      metadata: Record<string, unknown>;
      [k: string]: unknown;
    }

    interface ListingRecord {
      id: string;
      propertyId: string;
      title: string;
      summary: string | null;
      status: 'draft' | 'published' | 'paused' | 'closed';
      dealType: 'direct_owner' | 'owner_administrator' | 'real_estate_agency' | 'developer';
      price: string;
      publishedAt: Date | null;
      deactivatedAt: Date | null;
      viewsCount: number;
      savesCount: number;
      leadsCount: number;
      visitsScheduledCount: number;
      applicationsCount: number;
      chatMessagesCount: number;
      metadata: Record<string, unknown>;
      [k: string]: unknown;
    }

    const propertyRecords: PropertyRecord[] = [];
    const listingRecords: ListingRecord[] = [];
    const outboxEvents: DomainEvent[] = [];
    const searchHistory: Array<Record<string, unknown>> = [];

    const collectEvents = <T>(factory: ((row: T) => DomainEvent[]) | undefined, row: T) => {
      for (const event of factory?.(row) ?? []) {
        outboxEvents.push(event);
      }
    };

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
      createEmailVerificationToken: jest.fn(async () => undefined),
    };

    const propertyVisibleTo = (property: PropertyRecord, viewerUserId?: string) => {
      if (property.status !== 'published') {
        return viewerUserId !== undefined && property.advertiserUserId === viewerUserId;
      }
      return property.availability !== 'unavailable';
    };

    const propertiesRepository = {
      create: jest.fn(
        async (
          input: Record<string, unknown>,
          eventsFactory?: (row: PropertyRecord) => DomainEvent[],
        ) => {
          const row = {
            id: faker.string.uuid(),
            status: 'draft',
            publishedAt: null,
            metadata: {},
            ...input,
            cost: String(input.cost),
          } as PropertyRecord;
          propertyRecords.push(row);
          collectEvents(eventsFactory, row);
          return row;
        },
      ),
      findById: jest.fn(
        async (propertyId: string) => propertyRecords.find((p) => p.id === propertyId) ?? null,
      ),
      findAllVisible: jest.fn(async (viewerUserId?: string) =>
        propertyRecords.filter((p) => propertyVisibleTo(p, viewerUserId)),
      ),
      findByIdVisible: jest.fn(async (propertyId: string, viewerUserId?: string) => {
        const property = propertyRecords.find((p) => p.id === propertyId);
        if (!property || !propertyVisibleTo(property, viewerUserId)) return null;
        return property;
      }),
      publish: jest.fn(
        async (propertyId: string, eventsFactory?: (row: PropertyRecord) => DomainEvent[]) => {
          const property = propertyRecords.find((p) => p.id === propertyId);
          if (!property || property.status !== 'draft') return null;
          property.status = 'published';
          property.publishedAt = new Date();
          collectEvents(eventsFactory, property);
          return property;
        },
      ),
      update: jest.fn(async (propertyId: string, body: Record<string, unknown>) => {
        const property = propertyRecords.find((p) => p.id === propertyId);
        if (!property) return null;
        Object.assign(property, body);
        return property;
      }),
      remove: jest.fn(async (propertyId: string) => {
        const idx = propertyRecords.findIndex((p) => p.id === propertyId);
        if (idx >= 0) propertyRecords.splice(idx, 1);
      }),
      registerVisit: jest.fn(
        async (_propertyId: string, _userId: string, eventsFactory?: () => DomainEvent[]) => {
          collectEvents(eventsFactory as never, undefined as never);
        },
      ),
      changeAvailability: jest.fn(
        async (
          input: { propertyId: string; toStatus: PropertyRecord['availability'] },
          eventsFactory?: (row: PropertyRecord) => DomainEvent[],
        ) => {
          const property = propertyRecords.find((p) => p.id === input.propertyId);
          if (!property) return null;
          property.availability = input.toStatus;
          if (input.toStatus === 'unavailable') {
            listingRecords
              .filter((l) => l.propertyId === property.id && l.status === 'published')
              .forEach((l) => {
                l.status = 'paused';
                l.deactivatedAt = new Date();
              });
          }
          collectEvents(eventsFactory, property);
          return property;
        },
      ),
    };

    const listingAvailable = (listing: ListingRecord) => {
      const property = propertyRecords.find((p) => p.id === listing.propertyId);
      return Boolean(
        property &&
        listing.status === 'published' &&
        property.status === 'published' &&
        property.availability !== 'unavailable',
      );
    };

    const listingsRepository = {
      create: jest.fn(
        async (
          input: {
            propertyId: string;
            title: string;
            summary?: string;
            dealType: ListingRecord['dealType'];
            price: number;
          },
          eventsFactory?: (row: ListingRecord) => DomainEvent[],
        ) => {
          const row: ListingRecord = {
            id: faker.string.uuid(),
            propertyId: input.propertyId,
            title: input.title,
            summary: input.summary ?? null,
            status: 'draft',
            dealType: input.dealType,
            price: String(input.price),
            publishedAt: null,
            deactivatedAt: null,
            viewsCount: 0,
            savesCount: 0,
            leadsCount: 0,
            visitsScheduledCount: 0,
            applicationsCount: 0,
            chatMessagesCount: 0,
            metadata: {},
          };
          listingRecords.push(row);
          collectEvents(eventsFactory, row);
          return row;
        },
      ),
      findAllAvailable: jest.fn(async () =>
        listingRecords.filter(listingAvailable).map((listing) => ({
          listing,
          property: propertyRecords.find((p) => p.id === listing.propertyId)!,
        })),
      ),
      findById: jest.fn(
        async (listingId: string) => listingRecords.find((l) => l.id === listingId) ?? undefined,
      ),
      findPropertyById: jest.fn(
        async (propertyId: string) => propertyRecords.find((p) => p.id === propertyId) ?? null,
      ),
      findByIdWithProperty: jest.fn(async (listingId: string) => {
        const listing = listingRecords.find((l) => l.id === listingId);
        if (!listing) return null;
        const property = propertyRecords.find((p) => p.id === listing.propertyId);
        return property ? { listing, property } : null;
      }),
      findByIdAvailable: jest.fn(async (listingId: string) => {
        const listing = listingRecords.find((l) => l.id === listingId);
        if (!listing || !listingAvailable(listing)) return null;
        return {
          listing,
          property: propertyRecords.find((p) => p.id === listing.propertyId)!,
        };
      }),
      update: jest.fn(async (listingId: string, body: Record<string, unknown>) => {
        const listing = listingRecords.find((l) => l.id === listingId);
        if (!listing) return null;
        Object.assign(listing, body);
        return listing;
      }),
      remove: jest.fn(async (listingId: string) => {
        const idx = listingRecords.findIndex((l) => l.id === listingId);
        if (idx >= 0) listingRecords.splice(idx, 1);
      }),
      publish: jest.fn(
        async (listingId: string, eventsFactory?: (row: ListingRecord) => DomainEvent[]) => {
          const listing = listingRecords.find((l) => l.id === listingId);
          if (!listing || (listing.status !== 'draft' && listing.status !== 'paused')) return null;
          listing.status = 'published';
          listing.publishedAt = new Date();
          listing.deactivatedAt = null;
          collectEvents(eventsFactory, listing);
          return listing;
        },
      ),
      changeStatus: jest.fn(
        async (
          listingId: string,
          status: 'published' | 'paused' | 'closed',
          eventsFactory?: (row: ListingRecord) => DomainEvent[],
        ) => {
          const listing = listingRecords.find((l) => l.id === listingId);
          if (!listing) return null;
          listing.status = status;
          listing.deactivatedAt = status === 'paused' || status === 'closed' ? new Date() : null;
          collectEvents(eventsFactory, listing);
          return listing;
        },
      ),
      trackAnalyticsEvent: jest.fn(
        async (
          listingId: string,
          input: { eventType: string; value: number },
          events?: DomainEvent[],
        ) => {
          const listing = listingRecords.find((l) => l.id === listingId);
          if (!listing) return null;
          if (input.eventType === 'view') listing.viewsCount += input.value;
          if (input.eventType === 'save') listing.savesCount += input.value;
          if (input.eventType === 'lead') listing.leadsCount += input.value;
          for (const event of events ?? []) {
            outboxEvents.push(event);
          }
          return listing;
        },
      ),
      trackListingView: jest.fn(
        async (
          listingId: string,
          _input: { actorUserId?: string; source: string },
          events?: DomainEvent[],
        ) => {
          const listing = listingRecords.find((l) => l.id === listingId);
          if (!listing) return null;
          listing.viewsCount += 1;
          for (const event of events ?? []) {
            outboxEvents.push(event);
          }
          return listing;
        },
      ),
      getAnalytics: jest.fn(async (listingId: string) => {
        const listing = listingRecords.find((l) => l.id === listingId);
        if (!listing) return null;
        return {
          listingId,
          counters: {
            views: listing.viewsCount,
            saves: listing.savesCount,
            leads: listing.leadsCount,
            visitsScheduled: listing.visitsScheduledCount,
            applications: listing.applicationsCount,
            chatMessages: listing.chatMessagesCount,
          },
          lastInteractionAt: null,
          recentEvents: [],
        };
      }),
    };

    const searchRepository = {
      searchListings: jest.fn(
        async (filters: {
          q?: string;
          operationType?: string;
          dealType?: string;
          developerId?: string;
          furnished?: boolean;
          minPrice?: number;
          maxPrice?: number;
          bedrooms?: number;
          bathrooms?: number;
          city?: string;
          country?: string;
          page?: number;
          pageSize?: number;
        }) => {
          const items = listingRecords
            .filter(listingAvailable)
            .map((listing) => ({
              listing,
              property: propertyRecords.find((p) => p.id === listing.propertyId)!,
              distanceKm: null as number | null,
            }))
            .filter(({ listing, property }) => {
              const price = Number(listing.price);
              if (filters.operationType && property.operationType !== filters.operationType)
                return false;
              if (filters.dealType && listing.dealType !== filters.dealType) return false;
              if (filters.developerId && property.developerId !== filters.developerId) return false;
              if (filters.furnished !== undefined && property.furnished !== filters.furnished)
                return false;
              if (filters.minPrice !== undefined && price < filters.minPrice) return false;
              if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
              if (filters.bedrooms !== undefined && property.bedrooms < filters.bedrooms)
                return false;
              if (filters.bathrooms !== undefined && Number(property.bathrooms) < filters.bathrooms)
                return false;
              if (
                filters.city &&
                property.mapLocation.city.toLowerCase() !== filters.city.toLowerCase()
              )
                return false;
              if (
                filters.country &&
                property.mapLocation.country.toLowerCase() !== filters.country.toLowerCase()
              )
                return false;
              if (
                filters.q &&
                !`${listing.title} ${listing.summary ?? ''}`
                  .toLowerCase()
                  .includes(filters.q.toLowerCase())
              )
                return false;
              return true;
            });
          return buildPaginatedResult(
            items,
            items.length,
            filters.page ?? 1,
            filters.pageSize ?? 20,
          );
        },
      ),
      recordSearchHistory: jest.fn(async (input: Record<string, unknown>) => {
        searchHistory.push(input);
      }),
      getRecentSearchHistory: jest.fn(
        async (userId: string, pagination?: { page?: number; pageSize?: number }) => {
          const page = pagination?.page ?? 1;
          const pageSize = pagination?.pageSize ?? 20;
          const all = searchHistory.filter((item) => item.userId === userId);
          const items = all.slice((page - 1) * pageSize, page * pageSize);
          return buildPaginatedResult(items, all.length, page, pageSize);
        },
      ),
    };

    const searchOutbox = {
      add: jest.fn(async (event: DomainEvent) => {
        outboxEvents.push(event);
      }),
    };

    const behaviorEvents: Array<{
      userId: string;
      eventType: string;
      entityType: string;
      entityId?: string;
      payload: Record<string, unknown>;
      occurredAt: Date;
    }> = [];
    const materializedInsights = new Map<string, Record<string, unknown>>();

    const behaviorRepository = {
      recordEvent: jest.fn(async (input: (typeof behaviorEvents)[number]) => {
        behaviorEvents.push(input);
      }),
      getDistinctUserIds: jest.fn(async () => [
        ...new Set(behaviorEvents.map((event) => event.userId)),
      ]),
      getRecentEventsByUser: jest.fn(async (userId: string) =>
        behaviorEvents.filter((event) => event.userId === userId),
      ),
      upsertInsights: jest.fn(async (input: { userId: string } & Record<string, unknown>) => {
        materializedInsights.set(input.userId, input);
      }),
      getInsights: jest.fn(async (userId: string) => materializedInsights.get(userId) ?? null),
    };

    const notificationsService = {
      sendEmailConfirmation: jest.fn(async () => undefined),
      sendTwoFactorCodeByEmail: jest.fn(async () => undefined),
      sendTwoFactorCodeByPhone: jest.fn(async () => undefined),
    } as unknown as NotificationsService;
    const authService = new AuthService(
      new JwtService(),
      authRepository as never,
      notificationsService,
      envConfig(),
    );
    const propertiesService = new PropertiesService(propertiesRepository as never);
    const listingsService = new ListingsService(listingsRepository as never);
    const searchService = new SearchService(searchRepository as never, searchOutbox as never);
    const behaviorConsumer = new BehaviorEventsConsumer(behaviorRepository as never);
    const analyticsService = new AnalyticsService(behaviorRepository as never);

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

    const owner = users.find((u) => u.email === ownerEmail);
    const seeker = users.find((u) => u.email === seekerEmail);
    expect(owner).toBeDefined();
    expect(seeker).toBeDefined();
    if (!owner || !seeker) {
      throw new Error('No se pudieron resolver usuarios luego del registro');
    }

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
    expect(ownerLogin.accessToken).toBeDefined();

    logStep(4, 'Creando propiedad (queda en draft)');
    const property = await propertiesService.create({
      advertiserUserId: owner.id,
      developerId: 'dev-constructora-01',
      operationType: 'buy',
      areaM2: 120,
      bedrooms: 3,
      bathrooms: 2.5,
      furnished: true,
      amenities: ['pool', 'gym'],
      photos: [{ url: faker.image.url(), category: 'cover' }],
      description: faker.lorem.paragraph(),
      cost: 3500000,
      requirements: ['official_id'],
      availability: 'available',
      nearbyPoints: [{ name: 'Metro', distanceM: 800, category: 'transport' }],
      mapLocation: {
        lat: 25.6866,
        lng: -100.3161,
        address: 'Zona Centro, Monterrey',
        country: 'MX',
        city: 'Monterrey',
      },
    });
    const propertyId = String(property.id);
    expect(property.status).toBe('draft');

    logStep(5, 'Publicando propiedad');
    const publishedProperty = await propertiesService.publish(propertyId);
    expect(publishedProperty?.status).toBe('published');

    logStep(6, 'Creando listing (queda en draft)');
    const listing = await listingsService.create({
      propertyId,
      title: 'Departamento premium',
      summary: 'Excelente ubicacion zona centro',
      dealType: 'real_estate_agency',
      price: 3500000,
    });
    const listingId = String(listing.id);
    expect(listing.status).toBe('draft');
    expect(listing.dealType).toBe('real_estate_agency');

    logStep(7, 'Publicando listing');
    const publishedListing = await listingsService.publish(listingId);
    expect(publishedListing?.status).toBe('published');

    logStep(8, 'Login de usuario buscador');
    const seekerLogin = await authService.login({
      email: seekerEmail,
      password,
      deviceId: 'seeker-device-login',
      deviceName: 'Seeker Laptop',
      deviceLocation: 'Monterrey, MX',
      userAgent: 'jest',
      ipAddress: '10.10.10.13',
    });
    expect(seekerLogin.accessToken).toBeDefined();

    logStep(9, 'Buscando listings con filtros');
    const searchResult = await searchService.searchListings({
      q: 'departamento',
      operationType: 'buy',
      minPrice: 1000000,
      maxPrice: 5000000,
      bedrooms: 3,
      bathrooms: 2.5,
      furnished: true,
      dealType: 'real_estate_agency',
      country: 'MX',
      city: 'Monterrey',
      userId: seeker.id,
    });
    logStep(10, 'Resultados de busqueda', {
      total: searchResult.total,
      listingIds: searchResult.items.map((item) => item.listing.id),
    });
    expect(searchResult.total).toBe(1);
    expect(searchResult.items[0].listing.id).toBe(listingId);
    expect(searchRepository.recordSearchHistory).toHaveBeenCalledTimes(1);

    logStep(11, 'Viendo detalle del listing (view tracking)');
    await listingsService.findById(listingId, seeker.id);

    logStep(12, 'Registrando interaccion save via endpoint de eventos');
    await listingsService.trackInteraction(listingId, {
      eventType: 'save',
      actorUserId: seeker.id,
    });

    logStep(13, 'Registrando visita fisica a la propiedad');
    await propertiesService.registerVisit(propertyId, seeker.id);

    logStep(14, 'Verificando eventos outbox generados');
    const topics = outboxEvents.map((event) => event.eventType);
    expect(topics).toContain('properties.property_created.v1');
    expect(topics).toContain('properties.property_published.v1');
    expect(topics).toContain('listings.listing_created.v1');
    expect(topics).toContain('listings.listing_published.v1');
    expect(topics).toContain('search.search_performed.v1');
    expect(topics).toContain('listings.listing_interaction.v1');
    expect(topics).toContain('properties.property_visit_registered.v1');

    logStep(15, 'Simulando relay del outbox hacia el consumidor de comportamiento');
    for (const event of outboxEvents) {
      if (event.eventType === 'search.search_performed.v1') {
        await behaviorConsumer.onSearchPerformed(event as never);
      }
      if (event.eventType === 'listings.listing_interaction.v1') {
        await behaviorConsumer.onListingInteraction(event as never);
      }
      if (event.eventType === 'properties.property_visit_registered.v1') {
        await behaviorConsumer.onPropertyVisitRegistered(event as never);
      }
    }
    logStep(16, 'Eventos de comportamiento registrados', {
      total: behaviorEvents.length,
      types: behaviorEvents.map((event) => event.eventType),
    });
    expect(behaviorEvents.length).toBeGreaterThanOrEqual(3);
    expect(behaviorEvents.every((event) => event.userId === seeker.id)).toBe(true);

    logStep(17, 'Agregando insights de comportamiento (worker)');
    const { usersProcessed } = await analyticsService.aggregateAllUsers();
    expect(usersProcessed).toBe(1);

    logStep(18, 'Consultando insights materializados');
    const insights = await analyticsService.getUserInsights(seeker.id);
    logStep(19, 'Insights del usuario', insights);
    expect(insights.materialized).toBe(true);
    expect(insights.preferredOperationType).toBe('buy');
    expect(insights.topCities).toContain('monterrey');
    expect(insights.searchCount).toBe(1);
    expect(Number(insights.saveCount)).toBeGreaterThanOrEqual(1);

    logStep(20, 'Flujo validado exitosamente');
  });
});
