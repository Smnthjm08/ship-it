/*
  Warnings:

  - The `framework` column on the `project` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Framework" AS ENUM ('NEXTJS', 'REACT', 'VITE', 'NODE', 'NONE');

-- AlterTable
ALTER TABLE "project" DROP COLUMN "framework",
ADD COLUMN     "framework" "Framework" DEFAULT 'NONE',
ALTER COLUMN "installCommand" SET DEFAULT 'npm run install';
