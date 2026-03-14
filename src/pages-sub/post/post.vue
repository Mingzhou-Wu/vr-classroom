<script lang="ts" setup>
import type { IForumPostDetail } from '@/api/posts'
import { createComment, getComments, likeComment, unlikeComment } from '@/api/comments'
import { deletePost, getPostById, likePost, unlikePost } from '@/api/posts'
import { useUserStore } from '@/store'

definePage({
  style: {
    navigationBarTitleText: '帖子详情',
  },
})

const postId = ref('')
const post = ref<IForumPostDetail | null>(null)
const commentList = ref<Array<import('@/api/comments').IForumComment>>([])
const loading = ref(false)
const commentsLoading = ref(false)
const commentsLoadingMore = ref(false)
const commentsCurrentPage = ref(1)
const commentsTotalPage = ref(1)
const publishing = ref(false)
const commentText = ref('')
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)
const keyboardHeight = ref(0)
const keyboardDuration = ref(0)
const confirmPopupVisible = ref(false)
const deleting = ref(false)
const togglingLike = ref(false)
const togglingCommentLikeIds = ref<Set<string>>(new Set())
const FORUM_NEED_REFRESH_KEY = 'forum:need-refresh-once'
const USER_POST_NEED_REFRESH_KEY = 'user-post:need-refresh-once'
const userStore = useUserStore()

const currentUserId = computed(() => {
  const userInfo = userStore.userInfo as Record<string, any>
  return String(userInfo.id || userInfo.userId || '')
})

const isMyPost = computed(() => {
  const authorId = String(post.value?.author?.id || '')
  return Boolean(authorId) && Boolean(currentUserId.value) && authorId === currentUserId.value
})

const myPostReviewNoticeText = computed(() => {
  if (!isMyPost.value)
    return ''

  const status = Number(post.value?.status)
  if (status === 0)
    return '正在等待管理员审核'
  if (status === 2)
    return `驳回原因：${post.value?.rejectReason || '未提供'}`
  return ''
})

const myPostReviewNoticeClass = computed(() => {
  const status = Number(post.value?.status)
  if (status === 2)
    return 'bg-#fff2f0 b-2rpx b-#d03050 b-solid text-#d03050'
  return 'bg-#fff7e6 b-2rpx b-#e6a23c b-solid text-#e6a23c'
})

onPageScroll((e) => {
  const now = Date.now()
  if (e.scrollTop > 0 && now - lastPageScrollSyncAt.value < PAGE_SCROLL_SYNC_INTERVAL_MS)
    return

  pageScrollTop.value = e.scrollTop
  lastPageScrollSyncAt.value = now
})

const commentBarStyle = computed(() => {
  return {
    bottom: `${keyboardHeight.value}px`,
    transitionProperty: 'bottom',
    transitionTimingFunction: 'ease',
    transitionDuration: `${keyboardDuration.value}ms`,
  }
})

function formatDateForLocalComment(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function handleInputKeyboardHeightChange(res: { height?: number, duration?: number }) {
  keyboardHeight.value = Math.max(Number(res?.height || 0), 0)
  keyboardDuration.value = Math.max(Number(res?.duration || 0), 0)
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

function formatAuthorMeta(collegeName?: string, dateText?: string) {
  const publishText = formatPublishTime(dateText)
  const collegeText = collegeName || '-'
  return publishText ? `${collegeText} · 发布于${publishText}` : collegeText
}

function getPostImages() {
  const rawImages = post.value?.images
  if (!Array.isArray(rawImages))
    return []
  return rawImages.filter(Boolean).slice(0, 9)
}

function handlePreviewPostImages(currentUrl: string) {
  const urls = getPostImages()
  if (!urls.length || !currentUrl)
    return

  uni.previewImage({
    current: currentUrl,
    urls,
  })
}

function getCurrentUserDisplayName() {
  const currentUser = userStore.userInfo
  const candidates = [currentUser.name, currentUser.nickname, currentUser.username]
  const displayName = candidates.find(item => item && item !== '未登录')
  return displayName || '我'
}

const commentLoadMoreState = computed(() => {
  if (commentsLoadingMore.value)
    return 'loading'
  if (commentsCurrentPage.value < commentsTotalPage.value)
    return 'loading'
  return 'finished'
})

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '获取帖子详情失败'
}

async function handlePublishComment() {
  const value = commentText.value.trim()
  if (!value) {
    uni.showToast({
      title: '请输入评论内容',
      icon: 'none',
    })
    return
  }

  const normalizedPostId = Number(postId.value)
  if (!normalizedPostId) {
    uni.showToast({
      title: '帖子参数异常',
      icon: 'none',
    })
    return
  }

  publishing.value = true
  try {
    const response = await createComment({
      content: value,
      postId: normalizedPostId,
    })
    console.log('发布评论返回:', response)

    uni.showToast({
      title: '发布成功',
      icon: 'success',
    })

    if (post.value) {
      post.value = {
        ...post.value,
        commentCount: Number(post.value.commentCount || 0) + 1,
      }
    }

    const currentUser = userStore.userInfo
    const displayName = getCurrentUserDisplayName()
    const responseData = (response || {}) as Record<string, any>
    const createdComment = {
      id: String(responseData.id || `local-${Date.now()}`),
      date: responseData.date || formatDateForLocalComment(new Date()),
      content: responseData.content || value,
      commenterId: Number(responseData.commenterId || currentUser.id || currentUser.userId || 0),
      likeCount: Number(responseData.likeCount || 0),
      commenter: responseData.commenter || {
        id: String(currentUser.id || currentUser.userId || ''),
        name: displayName,
        avatar: currentUser.avatar || 'http://10.86.136.242:9000/images/default_avatar.png',
        collegeId: String(currentUser.collegeId || ''),
        collegeName: currentUser.collegeName || '',
        isVerified: currentUser.verifyStatus === 1,
      },
      isLiked: Boolean(responseData.isLiked),
    } as import('@/api/comments').IForumComment

    commentList.value = [createdComment, ...commentList.value]
    commentText.value = ''
  }
  catch (error) {
    console.error('发布评论失败', error)
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    publishing.value = false
  }
}

async function fetchPostDetail() {
  if (!postId.value)
    return

  loading.value = true
  try {
    const detail = await getPostById(postId.value)
    post.value = {
      ...detail,
      content: detail.content || detail.summary || '',
    }
  }
  catch (error) {
    console.error('获取帖子详情失败', error)
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
    post.value = null
  }
  finally {
    loading.value = false
  }
}

async function fetchComments() {
  await fetchCommentsByPage(1, false)
}

async function fetchCommentsByPage(page: number, append: boolean) {
  if (!postId.value)
    return

  if (append)
    commentsLoadingMore.value = true
  else
    commentsLoading.value = true

  try {
    const response = await getComments(postId.value, page)
    const records = response?.records || []

    commentsCurrentPage.value = Number(response?.current || page)
    commentsTotalPage.value = Number(response?.total || commentsCurrentPage.value)

    commentList.value = append
      ? [...commentList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取评论列表失败', error)
    if (!append)
      commentList.value = []
  }
  finally {
    if (append)
      commentsLoadingMore.value = false
    else
      commentsLoading.value = false
  }
}

onLoad((options) => {
  postId.value = String(options?.id || '')
  commentList.value = []
  commentsCurrentPage.value = 1
  commentsTotalPage.value = 1
  fetchPostDetail()
  fetchComments()
})

onReachBottom(() => {
  if (commentsLoading.value || commentsLoadingMore.value)
    return
  if (commentsCurrentPage.value >= commentsTotalPage.value)
    return

  fetchCommentsByPage(commentsCurrentPage.value + 1, true)
})

onHide(() => {
  keyboardHeight.value = 0
  keyboardDuration.value = 0
})

onUnload(() => {
  keyboardHeight.value = 0
  keyboardDuration.value = 0
})

function goEditPostPage() {
  if (!post.value?.id)
    return

  uni.navigateTo({
    url: `/pages-sub/post/editPost?id=${post.value.id}`,
  })
}

function openDeleteConfirm() {
  confirmPopupVisible.value = true
}

function closeDeleteConfirm() {
  if (deleting.value)
    return

  confirmPopupVisible.value = false
}

async function confirmDeletePost() {
  if (!post.value?.id)
    return

  deleting.value = true
  try {
    await deletePost(String(post.value.id))
    uni.showToast({
      title: '删除成功',
      icon: 'success',
    })

    uni.setStorageSync(FORUM_NEED_REFRESH_KEY, Date.now())
    uni.setStorageSync(USER_POST_NEED_REFRESH_KEY, Date.now())
    confirmPopupVisible.value = false

    setTimeout(() => {
      uni.navigateBack({
        delta: 1,
      })
    }, 300)
  }
  catch (error) {
    console.error('删除帖子失败', error)
    uni.showToast({
      title: '删除失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    deleting.value = false
  }
}

async function toggleCurrentPostLike() {
  if (!post.value?.id || togglingLike.value)
    return

  const targetPostId = String(post.value.id || '')
  const likedBefore = Boolean(post.value.isLiked)
  const previousLikeCount = Number(post.value.likeCount || 0)
  post.value = {
    ...post.value,
    isLiked: !likedBefore,
    likeCount: Math.max(0, previousLikeCount + (likedBefore ? -1 : 1)),
  }
  togglingLike.value = true

  try {
    if (likedBefore)
      await unlikePost(targetPostId)
    else
      await likePost(targetPostId)
  }
  catch (error) {
    console.error('帖子点赞状态更新失败', error)
    if (post.value) {
      post.value = {
        ...post.value,
        isLiked: likedBefore,
        likeCount: previousLikeCount,
      }
    }
    uni.showToast({
      title: '操作失败，请稍后再试',
      icon: 'none',
    })
  }
  finally {
    togglingLike.value = false
  }
}

async function toggleCommentLike(comment: import('@/api/comments').IForumComment) {
  const targetCommentId = String(comment.id || '')
  if (!targetCommentId || togglingCommentLikeIds.value.has(targetCommentId))
    return

  const likedBefore = Boolean(comment.isLiked)
  const previousLikeCount = Number(comment.likeCount || 0)
  comment.isLiked = !likedBefore
  comment.likeCount = Math.max(0, previousLikeCount + (likedBefore ? -1 : 1))
  togglingCommentLikeIds.value.add(targetCommentId)

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
    togglingCommentLikeIds.value.delete(targetCommentId)
  }
}
</script>

<template>
  <view class="min-h-screen bg-[#f3f6f9] px-24rpx pb-174rpx pt-24rpx">
    <view v-if="loading" class="center flex flex-col gap-16rpx py-80rpx text-26rpx text-gray-500">
      <wd-loading />
      <wd-text text="加载中..." color="#475569" size="24rpx" />
    </view>

    <view v-else-if="!post" class="py-80rpx text-center text-26rpx text-gray-500">
      <wd-loadmore state="finished" finished-text="该帖子好像飞走啦" />
    </view>

    <view v-else class="flex flex-col gap-16rpx">
      <view
        v-if="myPostReviewNoticeText"
        class="rd-16rpx px-16rpx py-12rpx text-24rpx"
        :class="myPostReviewNoticeClass"
      >
        {{ myPostReviewNoticeText }}
      </view>

      <view v-if="isMyPost" class="flex justify-end gap-12rpx">
        <view class="center flex b-2rpx b-#215476 rd-full b-solid bg-white px-16rpx py-8rpx" @tap.stop="goEditPostPage">
          <wd-text text="修改" size="22rpx" color="#215476" />
        </view>
        <view class="center flex b-2rpx b-#d03050 rd-full b-solid bg-white px-16rpx py-8rpx" @tap.stop="openDeleteConfirm">
          <wd-text text="删除" size="22rpx" color="#d03050" />
        </view>
      </view>

      <view class="rd-20rpx bg-white p-20rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)">
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center gap-14rpx">
            <wd-img :src="post.author.avatar" class="h-92rpx w-92rpx rd-full bg-[#f1f5f9]" mode="aspectFill" />
            <view class="min-w-0 flex flex-col gap-4rpx">
              <wd-text :text="post.author.name" size="30rpx" color="#1f2937" />
              <wd-text :text="formatAuthorMeta(post.author.collegeName, post.date)" size="21rpx" color="#6b7280" />
            </view>
            <view class="ml-auto h-max flex rd-full bg-#215476 px-16rpx py-8rpx">
              <wd-text :text="post.categoryName || '-'" size="20rpx" color="white" />
            </view>
          </view>

          <view class="flex flex-col gap-8rpx">
            <wd-text :text="post.title || '-'" size="32rpx" color="#0f172a" bold />
            <wd-text :text="post.content || '-'" size="24rpx" color="#334155" />
          </view>

          <view v-if="getPostImages().length === 1" class="flex items-start justify-start">
            <view class="h-420rpx overflow-hidden rd-14rpx bg-white" @tap="handlePreviewPostImages(getPostImages()[0])">
              <image :src="getPostImages()[0]" mode="heightFix" class="block h-full w-auto max-w-full" />
            </view>
          </view>

          <view v-else-if="getPostImages().length > 1" class="grid grid-cols-3 gap-8rpx">
            <view
              v-for="(imageUrl, index) in getPostImages()"
              :key="`${post.id}-${index}`"
              class="aspect-square overflow-hidden rd-12rpx bg-#f7f8fa"
              @tap="handlePreviewPostImages(imageUrl)"
            >
              <image :src="imageUrl" mode="aspectFill" class="h-full w-full" />
            </view>
          </view>

          <view class="mt-4rpx flex items-center justify-between px-20rpx">
            <view class="center flex gap-10rpx">
              <view class="i-majesticons-share-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.shareCount || 0" size="24rpx" color="#475569" />
            </view>

            <view class="center flex gap-10rpx">
              <view class="i-majesticons-comment-2-text-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.commentCount || 0" size="24rpx" color="#475569" />
            </view>

            <view class="center flex gap-10rpx" @tap="toggleCurrentPostLike">
              <view v-if="post.isLiked" class="i-majesticons:thumb-up size-40rpx bg-#ff3040" />
              <view v-else class="i-majesticons-thumb-up-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.likeCount || 0" size="24rpx" :color="post.isLiked ? '#ff3040' : '#475569'" />
            </view>
          </view>
        </view>
      </view>

      <view class="rd-20rpx bg-white p-20rpx" style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)">
        <view class="mb-12rpx flex items-center justify-between">
          <wd-text text="评论" size="28rpx" color="#215476" bold />
          <wd-text :text="`共 ${post.commentCount || 0} 条`" size="20rpx" color="#64748b" />
        </view>

        <view class="mt-8rpx flex flex-col gap-12rpx">
          <view v-if="commentsLoading" class="center flex flex-col gap-16rpx py-24rpx text-22rpx text-gray-500">
            <wd-loading />
            <wd-text text="评论加载中..." color="#475569" size="22rpx" />
          </view>

          <view v-for="comment in commentsLoading ? [] : commentList" :key="comment.id" class="flex flex-col gap-12rpx rd-16rpx bg-#f7f8fa p-16rpx">
            <view class="flex items-center gap-12rpx">
              <wd-img :src="comment.commenter.avatar" class="h-72rpx w-72rpx rd-full bg-white" mode="aspectFill" />

              <view class="flex flex-col gap-2rpx">
                <wd-text :text="comment.commenter.name" size="28rpx" color="#1f2937" />
                <wd-text :text="formatAuthorMeta(comment.commenter.collegeName, comment.date)" size="21rpx" color="#6b7280" />
              </view>

              <view class="ml-auto center gap-4rpx pr-8rpx" @tap.stop="toggleCommentLike(comment)">
                <view v-if="comment.isLiked" class="i-majesticons:thumb-up size-30rpx bg-#ff3040" />
                <view v-else class="i-majesticons-thumb-up-line size-30rpx bg-[#64748b]" />
                <wd-text :text="comment.likeCount || 0" size="20rpx" :color="comment.isLiked ? '#ff3040' : '#475569'" />
              </view>
            </view>

            <wd-text :text="comment.content || '-'" size="24rpx" color="#334155" class="px-84rpx" />
          </view>

          <view v-if="!commentsLoading" class="text-center">
            <wd-loadmore :state="commentLoadMoreState" :finished-text="commentList.length ? '没有更多评论了' : '暂无评论，快来抢沙发'" />
          </view>
        </view>
      </view>
    </view>
  </view>

  <view
    v-if="post"
    class="fixed bottom-0 left-0 right-0 z-120 bg-white px-24rpx pt-16rpx pb-safe"
    style="box-shadow: 0 -4rpx 12rpx rgba(33,84,118,0.08)"
    :style="commentBarStyle"
  >
    <view class="flex items-center gap-16rpx pb-16rpx">
      <wd-input
        v-model="commentText"
        type="text"
        placeholder="说点什么吧..."
        class="flex-1"
        clearable
        :adjust-position="false"
        @keyboardheightchange="handleInputKeyboardHeightChange"
      />

      <wd-button type="primary" size="small" :loading="publishing" class="!b-[#215476] !rounded-999rpx !bg-[#215476] !px-20rpx !color-white" @click="handlePublishComment">
        发布
      </wd-button>
    </view>
  </view>

  <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" :top="600" />

  <wd-popup v-model="confirmPopupVisible" position="center" custom-style="width: 560rpx; border-radius: 24rpx;">
    <view class="flex flex-col gap-24rpx p-32rpx">
      <wd-text text="确认删除这条帖子吗？" size="30rpx" color="black" />
      <wd-text text="删除后不可恢复" size="24rpx" color="#999999" />
      <view class="flex justify-center gap-16rpx">
        <wd-button plain @click="closeDeleteConfirm">
          <wd-text text="取消" size="24rpx" color="black" />
        </wd-button>
        <wd-button type="error" :loading="deleting" @click="confirmDeletePost">
          <wd-text text="确认删除" size="24rpx" color="white" />
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
