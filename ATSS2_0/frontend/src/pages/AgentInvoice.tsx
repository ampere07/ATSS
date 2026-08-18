import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    RefreshCw, Download, FileText, Users, User as UserIcon, Loader2,
    ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronDown, X, Eye
} from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { agentInvoiceService, AgentInvoiceRecord } from '../services/agentInvoiceService';
import AgentInvoiceDetails from '../components/AgentInvoiceDetails';
import GlobalSearch from './globalfunctions/GlobalSearch';
import AgentInvoiceDownloadModal from '../modals/AgentInvoiceDownloadModal';

const hexToRgba = (hex: string, opacity: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`
        : hex;
};

interface ColumnDefinition {
    key: string;
    label: string;
    minWidth: number;
    align?: 'right' | 'left' | 'center';
}

const columns: ColumnDefinition[] = [
    { key: 'invoice_number', label: 'Invoice No.', minWidth: 150 },
    { key: 'invoice_type', label: 'Type', minWidth: 100 },
    { key: 'billed_to', label: 'Team / Agent', minWidth: 200 },
    { key: 'invoice_date', label: 'Invoice Date', minWidth: 130 },
    { key: 'period', label: 'Billing Period', minWidth: 190 },
    { key: 'total_customers', label: 'Customers', minWidth: 110, align: 'right' },
    { key: 'total_amount', label: 'Total Amount', minWidth: 140, align: 'right' },
    { key: 'subtotal', label: 'Subtotal', minWidth: 140, align: 'right' },
    { key: 'status', label: 'Status', minWidth: 120 },
    { key: 'actions', label: 'Actions', minWidth: 130, align: 'center' },
];


const formatCurrency = (amount: number): string =>
    `₱${Number(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

const formatDate = (value?: string | null): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

/** Status pill, coloured the way the billing invoice list colours its own. */
const StatusBadge: React.FC<{ status: string; isDarkMode: boolean }> = ({ status, isDarkMode }) => {
    const tone: Record<string, string> = {
        Generated: isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700',
        Sent: isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 text-amber-700',
        Paid: isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
        Cancelled: isDarkMode ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-50 text-rose-700',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tone[status] || (isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700')}`}>
            {status}
        </span>
    );
};

const AgentInvoice: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const [records, setRecords] = useState<AgentInvoiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [lastPage, setLastPage] = useState(1);

    const [collapsedPeriods, setCollapsedPeriods] = useState<string[]>([]);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [selected, setSelected] = useState<AgentInvoiceRecord | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [pdfPending, setPdfPending] = useState<number | null>(null);

    // Whether this user may generate invoices or change a status. The server is
    // the authority — this only decides whether the control is worth showing.
    /**
     * The rows grouped by the week they bill, in the order the server sent them.
     *
     * The server already orders by invoice date descending, so taking the groups
     * in first-seen order keeps the newest week at the top without sorting
     * again — and without disagreeing with the order inside each group.
     *
     * Grouping is per page: pagination is server side, so a week spanning a page
     * boundary appears in both, each showing what that page holds. The count and
     * total on the header say "on this page" for the same reason.
     */
    const periodGroups = useMemo(() => {
        const groups: Array<{ key: string; label: string; records: AgentInvoiceRecord[]; subtotal: number }> = [];
        const index = new Map<string, number>();

        records.forEach(record => {
            const key = `${record.period_start ?? ''}|${record.period_end ?? ''}`;

            if (!index.has(key)) {
                index.set(key, groups.length);
                groups.push({
                    key,
                    label: record.period_start || record.period_end
                        ? `${formatDate(record.period_start)} – ${formatDate(record.period_end)}`
                        : 'No billing period',
                    records: [],
                    subtotal: 0,
                });
            }

            const group = groups[index.get(key)!];
            group.records.push(record);
            group.subtotal += Number(record.subtotal || 0);
        });

        return groups;
    }, [records]);

    // Collapsed rather than expanded is tracked, so a week that arrives on a
    // later page is open by default instead of hidden.
    const togglePeriod = (key: string) => {
        setCollapsedPeriods(current =>
            current.includes(key) ? current.filter(k => k !== key) : [...current, key]
        );
    };

    const primaryColor = colorPalette?.primary || '#7c3aed';
    const searchDebounce = useRef<number | null>(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('theme');
        if (stored) setIsDarkMode(stored === 'dark');

        const fetchPalette = async () => {
            try {
                setColorPalette(await settingsColorPaletteService.getActive());
            } catch (err) {
                console.error('[AgentInvoice] Failed to fetch color palette:', err);
            }
        };
        fetchPalette();

        const onPalette = () => fetchPalette();
        window.addEventListener('palette-updated', onPalette);
        return () => window.removeEventListener('palette-updated', onPalette);
    }, []);

    const load = useCallback(async (page: number, quiet = false) => {
        if (quiet) setIsRefreshing(true); else setIsLoading(true);
        setError(null);

        try {
            const response = await agentInvoiceService.list({
                search: searchTerm,

                type: typeFilter,
                page,
                per_page: itemsPerPage,
            });

            if (response?.success) {
                setRecords(response.data || []);
                setTotalCount(response.meta?.total ?? 0);
                setLastPage(response.meta?.last_page ?? 1);
            } else {
                setRecords([]);
                setError('Failed to load invoices.');
            }
        } catch (err: any) {
            console.error('[AgentInvoice] Failed to load invoices:', err);
            setRecords([]);
            setError(err?.response?.data?.message || 'Failed to load invoices.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [searchTerm, typeFilter, itemsPerPage]);

    // Filters reset to the first page: staying on page 4 of a narrower result
    // set would show an empty table.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, itemsPerPage]);

    useEffect(() => {
        if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
        searchDebounce.current = window.setTimeout(() => load(currentPage), 250);
        return () => {
            if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
        };
    }, [load, currentPage]);

    const handleOpenDetails = async (record: AgentInvoiceRecord) => {
        setSelected(record);

        // The list already carries the customers, but re-reading gives the
        // freshest set and keeps the modal correct if the list is stale.
        setIsLoadingDetail(true);
        try {
            const response = await agentInvoiceService.get(record.id);
            if (response?.success) setSelected(response.data);
        } catch (err) {
            console.error('[AgentInvoice] Failed to load invoice details:', err);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // Where the open record sits in the list, so the pane's chevrons know
    // whether there is anywhere to step to. Matches Invoice.tsx's approach.
    const selectedIndex = selected ? records.findIndex(r => r.id === selected.id) : -1;

    const handlePreviousRecord = () => {
        if (selectedIndex > 0) handleOpenDetails(records[selectedIndex - 1]);
    };

    const handleNextRecord = () => {
        if (selectedIndex >= 0 && selectedIndex < records.length - 1) {
            handleOpenDetails(records[selectedIndex + 1]);
        }
    };


    /**
     * Read the server's message out of a failed blob request.
     *
     * The PDF endpoint is fetched with responseType 'blob', so when it answers
     * with a JSON error the body arrives as a Blob and `err.response.data.message`
     * is undefined — which is why a 500 here used to surface as nothing more
     * than a minified error name in the console. Reading the blob back as text
     * recovers what the server actually said.
     */
    const messageFromBlobError = async (err: any): Promise<string | null> => {
        const data = err?.response?.data;

        if (!(data instanceof Blob)) {
            return err?.response?.data?.message ?? null;
        }

        try {
            const text = await data.text();
            const parsed = JSON.parse(text);
            return parsed?.error || parsed?.message || null;
        } catch {
            return null;
        }
    };

    const handlePdf = async (record: AgentInvoiceRecord, download: boolean) => {
        setPdfPending(record.id);
        try {
            const blob = await agentInvoiceService.pdfBlob(record.id, download);
            const url = window.URL.createObjectURL(blob);

            if (download) {
                const link = document.createElement('a');
                link.href = url;
                link.download = `${record.invoice_number}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                window.open(url, '_blank', 'noopener');
            }

            // Released on the next tick so the tab has taken the reference.
            window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } catch (err: any) {
            const message = await messageFromBlobError(err);
            console.error('[AgentInvoice] Failed to open the PDF:', message || err);
            window.alert(message || 'The invoice PDF could not be opened.');
        } finally {
            setPdfPending(null);
        }
    };



    const cell = (record: AgentInvoiceRecord, key: string): React.ReactNode => {
        switch (key) {
            case 'invoice_number':
                return <span className="font-semibold">{record.invoice_number}</span>;
            case 'invoice_type':
                return (
                    <span className="inline-flex items-center gap-1.5">
                        {record.invoice_type === 'team'
                            ? <Users className="h-3.5 w-3.5 opacity-70" />
                            : <UserIcon className="h-3.5 w-3.5 opacity-70" />}
                        {record.invoice_type === 'team' ? 'Team' : 'Solo'}
                    </span>
                );
            case 'billed_to':
                return record.billed_to;
            case 'invoice_date':
                return formatDate(record.invoice_date);
            case 'period':
                return `${formatDate(record.period_start)} – ${formatDate(record.period_end)}`;
            case 'total_customers':
                return record.total_customers;
            case 'total_amount':
                return formatCurrency(record.total_amount);
            case 'subtotal':
                return <span className="font-semibold">{formatCurrency(record.subtotal)}</span>;
            case 'status':
                return <StatusBadge status={record.status} isDarkMode={isDarkMode} />;
            case 'actions':
                return (
                    <div className="flex items-center justify-center gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDetails(record); }}
                            title="View details"
                            className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePdf(record, false); }}
                            disabled={pdfPending === record.id}
                            title="Open PDF"
                            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            {pdfPending === record.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <FileText className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePdf(record, true); }}
                            disabled={pdfPending === record.id}
                            title="Download PDF"
                            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    </div>
                );
            default:
                return '-';
        }
    };

    return (
        // Row layout, as the billing Invoice page uses: the list is one column
        // and the detail pane another, so opening a record narrows the list
        // rather than covering it.
        <div className={`h-full flex flex-col md:flex-row overflow-hidden ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${selected && isMobile ? 'hidden' : ''}`}>
            {/* Toolbar — search, the type filter, and the two actions on one
                row. The page has no title bar of its own: the sidebar already
                says which section this is. */}
            <div className={`px-4 py-3 border-b flex-shrink-0 flex flex-wrap items-center gap-2 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex-1 min-w-[200px]">
                    <GlobalSearch
                        searchQuery={searchTerm}
                        setSearchQuery={setSearchTerm}
                        isDarkMode={isDarkMode}
                        colorPalette={colorPalette}
                        placeholder="Search invoice number, team or agent..."
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={`px-3 py-2 rounded-lg border text-sm focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                    <option value="">All types</option>
                    <option value="team">Team</option>
                    <option value="solo">Solo</option>
                </select>

                {(searchTerm || typeFilter) && (
                    <button
                        onClick={() => { setSearchTerm(''); setTypeFilter(''); }}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Clear
                    </button>
                )}

                <button
                    onClick={() => setIsDownloadOpen(true)}
                    disabled={isLoading}
                    title="Download invoice PDFs"
                    className="p-2 rounded-lg transition-all flex items-center justify-center shadow-sm disabled:opacity-50 border"
                    style={{ backgroundColor: '#ffffff', borderColor: primaryColor, color: primaryColor }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(primaryColor, 0.1); }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                    <Download className="h-5 w-5" />
                </button>
                <button
                    onClick={() => load(currentPage, true)}
                    disabled={isLoading || isRefreshing}
                    title="Refresh"
                    className="p-2 rounded-lg transition-all flex items-center justify-center shadow-sm disabled:opacity-50 border"
                    style={{ backgroundColor: '#ffffff', borderColor: primaryColor, color: primaryColor }}
                >
                    <RefreshCw className={`h-5 w-5 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
                    </div>
                ) : error ? (
                    <div className={`h-full flex flex-col items-center justify-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <X className="h-8 w-8 text-rose-500" />
                        <p className="text-sm">{error}</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FileText className="h-10 w-10 opacity-40" />
                        <p className="text-sm font-medium">No invoices yet</p>
                        <p className="text-xs">Invoices are raised automatically every Monday for the week just ended.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={`border-b sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        style={{ minWidth: col.minWidth }}
                                        className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                        } ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {periodGroups.map(group => {
                                const isOpen = !collapsedPeriods.includes(group.key);

                                return (
                                    <React.Fragment key={group.key}>
                                        {/* The period header. Clicking it opens or closes the
                                            week; the count and total describe what is in the
                                            group on this page, not across every page. */}
                                        <tr
                                            onClick={() => togglePeriod(group.key)}
                                            className={`border-b cursor-pointer select-none transition-colors ${
                                                isDarkMode
                                                    ? 'bg-gray-800/70 hover:bg-gray-800 border-gray-700 text-gray-100'
                                                    : 'bg-gray-100 hover:bg-gray-200/70 border-gray-200 text-gray-800'
                                            }`}
                                        >
                                            <td colSpan={columns.length} className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown
                                                        className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                                                        style={{ color: primaryColor }}
                                                    />
                                                    <span className="text-[11px] font-bold uppercase tracking-wider">
                                                        {group.label}
                                                    </span>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600'}`}>
                                                        {group.records.length} {group.records.length === 1 ? 'invoice' : 'invoices'}
                                                    </span>
                                                    <span className={`ml-auto text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {formatCurrency(group.subtotal)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>

                                        {isOpen && group.records.map(record => (
                                            <tr
                                                key={record.id}
                                                onClick={() => handleOpenDetails(record)}
                                                className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-gray-800/60 text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'} ${
                                                    selected?.id === record.id ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100') : ''
                                                }`}
                                            >
                                                {columns.map(col => (
                                                    <td
                                                        key={col.key}
                                                        style={{ minWidth: col.minWidth }}
                                                        className={`px-4 py-3 whitespace-nowrap ${
                                                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                                        }`}
                                                    >
                                                        {cell(record, col.key)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t flex-shrink-0 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className={`flex flex-wrap items-center gap-3 sm:gap-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-2">
                            <span>Show</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className={`px-2 py-1 rounded border text-sm focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span>entries</span>
                        </div>
                        <span>
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                            <span className="font-medium">{totalCount}</span> results
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First page"
                            className={`p-1 rounded transition-colors disabled:opacity-40 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                            <ChevronsLeft className="h-5 w-5" />
                        </button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Previous"
                            className={`p-1 rounded transition-colors disabled:opacity-40 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className={`px-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Page {currentPage} of {lastPage}
                        </span>
                        <button onClick={() => setCurrentPage(p => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage} title="Next"
                            className={`p-1 rounded transition-colors disabled:opacity-40 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                            <ChevronRight className="h-5 w-5" />
                        </button>
                        <button onClick={() => setCurrentPage(lastPage)} disabled={currentPage >= lastPage} title="Last page"
                            className={`p-1 rounded transition-colors disabled:opacity-40 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}>
                            <ChevronsRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            </div>

            {/* Detail pane — a sibling of the list, not an overlay, so the list
                stays readable behind it and the record can be stepped through. */}
            {selected && (
                <div className="flex-shrink-0 overflow-hidden h-full">
                    <AgentInvoiceDetails
                        key={selected.id}
                        invoiceRecord={selected}
                        isLoading={isLoadingDetail}
                        isPdfPending={pdfPending === selected.id}
                        onClose={() => setSelected(null)}
                        onPrevious={selectedIndex > 0 ? handlePreviousRecord : undefined}
                        onNext={selectedIndex >= 0 && selectedIndex < records.length - 1 ? handleNextRecord : undefined}
                        onViewPdf={() => handlePdf(selected, false)}
                        onDownloadPdf={() => handlePdf(selected, true)}
                    />
                </div>
            )}

            <AgentInvoiceDownloadModal
                isOpen={isDownloadOpen}
                onClose={() => setIsDownloadOpen(false)}
            />
        </div>
    );
};

export default AgentInvoice;
