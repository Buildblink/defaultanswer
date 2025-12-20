"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'

type BrainProject = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function BrainHome() {
  return (
    <ProtectedRoute requiredRole="viewer">
      <BrainHomeClient />
    </ProtectedRoute>
  )
}

function BrainHomeClient() {
  const router = useRouter()
  const { session } = useAuth()
  const [projects, setProjects] = useState<BrainProject[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brain/projects/list', {
        headers: authHeader,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load projects')
      }
      setProjects(data.projects || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/brain/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setForm({ name: '', description: '' })
      await loadProjects()
      router.push(`/brain/${data.project.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Brain workspace
          </p>
          <h1 className="text-3xl font-bold mt-1">Projects</h1>
          <p className="text-muted-foreground">
            Create research brains and attach sources for semantic search.
          </p>
        </div>
        <Badge variant="secondary">MVP</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new project</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateProject}>
            <Input
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create project'}
              </Button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your projects</h2>
          <Button variant="ghost" size="sm" onClick={loadProjects}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Loading projects...
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No projects yet. Create your first brain above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {project.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                  <Button size="sm" onClick={() => router.push(`/brain/${project.id}`)}>
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
