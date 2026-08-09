import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, RefreshCw, Loader2 } from 'lucide-react';
import { agentPortalService } from '../services/commissionService';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { useJobOrderStore } from '../store/jobOrderStore';
import {
    ACHIEVEMENT_REWARD,
    ACHIEVEMENT_TARGET,
    AgentIdentity,
    agentOwnsReferral,
    getOnsiteStatus,
    getStoredAgentIdentity,
    isDoneOnsiteStatus,
    isFailedOnsiteStatus,
    isInProgressOnsiteStatus,
    isRescheduleOnsiteStatus
} from '../utils/agentReferral';

interface DashboardAgentProps {
    onNavigate?: (section: string, extra?: string) => void;
}

interface Cashout {
    id: number | string;
    ref_number?: string;
    total_amount?: number | string;
    created_at?: string;
}

// The agent view is presented in light mode in both clients so the gradient balance
// card renders identically on the web and in the mobile app.
const PAGE_BG = '#f9fafb';

const formatCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,');
    return `₱${isNegative ? '-' : ''}${formatted}`;
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

// Three-quarter-arc speedometer matching the mobile achievement gauge.
const AchievementGauge: React.FC<{ value: number; target: number; color: string }> = ({ value, target, color }) => {
    const size = 220;
    const radius = (size - 30) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.75;
    const progress = target > 0 ? Math.min(Math.max(value / target, 0), 1) : 0;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <g transform={`rotate(135 ${center} ${center})`}>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#e2e8f0"
                        strokeWidth={30}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        fill="none"
                        strokeLinecap="round"
                    />
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={color}
                        strokeWidth={30}
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeDashoffset={arcLength * (1 - progress)}
                        fill="none"
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                    />
                </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold leading-none text-slate-900">{value}</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">Onboarded</span>
            </div>
        </div>
    );
};

const DashboardAgent: React.FC<DashboardAgentProps> = ({ onNavigate }) => {
    const [identity] = useState<AgentIdentity>(() => getStoredAgentIdentity());
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);

    const { jobOrders, silentRefresh } = useJobOrderStore();

    const [cashouts, setCashouts] = useState<Cashout[]>([]);
    const [agentBalance, setAgentBalance] = useState(0);
    const [agentIncentives, setAgentIncentives] = useState(0);
    const [agentBonus, setAgentBonus] = useState(0);
    const [agentAchievement, setAgentAchievement] = useState(0);

    const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCardFlipped, setIsCardFlipped] = useState(false);

    const primaryColor = colorPalette?.primary || '#ef4444';

    useEffect(() => {
        const fetchColorPalette = async () => {
            try {
                setColorPalette(await settingsColorPaletteService.getActive());
            } catch (err) {
                console.error('[DashboardAgent] Failed to fetch color palette:', err);
            }
        };
        fetchColorPalette();

        const handlePaletteUpdate = () => fetchColorPalette();
        window.addEventListener('palette-updated', handlePaletteUpdate);
        return () => window.removeEventListener('palette-updated', handlePaletteUpdate);
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await agentPortalService.getCommissionHistory();
            if (response?.success) {
                setCashouts(response.data || []);
                setAgentBalance(Number(response.balance ?? 0));
                setAgentIncentives(Number(response.incentives ?? 0));
                setAgentBonus(Number(response.bonus ?? 0));
                setAgentAchievement(Number(response.achievement ?? 0));
            }
        } catch (err) {
            console.error('[DashboardAgent] Failed to fetch cashout history:', err);
        }
    }, []);

    const fetchAchievements = useCallback(async (agentId: number) => {
        try {
            const response = await agentPortalService.getAchievements(agentId);
            if (response?.data) {
                setClaimedMilestones(response.data.map((item: any) => Number(item.milestone)));
            }
        } catch (err) {
            console.error('[DashboardAgent] Failed to fetch achievements:', err);
        }
    }, []);

    const loadAll = useCallback(async () => {
        const agentId = identity.id;
        await Promise.all([
            fetchHistory(),
            agentId ? fetchAchievements(agentId) : Promise.resolve(),
            silentRefresh()
        ]);
    }, [identity.id, fetchHistory, fetchAchievements, silentRefresh]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await loadAll();
            if (!cancelled) setIsLoading(false);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identity.id]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadAll();
        } finally {
            setIsRefreshing(false);
        }
    }, [loadAll]);

    // Referral funnel counts, derived from the agent's own job orders exactly as the
    // mobile dashboard derives them.
    const { inProgressCount, onboardedCount, failedCount, rescheduleCount } = useMemo(() => {
        if (!identity.fullName && !identity.email) {
            return { inProgressCount: 0, onboardedCount: 0, failedCount: 0, rescheduleCount: 0 };
        }

        const mine = jobOrders.filter((jo: any) =>
            agentOwnsReferral(jo.Referred_By || jo.referred_by || '', identity.fullName, identity.email)
        );

        const countBy = (predicate: (status: string) => boolean) =>
            mine.filter((jo: any) => predicate(getOnsiteStatus(jo))).length;

        return {
            inProgressCount: countBy(isInProgressOnsiteStatus),
            onboardedCount: countBy(isDoneOnsiteStatus),
            failedCount: countBy(isFailedOnsiteStatus),
            rescheduleCount: countBy(isRescheduleOnsiteStatus)
        };
    }, [jobOrders, identity.fullName, identity.email]);

    // Every completed multiple of the target unlocks a claimable milestone.
    const pendingMilestone = useMemo(() => {
        for (let m = ACHIEVEMENT_TARGET; m <= onboardedCount; m += ACHIEVEMENT_TARGET) {
            if (!claimedMilestones.includes(m)) return m;
        }
        return null;
    }, [onboardedCount, claimedMilestones]);

    const achievementProgress = pendingMilestone ? ACHIEVEMENT_TARGET : onboardedCount % ACHIEVEMENT_TARGET;

    const handleClaimReward = async () => {
        if (!identity.id || !pendingMilestone || isClaiming) return;
        setIsClaiming(true);
        try {
            const response = await agentPortalService.claimAchievement({
                agent_id: identity.id,
                milestone: pendingMilestone
            });

            if (response?.success) {
                setClaimedMilestones(prev => [...prev, pendingMilestone]);
                window.alert(
                    `Reward claimed! ${formatCurrency(ACHIEVEMENT_REWARD)} has been added to your balance ` +
                    `for hitting ${pendingMilestone} onboards.`
                );
                await fetchHistory();
            } else {
                window.alert(response?.message || 'Failed to claim reward.');
            }
        } catch (err: any) {
            window.alert(err?.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setIsClaiming(false);
        }
    };

    const latestCashouts = useMemo(() => cashouts.slice(0, 5), [cashouts]);
    // A claimed achievement reward is paid straight into `balance` (the commission
    // bucket); the `achievement` figure is only a lifetime "rewards earned" total for
    // the tile below, so it must NOT be added here or the reward is counted twice.
    const totalBalance = agentBalance + agentIncentives + agentBonus;

    const displayName = identity.fullName || 'Agent';
    const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const balanceTiles = [
        { label: 'Incentives', value: agentIncentives },
        { label: 'Commission', value: agentBalance },
        { label: 'Bonus', value: agentBonus },
        { label: 'Achievement', value: agentAchievement }
    ];

    const funnelTiles = [
        { label: 'In Progress', value: inProgressCount },
        { label: 'Done', value: onboardedCount },
        { label: 'Failed', value: failedCount },
        { label: 'Reschedule', value: rescheduleCount }
    ];

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center" style={{ backgroundColor: PAGE_BG }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto" style={{ backgroundColor: PAGE_BG }}>
            <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Agent Dashboard</h1>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ color: primaryColor }} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Balance / referral card — the icon flips between the two faces. */}
                <div
                    className="overflow-hidden rounded-3xl transition-transform duration-300"
                    style={{
                        background: isCardFlipped
                            ? `linear-gradient(135deg, #000000 0%, ${primaryColor} 100%)`
                            : `linear-gradient(135deg, ${primaryColor} 0%, #000000 100%)`
                    }}
                >
                    <div className="px-6 py-8 md:px-8">
                        <div className="mb-8 flex items-center justify-between gap-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg font-bold text-white">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-lg font-bold capitalize text-white">{displayName}</div>
                                <div className="truncate text-xs text-gray-200 opacity-90">
                                    Agent ID: {identity.username || 'N/A'}
                                </div>
                                {isCardFlipped && (
                                    <div className="truncate text-xs text-gray-200 opacity-90">
                                        {identity.email || 'N/A'}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsCardFlipped(prev => !prev)}
                                className="flex-shrink-0 rounded-full p-2 text-white transition hover:bg-white/10"
                                title={isCardFlipped ? 'Show balances' : 'Show referrals'}
                            >
                                <RefreshCcw size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                            {(isCardFlipped ? funnelTiles : balanceTiles).map((tile, index) => (
                                <div key={tile.label} className={index % 2 === 1 ? 'text-right' : 'text-left'}>
                                    <div className="mb-1 truncate text-xs text-gray-200">{tile.label}</div>
                                    <div className="truncate text-2xl font-bold text-white md:text-3xl">
                                        {isCardFlipped ? tile.value : formatCurrency(tile.value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Achievement */}
                <div className="flex flex-col items-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <h2 className="text-center text-lg font-bold text-slate-800">
                        {ACHIEVEMENT_TARGET} Onboard Referrals
                    </h2>
                    <p className="mb-6 mt-1 max-w-md text-center text-sm text-slate-500">
                        Refer {ACHIEVEMENT_TARGET} customers and have them successfully onboarded.
                    </p>

                    <AchievementGauge value={achievementProgress} target={ACHIEVEMENT_TARGET} color={primaryColor} />

                    {pendingMilestone && (
                        <button
                            onClick={handleClaimReward}
                            disabled={isClaiming}
                            className="mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isClaiming
                                ? <Loader2 size={20} className="animate-spin" />
                                : `Get Reward (${formatCurrency(ACHIEVEMENT_REWARD)})`}
                        </button>
                    )}
                </div>

                {/* Total balance + application entry point */}
                <div
                    className="flex flex-col gap-6 overflow-hidden rounded-3xl px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8"
                    style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #000000 100%)` }}
                >
                    <div className="min-w-0">
                        <div className="mb-2 text-sm font-semibold text-gray-200">Total Balance</div>
                        <div className="truncate text-4xl font-bold text-white md:text-5xl">
                            {formatCurrency(totalBalance)}
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate?.('agent-application')}
                        className="flex-shrink-0 rounded-xl border-2 border-white px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                        Application Form
                    </button>
                </div>

                {/* Cashout history */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900">Cashout History</h2>
                    <div className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-100">
                        {latestCashouts.length > 0 ? (
                            latestCashouts.map(cashout => (
                                <div
                                    key={cashout.id}
                                    className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-800">
                                            Ref: {cashout.ref_number || `#${cashout.id}`}
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-500">{formatDate(cashout.created_at)}</div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <div className="text-sm font-extrabold text-slate-800">
                                            {formatCurrency(Number(cashout.total_amount ?? 0))}
                                        </div>
                                        <div className="mt-0.5 text-[10px] font-extrabold text-green-600">POSTED</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-sm text-gray-500">No cashouts found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAgent;
