'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionableUser, CommentMention } from '@/types/comments';

/**
 * Phase 14: Comment Input Component
 * 
 * Text input with @mention support.
 */

interface CommentInputProps {
  onSend: (content: string, mentions: CommentMention[]) => void;
  mentionableUsers?: MentionableUser[];
  placeholder?: string;
  isSending?: boolean;
  disabled?: boolean;
}

export function CommentInput({
  onSend,
  mentionableUsers = [],
  placeholder = 'Add a comment...',
  isSending = false,
  disabled = false,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentions, setMentions] = useState<CommentMention[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Handle @ typing
  const handleChange = (value: string) => {
    setContent(value);
    
    // Check if user is typing a mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      // Only show mentions if @ is at start or after a space
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || charBeforeAt === '\n') && !textAfterAt.includes(' ')) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };
  
  // Filter users for mention dropdown
  const filteredUsers = mentionableUsers.filter(user =>
    user.name.toLowerCase().includes(mentionFilter) ||
    user.email.toLowerCase().includes(mentionFilter)
  ).slice(0, 5);
  
  // Insert mention
  const insertMention = (user: MentionableUser) => {
    const lastAtIndex = content.lastIndexOf('@');
    const beforeAt = content.slice(0, lastAtIndex);
    const afterMention = content.slice(lastAtIndex + 1 + mentionFilter.length);
    
    const mentionText = `@${user.name}`;
    const newContent = `${beforeAt}${mentionText}${afterMention} `;
    
    // Track mention position
    const mention: CommentMention = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      startIndex: lastAtIndex,
      endIndex: lastAtIndex + mentionText.length,
    };
    
    setMentions([...mentions, mention]);
    setContent(newContent);
    setShowMentions(false);
    
    // Focus textarea
    textareaRef.current?.focus();
  };
  
  // Handle send
  const handleSend = () => {
    if (!content.trim() || isSending) return;
    
    onSend(content.trim(), mentions);
    setContent('');
    setMentions([]);
  };
  
  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    
    // Close mentions on Escape
    if (e.key === 'Escape' && showMentions) {
      e.preventDefault();
      setShowMentions(false);
    }
  };
  
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={2}
            className="resize-none pr-10"
          />
          
          {/* @ hint */}
          {mentionableUsers.length > 0 && (
            <button
              type="button"
              className="absolute right-2 top-2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              onClick={() => {
                setContent(content + '@');
                setShowMentions(true);
                textareaRef.current?.focus();
              }}
              title="Mention someone"
            >
              <AtSign className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!content.trim() || isSending || disabled}
          size="sm"
          className="self-end"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Mention dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-md shadow-lg">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
              onClick={() => insertMention(user)}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[var(--accent-blue)] flex items-center justify-center text-white text-xs font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Keyboard hint */}
      <div className="text-xs text-[var(--text-tertiary)] mt-1">
        Press <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded">⌘</kbd> + <kbd className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded">Enter</kbd> to send
      </div>
    </div>
  );
}
