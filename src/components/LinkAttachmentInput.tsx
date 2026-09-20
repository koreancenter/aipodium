import React, { useState, useRef, useEffect } from 'react';
import { Link2, RotateCw, X, ArrowRight, Github, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isWebOrGitHubUrl, fetchExternalLinkContent } from '../services/externalLinkService';
import type { ChatAttachment } from '../types';

interface LinkAttachmentInputProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAttachment: (attachment: ChatAttachment) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const LinkAttachmentInput: React.FC<LinkAttachmentInputProps> = ({
  isOpen,
  onClose,
  onAddAttachment,
  onShowToast,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setUrl('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      onShowToast('URL을 입력해주세요.', 'warn');
      return;
    }

    if (!isWebOrGitHubUrl(trimmed)) {
      onShowToast('올바른 웹페이지 또는 GitHub URL 형식이 아닙니다.', 'warn');
      return;
    }

    setIsLoading(true);
    const tempId = `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Add placeholder attachment with parsing indicator
    const placeholderAttachment: ChatAttachment = {
      id: tempId,
      name: trimmed,
      type: 'link',
      size: '분석 중...',
      url: trimmed,
      isParsing: true,
    };
    onAddAttachment(placeholderAttachment);
    onClose();

    try {
      const result = await fetchExternalLinkContent(trimmed);
      const sizeBytes = new Blob([result.content]).size;
      const formattedSize =
        sizeBytes < 1024 ? `${sizeBytes} B` : `${(sizeBytes / 1024).toFixed(1)} KB`;

      // Update the attachment with actual content
      const completedAttachment: ChatAttachment = {
        id: tempId,
        name: result.title || trimmed,
        type: 'link',
        size: formattedSize,
        url: result.url,
        content: result.content,
        parsedMarkdown: result.content,
        isParsing: false,
      };

      onAddAttachment(completedAttachment);
      onShowToast(`✓ 링크 콘텐츠가 참조 컨텍스트로 첨부되었습니다 (${result.title})`, 'success');
    } catch (err: any) {
      onShowToast(err.message || '링크 콘텐츠 추출 실패', 'error');
      // If error occurs, remove the placeholder attachment
      onAddAttachment({
        id: tempId,
        name: trimmed,
        type: 'link',
        size: '실패',
        isParsing: false,
        content: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isGitHub = url.toLowerCase().includes('github.com');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-[#121214] border border-[#222226] rounded-md shadow-2xl z-50 p-2.5 text-xs text-slate-200"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#222226] mb-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-200 text-xs">
              <Link2 className="w-3.5 h-3.5 text-[#6366f1]" />
              <span>외부 링크 첨부</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative flex items-center">
              <div className="absolute left-2 text-slate-400 pointer-events-none">
                {isGitHub ? <Github className="w-3.5 h-3.5 text-slate-300" /> : <Globe className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/... 또는 웹페이지 URL"
                disabled={isLoading}
                className="w-full bg-[#09090b] border border-[#222226] focus:border-[#6366f1] rounded-xs pl-7 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[0.625rem] text-slate-400 pt-0.5">
              <span>GitHub 파일 자동 raw 변환 및 웹 마크다운 추출</span>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="h-6 px-2.5 rounded-xs bg-[#6366f1] hover:bg-[#5457e5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[0.6875rem] font-medium flex items-center gap-1 transition cursor-pointer"
              >
                {isLoading ? (
                  <RotateCw className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <span>추가</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
