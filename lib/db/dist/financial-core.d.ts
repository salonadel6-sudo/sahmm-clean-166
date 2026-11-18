export type FinancialSource = {
    sourceKind: string;
    sourceId: number;
    reference?: string;
    amount: number;
    date?: string;
    currency?: string;
    operationKey?: string | null;
    createdBy?: number | null;
    allocations?: Array<{
        contractId?: number | null;
        invoiceId?: number | null;
        amount: number;
    }>;
    paymentMethod?: string;
    /** A receipt linked to a payment is a document, not a second collection event. */
    sourcePaymentId?: number | null;
};
export type FinancialTruthContract = {
    revenue: number;
    collected: number;
    receivables: number;
    expenses: number;
    purchases: number;
    inventory: number;
    commissions: number;
    bankFees: number;
    refunds: number;
    transfers: number;
    cashBalance: number;
    bankBalance: number;
    netProfit: number;
    balances: {
        accountsReceivable: number;
        accountsPayable: number;
        cash: number;
        bank: number;
        inventory: number;
    };
    grossRevenue: number;
    grossCollections: number;
    netCollections: number;
    returnedCollections: number;
    deposits: number;
    cashAndBank: number;
    totalDebit: number;
    totalCredit: number;
};
export declare function postToFinancialCore(source: FinancialSource): {
    id: number;
    idempotent: boolean;
    journalId?: undefined;
} | {
    id: number;
    journalId: number;
    idempotent: boolean;
} | {
    id: null;
    journalId: null;
    idempotent: boolean;
    documentOnly: boolean;
};
export declare function reverseInFinancialCore(source: FinancialSource, reason: string, actorId?: number | null): {
    id: number;
    journalId: number;
    idempotent: boolean;
} | {
    id: number;
    idempotent: boolean;
    rejected: boolean;
} | null;
export declare function financialTruth(filters?: {
    from?: string;
    to?: string;
}): {
    totals: FinancialTruthContract;
    counts: unknown[];
};
export declare function financialPeriods(): unknown[];
export declare function closeFinancialPeriod(periodKey: string, actorId?: number | null): void;
//# sourceMappingURL=financial-core.d.ts.map