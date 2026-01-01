import { redisQueue } from "@workspace/shared/redis/queue";
import { redisPub } from "@workspace/shared/redis/publisher";
import path from "path";
import dotenv from "dotenv";
import simpleGit from "simple-git";
import fs from "fs";
import { updateDeploymentStaus } from "./db-interactions";
import Docker from "dockerode";
import { PassThrough } from "stream";
import { error } from "console";
import { uploadToS3 } from "./s3-upload";
import { getAllFiles } from "./file-utils";
import mime from "mime-types";
import { Account } from "./types";

dotenv.config({ path: "../../.env" });

async function startWorker() {
  while (true) {
    console.log("1. starting shipyard...");

    const job = await redisQueue.brPop("deployment-id", 0);

    if (!job) continue;

    console.log("2. job from redis queue", job);
    const deploymentId = job.element;

    const updatedDeployment = await updateDeploymentStaus({
      deploymentId,
      status: "building",
    });

    await redisPub.publish(`logs-${deploymentId}`, "Deployment Started...");

    const githubAccount = updatedDeployment.project.user.accounts.find(
      (acc: Account) => acc.providerId === "github",
    );

    if (!githubAccount?.accessToken) {
      throw new Error("No GitHub OAuth access token found for this user.");
    }

    const githubToken = githubAccount.accessToken;

    const appRoot = path.join(__dirname, "..");
    const repoRoot = path.join(appRoot, "repositories");
    const cloneDir = path.join(repoRoot, deploymentId);

    if (!fs.existsSync(repoRoot)) {
      fs.mkdirSync(repoRoot, { recursive: true });
    }

    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }

    let repoUrl = updatedDeployment.project.repoUrl;

    if (!repoUrl.endsWith(".git")) {
      repoUrl += ".git";
    }

    const authedUrl = repoUrl.replace("https://", `https://${githubToken}@`);

    console.log("Cloning:", repoUrl);

    // await redisPub.publish(`logs-${deploymentId}`, `Cloning Started...`);

    await redisPub.publish(`logs-${deploymentId}`, "Cloning repository...");

    const git = simpleGit();

    git.outputHandler((command, stdout, stderr) => {
      stderr.on("data", (data) => {
        const log = data.toString();

        console.log(`[Git]: ${log}`);
        redisPub.publish(`logs-${deploymentId}`, log);
      });
    });

    await git.clone(authedUrl, cloneDir);

    await redisPub.publish(`logs-${deploymentId}`, "Cloning repository...");

    console.log("Cloned into:", cloneDir);

    await redisPub.publish(
      `logs-${deploymentId}`,
      "Repository cloned successfully!",
    );

    const dockerConfig = {
      socketPath: process.env.HOME + "/.docker/desktop/docker.sock",
    };

    const docker = new Docker(dockerConfig);

    // console.log("docker", docker);

    await redisPub.publish(`logs-${deploymentId}`, "docker started!");

    try {
      await docker.ping();
      console.log("Docker connection established!");

      const absolutePath = path.resolve(cloneDir);
      console.log(`Mounting ${absolutePath} to /app`);

      const buildStream = new PassThrough();

      buildStream.on("data", (chunk) => {
        const log = chunk.toString();
        redisPub.publish(`logs-${deploymentId}`, log);
      });

      console.log("Starting Build...");

      // 3. RUN: Create + Start + Attach + Wait
      // docker run --rm -v /path:/app node:22-alpine sh -c "npm install && npm run build"

      // const runResult = await docker.run(
      //   "node:22-alpine",
      //   ["/bin/sh", "-c", "npm install && npm run build"],
      //   buildStream, // <--- Output goes here
      //   // bas
      //   {
      //     HostConfig: {
      //       Binds: [`${absolutePath}:/app`], // Volume Mount
      //       AutoRemove: true,                 // Delete container when finished
      //     },
      //     WorkingDir: "/app",
      //     // Base
      //   }
      // );

      // docker.

      // install dependencies and build
      const runResult = await docker.run(
        "node:22",
        // pull
        ["/bin/sh", "-c", "npm install && npm run build"],
        buildStream,
        {
          HostConfig: {
            Binds: [`${absolutePath}:/app`],
            // pull: false,
            // AutoRemove: true,
          },
          WorkingDir: "/app",
          // pull: false
        },
      );

      const streamData = runResult[0];
      const statusCode = streamData.StatusCode;

      if (statusCode === 0) {
        console.log(`Build finished successfully!`);
        await redisPub.publish(`logs-${deploymentId}`, "Build Complete!");

        if (statusCode === 0) {
          console.log(`Build Success!`);
          await redisPub.publish(
            `logs-${deploymentId}`,
            "Build Complete! Starting Upload...",
          );

          // find the dist folder
          const distFolder = path.join(cloneDir, "dist");

          const allFiles = getAllFiles(distFolder);

          for (const file of allFiles) {
            // file = /Users/me/repo/dist/assets/script.js
            // relativePath = assets/script.js
            const relativePath = file
              .slice(distFolder.length + 1)
              .replace(/\\/g, "/");

            // s3Key = 123xyz/assets/script.js
            const s3Key = `${deploymentId}/${relativePath}`;

            const contentType = mime.lookup(file) || "application/octet-stream";
            const fileBuffer = fs.readFileSync(file);

            await uploadToS3(s3Key, fileBuffer, contentType);

            await redisPub.publish(
              `logs-${deploymentId}`,
              `Uploaded: ${relativePath}`,
            );
          }

          console.log("Deployment Complete");
          await redisPub.publish(
            `logs-${deploymentId}`,
            "Deployment Successful!",
          );

          console.log("Cleaning up local artifact...");
          fs.rmSync(cloneDir, { recursive: true, force: true });
          console.log("Cleanup finished.");

          await updateDeploymentStaus({
            deploymentId,
            status: "completed",
          });
        } else {
          console.error(`Build failed with code ${statusCode}`);
          await redisPub.publish(
            `logs-${deploymentId}`,
            `Build Failed (Exit Code: ${statusCode})`,
          );
          await updateDeploymentStaus({ deploymentId, status: "failed" });
        }
      } else {
        console.error(`Build failed with code ${statusCode}`, error);
        await redisPub.publish(
          `logs-${deploymentId}`,
          `Build Failed (Exit Code: ${statusCode})`,
        );
      }
    } catch (error) {
      console.error("Docker Error:", error);
      await redisPub.publish(`logs-${deploymentId}`, "Build failed to start.");
    }
  }
}

startWorker();
