import { useCallback, useEffect, useRef } from 'react';

/**
 * How long to wait for a modal's onDismiss before running the next step anyway.
 * Comfortably longer than the slide/fade dismissal (~300ms); only reached if
 * the modal being closed was never actually on screen.
 */
const FALLBACK_MS = 800;

/**
 * Open one modal only once another has finished closing.
 *
 * iOS presents every React Native Modal from the screen's view controller, and
 * UIKit refuses to present while that controller is still animating the
 * previous modal away ("Attempt to present … which is already presenting …").
 * So the pattern the full app uses everywhere — close one modal and open the
 * next in the same handler — works on Android and silently shows nothing on an
 * iPhone: Submit Ticket never reached its confirmation, and Pay never reached
 * the payment link.
 *
 * Usage: queue the next step, close the current modal, and pass `onDismiss` to
 * every Modal that can be closed this way.
 *
 *     handoff.after(() => setShowConfirm(true));
 *     setShowForm(false);
 *     ...
 *     <Modal visible={showForm} onDismiss={handoff.onDismiss}>
 *
 * `dismissed()` is the same thing as a promise, for flows that also have to
 * wait on a request before deciding what to show next.
 */
export const useModalHandoff = () => {
  const queue = useRef<Array<() => void>>([]);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (fallback.current) {
      clearTimeout(fallback.current);
      fallback.current = null;
    }
    const steps = queue.current;
    queue.current = [];
    steps.forEach((step) => step());
  }, []);

  const after = useCallback((next: () => void) => {
    queue.current.push(next);
    if (!fallback.current) {
      fallback.current = setTimeout(flush, FALLBACK_MS);
    }
  }, [flush]);

  const dismissed = useCallback(() => new Promise<void>((resolve) => after(resolve)), [after]);

  useEffect(() => () => {
    if (fallback.current) clearTimeout(fallback.current);
  }, []);

  return { after, dismissed, onDismiss: flush };
};
