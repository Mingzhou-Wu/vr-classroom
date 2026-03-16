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
  relatedPostStatus?: number
}

const commentList = ref<IUserCommentCard[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const confirmPopupVisible = ref(false)
const commentActionVisible = ref(false)
const deleting = ref(false)
const deletingCommentId = ref('')
const likingCommentIds = ref<Set<string>>(new Set())
const USER_COMMENT_NEED_REFRESH_KEY = 'user-comment:need-refresh-once'
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

function getStatusText(status?: number) {
  if (status === -1)
    return '已删除'
  if (status === 0)
    return '待审核'
  if (status === 1)
    return '已发布'
  if (status === 2)
    return '已驳回'
  return '未知状态'
}

function getStatusBadgeClass(status?: number) {
  if (status === 2)
    return 'bg-[#fff1f2] text-[#be123c] b-1rpx b-solid b-[#fecdd3]'
  if (status === 1)
    return 'bg-[#ecfdf3] text-[#166534] b-1rpx b-solid b-[#bbf7d0]'
  if (status === -1)
    return 'bg-[#f1f5f9] text-[#64748b] b-1rpx b-solid b-[#cbd5e1]'
  return 'bg-[#fff7ed] text-[#c2410c] b-1rpx b-solid b-[#fed7aa]'
}

function getStatusTextColor(status?: number) {
  if (status === 2)
    return '#be123c'
  if (status === 1)
    return '#166534'
  if (status === -1)
    return '#64748b'
  return '#c2410c'
}

function getStatusPanelClass(status?: number) {
  if (status === 2)
    return 'bg-[#fff6f7] b-[#fecdd3]'
  if (status === -1)
    return 'bg-[#f8fafc] b-[#dbe4ee]'
  return 'bg-[#fffaf2] b-[#fde2b8]'
}

function shouldShowStatusHint(status?: number) {
  return status === 0 || status === 2 || status === -1
}

function getStatusHint(comment: IUserCommentCard) {
  if (comment.status === 2)
    return comment.rejectReason ? `驳回原因：${comment.rejectReason}` : '评论未通过审核，请修改后重新提交。'
  if (comment.status === 0)
    return '评论正在等待审核，审核通过后会展示在帖子下方。'
  if (comment.status === -1)
    return '这条评论已被删除，不会再展示在帖子详情中。'
  return ''
}

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
    relatedPostStatus: record.relatedPost?.status,
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
    const response = await getUserComments(page)
    const records = normalizeCommentList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    commentList.value = append
      ? [...commentList.value, ...records]
      : records
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

function openCommentActionSheet(commentId: string) {
  const targetComment = commentList.value.find(item => item.id === commentId)
  if (!targetComment)
    return

  if (isRelatedPostUnavailable(targetComment.relatedPostStatus)) {
    uni.showToast({
      title: getRelatedPostUnavailableToast(targetComment.relatedPostStatus),
      icon: 'none',
    })
    return
  }

  deletingCommentId.value = commentId
  commentActionVisible.value = true
}

function handleCommentActionSelect(event: { item?: { key?: string } }) {
  const actionKey = event?.item?.key
  commentActionVisible.value = false

  const targetComment = commentList.value.find(item => item.id === deletingCommentId.value)
  if (!targetComment)
    return

  if (isRelatedPostUnavailable(targetComment.relatedPostStatus)) {
    uni.showToast({
      title: getRelatedPostUnavailableToast(targetComment.relatedPostStatus),
      icon: 'none',
    })
    return
  }

  if (actionKey === 'edit') {
    goEditCommentPage(targetComment)
    return
  }

  if (actionKey === 'delete')
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
  commentActionVisible.value = false
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
  <view class="min-h-screen overflow-x-hidden bg-[#f3f6f9] pb-20rpx">
    <view v-if="loading" class="px-16rpx pt-16rpx">
      <view
        v-for="item in skeletonCommentList"
        :key="`user-comment-skeleton-${item}`"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <view class="h-22rpx w-180rpx rd-full bg-[#dbe8f1]" />
            <view class="flex gap-8rpx">
              <view class="h-40rpx w-96rpx rd-full bg-[#dbe8f1]" />
              <view class="h-40rpx w-112rpx rd-full bg-[#e5eef5]" />
              <view class="h-40rpx w-96rpx rd-full bg-[#dbe8f1]" />
            </view>
          </view>
          <view class="h-28rpx w-82% rd-full bg-[#d8e8f1]" />
          <view class="h-28rpx w-100% rd-full bg-[#e7eff5]" />
          <view class="h-28rpx w-64% rd-full bg-[#eef4f8]" />
          <view class="h-92rpx w-full rd-16rpx bg-[#f5f9fc]" />
          <view class="h-68rpx w-full rd-16rpx bg-[#f8fbfd]" />
        </view>
      </view>
    </view>

    <view v-else-if="!commentList.length" class="px-16rpx pt-16rpx">
      <view class="rd-24rpx bg-white px-24rpx py-64rpx text-center" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.08)">
        <view class="mx-auto mb-18rpx h-120rpx w-120rpx center rd-full bg-[#edf4f8]">
          <view class="i-material-symbols-comment-bank-outline-rounded h-60rpx w-60rpx color-[#7a95ab]" />
        </view>
        <wd-text text="还没有发布过评论" size="30rpx" color="#1f2937" bold />
        <wd-text text="去社区参与讨论，留下你的观点和反馈。" size="24rpx" color="#64748b" :lines="2" />
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

            <view class="ml-auto flex items-center gap-8rpx">
              <view
                class="center flex shrink-0 gap-8rpx rd-full px-16rpx py-10rpx"
                :class="isRelatedPostUnavailable(comment.relatedPostStatus) ? 'bg-[#eef2f6]' : 'bg-[#f8fbfd]'"
                @tap.stop="toggleCommentLike(comment)"
              >
                <view v-if="comment.isLiked" class="i-majesticons:thumb-up size-34rpx bg-[#ff3040]" />
                <view v-else class="i-majesticons-thumb-up-line size-34rpx bg-[#64748b]" />
                <wd-text :text="comment.likeCount" size="22rpx" :color="comment.isLiked ? '#ff3040' : '#475569'" />
              </view>
              <view class="center flex rd-full px-16rpx py-8rpx" :class="getStatusBadgeClass(comment.status)">
                <wd-text :text="getStatusText(comment.status)" size="20rpx" :color="getStatusTextColor(comment.status)" />
              </view>
              <view
                class="center flex b-2rpx rd-full b-solid px-18rpx py-8rpx"
                :class="isRelatedPostUnavailable(comment.relatedPostStatus) ? 'b-[#d7dee5] bg-[#f1f5f9]' : 'b-#cfe0eb bg-[#f8fbfd]'"
                @tap.stop="openCommentActionSheet(comment.id)"
              >
                <wd-text text="编辑" size="22rpx" :color="isRelatedPostUnavailable(comment.relatedPostStatus) ? '#94a3b8' : '#215476'" />
              </view>
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

          <view
            v-if="shouldShowStatusHint(comment.status)"
            class="b-1rpx rd-16rpx b-solid px-16rpx py-14rpx"
            :class="getStatusPanelClass(comment.status)"
          >
            <wd-text :text="getStatusHint(comment)" size="22rpx" color="#475569" :lines="3" />
          </view>
        </view>
      </view>
    </view>

    <wd-popup
      v-model="commentActionVisible"
      position="center"
      root-portal
      :z-index="300"
      custom-style="width: 560rpx; border-radius: 28rpx; overflow: hidden; background: transparent;"
    >
      <view class="overflow-hidden rd-28rpx bg-[linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)] shadow-[0_22rpx_44rpx_rgba(33,84,118,0.18)]">
        <view class="flex flex-col px-32rpx py-26rpx text-center">
          <wd-text text="评论管理" size="30rpx" color="#16364d" bold />
          <wd-text text="选择你想进行的操作" size="22rpx" color="#64748b" class="mt-8rpx" />
        </view>
        <view class="px-20rpx pb-20rpx">
          <view class="flex flex-col gap-12rpx">
            <view class="h-88rpx center flex rd-22rpx bg-white shadow-[0_8rpx_18rpx_rgba(33,84,118,0.08)]" @tap="handleCommentActionSelect({ item: { key: 'edit' } })">
              <wd-text text="修改评论" size="26rpx" color="#215476" />
            </view>
            <view class="h-88rpx center flex rd-22rpx bg-[#fff1f2]" @tap="handleCommentActionSelect({ item: { key: 'delete' } })">
              <wd-text text="删除评论" size="26rpx" color="#d03050" />
            </view>
          </view>
        </view>
      </view>
    </wd-popup>

    <wd-popup
      v-model="confirmPopupVisible"
      position="center"
      root-portal
      :z-index="320"
      :close-on-click-modal="false"
      custom-style="width: 620rpx; border-radius: 28rpx; overflow: hidden; background: transparent;"
    >
      <view class="overflow-hidden rd-28rpx bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_30%,#fffafa_100%)] shadow-[0_24rpx_48rpx_rgba(120,25,25,0.18)]">
        <view class="b-b-1rpx b-[#f3d4d8] b-solid bg-[linear-gradient(135deg,#fff1f2_0%,#ffe4e6_100%)] px-32rpx py-24rpx">
          <view class="flex items-center gap-14rpx">
            <view class="h-64rpx w-64rpx flex items-center justify-center rd-full bg-[#d03050]/12">
              <view class="i-material-symbols-delete-outline-rounded size-34rpx color-[#d03050]" />
            </view>
            <view class="min-w-0 flex flex-1 flex-col">
              <wd-text text="确认删除评论" size="30rpx" color="#881337" bold />
              <wd-text text="删除后这条评论及其互动记录将无法恢复。" size="22rpx" color="#9f1239" class="mt-6rpx" />
            </view>
          </view>
        </view>
        <view class="px-32rpx py-28rpx">
          <view class="rd-20rpx bg-[#fff5f5] px-20rpx py-18rpx">
            <wd-text text="如果只是想调整表达内容，建议先使用修改评论；只有确定不再保留时再执行删除。" size="22rpx" color="#7f1d1d" class="leading-[1.7]" />
          </view>
          <view class="mt-28rpx flex gap-16rpx">
            <wd-button plain class="!h-80rpx !flex-1 !b-[#d7dee5] !rd-full !bg-white" @click="closeDeleteConfirm">
              <wd-text text="先不删" size="24rpx" color="#475569" />
            </wd-button>
            <wd-button type="error" :loading="deleting" class="shadow-[0_12rpx_24rpx_rgba(208,48,80,0.24)] !h-80rpx !flex-1 !rd-full !b-none !bg-[#d03050]" @click="confirmDeleteComment">
              <wd-text text="确认删除" size="24rpx" color="white" />
            </wd-button>
          </view>
        </view>
      </view>
    </wd-popup>

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
