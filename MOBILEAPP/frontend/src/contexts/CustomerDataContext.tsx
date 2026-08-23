import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomerDetail, getCustomerPaySummary, CustomerDetailData, CustomerPaySummary } from '../services/customerDetailService';
import apiClient from '../config/api';
import { readDashboardCache, writeDashboardCache } from '../utils/customerDashboardCache';

interface PaymentRecord {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: 'Online' | 'Manual';
    status?: string;
}

interface SOARecord {
    id: number;
    statement_date?: string;
    statement_no?: string;
    print_link?: string;
    total_amount_due?: number;
}

interface InvoiceRecord {
    id: number;
    invoice_date?: string;
    invoice_balance?: number;
    due_date?: string;
    status?: string;
    print_link?: string;
}

interface ServiceOrderRecord {
    id: string;
    date: string;
    rawTimestamp: string | null;
    requestId: string;
    issue: string;
    issueDetails: string;
    status: string;
    statusNote: string;
    assignedEmail: string;
    visitNote: string;
    visitInfo: { status: string };
}

interface CustomerDataContextType {
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
    /**
     * What is on screen came from the stored snapshot and has not been confirmed against
     * the server yet. Safe to display; not safe to act on.
     */
    isFromCache: boolean;
    payments: PaymentRecord[];
    soaRecords: SOARecord[];
    invoiceRecords: InvoiceRecord[];
    serviceOrders: ServiceOrderRecord[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    silentRefresh: () => Promise<void>;
    lastUpdated: Date | null;
}

const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

export const useCustomerDataContext = () => {
    const context = useContext(CustomerDataContext);
    if (!context) {
        throw new Error('useCustomerDataContext must be used within a CustomerDataProvider');
    }
    return context;
};

export const CustomerDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);
    const [paySummary, setPaySummary] = useState<CustomerPaySummary | null>(null);
    const [isPaySummaryLoading, setIsPaySummaryLoading] = useState<boolean>(true);
    const [isFromCache, setIsFromCache] = useState<boolean>(false);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [soaRecords, setSoaRecords] = useState<SOARecord[]>([]);
    const [invoiceRecords, setInvoiceRecords] = useState<InvoiceRecord[]>([]);
    const [serviceOrders, setServiceOrders] = useState<ServiceOrderRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Use a ref for the guard check so fetchData doesn't need customerDetail as a dependency.
    // This prevents a new fetchData/silentRefresh from being created on every data update,
    // which was causing DashboardCustomer to remount and lose its modal state.
    const customerDetailRef = React.useRef<CustomerDetailData | null>(null);

    // Set only by a server response, never by a restored snapshot. customerDetailRef is
    // the "do we have something to show?" guard; this is the "has the server actually
    // answered?" one, and the retry loop needs the second.
    const confirmedRef = React.useRef<boolean>(false);

    /**
     * Load the signed-in customer's data.
     *
     * Returns whether there is nothing left to load — either it succeeded, or the
     * viewer is not a customer and never had anything to fetch. False means "try
     * again": no stored session yet, or the request failed. getCustomerDetail
     * swallows every error into null, so this return value is the only signal a
     * caller gets.
     */
    const runFetch = useCallback(async (force = false, silent = false): Promise<boolean> => {
        if (!force && confirmedRef.current) return true;

        if (!silent) setIsLoading(true);

        try {
            const storedUser = await AsyncStorage.getItem('authData');
            if (!storedUser) {
                setIsPaySummaryLoading(false);
                return false;
            }

            const parsedUser = JSON.parse(storedUser);
            if (!parsedUser.username) {
                setIsPaySummaryLoading(false);
                return false;
            }

            // Only fetch customer details if the user role is 'customer'
            const role = (parsedUser.role || '').toLowerCase();
            const roleId = Number(parsedUser.role_id);
            const isCustomer = role === 'customer' || roleId === 3;
            if (!isCustomer) {
                setIsLoading(false);
                setIsPaySummaryLoading(false);
                return true;
            }

            // Put the last visit's figures on screen before any request goes out. On a cold
            // start — which on a phone is the common case, not the rare one — this is the
            // difference between opening on content and opening on skeletons. Only when
            // nothing is in memory yet: a stored snapshot must never overwrite a response
            // already fetched this session.
            if (!customerDetailRef.current) {
                const cached = await readDashboardCache(parsedUser.username);
                if (cached && !customerDetailRef.current) {
                    customerDetailRef.current = cached.customerDetail;
                    setCustomerDetail(cached.customerDetail);
                    setPayments(cached.payments);
                    setSoaRecords(cached.soaRecords);
                    setInvoiceRecords(cached.invoiceRecords);
                    setIsFromCache(true);
                }
            }

            // Started BEFORE the detail request is awaited, so the two are concurrent. This
            // is the point: the balance arrives on the short request instead of behind the
            // long one, and Pay Now unlocks as soon as it does.
            setIsPaySummaryLoading(true);
            const paySummaryDone = getCustomerPaySummary(parsedUser.username)
                .then((summary) => {
                    if (summary) {
                        setPaySummary(summary);
                        // Whichever of the two responses lands first has confirmed the
                        // figure this flag exists to guard, so the card should stop
                        // labelling it as carried over from the last visit.
                        setIsFromCache(false);
                    }
                })
                .catch(() => { /* falls back to the balance on the detail payload */ })
                .finally(() => setIsPaySummaryLoading(false));

            // 1. Fetch Customer Detail
            const detail = await getCustomerDetail(parsedUser.username);
            if (!detail) {
                // The fast request may still land and carry a usable balance, so let it
                // finish before reporting the failure rather than settling over it.
                await paySummaryDone;
                throw new Error('Could not fetch customer details');
            }

            customerDetailRef.current = detail;
            confirmedRef.current = true;
            setCustomerDetail(detail);
            setIsFromCache(false);
            const accNo = detail.billingAccount?.accountNo;

            if (accNo) {
                // 2. Fetch everything else in parallel using correct backend routes
                const [logsRes, txRes, soaRes, invoiceRes, soRes] = await Promise.all([
                    apiClient.get(`/payment-portal-logs/account/${accNo}`).catch((e) => { console.error('Payment logs fetch error:', e); return { data: { data: [] } }; }),
                    apiClient.get(`/transactions/by-account/${accNo}`).catch((e) => { console.error('Transactions fetch error:', e); return { data: { data: [] } }; }),
                    apiClient.get(`/statement-of-accounts/by-account/${accNo}`).catch((e) => { console.error('SOA fetch error:', e); return { data: { data: [] } }; }),
                    apiClient.get(`/invoices/by-account/${accNo}`).catch((e) => { console.error('Invoices fetch error:', e); return { data: { data: [] } }; }),
                    // The account-scoped route, not the `/service-orders` collection: the
                    // collection is staff-only (it needs the `service-order` page key, which
                    // the customer role does not hold) and answered 403 here. by-account
                    // returns the same { data: [...] } shape, already filtered to this account.
                    apiClient.get(`/service-orders/by-account/${accNo}`).catch((e) => { console.error('Service orders fetch error:', e); return { data: { success: false, data: [] } }; })
                ]);

                // Process Payment Portal Logs
                const logsData = logsRes?.data?.data || [];
                const formattedLogs: PaymentRecord[] = Array.isArray(logsData) ? logsData.map((l: any) => ({
                    id: `log-${l.id}`,
                    date: l.date_time,
                    reference: l.reference_no,
                    amount: parseFloat(l.total_amount) || 0,
                    source: 'Online' as const,
                    status: l.status
                })) : [];

                // Process Transactions
                const txData = txRes?.data?.data || [];
                const formattedTxs: PaymentRecord[] = Array.isArray(txData) ? txData.map((t: any) => ({
                    id: `tx-${t.id}`,
                    date: t.payment_date || t.created_at,
                    reference: t.or_no || t.reference_no || `TR-${t.id}`,
                    amount: parseFloat(t.received_payment || t.amount || 0),
                    source: 'Manual' as const,
                    status: t.status || 'Posted'
                })) : [];

                const allPayments = [...formattedLogs, ...formattedTxs].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setPayments(allPayments);
                setSoaRecords(soaRes?.data?.data || []);
                setInvoiceRecords(invoiceRes?.data?.data || []);

                // Process Service Orders
                const soData = soRes?.data?.data || [];
                const mappedOrders: ServiceOrderRecord[] = Array.isArray(soData) ? soData.map((order: any) => ({
                    id: order.id,
                    date: order.created_at ? (() => {
                        const d = new Date(order.created_at);
                        if (isNaN(d.getTime())) return '';
                        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
                    })() : '',
                    // Preserve the precise submission time for the support cooldown calc.
                    rawTimestamp: order.created_at || null,
                    requestId: order.ticket_id,
                    issue: order.concern || '',
                    issueDetails: order.concern_remarks || '',
                    status: order.support_status || 'Pending',
                    statusNote: order.support_remarks || '',
                    assignedEmail: order.assigned_email || '',
                    visitNote: order.visit_remarks || '',
                    visitInfo: { status: order.visit_status || 'Pending' }
                })) : [];
                setServiceOrders(mappedOrders);

                // Written from the locals that were just published, so the next cold start
                // opens on this instead of on skeletons. Not awaited: it is a local write
                // and nothing on screen is waiting for it.
                writeDashboardCache(parsedUser.username, {
                    customerDetail: detail,
                    payments: allPayments,
                    soaRecords: soaRes?.data?.data || [],
                    invoiceRecords: invoiceRes?.data?.data || [],
                });
            }

            setLastUpdated(new Date());
            setError(null);
            return true;
        } catch (err: any) {
            console.error('Failed to fetch customer data:', err);
            if (!silent) setError(err.message || 'Failed to load data');
            return false;
        } finally {
            setIsLoading(false);
        }
        // Stable dependency array — customerDetailRef.current is used instead of the state
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const inFlightRef = React.useRef<Promise<boolean> | null>(null);

    /**
     * runFetch, but at most one at a time. Callers that arrive while a load is running
     * join it instead of starting a second one.
     *
     * Launch used to fire three overlapping full loads. The provider starts one on mount,
     * and DashboardCustomer's effect is keyed on the account no — which changes twice as it
     * resolves, from 'N/A' to the stored username to the account on the detail response —
     * so it called silentRefresh again each time. Nothing deduplicated them, so the
     * customer's phone opened by requesting the same seven payloads three times over, on
     * the connection this whole change is about.
     *
     * A silent load in progress will absorb a non-silent caller, so a refresh that wanted
     * to show a spinner may not. On the launch path they are all the same work, and doing
     * it once quietly beats doing it three times.
     */
    const fetchData = useCallback((force = false, silent = false): Promise<boolean> => {
        if (inFlightRef.current) return inFlightRef.current;

        const run = runFetch(force, silent).finally(() => { inFlightRef.current = null; });
        inFlightRef.current = run;
        return run;
    }, [runFetch]);

    // A failed first load used to be permanent. This runs once on mount, and
    // getCustomerDetail turns any 401, timeout or dropped connection into a plain
    // null — so one bad moment at launch left customerDetail null for the whole
    // session. Nothing retried it, which is why the dashboard read "No Plan" until
    // the customer signed in again: the fields that still looked right (name,
    // account number) come from stored authData, not from this fetch.
    //
    // So: retry with a widening delay until it lands, and try again whenever the
    // app returns to the foreground, where the connection that failed at launch has
    // usually come back. Retries are silent, so they never flash a spinner over a
    // screen the customer is already reading.
    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let attempt = 0;
        const backoffMs = [2000, 5000, 15000, 30000];

        const attemptLoad = async () => {
            // confirmedRef, not customerDetailRef: a restored snapshot fills the latter in,
            // and treating that as a completed load would stop the retries that are the
            // only thing recovering a launch whose network call failed.
            if (cancelled || confirmedRef.current) return;

            const done = await fetchData(true, attempt > 0);
            if (cancelled || done) return;

            timer = setTimeout(attemptLoad, backoffMs[Math.min(attempt, backoffMs.length - 1)]);
            attempt += 1;
        };

        attemptLoad();

        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active' && !confirmedRef.current) {
                if (timer) clearTimeout(timer);
                attempt = 0;
                attemptLoad();
            }
        });

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
            subscription.remove();
        };
    }, [fetchData]);

    const refreshData = useCallback(async () => { await fetchData(true, false); }, [fetchData]);
    const silentRefresh = useCallback(async () => { await fetchData(true, true); }, [fetchData]);

    return (
        <CustomerDataContext.Provider
            value={{
                customerDetail,
                paySummary,
                isPaySummaryLoading,
                isFromCache,
                payments,
                soaRecords,
                invoiceRecords,
                serviceOrders,
                isLoading,
                error,
                refreshData,
                silentRefresh,
                lastUpdated
            }}
        >
            {children}
        </CustomerDataContext.Provider>
    );
};
