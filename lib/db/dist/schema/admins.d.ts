import { z } from "zod/v4";
export declare const ADMIN_ROLES: readonly ["admin", "manager", "customer_service", "requests_officer", "driver"];
export type AdminRole = typeof ADMIN_ROLES[number];
export declare const ALL_SECTIONS: readonly ["dashboard", "analytics", "requests", "conversations", "whatsapp", "notifications", "blog", "slides", "ads", "testimonials", "reviews", "services", "packages", "containers", "partners", "settings", "seo", "seo_pages", "employees", "database", "work_orders", "container_system", "container_system_customer", "container_system_container", "container_system_container_type", "container_system_container_asset", "container_system_driver", "container_system_ledger_entry", "container_system_contract", "container_system_contract_line", "container_system_container_movement", "container_system_receipt", "container_system_payment", "container_system_expense", "container_system_deposit", "container_system_bank_deposit", "container_system_treasury", "container_system_transfer", "container_system_maintenance", "container_system_alert", "container_system_permit", "container_system_appointment", "container_system_reports", "container_system_vehicle", "container_system_warehouse", "container_system_category", "container_system_category_size", "container_system_salary_advance", "container_system_salary_payment", "container_system_fuel_expense", "container_system_daily_expense", "container_system_invoice", "container_system_invoice_return", "container_system_tax", "container_system_commission", "container_system_oil_change", "container_system_salary", "container_system_branch", "container_system_employee", "container_system_settings", "container_system_audit"];
export type AdminSection = typeof ALL_SECTIONS[number];
export declare const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminSection[]>;
export declare const ROLE_LABELS: Record<AdminRole, string>;
export declare function resolvePermissions(role: string, customPermissions: string | null): AdminSection[];
export declare const adminsTable: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "admins";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "admins";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        username: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "username";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        passwordHash: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "password_hash";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        name: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "name";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        email: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "email";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "role";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        permissions: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "permissions";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        isActive: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "is_active";
            tableName: "admins";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdBy: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_by";
            tableName: "admins";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "admins";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const insertAdminSchema: z.ZodObject<{
    name: z.ZodString;
    isActive: z.ZodOptional<z.ZodInt>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodString;
    passwordHash: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, {
    out: {};
    in: {};
}>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof adminsTable.$inferSelect;
//# sourceMappingURL=admins.d.ts.map