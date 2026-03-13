<script lang="ts" setup>
import type { IGetUserCommentsResponse, IUserCommentRecord } from '@/api/comments'
import { deleteComment, getUserComments, likeComment, unlikeComment } from '@/api/comments'

definePage({
  style: {
    navigationBarTitleText: '我的评论',
  },
})

interface IUserCommentCard {
  id: string
  date?: string
  content?: string
  likeCount?: number
  status?: number
  rejectReason?: string
  isLiked?: boolean
  relatedPostId?: string
  relatedPostTitle?: string
}

const commentList = ref<IUserCommentCard[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const confirmPopupVisible = ref(false)
const deleting = ref(false)
const deletingCommentId = ref('')
const likingCommentIds = ref<Set<string>>(new Set())
const USER_COMMENT_NEED_REFRESH_KEY = 'user-comment:need-refresh-once'
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)

onPageScroll((e) => {
  const now = Date.now()
  if (e.scrollTop > 0 && now - lastPageScrollSyncAt.value < PAGE_SCROLL_SYNC_INTERVAL_MS)
    return

  pageScrollTop.value = e.scrollTop
  lastPageScrollSyncAt.value = now
})

function getStatusText(status?: number) {
  if (status === 0)
    return '待审核'
  if (status === 1)
    return '已发布'
  if (status === 2)
    return '已驳回'
  return '未知状态'
}

function normalizeRecord(record: IUserCommentRecord): IUserCommentCard {
  return {
    id: String(record.id || ''),
    date: record.date,
    content: record.content || '',
    likeCount: Number(record.likeCount || 0),
    status: record.status,
    rejectReason: record.rejectReason,
    isLiked: Boolean(record.isLiked),
    relatedPostId: String(record.relatedPost?.id || ''),
    relatedPostTitle: record.relatedPost?.title || '未知帖子',
  }
}

function normalizeCommentList(response: IGetUserCommentsResponse | undefined): IUserCommentCard[] {
  return (response?.records || []).map(item => normalizeRecord(item))
}

function parseDateText(dateText: string) {
  const matched = dateText.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})$/)
  if (matched) {
    const [, year, month, day, hour, minute, second] = matched
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
  }

  return new Date(dateText)
}

function formatPublishTime(dateText?: string) {
  if (!dateText)
    return ''

  const publishedAt = parseDateText(dateText)
  if (Number.isNaN(publishedAt.getTime()))
    return ''

  const utc8Date = new Date(publishedAt.getTime() + 8 * 60 * 60 * 1000)
  const year = utc8Date.getUTCFullYear()
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc8Date.getUTCDate()).padStart(2, '0')
  const hour = String(utc8Date.getUTCHours()).padStart(2, '0')
  const minute = String(utc8Date.getUTCMinutes()).padStart(2, '0')
  const second = String(utc8Date.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatPublishMeta(dateText?: string) {
  const publishText = formatPublishTime(dateText)
  return publishText ? `发布于 ${publishText}` : ''
}

async function fetchCommentList() {
  await fetchCommentListByPage(1, false)
}

async function fetchCommentListByPage(page: number, append: boolean) {
  if (append)
    loadingMore.value = true
  else
    loading.value = true

  try {
    const response = await getUserComments(page)
    const records = normalizeCommentList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    commentList.value = append
      ? [...commentList.value, ...records]
      : records

    console.log('获取我的评论成功', response)
  }
  catch (error) {
    console.error('获取我的评论失败', error)
    if (!append)
      commentList.value = []
  }
  finally {
    if (append)
      loadingMore.value = false
    else
      loading.value = false
  }
}

const loadMoreState = computed(() => {
  if (loadingMore.value)
    return 'loading'
  if (currentPage.value < totalPage.value)
    return 'loading'
  return 'finished'
})

onLoad(() => {
  currentPage.value = 1
  totalPage.value = 1
  commentList.value = []
  fetchCommentList()
})

onShow(() => {
  const needRefresh = uni.getStorageSync(USER_COMMENT_NEED_REFRESH_KEY)
  if (!needRefresh)
    return

  uni.removeStorageSync(USER_COMMENT_NEED_REFRESH_KEY)
  currentPage.value = 1
  totalPage.value = 1
  commentList.value = []
  fetchCommentList()
})

onReachBottom(() => {
  if (loading.value || loadingMore.value)
    return
  if (currentPage.value >= totalPage.value)
    return

  fetchCommentListByPage(currentPage.value + 1, true)
})

function goPostPage(postId?: string) {
  if (!postId)
    return

  uni.navigateTo({
    url: `/pages-sub/post/post?id=${postId}`,
  })
}

function openDeleteConfirm(commentId: string) {
  deletingCommentId.value = commentId
  confirmPopupVisible.value = true
}

function goEditCommentPage(comment: IUserCommentCard) {
  if (!comment.id)
    return

  const content = encodeURIComponent(String(comment.content || ''))
  uni.navigateTo({
    url: `/pages-sub/post/editComment?id=${comment.id}&content=${content}`,
  })
}

function closeDeleteConfirm() {
  if (deleting.value)
    return

  confirmPopupVisible.value = false
  deletingCommentId.value = ''
}

async function confirmDeleteComment() {
  if (!deletingCommentId.value)
    return

  deleting.value = true
  try {
    await deleteComment(deletingCommentId.value)
    commentList.value = commentList.value.filter(item => item.id !== deletingCommentId.value)
    uni.showToast({
      title: '删除成功',
      icon: 'success',
    })
    confirmPopupVisible.value = false
    deletingCommentId.value = ''
  }
  catch (error) {
    console.error('删除评论失败', error)
    uni.showToast({
      title: '删除失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    deleting.value = false
  }
}

async function toggleCommentLike(comment: IUserCommentCard) {
  const targetCommentId = String(comment.id || '')
  if (!targetCommentId || likingCommentIds.value.has(targetCommentId))
    return

  const likedBefore = Boolean(comment.isLiked)
  const previousLikeCount = Number(comment.likeCount || 0)
  comment.isLiked = !likedBefore
  comment.likeCount = Math.max(0, previousLikeCount + (likedBefore ? -1 : 1))
  likingCommentIds.value.add(targetCommentId)

  try {
    if (likedBefore)
      await unlikeComment(targetCommentId)
    else
      await likeComment(targetCommentId)
  }
  catch (error) {
    console.error('评论点赞状态更新失败', error)
    comment.isLiked = likedBefore
    comment.likeCount = previousLikeCount
    uni.showToast({
      title: '操作失败，请稍后再试',
      icon: 'none',
    })
  }
  finally {
    likingCommentIds.value.delete(targetCommentId)
  }
}
</script>

<template>
  <view class="pb-20rpx pt-16rpx">
    <view v-if="loading" class="center flex flex-col gap-8rpx py-40rpx text-gray-500">
      <wd-loading />
      <wd-text text="加载中..." color="black" size="24rpx" />
    </view>

    <wd-card v-for="comment in loading ? [] : commentList" :key="comment.id" :data="comment" type="rectangle" @tap="goPostPage(comment.relatedPostId)">
      <view class="flex flex-col gap-16rpx">
        <view class="flex items-center justify-between gap-12rpx">
          <wd-text :text="formatPublishMeta(comment.date)" size="22rpx" color="#999999" />

          <view class="h-max flex rd-xl px-12rpx py-8rpx" :class="comment.status === 2 ? 'bg-#d03050' : comment.status === 1 ? 'bg-#2d8c4d' : 'bg-#e6a23c'">
            <wd-text :text="getStatusText(comment.status)" size="20rpx" color="white" />
          </view>
        </view>

        <view class="flex flex-col gap-8rpx">
          <wd-text :text="comment.content" size="28rpx" color="black" :lines="3" />
          <wd-text :text="`评论于：${comment.relatedPostTitle}`" size="24rpx" color="#215476" :lines="1" />
          <wd-text
            v-if="comment.status === 2 && comment.rejectReason"
            :text="`驳回原因：${comment.rejectReason}`"
            size="22rpx"
            color="#d03050"
            :lines="2"
          />
        </view>

        <view class="flex items-center justify-end gap-16rpx px-8rpx">
          <view class="mr-12rpx center flex gap-8rpx" @tap.stop="toggleCommentLike(comment)">
            <view v-if="comment.isLiked" class="i-majesticons:thumb-up size-42rpx bg-#ff3040" />
            <view v-else class="i-majesticons-thumb-up-line size-42rpx bg-black" />
            <wd-text :text="comment.likeCount" size="24rpx" color="black" />
          </view>
          <view class="center flex b-2rpx b-#215476 rd-xl b-solid bg-white px-12rpx py-4rpx" @tap.stop="goEditCommentPage(comment)">
            <wd-text text="修改" size="24rpx" color="#215476" />
          </view>
          <view class="center flex b-2rpx b-#d03050 rd-xl b-solid bg-white px-12rpx py-4rpx" @tap.stop="openDeleteConfirm(comment.id)">
            <wd-text text="删除" size="24rpx" color="#d03050" />
          </view>
        </view>
      </view>
    </wd-card>

    <wd-popup v-model="confirmPopupVisible" position="center" custom-style="width: 560rpx; border-radius: 24rpx;">
      <view class="flex flex-col gap-24rpx p-32rpx">
        <wd-text text="确认删除这条评论吗？" size="30rpx" color="black" />
        <wd-text text="删除后不可恢复" size="24rpx" color="#999999" />
        <view class="flex justify-center gap-16rpx">
          <wd-button plain @click="closeDeleteConfirm">
            <wd-text text="取消" size="24rpx" color="black" />
          </wd-button>
          <wd-button type="error" :loading="deleting" @click="confirmDeleteComment">
            <wd-text text="确认删除" size="24rpx" color="white" />
          </wd-button>
        </view>
      </view>
    </wd-popup>

    <view v-if="!loading" class="text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多评论了" />
    </view>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" :top="600" />
  </view>
</template>
