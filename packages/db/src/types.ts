import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { usersTable } from "./schemas/auth-schema";

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

// export type Post = InferSelectModel<typeof posts>;
// export type NewPost = InferInsertModel<typeof posts>;
