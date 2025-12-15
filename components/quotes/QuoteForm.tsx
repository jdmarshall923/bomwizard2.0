'use client';

import { Quote } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuoteFormProps {
  quote?: Quote;
  onSubmit: (data: Partial<Quote>) => Promise<void>;
  onCancel: () => void;
}

export function QuoteForm({ quote, onSubmit, onCancel }: QuoteFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{quote ? 'Edit Quote' : 'New Quote'}</CardTitle>
        <CardDescription>Enter quote details</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Item Code</label>
            <Input defaultValue={quote?.itemCode} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input defaultValue={quote?.description} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select defaultValue={quote?.status || 'pending'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quoted Price</label>
            <Input type="number" step="0.01" defaultValue={quote?.quotedPrice} />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{quote ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

