import {redisQueue} from "@workspace/shared/redis/queue"
import {redisPub} from "@workspace/shared/redis/publisher"
import path from "path";
import { updateDeploymentStaus } from "./db-interactions";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function startWorker() {
  while (true) {
    console.log("starting shipyard...");

    const job = await redisQueue.brPop("deployment-id", 0);

    if (job) {
    console.log("job from redis queue", job);

    const deploymentId = job?.element;

    const dependencies = await updateDeploymentStaus({ deploymentId, status: "building" });

      console.log("deployment", dependencies);
      console.log("publishing log message...", path.dirname(__dirname));

      await redisPub.publish(`logs-${deploymentId}`, "Deployment Started...");

      // clone the repo
      // install dependencies
      // build
      // upload build
      // finish
    }

    return;
  }
}

startWorker();
