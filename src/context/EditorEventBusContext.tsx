import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSelectionContext, PinnedReferenceAnchor } from '../types';

export interface EditorRewriteAppliedPayload {
  id?: string;
  prompt?: string;
  originalText: string;
  rewrittenText: string;
  fileName?: string;
  mode?: 'wysiwyg' | 'edit' | 'split' | 'preview';
  startOffset?: number;
  endOffset?: number;
  createdAt?: number;
}

export interface EditorBusEventMap {
  'editor:selection-change': EditorSelectionContext | null;
  'editor:pin-anchor': PinnedReferenceAnchor;
  'editor:unpin-anchor': { id?: string };
  'editor:rewrite-with-ai': EditorSelectionContext;
  'editor:rewrite-applied': EditorRewriteAppliedPayload;
  'chat:open-panel': { focusInput?: boolean } | undefined;
}

export type EditorBusEventName = keyof EditorBusEventMap;

type ListenerFn<K extends EditorBusEventName> = (payload: EditorBusEventMap[K]) => void;

export interface EditorEventBusContextValue {
  activeSelection: EditorSelectionContext | null;
  pinnedAnchors: PinnedReferenceAnchor[];
  emit: <K extends EditorBusEventName>(event: K, payload: EditorBusEventMap[K]) => void;
  subscribe: <K extends EditorBusEventName>(event: K, listener: ListenerFn<K>) => () => void;
  publishSelection: (selection: EditorSelectionContext | null) => void;
  pinSelection: (selection: EditorSelectionContext) => PinnedReferenceAnchor | null;
  unpinAnchor: (id: string) => void;
  clearPinnedAnchors: () => void;
  triggerRewriteWithAi: (selection: EditorSelectionContext) => void;
}

const EditorEventBusContext = createContext<EditorEventBusContextValue | null>(null);

const MAX_PINNED_ANCHORS = 5;

export const EditorEventBusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSelection, setActiveSelection] = useState<EditorSelectionContext | null>(null);
  const [pinnedAnchors, setPinnedAnchors] = useState<PinnedReferenceAnchor[]>([]);
  const listenersRef = useRef<Map<EditorBusEventName, Set<ListenerFn<any>>>>(new Map());

  const subscribe = useCallback(<K extends EditorBusEventName>(event: K, listener: ListenerFn<K>) => {
    let set = listenersRef.current.get(event);
    if (!set) {
      set = new Set();
      listenersRef.current.set(event, set);
    }
    set.add(listener);
    return () => {
      const current = listenersRef.current.get(event);
      if (current) {
        current.delete(listener);
      }
    };
  }, []);

  const emit = useCallback(<K extends EditorBusEventName>(event: K, payload: EditorBusEventMap[K]) => {
    const listeners = listenersRef.current.get(event);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.warn(`[EditorEventBus] Listener error on "${event}":`, err);
        }
      });
    }
  }, []);

  const publishSelection = useCallback(
    (selection: EditorSelectionContext | null) => {
      setActiveSelection(selection);
      emit('editor:selection-change', selection);
    },
    [emit]
  );

  const pinSelection = useCallback(
    (selection: EditorSelectionContext): PinnedReferenceAnchor | null => {
      const normalizedText = selection?.text?.trim();
      if (!normalizedText) return null;

      const anchor: PinnedReferenceAnchor = {
        id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: normalizedText,
        fileName: selection.fileName,
        mode: selection.mode,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        pinnedAt: Date.now(),
      };

      setPinnedAnchors((prev) => {
        const deduplicated = prev.filter(
          (item) => !(item.text === anchor.text && (item.fileName || '') === (anchor.fileName || ''))
        );
        return [anchor, ...deduplicated].slice(0, MAX_PINNED_ANCHORS);
      });

      emit('editor:pin-anchor', anchor);
      emit('chat:open-panel', { focusInput: false });
      return anchor;
    },
    [emit]
  );

  const unpinAnchor = useCallback(
    (id: string) => {
      setPinnedAnchors((prev) => prev.filter((item) => item.id !== id));
      emit('editor:unpin-anchor', { id });
    },
    [emit]
  );

  const clearPinnedAnchors = useCallback(() => {
    setPinnedAnchors([]);
    emit('editor:unpin-anchor', {});
  }, [emit]);

  const triggerRewriteWithAi = useCallback(
    (selection: EditorSelectionContext) => {
      if (!selection?.text?.trim()) return;
      emit('editor:rewrite-with-ai', selection);
      emit('chat:open-panel', { focusInput: true });
    },
    [emit]
  );

  const value = useMemo<EditorEventBusContextValue>(
    () => ({
      activeSelection,
      pinnedAnchors,
      emit,
      subscribe,
      publishSelection,
      pinSelection,
      unpinAnchor,
      clearPinnedAnchors,
      triggerRewriteWithAi,
    }),
    [
      activeSelection,
      pinnedAnchors,
      emit,
      subscribe,
      publishSelection,
      pinSelection,
      unpinAnchor,
      clearPinnedAnchors,
      triggerRewriteWithAi,
    ]
  );

  return <EditorEventBusContext.Provider value={value}>{children}</EditorEventBusContext.Provider>;
};

export function useEditorEventBus(): EditorEventBusContextValue {
  const ctx = useContext(EditorEventBusContext);
  if (!ctx) {
    throw new Error('useEditorEventBus must be used within an EditorEventBusProvider');
  }
  return ctx;
}

export function useOptionalEditorEventBus(): EditorEventBusContextValue | null {
  return useContext(EditorEventBusContext);
}

export function useEditorEventSubscription<K extends EditorBusEventName>(
  event: K,
  handler: ListenerFn<K>
): void {
  const bus = useOptionalEditorEventBus();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!bus) return;
    return bus.subscribe(event, (payload) => {
      handlerRef.current(payload);
    });
  }, [bus, event]);
}
