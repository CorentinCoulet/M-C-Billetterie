-- Complete Prisma Schema in SQL-- Complete Prisma Schema in SQL

-- Apply this directly to PostgreSQL-- Apply this directly to PostgreSQL



-- Drop and recreate all enums and tables-- Drop and recreate all enums and tables

DROP SCHEMA IF EXISTS public CASCADE;DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;CREATE SCHEMA public;



-- Enums-- Enums

CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending_payment', 'paid', 'cancelled');CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending_payment', 'paid', 'cancelled');

CREATE TYPE "TicketStatus" AS ENUM ('pending', 'paid', 'cancelled', 'used');CREATE TYPE "TicketStatus" AS ENUM ('pending', 'paid', 'cancelled', 'used');

CREATE TYPE "Role" AS ENUM ('USER', 'ORGANIZER', 'ADMIN');CREATE TYPE "Role" AS ENUM ('USER', 'ORGANIZER', 'ADMIN');



-- User table-- User table

CREATE TABLE "User" (CREATE TABLE "User" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "email" TEXT NOT NULL,    "email" TEXT NOT NULL,

    "name" TEXT,    "name" TEXT,

    "password" TEXT NOT NULL,    "password" TEXT NOT NULL,

    "isVerified" BOOLEAN NOT NULL DEFAULT false,    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    "emailVerifiedAt" TIMESTAMP(3),    "emailVerifiedAt" TIMESTAMP(3),

    "lastLogin" TIMESTAMP(3),    "lastLogin" TIMESTAMP(3),

    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "role" "Role" NOT NULL DEFAULT 'USER',    "role" "Role" NOT NULL DEFAULT 'USER',

    "metadata" JSONB,    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")    CONSTRAINT "User_pkey" PRIMARY KEY ("id")

););



-- Organizer table-- Organizer table

CREATE TABLE "Organizer" (CREATE TABLE "Organizer" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,    "name" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")

););



-- Category table-- Category table

CREATE TABLE "Category" (CREATE TABLE "Category" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")

););



-- Venue table-- Venue table

CREATE TABLE "Venue" (CREATE TABLE "Venue" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,    "name" TEXT NOT NULL,

    "address" TEXT NOT NULL,    "address" TEXT NOT NULL,

    "capacity" INTEGER NOT NULL,    "capacity" INTEGER NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")

););



-- Theme table-- Theme table

CREATE TABLE "Theme" (CREATE TABLE "Theme" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,    "name" TEXT NOT NULL,

    "description" TEXT,    "description" TEXT,

    "imagePath" TEXT NOT NULL,    "imagePath" TEXT NOT NULL,

    "color" TEXT,    "color" TEXT,

    "metadata" JSONB,    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")

););



-- Event table-- Event table

CREATE TABLE "Event" (CREATE TABLE "Event" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "title" TEXT NOT NULL,    "title" TEXT NOT NULL,

    "description" TEXT,    "description" TEXT,

    "date" TIMESTAMP(3) NOT NULL,    "date" TIMESTAMP(3) NOT NULL,

    "location" TEXT NOT NULL,    "location" TEXT NOT NULL,

    "maxCapacity" INTEGER,    "maxCapacity" INTEGER,

    "isPublished" BOOLEAN NOT NULL DEFAULT false,    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    "isCancelled" BOOLEAN NOT NULL DEFAULT false,    "isCancelled" BOOLEAN NOT NULL DEFAULT false,

    "allowAnonymousPurchase" BOOLEAN NOT NULL DEFAULT false,    "allowAnonymousPurchase" BOOLEAN NOT NULL DEFAULT false,

    "allowTransfer" BOOLEAN NOT NULL DEFAULT false,    "allowTransfer" BOOLEAN NOT NULL DEFAULT false,

    "categoryId" TEXT,    "categoryId" TEXT,

    "venueId" TEXT,    "venueId" TEXT,

    "organizerId" TEXT NOT NULL,    "organizerId" TEXT NOT NULL,

    "themeId" TEXT,    "themeId" TEXT,

    "metadata" JSONB,    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")

););



-- Order table-- Order table

CREATE TABLE "Order" (CREATE TABLE "Order" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "userId" TEXT NOT NULL,    "userId" TEXT NOT NULL,

    "totalPrice" DOUBLE PRECISION NOT NULL,    "totalPrice" DOUBLE PRECISION NOT NULL,

    "status" "OrderStatus" NOT NULL,    "status" "OrderStatus" NOT NULL,

    "promoCode" TEXT,    "promoCode" TEXT,

    "discountAmount" DOUBLE PRECISION,    "discountAmount" DOUBLE PRECISION,

    "currency" TEXT NOT NULL DEFAULT 'EUR',    "currency" TEXT NOT NULL DEFAULT 'EUR',

    "metadata" JSONB,    "metadata" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")

););



-- Ticket table-- Ticket table

CREATE TABLE "Ticket" (CREATE TABLE "Ticket" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "userId" TEXT,    "userId" TEXT,

    "eventId" TEXT NOT NULL,    "eventId" TEXT NOT NULL,

    "orderId" TEXT,    "orderId" TEXT,

    "code" TEXT NOT NULL,    "code" TEXT NOT NULL,

    "status" "TicketStatus" NOT NULL DEFAULT 'paid',    "status" "TicketStatus" NOT NULL DEFAULT 'paid',

    "seatNumber" TEXT,    "seatNumber" TEXT,

    "currentQRCode" TEXT,    "currentQRCode" TEXT,

    "qrCodeGeneratedAt" TIMESTAMP(3),    "qrCodeGeneratedAt" TIMESTAMP(3),

    "qrRotationInterval" INTEGER NOT NULL DEFAULT 12,    "qrRotationInterval" INTEGER NOT NULL DEFAULT 12,

    "isScanned" BOOLEAN NOT NULL DEFAULT false,    "isScanned" BOOLEAN NOT NULL DEFAULT false,

    "scannedAt" TIMESTAMP(3),    "scannedAt" TIMESTAMP(3),

    "usedAt" TIMESTAMP(3),    "usedAt" TIMESTAMP(3),

    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "metadata" JSONB,    "metadata" JSONB,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")

););



-- Payment table-- Payment table

CREATE TABLE "Payment" (CREATE TABLE "Payment" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "orderId" TEXT NOT NULL,    "orderId" TEXT NOT NULL,

    "paymentMethod" TEXT NOT NULL,    "paymentMethod" TEXT NOT NULL,

    "paymentStatus" TEXT NOT NULL,    "paymentStatus" TEXT NOT NULL,

    "paymentDate" TIMESTAMP(3) NOT NULL,    "paymentDate" TIMESTAMP(3) NOT NULL,

    "transactionId" TEXT NOT NULL,    "transactionId" TEXT NOT NULL,

    "currency" TEXT NOT NULL DEFAULT 'EUR',    "currency" TEXT NOT NULL DEFAULT 'EUR',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")

););



-- UserSession table-- UserSession table

CREATE TABLE "UserSession" (CREATE TABLE "UserSession" (

    "id" TEXT NOT NULL,    "id" TEXT NOT NULL,

    "userId" TEXT NOT NULL,    "userId" TEXT NOT NULL,

    "token" TEXT NOT NULL,    "token" TEXT NOT NULL,

    "ipAddress" TEXT NOT NULL,    "ipAddress" TEXT NOT NULL,

    "userAgent" TEXT,    "userAgent" TEXT,

    "deviceInfo" TEXT,    "deviceInfo" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "expiresAt" TIMESTAMP(3) NOT NULL,    "expiresAt" TIMESTAMP(3) NOT NULL,

    "isActive" BOOLEAN NOT NULL DEFAULT true,    "isActive" BOOLEAN NOT NULL DEFAULT true,

    "destroyedAt" TIMESTAMP(3),    "destroyedAt" TIMESTAMP(3),

    "destroyReason" TEXT,    "destroyReason" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")

););



-- Create unique constraints-- Create unique constraints

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");



-- Foreign key constraints-- Foreign key constraints

ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE "Event" ADD CONSTRAINT "Event_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;



ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;



ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Success message-- Success message

SELECT 'Complete schema applied successfully!' as result;SELECT 'Complete schema applied successfully!' as result;