export interface Task {
  id: string
  title: string
  description?: string | null
  status: 'pending' | 'completed'
  parent_id?: string | null
  created_at: string
}

export interface CreateTaskBody {
  title: string
  description?: string
  parent_id?: string
}

export interface UpdateTaskBody {
  status?: 'pending' | 'completed'
  title?: string
  description?: string
}
