'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { createDocument } from '@/lib/firebase/firestore';
import { Project } from '@/types';

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a project');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const projectData: any = {
        code: code.trim(),
        name: name.trim(),
        status: 'draft',
        createdBy: user.uid,
      };
      
      // Only add description if it's not empty
      if (description.trim()) {
        projectData.description = description.trim();
      }

      const projectId = await createDocument<Project>('projects', projectData);
      router.push(`/project/${projectId}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Start a new BOM project to manage costs and versions
        </p>
      </div>

      <Card className="max-w-2xl border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Project Details</CardTitle>
          <CardDescription>Enter the basic information for your project</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Project Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., PROJ-2024-001"
                required
                disabled={loading}
                className="bg-[var(--bg-tertiary)] border-[var(--border-subtle)] focus:border-[var(--accent-blue)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Project Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Product Line 2024"
                required
                disabled={loading}
                className="bg-[var(--bg-tertiary)] border-[var(--border-subtle)] focus:border-[var(--accent-blue)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Description (Optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description"
                disabled={loading}
                className="bg-[var(--bg-tertiary)] border-[var(--border-subtle)] focus:border-[var(--accent-blue)]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue-light)] hover:from-[var(--accent-blue-hover)] hover:to-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/20"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

