export type TaskStatus = 'todo' | 'in-progress' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority?: TaskPriority
  assignee?: string
  repository: string
  filePath: string
}

export interface Repository {
  name: string
  path: string
}
