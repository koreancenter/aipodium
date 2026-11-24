import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorSelectionContext } from '../types';

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
  'editor:rewrite-applied': EditorRewriteAppliedPayload;
}

export type EditorBusEventName = keyof EditorBusEventMap;

type ListenerFn<K extends EditorBusEventName> = (payload: EditorBusEventMap[K]) => void;

export interface EditorEventBusContextValue {
  activeSelection: EditorSelectionContext | null;
  emit: <K extends EditorBusEventName>(event: K, payload: EditorBusEventMap[K]) => void;
  subscribe: <K extends EditorBusEventName>(event: K, listener: ListenerFn<K>) => () => void;
  publishSelection: (selection: EditorSelectionContext | null) => void;
}

const EditorEventBusContext = createContext<EditorEventBusContextValue | null>(null);

export const EditorEventBusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSelection, setActiveSelection] = useState<EditorSelectionContext | null>(null);
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

  const value = useMemo<EditorEventBusContextValue>(
    () => ({
      activeSelection,
      emit,
      subscribe,
      publishSelection,
    }),
    [activeSelection, emit, subscribe, publishSelection]
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
