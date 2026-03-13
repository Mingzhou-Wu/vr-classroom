import { http } from '@/http/http'

export interface IForumPostAuthor {
  id: string
  name: string
  avatar: string
  collegeId?: string
  collegeName?: string
  isVerified?: boolean
}

export interface IForumPost {
  id: string
  date?: string
  title?: string
  summary?: string
  images?: string[]
  categoryId?: string
  categoryName?: string
  likeCount?: number
  shareCount?: number
  commentCount?: number
  author: IForumPostAuthor
  isLiked?: boolean
}

export interface IGetPostsResponse {
  current?: number
  total?: number
  records?: IForumPost[]
}

export interface IUserPostRecord {
  id: string
  date?: string
  title?: string
  summary?: string
  images?: string[]
  likeCount?: number
  shareCount?: number
  commentCount?: number
  status?: number
  rejectReason?: string
  categoryName?: string
  isLiked?: boolean
}

export interface IGetUserPostsResponse {
  current?: number
  total?: number
  records?: IUserPostRecord[]
}

export interface IGetLikedPostsResponse {
  current?: number
  total?: number
  records?: IUserPostRecord[]
}

export interface IForumPostDetail extends IForumPost {
  content?: string
  status?: number | null
  rejectReason?: string | null
}

export interface ICreatePostBody {
  title: string
  content: string
  categoryId: number
  images?: string[]
}

export interface IUpdatePostBody {
  title: string
  content: string
  categoryId: number
  images?: string[]
}

export function getPosts(page: number, categoryId?: number, keyword?: string) {
  const query: Record<string, number | string> = { page }
  if (typeof categoryId === 'number' && categoryId !== 0)
    query.categoryId = categoryId
  if (keyword)
    query.keyword = keyword

  return http.get<IGetPostsResponse>('/api/posts', query)
}

export function getUserPosts(page: number) {
  return http.get<IGetUserPostsResponse>('/api/users/posts', { page })
}

export function getLikedPosts(page: number) {
  return http.get<IGetLikedPostsResponse>('/api/users/liked-posts', { page })
}

export function getPostById(postId: string) {
  return http.get<IForumPostDetail>(`/api/posts/${postId}`)
}

export function createPost(data: ICreatePostBody) {
  return http.post<IForumPostDetail>('/api/posts', data)
}

export function updatePost(postId: string, data: IUpdatePostBody) {
  return http.put<IForumPostDetail>(`/api/posts/${postId}`, data)
}

export function deletePost(postId: string) {
  return http.delete<null>(`/api/posts/${postId}`)
}

export function likePost(postId: string) {
  return http.post<null>(`/api/posts/${postId}/likes`)
}

export function unlikePost(postId: string) {
  return http.delete<null>(`/api/posts/${postId}/likes`)
}
