<script lang="ts" setup>
import type { IGetLikedCommentsResponse, IUserCommentRecord } from '@/api/comments'
import { getLikedComments, likeComment, unlikeComment } from '@/api/comments'

definePage({
  style: {
    navigationBarTitleText: '我点赞的评论',
  },
})

interface ILikedCommentCard {
  id: string
  date?: string
  content?: string
  likeCount?: number
  isLiked?: boolean
  relatedPostId?: string
  relatedPostTitle?: string
  relatedPostStatus?: number
}

const commentList = ref<ILikedCommentCard[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const likingCommentIds = ref<Set<string>>(new Set())
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)
const skeletonCommentList = Array.from({ length: 4 }, (_, index) => index)

onPageScroll((e) => {
  const now = Date.now()
  if (e.scrollTop > 0 && now - lastPageScrollSyncAt.value < PAGE_SCROLL_SYNC_INTERVAL_MS)
    return

  pageScrollTop.value = e.scrollTop
  lastPageScrollSyncAt.value = now
})

function isRelatedPostUnavailable(status?: number) {
  return status === -1 || status === 0 || status === 2
}

function getRelatedPostStatusText(status?: number) {
  if (isRelatedPostUnavailable(status))
    return '暂不可访问'
  return ''
}

function getRelatedPostUnavailableToast(status?: number) {
  if (isRelatedPostUnavailable(status))
    return '关联帖子当前状态下暂不可操作'
  return '当前不可操作'
}

function normalizeRecord(record: IUserCommentRecord): ILikedCommentCard {
  return {
    id: String(record.id || ''),
    date: record.date,
    content: record.content || '',
    likeCount: Number(record.likeCount || 0),
    isLiked: Boolean(record.isLiked),
    relatedPostId: String(record.relatedPost?.id || ''),
    relatedPostTitle: record.relatedPost?.title || '未知帖子',
    relatedPostStatus: record.relatedPost?.status,
  }
}

function normalizeCommentList(response: IGetLikedCommentsResponse | undefined): ILikedCommentCard[] {
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

  const diffMs = Date.now() - publishedAt.getTime()
  if (diffMs < 0)
    return '刚刚'

  if (diffMs < 60 * 1000)
    return '刚刚'

  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  if (diffMinutes < 60)
    return `${diffMinutes}分钟前`

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffHours < 24)
    return `${diffHours}小时前`

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const month = String(publishedAt.getMonth() + 1).padStart(2, '0')
  const day = String(publishedAt.getDate()).padStart(2, '0')
  if (diffDays > 365)
    return `${publishedAt.getFullYear()}-${month}-${day}`

  return `${month}-${day}`
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
    const response = await getLikedComments(page)
    const records = normalizeCommentList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    commentList.value = append
      ? [...commentList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取我点赞的评论失败', error)
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

onReachBottom(() => {
  if (loading.value || loadingMore.value)
    return
  if (currentPage.value >= totalPage.value)
    return

  fetchCommentListByPage(currentPage.value + 1, true)
})

function goPostPage(postId?: string, relatedPostStatus?: number) {
  if (!postId)
    return

  if (isRelatedPostUnavailable(relatedPostStatus)) {
    uni.showToast({
      title: getRelatedPostUnavailableToast(relatedPostStatus),
      icon: 'none',
    })
    return
  }

  uni.navigateTo({
    url: `/pages-sub/post/post?id=${postId}`,
  })
}

function handleRefresh() {
  if (loading.value || loadingMore.value)
    return

  uni.pageScrollTo({
    scrollTop: 0,
    duration: 0,
  })
  currentPage.value = 1
  totalPage.value = 1
  commentList.value = []
  fetchCommentList()
}

async function toggleCommentLike(comment: ILikedCommentCard) {
  const targetCommentId = String(comment.id || '')
  if (!targetCommentId || likingCommentIds.value.has(targetCommentId))
    return

  if (isRelatedPostUnavailable(comment.relatedPostStatus)) {
    uni.showToast({
      title: getRelatedPostUnavailableToast(comment.relatedPostStatus),
      icon: 'none',
    })
    return
  }

  const likedBefore = Boolean(comment.isLiked)
  const previousLikeCount = Number(comment.likeCount || 0)
  comment.isLiked = !likedBefore
  comment.likeCount = Math.max(0, previousLikeCount + (likedBefore ? -1 : 1))
  likingCommentIds.value.add(targetCommentId)

  try {
    if (likedBefore) {
      await unlikeComment(targetCommentId)
      commentList.value = commentList.value.filter(item => String(item.id || '') !== targetCommentId)
      return
    }

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
  <view class="min-h-screen overflow-x-hidden bg-[#f3f6f9] pb-20rpx">
    <view v-if="loading" class="px-16rpx pt-16rpx">
      <view
        v-for="item in skeletonCommentList"
        :key="`liked-comment-skeleton-${item}`"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <view class="h-22rpx w-180rpx rd-full bg-[#dbe8f1]" />
            <view class="h-40rpx w-112rpx rd-full bg-[#dbe8f1]" />
          </view>
          <view class="h-80rpx w-full rd-16rpx bg-[#f5f9fc]" />
          <view class="h-28rpx w-100% rd-full bg-[#e7eff5]" />
          <view class="h-28rpx w-64% rd-full bg-[#eef4f8]" />
          <view class="h-92rpx w-full rd-16rpx bg-[#f5f9fc]" />
        </view>
      </view>
    </view>

    <view v-else-if="!commentList.length" class="px-16rpx pt-16rpx">
      <view class="rd-24rpx bg-white px-24rpx py-64rpx text-center" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.08)">
        <view class="mx-auto mb-18rpx h-120rpx w-120rpx center rd-full bg-[#edf4f8]">
          <view class="i-material-symbols-thumb-up-outline-rounded h-60rpx w-60rpx color-[#7a95ab]" />
        </view>
        <wd-text text="还没有点赞过评论" size="30rpx" color="#1f2937" bold />
        <wd-text text="去社区逛逛，把你认可的观点收藏到这里。" size="24rpx" color="#64748b" :lines="2" />
      </view>
    </view>

    <view v-else class="px-16rpx pt-16rpx">
      <view
        v-for="comment in commentList"
        :key="comment.id"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        :class="isRelatedPostUnavailable(comment.relatedPostStatus) ? 'opacity-88' : ''"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
        @tap="goPostPage(comment.relatedPostId, comment.relatedPostStatus)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <wd-text :text="formatPublishMeta(comment.date)" size="22rpx" color="#6b7280" />

            <view
              class="ml-auto center flex shrink-0 gap-8rpx rd-full px-16rpx py-10rpx"
              :class="isRelatedPostUnavailable(comment.relatedPostStatus) ? 'bg-[#eef2f6]' : 'bg-[#f8fbfd]'"
              @tap.stop="toggleCommentLike(comment)"
            >
              <view v-if="comment.isLiked" class="i-majesticons:thumb-up size-34rpx bg-[#ff3040]" />
              <view v-else class="i-majesticons-thumb-up-line size-34rpx bg-[#64748b]" />
              <wd-text :text="comment.likeCount" size="22rpx" :color="comment.isLiked ? '#ff3040' : '#475569'" />
            </view>
          </view>

          <view class="flex flex-col gap-8rpx">
            <wd-text :text="comment.content || '这条评论暂时没有内容'" size="28rpx" color="#0f172a" :lines="4" bold />
          </view>

          <view
            class="flex items-center gap-16rpx rd-16rpx px-18rpx py-16rpx"
            :class="isRelatedPostUnavailable(comment.relatedPostStatus) ? 'bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f6_100%)]' : 'bg-[linear-gradient(135deg,#f8fbfd_0%,#edf4f8_100%)]'"
            @tap.stop="goPostPage(comment.relatedPostId, comment.relatedPostStatus)"
          >
            <view class="h-52rpx w-52rpx flex items-center justify-center rd-14rpx bg-white shadow-[0_6rpx_12rpx_rgba(33,84,118,0.08)]">
              <view class="i-material-symbols-article-outline-rounded size-30rpx color-[#215476]" />
            </view>
            <view class="min-w-0 flex-1">
              <view class="flex items-center gap-10rpx">
                <wd-text text="评论所在帖子" size="20rpx" color="#64748b" />
                <wd-text v-if="isRelatedPostUnavailable(comment.relatedPostStatus)" :text="getRelatedPostStatusText(comment.relatedPostStatus)" size="20rpx" color="#c2410c" class="rd-full bg-[#fff7ed] px-12rpx py-4rpx" />
              </view>
              <wd-text :text="comment.relatedPostTitle || '未知帖子'" size="24rpx" color="#16364d" :lines="2" bold />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!loading && commentList.length" class="pb-10rpx text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多评论了" />
    </view>

    <wd-backtop
      :scroll-top="pageScrollTop"
      :right="16"
      :bottom="96"
      custom-class="!size-96rpx !bg-#215476 !color-white"
      custom-style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)"
      :top="600"
    />
  </view>
</template>
