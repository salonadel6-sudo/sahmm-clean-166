import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminUser, AiMessageInput, AuthResult, BotReply, CleaningContractWorkflowInput, CleaningContractWorkflowResult, CleaningOperationsAudit, CleaningOperationsRecord, CleaningOperationsRecordInput, CleaningOperationsRecordUpdate, CleaningOperationsSnapshot, CleaningPackage, CleaningPackageInput, CompanyValue, CompanyValueInput, ContractLedgerResponse, ContractSettlementInput, ContractSettlementResult, Conversation, ConversationInput, ConversationTypingInput, ConversationUpdate, DashboardStats, DriverWorkOrderUpdate, FinancialTruthResponse, GetCleaningOperationsRecordsParams, GetCleaningPackageContractLedgersParams, GetDriverWorkOrdersParams, GetFinancialTruthParams, GetServiceRequestsParams, HealthStatus, HeroSlide, HeroSlideInput, LoginInput, Message, MessageInput, Notification, Partner, PartnerInput, PushPublicKey, PushSubscriptionDeleteInput, PushSubscriptionInput, SeoHtmlInventoryResponse, SeoKeywordTopicMap, SeoPage, SeoPageInput, SeoSiteAuditLatestResponse, SeoSiteAuditReportInput, SeoSiteAuditSaveResponse, Service, ServiceInput, ServiceRequest, ServiceRequestAssignment, ServiceRequestInput, ServiceRequestUpdate, SetConversationTyping200, SuccessResult, Testimonial, TestimonialInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminLoginUrl: () => string;
/**
 * @summary Admin login
 */
export declare const adminLogin: (loginInput: LoginInput, options?: RequestInit) => Promise<AuthResult>;
export declare const getAdminLoginMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export type AdminLoginMutationResult = NonNullable<Awaited<ReturnType<typeof adminLogin>>>;
export type AdminLoginMutationBody = BodyType<LoginInput>;
export type AdminLoginMutationError = ErrorType<void>;
/**
* @summary Admin login
*/
export declare const useAdminLogin: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminLogin>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminLogin>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current admin
 */
export declare const getMe: (options?: RequestInit) => Promise<AdminUser>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<unknown>;
/**
 * @summary Get current admin
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSeoHtmlInventoryUrl: () => string;
/**
 * @summary List generated public HTML routes for a complete SEO audit
 */
export declare const getSeoHtmlInventory: (options?: RequestInit) => Promise<SeoHtmlInventoryResponse>;
export declare const getGetSeoHtmlInventoryQueryKey: () => readonly ["/api/admin/seo-audit/html-inventory"];
export declare const getGetSeoHtmlInventoryQueryOptions: <TData = Awaited<ReturnType<typeof getSeoHtmlInventory>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoHtmlInventory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSeoHtmlInventory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSeoHtmlInventoryQueryResult = NonNullable<Awaited<ReturnType<typeof getSeoHtmlInventory>>>;
export type GetSeoHtmlInventoryQueryError = ErrorType<void>;
/**
 * @summary List generated public HTML routes for a complete SEO audit
 */
export declare function useGetSeoHtmlInventory<TData = Awaited<ReturnType<typeof getSeoHtmlInventory>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoHtmlInventory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLatestSeoAuditReportUrl: () => string;
/**
 * @summary Get the latest saved SEO site audit
 */
export declare const getLatestSeoAuditReport: (options?: RequestInit) => Promise<SeoSiteAuditLatestResponse>;
export declare const getGetLatestSeoAuditReportQueryKey: () => readonly ["/api/admin/seo-audit/latest"];
export declare const getGetLatestSeoAuditReportQueryOptions: <TData = Awaited<ReturnType<typeof getLatestSeoAuditReport>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLatestSeoAuditReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLatestSeoAuditReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLatestSeoAuditReportQueryResult = NonNullable<Awaited<ReturnType<typeof getLatestSeoAuditReport>>>;
export type GetLatestSeoAuditReportQueryError = ErrorType<void>;
/**
 * @summary Get the latest saved SEO site audit
 */
export declare function useGetLatestSeoAuditReport<TData = Awaited<ReturnType<typeof getLatestSeoAuditReport>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLatestSeoAuditReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSaveLatestSeoAuditReportUrl: () => string;
/**
 * @summary Save the latest SEO site audit
 */
export declare const saveLatestSeoAuditReport: (seoSiteAuditReportInput: SeoSiteAuditReportInput, options?: RequestInit) => Promise<SeoSiteAuditSaveResponse>;
export declare const getSaveLatestSeoAuditReportMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLatestSeoAuditReport>>, TError, {
        data: BodyType<SeoSiteAuditReportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveLatestSeoAuditReport>>, TError, {
    data: BodyType<SeoSiteAuditReportInput>;
}, TContext>;
export type SaveLatestSeoAuditReportMutationResult = NonNullable<Awaited<ReturnType<typeof saveLatestSeoAuditReport>>>;
export type SaveLatestSeoAuditReportMutationBody = BodyType<SeoSiteAuditReportInput>;
export type SaveLatestSeoAuditReportMutationError = ErrorType<void>;
/**
* @summary Save the latest SEO site audit
*/
export declare const useSaveLatestSeoAuditReport: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveLatestSeoAuditReport>>, TError, {
        data: BodyType<SeoSiteAuditReportInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveLatestSeoAuditReport>>, TError, {
    data: BodyType<SeoSiteAuditReportInput>;
}, TContext>;
export declare const getGetSeoKeywordMapUrl: () => string;
/**
 * @summary Get the editorial ownership map for the top site keywords
 */
export declare const getSeoKeywordMap: (options?: RequestInit) => Promise<SeoKeywordTopicMap>;
export declare const getGetSeoKeywordMapQueryKey: () => readonly ["/api/admin/ai/keyword-map"];
export declare const getGetSeoKeywordMapQueryOptions: <TData = Awaited<ReturnType<typeof getSeoKeywordMap>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoKeywordMap>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSeoKeywordMap>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSeoKeywordMapQueryResult = NonNullable<Awaited<ReturnType<typeof getSeoKeywordMap>>>;
export type GetSeoKeywordMapQueryError = ErrorType<void>;
/**
 * @summary Get the editorial ownership map for the top site keywords
 */
export declare function useGetSeoKeywordMap<TData = Awaited<ReturnType<typeof getSeoKeywordMap>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoKeywordMap>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSlidesUrl: () => string;
/**
 * @summary List hero slides
 */
export declare const getSlides: (options?: RequestInit) => Promise<HeroSlide[]>;
export declare const getGetSlidesQueryKey: () => readonly ["/api/slides"];
export declare const getGetSlidesQueryOptions: <TData = Awaited<ReturnType<typeof getSlides>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSlides>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSlides>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSlidesQueryResult = NonNullable<Awaited<ReturnType<typeof getSlides>>>;
export type GetSlidesQueryError = ErrorType<unknown>;
/**
 * @summary List hero slides
 */
export declare function useGetSlides<TData = Awaited<ReturnType<typeof getSlides>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSlides>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSlideUrl: () => string;
export declare const createSlide: (heroSlideInput: HeroSlideInput, options?: RequestInit) => Promise<HeroSlide>;
export declare const getCreateSlideMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSlide>>, TError, {
        data: BodyType<HeroSlideInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSlide>>, TError, {
    data: BodyType<HeroSlideInput>;
}, TContext>;
export type CreateSlideMutationResult = NonNullable<Awaited<ReturnType<typeof createSlide>>>;
export type CreateSlideMutationBody = BodyType<HeroSlideInput>;
export type CreateSlideMutationError = ErrorType<unknown>;
export declare const useCreateSlide: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSlide>>, TError, {
        data: BodyType<HeroSlideInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSlide>>, TError, {
    data: BodyType<HeroSlideInput>;
}, TContext>;
export declare const getUpdateSlideUrl: (id: number) => string;
export declare const updateSlide: (id: number, heroSlideInput: HeroSlideInput, options?: RequestInit) => Promise<HeroSlide>;
export declare const getUpdateSlideMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSlide>>, TError, {
        id: number;
        data: BodyType<HeroSlideInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSlide>>, TError, {
    id: number;
    data: BodyType<HeroSlideInput>;
}, TContext>;
export type UpdateSlideMutationResult = NonNullable<Awaited<ReturnType<typeof updateSlide>>>;
export type UpdateSlideMutationBody = BodyType<HeroSlideInput>;
export type UpdateSlideMutationError = ErrorType<unknown>;
export declare const useUpdateSlide: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSlide>>, TError, {
        id: number;
        data: BodyType<HeroSlideInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSlide>>, TError, {
    id: number;
    data: BodyType<HeroSlideInput>;
}, TContext>;
export declare const getDeleteSlideUrl: (id: number) => string;
export declare const deleteSlide: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSlideMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSlide>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSlide>>, TError, {
    id: number;
}, TContext>;
export type DeleteSlideMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSlide>>>;
export type DeleteSlideMutationError = ErrorType<unknown>;
export declare const useDeleteSlide: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSlide>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSlide>>, TError, {
    id: number;
}, TContext>;
export declare const getGetServicesUrl: () => string;
/**
 * @summary List services
 */
export declare const getServices: (options?: RequestInit) => Promise<Service[]>;
export declare const getGetServicesQueryKey: () => readonly ["/api/services"];
export declare const getGetServicesQueryOptions: <TData = Awaited<ReturnType<typeof getServices>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getServices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetServicesQueryResult = NonNullable<Awaited<ReturnType<typeof getServices>>>;
export type GetServicesQueryError = ErrorType<unknown>;
/**
 * @summary List services
 */
export declare function useGetServices<TData = Awaited<ReturnType<typeof getServices>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateServiceUrl: () => string;
export declare const createService: (serviceInput: ServiceInput, options?: RequestInit) => Promise<Service>;
export declare const getCreateServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<ServiceInput>;
}, TContext>;
export type CreateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof createService>>>;
export type CreateServiceMutationBody = BodyType<ServiceInput>;
export type CreateServiceMutationError = ErrorType<unknown>;
export declare const useCreateService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createService>>, TError, {
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createService>>, TError, {
    data: BodyType<ServiceInput>;
}, TContext>;
export declare const getUpdateServiceUrl: (id: number) => string;
export declare const updateService: (id: number, serviceInput: ServiceInput, options?: RequestInit) => Promise<Service>;
export declare const getUpdateServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<ServiceInput>;
}, TContext>;
export type UpdateServiceMutationResult = NonNullable<Awaited<ReturnType<typeof updateService>>>;
export type UpdateServiceMutationBody = BodyType<ServiceInput>;
export type UpdateServiceMutationError = ErrorType<unknown>;
export declare const useUpdateService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateService>>, TError, {
        id: number;
        data: BodyType<ServiceInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateService>>, TError, {
    id: number;
    data: BodyType<ServiceInput>;
}, TContext>;
export declare const getDeleteServiceUrl: (id: number) => string;
export declare const deleteService: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteServiceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
}, TContext>;
export type DeleteServiceMutationResult = NonNullable<Awaited<ReturnType<typeof deleteService>>>;
export type DeleteServiceMutationError = ErrorType<unknown>;
export declare const useDeleteService: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteService>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteService>>, TError, {
    id: number;
}, TContext>;
export declare const getGetPackagesUrl: () => string;
/**
 * @summary List container types
 */
export declare const getPackages: (options?: RequestInit) => Promise<CleaningPackage[]>;
export declare const getGetPackagesQueryKey: () => readonly ["/api/packages"];
export declare const getGetPackagesQueryOptions: <TData = Awaited<ReturnType<typeof getPackages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPackages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPackages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPackagesQueryResult = NonNullable<Awaited<ReturnType<typeof getPackages>>>;
export type GetPackagesQueryError = ErrorType<unknown>;
/**
 * @summary List container types
 */
export declare function useGetPackages<TData = Awaited<ReturnType<typeof getPackages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPackages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePackageUrl: () => string;
export declare const createPackage: (cleaningPackageInput: CleaningPackageInput, options?: RequestInit) => Promise<CleaningPackage>;
export declare const getCreatePackageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPackage>>, TError, {
        data: BodyType<CleaningPackageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPackage>>, TError, {
    data: BodyType<CleaningPackageInput>;
}, TContext>;
export type CreatePackageMutationResult = NonNullable<Awaited<ReturnType<typeof createPackage>>>;
export type CreatePackageMutationBody = BodyType<CleaningPackageInput>;
export type CreatePackageMutationError = ErrorType<unknown>;
export declare const useCreatePackage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPackage>>, TError, {
        data: BodyType<CleaningPackageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPackage>>, TError, {
    data: BodyType<CleaningPackageInput>;
}, TContext>;
export declare const getUpdatePackageUrl: (id: number) => string;
export declare const updatePackage: (id: number, cleaningPackageInput: CleaningPackageInput, options?: RequestInit) => Promise<CleaningPackage>;
export declare const getUpdatePackageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePackage>>, TError, {
        id: number;
        data: BodyType<CleaningPackageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePackage>>, TError, {
    id: number;
    data: BodyType<CleaningPackageInput>;
}, TContext>;
export type UpdatePackageMutationResult = NonNullable<Awaited<ReturnType<typeof updatePackage>>>;
export type UpdatePackageMutationBody = BodyType<CleaningPackageInput>;
export type UpdatePackageMutationError = ErrorType<unknown>;
export declare const useUpdatePackage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePackage>>, TError, {
        id: number;
        data: BodyType<CleaningPackageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePackage>>, TError, {
    id: number;
    data: BodyType<CleaningPackageInput>;
}, TContext>;
export declare const getDeletePackageUrl: (id: number) => string;
export declare const deletePackage: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeletePackageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePackage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePackage>>, TError, {
    id: number;
}, TContext>;
export type DeletePackageMutationResult = NonNullable<Awaited<ReturnType<typeof deletePackage>>>;
export type DeletePackageMutationError = ErrorType<unknown>;
export declare const useDeletePackage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePackage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePackage>>, TError, {
    id: number;
}, TContext>;
export declare const getGetValuesUrl: () => string;
/**
 * @summary List company values
 */
export declare const getValues: (options?: RequestInit) => Promise<CompanyValue[]>;
export declare const getGetValuesQueryKey: () => readonly ["/api/values"];
export declare const getGetValuesQueryOptions: <TData = Awaited<ReturnType<typeof getValues>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getValues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getValues>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetValuesQueryResult = NonNullable<Awaited<ReturnType<typeof getValues>>>;
export type GetValuesQueryError = ErrorType<unknown>;
/**
 * @summary List company values
 */
export declare function useGetValues<TData = Awaited<ReturnType<typeof getValues>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getValues>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateValueUrl: () => string;
export declare const createValue: (companyValueInput: CompanyValueInput, options?: RequestInit) => Promise<CompanyValue>;
export declare const getCreateValueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createValue>>, TError, {
        data: BodyType<CompanyValueInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createValue>>, TError, {
    data: BodyType<CompanyValueInput>;
}, TContext>;
export type CreateValueMutationResult = NonNullable<Awaited<ReturnType<typeof createValue>>>;
export type CreateValueMutationBody = BodyType<CompanyValueInput>;
export type CreateValueMutationError = ErrorType<unknown>;
export declare const useCreateValue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createValue>>, TError, {
        data: BodyType<CompanyValueInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createValue>>, TError, {
    data: BodyType<CompanyValueInput>;
}, TContext>;
export declare const getUpdateValueUrl: (id: number) => string;
export declare const updateValue: (id: number, companyValueInput: CompanyValueInput, options?: RequestInit) => Promise<CompanyValue>;
export declare const getUpdateValueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateValue>>, TError, {
        id: number;
        data: BodyType<CompanyValueInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateValue>>, TError, {
    id: number;
    data: BodyType<CompanyValueInput>;
}, TContext>;
export type UpdateValueMutationResult = NonNullable<Awaited<ReturnType<typeof updateValue>>>;
export type UpdateValueMutationBody = BodyType<CompanyValueInput>;
export type UpdateValueMutationError = ErrorType<unknown>;
export declare const useUpdateValue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateValue>>, TError, {
        id: number;
        data: BodyType<CompanyValueInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateValue>>, TError, {
    id: number;
    data: BodyType<CompanyValueInput>;
}, TContext>;
export declare const getDeleteValueUrl: (id: number) => string;
export declare const deleteValue: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteValueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteValue>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteValue>>, TError, {
    id: number;
}, TContext>;
export type DeleteValueMutationResult = NonNullable<Awaited<ReturnType<typeof deleteValue>>>;
export type DeleteValueMutationError = ErrorType<unknown>;
export declare const useDeleteValue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteValue>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteValue>>, TError, {
    id: number;
}, TContext>;
export declare const getGetTestimonialsUrl: () => string;
/**
 * @summary List testimonials
 */
export declare const getTestimonials: (options?: RequestInit) => Promise<Testimonial[]>;
export declare const getGetTestimonialsQueryKey: () => readonly ["/api/testimonials"];
export declare const getGetTestimonialsQueryOptions: <TData = Awaited<ReturnType<typeof getTestimonials>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTestimonials>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTestimonials>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTestimonialsQueryResult = NonNullable<Awaited<ReturnType<typeof getTestimonials>>>;
export type GetTestimonialsQueryError = ErrorType<unknown>;
/**
 * @summary List testimonials
 */
export declare function useGetTestimonials<TData = Awaited<ReturnType<typeof getTestimonials>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTestimonials>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateTestimonialUrl: () => string;
export declare const createTestimonial: (testimonialInput: TestimonialInput, options?: RequestInit) => Promise<Testimonial>;
export declare const getCreateTestimonialMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTestimonial>>, TError, {
        data: BodyType<TestimonialInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTestimonial>>, TError, {
    data: BodyType<TestimonialInput>;
}, TContext>;
export type CreateTestimonialMutationResult = NonNullable<Awaited<ReturnType<typeof createTestimonial>>>;
export type CreateTestimonialMutationBody = BodyType<TestimonialInput>;
export type CreateTestimonialMutationError = ErrorType<unknown>;
export declare const useCreateTestimonial: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTestimonial>>, TError, {
        data: BodyType<TestimonialInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTestimonial>>, TError, {
    data: BodyType<TestimonialInput>;
}, TContext>;
export declare const getUpdateTestimonialUrl: (id: number) => string;
export declare const updateTestimonial: (id: number, testimonialInput: TestimonialInput, options?: RequestInit) => Promise<Testimonial>;
export declare const getUpdateTestimonialMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTestimonial>>, TError, {
        id: number;
        data: BodyType<TestimonialInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTestimonial>>, TError, {
    id: number;
    data: BodyType<TestimonialInput>;
}, TContext>;
export type UpdateTestimonialMutationResult = NonNullable<Awaited<ReturnType<typeof updateTestimonial>>>;
export type UpdateTestimonialMutationBody = BodyType<TestimonialInput>;
export type UpdateTestimonialMutationError = ErrorType<unknown>;
export declare const useUpdateTestimonial: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTestimonial>>, TError, {
        id: number;
        data: BodyType<TestimonialInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTestimonial>>, TError, {
    id: number;
    data: BodyType<TestimonialInput>;
}, TContext>;
export declare const getDeleteTestimonialUrl: (id: number) => string;
export declare const deleteTestimonial: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTestimonialMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTestimonial>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteTestimonial>>, TError, {
    id: number;
}, TContext>;
export type DeleteTestimonialMutationResult = NonNullable<Awaited<ReturnType<typeof deleteTestimonial>>>;
export type DeleteTestimonialMutationError = ErrorType<unknown>;
export declare const useDeleteTestimonial: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTestimonial>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteTestimonial>>, TError, {
    id: number;
}, TContext>;
export declare const getGetPartnersUrl: () => string;
/**
 * @summary List partners
 */
export declare const getPartners: (options?: RequestInit) => Promise<Partner[]>;
export declare const getGetPartnersQueryKey: () => readonly ["/api/partners"];
export declare const getGetPartnersQueryOptions: <TData = Awaited<ReturnType<typeof getPartners>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPartners>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPartners>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPartnersQueryResult = NonNullable<Awaited<ReturnType<typeof getPartners>>>;
export type GetPartnersQueryError = ErrorType<unknown>;
/**
 * @summary List partners
 */
export declare function useGetPartners<TData = Awaited<ReturnType<typeof getPartners>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPartners>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreatePartnerUrl: () => string;
export declare const createPartner: (partnerInput: PartnerInput, options?: RequestInit) => Promise<Partner>;
export declare const getCreatePartnerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPartner>>, TError, {
        data: BodyType<PartnerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPartner>>, TError, {
    data: BodyType<PartnerInput>;
}, TContext>;
export type CreatePartnerMutationResult = NonNullable<Awaited<ReturnType<typeof createPartner>>>;
export type CreatePartnerMutationBody = BodyType<PartnerInput>;
export type CreatePartnerMutationError = ErrorType<unknown>;
export declare const useCreatePartner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPartner>>, TError, {
        data: BodyType<PartnerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPartner>>, TError, {
    data: BodyType<PartnerInput>;
}, TContext>;
export declare const getUpdatePartnerUrl: (id: number) => string;
export declare const updatePartner: (id: number, partnerInput: PartnerInput, options?: RequestInit) => Promise<Partner>;
export declare const getUpdatePartnerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePartner>>, TError, {
        id: number;
        data: BodyType<PartnerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePartner>>, TError, {
    id: number;
    data: BodyType<PartnerInput>;
}, TContext>;
export type UpdatePartnerMutationResult = NonNullable<Awaited<ReturnType<typeof updatePartner>>>;
export type UpdatePartnerMutationBody = BodyType<PartnerInput>;
export type UpdatePartnerMutationError = ErrorType<unknown>;
export declare const useUpdatePartner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePartner>>, TError, {
        id: number;
        data: BodyType<PartnerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePartner>>, TError, {
    id: number;
    data: BodyType<PartnerInput>;
}, TContext>;
export declare const getDeletePartnerUrl: (id: number) => string;
export declare const deletePartner: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeletePartnerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePartner>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePartner>>, TError, {
    id: number;
}, TContext>;
export type DeletePartnerMutationResult = NonNullable<Awaited<ReturnType<typeof deletePartner>>>;
export type DeletePartnerMutationError = ErrorType<unknown>;
export declare const useDeletePartner: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePartner>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePartner>>, TError, {
    id: number;
}, TContext>;
export declare const getGetServiceRequestsUrl: (params?: GetServiceRequestsParams) => string;
/**
 * @summary List all service requests (admin)
 */
export declare const getServiceRequests: (params?: GetServiceRequestsParams, options?: RequestInit) => Promise<ServiceRequest[]>;
export declare const getGetServiceRequestsQueryKey: (params?: GetServiceRequestsParams) => readonly ["/api/service-requests", ...GetServiceRequestsParams[]];
export declare const getGetServiceRequestsQueryOptions: <TData = Awaited<ReturnType<typeof getServiceRequests>>, TError = ErrorType<unknown>>(params?: GetServiceRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServiceRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getServiceRequests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetServiceRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof getServiceRequests>>>;
export type GetServiceRequestsQueryError = ErrorType<unknown>;
/**
 * @summary List all service requests (admin)
 */
export declare function useGetServiceRequests<TData = Awaited<ReturnType<typeof getServiceRequests>>, TError = ErrorType<unknown>>(params?: GetServiceRequestsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServiceRequests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitServiceRequestUrl: () => string;
/**
 * @summary Submit a new service request (public)
 */
export declare const submitServiceRequest: (serviceRequestInput: ServiceRequestInput, options?: RequestInit) => Promise<ServiceRequest>;
export declare const getSubmitServiceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitServiceRequest>>, TError, {
        data: BodyType<ServiceRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitServiceRequest>>, TError, {
    data: BodyType<ServiceRequestInput>;
}, TContext>;
export type SubmitServiceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof submitServiceRequest>>>;
export type SubmitServiceRequestMutationBody = BodyType<ServiceRequestInput>;
export type SubmitServiceRequestMutationError = ErrorType<unknown>;
/**
* @summary Submit a new service request (public)
*/
export declare const useSubmitServiceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitServiceRequest>>, TError, {
        data: BodyType<ServiceRequestInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitServiceRequest>>, TError, {
    data: BodyType<ServiceRequestInput>;
}, TContext>;
export declare const getGetServiceRequestUrl: (id: number) => string;
export declare const getServiceRequest: (id: number, options?: RequestInit) => Promise<ServiceRequest>;
export declare const getGetServiceRequestQueryKey: (id: number) => readonly [`/api/service-requests/${number}`];
export declare const getGetServiceRequestQueryOptions: <TData = Awaited<ReturnType<typeof getServiceRequest>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServiceRequest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getServiceRequest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetServiceRequestQueryResult = NonNullable<Awaited<ReturnType<typeof getServiceRequest>>>;
export type GetServiceRequestQueryError = ErrorType<unknown>;
export declare function useGetServiceRequest<TData = Awaited<ReturnType<typeof getServiceRequest>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getServiceRequest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateServiceRequestUrl: (id: number) => string;
export declare const updateServiceRequest: (id: number, serviceRequestUpdate: ServiceRequestUpdate, options?: RequestInit) => Promise<ServiceRequest>;
export declare const getUpdateServiceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateServiceRequest>>, TError, {
        id: number;
        data: BodyType<ServiceRequestUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateServiceRequest>>, TError, {
    id: number;
    data: BodyType<ServiceRequestUpdate>;
}, TContext>;
export type UpdateServiceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof updateServiceRequest>>>;
export type UpdateServiceRequestMutationBody = BodyType<ServiceRequestUpdate>;
export type UpdateServiceRequestMutationError = ErrorType<unknown>;
export declare const useUpdateServiceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateServiceRequest>>, TError, {
        id: number;
        data: BodyType<ServiceRequestUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateServiceRequest>>, TError, {
    id: number;
    data: BodyType<ServiceRequestUpdate>;
}, TContext>;
export declare const getDeleteServiceRequestUrl: (id: number) => string;
export declare const deleteServiceRequest: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteServiceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteServiceRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteServiceRequest>>, TError, {
    id: number;
}, TContext>;
export type DeleteServiceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof deleteServiceRequest>>>;
export type DeleteServiceRequestMutationError = ErrorType<unknown>;
export declare const useDeleteServiceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteServiceRequest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteServiceRequest>>, TError, {
    id: number;
}, TContext>;
export declare const getAssignServiceRequestUrl: (id: number) => string;
/**
 * @summary Assign a service request to a driver (admin or manager)
 */
export declare const assignServiceRequest: (id: number, serviceRequestAssignment: ServiceRequestAssignment, options?: RequestInit) => Promise<ServiceRequest>;
export declare const getAssignServiceRequestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignServiceRequest>>, TError, {
        id: number;
        data: BodyType<ServiceRequestAssignment>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof assignServiceRequest>>, TError, {
    id: number;
    data: BodyType<ServiceRequestAssignment>;
}, TContext>;
export type AssignServiceRequestMutationResult = NonNullable<Awaited<ReturnType<typeof assignServiceRequest>>>;
export type AssignServiceRequestMutationBody = BodyType<ServiceRequestAssignment>;
export type AssignServiceRequestMutationError = ErrorType<unknown>;
/**
* @summary Assign a service request to a driver (admin or manager)
*/
export declare const useAssignServiceRequest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof assignServiceRequest>>, TError, {
        id: number;
        data: BodyType<ServiceRequestAssignment>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof assignServiceRequest>>, TError, {
    id: number;
    data: BodyType<ServiceRequestAssignment>;
}, TContext>;
export declare const getGetDriverWorkOrdersUrl: (params?: GetDriverWorkOrdersParams) => string;
/**
 * @summary List work orders assigned to the current driver
 */
export declare const getDriverWorkOrders: (params?: GetDriverWorkOrdersParams, options?: RequestInit) => Promise<ServiceRequest[]>;
export declare const getGetDriverWorkOrdersQueryKey: (params?: GetDriverWorkOrdersParams) => readonly ["/api/driver/work-orders", ...GetDriverWorkOrdersParams[]];
export declare const getGetDriverWorkOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getDriverWorkOrders>>, TError = ErrorType<unknown>>(params?: GetDriverWorkOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverWorkOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDriverWorkOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDriverWorkOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getDriverWorkOrders>>>;
export type GetDriverWorkOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List work orders assigned to the current driver
 */
export declare function useGetDriverWorkOrders<TData = Awaited<ReturnType<typeof getDriverWorkOrders>>, TError = ErrorType<unknown>>(params?: GetDriverWorkOrdersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDriverWorkOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateDriverWorkOrderUrl: (id: number) => string;
/**
 * @summary Accept, reject, start, travel, arrive, or complete a driver's work order
 */
export declare const updateDriverWorkOrder: (id: number, driverWorkOrderUpdate: DriverWorkOrderUpdate, options?: RequestInit) => Promise<ServiceRequest>;
export declare const getUpdateDriverWorkOrderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriverWorkOrder>>, TError, {
        id: number;
        data: BodyType<DriverWorkOrderUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDriverWorkOrder>>, TError, {
    id: number;
    data: BodyType<DriverWorkOrderUpdate>;
}, TContext>;
export type UpdateDriverWorkOrderMutationResult = NonNullable<Awaited<ReturnType<typeof updateDriverWorkOrder>>>;
export type UpdateDriverWorkOrderMutationBody = BodyType<DriverWorkOrderUpdate>;
export type UpdateDriverWorkOrderMutationError = ErrorType<unknown>;
/**
* @summary Accept, reject, start, travel, arrive, or complete a driver's work order
*/
export declare const useUpdateDriverWorkOrder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDriverWorkOrder>>, TError, {
        id: number;
        data: BodyType<DriverWorkOrderUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDriverWorkOrder>>, TError, {
    id: number;
    data: BodyType<DriverWorkOrderUpdate>;
}, TContext>;
export declare const getGetAdminWorkOrdersUrl: () => string;
/**
 * @summary List current work orders for managers
 */
export declare const getAdminWorkOrders: (options?: RequestInit) => Promise<ServiceRequest[]>;
export declare const getGetAdminWorkOrdersQueryKey: () => readonly ["/api/admin/work-orders"];
export declare const getGetAdminWorkOrdersQueryOptions: <TData = Awaited<ReturnType<typeof getAdminWorkOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminWorkOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminWorkOrders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminWorkOrdersQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminWorkOrders>>>;
export type GetAdminWorkOrdersQueryError = ErrorType<unknown>;
/**
 * @summary List current work orders for managers
 */
export declare function useGetAdminWorkOrders<TData = Awaited<ReturnType<typeof getAdminWorkOrders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminWorkOrders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAdminStatsUrl: () => string;
/**
 * @summary Dashboard summary statistics
 */
export declare const getAdminStats: (options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetAdminStatsQueryKey: () => readonly ["/api/admin/stats"];
export declare const getGetAdminStatsQueryOptions: <TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminStats>>>;
export type GetAdminStatsQueryError = ErrorType<unknown>;
/**
 * @summary Dashboard summary statistics
 */
export declare function useGetAdminStats<TData = Awaited<ReturnType<typeof getAdminStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetConversationsUrl: () => string;
/**
 * @summary List conversations (admin)
 */
export declare const getConversations: (options?: RequestInit) => Promise<Conversation[]>;
export declare const getGetConversationsQueryKey: () => readonly ["/api/conversations"];
export declare const getGetConversationsQueryOptions: <TData = Awaited<ReturnType<typeof getConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof getConversations>>>;
export type GetConversationsQueryError = ErrorType<unknown>;
/**
 * @summary List conversations (admin)
 */
export declare function useGetConversations<TData = Awaited<ReturnType<typeof getConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateConversationUrl: () => string;
/**
 * @summary Start a new conversation (public)
 */
export declare const createConversation: (conversationInput: ConversationInput, options?: RequestInit) => Promise<Conversation>;
export declare const getCreateConversationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
        data: BodyType<ConversationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
    data: BodyType<ConversationInput>;
}, TContext>;
export type CreateConversationMutationResult = NonNullable<Awaited<ReturnType<typeof createConversation>>>;
export type CreateConversationMutationBody = BodyType<ConversationInput>;
export type CreateConversationMutationError = ErrorType<unknown>;
/**
* @summary Start a new conversation (public)
*/
export declare const useCreateConversation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
        data: BodyType<ConversationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createConversation>>, TError, {
    data: BodyType<ConversationInput>;
}, TContext>;
export declare const getGetConversationUrl: (id: number) => string;
/**
 * @summary Get a conversation for its participant
 */
export declare const getConversation: (id: number, options?: RequestInit) => Promise<Conversation>;
export declare const getGetConversationQueryKey: (id: number) => readonly [`/api/conversations/${number}`];
export declare const getGetConversationQueryOptions: <TData = Awaited<ReturnType<typeof getConversation>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConversationQueryResult = NonNullable<Awaited<ReturnType<typeof getConversation>>>;
export type GetConversationQueryError = ErrorType<unknown>;
/**
 * @summary Get a conversation for its participant
 */
export declare function useGetConversation<TData = Awaited<ReturnType<typeof getConversation>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateConversationUrl: (id: number) => string;
export declare const updateConversation: (id: number, conversationUpdate: ConversationUpdate, options?: RequestInit) => Promise<Conversation>;
export declare const getUpdateConversationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateConversation>>, TError, {
        id: number;
        data: BodyType<ConversationUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateConversation>>, TError, {
    id: number;
    data: BodyType<ConversationUpdate>;
}, TContext>;
export type UpdateConversationMutationResult = NonNullable<Awaited<ReturnType<typeof updateConversation>>>;
export type UpdateConversationMutationBody = BodyType<ConversationUpdate>;
export type UpdateConversationMutationError = ErrorType<unknown>;
export declare const useUpdateConversation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateConversation>>, TError, {
        id: number;
        data: BodyType<ConversationUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateConversation>>, TError, {
    id: number;
    data: BodyType<ConversationUpdate>;
}, TContext>;
export declare const getGetMessagesUrl: (id: number) => string;
export declare const getMessages: (id: number, options?: RequestInit) => Promise<Message[]>;
export declare const getGetMessagesQueryKey: (id: number) => readonly [`/api/conversations/${number}/messages`];
export declare const getGetMessagesQueryOptions: <TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof getMessages>>>;
export type GetMessagesQueryError = ErrorType<unknown>;
export declare function useGetMessages<TData = Awaited<ReturnType<typeof getMessages>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSendMessageUrl: (id: number) => string;
export declare const sendMessage: (id: number, messageInput: MessageInput, options?: RequestInit) => Promise<Message>;
export declare const getSendMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<MessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<MessageInput>;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<MessageInput>;
export type SendMessageMutationError = ErrorType<unknown>;
export declare const useSendMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<MessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<MessageInput>;
}, TContext>;
export declare const getSetConversationTypingUrl: (id: number) => string;
/**
 * @summary Update typing presence for a conversation participant
 */
export declare const setConversationTyping: (id: number, conversationTypingInput: ConversationTypingInput, options?: RequestInit) => Promise<SetConversationTyping200>;
export declare const getSetConversationTypingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setConversationTyping>>, TError, {
        id: number;
        data: BodyType<ConversationTypingInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setConversationTyping>>, TError, {
    id: number;
    data: BodyType<ConversationTypingInput>;
}, TContext>;
export type SetConversationTypingMutationResult = NonNullable<Awaited<ReturnType<typeof setConversationTyping>>>;
export type SetConversationTypingMutationBody = BodyType<ConversationTypingInput>;
export type SetConversationTypingMutationError = ErrorType<unknown>;
/**
* @summary Update typing presence for a conversation participant
*/
export declare const useSetConversationTyping: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setConversationTyping>>, TError, {
        id: number;
        data: BodyType<ConversationTypingInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setConversationTyping>>, TError, {
    id: number;
    data: BodyType<ConversationTypingInput>;
}, TContext>;
export declare const getAiChatUrl: () => string;
/**
 * @summary Send message to AI assistant
 */
export declare const aiChat: (aiMessageInput: AiMessageInput, options?: RequestInit) => Promise<BotReply>;
export declare const getAiChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
        data: BodyType<AiMessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
    data: BodyType<AiMessageInput>;
}, TContext>;
export type AiChatMutationResult = NonNullable<Awaited<ReturnType<typeof aiChat>>>;
export type AiChatMutationBody = BodyType<AiMessageInput>;
export type AiChatMutationError = ErrorType<unknown>;
/**
* @summary Send message to AI assistant
*/
export declare const useAiChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
        data: BodyType<AiMessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof aiChat>>, TError, {
    data: BodyType<AiMessageInput>;
}, TContext>;
export declare const getGetNotificationsUrl: () => string;
/**
 * @summary List notifications
 */
export declare const getNotifications: (options?: RequestInit) => Promise<Notification[]>;
export declare const getGetNotificationsQueryKey: () => readonly ["/api/notifications"];
export declare const getGetNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof getNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof getNotifications>>>;
export type GetNotificationsQueryError = ErrorType<unknown>;
/**
 * @summary List notifications
 */
export declare function useGetNotifications<TData = Awaited<ReturnType<typeof getNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getMarkNotificationReadUrl: (id: number) => string;
export declare const markNotificationRead: (id: number, options?: RequestInit) => Promise<Notification>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<unknown>;
export declare const useMarkNotificationRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export declare const getMarkAllNotificationsReadUrl: () => string;
export declare const markAllNotificationsRead: (options?: RequestInit) => Promise<SuccessResult>;
export declare const getMarkAllNotificationsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export type MarkAllNotificationsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markAllNotificationsRead>>>;
export type MarkAllNotificationsReadMutationError = ErrorType<unknown>;
export declare const useMarkAllNotificationsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export declare const getGetSeoPagesUrl: () => string;
/**
 * @summary List published SEO landing pages
 */
export declare const getSeoPages: (options?: RequestInit) => Promise<SeoPage[]>;
export declare const getGetSeoPagesQueryKey: () => readonly ["/api/pages"];
export declare const getGetSeoPagesQueryOptions: <TData = Awaited<ReturnType<typeof getSeoPages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoPages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSeoPages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSeoPagesQueryResult = NonNullable<Awaited<ReturnType<typeof getSeoPages>>>;
export type GetSeoPagesQueryError = ErrorType<unknown>;
/**
 * @summary List published SEO landing pages
 */
export declare function useGetSeoPages<TData = Awaited<ReturnType<typeof getSeoPages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoPages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSeoPageUrl: (slug: string) => string;
/**
 * @summary Get a published SEO landing page
 */
export declare const getSeoPage: (slug: string, options?: RequestInit) => Promise<SeoPage>;
export declare const getGetSeoPageQueryKey: (slug: string) => readonly [`/api/pages/${string}`];
export declare const getGetSeoPageQueryOptions: <TData = Awaited<ReturnType<typeof getSeoPage>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoPage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSeoPage>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSeoPageQueryResult = NonNullable<Awaited<ReturnType<typeof getSeoPage>>>;
export type GetSeoPageQueryError = ErrorType<void>;
/**
 * @summary Get a published SEO landing page
 */
export declare function useGetSeoPage<TData = Awaited<ReturnType<typeof getSeoPage>>, TError = ErrorType<void>>(slug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSeoPage>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAdminSeoPagesUrl: () => string;
export declare const getAdminSeoPages: (options?: RequestInit) => Promise<SeoPage[]>;
export declare const getGetAdminSeoPagesQueryKey: () => readonly ["/api/admin/seo-pages"];
export declare const getGetAdminSeoPagesQueryOptions: <TData = Awaited<ReturnType<typeof getAdminSeoPages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminSeoPages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminSeoPages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminSeoPagesQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminSeoPages>>>;
export type GetAdminSeoPagesQueryError = ErrorType<unknown>;
export declare function useGetAdminSeoPages<TData = Awaited<ReturnType<typeof getAdminSeoPages>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminSeoPages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSeoPageUrl: () => string;
export declare const createSeoPage: (seoPageInput: SeoPageInput, options?: RequestInit) => Promise<SeoPage>;
export declare const getCreateSeoPageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeoPage>>, TError, {
        data: BodyType<SeoPageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSeoPage>>, TError, {
    data: BodyType<SeoPageInput>;
}, TContext>;
export type CreateSeoPageMutationResult = NonNullable<Awaited<ReturnType<typeof createSeoPage>>>;
export type CreateSeoPageMutationBody = BodyType<SeoPageInput>;
export type CreateSeoPageMutationError = ErrorType<unknown>;
export declare const useCreateSeoPage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSeoPage>>, TError, {
        data: BodyType<SeoPageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSeoPage>>, TError, {
    data: BodyType<SeoPageInput>;
}, TContext>;
export declare const getUpdateSeoPageUrl: (id: number) => string;
export declare const updateSeoPage: (id: number, seoPageInput: SeoPageInput, options?: RequestInit) => Promise<SeoPage>;
export declare const getUpdateSeoPageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSeoPage>>, TError, {
        id: number;
        data: BodyType<SeoPageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSeoPage>>, TError, {
    id: number;
    data: BodyType<SeoPageInput>;
}, TContext>;
export type UpdateSeoPageMutationResult = NonNullable<Awaited<ReturnType<typeof updateSeoPage>>>;
export type UpdateSeoPageMutationBody = BodyType<SeoPageInput>;
export type UpdateSeoPageMutationError = ErrorType<unknown>;
export declare const useUpdateSeoPage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSeoPage>>, TError, {
        id: number;
        data: BodyType<SeoPageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSeoPage>>, TError, {
    id: number;
    data: BodyType<SeoPageInput>;
}, TContext>;
export declare const getDeleteSeoPageUrl: (id: number) => string;
export declare const deleteSeoPage: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSeoPageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeoPage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSeoPage>>, TError, {
    id: number;
}, TContext>;
export type DeleteSeoPageMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSeoPage>>>;
export type DeleteSeoPageMutationError = ErrorType<unknown>;
export declare const useDeleteSeoPage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSeoPage>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSeoPage>>, TError, {
    id: number;
}, TContext>;
export declare const getGetPushPublicKeyUrl: () => string;
/**
 * @summary Get the VAPID public key for the signed-in admin
 */
export declare const getPushPublicKey: (options?: RequestInit) => Promise<PushPublicKey>;
export declare const getGetPushPublicKeyQueryKey: () => readonly ["/api/push/public-key"];
export declare const getGetPushPublicKeyQueryOptions: <TData = Awaited<ReturnType<typeof getPushPublicKey>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPushPublicKey>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPushPublicKey>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPushPublicKeyQueryResult = NonNullable<Awaited<ReturnType<typeof getPushPublicKey>>>;
export type GetPushPublicKeyQueryError = ErrorType<void>;
/**
 * @summary Get the VAPID public key for the signed-in admin
 */
export declare function useGetPushPublicKey<TData = Awaited<ReturnType<typeof getPushPublicKey>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPushPublicKey>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSavePushSubscriptionUrl: () => string;
/**
 * @summary Save the current browser push subscription for the signed-in admin
 */
export declare const savePushSubscription: (pushSubscriptionInput: PushSubscriptionInput, options?: RequestInit) => Promise<SuccessResult>;
export declare const getSavePushSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof savePushSubscription>>, TError, {
        data: BodyType<PushSubscriptionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof savePushSubscription>>, TError, {
    data: BodyType<PushSubscriptionInput>;
}, TContext>;
export type SavePushSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof savePushSubscription>>>;
export type SavePushSubscriptionMutationBody = BodyType<PushSubscriptionInput>;
export type SavePushSubscriptionMutationError = ErrorType<unknown>;
/**
* @summary Save the current browser push subscription for the signed-in admin
*/
export declare const useSavePushSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof savePushSubscription>>, TError, {
        data: BodyType<PushSubscriptionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof savePushSubscription>>, TError, {
    data: BodyType<PushSubscriptionInput>;
}, TContext>;
export declare const getDeletePushSubscriptionUrl: () => string;
/**
 * @summary Remove the current browser push subscription
 */
export declare const deletePushSubscription: (pushSubscriptionDeleteInput?: PushSubscriptionDeleteInput, options?: RequestInit) => Promise<SuccessResult>;
export declare const getDeletePushSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePushSubscription>>, TError, {
        data?: BodyType<PushSubscriptionDeleteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePushSubscription>>, TError, {
    data?: BodyType<PushSubscriptionDeleteInput>;
}, TContext>;
export type DeletePushSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof deletePushSubscription>>>;
export type DeletePushSubscriptionMutationBody = BodyType<PushSubscriptionDeleteInput> | undefined;
export type DeletePushSubscriptionMutationError = ErrorType<unknown>;
/**
* @summary Remove the current browser push subscription
*/
export declare const useDeletePushSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePushSubscription>>, TError, {
        data?: BodyType<PushSubscriptionDeleteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePushSubscription>>, TError, {
    data?: BodyType<PushSubscriptionDeleteInput>;
}, TContext>;
export declare const getGetCleaningOperationsUrl: () => string;
export declare const getCleaningOperations: (options?: RequestInit) => Promise<CleaningOperationsSnapshot>;
export declare const getGetCleaningOperationsQueryKey: () => readonly ["/api/admin/cleaning-operations"];
export declare const getGetCleaningOperationsQueryOptions: <TData = Awaited<ReturnType<typeof getCleaningOperations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCleaningOperationsQueryResult = NonNullable<Awaited<ReturnType<typeof getCleaningOperations>>>;
export type GetCleaningOperationsQueryError = ErrorType<unknown>;
export declare function useGetCleaningOperations<TData = Awaited<ReturnType<typeof getCleaningOperations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCleaningOperationsRecordsUrl: (params?: GetCleaningOperationsRecordsParams) => string;
export declare const getCleaningOperationsRecords: (params?: GetCleaningOperationsRecordsParams, options?: RequestInit) => Promise<CleaningOperationsRecord[]>;
export declare const getGetCleaningOperationsRecordsQueryKey: (params?: GetCleaningOperationsRecordsParams) => readonly ["/api/admin/cleaning-operations/records", ...GetCleaningOperationsRecordsParams[]];
export declare const getGetCleaningOperationsRecordsQueryOptions: <TData = Awaited<ReturnType<typeof getCleaningOperationsRecords>>, TError = ErrorType<unknown>>(params?: GetCleaningOperationsRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsRecords>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCleaningOperationsRecordsQueryResult = NonNullable<Awaited<ReturnType<typeof getCleaningOperationsRecords>>>;
export type GetCleaningOperationsRecordsQueryError = ErrorType<unknown>;
export declare function useGetCleaningOperationsRecords<TData = Awaited<ReturnType<typeof getCleaningOperationsRecords>>, TError = ErrorType<unknown>>(params?: GetCleaningOperationsRecordsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsRecords>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCleaningOperationsRecordUrl: () => string;
export declare const createCleaningOperationsRecord: (cleaningOperationsRecordInput: CleaningOperationsRecordInput, options?: RequestInit) => Promise<CleaningOperationsRecord>;
export declare const getCreateCleaningOperationsRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCleaningOperationsRecord>>, TError, {
        data: BodyType<CleaningOperationsRecordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCleaningOperationsRecord>>, TError, {
    data: BodyType<CleaningOperationsRecordInput>;
}, TContext>;
export type CreateCleaningOperationsRecordMutationResult = NonNullable<Awaited<ReturnType<typeof createCleaningOperationsRecord>>>;
export type CreateCleaningOperationsRecordMutationBody = BodyType<CleaningOperationsRecordInput>;
export type CreateCleaningOperationsRecordMutationError = ErrorType<unknown>;
export declare const useCreateCleaningOperationsRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCleaningOperationsRecord>>, TError, {
        data: BodyType<CleaningOperationsRecordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCleaningOperationsRecord>>, TError, {
    data: BodyType<CleaningOperationsRecordInput>;
}, TContext>;
export declare const getCreateCleaningContractWorkflowUrl: () => string;
export declare const createCleaningContractWorkflow: (cleaningContractWorkflowInput: CleaningContractWorkflowInput, options?: RequestInit) => Promise<CleaningContractWorkflowResult>;
export declare const getCreateCleaningContractWorkflowMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCleaningContractWorkflow>>, TError, {
        data: BodyType<CleaningContractWorkflowInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCleaningContractWorkflow>>, TError, {
    data: BodyType<CleaningContractWorkflowInput>;
}, TContext>;
export type CreateCleaningContractWorkflowMutationResult = NonNullable<Awaited<ReturnType<typeof createCleaningContractWorkflow>>>;
export type CreateCleaningContractWorkflowMutationBody = BodyType<CleaningContractWorkflowInput>;
export type CreateCleaningContractWorkflowMutationError = ErrorType<unknown>;
export declare const useCreateCleaningContractWorkflow: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCleaningContractWorkflow>>, TError, {
        data: BodyType<CleaningContractWorkflowInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCleaningContractWorkflow>>, TError, {
    data: BodyType<CleaningContractWorkflowInput>;
}, TContext>;
export declare const getUpdateCleaningOperationsRecordUrl: (id: number) => string;
export declare const updateCleaningOperationsRecord: (id: number, cleaningOperationsRecordUpdate: CleaningOperationsRecordUpdate, options?: RequestInit) => Promise<CleaningOperationsRecord>;
export declare const getUpdateCleaningOperationsRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCleaningOperationsRecord>>, TError, {
        id: number;
        data: BodyType<CleaningOperationsRecordUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCleaningOperationsRecord>>, TError, {
    id: number;
    data: BodyType<CleaningOperationsRecordUpdate>;
}, TContext>;
export type UpdateCleaningOperationsRecordMutationResult = NonNullable<Awaited<ReturnType<typeof updateCleaningOperationsRecord>>>;
export type UpdateCleaningOperationsRecordMutationBody = BodyType<CleaningOperationsRecordUpdate>;
export type UpdateCleaningOperationsRecordMutationError = ErrorType<unknown>;
export declare const useUpdateCleaningOperationsRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCleaningOperationsRecord>>, TError, {
        id: number;
        data: BodyType<CleaningOperationsRecordUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCleaningOperationsRecord>>, TError, {
    id: number;
    data: BodyType<CleaningOperationsRecordUpdate>;
}, TContext>;
export declare const getArchiveCleaningOperationsRecordUrl: (id: number) => string;
export declare const archiveCleaningOperationsRecord: (id: number, options?: RequestInit) => Promise<void>;
export declare const getArchiveCleaningOperationsRecordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveCleaningOperationsRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveCleaningOperationsRecord>>, TError, {
    id: number;
}, TContext>;
export type ArchiveCleaningOperationsRecordMutationResult = NonNullable<Awaited<ReturnType<typeof archiveCleaningOperationsRecord>>>;
export type ArchiveCleaningOperationsRecordMutationError = ErrorType<unknown>;
export declare const useArchiveCleaningOperationsRecord: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveCleaningOperationsRecord>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveCleaningOperationsRecord>>, TError, {
    id: number;
}, TContext>;
export declare const getGetCleaningOperationsAuditUrl: () => string;
export declare const getCleaningOperationsAudit: (options?: RequestInit) => Promise<CleaningOperationsAudit[]>;
export declare const getGetCleaningOperationsAuditQueryKey: () => readonly ["/api/admin/cleaning-operations/audit"];
export declare const getGetCleaningOperationsAuditQueryOptions: <TData = Awaited<ReturnType<typeof getCleaningOperationsAudit>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsAudit>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsAudit>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCleaningOperationsAuditQueryResult = NonNullable<Awaited<ReturnType<typeof getCleaningOperationsAudit>>>;
export type GetCleaningOperationsAuditQueryError = ErrorType<unknown>;
export declare function useGetCleaningOperationsAudit<TData = Awaited<ReturnType<typeof getCleaningOperationsAudit>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningOperationsAudit>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetCleaningPackageContractLedgersUrl: (params?: GetCleaningPackageContractLedgersParams) => string;
export declare const getCleaningPackageContractLedgers: (params?: GetCleaningPackageContractLedgersParams, options?: RequestInit) => Promise<ContractLedgerResponse>;
export declare const getGetCleaningPackageContractLedgersQueryKey: (params?: GetCleaningPackageContractLedgersParams) => readonly ["/api/admin/cleaning-operations/financial/contract-ledgers", ...GetCleaningPackageContractLedgersParams[]];
export declare const getGetCleaningPackageContractLedgersQueryOptions: <TData = Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>, TError = ErrorType<unknown>>(params?: GetCleaningPackageContractLedgersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCleaningPackageContractLedgersQueryResult = NonNullable<Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>>;
export type GetCleaningPackageContractLedgersQueryError = ErrorType<unknown>;
export declare function useGetCleaningPackageContractLedgers<TData = Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>, TError = ErrorType<unknown>>(params?: GetCleaningPackageContractLedgersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCleaningPackageContractLedgers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFinancialTruthUrl: (params?: GetFinancialTruthParams) => string;
export declare const getFinancialTruth: (params?: GetFinancialTruthParams, options?: RequestInit) => Promise<FinancialTruthResponse>;
export declare const getGetFinancialTruthQueryKey: (params?: GetFinancialTruthParams) => readonly ["/api/admin/cleaning-operations/financial/core", ...GetFinancialTruthParams[]];
export declare const getGetFinancialTruthQueryOptions: <TData = Awaited<ReturnType<typeof getFinancialTruth>>, TError = ErrorType<unknown>>(params?: GetFinancialTruthParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFinancialTruth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFinancialTruth>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFinancialTruthQueryResult = NonNullable<Awaited<ReturnType<typeof getFinancialTruth>>>;
export type GetFinancialTruthQueryError = ErrorType<unknown>;
export declare function useGetFinancialTruth<TData = Awaited<ReturnType<typeof getFinancialTruth>>, TError = ErrorType<unknown>>(params?: GetFinancialTruthParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFinancialTruth>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSettleCleaningPackageContractUrl: () => string;
export declare const settleCleaningPackageContract: (contractSettlementInput: ContractSettlementInput, options?: RequestInit) => Promise<ContractSettlementResult>;
export declare const getSettleCleaningPackageContractMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof settleCleaningPackageContract>>, TError, {
        data: BodyType<ContractSettlementInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof settleCleaningPackageContract>>, TError, {
    data: BodyType<ContractSettlementInput>;
}, TContext>;
export type SettleCleaningPackageContractMutationResult = NonNullable<Awaited<ReturnType<typeof settleCleaningPackageContract>>>;
export type SettleCleaningPackageContractMutationBody = BodyType<ContractSettlementInput>;
export type SettleCleaningPackageContractMutationError = ErrorType<unknown>;
export declare const useSettleCleaningPackageContract: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof settleCleaningPackageContract>>, TError, {
        data: BodyType<ContractSettlementInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof settleCleaningPackageContract>>, TError, {
    data: BodyType<ContractSettlementInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map