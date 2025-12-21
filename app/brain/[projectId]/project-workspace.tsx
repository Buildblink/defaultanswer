"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProtectedRoute } from '@/components/auth/protected-route'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseDebugUrl } from '@/lib/supabase/client'

type BrainProject = {
  id: string
  name: string
  description: string | null
  created_at: string
}

type BrainSource = {
  id: string
  project_id: string
  user_id: string
  source_type: 'file' | 'url' | 'manual' | null
  title: string | null
  url?: string | null
  metadata?: { storagePath?: string; originalUrl?: string } | null
  original_file_name?: string | null
  status: 'ready'
  created_at: string
}

type BrainChunk = {
  id: string
  project_id: string
  source_id: string
  chunk_text: string
  chunk_index: number
}

type SearchResult = {
  chunk: BrainChunk
  source: BrainSource | null
  score: number
}

type Props = {
  projectId: string
}

export default function ProjectWorkspace({ projectId }: Props) {
  return (
    <ProtectedRoute>
      <ProjectWorkspaceClient projectId={projectId} />
    </ProtectedRoute>
  )
}

function ProjectWorkspaceClient({ projectId }: Props) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [project, setProject] = useState<BrainProject | null>(null)
  const [sources, setSources] = useState<BrainSource[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [ingesting, setIngesting] = useState<string | null>(null)
  const [addingUrl, setAddingUrl] = useState(false)
  const [searching, setSearching] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabaseLabel = `Supabase: ${supabaseDebugUrl}`
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session ?? null)
      })
      .catch(() => {
        if (!isMounted) return
        setSession(null)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return
        setSession(nextSession)
      }
    )

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const authHeader = useMemo<HeadersInit>(
    () =>
      session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : ({} as Record<string, string>),
    [session?.access_token]
  )

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
  }

  const loadProjectAndSources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectsRes, sourcesRes] = await Promise.all([
        fetch('/api/brain/projects/list', { headers: authHeader }),
        fetch(`/api/brain/sources/list?projectId=${projectId}`, {
          headers: authHeader,
        }),
      ])

      const projectsData = await projectsRes.json()
      const sourcesData = await sourcesRes.json()

      if (projectsRes.status === 401 || sourcesRes.status === 401) {
        setError('Sign in to view projects')
        return
      }

      if (!projectsRes.ok) {
        throw new Error(projectsData.error || 'Failed to load project')
      }
      if (!sourcesRes.ok) {
        throw new Error(sourcesData.error || 'Failed to load sources')
      }

      const currentProject: BrainProject | undefined = (
        projectsData.projects || []
      ).find((p: BrainProject) => p.id === projectId)

      if (!currentProject) {
        setError('Project not found')
      } else {
        setProject(currentProject)
      }

      setSources(sourcesData.sources || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load workspace')
    } finally {
      setLoading(false)
    }
  }, [authHeader, projectId])

  useEffect(() => {
    if (!session) return
    loadProjectAndSources()
  }, [session?.access_token, loadProjectAndSources])

  const refreshSources = async () => {
    try {
      const res = await fetch(`/api/brain/sources/list?projectId=${projectId}`, {
        headers: authHeader,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load sources')
      }
      setSources(data.sources || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to refresh sources')
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('file', file)

      const res = await fetch('/api/brain/sources/upload', {
        method: 'POST',
        headers: authHeader,
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      const newSource: BrainSource = data.source
      setSources((prev) => [newSource, ...prev])
      setFile(null)

      await triggerIngestion(newSource.id)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const triggerIngestion = async (sourceId: string) => {
    setIngesting(sourceId)
    try {
      const res = await fetch('/api/brain/ingest/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ sourceId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Ingestion failed')
      }
      await refreshSources()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to ingest file')
    } finally {
      setIngesting(null)
    }
  }

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    setAddingUrl(true)
    setError(null)

    try {
      const res = await fetch('/api/brain/sources/add-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ projectId, url: urlInput.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add URL')
      }

      setUrlInput('')
      setSources((prev) => [data.source, ...prev])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to add URL')
    } finally {
      setAddingUrl(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch('/api/brain/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          projectId,
          query: query.trim(),
          topK: 8,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Search failed')
      }
      setSearchResults(data.results || [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const statusStyles: Record<BrainSource['status'], string> = {
    ready: 'bg-emerald-100 text-emerald-800',
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      <Button
        variant="ghost"
        className="pl-0"
        onClick={() => router.push('/brain')}
      >
        ← Back to projects
      </Button>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading workspace...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Brain project
              </p>
              <h1 className="text-3xl font-bold">{project?.name}</h1>
              <p className="text-muted-foreground max-w-2xl">
                {project?.description || 'No description provided.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Created {project && new Date(project.created_at).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {supabaseLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {session && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </Button>
              )}
              <Badge variant="secondary">
                Sources: {sources.length}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="sources" className="w-full">
            <TabsList>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>

            <TabsContent value="sources" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form
                    className="grid gap-3 md:grid-cols-[2fr,1fr,auto]"
                    onSubmit={handleUpload}
                  >
                    <Input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="text-sm text-muted-foreground self-center">
                      PDF, TXT, or MD
                    </div>
                    <Button type="submit" disabled={uploading || !file}>
                      {uploading ? 'Uploading...' : 'Upload file'}
                    </Button>
                  </form>

                  <form
                    className="grid gap-3 md:grid-cols-[2fr,auto]"
                    onSubmit={handleAddUrl}
                  >
                    <Input
                      placeholder="https://example.com/article"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <Button type="submit" disabled={addingUrl}>
                      {addingUrl ? 'Adding...' : 'Add URL'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sources.length === 0 ? (
                    <p className="text-muted-foreground">No sources yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-start justify-between gap-4 rounded-md border p-3"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {source.title ||
                                source.original_file_name ||
                                source.metadata?.originalUrl ||
                                'Untitled source'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(source.source_type || 'file').toUpperCase()} •{' '}
                              {new Date(source.created_at).toLocaleString()}
                            </p>
                            {(source.url || source.metadata?.originalUrl) && (
                              <a
                                href={source.url || source.metadata?.originalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary underline"
                              >
                                Open URL
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[source.status]}`}
                            >
                              {source.status}
                            </span>
                            {source.source_type === 'file' && source.status !== 'ready' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!ingesting}
                                onClick={() => triggerIngestion(source.id)}
                              >
                                {ingesting === source.id
                                  ? 'Processing...'
                                  : 'Ingest now'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search">
              <Card>
                <CardHeader>
                  <CardTitle>Ask Brain</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleSearch} className="space-y-3">
                    <Textarea
                      placeholder="Ask a question about this project..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={searching}>
                        {searching ? 'Searching...' : 'Search Brain'}
                      </Button>
                      {error && (
                        <p className="text-sm text-red-500">{error}</p>
                      )}
                    </div>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      {searchResults.map((result, idx) => (
                        <div
                          key={`${result.chunk.id}-${idx}`}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {result.source?.title ||
                                result.source?.original_file_name ||
                                result.source?.metadata?.originalUrl ||
                                result.source?.url ||
                                'Unknown source'}{' '}
                              • {result.source?.source_type?.toUpperCase() || 'N/A'}
                            </p>
                            <Badge variant="secondary">
                              {result.score ? result.score.toFixed(3) : 'score'}
                            </Badge>
                          </div>
                          <p className="leading-relaxed">
                            {result.chunk.chunk_text.length > 500
                              ? `${result.chunk.chunk_text.slice(0, 500)}…`
                              : result.chunk.chunk_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!searching && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Results will appear here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
