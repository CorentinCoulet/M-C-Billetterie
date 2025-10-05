import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger/OpenAPI Documentation Configuration
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Billetterie API',
      version: '1.0.0',
      description: 'API complète pour la gestion de billetterie événementielle',
      contact: {
        name: 'Support API',
        email: 'support@billetterie.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.billetterie.com',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT pour l\'authentification'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Clé API pour l\'authentification'
        }
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'ORGANIZER'] },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          }
        },
        
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', minLength: 2 },
            lastName: { type: 'string', minLength: 2 }
          }
        },
        
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' }
          }
        },

        // Event schemas
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            location: { type: 'string' },
            maxAttendees: { type: 'integer', minimum: 1 },
            price: { type: 'number', minimum: 0 },
            currency: { type: 'string', default: 'EUR' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] },
            organizerId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        CreateEventRequest: {
          type: 'object',
          required: ['title', 'description', 'date', 'location', 'maxAttendees', 'price'],
          properties: {
            title: { type: 'string', minLength: 3 },
            description: { type: 'string', minLength: 10 },
            date: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            location: { type: 'string', minLength: 3 },
            maxAttendees: { type: 'integer', minimum: 1 },
            price: { type: 'number', minimum: 0 },
            currency: { type: 'string', default: 'EUR' }
          }
        },

        // Ticket schemas
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            eventId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            qrCode: { type: 'string' },
            status: { type: 'string', enum: ['VALID', 'USED', 'CANCELLED'] },
            purchasedAt: { type: 'string', format: 'date-time' },
            usedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },

        // Order schemas
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            eventId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1 },
            totalPrice: { type: 'number', minimum: 0 },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'] },
            paymentIntentId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        CreateOrderRequest: {
          type: 'object',
          required: ['eventId', 'quantity'],
          properties: {
            eventId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, maximum: 10 }
          }
        },

        // Error schemas
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
            path: { type: 'string' }
          }
        },

        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation Error' },
            message: { type: 'string' },
            statusCode: { type: 'integer', example: 400 },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          }
        },

        // Pagination schemas
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer', minimum: 0 },
            totalPages: { type: 'integer', minimum: 0 },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        },

        EventsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Event' }
            },
            meta: { $ref: '#/components/schemas/PaginationMeta' }
          }
        },

        // Health check schema
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
                memory: { type: 'boolean' },
                disk: { type: 'boolean' }
              }
            }
          }
        },

        // Metrics schema
        Metrics: {
          type: 'object',
          properties: {
            requests: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                successful: { type: 'integer' },
                failed: { type: 'integer' },
                avgResponseTime: { type: 'number' }
              }
            },
            database: {
              type: 'object',
              properties: {
                connections: { type: 'integer' },
                avgQueryTime: { type: 'number' },
                slowQueries: { type: 'integer' }
              }
            },
            cache: {
              type: 'object',
              properties: {
                hits: { type: 'integer' },
                misses: { type: 'integer' },
                hitRate: { type: 'number' }
              }
            },
            business: {
              type: 'object',
              properties: {
                totalUsers: { type: 'integer' },
                activeUsers: { type: 'integer' },
                totalEvents: { type: 'integer' },
                totalTickets: { type: 'integer' },
                revenue: { type: 'number' }
              }
            }
          }
        }
      },

      responses: {
        UnauthorizedError: {
          description: 'Token d\'authentification manquant ou invalide',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ForbiddenError: {
          description: 'Permissions insuffisantes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Ressource non trouvée',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Erreur de validation des données',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' }
            }
          }
        },
        InternalServerError: {
          description: 'Erreur interne du serveur',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './src/modules/**/*.express.routes.ts',
    './src/middlewares/*.ts',
    './src/lib/*.ts'
  ]
};

// Generate OpenAPI specification
const specs = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation
 */
export const setupSwagger = (app: Express) => {
  // Swagger UI options
  const swaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info hgroup.main h2 { color: #3b82f6 }
    `,
    customSiteTitle: 'Billetterie API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  };

  // Serve swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

/**
 * Common Swagger annotations for route documentation
 */

// Auth route examples:
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription utilisateur
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

// Events route examples:
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Liste des événements
 *     tags: [Events]
 *     security: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CANCELLED, COMPLETED]
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventsResponse'
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Créer un événement
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Événement créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

// Health and monitoring routes:
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Vérification de l'état du service
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service en bon état
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service indisponible
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Métriques de performance
 *     tags: [Monitoring]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Métriques système
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Metrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

export { specs };
export default setupSwagger;
