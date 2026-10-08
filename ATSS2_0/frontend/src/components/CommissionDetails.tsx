import React, { useState, useEffect, useRef } from 'react';
import {
    X, ExternalLink, Receipt, CheckCircle,
    ChevronRight, ChevronLeft, DollarSign, Calendar,
    User, Hash, MessageSquare, Image as ImageIcon, Pencil, Plus, Loader2, FileText
} from 'lucide-react';
import { PROOF_FILE_ACCEPT, isPdfFile, screenProofFiles, useProofFiles, LoadedProof } from './proofFiles';
import { settingsColorPaletteService, ColorPalette } from '../services/settingsColorPaletteService';
import { CommissionData, PayoutHistoryData } from '../types/commission';
import apiClient from '../config/api';
import { transactionService } from '../services/transactionService';
import AuditTrailList, { AuditEntry } from './AuditTrailList';

/** Matches the `proof_images` limit CommissionController validates. */
const PROOF_IMAGE_LIMIT = 10;

interface CommissionDetailsProps {
    data: CommissionData | PayoutHistoryData;
    type: 'earnings' | 'payouts' | 'incentives' | 'bonus';
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    isMobile?: boolean;
    /** Approve the record on screen. Omitted when the viewer may not approve. */
    onApprove?: (record: any) => void;
    /** Reject the record on screen. Omitted when the viewer may not approve. */
    onReject?: (record: any) => void;
    /** True while an approval or rejection is in flight. */
    approvalPending?: boolean;
    /** Offer an Edit for the proof images. Omitted when the viewer may not change them. */
    canEditProof?: boolean;
    /** Called with the payout's proof as saved, after an edit. */
    onProofUpdated?: (recordId: string | number, proof: { proof_of_payment: string; proof_images: string[] }) => void;
}

const CommissionDetails: React.FC<CommissionDetailsProps> = ({
    data, type, onClose, onPrevious, onNext, isMobile = false,
    onApprove, onReject, approvalPending = false,
    canEditProof = false, onProofUpdated
}) => {
    const [localIsMobile, setLocalIsMobile] = useState<boolean>(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => {
            setLocalIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const activeIsMobile = isMobile || localIsMobile;

    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    const [colorPalette, setColorPalette] = useState<ColorPalette | null>(null);
    const [detailsWidth, setDetailsWidth] = useState<number>(600);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    // Editing the proof images: the saved ones still kept (in order), the files
    // added, and a preview for each added file.
    const [isEditingProof, setIsEditingProof] = useState(false);
    const [keptProofs, setKeptProofs] = useState<string[]>([]);
    const [addedFiles, setAddedFiles] = useState<File[]>([]);
    const [addedPreviews, setAddedPreviews] = useState<string[]>([]);
    const [proofSaving, setProofSaving] = useState(false);
    const [proofError, setProofError] = useState<string | null>(null);
    const proofInputRef = useRef<HTMLInputElement>(null);
    // The payout's audit trail, newest first.
    const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(localStorage.getItem('theme') === 'dark');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const fetchColorPalette = async () => {
            const activePalette = await settingsColorPaletteService.getActive();
            setColorPalette(activePalette);
        };
        fetchColorPalette();
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const diff = startXRef.current - e.clientX;
            const newWidth = Math.max(400, Math.min(1200, startWidthRef.current + diff));
            setDetailsWidth(newWidth);
        };

        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleMouseDownResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = detailsWidth;
    };

    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
        const baseUrl = process.env.REACT_APP_API_URL || 'https://backend.atssfiber.ph';
        return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    };

    const getDisplayText = () => {
        if (type === 'earnings') {
            const earning = data as CommissionData;
            return `${earning.id} | ${earning.customer} | ${earning.service}`;
        } else {
            const payout = data as PayoutHistoryData;
            return `${payout.ref_number} | ${payout.agent_name ?? ''}`;
        }
    };

    const renderField = (label: string, value: any, icon: any = null, isBold: boolean = false) => (
        <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'}`}>
            <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {label}
            </div>
            <div className={`flex-1 flex items-center ${isBold ? 'font-bold text-lg' : ''} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {value || '-'}
            </div>
        </div>
    );

    const isEarning = type === 'earnings';
    const earning = data as CommissionData;
    const payout = data as PayoutHistoryData;

    // Every proof file on the payout. A payout recorded before several could be
    // attached has only `proof_of_payment`, which is then the whole list.
    const proofUrls: string[] = isEarning
        ? []
        : (Array.isArray(payout.proof_images) && payout.proof_images.length > 0
            ? payout.proof_images
            : (payout.proof_of_payment ? [payout.proof_of_payment] : []));

    // Each one downloaded once, to tell a PDF from an image and to show it.
    const proofFiles = useProofFiles(proofUrls);

    // Only payout records carry an editable proof and an audit trail.
    const hasProofHistory = type === 'payouts' && payout.id !== undefined && payout.id !== null;

    const loadAuditTrail = async (id: string | number) => {
        try {
            const res: any = await apiClient.get(`/commissions/history/${id}/audit-trail`);
            setAuditTrail(res.data?.success && Array.isArray(res.data.data) ? res.data.data : []);
        } catch {
            // The trail is a reference beside the record, not the record itself;
            // failing to read it leaves the section out rather than the panel broken.
            setAuditTrail([]);
        }
    };

    const discardProofEdit = () => {
        addedPreviews.forEach(url => URL.revokeObjectURL(url));
        setAddedFiles([]);
        setAddedPreviews([]);
        setKeptProofs([]);
        setProofError(null);
        setIsEditingProof(false);
    };

    // A different payout starts with no edit in progress, and its own history.
    useEffect(() => {
        discardProofEdit();
        setAuditTrail([]);
        if (hasProofHistory) loadAuditTrail(payout.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payout.id, isEarning, type]);

    const startProofEdit = () => {
        setKeptProofs(proofUrls);
        setAddedFiles([]);
        setAddedPreviews([]);
        setProofError(null);
        setIsEditingProof(true);
    };

    /** Images and PDFs, added after the files already there, up to the limit the API accepts. */
    const handleAddProofFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { accepted: usable, problem } = screenProofFiles(Array.from(e.target.files || []));
        // Cleared so picking the same file again after removing it still fires.
        e.target.value = '';

        const room = PROOF_IMAGE_LIMIT - keptProofs.length - addedFiles.length;
        const accepted = usable.slice(0, Math.max(0, room));
        const overLimit = accepted.length < usable.length
            ? `Up to ${PROOF_IMAGE_LIMIT} proof files can be attached.`
            : null;
        setProofError([problem, overLimit].filter(Boolean).join(' ') || null);
        if (accepted.length === 0) return;

        setAddedFiles(prev => [...prev, ...accepted]);
        setAddedPreviews(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))]);
    };

    const removeKeptProof = (index: number) => {
        setKeptProofs(prev => prev.filter((_, i) => i !== index));
    };

    const removeAddedProof = (index: number) => {
        URL.revokeObjectURL(addedPreviews[index]);
        setAddedFiles(prev => prev.filter((_, i) => i !== index));
        setAddedPreviews(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Upload the added files, then save the whole list — kept images first, in
     * their order, then the new ones. Nothing is saved if any upload fails, so a
     * payout is never left with part of an edit.
     */
    const saveProofEdit = async () => {
        if (keptProofs.length + addedFiles.length === 0) {
            setProofError('Keep or add at least one file.');
            return;
        }

        setProofSaving(true);
        setProofError(null);

        try {
            const uploaded: string[] = [];

            for (let i = 0; i < addedFiles.length; i++) {
                const file = addedFiles[i];
                const formData = new FormData();
                formData.append('folder_name', `agent-payout - ${payout.agent_name ?? ''}`.trim());
                formData.append('payment_proof_image', file, file.name);

                const upload = await transactionService.uploadTransactionImage(formData);
                if (!upload.success || !upload.data?.payment_proof_image_url) {
                    throw new Error(addedFiles.length > 1
                        ? `Failed to upload file ${i + 1} of ${addedFiles.length}.`
                        : 'Failed to upload the file.');
                }
                uploaded.push(upload.data.payment_proof_image_url);
            }

            const res: any = await apiClient.post(`/commissions/history/${payout.id}/proof`, {
                proof_images: [...keptProofs, ...uploaded],
            });

            if (!res.data?.success) {
                throw new Error(res.data?.message || 'Failed to save the proof images.');
            }

            onProofUpdated?.(payout.id, res.data.data);
            discardProofEdit();
            loadAuditTrail(payout.id);
        } catch (err: any) {
            setProofError(err.response?.data?.message || err.message || 'Failed to save the proof images.');
        } finally {
            setProofSaving(false);
        }
    };

    return (
        <div className={`${activeIsMobile
                ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] max-h-[100dvh]'
                : 'h-full flex flex-col overflow-hidden md:border-l relative w-full md:w-auto transition-all duration-300'
            } flex flex-col overflow-hidden border-l relative ${isDarkMode
                ? 'bg-gray-950 border-white border-opacity-30'
                : 'bg-white border-gray-300'
            }`} style={!activeIsMobile && window.innerWidth >= 768 ? { width: `${detailsWidth}px` } : undefined}>

            {/* Resize Handle */}
            {!activeIsMobile && (
                <div className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-50"
                    style={{ backgroundColor: isResizing ? (colorPalette?.primary || '#7c3aed') : 'transparent' }}
                    onMouseDown={handleMouseDownResize} />
            )}

            {/* Header */}
            <div className={`p-3 flex items-center justify-between border-b ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-100 border-gray-200'
                }`}>
                <div className="flex items-center min-w-0 flex-1">
                    <h2 className={`font-medium truncate pr-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getDisplayText()}
                    </h2>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Approve / Reject, ahead of the record arrows.
                        Offered only while the record is Pending and only to a
                        viewer permitted to approve — the same test the detail
                        section used before these moved up here. */}
                    {!isEarning && (onApprove || onReject) && ((payout as any).status ?? 'Pending') === 'Pending' && (
                        <div className="flex items-center gap-2">
                            {onApprove && (
                                <button
                                    type="button"
                                    disabled={approvalPending}
                                    onClick={() => onApprove(payout)}
                                    title="Approve this payout and apply it to the agent's balance"
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                    {approvalPending ? 'Working…' : 'Approve'}
                                </button>
                            )}
                            {onReject && (
                                <button
                                    type="button"
                                    disabled={approvalPending}
                                    onClick={() => onReject(payout)}
                                    title="Reject this payout. No money is moved."
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                    Reject
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center">
                        <button onClick={onPrevious} disabled={!onPrevious}
                            className={`p-2 rounded transition-colors ${!onPrevious ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                            title="Previous Record">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={onNext} disabled={!onNext}
                            className={`p-2 rounded transition-colors ${!onNext ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                            title="Next Record">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <button onClick={onClose} className={isDarkMode ? 'hover:text-white text-gray-400' : 'hover:text-gray-900 text-gray-600'}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto w-full ${activeIsMobile ? 'pb-24' : ''}`}>
                <div className={`mx-auto py-1 px-4 ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
                    <div className="space-y-1">
                        {isEarning ? (
                            <>
                                {renderField('Transaction ID', earning.id)}
                                {renderField('Customer', earning.customer, null, true)}
                                {renderField('Service Type', earning.service)}
                                {renderField('Date Earned', earning.date)}
                                <div className={`flex py-2 ${isDarkMode ? 'border-b border-gray-800' : 'border-b border-gray-300'}`}>
                                    <div className={`w-40 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</div>
                                    <div className="flex-1">
                                        <div className={`capitalize ${earning.status === 'Paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {earning.status}
                                        </div>
                                    </div>
                                </div>
                                {renderField('Commission Amount', earning.amount, null, true)}
                            </>
                        ) : (
                            <>
                                {renderField('ID', payout.id)}
                                {renderField('Reference No.', payout.ref_number)}
                                {payout.type && (payout.type === 'incentives' || payout.type === 'incentives_payout') && renderField('Transaction Type', payout.type === 'incentives_payout' ? 'Payout' : 'Add Incentives')}
                                {renderField('Date Processed', new Date(payout.created_at).toLocaleString())}
                                {renderField('Processed By', payout.created_by)}
                                {renderField('Agent Name', payout.agent_name)}
                                {/* Approval, shown the same way as on a transaction. */}
                                {renderField('Status', (payout as any).status || 'Pending')}
                                {renderField('Approved By', (payout as any).approved_by || (payout as any).approve_by || 'Not yet approved')}
                                {renderField('Remarks', payout.remarks || 'No remarks provided')}

                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Proof of Payment</p>
                                        {canEditProof && hasProofHistory && !isEditingProof && (
                                            <button
                                                type="button"
                                                onClick={startProofEdit}
                                                title="Change the proof images on this payout"
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                        )}
                                    </div>
                                    {isEditingProof ? (
                                        <div className="space-y-3">
                                            <input
                                                ref={proofInputRef}
                                                type="file"
                                                accept={PROOF_FILE_ACCEPT}
                                                multiple
                                                onChange={handleAddProofFiles}
                                                className="hidden"
                                            />
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {[
                                                    ...keptProofs.map((url, i) => {
                                                        const loaded: LoadedProof | undefined = proofFiles[url];
                                                        return {
                                                            key: `kept-${i}-${url}`,
                                                            src: loaded?.src,
                                                            isPdf: !!loaded?.isPdf,
                                                            name: `File ${i + 1}`,
                                                            status: loaded?.status ?? 'loading',
                                                            remove: () => removeKeptProof(i),
                                                            isNew: false,
                                                        };
                                                    }),
                                                    ...addedPreviews.map((preview, i) => ({
                                                        key: preview,
                                                        src: preview,
                                                        isPdf: !!addedFiles[i] && isPdfFile(addedFiles[i]),
                                                        name: addedFiles[i]?.name ?? 'New file',
                                                        status: 'ready' as const,
                                                        remove: () => removeAddedProof(i),
                                                        isNew: true,
                                                    })),
                                                ].map((file, index) => (
                                                    <div
                                                        key={file.key}
                                                        className={`relative h-32 rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}
                                                    >
                                                        {file.status === 'loading' ? (
                                                            <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                <Loader2 size={20} className="animate-spin" />
                                                            </div>
                                                        ) : file.isPdf || !file.src ? (
                                                            // No thumbnail for a PDF (or a file that would not load): its name instead.
                                                            <div className={`w-full h-full flex flex-col items-center justify-center gap-1 px-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                <FileText size={28} />
                                                                <span className="text-[11px] font-medium truncate max-w-full">
                                                                    {file.src ? file.name : 'Could not load'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <img src={file.src} alt={`Proof ${index + 1}`} className="w-full h-full object-cover block" />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={file.remove}
                                                            disabled={proofSaving}
                                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors disabled:opacity-50"
                                                            title="Remove file"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                        <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] pointer-events-none">
                                                            {index + 1}{file.isPdf ? ' · PDF' : ''}{file.isNew ? ' · new' : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                                {keptProofs.length + addedFiles.length < PROOF_IMAGE_LIMIT && (
                                                    <button
                                                        type="button"
                                                        onClick={() => proofInputRef.current?.click()}
                                                        disabled={proofSaving}
                                                        className={`h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${isDarkMode
                                                            ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                                                            : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400'
                                                            }`}
                                                    >
                                                        <Plus size={20} />
                                                        <span className="text-xs font-medium">Add files</span>
                                                        <span className="text-[10px] opacity-60">Images or PDF</span>
                                                    </button>
                                                )}
                                            </div>
                                            {proofError && (
                                                <p className="text-sm text-red-500">{proofError}</p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={saveProofEdit}
                                                    disabled={proofSaving}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white disabled:opacity-50"
                                                    style={{ backgroundColor: colorPalette?.primary || '#7c3aed' }}
                                                >
                                                    {proofSaving && <Loader2 size={14} className="animate-spin" />}
                                                    {proofSaving ? 'Saving…' : 'Save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={discardProofEdit}
                                                    disabled={proofSaving}
                                                    className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors disabled:opacity-50 ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : proofUrls.length > 0 ? (
                                        <div className="mt-2 space-y-3">
                                            {proofUrls.map((url, index) => {
                                                const loaded: LoadedProof | undefined = proofFiles[url];

                                                return (
                                                    <div key={`${index}-${url}`}>
                                                        {proofUrls.length > 1 && (
                                                            <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                File {index + 1} of {proofUrls.length}{loaded?.isPdf ? ' · PDF' : ''}
                                                            </p>
                                                        )}
                                                        {loaded?.status === 'error' ? (
                                                            <p className="text-sm text-red-500 italic">Failed to load the file. <a href={url} target="_blank" rel="noreferrer" className="underline">Open link</a></p>
                                                        ) : loaded?.status !== 'ready' || !loaded.src ? (
                                                            <p className={`flex items-center gap-2 text-sm italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                <Loader2 size={14} className="animate-spin" /> Loading...
                                                            </p>
                                                        ) : loaded.isPdf ? (
                                                            // The browser's own PDF viewer, so every page can be read here.
                                                            <div className="space-y-1">
                                                                <iframe
                                                                    src={loaded.src}
                                                                    title={`Proof ${index + 1}`}
                                                                    className="w-full h-[480px] rounded border border-inherit bg-white"
                                                                />
                                                                <a href={url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 text-xs underline ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    <ExternalLink size={12} /> Open in Google Drive
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="relative group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                                                <img
                                                                    src={loaded.src}
                                                                    alt={`Proof ${index + 1}`}
                                                                    className="max-w-full rounded border border-inherit"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                                                    <ExternalLink size={20} className="text-white" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No proof attached</p>
                                    )}
                                </div>

                                {/* Who did what to this payout and when, from audit_trail_logs. */}
                                {auditTrail.length > 0 && (
                                    <div className="mt-6 mb-4">
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Audit Trail</p>
                                        <AuditTrailList entries={auditTrail} isDarkMode={isDarkMode} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionDetails;
