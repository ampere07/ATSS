import { create } from 'zustand';
import { getCustomerDetail, getCustomerPaySummary, CustomerDetailData, CustomerPaySummary } from '../services/customerDetailService';
import { soaService } from '../services/soaService';
import { invoiceService } from '../services/invoiceService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { transactionService } from '../services/transactionService';
import { serviceChargeService, ServiceChargeRecord } from '../services/serviceChargeService';
import { readDashboardCache, writeDashboardCache } from '../utils/customerDashboardCache';

interface Payment {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: string;
    status: string;
}

interface CustomerDashboardState {
    customerDetail: CustomerDetailData | null;
    /**
     * The fast path for the balance card. Requested alongside customerDetail rather than
     * derived from it, because the amount due is the one figure Pay Now cannot work
     * without and it lives one indexed row away — while the full detail response is four
     * eager-loaded relations, two payment SUMs and the entire customer record.
     *
     * Never restored from cache, so a non-null value always means a fresh server
     * response. That is what lets the dashboard tell a confirmed balance from a
     * carried-over one without another flag.
     */
    paySummary: CustomerPaySummary | null;
    isPaySummaryLoading: boolean;
    soaRecords: any[];
    invoiceRecords: any[];
    paymentRecords: Payment[];
    serviceChargeRecords: ServiceChargeRecord[];
    /** The whole batch — the primary record and every secondary list — is still in flight. */
    isLoading: boolean;
    /**
     * Only the primary customer-detail request is in flight.
     *
     * Kept separate from isLoading because this is the one that gates anything visible:
     * the name, plan, account no and balance all come from that single response, so the
     * page has everything it needs to stop showing skeletons long before the six
     * secondary lists have landed. Gating the balance on isLoading meant a slow
     * service-charge call — data this page never renders — kept the amount due
     * shimmering.
     */
    isDetailLoading: boolean;
    isPaymentsLoading: boolean;
    isInvoicesLoading: boolean;
    isSoaLoading: boolean;
    isServiceChargesLoading: boolean;
    /**
     * What is in the store was restored from the last-known snapshot in localStorage
     * and has not been confirmed against the server yet. Safe to display; not safe to
     * act on — the dashboard keeps Pay Now disabled while this is set, so nobody is
     * charged against a balance that may have moved since.
     */
    isFromCache: boolean;
    error: string | null;
    fetchedAccountNo: string | null;
    /**
     * The account the last fetch was asked for, set whether or not it succeeded.
     *
     * fetchedAccountNo is only set on success, so after a failed first load there
     * was nothing to retry with and refreshCustomerData became a no-op — the
     * dashboard stayed empty until the customer signed in again.
     */
    requestedAccountNo: string | null;

    fetchCustomerData: (usernameOrAccountNo: string, isCustomerRole?: boolean) => Promise<void>;
    refreshCustomerData: () => Promise<void>;
}

const byDateDesc = <T extends { date: string }>(rows: T[]): T[] =>
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const useCustomerDashboardStore = create<CustomerDashboardState>((set, get) => ({
    customerDetail: null,
    paySummary: null,
    isPaySummaryLoading: false,
    soaRecords: [],
    invoiceRecords: [],
    paymentRecords: [],
    serviceChargeRecords: [],
    isLoading: false,
    isDetailLoading: false,
    isPaymentsLoading: false,
    isInvoicesLoading: false,
    isSoaLoading: false,
    isServiceChargesLoading: false,
    isFromCache: false,
    error: null,
    fetchedAccountNo: null,
    requestedAccountNo: null,

    fetchCustomerData: async (usernameOrAccountNo: string, isCustomerRole = true) => {
        const { fetchedAccountNo, isLoading } = get();

        // Prevent refetching for the same user if already loaded
        if (fetchedAccountNo === usernameOrAccountNo || isLoading) return;

        // Put the last-known figures on screen before the first request even goes out,
        // so on a slow connection the page opens with content instead of a skeleton.
        // Only when nothing is in memory yet: a stored snapshot must never overwrite a
        // response already fetched this session.
        if (!get().customerDetail) {
            const cached = readDashboardCache(usernameOrAccountNo);
            if (cached) {
                set({
                    customerDetail: cached.customerDetail,
                    soaRecords: cached.soaRecords,
                    invoiceRecords: cached.invoiceRecords,
                    paymentRecords: cached.paymentRecords,
                    serviceChargeRecords: cached.serviceChargeRecords,
                    isFromCache: true,
                });
            }
        }

        set({
            isLoading: true,
            isDetailLoading: true,
            isPaySummaryLoading: true,
            isPaymentsLoading: true,
            isInvoicesLoading: true,
            isSoaLoading: true,
            isServiceChargesLoading: true,
            error: null,
            requestedAccountNo: usernameOrAccountNo,
        });

        // Every in-flight flag has to come down on a bail-out too, or the page keeps
        // waiting on requests that are never going to be made.
        const settle = (patch: Partial<CustomerDashboardState>) =>
            set({
                ...patch,
                isLoading: false,
                isDetailLoading: false,
                isPaymentsLoading: false,
                isInvoicesLoading: false,
                isSoaLoading: false,
                isServiceChargesLoading: false,
            });

        // Started BEFORE the detail request is awaited, so the two are concurrent. This is
        // the whole point: the balance arrives on the short request instead of behind the
        // long one, and Pay Now unlocks as soon as it does.
        const paySummaryDone = getCustomerPaySummary(usernameOrAccountNo)
            .then((summary) => {
                // isFromCache clears here too. Whichever of the two responses lands first
                // has confirmed the figure the flag exists to guard, so the card should
                // stop labelling it as carried over from the last visit.
                set(summary
                    ? { paySummary: summary, isPaySummaryLoading: false, isFromCache: false }
                    : { isPaySummaryLoading: false });
            })
            .catch(() => {
                set({ isPaySummaryLoading: false });
            });

        let detail: CustomerDetailData | null = null;
        try {
            detail = await getCustomerDetail(usernameOrAccountNo);
        } catch (err: any) {
            console.error('Failed to fetch customer dashboard data:', err);
            await paySummaryDone;
            settle({ error: err?.message || 'Error loading dashboard data' });
            return;
        }

        if (!detail || !detail.billingAccount) {
            await paySummaryDone;
            settle({ error: 'Customer billing details not found' });
            return;
        }

        // Publish the primary record on its own, the moment it arrives. Everything the
        // header, profile card and balance card render lives in this one response, so
        // the customer sees their real name, plan and amount due one round trip in
        // rather than waiting on the six list calls below. isFromCache clears here:
        // from this point what is on screen is server-confirmed.
        set({ customerDetail: detail, isDetailLoading: false, isFromCache: false });

        const accNo = detail.billingAccount.accountNo;
        const billingId = detail.billingAccount.id;

        // The secondary payloads are requested together but published separately, each
        // as soon as its own request lands. They used to share one Promise.all barrier
        // and a single set() at the very end, which let the slowest of the six decide
        // when *any* of them appeared.
        const invoices = (isCustomerRole
            ? invoiceService.getInvoicesByAccountNo(accNo)
            : invoiceService.getInvoicesByAccount(billingId))
            .catch(() => [])
            .then((invoiceRes) => {
                set({ invoiceRecords: invoiceRes || [], isInvoicesLoading: false });
            });

        const soa = (isCustomerRole
            ? soaService.getStatementsByAccountNo(accNo)
            : soaService.getStatementsByAccount(billingId))
            .catch(() => [])
            .then((soaRes) => {
                set({ soaRecords: soaRes || [], isSoaLoading: false });
            });

        // Payments are one list assembled from two sources, so these two do have to
        // meet before the merged result can be published.
        const payments = Promise.all([
            paymentPortalLogsService.getLogsByAccountNo(accNo).catch(() => []),
            transactionService.getTransactionsByAccountNo(accNo).catch(() => ({ success: false, data: [] })),
        ]).then(([logsRes, txRes]) => {
            // Process Payments
            const formattedLogs: Payment[] = Array.isArray(logsRes) ? logsRes.map((l: any) => ({
                id: `log-${l.id}`,
                date: l.date_time,
                reference: l.reference_no,
                amount: parseFloat(l.total_amount),
                source: 'Online',
                status: l.status || 'Success'
            })) : [];

            let formattedTxs: Payment[] = [];
            if (txRes && txRes.success && Array.isArray(txRes.data)) {
                formattedTxs = txRes.data
                    .map((t: any) => ({
                        id: `tx-${t.id}`,
                        date: t.payment_date || t.created_at,
                        reference: t.or_no || t.reference_no || `TR-${t.id}`,
                        amount: parseFloat(t.received_payment || t.amount || 0),
                        source: 'Manual',
                        status: 'Computed'
                    }));
            }

            set({
                paymentRecords: byDateDesc([...formattedLogs, ...formattedTxs]),
                isPaymentsLoading: false,
            });
        });

        // Same for service charges: manual charge logs and the charges carried on
        // service orders are shown as one list.
        const serviceCharges = Promise.all([
            serviceChargeService.getServiceChargeLogsByAccountNo(accNo).catch(() => []),
            serviceChargeService.getServiceOrdersByAccountNo(accNo).catch(() => []),
        ]).then(([serviceChargeLogsRes, serviceOrdersRes]) => {
            // Process Service Charges
            const formattedServiceChargeLogs: ServiceChargeRecord[] = Array.isArray(serviceChargeLogsRes) ? serviceChargeLogsRes.map((l: any) => ({
                id: `log-${l.id}`,
                date: l.created_at,
                amount: parseFloat(l.service_charge),
                type: 'Manual Charge',
                status: l.status || 'Unused',
                remarks: l.remarks,
                source: 'Log'
            })) : [];

            const formattedServiceOrderCharges: ServiceChargeRecord[] = Array.isArray(serviceOrdersRes) ? serviceOrdersRes
                .filter((so: any) => parseFloat(so.service_charge) > 0)
                .map((so: any) => ({
                    id: `so-${so.id}`,
                    date: so.created_at || so.timestamp,
                    amount: parseFloat(so.service_charge),
                    type: so.concern || 'Service Order',
                    status: so.status === 'used' ? 'Used' : 'Unused',
                    remarks: so.concern_remarks,
                    source: 'Order'
                })) : [];

            set({
                serviceChargeRecords: byDateDesc([...formattedServiceChargeLogs, ...formattedServiceOrderCharges]),
                isServiceChargesLoading: false,
            });
        });

        // Every list is already on screen by this point; awaiting them here only keeps
        // the promise honest for callers that await fetchCustomerData and then read the
        // store expecting a complete result.
        await Promise.all([paySummaryDone, invoices, soa, payments, serviceCharges]);

        set({ fetchedAccountNo: usernameOrAccountNo, isLoading: false });

        // Written last, from what actually landed, so the next page load starts from
        // this rather than from an empty screen.
        const loaded = get();
        writeDashboardCache(usernameOrAccountNo, {
            customerDetail: loaded.customerDetail,
            soaRecords: loaded.soaRecords,
            invoiceRecords: loaded.invoiceRecords,
            paymentRecords: loaded.paymentRecords,
            serviceChargeRecords: loaded.serviceChargeRecords,
        });
    },

    refreshCustomerData: async () => {
        // Falls back to the requested account so this can also recover a load that
        // failed outright, which is the case that used to need a fresh sign-in.
        const { fetchedAccountNo, requestedAccountNo } = get();
        const target = fetchedAccountNo || requestedAccountNo;
        if (target) {
            set({ fetchedAccountNo: null }); // Clear cached ID to force refresh
            await get().fetchCustomerData(target);
        }
    }
}));
