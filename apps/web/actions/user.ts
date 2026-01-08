// "use server";

// import { prisma } from "@repo/db";

// export async function getUsers() {
//   try {
//     const users = await prisma.user.findMany();

//     if (!users.length) {
//       return { ok: false, error: "No users found" };
//     }

//     return { ok: true, data: users };
//   } catch {
//     return { ok: false, error: "Internal server error" };
//   }
// }
