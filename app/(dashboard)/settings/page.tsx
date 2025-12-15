'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure application settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Manage global application configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)]">
            Application settings form will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

