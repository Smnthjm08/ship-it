import prisma from "@workspace/db";


export async function updateDeploymentStaus({
  deploymentId,
  status,
}: {
  deploymentId: string;
  status: "queued" | "building" | "failed" | "completed";
}): Promise<any> {
try {
    const  deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
    });

    if (!deployment) {
        throw new Error(`Deployment with id ${deploymentId} not found`);
    }

    const updatedDeployment = await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status },
        include: { project: true },
    });

    console.log(`Deployment updated:`, updatedDeployment);

    return updatedDeployment;
} catch (error) {
    console.error(`Error updating deployment status:`, error);
    throw error;
}
}
