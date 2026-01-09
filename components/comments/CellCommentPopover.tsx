'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  X, 
  Check,
  RefreshCw,
  RotateCcw,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { CommentThread, CellComment, MentionableUser } from '@/types/comments';
import { 
  getThreadsForCell, 
  getComments, 
  resolveThread, 
  reopenThread,
  createThread,
  addComment,
} from '@/lib/services/commentService';
import { CommentInput } from './CommentInput';
import { CommentBubble } from './CommentBubble';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * Phase 14: Cell Comment Popover
 * 
 * Shows comment threads for a specific cell.
 * Supports adding comments, @mentions, and resolving threads.
 */

interface CellCommentPopoverProps {
  projectId: string;
  itemId: string;
  itemCode: string;
  itemDescription?: string;
  field: string;
  fieldDisplayName: string;
  
  // Current state
  hasComments?: boolean;
  commentCount?: number;
  
  // Available users for @mentions
  mentionableUsers?: MentionableUser[];
  
  // Callbacks
  onCommentAdded?: () => void;
  onThreadResolved?: () => void;
  onCreateTask?: (threadId: string, commentId?: string) => void;
  
  // Trigger customization
  children?: React.ReactNode;
  
  // Disabled state
  disabled?: boolean;
}

export function CellCommentPopover({
  projectId,
  itemId,
  itemCode,
  itemDescription,
  field,
  fieldDisplayName,
  hasComments = false,
  commentCount = 0,
  mentionableUsers = [],
  onCommentAdded,
  onThreadResolved,
  onCreateTask,
  children,
  disabled = false,
}: CellCommentPopoverProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThread, setActiveThread] = useState<CommentThread | null>(null);
  const [comments, setComments] = useState<CellComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Load threads when popover opens
  useEffect(() => {
    if (open && projectId && itemId && field) {
      loadThreads();
    }
  }, [open, projectId, itemId, field]);
  
  // Load comments when active thread changes
  useEffect(() => {
    if (activeThread) {
      loadComments(activeThread.id);
    }
  }, [activeThread]);
  
  const loadThreads = async () => {
    setIsLoading(true);
    try {
      const loadedThreads = await getThreadsForCell(projectId, itemId, field);
      setThreads(loadedThreads);
      
      // Auto-select first open thread, or most recent
      const openThread = loadedThreads.find(t => t.status === 'open');
      setActiveThread(openThread || loadedThreads[0] || null);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadComments = async (threadId: string) => {
    try {
      const loadedComments = await getComments(projectId, threadId);
      setComments(loadedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };
  
  const handleSendComment = async (content: string, mentions: any[]) => {
    if (!user) return;
    
    setIsSending(true);
    try {
      if (activeThread) {
        // Add to existing thread
        await addComment(
          {
            projectId,
            threadId: activeThread.id,
            itemId,
            itemCode,
            field,
            content,
            mentions,
          },
          user.uid,
          user.displayName || undefined
        );
      } else {
        // Create new thread
        const { threadId } = await createThread(
          {
            projectId,
            itemId,
            itemCode,
            itemDescription,
            field,
            fieldDisplayName,
            content,
            mentions,
          },
          user.uid,
          user.displayName || undefined
        );
        
        // Load the new thread
        await loadThreads();
      }
      
      // Reload comments
      if (activeThread) {
        await loadComments(activeThread.id);
      }
      
      onCommentAdded?.();
    } catch (error) {
      console.error('Failed to send comment:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleResolve = async () => {
    if (!activeThread || !user) return;
    
    try {
      await resolveThread(projectId, activeThread.id, user.uid, user.displayName || undefined);
      await loadThreads();
      onThreadResolved?.();
    } catch (error) {
      console.error('Failed to resolve thread:', error);
    }
  };
  
  const handleReopen = async () => {
    if (!activeThread) return;
    
    try {
      await reopenThread(projectId, activeThread.id);
      await loadThreads();
    } catch (error) {
      console.error('Failed to reopen thread:', error);
    }
  };
  
  // Default trigger (comment icon)
  const defaultTrigger = (
    <button
      className={cn(
        'inline-flex items-center justify-center text-xs',
        hasComments 
          ? 'text-[var(--accent-blue)]' 
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {commentCount > 0 && (
        <span className="ml-0.5">{commentCount}</span>
      )}
    </button>
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || defaultTrigger}
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="start"
        side="right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="font-medium">{fieldDisplayName}</span>
            {threads.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {threads.filter(t => t.status === 'open').length} open
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : (
          <>
            {/* Thread selector (if multiple threads) */}
            {threads.length > 1 && (
              <div className="flex items-center gap-1 p-2 border-b border-[var(--border-subtle)] overflow-x-auto">
                {threads.map((thread, index) => (
                  <Button
                    key={thread.id}
                    variant={activeThread?.id === thread.id ? 'default' : 'ghost'}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setActiveThread(thread)}
                  >
                    Thread {index + 1}
                    {thread.status === 'resolved' && (
                      <Check className="h-3 w-3 ml-1 text-[var(--accent-green)]" />
                    )}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Comments */}
            {activeThread && (
              <>
                {/* Thread status bar */}
                {activeThread.status === 'resolved' && (
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--accent-green)]/10 text-sm">
                    <span className="text-[var(--accent-green)]">
                      <Check className="h-4 w-4 inline mr-1" />
                      Resolved by {activeThread.resolvedByName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReopen}
                      className="h-6 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reopen
                    </Button>
                  </div>
                )}
                
                <ScrollArea className="max-h-64">
                  <div className="p-3 space-y-3">
                    {comments.map((comment) => (
                      <CommentBubble
                        key={comment.id}
                        comment={comment}
                        isOwn={comment.createdBy === user?.uid}
                      />
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Actions */}
                {activeThread.status === 'open' && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border-subtle)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResolve}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                    {onCreateTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreateTask(activeThread.id)}
                        className="text-xs"
                      >
                        <ClipboardList className="h-3 w-3 mr-1" />
                        Create Task
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* New comment input */}
            {(!activeThread || activeThread.status === 'open') && (
              <div className="p-3 border-t border-[var(--border-subtle)]">
                <CommentInput
                  onSend={handleSendComment}
                  mentionableUsers={mentionableUsers}
                  placeholder={activeThread ? 'Reply...' : 'Add a comment...'}
                  isSending={isSending}
                />
              </div>
            )}
            
            {/* Empty state */}
            {threads.length === 0 && !isLoading && (
              <div className="p-3 border-t border-[var(--border-subtle)]">
                <CommentInput
                  onSend={handleSendComment}
                  mentionableUsers={mentionableUsers}
                  placeholder="Add the first comment..."
                  isSending={isSending}
                />
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
