'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { CellComment } from '@/types/comments';

/**
 * Phase 14: Comment Bubble Component
 * 
 * Displays a single comment in a chat-like bubble format.
 */

interface CommentBubbleProps {
  comment: CellComment;
  isOwn?: boolean;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
}

export function CommentBubble({
  comment,
  isOwn = false,
  onEdit,
  onDelete,
}: CommentBubbleProps) {
  const timestamp = comment.createdAt?.toDate?.() || new Date();
  const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true });
  const fullTime = format(timestamp, 'MMM d, yyyy \'at\' HH:mm');
  
  // Parse content with mentions highlighted
  const renderContent = () => {
    if (!comment.mentions?.length) {
      return <span>{comment.content}</span>;
    }
    
    // Sort mentions by start index (reversed for processing)
    const sortedMentions = [...comment.mentions].sort((a, b) => b.startIndex - a.startIndex);
    
    let content = comment.content;
    const parts: { text: string; isMention: boolean; userId?: string }[] = [];
    
    // Simple approach: just render the content and style @mentions
    const words = content.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('@')) {
        const mention = comment.mentions?.find(m => `@${m.userName}` === word);
        if (mention) {
          return (
            <span
              key={i}
              className="text-[var(--accent-blue)] font-medium cursor-pointer hover:underline"
              title={mention.userEmail}
            >
              {word}
            </span>
          );
        }
      }
      return <span key={i}>{word}</span>;
    });
  };
  
  return (
    <div className={cn(
      'group flex gap-2',
      isOwn && 'flex-row-reverse'
    )}>
      {/* Avatar */}
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0',
        isOwn ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-purple)]'
      )}>
        {comment.createdByName?.charAt(0).toUpperCase() || '?'}
      </div>
      
      {/* Bubble */}
      <div className={cn(
        'flex-1 max-w-[85%]',
        isOwn && 'flex flex-col items-end'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isOwn && 'flex-row-reverse'
        )}>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {comment.createdByName || 'Unknown'}
          </span>
          <span 
            className="text-xs text-[var(--text-tertiary)] cursor-help"
            title={fullTime}
          >
            {relativeTime}
          </span>
          {comment.isEdited && (
            <span className="text-xs text-[var(--text-tertiary)]">(edited)</span>
          )}
          
          {/* Actions dropdown (only for own comments) */}
          {isOwn && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(comment.id)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(comment.id)}
                    className="text-[var(--accent-red)]"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Content */}
        <div className={cn(
          'px-3 py-2 rounded-lg text-sm',
          isOwn 
            ? 'bg-[var(--accent-blue)] text-white rounded-tr-none' 
            : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tl-none'
        )}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
