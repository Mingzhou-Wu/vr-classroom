import type { IForumPostAuthor } from './posts'
import { http } from '@/http/http'

export interface IForumComment {
  id: string
  date?: string
  content?: string
  commenterId?: number
  likeCount?: number
  commenter: IForumPostAuthor
  isLiked?: boolean
}

export interface IGetCommentsResponse {
  current?: number
  total?: number
  records?: IForumComment[]
}

export interface IUserCommentRelatedPost {
  id?: string
  date?: string
  title?: string
  status?: number
  author?: IForumPostAuthor
}

export interface IUserCommentRecord {
  id: string
  date?: string
  content?: string
  likeCount?: number
  status?: number
  rejectReason?: string
  isLiked?: boolean
  relatedPost?: IUserCommentRelatedPost
}

export interface IGetUserCommentsResponse {
  current?: number
  total?: number
  records?: IUserCommentRecord[]
}

export interface IGetLikedCommentsResponse {
  current?: number
  total?: number
  records?: IUserCommentRecord[]
}

export interface ICreateCommentBody {
  content: string
  postId: number
}

export interface IUpdateCommentBody {
  content: string
}

export function getComments(postId: string, page = 1) {
  return http.get<IGetCommentsResponse>('/api/comments', { postId, page })
}

export function createComment(data: ICreateCommentBody) {
  return http.post<IForumComment>('/api/comments', data)
}

export function getUserComments(page: number) {
  return http.get<IGetUserCommentsResponse>('/api/users/comments', { page })
}

export function getLikedComments(page: number) {
  return http.get<IGetLikedCommentsResponse>('/api/users/liked-comments', { page })
}

export function updateComment(commentId: string, data: IUpdateCommentBody) {
  return http.put<IForumComment>(`/api/comments/${commentId}`, data)
}

export function deleteComment(commentId: string) {
  return http.delete<null>(`/api/comments/${commentId}`)
}

export function likeComment(commentId: string) {
  return http.post<null>(`/api/comments/${commentId}/likes`)
}

export function unlikeComment(commentId: string) {
  return http.delete<null>(`/api/comments/${commentId}/likes`)
}
