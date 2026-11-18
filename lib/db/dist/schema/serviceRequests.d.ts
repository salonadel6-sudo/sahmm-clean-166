import { z } from "zod/v4";
export declare const serviceRequestsTable: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "service_requests";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "service_requests";
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
        clientName: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "client_name";
            tableName: "service_requests";
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
        phone: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "phone";
            tableName: "service_requests";
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
            tableName: "service_requests";
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
        serviceType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "service_type";
            tableName: "service_requests";
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
        containerSize: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "container_size";
            tableName: "service_requests";
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
        packageSize: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "package_size";
            tableName: "service_requests";
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
        propertyType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "property_type";
            tableName: "service_requests";
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
        areaSize: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "area_size";
            tableName: "service_requests";
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
        location: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "location";
            tableName: "service_requests";
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
        duration: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "duration";
            tableName: "service_requests";
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
        notes: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "notes";
            tableName: "service_requests";
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
        appointmentType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "appointment_type";
            tableName: "service_requests";
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
        scheduledAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "scheduled_at";
            tableName: "service_requests";
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
        status: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "status";
            tableName: "service_requests";
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
        adminNotes: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "admin_notes";
            tableName: "service_requests";
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
        customerRecordId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "customer_record_id";
            tableName: "service_requests";
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
        packageRecordId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "package_record_id";
            tableName: "service_requests";
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
        contractRecordId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "contract_record_id";
            tableName: "service_requests";
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
        assignedDriverId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "assigned_driver_id";
            tableName: "service_requests";
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
        assignedVehicleId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "assigned_vehicle_id";
            tableName: "service_requests";
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
        assignedVehiclePlate: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "assigned_vehicle_plate";
            tableName: "service_requests";
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
        driverStatus: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_status";
            tableName: "service_requests";
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
        driverResponseAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_response_at";
            tableName: "service_requests";
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
        driverStartedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_started_at";
            tableName: "service_requests";
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
        driverCompletedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_completed_at";
            tableName: "service_requests";
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
        driverNotes: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_notes";
            tableName: "service_requests";
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
        driverLocationLat: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_location_lat";
            tableName: "service_requests";
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
        driverLocationLng: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_location_lng";
            tableName: "service_requests";
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
        driverProofPhotoUrl: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_proof_photo_url";
            tableName: "service_requests";
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
        driverSignatureData: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_signature_data";
            tableName: "service_requests";
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
        driverReceiverName: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "driver_receiver_name";
            tableName: "service_requests";
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
        assignedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "assigned_at";
            tableName: "service_requests";
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
        sessionId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "session_id";
            tableName: "service_requests";
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
        acquisitionSource: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "acquisition_source";
            tableName: "service_requests";
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
        attributionReferrer: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_referrer";
            tableName: "service_requests";
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
        attributionLandingPage: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_landing_page";
            tableName: "service_requests";
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
        attributionUtmSource: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_utm_source";
            tableName: "service_requests";
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
        attributionUtmMedium: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_utm_medium";
            tableName: "service_requests";
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
        attributionUtmCampaign: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_utm_campaign";
            tableName: "service_requests";
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
        attributionGclid: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attribution_gclid";
            tableName: "service_requests";
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
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "service_requests";
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
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "service_requests";
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
export declare const insertServiceRequestSchema: z.ZodObject<{
    duration: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clientName: z.ZodString;
    phone: z.ZodString;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    serviceType: z.ZodString;
    containerSize: z.ZodOptional<z.ZodString>;
    packageSize: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    propertyType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    areaSize: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodString;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    appointmentType: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerRecordId: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    packageRecordId: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    contractRecordId: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    assignedDriverId: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    assignedVehicleId: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    assignedVehiclePlate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverStatus: z.ZodOptional<z.ZodString>;
    driverResponseAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverStartedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverCompletedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverLocationLat: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverLocationLng: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverProofPhotoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverSignatureData: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    driverReceiverName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sessionId: z.ZodOptional<z.ZodString>;
    acquisitionSource: z.ZodOptional<z.ZodString>;
    attributionReferrer: z.ZodOptional<z.ZodString>;
    attributionLandingPage: z.ZodOptional<z.ZodString>;
    attributionUtmSource: z.ZodOptional<z.ZodString>;
    attributionUtmMedium: z.ZodOptional<z.ZodString>;
    attributionUtmCampaign: z.ZodOptional<z.ZodString>;
    attributionGclid: z.ZodOptional<z.ZodString>;
}, {
    out: {};
    in: {};
}>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;
//# sourceMappingURL=serviceRequests.d.ts.map