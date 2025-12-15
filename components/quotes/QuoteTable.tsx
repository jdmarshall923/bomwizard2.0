'use client';

import { Quote } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QuoteTableProps {
  quotes: Quote[];
  onQuoteClick?: (quote: Quote) => void;
}

export function QuoteTable({ quotes, onQuoteClick }: QuoteTableProps) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Quoted Price</TableHead>
            <TableHead>Currency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow
              key={quote.id}
              className="cursor-pointer hover:bg-[var(--bg-tertiary)]"
              onClick={() => onQuoteClick?.(quote)}
            >
              <TableCell>{quote.itemCode}</TableCell>
              <TableCell>{quote.description}</TableCell>
              <TableCell>
                <span className="capitalize">{quote.status}</span>
              </TableCell>
              <TableCell>{quote.vendorName || '-'}</TableCell>
              <TableCell>
                {quote.quotedPrice ? `£${quote.quotedPrice.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>{quote.currency}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

