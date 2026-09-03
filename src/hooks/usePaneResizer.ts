import React, { useState, useRef, useCallback, RefObject } from 'react';

export function usePaneResizer(mainContainerRef: RefObject<HTMLElement | null>) {
  const [pane1Width, setPane1Width] = useState<number>(42);
  const [pane2Width, setPane2Width] = useState<number>(33);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const [isSection1Collapsed, setIsSection1Collapsed] = useState<boolean>(false);
  const [isSection2Collapsed, setIsSection2Collapsed] = useState<boolean>(false);
  const [isSection3Collapsed, setIsSection3Collapsed] = useState<boolean>(false);

  const isDraggingDividerRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const startPane1Ref = useRef<number>(42);
  const startPane2Ref = useRef<number>(33);

  const handleMouseDownDivider = useCallback((dividerIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDividerRef.current = dividerIndex;
    setIsResizing(true);
    startXRef.current = e.clientX;
    startPane1Ref.current = pane1Width;
    startPane2Ref.current = pane2Width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingDividerRef.current || !mainContainerRef.current) return;
      const containerWidth = mainContainerRef.current.clientWidth;
      if (!containerWidth) return;

      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      if (isDraggingDividerRef.current === 1) {
        const totalFirstTwo = startPane1Ref.current + startPane2Ref.current;
        let newPane1 = startPane1Ref.current + deltaPercent;
        const minPane2Percent = Math.max(15, (560 / containerWidth) * 100);
        const minPane1Percent = Math.max(15, (250 / containerWidth) * 100);
        newPane1 = Math.max(minPane1Percent, Math.min(totalFirstTwo - minPane2Percent, newPane1));
        const newPane2 = Math.max(minPane2Percent, totalFirstTwo - newPane1);

        setPane1Width(newPane1);
        setPane2Width(newPane2);
      } else if (isDraggingDividerRef.current === 2) {
        let newPane2 = startPane2Ref.current + deltaPercent;
        const minPane2Percent = Math.max(15, (560 / containerWidth) * 100);
        const minPane3Percent = Math.max(12, (200 / containerWidth) * 100);
        const maxPane2 = 100 - startPane1Ref.current - minPane3Percent;
        newPane2 = Math.max(minPane2Percent, Math.min(maxPane2, newPane2));

        setPane2Width(newPane2);
      } else if (isDraggingDividerRef.current === 3) {
        let newPane1 = startPane1Ref.current + deltaPercent;
        newPane1 = Math.max(15, Math.min(85, newPane1));
        setPane1Width(newPane1);
      }
    };

    const handleMouseUp = () => {
      isDraggingDividerRef.current = null;
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [pane1Width, pane2Width, mainContainerRef]);

  return {
    pane1Width,
    setPane1Width,
    pane2Width,
    setPane2Width,
    isResizing,
    isSection1Collapsed,
    setIsSection1Collapsed,
    isSection2Collapsed,
    setIsSection2Collapsed,
    isSection3Collapsed,
    setIsSection3Collapsed,
    handleMouseDownDivider
  };
}
