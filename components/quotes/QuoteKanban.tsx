'use client';

import { Quote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuoteKanbanProps {
  quotes: Quote[];
  onQuoteClick?: (quote: Quote) => void;
}

const statusColumns: Quote['status'][] = ['pending', 'requested', 'quoted', 'approved', 'rejected'];

export function QuoteKanban({ quotes, onQuoteClick }: QuoteKanbanProps) {
  const quotesByStatus = statusColumns.reduce((acc, status) => {
    acc[status] = quotes.filter((q) => q.status === status);
    return acc;
  }, {} as Record<Quote['status'], Quote[]>);

  return (
    <div className="flex gap-4 overflow-x-auto">
      {statusColumns.map((status) => (
        <div key={status} className="flex-shrink-0 w-64">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm capitalize">{status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotesByStatus[status].map((quote) => (
                <Card
                  key={quote.id}
                  className="cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
                  onClick={() => onQuoteClick?.(quote)}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium">{quote.itemCode}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {quote.description}
                    </div>
                    {quote.quotedPrice && (
                      <div className="text-sm font-medium mt-2">
                        £{quote.quotedPrice.toFixed(2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

