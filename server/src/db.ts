import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

void prisma
  .$connect()
  .then(() => prisma.$executeRawUnsafe("SET client_encoding TO 'UTF8'"))
  .catch(() => undefined);
