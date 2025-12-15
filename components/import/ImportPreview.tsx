'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { transformData, ColumnMappings } from '@/lib/import/columnMapper';

interface ImportPreviewProps {
  data: any[];
  columns: string[];
  mappings: ColumnMappings;
  showTransformed?: boolean;
}

export function ImportPreview({
  data,
  columns,
  mappings,
  showTransformed = false,
}: ImportPreviewProps) {
  const transformedData = showTransformed ? transformData(data, mappings) : data;
  const displayColumns = showTransformed
    ? Object.keys(mappings).filter((key) => mappings[key]?.source)
    : columns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Import Preview {showTransformed && <Badge className="ml-2">Transformed</Badge>}
        </CardTitle>
        <CardDescription>
          {showTransformed
            ? 'Review the transformed data before importing'
            : 'Review the raw CSV data'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-[var(--border-subtle)] max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {displayColumns.map((col) => (
                  <TableHead key={col} className="min-w-[120px]">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedData.slice(0, 20).map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-[var(--text-tertiary)]">{idx + 1}</TableCell>
                  {displayColumns.map((col) => (
                    <TableCell key={col} className="font-mono text-xs">
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length > 20 && (
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Showing first 20 of {data.length} rows
          </p>
        )}
        <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-md">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-medium">Total rows:</span> {data.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

