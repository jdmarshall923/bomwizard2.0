'use client';

import { Spec } from '@/types/spec';
import { SpecHeader } from './SpecHeader';
import { SpecConfigTable, SpecConfigSummary } from './SpecConfigTable';
import { SpecColourOptions } from './SpecColourOptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Boxes, 
  CalendarDays, 
  Link2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface SpecOverviewProps {
  spec: Spec;
  onEdit?: () => void;
  onImport?: () => void;
  onSubmit?: () => void;
  onCompare?: () => void;
  onHistory?: () => void;
  onExport?: () => void;
  onApplyToBom?: () => void;
}

export function SpecOverview({
  spec,
  onEdit,
  onImport,
  onSubmit,
  onCompare,
  onHistory,
  onExport,
  onApplyToBom,
}: SpecOverviewProps) {
  // Calculate stats
  const totalCategories = spec.categories.length;
  const categoriesWithSelections = spec.categories.filter(c => 
    c.options.some(o => o.selected)
  ).length;
  const totalSelectedOptions = spec.categories.reduce(
    (sum, c) => sum + c.options.filter(o => o.selected).length, 
    0
  );
  const unmappedCount = spec.categories.filter(c => 
    c.mappingStatus === 'unmapped' && c.options.some(o => o.selected)
  ).length;
  const customPartsCount = spec.colourOptions.reduce(
    (sum, opt) => sum + opt.parts.filter(p => p.isCustom).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <SpecHeader
        spec={spec}
        onEdit={onEdit}
        onImport={onImport}
        onSubmit={onSubmit}
        onCompare={onCompare}
        onHistory={onHistory}
        onExport={onExport}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Categories"
          value={categoriesWithSelections}
          subtitle={`of ${totalCategories}`}
          icon={<Boxes size={20} className="text-blue-500" />}
        />
        <StatsCard
          label="Selected Options"
          value={totalSelectedOptions}
          icon={<Link2 size={20} className="text-emerald-500" />}
        />
        <StatsCard
          label="Colour Options"
          value={spec.colourOptions.length}
          subtitle={customPartsCount > 0 ? `${customPartsCount} custom` : undefined}
          icon={<CalendarDays size={20} className="text-purple-500" />}
        />
        {unmappedCount > 0 && (
          <StatsCard
            label="Unmapped"
            value={unmappedCount}
            subtitle="categories"
            icon={<AlertTriangle size={20} className="text-amber-500" />}
            variant="warning"
          />
        )}
      </div>

      {/* Apply to BOM CTA (when spec is accepted) */}
      {spec.status === 'accepted' && onApplyToBom && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">
                Spec Accepted
              </h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Apply this spec configuration to your Working BOM
              </p>
            </div>
            <Button onClick={onApplyToBom} className="bg-emerald-600 hover:bg-emerald-700">
              Apply to BOM
              <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline summary */}
      {spec.timeline && Object.keys(spec.timeline).some(k => spec.timeline[k as keyof typeof spec.timeline]) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays size={20} />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {spec.timeline.orderingOpenWeek && (
                <TimelineItem label="Ordering Open" value={spec.timeline.orderingOpenWeek} />
              )}
              {spec.timeline.orderingCloseWeek && (
                <TimelineItem label="Ordering Close" value={spec.timeline.orderingCloseWeek} />
              )}
              {spec.timeline.sprintRunWeek && (
                <TimelineItem label="Sprint Run" value={spec.timeline.sprintRunWeek} />
              )}
              {spec.timeline.productionWeek && (
                <TimelineItem label="Production" value={spec.timeline.productionWeek} />
              )}
              {spec.timeline.totalQty && (
                <TimelineItem label="Total Qty" value={spec.timeline.totalQty.toLocaleString()} />
              )}
              {spec.timeline.pbomCodeName && (
                <TimelineItem label="PBOM Code" value={spec.timeline.pbomCodeName} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration summary */}
      <SpecConfigSummary categories={spec.categories} />

      {/* Full configuration table */}
      <SpecConfigTable
        categories={spec.categories}
        showMappingStatus={true}
        collapsible={true}
      />

      {/* Colour options */}
      <SpecColourOptions colourOptions={spec.colourOptions} />
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}

function StatsCard({ label, value, subtitle, icon, variant = 'default' }: StatsCardProps) {
  return (
    <Card className={variant === 'warning' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {subtitle && (
                <span className="text-sm text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineItemProps {
  label: string;
  value: string;
}

function TimelineItem({ label, value }: TimelineItemProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

