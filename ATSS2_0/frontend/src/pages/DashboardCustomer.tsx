import React, { useState, useEffect, useMemo } from 'react';
import { User, Activity, Clock, Users, CreditCard, HelpCircle, FileText, CheckCircle, XCircle } from 'lucide-react';
import { getCustomerDetail, CustomerDetailData } from '../services/customerDetailService';
import { transactionService } from '../services/transactionService';
import { paymentPortalLogsService } from '../services/paymentPortalLogsService';
import { paymentService, PendingPayment } from '../services/paymentService'; // Import paymentService
import { useCustomerDashboardStore } from '../store/customerDashboardStore';
import { settingsColorPaletteService, getCachedActivePalette, ColorPalette } from '../services/settingsColorPaletteService';
import pusher from '../services/pusherService';

// Interfaces for data types
interface Payment {
    id: string;
    date: string;
    reference: string;
    amount: number;
    source: string;
}

interface Referral {
    id: string;
    date: string;
    name: string;
    stage: string;
    status: 'Done' | 'Failed' | 'Scheduled' | 'Pending';
}

/**
 * How long live-update events are batched before one refresh is issued. The Pusher
 * channels this page listens on are system-wide, so bursts are normal and a refresh per
 * event would mean seven requests each time.
 */
const REFRESH_COALESCE_MS = 1500;

interface DashboardCustomerProps {
    onNavigate?: (section: string, tab?: string) => void;
    autoOpenPayModal?: boolean;
}

const DashboardCustomer: React.FC<DashboardCustomerProps> = ({ onNavigate, autoOpenPayModal }) => {
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState('');

    // isDetailLoading rather than isLoading: everything this page shows above the
    // payments list comes from the one customer-detail response, so it must not wait on
    // the SOA and service-charge lists that only Bills renders.
    const {
        customerDetail,
        paySummary,
        isPaySummaryLoading,
        paymentRecords,
        invoiceRecords,
        isDetailLoading,
        isPaymentsLoading,
        isInvoicesLoading,
        isFromCache,
        error: loadError,
        fetchCustomerData,
        refreshCustomerData,
    } = useCustomerDashboardStore();
    const payments = useMemo(() => paymentRecords.slice(0, 4), [paymentRecords]);
    const [referrals, setReferrals] = useState<Referral[]>([]);

    // Payment State
    const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
    const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState<boolean>(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [showPaymentLinkModal, setShowPaymentLinkModal] = useState<boolean>(false);
    const [paymentLinkData, setPaymentLinkData] = useState<{ referenceNo: string; amount: number; paymentUrl: string } | null>(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState<boolean>(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    // Seeded from the stored palette so the page paints in the brand colours on the
    // first frame instead of rendering in the fallback slate and repainting once the
    // request lands.
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(() => getCachedActivePalette());
    const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState<boolean>(false);

    // The signed-in user is read straight out of storage rather than awaited, so the
    // greeting and account no are on screen before any request resolves.
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('authData');
            if (!storedUser) return;

            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            if (parsedUser.username) {
                // Deliberately not awaited: nothing below depends on it, and the store
                // now publishes each slice as it lands rather than in one batch at the end.
                fetchCustomerData(parsedUser.username, true).catch((err) => {
                    console.error('Error fetching dashboard data:', err);
                    setError('Failed to load dashboard data');
                });
            }
        } catch (err) {
            console.error('Error reading stored auth data:', err);
            setError('Failed to load dashboard data');
        }
    }, [fetchCustomerData]);

    useEffect(() => {
        settingsColorPaletteService.getActive()
            .then((activePalette) => {
                if (activePalette) setColorPalette(activePalette);
            })
            .catch((err) => {
                console.error('Failed to fetch color palette:', err);
            });
    }, []);

    // There is deliberately no pending-payment request on load any more. It used to sit
    // behind `await fetchCustomerData`, so it did not even start until all six secondary
    // lists had come back — a whole extra round trip, in series, before the button knew
    // what to call itself. The pay-summary now carries `hasPendingPayment`, which is all
    // the label needs, and handlePayNow re-checks for the payment URL when it is clicked.

    // Handle auto-opening the pay modal (e.g., from Bills page)
    useEffect(() => {
        // Only once the balance is server-confirmed — opening the pay modal against a
        // figure restored from cache would pin the amount to a stale balance. Keyed on the
        // pay-summary like the button itself, so arriving from Bills does not wait on the
        // detail request either.
        //
        // The (customerDetail || paySummary) test also keeps this in step with the
        // early-return below: handlePayNow is declared past it, so it must not be called
        // in a render that bailed out to the skeleton.
        if (autoOpenPayModal && (customerDetail || paySummary) && !isPaySummaryLoading && !isFromCache) {
            handlePayNow();
        }
    }, [autoOpenPayModal, isPaySummaryLoading, isFromCache, customerDetail, paySummary]);

    // Real-time updates via Pusher/Soketi
    useEffect(() => {
        // refreshCustomerData, not fetchCustomerData: the latter returns immediately once
        // fetchedAccountNo is set, so every live update after the first load was silently
        // dropped. refreshCustomerData clears that marker first, which is what it is for.
        //
        // Coalesced, because these four are system-wide channels rather than per-account
        // ones: this page is told about every transaction, invoice and SOA in the system,
        // not just this customer's. Refreshing on each one would fire seven requests per
        // event from a device that is on the connection this page is being tuned for.
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;

        const handleUpdate = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                refreshCustomerData().catch((err) => {
                    console.error('[DashboardCustomer Soketi] Failed to refresh data:', err);
                });
            }, REFRESH_COALESCE_MS);
        };

        const handlePaymentUpdate = (data: any) => {
            // Show success modal when a webhook confirms payment for this account
            if (data?.action === 'webhook_update' && data?.status === 'QUEUED' && data?.reference_no) {
                const currentAccountNo = customerDetail?.billingAccount?.accountNo;
                if (currentAccountNo && data.reference_no.startsWith(currentAccountNo)) {
                    setShowPaymentSuccessModal(true);
                    setPendingPayment(null);
                }
            }
            handleUpdate();
        };

        const txChannel = pusher.subscribe('transactions');
        const invChannel = pusher.subscribe('invoices');
        const soaChannel = pusher.subscribe('soa');
        const payChannel = pusher.subscribe('payments');

        txChannel.bind('transaction-updated', handleUpdate);
        invChannel.bind('invoice-updated', handleUpdate);
        soaChannel.bind('soa-updated', handleUpdate);
        payChannel.bind('payment-updated', handlePaymentUpdate);

        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            txChannel.unbind('transaction-updated', handleUpdate);
            invChannel.unbind('invoice-updated', handleUpdate);
            soaChannel.unbind('soa-updated', handleUpdate);
            payChannel.unbind('payment-updated', handlePaymentUpdate);
            pusher.unsubscribe('transactions');
            pusher.unsubscribe('invoices');
            pusher.unsubscribe('soa');
            pusher.unsubscribe('payments');
        };
    }, [refreshCustomerData, customerDetail?.billingAccount?.accountNo]);

    // Derived here, above the loading early-return below, so the Pay Now sync hook that
    // depends on them keeps a fixed position in the hook order (react-hooks/rules-of-hooks).
    // The pay-summary first, the full detail only as a fallback for when that request
    // fails. Losing the fast path should cost speed, not the ability to pay.
    const rawBalance = paySummary
        ? paySummary.accountBalance
        : customerDetail?.billingAccount?.accountBalance;
    const balance = Number(rawBalance) || 0;

    // Is the balance actually known? A settled account legitimately reads 0, so only a
    // missing/unparsable value counts as "not loaded yet" — otherwise a delayed response
    // renders a confident ₱0 that is simply wrong.
    const balanceKnown = rawBalance !== null && rawBalance !== undefined
        && String(rawBalance).trim() !== '' && !isNaN(Number(rawBalance));

    // Showing a figure and charging against it are different bars. A balance restored
    // from the last visit is worth reading — it is what the customer owed as of then,
    // and far better than a shimmer on a slow connection — but it may have moved since,
    // so Pay Now stays locked until the server has confirmed it.
    //
    // Gated on the pay-summary alone, deliberately not on the detail request as well —
    // making the button wait for that too would throw away the reason the two were split.
    // It used to wait on `!isLoading`, the whole seven-request batch, so a slow
    // service-charge or SOA call (data this page never renders) kept the amount due
    // shimmering and the button reading LOADING.
    const balanceConfirmed = balanceKnown && !isPaySummaryLoading && !isFromCache;

    // Still on the restored snapshot after the request has finished, which means it did
    // not land. Worth distinguishing from "still arriving": without it the card sits on a
    // cached figure saying it is checking for updates, and Pay Now never comes back — a
    // dead end that looks like a working page.
    const revalidateInFlight = isFromCache && isPaySummaryLoading;
    const revalidateFailed = isFromCache && !isPaySummaryLoading;

    // The other failure: no snapshot to fall back on either, so there is nothing to show
    // at all. This used to leave the card shimmering and the button reading LOADING for
    // good, with no way to try again short of reloading the page.
    const loadFailedOutright = !!loadError && !balanceKnown;

    // The summary's flag is what labels the button on load; the fuller pendingPayment
    // object only exists once Pay Now has been clicked and fetched the payment URL.
    const hasPendingPayment = !!pendingPayment?.payment_url || !!paySummary?.hasPendingPayment;

    // An outstanding (positive) balance must be settled in full, so Pay Now is pinned to the
    // balance and locked. At zero or on a credit balance the customer chooses the amount.
    const isBalancePositive = balance > 0;

    // Keep Pay Now aligned with the balance whenever it changes — first load, a manual
    // refresh, or a live Pusher balance update — so the locked field is never stale.
    useEffect(() => {
        if (isBalancePositive) {
            setPaymentAmount(balance);
        }
    }, [balance, isBalancePositive]);

    // Nothing to show at all — neither response has landed and there is no snapshot from
    // a previous visit. Mirrors the real grid below (greeting, profile card left, balance
    // and lists right) so that when the data lands it fills the boxes already on screen
    // instead of reflowing the page under the customer.
    //
    // paySummary counts as something to show, and that matters: it is the faster of the
    // two requests, so gating this on customerDetail alone would keep the skeleton up
    // over a balance that had already arrived — throwing away the entire point of
    // splitting them.
    const showFullSkeleton = !customerDetail && !paySummary && (isDetailLoading || isPaySummaryLoading);
    if (showFullSkeleton) return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans" aria-busy="true" aria-label="Loading dashboard">
            <div className="mb-8">
                <div className="h-8 w-56 rounded bg-gray-200 animate-pulse" />
                <div className="mt-2 h-4 w-64 rounded bg-gray-100 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto animate-pulse" />
                        <div className="mx-auto mt-6 h-5 w-40 rounded bg-gray-200 animate-pulse" />
                        <div className="mx-auto mt-2 h-4 w-28 rounded bg-gray-100 animate-pulse" />
                        <div className="mt-8 space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex justify-between border-b border-gray-50 pb-3">
                                    <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
                                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 space-y-3">
                            <div className="h-12 w-full rounded-full bg-gray-100 animate-pulse" />
                            <div className="h-12 w-full rounded-full bg-gray-100 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Balance card and lists */}
                <div className="lg:col-span-2 space-y-8">
                    <div
                        className="rounded-3xl p-8 md:p-12 text-center"
                        style={{ background: `linear-gradient(135deg, ${colorPalette?.primary || '#0f172a'} 0%, #000000 100%)` }}
                    >
                        <div className="mx-auto h-3 w-40 rounded bg-white/20 animate-pulse" />
                        <div className="mx-auto mt-4 h-12 md:h-16 w-56 md:w-72 rounded-2xl bg-white/25 animate-pulse" />
                        <div className="mx-auto mt-4 h-3 w-64 rounded bg-white/20 animate-pulse" />
                        <div className="mt-8 flex justify-center gap-4">
                            <div className="h-12 w-36 rounded-full bg-white/25 animate-pulse" />
                            <div className="h-12 w-36 rounded-full bg-white/10 animate-pulse" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
                        </div>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0">
                                <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                                <div className="h-4 w-36 rounded bg-gray-100 animate-pulse hidden md:block" />
                                <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Done': return 'bg-green-100 text-green-600 border border-green-200';
            case 'Failed': return 'bg-red-100 text-red-600 border border-red-200';
            case 'Scheduled': return 'bg-yellow-100 text-yellow-600 border border-yellow-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    // Use detailed data if available, otherwise fall back to auth data or placeholders
    const displayName = customerDetail?.fullName || user?.full_name || 'Customer';
    const accountNo = paySummary?.accountNo || customerDetail?.billingAccount?.accountNo || user?.username || 'N/A';
    // "No Plan", "No Address" and "Pending" are all claims about the account, so none of
    // them is said until the record is here. Every customer in the database has a plan and
    // an address, so a blank one meant the fetch had not landed — while the fields around
    // them still looked right because they fall back to the stored session rather than to
    // this record.
    //
    // This matters more than it used to: the balance now arrives on its own request, so
    // the page legitimately renders before the detail response, and these three would
    // otherwise spend that window stating things that are not true.
    const detailKnown = !!customerDetail;
    const planName = customerDetail?.desiredPlan || 'No Plan';
    const address = customerDetail?.address || 'No Address';
    const installationDate = customerDetail?.billingAccount?.dateInstalled || 'Pending';
    // balance / isBalancePositive are derived above the early-return further up this component.

    // Due Date: the latest invoice's due_date (not recalculated from billingDay).
    //
    // Taken from the pay-summary when it is there — the server reads it off the newest
    // invoice with the same ordering the list uses, so it is the same date, one row
    // instead of the account's entire invoice history. The list stays as the fallback.
    //
    // "Upon Receipt" is a real answer for an account with no invoice, which is exactly why
    // it must not be asserted while the source is still on its way.
    const rawDueDate = paySummary
        ? paySummary.dueDate
        : (invoiceRecords.length > 0 ? invoiceRecords[0].due_date : null);
    const dueDateKnown = !!paySummary || !isInvoicesLoading || invoiceRecords.length > 0;
    let dueDateString = 'Upon Receipt';
    if (rawDueDate) {
        const parsed = new Date(rawDueDate);
        if (!isNaN(parsed.getTime())) {
            dueDateString = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }

    // Restriction logic removed as requested

    // Payment Handlers
    const handlePayNow = async () => {

        setErrorMessage('');
        setIsPaymentProcessing(true);

        try {
            // Check for pending payments
            const pending = await paymentService.checkPendingPayment(accountNo);

            if (pending && pending.payment_url) {
                setPendingPayment(pending);
                setShowPendingPaymentModal(true);
            } else {
                setPaymentAmount(Math.abs(balance));
                setShowPaymentVerifyModal(true);
            }
        } catch (error: any) {
            console.error('Error checking pending payment:', error);
            setPaymentAmount(Math.abs(balance));
            setShowPaymentVerifyModal(true);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleCloseVerifyModal = () => {
        setShowPaymentVerifyModal(false);
        setPaymentAmount(balance);
    };

    const handleProceedToCheckout = async () => {
        if (paymentAmount < balance) {
            setErrorMessage(`Payment amount cannot be lower than your current balance of ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
            return;
        }

        if (paymentAmount < 1) {
            setErrorMessage('Payment amount must be at least ₱1.00');
            return;
        }

        if (isPaymentProcessing) return;

        setIsPaymentProcessing(true);
        setErrorMessage('');

        try {
            const response = await paymentService.createPayment(accountNo, paymentAmount);

            if (response.status === 'success' && response.payment_url) {
                setShowPaymentVerifyModal(false);
                setPaymentLinkData({
                    referenceNo: response.reference_no || '',
                    amount: response.amount || paymentAmount,
                    paymentUrl: response.payment_url
                });
                setShowPaymentLinkModal(true);
            } else {
                throw new Error(response.message || 'Failed to create payment link');
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            setErrorMessage(error.message || 'Failed to create payment. Please try again.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handleOpenPaymentLink = () => {
        if (paymentLinkData?.paymentUrl) {
            window.open(paymentLinkData.paymentUrl, '_blank');
            setShowPaymentLinkModal(false);
            setPaymentLinkData(null);
        }
    };

    const handleCancelPaymentLink = () => {
        setShowPaymentLinkModal(false);
        setPaymentLinkData(null);
    };

    const handleResumePendingPayment = () => {
        if (pendingPayment && pendingPayment.payment_url) {
            window.open(pendingPayment.payment_url, '_blank');
            setShowPendingPaymentModal(false);
            setPendingPayment(null);
        }
    };

    const handleClosePendingPaymentModal = () => {
        setErrorMessage('');
        setShowPendingPaymentModal(false);
        setPendingPayment(null);
    };

    const handleCancelPendingPaymentFromDb = async () => {
        if (!pendingPayment) return;
        setIsPaymentProcessing(true);
        setErrorMessage('');
        try {
            const response = await paymentService.cancelPayment(pendingPayment.reference_no);
            if (response.status === 'success') {
                setPendingPayment(null);
                setShowPendingPaymentModal(false);
            } else {
                throw new Error(response.message || 'Failed to cancel payment');
            }
        } catch (error: any) {
            console.error('Cancel payment error:', error);
            setErrorMessage(error.message || 'Failed to cancel payment. Please try again.');
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans relative">
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Hello, {displayName.split(' ')[0]}!</h1>
                <p className="text-gray-500 mt-1">Welcome back to your dashboard.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
                        <div className="relative inline-block mb-4">
                            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                                <User className="w-12 h-12 text-gray-400" />
                            </div>
                            <div className="absolute -bottom-2 transform -translate-x-1/2 left-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                                Active
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mt-4">{displayName}</h2>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{accountNo}</p>

                        <div className="mt-8 space-y-4 text-left">
                            <div className="flex justify-between border-b border-gray-50 pb-3">
                                <span className="text-gray-400 text-sm">Plan</span>
                                {detailKnown ? (
                                    <span className="text-gray-900 font-bold text-sm uppercase">{planName}</span>
                                ) : (
                                    <span className="h-4 w-24 rounded bg-gray-200 animate-pulse" aria-label="Loading" />
                                )}
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-3">
                                <span className="text-gray-400 text-sm">Installed</span>
                                {detailKnown ? (
                                    <span className="text-gray-900 font-bold text-sm">{installationDate}</span>
                                ) : (
                                    <span className="h-4 w-20 rounded bg-gray-200 animate-pulse" aria-label="Loading" />
                                )}
                            </div>
                            <div className="flex justify-between pb-3">
                                <span className="text-gray-400 text-sm">Location</span>
                                {detailKnown ? (
                                    <span className="text-gray-900 font-bold text-sm text-right">{address}</span>
                                ) : (
                                    <span className="h-4 w-28 rounded bg-gray-200 animate-pulse" aria-label="Loading" />
                                )}
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={() => onNavigate?.('customer-bills')}
                                className="w-full flex items-center justify-center space-x-2 py-3 border rounded-full font-semibold hover:bg-gray-50 transition"
                                style={{ borderColor: colorPalette?.primary || '#0f172a', color: colorPalette?.primary || '#0f172a' }}
                            >
                                <FileText className="w-4 h-4" />
                                <span>My Bills</span>
                            </button>
                            <button
                                onClick={() => onNavigate?.('customer-support')}
                                className="w-full flex items-center justify-center space-x-2 py-3 border rounded-full font-semibold hover:bg-gray-50 transition"
                                style={{ borderColor: colorPalette?.primary || '#0f172a', color: colorPalette?.primary || '#0f172a' }}
                            >
                                <HelpCircle className="w-4 h-4" />
                                <span>Help & Support</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Balance & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Balance Card */}
                    <div className="rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colorPalette?.primary || '#0f172a'} 0%, #000000 100%)` }}>
                        <h3 className="text-white text-sm font-medium tracking-wide uppercase mb-2 opacity-80">Total Amount Due</h3>
                        {balanceKnown && revalidateFailed ? (
                            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80" role="status">
                                <span>Couldn't reach the server — showing your last known balance.</span>
                                <button
                                    onClick={() => { refreshCustomerData(); }}
                                    className="underline font-medium hover:text-white"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : balanceKnown && !balanceConfirmed ? (
                            <div className="mb-2 text-xs text-white/70" role="status">
                                {revalidateInFlight ? 'Last known balance — checking for updates…' : 'Updating…'}
                            </div>
                        ) : null}
                        {balanceKnown ? (
                            <div className="text-5xl md:text-6xl font-bold mb-4">₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                        ) : loadFailedOutright ? (
                            <div className="mb-4" role="alert">
                                <div className="text-2xl md:text-3xl font-bold">Balance unavailable</div>
                                <button
                                    onClick={() => { refreshCustomerData(); }}
                                    className="mt-2 text-xs underline text-white/80 hover:text-white"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <div className="mb-4 flex justify-center" aria-busy="true" aria-label="Loading total amount due">
                                <div className="h-12 md:h-16 w-56 md:w-72 rounded-2xl bg-white/25 animate-pulse" />
                            </div>
                        )}
                        <div className="text-white text-sm mb-8 flex items-center justify-center space-x-2 opacity-90">
                            <span>Reference: <span className="text-white font-medium">{accountNo}</span></span>
                            {/* Due date could come from SOA service ideally */}
                            <span>|</span>
                            <span>Due: {dueDateKnown
                                ? <span className="text-white">{dueDateString}</span>
                                : <span className="inline-block h-3 w-20 align-middle rounded bg-white/25 animate-pulse" />}</span>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handlePayNow}
                                disabled={isPaymentProcessing || !balanceConfirmed}
                                className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center leading-tight"
                                style={{ color: colorPalette?.primary || '#0f172a' }}
                            >
                                <span>{!balanceKnown
                                    ? (loadFailedOutright ? 'UNAVAILABLE' : 'LOADING')
                                    : !balanceConfirmed
                                        ? 'UPDATING'
                                        : isPaymentProcessing
                                            ? 'Processing'
                                            : hasPendingPayment ? 'PROCEED PAYMENT' : 'PAY NOW'}</span>
                            </button>
                            <button
                                onClick={() => onNavigate?.('customer-bills', 'payments')}
                                className="bg-transparent border border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white/10 transition min-w-[140px]"
                            >
                                History
                            </button>
                        </div>
                    </div>

                    {/* Recent Payments - Still Mocked for Now */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
                            <Clock className="w-5 h-5" style={{ color: colorPalette?.primary || '#0f172a' }} />
                            <h3 className="font-bold" style={{ color: colorPalette?.primary || '#0f172a' }}>Recent Payments</h3>
                        </div>
                        <div>
                            {payments.length === 0 && isPaymentsLoading ? (
                                // Still fetching. "No payment history found." is a statement
                                // about the account and would be a guess at this point — an
                                // account with payments showed it every load until the list
                                // arrived.
                                [0, 1, 2].map((i) => (
                                    <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0" aria-busy="true">
                                        <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                                        <div className="h-4 w-36 rounded bg-gray-100 animate-pulse hidden md:block" />
                                        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                                    </div>
                                ))
                            ) : payments.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No payment history found.</div>
                            ) : (
                                payments.map((payment) => (
                                    <div key={payment.id} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                        <div className="text-sm text-gray-500">{payment.date}</div>
                                        <div className="text-sm font-mono text-gray-600 hidden md:block">{payment.reference}</div>
                                        <div className="text-sm font-bold text-green-600">+ ₱{payment.amount.toFixed(2)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* My Referrals - Still Mocked for Now */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <Users className="w-5 h-5" style={{ color: colorPalette?.primary || '#0f172a' }} />
                                <h3 className="font-bold" style={{ color: colorPalette?.primary || '#0f172a' }}>My Referrals</h3>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-6">Date</th>
                                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-6">Name</th>
                                        <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-6">Stage</th>
                                        <th className="text-right text-xs font-bold text-gray-500 uppercase tracking-wider py-3 px-6">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {referrals.slice(0, 4).map((referral) => (
                                        <tr key={referral.id}>
                                            <td className="py-4 px-6 text-sm text-gray-500">{referral.date}</td>
                                            <td className="py-4 px-6 text-sm font-bold text-gray-900">{referral.name}</td>
                                            <td className="py-4 px-6 text-sm">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                                    {referral.stage}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-right">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(referral.status)}`}>
                                                    {referral.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>


            {/* PAYMENT VERIFY MODAL */}
            {
                showPaymentVerifyModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-900 text-center">Confirm Payment</h3>
                            </div>
                            <div className="p-6">
                                <div className="bg-gray-100 p-4 rounded mb-4">
                                    <div className="flex justify-between mb-2 text-gray-700">
                                        <span>Account:</span>
                                        <span className="font-bold">{displayName}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-700">
                                        <span>Current Balance:</span>
                                        <span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {errorMessage && (
                                    <div className="bg-red-50 p-3 rounded mb-4 border border-red-200">
                                        <p className="text-red-500 text-sm text-center">{errorMessage}</p>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block font-bold mb-2 text-gray-700">Payment Amount</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={paymentAmount || ''}
                                        readOnly={isBalancePositive}
                                        onChange={(e) => {
                                            // Locked to the outstanding balance; ignore any edit attempt.
                                            if (isBalancePositive) return;

                                            const value = e.target.value;
                                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                const newAmount = value === '' ? 0 : parseFloat(value) || 0;
                                                setPaymentAmount(newAmount);

                                                if (newAmount > 0 && newAmount < balance) {
                                                    setErrorMessage(`Payment amount cannot be lower than your balance of ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
                                                } else if (newAmount > 0 && newAmount < 1) {
                                                    setErrorMessage('Payment amount must be at least ₱1.00');
                                                } else {
                                                    setErrorMessage('');
                                                }
                                            }
                                        }}
                                        placeholder="0.00"
                                        className={`w-full px-4 py-3 rounded text-lg font-bold border ${paymentAmount > 0 && (paymentAmount < balance || paymentAmount < 1) ? 'border-red-500 ring-red-500' : 'border-gray-300'
                                            } ${isBalancePositive ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'text-gray-900'} focus:outline-none focus:ring-2`}
                                        style={{ '--tw-ring-color': paymentAmount > 0 && (paymentAmount < balance || paymentAmount < 1) ? '#ef4444' : (colorPalette?.primary || '#0f172a') } as React.CSSProperties}
                                    />
                                    <div className="text-sm text-right mt-1 text-gray-500">
                                        {isBalancePositive ? (
                                            <span>Outstanding: ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })} &mdash; full amount required</span>
                                        ) : (
                                            <span>Minimum: ₱1.00</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCloseVerifyModal}
                                        disabled={isPaymentProcessing}
                                        className="flex-1 px-4 py-3 rounded font-bold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleProceedToCheckout}
                                        disabled={!balanceConfirmed || isPaymentProcessing || (paymentAmount > 0 && paymentAmount < balance) || paymentAmount < 1}
                                        className="flex-1 px-4 py-3 rounded font-bold text-white transition-colors disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${colorPalette?.primary || '#0f172a'} 0%, #000000 100%)` }}
                                    >
                                        {isPaymentProcessing ? 'Processing...' : 'Proceed to Pay'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PAYMENT LINK MODAL */}
            {
                showPaymentLinkModal && paymentLinkData && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
                            <div className="p-6 border-b border-gray-200">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Payment Link Created!</h3>
                                <p className="text-gray-500 mt-2">Reference: {paymentLinkData.referenceNo}</p>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-6">
                                    Please click the button below to complete your payment of
                                    <span className="font-bold text-gray-900"> ₱{paymentLinkData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </p>
                                <button
                                    onClick={handleOpenPaymentLink}
                                    className="w-full px-4 py-3 rounded font-bold bg-green-600 text-white hover:bg-green-700 transition-colors mb-3"
                                >
                                    Open Payment Portal
                                </button>
                                <button
                                    onClick={handleCancelPaymentLink}
                                    className="text-gray-500 underline text-sm hover:text-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PENDING PAYMENT MODAL */}
            {
                showPendingPaymentModal && pendingPayment && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
                            <div className="p-6 border-b border-gray-200">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                                    <Activity className="h-6 w-6 text-yellow-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Pending Payment Found</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-6">
                                    You have a pending payment of
                                    <span className="font-bold text-gray-900"> ₱{pendingPayment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>.
                                    Would you like to complete it?
                                </p>
                                
                                {errorMessage && (
                                    <div className="bg-red-50 p-3 rounded mb-4 border border-red-200">
                                        <p className="text-red-500 text-sm text-center">{errorMessage}</p>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleClosePendingPaymentModal}
                                        disabled={isPaymentProcessing}
                                        className="sm:flex-1 px-4 py-3 rounded font-bold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors disabled:opacity-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleCancelPendingPaymentFromDb}
                                        disabled={isPaymentProcessing}
                                        className="sm:flex-1 px-4 py-3 rounded font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isPaymentProcessing ? 'Processing...' : 'Cancel Payment'}
                                    </button>
                                    <button
                                        onClick={handleResumePendingPayment}
                                        disabled={isPaymentProcessing}
                                        className="sm:flex-1 px-4 py-3 rounded font-bold text-white transition-colors disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${colorPalette?.primary || '#0f172a'} 0%, #000000 100%)` }}
                                    >
                                        Resume Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* PAYMENT SUCCESS MODAL */}
            {
                showPaymentSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full text-center">
                            <div className="p-6 border-b border-gray-200">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-6">
                                    Your payment has been received and is being processed. Your balance will be updated shortly.
                                </p>
                                <button
                                    onClick={() => setShowPaymentSuccessModal(false)}
                                    className="w-full px-4 py-3 rounded font-bold text-white transition-colors"
                                    style={{ background: `linear-gradient(135deg, ${colorPalette?.primary || '#0f172a'} 0%, #000000 100%)` }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DashboardCustomer;
