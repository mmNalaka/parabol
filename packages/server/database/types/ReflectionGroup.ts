import shortid from 'shortid'

export interface ReflectionGroupInput {
  id?: string
  commentingIds?: string[] | null
  createdAt?: Date
  meetingId: string
  retroPhaseItemId: string
  sortOrder?: number
  updatedAt?: Date
  voterIds?: string[]
  title?: string
  smartTitle?: string
}

export default class ReflectionGroup {
  id: string
  commentingIds?: string[] | null
  createdAt: Date
  isActive: boolean
  meetingId: string
  retroPhaseItemId: string
  sortOrder: number
  updatedAt: Date
  voterIds: string[]
  title: string | null
  smartTitle: string | null
  constructor(input: ReflectionGroupInput) {
    const {
      commentingIds,
      createdAt,
      id,
      meetingId,
      retroPhaseItemId,
      sortOrder,
      updatedAt,
      voterIds,
      smartTitle,
      title
    } = input
    const now = new Date()
    this.id = id || shortid.generate()
    this.commentingIds = commentingIds
    this.createdAt = createdAt || now
    this.isActive = true
    this.meetingId = meetingId
    this.retroPhaseItemId = retroPhaseItemId
    this.sortOrder = sortOrder || 0
    this.updatedAt = updatedAt || now
    this.voterIds = voterIds || []
    this.smartTitle = smartTitle || null
    this.title = title || null
  }
}
