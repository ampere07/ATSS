import { useEffect, useState } from 'react';

/**
 * Proof-of-payment files: what can be attached, and how a saved one is loaded
 * for display. Shared by the payout form and the payout details panel.
 *
 * A proof is a Google Drive link, and nothing in the link says whether it is
 * an image or a PDF. So a saved proof is fetched once through the API's Drive
 * proxy and its type read from the file itself; the same download is then
 * what is displayed, so nothing is fetched twice.
 */

/** The file picker's filter: images and PDFs. */
export const PROOF_FILE_ACCEPT = 'image/*,application/pdf';

/** Per file. Larger uploads are refused before they are sent. */
export const PROOF_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const isPdfFile = (file: File) =>
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export const isAcceptedProofFile = (file: File) =>
    file.type.startsWith('image/') || isPdfFile(file);

/**
 * Sort picked files into those that can be attached and a message about the
 * ones that cannot (wrong type, or over the size limit). The message is null
 * when everything picked was accepted.
 */
export const screenProofFiles = (picked: File[]): { accepted: File[]; problem: string | null } => {
    const wrongType = picked.filter(f => !isAcceptedProofFile(f));
    const tooBig = picked.filter(f => isAcceptedProofFile(f) && f.size > PROOF_FILE_MAX_BYTES);
    const accepted = picked.filter(f => isAcceptedProofFile(f) && f.size <= PROOF_FILE_MAX_BYTES);

    const problems = [
        wrongType.length ? `${wrongType.length} file(s) skipped: only images and PDFs can be attached.` : '',
        tooBig.length ? `${tooBig.length} file(s) skipped: each file must be ${PROOF_FILE_MAX_BYTES / (1024 * 1024)} MB or smaller.` : '',
    ].filter(Boolean);

    return { accepted, problem: problems.length ? problems.join(' ') : null };
};

/** A Drive link as a URL the browser can load, through the API's proxy. */
export const proxiedProof = (url: string) =>
    `${process.env.REACT_APP_API_BASE_URL}/proxy/image?url=${encodeURIComponent(url)}`;

export interface LoadedProof {
    status: 'loading' | 'ready' | 'error';
    /** A local object URL for the downloaded file, once ready. */
    src?: string;
    isPdf?: boolean;
}

/**
 * Load saved proofs for display, keyed by their Drive link.
 *
 * Read as a PDF when the proxy says so or when the file starts with "%PDF-",
 * since Drive does not always label a PDF as one. Object URLs are released
 * when the list changes or the component unmounts.
 */
export const useProofFiles = (urls: string[]): Record<string, LoadedProof> => {
    const [files, setFiles] = useState<Record<string, LoadedProof>>({});
    const key = urls.join('\n');

    useEffect(() => {
        let cancelled = false;
        const created: string[] = [];

        setFiles(Object.fromEntries(urls.map(url => [url, { status: 'loading' } as LoadedProof])));

        urls.forEach(async (url) => {
            try {
                const res = await fetch(proxiedProof(url));
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                const isPdf = blob.type === 'application/pdf'
                    || (await blob.slice(0, 5).text()) === '%PDF-';
                if (cancelled) return;

                // Typed explicitly so the browser's PDF viewer takes it even when
                // the proxy passed it on as a generic download.
                const src = URL.createObjectURL(isPdf ? new Blob([blob], { type: 'application/pdf' }) : blob);
                created.push(src);
                setFiles(prev => ({ ...prev, [url]: { status: 'ready', src, isPdf } }));
            } catch {
                if (!cancelled) setFiles(prev => ({ ...prev, [url]: { status: 'error' } }));
            }
        });

        return () => {
            cancelled = true;
            created.forEach(src => URL.revokeObjectURL(src));
        };
        // `key` stands for `urls`: a new array with the same links is not a change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return files;
};
