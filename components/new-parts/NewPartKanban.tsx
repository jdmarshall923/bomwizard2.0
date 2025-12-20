'use client';

import { useState } from 'react';
import { NewPart } from '@/types/newPart';
import { NewPartStatus } from '@/types/bom';
import { KANBAN_COLUMNS } from '@/lib/bom/newPartService';
import { NewPartCard } from './NewPartCard';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface NewPartKanbanProps {
  partsByStatus: Record<NewPartStatus, NewPart[]>;
  onPartClick: (part: NewPart) => void;
  onMoveStatus: (partId: string, newStatus: NewPartStatus) => Promise<void>;
  isLoading?: boolean;
}

const NEXT_STATUS: Partial<Record<NewPartStatus, NewPartStatus>> = {
  added: 'design',
  design: 'engineering',
  engineering: 'procurement',
  procurement: 'complete',
};

export function NewPartKanban({
  partsByStatus,
  onPartClick,
  onMoveStatus,
  isLoading,
}: NewPartKanbanProps) {
  const [draggingPart, setDraggingPart] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<NewPartStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, partId: string) => {
    e.dataTransfer.setData('text/plain', partId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingPart(partId);
  };

  const handleDragEnd = () => {
    setDraggingPart(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: NewPartStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: NewPartStatus) => {
    e.preventDefault();
    const partId = e.dataTransfer.getData('text/plain');
    if (partId) {
      try {
        await onMoveStatus(partId, newStatus);
      } catch (error) {
        console.error('Failed to move part:', error);
      }
    }
    setDraggingPart(null);
    setDragOverColumn(null);
  };

  const handleMoveNext = async (part: NewPart) => {
    const nextStatus = NEXT_STATUS[part.status];
    if (nextStatus) {
      await onMoveStatus(part.id, nextStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm"
          >
            <div className="p-3 border-b border-[var(--border-subtle)]">
              <div className="h-5 w-24 bg-[var(--bg-tertiary)] rounded animate-pulse" />
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-[var(--bg-tertiary)] animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4 min-w-max">
        {KANBAN_COLUMNS.map((column) => {
          const parts = partsByStatus[column.id] || [];
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={cn(
                'flex-shrink-0 w-80 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm transition-all duration-200',
                isDragOver && 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-lg shadow-[var(--accent-blue)]/10'
              )}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {column.title}
                    </span>
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-secondary)]">
                      {parts.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {column.description}
                </p>
              </div>

              {/* Column Content */}
              <div className="p-3 space-y-3 min-h-[200px]">
                {parts.length === 0 ? (
                  <div
                    className={cn(
                      'flex items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors',
                      isDragOver
                        ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                        : 'border-[var(--border-subtle)]'
                    )}
                  >
                    <span className="text-sm text-[var(--text-tertiary)]">
                      {isDragOver ? 'Drop here' : 'No items'}
                    </span>
                  </div>
                ) : (
                  parts.map((part) => (
                    <div
                      key={part.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, part.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <NewPartCard
                        part={part}
                        onClick={() => onPartClick(part)}
                        onMoveNext={NEXT_STATUS[part.status] ? () => handleMoveNext(part) : undefined}
                        isDragging={draggingPart === part.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

