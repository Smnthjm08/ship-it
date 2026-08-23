-- AlterEnum
ALTER TYPE "DeploymentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "deployment" ADD COLUMN     "branchSlug" TEXT;

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "activeDeploymentId" TEXT;

-- CreateIndex
CREATE INDEX "deployment_projectId_createdAt_idx" ON "deployment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "deployment_projectId_branchSlug_createdAt_idx" ON "deployment"("projectId", "branchSlug", "createdAt");

-- CreateIndex
CREATE INDEX "deployment_log_deploymentId_timestamp_idx" ON "deployment_log"("deploymentId", "timestamp");

-- CreateIndex
CREATE INDEX "project_userId_createdAt_idx" ON "project"("userId", "createdAt");
