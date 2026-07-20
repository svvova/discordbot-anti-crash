-- AlterTable
ALTER TABLE "ServerSettings" ADD COLUMN "protectedRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
