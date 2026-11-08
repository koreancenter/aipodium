import React from 'react';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Download,
  FileText,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { ProjectEvent } from '../../types';

export interface EventManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionTitle?: string;
  projectEvents: ProjectEvent[];
  eventFilter: 'all' | 'milestone' | 'meeting' | 'deadline' | 'task';
  onFilterChange: (filter: 'all' | 'milestone' | 'meeting' | 'deadline' | 'task') => void;
  isExtractingEvents: boolean;
  onExtractEvents: () => void;
  onExportEventsToEditor: () => void;
  onExportEventsIcs: () => void;
  newEventTitle: string;
  onNewEventTitleChange: (value: string) => void;
  newEventDate: string;
  onNewEventDateChange: (value: string) => void;
  newEventType: 'milestone' | 'meeting' | 'deadline' | 'task';
  onNewEventTypeChange: (value: 'milestone' | 'meeting' | 'deadline' | 'task') => void;
  newEventPriority: 'high' | 'medium' | 'low';
  onNewEventPriorityChange: (value: 'high' | 'medium' | 'low') => void;
  newEventNotes: string;
  onNewEventNotesChange: (value: string) => void;
  onAddEvent: () => void;
  onToggleEventCompleted: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

export const EventManagerModal: React.FC<EventManagerModalProps> = ({
  isOpen,
  onClose,
  activeSessionTitle,
  projectEvents,
  eventFilter,
  onFilterChange,
  isExtractingEvents,
  onExtractEvents,
  onExportEventsToEditor,
  onExportEventsIcs,
  newEventTitle,
  onNewEventTitleChange,
  newEventDate,
  onNewEventDateChange,
  newEventType,
  onNewEventTypeChange,
  newEventPriority,
  onNewEventPriorityChange,
  newEventNotes,
  onNewEventNotesChange,
  onAddEvent,
  onToggleEventCompleted,
  onDeleteEvent
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#222226] rounded-xs max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222226] pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">프로젝트 일정 및 마일스톤 관리</h3>
              <p className="text-[0.6875rem] text-slate-400">
                프로젝트: <strong className="text-indigo-300">'{activeSessionTitle || 'AI 지식 비서'}'</strong> 기준 일정 관리
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xs hover:bg-[#18181b] transition cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#09090b] p-2 rounded-xs border border-[#222226]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExtractEvents}
              disabled={isExtractingEvents}
              className="px-2.5 py-1.5 rounded-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              {isExtractingEvents ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              )}
              <span>인공지능 일정 자동 추출</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportEventsToEditor}
              className="px-2.5 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#222226] cursor-pointer"
              title="에디터에 마크다운 일정표로 삽입"
            >
              <FileText className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>에디터로 전송</span>
            </button>
            <button
              type="button"
              onClick={onExportEventsIcs}
              className="px-2.5 py-1.5 rounded-xs bg-[#121214] hover:bg-[#18181b] text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-[#222226] cursor-pointer"
              title="캘린더 파일 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>캘린더 파일 내보내기</span>
            </button>
          </div>
        </div>

        {/* Add Event Form */}
        <div className="bg-[#09090b] p-3 rounded-xs border border-[#222226] space-y-2">
          <div className="text-[0.6875rem] font-semibold text-slate-300 flex items-center gap-1">
            <CalendarPlus className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>새 일정 및 마일스톤 추가</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => onNewEventTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAddEvent(); }}
              placeholder="일정 또는 마일스톤 명칭 입력..."
              className="sm:col-span-5 bg-[#121214] border border-[#222226] rounded-xs px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#6366f1]"
            />
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => onNewEventDateChange(e.target.value)}
              className="sm:col-span-3 bg-[#121214] border border-[#222226] rounded-xs px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] font-mono"
            />
            <select
              value={newEventType}
              onChange={(e) => onNewEventTypeChange(e.target.value as any)}
              className="sm:col-span-2 bg-[#121214] border border-[#222226] rounded-xs px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] cursor-pointer"
            >
              <option value="task">작업</option>
              <option value="milestone">마일스톤</option>
              <option value="meeting">회의</option>
              <option value="deadline">마감</option>
            </select>
            <select
              value={newEventPriority}
              onChange={(e) => onNewEventPriorityChange(e.target.value as any)}
              className="sm:col-span-2 bg-[#121214] border border-[#222226] rounded-xs px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#6366f1] cursor-pointer"
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newEventNotes}
              onChange={(e) => onNewEventNotesChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAddEvent(); }}
              placeholder="상세 메모 또는 설명 (선택사항)..."
              className="flex-1 bg-[#121214] border border-[#222226] rounded-xs px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#6366f1]"
            />
            <button
              type="button"
              onClick={onAddEvent}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xs text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between text-xs border-b border-[#222226] pb-1">
          <div className="flex items-center gap-1">
            {(['all', 'milestone', 'task', 'meeting', 'deadline'] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => onFilterChange(filterKey)}
                className={`px-2.5 py-1 rounded-xs text-[0.6875rem] font-medium transition cursor-pointer ${
                  eventFilter === filterKey
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18181b]'
                }`}
              >
                {filterKey === 'all' && `전체 (${projectEvents.length})`}
                {filterKey === 'milestone' && `마일스톤 (${projectEvents.filter((e) => e.type === 'milestone').length})`}
                {filterKey === 'task' && `작업 (${projectEvents.filter((e) => e.type === 'task').length})`}
                {filterKey === 'meeting' && `회의 (${projectEvents.filter((e) => e.type === 'meeting').length})`}
                {filterKey === 'deadline' && `마감일 (${projectEvents.filter((e) => e.type === 'deadline').length})`}
              </button>
            ))}
          </div>
          <span className="text-[0.6875rem] text-slate-400 font-mono">
            완료: {projectEvents.filter((e) => e.completed).length} / {projectEvents.length}
          </span>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[300px] custom-scrollbar">
          {projectEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              등록된 프로젝트 일정이 없습니다. 상단의 '인공지능 일정 자동 추출'을 실행해 보세요.
            </div>
          ) : (
            projectEvents
              .filter((e) => eventFilter === 'all' || e.type === eventFilter)
              .map((evt) => (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded-xs border transition flex items-center justify-between gap-3 ${
                    evt.completed
                      ? 'bg-[#09090b]/40 border-[#222226] opacity-60'
                      : 'bg-[#09090b] border-[#222226] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={evt.completed}
                      onChange={() => onToggleEventCompleted(evt.id)}
                      className="w-4 h-4 rounded-xs border-[#222226] bg-[#09090b] text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            evt.completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {evt.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-xs text-[0.5625rem] font-medium uppercase ${
                            evt.type === 'milestone'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80'
                              : evt.type === 'deadline'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                              : evt.type === 'meeting'
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                              : 'bg-[#121214] text-slate-300 border border-[#222226]'
                          }`}
                        >
                          {evt.type === 'milestone' ? '마일스톤' : evt.type === 'deadline' ? '마감' : evt.type === 'meeting' ? '회의' : '작업'}
                        </span>
                        <span
                          className={`text-[0.5625rem] font-medium ${
                            evt.priority === 'high'
                              ? 'text-rose-400'
                              : evt.priority === 'medium'
                              ? 'text-amber-400'
                              : 'text-indigo-400'
                          }`}
                        >
                          {evt.priority === 'high' ? '높음' : evt.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                      </div>
                      {evt.notes && (
                        <span className="text-[0.6875rem] text-slate-400 truncate mt-0.5">{evt.notes}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {evt.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(evt.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                      title="일정 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-[#222226] flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[0.6875rem]">
            Google Calendar 및 iCal 표준 포맷 완벽 호환
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#121214] hover:bg-[#18181b] text-slate-200 px-4 py-1.5 rounded-xs font-medium transition cursor-pointer border border-[#222226]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
