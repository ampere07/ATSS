import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Gift, Plus, RefreshCw, Search, Loader2 } from 'lucide-react';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { commissionService } from '../services/commissionService';
import { usePermissions } from '../hooks/usePermissions';
import BonusPayoutModal from '../modals/BonusPayoutModal';

interface ColumnDefinition {
    key: string;
    label: string;
    minWidth: number;
    align?: 'right' | 'left';
}

// The same columns the bonus tab carried on the page this replaced, so a reader
// coming from the old screen finds the record laid out where they expect it.
const bonusColumns: ColumnDefinition[] = [
    { key: 'id', label: 'ID', minWidth: 80 },
    { key: 'ref_number', label: 'Ref Number', minWidth: 150 },
    { key: 'type', label: 'Type', minWidth: 120 },
    { key: 'total_amount', label: 'Total Amount', minWidth: 150, align: 'right' },
    { key: 'created_by', label: 'Created By', minWidth: 180 },
    { key: 'status', label: 'Status', minWidth: 120 },
    { key: 'approved_by', label: 'Approved By', minWidth: 180 },
];

const PAGE_SIZE = 50;

/**
 * Agent bonus history.
 *
 * Reads /commissions/bonus-history directly rather than through
 * useCommissionStore: that store loads earnings, payouts and incentives too, and
 * this page shows none of them. Its own small piece of state also means the
 * 3-second poll that store runs — and the re-render churn that came with it —
 * is not inherited here.
 *
 * The endpoint is scoped server side to what the signed-in user may see, so an
 * agent reaching this page gets their own records and nothing else.
 */
const BonusHistory: React.FC = () => {
    const { can } = usePermissions();
    const canManagePayouts = can('agent-payout');

    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const [rows, setRows] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [showBonusModal, setShowBonusModal] = useState(false);

    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const sidebarStartXRef = useRef<number>(0);
    const sidebarStartWidthRef = useRef<number>(0);

    const handleMouseDownSidebarResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingSidebar(true);
        sidebarStartXRef.current = e.clientX;
        sidebarStartWidthRef.current = sidebarWidth;
    };

    useEffect(() => {
        if (!isResizingSidebar) return;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - sidebarStartXRef.current;
            setSidebarWidth(Math.max(200, Math.min(500, sidebarStartWidthRef.current + diff)));
        };
        const handleMouseUp = () => setIsResizingSidebar(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar]);

    useEffect(() => {
        const checkDarkMode = () => setIsDarkMode(localStorage.getItem('theme') !== 'light');
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const fetchPalette = async () => {
            try {
                setColorPalette(await settingsColorPaletteService.getActive());
            } catch (err) {
                console.error('[BonusHistory] Failed to fetch color palette:', err);
            }
        };
        fetchPalette();
    }, []);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await commissionService.getBonusHistory(2000, 0) as any;
            if (res?.success) {
                setRows(res.data || []);
            } else {
                setRows([]);
                setError('Failed to load bonus history.');
            }
        } catch (err: any) {
            console.error('[BonusHistory] Load failed:', err);
            setRows([]);
            setError(err?.response?.data?.message || err?.message || 'Failed to load bonus history.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // A narrower result set can leave the reader stranded on a page that no
    // longer exists, showing an empty table.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo]);

    const filtered = useMemo(() => {
        const query = searchTerm.toLowerCase().replace(/\s+/g, '');

        return rows.filter((row: any) => {
            if (dateFrom || dateTo) {
                const raw = row.created_at || row.date;
                const stamp = raw ? new Date(raw) : null;

                if (!stamp || isNaN(stamp.getTime())) return false;
                if (dateFrom && stamp < new Date(`${dateFrom}T00:00:00`)) return false;
                if (dateTo && stamp > new Date(`${dateTo}T23:59:59`)) return false;
            }

            if (query === '') return true;

            return bonusColumns.some(col => {
                const val = row[col.key];
                if (val === null || val === undefined) return false;
                return String(val).toLowerCase().replace(/\s+/g, '').includes(query);
            });
        });
    }, [rows, searchTerm, dateFrom, dateTo]);

    const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const formatAmount = (value: any): string => {
        const n = parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''));
        if (isNaN(n)) return String(value ?? '');
        return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const surface = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
    const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

    return (
        <div className={`h-full flex ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
            {/* Sidebar: title, Add, and the date range — the same arrangement
                AgentPayout uses, so the two agent pages read the same way. */}
            <div
                className={`hidden md:flex border-r flex-shrink-0 flex-col relative ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
                style={{ width: `${sidebarWidth}px` }}
            >
                <div className={`p-4 border-b flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                        <h2 className={`text-lg font-semibold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            BONUS HISTORY
                        </h2>
                        {canManagePayouts && (
                            <button
                                onClick={() => setShowBonusModal(true)}
                                className="px-3 py-1.5 rounded text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                style={{ backgroundColor: colorPalette?.primary || '#ef4444' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colorPalette?.accent || '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = colorPalette?.primary || '#ef4444';
                                }}
                                title="New Bonus"
                            >
                                <Plus size={14} />
                                Add
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className={`px-4 py-3 border-b space-y-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                DATE RANGE
                            </span>
                            {(dateFrom || dateTo) && (
                                <button
                                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    className="text-[10px] font-bold uppercase tracking-wider hover:underline"
                                    style={{ color: colorPalette?.primary || '#7c3aed' }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <label className={`text-[10px] mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded text-xs focus:outline-none border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    style={dateFrom ? { borderColor: colorPalette?.primary || '#7c3aed' } : {}}
                                />
                            </div>
                            <div className="relative">
                                <label className={`text-[10px] mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className={`w-full px-2 py-1.5 rounded text-xs focus:outline-none border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    style={dateTo ? { borderColor: colorPalette?.primary || '#7c3aed' } : {}}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-10"
                    style={{ backgroundColor: isResizingSidebar ? (colorPalette?.primary || '#7c3aed') : 'transparent' }}
                    onMouseDown={handleMouseDownSidebarResize}
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header: search only. Add and the date range live in the sidebar. */}
                <div className={`p-4 border-b flex-shrink-0 ${surface}`}>
                    <div className="flex items-center space-x-3 w-full">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                style={searchTerm ? { borderColor: colorPalette?.primary || '#7c3aed' } : {}}
                            />
                        </div>

                        {/* On mobile the sidebar is hidden, so Add has nowhere
                            else to live. */}
                        {canManagePayouts && (
                            <button
                                onClick={() => setShowBonusModal(true)}
                                className="md:hidden p-2 rounded border transition-colors flex-shrink-0 text-white"
                                style={{ backgroundColor: colorPalette?.primary || '#ef4444', borderColor: colorPalette?.primary || '#ef4444' }}
                                title="Add Record"
                            >
                                <Plus size={18} />
                            </button>
                        )}

                        <button
                            onClick={load}
                            disabled={isLoading}
                            title="Refresh"
                            className={`p-2 rounded border transition-colors flex-shrink-0 disabled:opacity-60 ${isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

            <div className="flex-1 overflow-auto">
                {isLoading && rows.length === 0 ? (
                    <div className={`flex items-center justify-center gap-2 py-16 ${textMuted}`}>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Loading bonus history...</span>
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-red-500">{error}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className={isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}>
                            <tr>
                                {bonusColumns.map(col => (
                                    <th
                                        key={col.key}
                                        style={{ minWidth: col.minWidth }}
                                        className={`px-4 py-3 font-semibold whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'
                                            } ${textMuted}`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={bonusColumns.length} className={`py-16 text-center ${textMuted}`}>
                                        No matching records found
                                    </td>
                                </tr>
                            ) : pageRows.map((row: any, i: number) => (
                                <tr
                                    key={row.id ?? i}
                                    className={`border-b ${isDarkMode
                                        ? 'border-gray-800 hover:bg-gray-900' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {bonusColumns.map(col => (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'
                                                } ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                        >
                                            {col.key === 'total_amount'
                                                ? formatAmount(row[col.key])
                                                : (row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {filtered.length > 0 && (
                <div className={`flex items-center justify-between px-4 py-3 border-t text-sm ${surface} ${textMuted}`}>
                    <span>
                        Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of{' '}
                        <span className="font-medium">{filtered.length}</span> records
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded border disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span>Page {currentPage} of {lastPage}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(lastPage, p + 1))}
                            disabled={currentPage >= lastPage}
                            className="px-3 py-1 rounded border disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
            </div>

            <BonusPayoutModal
                isOpen={showBonusModal}
                onClose={() => setShowBonusModal(false)}
                onSuccess={() => {
                    setShowBonusModal(false);
                    load();
                }}
            />
        </div>
    );
};

export default BonusHistory;
