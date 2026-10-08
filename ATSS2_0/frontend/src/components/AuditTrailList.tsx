import React from 'react';

/** One field an audit entry changed, old and new as the API normalised them. */
export interface AuditChange {
    field: string;
    label: string;
    kind: 'text' | 'money' | 'images';
    old: string | string[] | null;
    new: string | string[] | null;
}

/** One entry in a record's audit trail: who, when, what, and the fields it changed. */
export interface AuditEntry {
    id: number;
    action: string;
    changed_by: string;
    changed_at: string;
    changes: AuditChange[];
}

interface AuditTrailListProps {
    entries: AuditEntry[];
    isDarkMode: boolean;
}

const renderImageLinks = (urls: string[]) => urls.length === 0
    ? <span className="italic">none</span>
    : urls.map((url, i) => (
        <React.Fragment key={`${i}-${url}`}>
            {i > 0 && ', '}
            <a href={url} target="_blank" rel="noreferrer" className="underline hover:opacity-80">
                File {i + 1}
            </a>
        </React.Fragment>
    ));

/** One side of an audited change, formatted for its kind. */
const renderAuditValue = (kind: AuditChange['kind'], value: AuditChange['old']) => {
    if (kind === 'images') {
        return renderImageLinks(Array.isArray(value) ? value : []);
    }
    if (value === null || value === undefined || value === '') {
        return <span className="italic">empty</span>;
    }
    if (kind === 'money') {
        return `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return String(value);
};

/**
 * A record's audit trail, as the API's audit-trail endpoints return it: who did
 * what and when, newest first, with each changed field's old and new value.
 * A creation lists the values the record started with. Renders nothing when
 * there are no entries.
 */
const AuditTrailList: React.FC<AuditTrailListProps> = ({ entries, isDarkMode }) => {
    if (entries.length === 0) return null;

    return (
        <div className="space-y-2">
            {entries.map(entry => (
                <div
                    key={entry.id}
                    className={`rounded-lg border p-3 text-xs space-y-1.5 ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'}`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {entry.action}
                        </span>
                        <span>{entry.changed_at ? new Date(entry.changed_at).toLocaleString() : '-'}</span>
                    </div>
                    <div>By {entry.changed_by || '-'}</div>
                    {entry.changes.length > 0 && (
                        <div className={`pt-1.5 border-t space-y-1 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            {entry.changes.map(change => (
                                <div key={change.field} className="flex gap-2">
                                    <span className="w-32 flex-shrink-0">{change.label}</span>
                                    <span className={`min-w-0 break-words ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {entry.action === 'Created'
                                            ? renderAuditValue(change.kind, change.new)
                                            : (
                                                <>
                                                    <span className="opacity-60">{renderAuditValue(change.kind, change.old)}</span>
                                                    {' → '}
                                                    {renderAuditValue(change.kind, change.new)}
                                                </>
                                            )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default AuditTrailList;
