import ProjectWorkspace from './project-workspace'

type Props = {
  params: { projectId: string }
}

export const dynamic = 'force-dynamic'

export default async function BrainProjectPage({ params }: Props) {
  const { projectId } = await params
  return <ProjectWorkspace projectId={projectId} />
}
