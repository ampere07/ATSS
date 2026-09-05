import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Platform,
    useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Download, RefreshCw, Plus, Filter } from 'lucide-react-native';
import { exportToPDF } from '../utils/exportUtils';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useCommissionStore } from '../store/commissionStore';
import { CommissionData, PayoutHistoryData } from '../types/commission';
import CommissionDetails from '../components/CommissionDetails';
import CommissionPayoutModal from '../modals/CommissionPayoutModal';
import { useAgentStore } from '../store/agentStore';
import usePermissions from '../hooks/usePermissions';
import GlobalSearch from './globalfunctions/GlobalSearch';

// Forced light mode to match the ~50 already-migrated pages.
const isDarkMode = false;

// Roles that read this page as an administrator rather than as an agent, so the
// list is NOT narrowed to their own id. Mirrors CommissionController::ADMIN_ROLES,
// which decides the same thing server-side.
const ADMIN_ROLES = ['administrator', 'superadmin', 'headtech'];

// The transaction kind, labelled the way ATSS2_0's Agent Payout table labels it.
//
// `type` is a loose column on agent_commission_history — commission, incentives,
// incentives_payout, Bonus, Bonus_payout, all, achievement — so an unrecognised
// value is shown as stored rather than hidden, and a row carrying no type at all
// still appears. Splitting this page into Commission / Incentives / Bonus tabs
// is what used to hide records: the Commission tab matched only `commission` or
// null, so a real payout written as `all` fell through every tab and the agent
// saw an empty list.
const TYPE_LABELS: Record<string, string> = {
    incentives_payout: 'Payout',
    incentives: 'Add Incentives',
    Bonus_payout: 'Payout',
    Bonus: 'Add Bonus',
};

const typeLabel = (type?: string | null): string => (type ? TYPE_LABELS[type] || type : '---');

// Money out of the agent's balance, and money into it. Everything else — a
// commission payout, an `all` payout — reads plain, exactly as on the web.
const isPayoutType = (type?: string | null): boolean =>
    type === 'incentives_payout' || type === 'Bonus_payout';
const isAddType = (type?: string | null): boolean =>
    type === 'incentives' || type === 'Bonus';

const toDateString = (d: Date | null): string => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatAmount = (val: any): string => {
    if (typeof val === 'number') return `₱${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (!isNaN(Number(val))) return `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    return String(val ?? '---');
};

const Commission: React.FC = () => {
    const {
        payoutHistory,
        isLoading,
        fetchCommissions,
        fetchUpdates,
    } = useCommissionStore();

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Who is reading the page. An agent sees only the agent_commission_history
    // rows carrying their own id; an administrator sees every agent's, which is
    // what their "Pay Out/In" screen is for.
    const [userId, setUserId] = useState<number | null>(null);
    const [isAdminViewer, setIsAdminViewer] = useState(false);
    const [identityReady, setIdentityReady] = useState(false);

    // Date range state
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // An agent opens this page to read their own history; recording a payout
    // against an agent is the administrator's act, and the API refuses it
    // without the key, so the button is not offered without it either.
    const { can } = usePermissions();
    const canPayOut = can('bonus-history.payout');

    const [selectedRecord, setSelectedRecord] = useState<CommissionData | PayoutHistoryData | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const [showPayoutModal, setShowPayoutModal] = useState(false);

    const { fetchAgents } = useAgentStore();

    const fetchData = async () => {
        await fetchCommissions(true);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchUpdates();
        } catch (err) {
            console.error('[Commission Page] Refresh failed:', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        AsyncStorage.getItem('authData').then((raw) => {
            if (raw) {
                try {
                    const ud = JSON.parse(raw);
                    setUserId(ud.id ?? ud.user_id ?? null);
                    setIsAdminViewer(ADMIN_ROLES.includes(String(ud.role || '').toLowerCase().trim()));
                } catch (err) {
                    console.error('[Commission Page] Failed to parse auth data:', err);
                }
            }
            setIdentityReady(true);
        });
    }, []);

    useEffect(() => {
        const fetchPalette = async () => {
            const palette = await settingsColorPaletteService.getActive();
            setColorPalette(palette);
        };
        fetchPalette();
        fetchData();
        fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Optional periodic refresh (15 min) — Pusher realtime is a no-op stub in RN.
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchUpdates().catch((err) => console.error('[Commission Page] Poll failed:', err));
        }, 15 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [fetchUpdates]);

    const filteredData = React.useMemo(() => {
        // Nothing is listed until the reader is known, so an agent never sees
        // another agent's history, even for a single frame.
        if (!identityReady) return [];

        const normalizedQuery = searchTerm.toLowerCase().replace(/\s+/g, '');
        const hasSearch = searchTerm !== '';

        // Built once. Declared inside the filter it was a fresh closure per row,
        // and its own recursion re-created it again for every nested value.
        const checkValue = (val: any): boolean => {
            if (val === null || val === undefined) return false;
            if (typeof val === 'object') return Object.values(val).some((v) => checkValue(v));
            return String(val).toLowerCase().replace(/\s+/g, '').includes(normalizedQuery);
        };

        const from = dateFrom ? dateFrom.getTime() : null;
        const to = dateTo ? dateTo.getTime() : null;

        return payoutHistory.filter((row: any) => {
            // The whole of agent_commission_history, narrowed to this agent's own
            // rows. The API already does this for a non-admin account; repeating
            // it here means a role the server counts as an administrator can
            // never leak another agent's payouts into an agent's screen.
            if (!isAdminViewer) {
                if (userId === null) return false;
                if (Number(row.agent_id) !== Number(userId)) return false;
            }

            const matchesSearch = !hasSearch || checkValue(row);

            if (from !== null || to !== null) {
                const dateVal = row.created_at || (row as any).date || (row as any).processed_at;
                if (!dateVal) return matchesSearch;
                const itemDate = new Date(dateVal).getTime();
                if (from !== null && itemDate < from) return false;
                if (to !== null && itemDate > to) return false;
            }
            return matchesSearch;
        });
    }, [payoutHistory, identityReady, isAdminViewer, userId, searchTerm, dateFrom, dateTo]);

    const handleRowClick = (record: CommissionData | PayoutHistoryData) => {
        setSelectedRecord(record);
        setShowDetails(true);
    };

    const currentIndex = selectedRecord
        ? filteredData.findIndex((r) => r.id === (selectedRecord as any).id)
        : -1;

    const handlePrevious = () => {
        if (currentIndex > 0) setSelectedRecord(filteredData[currentIndex - 1]);
    };

    const handleNext = () => {
        if (currentIndex !== -1 && currentIndex < filteredData.length - 1) {
            setSelectedRecord(filteredData[currentIndex + 1]);
        }
    };

    const handleExport = () => {
        // The same columns the web Agent Payout exports, so the two reports read
        // alike. RN exportToPDF falls back to CSV share.
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'ref_number', label: 'Ref Number' },
            { key: 'type', label: 'Type' },
            { key: 'total_amount', label: 'Total Amount' },
            { key: 'commission_id_list', label: 'Job Orders' },
            { key: 'created_by', label: 'Created By' },
            { key: 'status', label: 'Status' },
            { key: 'approved_by', label: 'Approved By' },
        ];

        const getExportValue = (row: any, key: string) => {
            const val = row[key];
            if (key === 'total_amount') return formatAmount(val);
            if (key === 'type') return typeLabel(val);
            if (key === 'status') return val || 'Pending';
            if (key === 'created_at') return val ? new Date(val).toLocaleString() : '-';
            return val ?? '-';
        };

        exportToPDF('Commission History Report', 'commission_history_export', columns, filteredData, getExportValue);
    };

    const primaryColor = colorPalette?.primary || '#7c3aed';
    const pageBg = '#f9fafb';
    const cardBg = '#ffffff';
    const borderColor = '#e5e7eb';
    const textColor = '#111827';
    const mutedColor = '#6b7280';
    const faintColor = '#9ca3af';

    const renderCard = ({ item }: { item: any }) => {
        const payout = isPayoutType(item.type);
        const add = isAddType(item.type);
        const amtColor = payout ? '#ef4444' : add ? '#16a34a' : textColor;
        const sign = payout ? '-' : add ? '+' : '';

        // Approval state, read the same way as the web table: settled in green,
        // awaiting action in amber, declined in red.
        const status = item.status || 'Pending';
        const settled = status === 'Paid' || status === 'Approved';
        const rejected = status === 'Rejected';
        const statusBg = settled ? '#dcfce7' : rejected ? '#fee2e2' : '#fef3c7';
        const statusFg = settled ? '#15803d' : rejected ? '#b91c1c' : '#b45309';

        return (
            <TouchableOpacity
                onPress={() => handleRowClick(item)}
                activeOpacity={0.7}
                style={{
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#3b82f6', fontVariant: ['tabular-nums'] }}>
                            {item.ref_number || `#${item.id}`}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: payout ? '#fee2e2' : '#dcfce7' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: payout ? '#b91c1c' : '#15803d' }}>
                                    {typeLabel(item.type)}
                                </Text>
                            </View>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: statusBg }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: statusFg }}>
                                    {status}
                                </Text>
                            </View>
                        </View>
                        {item.agent_name ? (
                            <Text style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>{item.agent_name}</Text>
                        ) : null}
                        {item.commission_id_list ? (
                            <Text style={{ fontSize: 12, color: '#60a5fa', marginTop: 2 }} numberOfLines={1}>
                                {item.commission_id_list.split(',').map((id: string) => `#${id.trim()}`).join(', ')}
                            </Text>
                        ) : null}
                        <Text style={{ fontSize: 11, color: faintColor, marginTop: 4 }}>
                            {item.created_at ? new Date(item.created_at).toLocaleString() : '---'}
                            {item.created_by ? `  ·  ${item.created_by}` : ''}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: amtColor }}>
                            {sign}{formatAmount(item.total_amount)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading && payoutHistory.length === 0) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pageBg }}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: pageBg }}>
            {/* Header */}
            <View style={{
                paddingTop: isTablet ? 16 : 60,
                paddingHorizontal: 16,
                paddingBottom: 12,
                backgroundColor: cardBg,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>Commission History</Text>
                    {canPayOut ? (
                        <TouchableOpacity
                            onPress={() => setShowPayoutModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: primaryColor }}
                        >
                            <Plus size={14} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Add</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Search + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <GlobalSearch
                        searchQuery={searchTerm}
                        setSearchQuery={setSearchTerm}
                        isDarkMode={isDarkMode}
                        colorPalette={colorPalette}
                        placeholder="Search history..."
                    />
                    <TouchableOpacity
                        onPress={() => setShowFilters((v) => !v)}
                        style={{ padding: 9, borderRadius: 6, borderWidth: 1, borderColor: (dateFrom || dateTo) ? primaryColor : borderColor, backgroundColor: cardBg }}
                    >
                        <Filter size={18} color={(dateFrom || dateTo) ? primaryColor : mutedColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleExport}
                        style={{ padding: 9, borderRadius: 6, borderWidth: 1, borderColor, backgroundColor: cardBg }}
                    >
                        <Download size={18} color={mutedColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        style={{ padding: 9, borderRadius: 6, borderWidth: 1, borderColor, backgroundColor: cardBg }}
                    >
                        <RefreshCw size={18} color={primaryColor} />
                    </TouchableOpacity>
                </View>

                {/* Date range filters */}
                {showFilters ? (
                    <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: faintColor }}>
                                Date Range
                            </Text>
                            {(dateFrom || dateTo) ? (
                                <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: primaryColor }}>Clear</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>From</Text>
                                <TouchableOpacity
                                    onPress={() => setShowFromPicker(true)}
                                    style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: dateFrom ? primaryColor : borderColor, backgroundColor: cardBg }}
                                >
                                    <Text style={{ fontSize: 13, color: dateFrom ? textColor : faintColor }}>
                                        {dateFrom ? toDateString(dateFrom) : 'Select date'}
                                    </Text>
                                </TouchableOpacity>
                                {showFromPicker ? (
                                    <DateTimePicker
                                        value={dateFrom || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_e, date) => {
                                            setShowFromPicker(false);
                                            if (date) setDateFrom(date);
                                        }}
                                    />
                                ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>To</Text>
                                <TouchableOpacity
                                    onPress={() => setShowToPicker(true)}
                                    style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: dateTo ? primaryColor : borderColor, backgroundColor: cardBg }}
                                >
                                    <Text style={{ fontSize: 13, color: dateTo ? textColor : faintColor }}>
                                        {dateTo ? toDateString(dateTo) : 'Select date'}
                                    </Text>
                                </TouchableOpacity>
                                {showToPicker ? (
                                    <DateTimePicker
                                        value={dateTo || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_e, date) => {
                                            setShowToPicker(false);
                                            if (date) setDateTo(date);
                                        }}
                                    />
                                ) : null}
                            </View>
                        </View>
                    </View>
                ) : null}
            </View>

            {/* List */}
            <FlatList
                data={filteredData}
                keyExtractor={(item, index) => String(item.id ?? index)}
                renderItem={renderCard}
                contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primaryColor} colors={[primaryColor]} />
                }
                ListEmptyComponent={
                    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontStyle: 'italic', color: faintColor }}>No matching records found</Text>
                    </View>
                }
            />

            {/* Details overlay */}
            {showDetails && selectedRecord ? (
                <CommissionDetails
                    data={selectedRecord}
                    type="payouts"
                    isMobile
                    onClose={() => { setShowDetails(false); setSelectedRecord(null); }}
                    onPrevious={currentIndex > 0 ? handlePrevious : undefined}
                    onNext={currentIndex !== -1 && currentIndex < filteredData.length - 1 ? handleNext : undefined}
                />
            ) : null}

            {/* Commission Payout Modal */}
            <CommissionPayoutModal
                isOpen={showPayoutModal}
                onClose={() => setShowPayoutModal(false)}
                onSuccess={() => { setShowPayoutModal(false); fetchData(); }}
            />
        </View>
    );
};

export default Commission;
