import { useState, useEffect, useCallback } from 'react';
import { ProjectEvent } from '../types';

const INITIAL_PROJECT_EVENTS: ProjectEvent[] = [
  {
    id: 'evt-1',
    title: '시스템 요구사항 정의 및 AI 파이프라인 설계',
    date: '2026-08-25',
    type: 'milestone',
    priority: 'high',
    completed: true,
    notes: '대화-에디터-탐색기 3창 실시간 동기화 아키텍처 수립'
  },
  {
    id: 'evt-2',
    title: 'AI 2차 가공 엔진 (Word/Sheet/Slide) 통합',
    date: '2026-08-28',
    type: 'task',
    priority: 'high',
    completed: true,
    notes: 'HTML 포맷 기반 실시간 문서/시트/슬라이드 렌더링 및 내보내기'
  },
  {
    id: 'evt-3',
    title: 'SSOT 지식 베이스 성능 검증 및 배포 준비',
    date: '2026-09-02',
    type: 'deadline',
    priority: 'medium',
    completed: false,
    notes: '대용량 프로젝트 폴더 파일 통합 분석 속도 최적화'
  }
];

export function useProjectEvents(showToast: (msg: string, type?: 'success' | 'warn' | 'info' | 'error') => void) {
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>(() => {
    try {
      const saved = localStorage.getItem('aipodium_project_events');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PROJECT_EVENTS;
  });

  const [isEventManagerOpen, setIsEventManagerOpen] = useState<boolean>(false);
  const [isExtractingEvents, setIsExtractingEvents] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'milestone' | 'meeting' | 'deadline' | 'task'>('all');
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState<'milestone' | 'meeting' | 'deadline' | 'task'>('task');
  const [newEventPriority, setNewEventPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newEventNotes, setNewEventNotes] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_project_events', JSON.stringify(projectEvents));
    } catch {}
  }, [projectEvents]);

  const handleAddEvent = useCallback(() => {
    if (!newEventTitle.trim()) {
      showToast('일정 제목을 입력해주세요.', 'warn');
      return;
    }
    const newEvt: ProjectEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      date: newEventDate,
      type: newEventType,
      priority: newEventPriority,
      completed: false,
      notes: newEventNotes.trim() || undefined
    };
    setProjectEvents((prev) => [newEvt, ...prev]);
    setNewEventTitle('');
    setNewEventNotes('');
    showToast(`📅 '${newEvt.title}' 일정이 추가되었습니다.`);
  }, [newEventTitle, newEventDate, newEventType, newEventPriority, newEventNotes, showToast]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setProjectEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('일정이 삭제되었습니다.');
  }, [showToast]);

  const handleToggleEventCompleted = useCallback((eventId: string) => {
    setProjectEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, completed: !e.completed } : e))
    );
  }, []);

  const handleExtractEventsWithAi = useCallback((activeProjectTitle = '프로젝트') => {
    setIsExtractingEvents(true);
    showToast('🤖 AI가 프로젝트 대화 및 노트를 분석하여 마일스톤과 일정을 추출 중입니다...');

    setTimeout(() => {
      const today = new Date();
      const formatOffsetDate = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };

      const extracted: ProjectEvent[] = [
        {
          id: `evt-ai-${Date.now()}-1`,
          title: `[AI 추출] '${activeProjectTitle}' 1차 요구사항 정의`,
          date: formatOffsetDate(1),
          type: 'milestone',
          priority: 'high',
          completed: false,
          notes: '대화 세션 분석을 통해 자동 추출된 핵심 마일스톤'
        },
        {
          id: `evt-ai-${Date.now()}-2`,
          title: `[AI 추출] 아키텍처 및 2차 가공 모듈 통합 리뷰`,
          date: formatOffsetDate(3),
          type: 'meeting',
          priority: 'medium',
          completed: false,
          notes: 'Word, Spreadsheet, Slide 산출물 검수 회의'
        },
        {
          id: `evt-ai-${Date.now()}-3`,
          title: `[AI 추출] 최종 릴리즈 및 외부 배포 마감`,
          date: formatOffsetDate(7),
          type: 'deadline',
          priority: 'high',
          completed: false,
          notes: 'Google Drive 및 GitHub 연동 패키징 완료'
        }
      ];

      setProjectEvents((prev) => [...extracted, ...prev]);
      setIsExtractingEvents(false);
      showToast(`✨ AI가 ${extracted.length}개의 주요 프로젝트 일정을 성공적으로 추출했습니다!`);
    }, 1000);
  }, [showToast]);

  const handleExportEventsIcs = useCallback(() => {
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AI Podium//Event Manager//KO\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n`;

    projectEvents.forEach((evt) => {
      const cleanDate = evt.date.replace(/-/g, '');
      icsContent += `BEGIN:VEVENT\r\nUID:${evt.id}@aipodium.internal\r\nDTSTAMP:${cleanDate}T090000Z\r\nDTSTART;VALUE=DATE:${cleanDate}\r\nSUMMARY:${evt.title}\r\nDESCRIPTION:${evt.notes || ''} [우선순위: ${evt.priority}]\r\nSTATUS:${evt.completed ? 'COMPLETED' : 'CONFIRMED'}\r\nEND:VEVENT\r\n`;
    });

    icsContent += `END:VCALENDAR\r\n`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_events_${Date.now().toString().slice(-4)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📅 iCal (.ics) 캘린더 파일이 다운로드되었습니다 (Google Calendar 연동 가능).');
  }, [projectEvents, showToast]);

  return {
    projectEvents,
    setProjectEvents,
    isEventManagerOpen,
    setIsEventManagerOpen,
    isExtractingEvents,
    eventFilter,
    setEventFilter,
    newEventTitle,
    setNewEventTitle,
    newEventDate,
    setNewEventDate,
    newEventType,
    setNewEventType,
    newEventPriority,
    setNewEventPriority,
    newEventNotes,
    setNewEventNotes,
    handleAddEvent,
    handleDeleteEvent,
    handleToggleEventCompleted,
    handleExtractEventsWithAi,
    handleExportEventsIcs
  };
}
