# 🎫 Billetterie Platform

**Modern ticketing platform built with Next.js 15, TypeScript, Prisma and PostgreSQL**

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Prisma](https://img.shields.io/badge/Prisma-6.10.1-2D3748)

## 📚 Complete Documentation

> **📖 All technical documentation is now organized in the [`/docs`](./docs/) folder**

| Document | Description |
|----------|-------------|
| [**📋 Overview**](./docs/README.md) | Main guide and documentation index |
| [**🔐 QR System**](./docs/QR_SYSTEM.md) | Secure QR code system with rotation |
| [**📧 Email System**](./docs/EMAIL_SYSTEM.md) | Email templates and SMTP service |
| [**🛡️ Security**](./docs/SECURITY.md) | Complete security guide |
| [**📝 Changelog**](./docs/CHANGELOG.md) | Version history and changes |
| [**🤝 Contributing**](./docs/CONTRIBUTING.md) | Contributor guide |

## ⚡ Quick Start

> **⚠️ IMPORTANT: This project uses YARN exclusively!**  
> Do not use `npm` - it can cause dependency conflicts.

```bash
# Clone and install
git clone <repo>
cd billetterie
yarn install

# Configuration
cp .env.example .env
# Edit .env with your settings

# Database
yarn db:migrate
yarn db:generate

# Start development
yarn dev
```

## 📦 Package Manager

**YARN ONLY** - This project is optimized for yarn and may have issues with npm.

```bash
# ✅ Recommended commands
yarn install      # Install dependencies
yarn dev         # Development server
yarn build       # Production build
yarn add <pkg>   # Add dependency

# ❌ DO NOT use
npm install      # ❌ Can cause conflicts - DO NOT USE
npm run <cmd>    # ❌ Use yarn <cmd> instead
```

## ✨ Main Features

### 🔐 **Authentication & Security**
- **Secure JWT** with HTTPOnly sessions
- **Rate limiting** anti-bruteforce protection
- **CSRF/XSS protection** built-in
- **WAF** (Web Application Firewall)

### 🎫 **Ticketing System**
- **Secure QR codes** with automatic 12h rotation
- **Real-time validation** at event entrances
- **Automated emails** with professional templates
- **Stripe payments** integrated

### 📧 **Email System**
- **7 Handlebars templates** responsive
- **Professional design** mobile/desktop
- **Dynamic variables** and formatting helpers
- **Performance cache** for templates

### 🏗️ **Infrastructure**
- **Next.js 15** with App Router
- **PostgreSQL** + Prisma ORM
- **Docker** multi-environment
- **Monitoring** Prometheus + Grafana

## 🧪 Tests and Development

```bash
# System tests
yarn test:qr             # Test QR codes
yarn email:info          # Email system info

# Development tests  
yarn test                # Unit tests
yarn type-check          # TypeScript verification

# Test API (dev only)
curl http://localhost:3000/api/test/emails
```

## 🔧 Available Scripts

#### **Users**
```
GET    /api/users              # User list (admin)
GET    /api/users/:id          # User details
PUT    /api/users/:id          # Modify user
DELETE /api/users/:id          # Delete user
```

### **Health Check**
```
GET    /health                 # API status
```

## 🛠️ Technologies

### **Backend Core**
- **Express.js** - Fast web framework
- **TypeScript** - Static typing
- **Prisma** - Modern and type-safe ORM
- **PostgreSQL** - Relational database
- **Zod** - Schema validation

### **Authentication & Security**
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **cookie-parser** - Cookie management
- **CORS** - Cross-origin management

### **External Services**
- **Stripe** - Secure payments
- **Nodemailer** - Email sending
- **QRCode** - QR code generation
- **Multer** - File upload

### **Infrastructure**
- **Docker** - Containerization
- **Docker Compose** - Orchestration

## 🏗️ Architecture

```
src/
├── modules/                   # Business modules
│   ├── auth/                  # Authentication
│   ├── user/                  # User management
│   ├── event/                 # Event management
│   ├── ticket/                # Ticketing system
│   ├── order/                 # Order management
│   └── payment/               # Payment system
| Script | Description |
|--------|-------------|
| `yarn dev` | Development startup |
| `yarn build` | Production build |
| `yarn test` | Unit tests |
| `yarn test:qr` | QR code system tests |
| `yarn email:info` | Email system information |
| `yarn db:migrate` | Database migrations |
| `docker-compose up -d` | Standard mode (3 containers) |
| `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d` | Development mode |
| `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | Production mode |
| `docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d` | Complete monitoring mode |

## 🏗️ Technical Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   ├── events/               # Event pages  
│   └── tickets/              # Ticket pages
├── services/                 # Business services
│   ├── emailService.ts       # Handlebars email service
│   ├── ticketQRService.ts    # QR code service
│   └── qrRotationService.ts  # Automatic QR rotation
├── templates/emails/         # Handlebars templates
├── types/                    # TypeScript types
├── config/                   # Configuration
└── lib/                      # Utilities
```

## 🛡️ Security and Monitoring

- ✅ **WAF** with Nginx and ModSecurity
- ✅ **Rate limiting** by IP and user  
- ✅ **Rotating QR codes** every 12h
- ✅ **AES-256 encryption** for sensitive data
- ✅ **Monitoring** Prometheus + Grafana
- ✅ **Audit logs** for all critical actions
- ✅ **Automated backup** PostgreSQL

## 🚀 Deployment

### 🐳 Docker Environments

#### **Development Mode** (3 containers)
```bash
# Start with hot reload and debug
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Real-time logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f web

# Stop
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

#### **Production Mode** (6-8 containers)
```bash
# Start with SSL, monitoring and security
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With automatic SSL certificates
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile ssl up -d

# With automated backup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup up -d

# Stop
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

#### **Complete Monitoring Mode** (9 containers)
```bash
# Start with extended monitoring (Prometheus, Grafana, Exporters)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access monitoring services
# - Grafana: http://localhost:3001
# - Prometheus: http://localhost:9090
# - AlertManager: http://localhost:9093

# Stop
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml down
```

#### **Standard Mode** (3 containers - basic configuration)
```bash
# Simple startup for testing
docker-compose up -d

# Stop
docker-compose down
```

### Critical Environment Variables
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_...
EMAIL_HOST=smtp.gmail.com
QR_ROTATION_SECRET=...
```

## ✨ Current Status

### ✅ **Operational Systems (v1.2.0)**
- **Secure JWT authentication** with sessions
- **Rotating QR codes** with real-time validation
- **Automated emails** with 7 professional templates
- **Integrated Stripe payments** secure
- **Multi-environment Docker infrastructure**
- **Monitoring & alerts** Prometheus + Grafana
- **WAF and security** production-ready

### 🎯 **Roadmap**
- 📱 **Mobile app** React Native (Q3 2025)
- 🔔 **Push notifications** real-time (Q3 2025)  
- 🌍 **Multi-language** i18n (Q4 2025)
- 🤖 **AI recommendations** events (2026)

## 🎊 Production-Ready Platform!

This platform is **complete** and **operational** for immediate deployment:

- ✅ **Security**: WAF, rate limiting, encryption, audits
- ✅ **Performance**: Cache, optimizations, monitoring
- ✅ **Scalability**: Microservices ready architecture
- ✅ **Maintenance**: Structured logs, automated backups
- ✅ **Documentation**: Complete and up-to-date in `/docs`

## 📞 Support

- **📚 Documentation**: [`/docs`](./docs/) for technical guides
- **🐛 Issues**: GitHub Issues for bugs and features  
- **💬 Questions**: GitHub Discussions for help
- **🔐 Security**: `security@billetterie.com` for vulnerabilities

---

**🚀 Developed with ❤️ - Modern and secure ticketing platform**
