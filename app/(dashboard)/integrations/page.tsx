'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure external integrations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Infor</CardTitle>
            <CardDescription>ERP System</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SharePoint</CardTitle>
            <CardDescription>File Storage</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
            <CardDescription>REST API Keys</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Event Triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Power BI</CardTitle>
            <CardDescription>Export</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--text-secondary)]">Coming Soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

