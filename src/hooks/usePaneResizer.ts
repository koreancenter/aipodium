import React, { useState, useRef, useCallback, useEffect, RefObject } from 'react';

/**
 * 갤럭시 탭 9 및 9인치 이하 태블릿 가로 모드 감지 함수
 * - 가로 방향 (landscape): 뷰포트 너비가 높이보다 큼
 * - 9인치 이하 태블릿 뷰포트 너비 기준: 1280px 이하 (예: 갤럭시 탭 A9 8.7", 탭 S9 등)
 */
export function isTabletLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  const isLandscape = window.innerWidth > window.innerHeight;
  return isLandscape && window.innerWidth <= 1280;
}

/**
 * @deprecated Deprecated in favor of the fixed Golden Ratio layout (Left: 340px, Right: 240px, Center: flex-1).
 * Main layout now uses CSS fixed widths and pure collapsible show/hide transitions without mouse drag handles.
 */
export function usePaneResizer(mainContainerRef: RefObject<HTMLElement | null>) {
  const initialIsTablet = typeof window !== 'undefined' ? isTabletLandscape() : false;

  // 태블릿 가로 모드 기본: 좌측 패널 40%, 중앙 패널 60%
  // 일반 모니터 기본: 좌측 패널 42%, 중앙 패널 33%, 우측 탐색기 25%
  const [pane1Width, setPane1Width] = useState<number>(initialIsTablet ? 40 : 42);
  const [pane2Width, setPane2Width] = useState<number>(initialIsTablet ? 60 : 33);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const [isSection1Collapsed, setIsSection1Collapsed] = useState<boolean>(false);
  const [isSection2Collapsed, setIsSection2Collapsed] = useState<boolean>(false);
  // 태블릿 가로 모드에서는 우측 패널(Section 3)이 디폴트로 접힘(true)
  const [isSection3Collapsed, setIsSection3Collapsed] = useState<boolean>(initialIsTablet);

  const isSection1CollapsedRef = useRef<boolean>(isSection1Collapsed);
  const isSection3CollapsedRef = useRef<boolean>(isSection3Collapsed);

  useEffect(() => {
    isSection1CollapsedRef.current = isSection1Collapsed;
  }, [isSection1Collapsed]);

  useEffect(() => {
    isSection3CollapsedRef.current = isSection3Collapsed;
  }, [isSection3Collapsed]);

  const isDraggingDividerRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const startPane1Ref = useRef<number>(42);
  const startPane2Ref = useRef<number>(33);

  /**
   * 현재 디바이스 크기(태블릿 가로 vs 일반 모니터)에 맞추어 패널 초기 상태 적용
   */
  const applyDefaultPanelsForCurrentDevice = useCallback(() => {
    if (isTabletLandscape()) {
      setIsSection1Collapsed(false);
      setIsSection2Collapsed(false);
      setIsSection3Collapsed(true);
      setPane1Width(40);
      setPane2Width(60);
    } else {
      setIsSection1Collapsed(false);
      setIsSection2Collapsed(false);
      setIsSection3Collapsed(false);
      setPane1Width(42);
      setPane2Width(33);
    }
  }, []);

  /**
   * 좌측 패널(Section 1) 상태 변경 세터 (태블릿 역동기화 지원)
   * - 태블릿 가로 모드에서 좌측 패널을 열 경우: 우측 패널(Section 3)을 자동으로 접음 (좌측+중앙 표시)
   */
  const setSection1CollapsedSafe = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setIsSection1Collapsed(prev1 => {
      const next1 = typeof action === 'function' ? action(prev1) : action;
      // 좌측 패널을 '열 때' (next1 === false)
      if (!next1) {
        if (isTabletLandscape()) {
          // 태블릿 가로 모드: 우측 패널 자동 닫기 (역동기화)
          setIsSection3Collapsed(true);
          setPane1Width(40);
          setPane2Width(60);
        } else {
          // 일반 모니터: 3개 패널이 나란히 보일 수 있도록 너비 균형 조정
          setPane1Width(p1 => (p1 > 45 ? 38 : p1));
          setPane2Width(p2 => (p2 > 45 ? 37 : p2));
        }
      }
      return next1;
    });
  }, []);

  /**
   * 우측 패널(Section 3) 상태 변경 세터 (태블릿 역동기화 지원)
   * - 태블릿 가로 모드에서 우측 패널을 열 경우: 좌측 패널(Section 1)을 자동으로 접음 (중앙+우측 표시)
   */
  const setSection3CollapsedSafe = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setIsSection3Collapsed(prev3 => {
      const next3 = typeof action === 'function' ? action(prev3) : action;
      // 우측 패널을 '열 때' (next3 === false)
      if (!next3) {
        if (isTabletLandscape()) {
          // 태블릿 가로 모드: 좌측 패널 자동 닫기 (역동기화)
          setIsSection1Collapsed(true);
          setPane2Width(70); // 중앙 에디터 70%, 우측 탐색기 30%
        } else {
          // 일반 모니터: 3개 패널이 나란히 보일 수 있도록 너비 균형 조정
          setPane1Width(p1 => (p1 > 45 ? 38 : p1));
          setPane2Width(p2 => (p2 > 45 ? 37 : p2));
        }
      }
      return next3;
    });
  }, []);

  // 분할 바 드래그 이동 처리 공통 로직
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDraggingDividerRef.current || !mainContainerRef.current) return;
    const containerWidth = mainContainerRef.current.clientWidth;
    if (!containerWidth) return;

    const deltaX = clientX - startXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (isDraggingDividerRef.current === 1) {
      // 우측 패널이 접혀 있는 경우 1번 분할 바는 좌측(대화창)과 중앙(에디터) 전체 100% 분할
      const isSec3Collapsed = isSection3CollapsedRef.current;
      const totalAvailable = isSec3Collapsed ? 100 : (startPane1Ref.current + startPane2Ref.current);

      let newPane1 = startPane1Ref.current + deltaPercent;
      const minPane1Percent = Math.max(15, (220 / containerWidth) * 100);
      const minPane2Percent = Math.max(20, (300 / containerWidth) * 100);

      newPane1 = Math.max(minPane1Percent, Math.min(totalAvailable - minPane2Percent, newPane1));
      const newPane2 = Math.max(minPane2Percent, totalAvailable - newPane1);

      setPane1Width(newPane1);
      setPane2Width(newPane2);
    } else if (isDraggingDividerRef.current === 2) {
      const isSec1Collapsed = isSection1CollapsedRef.current;
      let newPane2 = startPane2Ref.current + deltaPercent;
      const minPane2Percent = Math.max(15, (300 / containerWidth) * 100);
      const minPane3Percent = Math.max(12, (180 / containerWidth) * 100);
      const maxPane2 = isSec1Collapsed
        ? 100 - minPane3Percent
        : 100 - startPane1Ref.current - minPane3Percent;

      newPane2 = Math.max(minPane2Percent, Math.min(maxPane2, newPane2));
      setPane2Width(newPane2);
    } else if (isDraggingDividerRef.current === 3) {
      let newPane1 = startPane1Ref.current + deltaPercent;
      newPane1 = Math.max(15, Math.min(85, newPane1));
      setPane1Width(newPane1);
    }
  }, [mainContainerRef]);

  // 마우스 기반 드래그 시작
  const handleMouseDownDivider = useCallback((dividerIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDividerRef.current = dividerIndex;
    setIsResizing(true);
    startXRef.current = e.clientX;
    startPane1Ref.current = pane1Width;
    startPane2Ref.current = pane2Width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleDragMove(moveEvent.clientX);
    };

    const onMouseUp = () => {
      isDraggingDividerRef.current = null;
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [pane1Width, pane2Width, handleDragMove]);

  // 터치 기반 드래그 시작 (태블릿 지원)
  const handleTouchStartDivider = useCallback((dividerIndex: number, e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    isDraggingDividerRef.current = dividerIndex;
    setIsResizing(true);
    startXRef.current = touch.clientX;
    startPane1Ref.current = pane1Width;
    startPane2Ref.current = pane2Width;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        handleDragMove(moveEvent.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      isDraggingDividerRef.current = null;
      setIsResizing(false);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  }, [pane1Width, pane2Width, handleDragMove]);

  return {
    pane1Width,
    setPane1Width,
    pane2Width,
    setPane2Width,
    isResizing,
    isSection1Collapsed,
    setIsSection1Collapsed: setSection1CollapsedSafe,
    isSection2Collapsed,
    setIsSection2Collapsed,
    isSection3Collapsed,
    setIsSection3Collapsed: setSection3CollapsedSafe,
    handleMouseDownDivider,
    handleTouchStartDivider,
    applyDefaultPanelsForCurrentDevice
  };
}
