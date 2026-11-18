import Database from "better-sqlite3";
import * as schema from "./schema";
declare const sqlite: Database.Database;
export declare const db: import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof schema> & {
    $client: Database.Database;
};
export { sqlite };
export * from "./schema";
export * from "./financial-core";
//# sourceMappingURL=index.d.ts.map