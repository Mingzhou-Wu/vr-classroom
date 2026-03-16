<script lang="ts" setup>
import type { IForumPost, IGetUserPostsResponse, IUserPostRecord } from '@/api/posts'
import { deletePost, getUserPosts, likePost, unlikePost } from '@/api/posts'

definePage({
  style: {
    navigationBarTitleText: '我的帖子',
  },
})

type IUserPostCard = IForumPost & {
  status?: number
  rejectReason?: string
}

const postList = ref<IUserPostCard[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const confirmPopupVisible = ref(false)
const postActionVisible = ref(false)
const deleting = ref(false)
const deletingPostId = ref('')
const likingPostIds = ref<Set<string>>(new Set())
const USER_POST_NEED_REFRESH_KEY = 'user-post:need-refresh-once'
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)
const skeletonPostList = Array.from({ length: 3 }, (_, index) => index)

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
  if (status === 1)
    return 'bg-[#f4fbf7] b-[#ccebd7]'
  if (status === -1)
    return 'bg-[#f8fafc] b-[#dbe4ee]'
  return 'bg-[#fffaf2] b-[#fde2b8]'
}

function shouldShowStatusHint(status?: number) {
  return status === 0 || status === 2
}

function getStatusHint(post: IUserPostCard) {
  if (post.status === 2)
    return post.rejectReason ? `驳回原因：${post.rejectReason}` : '内容未通过审核，请修改后重新提交'
  if (post.status === 0)
    return '帖子正在等待审核，审核通过后会展示在社区中'
  return ''
}

function normalizeRecord(record: IUserPostRecord): IUserPostCard {
  return {
    id: String(record.id || ''),
    date: record.date,
    title: record.title || '',
    summary: record.summary || '',
    images: record.images || [],
    likeCount: Number(record.likeCount || 0),
    shareCount: Number(record.shareCount || 0),
    commentCount: Number(record.commentCount || 0),
    categoryName: record.categoryName || '',
    author: {
      id: '',
      name: '',
      avatar: '',
    },
    isLiked: Boolean(record.isLiked),
    status: record.status,
    rejectReason: record.rejectReason,
  }
}

function normalizePostList(response: IGetUserPostsResponse | undefined): IUserPostCard[] {
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

function getPostImages(post: IUserPostCard) {
  if (!Array.isArray(post.images))
    return []
  return post.images.filter(Boolean).slice(0, 9)
}

function handlePreviewPostImages(post: IUserPostCard, currentUrl: string) {
  const urls = getPostImages(post)
  if (!urls.length || !currentUrl)
    return

  uni.previewImage({
    current: currentUrl,
    urls,
  })
}

async function fetchPostList() {
  await fetchPostListByPage(1, false)
}

async function fetchPostListByPage(page: number, append: boolean) {
  if (append)
    loadingMore.value = true
  else
    loading.value = true

  try {
    const response = await getUserPosts(page)
    const records = normalizePostList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    postList.value = append
      ? [...postList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取我的帖子失败', error)
    if (!append)
      postList.value = []
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
  postList.value = []
  fetchPostList()
})

onShow(() => {
  const needRefresh = uni.getStorageSync(USER_POST_NEED_REFRESH_KEY)
  if (!needRefresh)
    return

  uni.removeStorageSync(USER_POST_NEED_REFRESH_KEY)
  currentPage.value = 1
  totalPage.value = 1
  postList.value = []
  fetchPostList()
})

onReachBottom(() => {
  if (loading.value || loadingMore.value)
    return
  if (currentPage.value >= totalPage.value)
    return

  fetchPostListByPage(currentPage.value + 1, true)
})

function goPostPage(postId: string) {
  if (!postId)
    return

  uni.navigateTo({
    url: `/pages-sub/post/post?id=${postId}`,
  })
}

function goEditPostPage(postId: string) {
  if (!postId)
    return

  uni.navigateTo({
    url: `/pages-sub/post/editPost?id=${postId}`,
  })
}

function goCreatePostPage() {
  uni.navigateTo({
    url: '/pages-sub/post/editPost',
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
  postList.value = []
  fetchPostList()
}

function openPostActionSheet(postId: string) {
  deletingPostId.value = postId
  postActionVisible.value = true
}

function handlePostActionSelect(event: { item?: { key?: string } }) {
  const actionKey = event?.item?.key
  postActionVisible.value = false

  if (actionKey === 'edit') {
    goEditPostPage(deletingPostId.value)
    return
  }

  if (actionKey === 'delete')
    confirmPopupVisible.value = true
}

function openDeleteConfirm(postId: string) {
  deletingPostId.value = postId
  confirmPopupVisible.value = true
}

function closeDeleteConfirm() {
  postActionVisible.value = false
  if (deleting.value)
    return

  confirmPopupVisible.value = false
  deletingPostId.value = ''
}

async function confirmDeletePost() {
  if (!deletingPostId.value)
    return

  deleting.value = true
  try {
    await deletePost(deletingPostId.value)
    postList.value = postList.value.filter(item => item.id !== deletingPostId.value)
    uni.showToast({
      title: '删除成功',
      icon: 'success',
    })
    confirmPopupVisible.value = false
    deletingPostId.value = ''
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

async function togglePostLike(post: IUserPostCard) {
  const targetPostId = String(post.id || '')
  if (!targetPostId || likingPostIds.value.has(targetPostId))
    return

  const likedBefore = Boolean(post.isLiked)
  const previousLikeCount = Number(post.likeCount || 0)
  post.isLiked = !likedBefore
  post.likeCount = Math.max(0, previousLikeCount + (likedBefore ? -1 : 1))
  likingPostIds.value.add(targetPostId)

  try {
    if (likedBefore)
      await unlikePost(targetPostId)
    else
      await likePost(targetPostId)
  }
  catch (error) {
    console.error('帖子点赞状态更新失败', error)
    post.isLiked = likedBefore
    post.likeCount = previousLikeCount
    uni.showToast({
      title: '操作失败，请稍后再试',
      icon: 'none',
    })
  }
  finally {
    likingPostIds.value.delete(targetPostId)
  }
}
</script>

<template>
  <view class="min-h-screen overflow-x-hidden bg-[#f3f6f9] pb-20rpx">
    <view v-if="loading" class="px-16rpx pt-16rpx">
      <view
        v-for="item in skeletonPostList"
        :key="`user-post-skeleton-${item}`"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <view class="h-22rpx w-180rpx rd-full bg-[#dbe8f1]" />
            <view class="flex gap-8rpx">
              <view class="h-40rpx w-112rpx rd-full bg-[#e5eef5]" />
              <view class="h-40rpx w-96rpx rd-full bg-[#dbe8f1]" />
            </view>
          </view>
          <view class="h-28rpx w-88% rd-full bg-[#d8e8f1]" />
          <view class="h-22rpx w-100% rd-full bg-[#e7eff5]" />
          <view class="h-22rpx w-68% rd-full bg-[#eef4f8]" />
          <view class="h-88rpx w-full rd-16rpx bg-[#f3f7fa]" />
          <view class="grid grid-cols-3 gap-8rpx">
            <view v-for="cell in 3" :key="`user-post-skeleton-image-${item}-${cell}`" class="aspect-square rd-12rpx bg-[#e5eef5]" />
          </view>
          <view class="mt-6rpx flex items-center justify-between">
            <view class="flex gap-18rpx">
              <view v-for="metric in 3" :key="`user-post-skeleton-metric-${item}-${metric}`" class="flex items-center gap-10rpx">
                <view class="h-36rpx w-36rpx rd-full bg-[#dbe8f1]" />
                <view class="h-22rpx w-32rpx rd-full bg-[#e7eff5]" />
              </view>
            </view>
            <view class="flex gap-8rpx">
              <view class="h-48rpx w-96rpx rd-full bg-[#dbe8f1]" />
              <view class="h-48rpx w-96rpx rd-full bg-[#f3d9dd]" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!postList.length" class="px-16rpx pt-16rpx">
      <view class="rd-24rpx bg-white px-24rpx py-64rpx text-center" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.08)">
        <view class="mx-auto mb-18rpx h-120rpx w-120rpx center rd-full bg-[#edf4f8]">
          <view class="i-material-symbols-note-stack-outline-rounded h-60rpx w-60rpx color-[#7a95ab]" />
        </view>
        <wd-text text="还没有发布过帖子" size="30rpx" color="#1f2937" bold />
        <wd-text text="去分享校园见闻，让更多校友看到你的内容。" size="24rpx" color="#64748b" :lines="2" />
        <view class="mt-24rpx inline-flex rd-full bg-[#215476] px-28rpx py-16rpx" @tap="goCreatePostPage">
          <wd-text text="发布第一条帖子" size="24rpx" color="#ffffff" />
        </view>
      </view>
    </view>

    <view v-else class="px-16rpx pt-16rpx">
      <view
        v-for="post in postList"
        :key="post.id"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
        @tap="goPostPage(post.id)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <wd-text :text="formatPublishMeta(post.date)" size="22rpx" color="#6b7280" />

            <view class="ml-auto flex items-center gap-8rpx">
              <view class="center flex rd-full bg-[#215476] px-16rpx py-8rpx">
                <wd-text :text="post.categoryName || '未分类'" size="20rpx" color="#ffffff" />
              </view>
              <view class="center flex rd-full px-16rpx py-8rpx" :class="getStatusBadgeClass(post.status)">
                <wd-text :text="getStatusText(post.status)" size="20rpx" :color="getStatusTextColor(post.status)" />
              </view>
              <view class="center flex b-2rpx b-#cfe0eb rd-full b-solid bg-[#f8fbfd] px-18rpx py-8rpx" @tap.stop="openPostActionSheet(post.id)">
                <wd-text text="编辑" size="22rpx" color="#215476" />
              </view>
            </view>
          </view>

          <view class="flex flex-col gap-8rpx">
            <wd-text :text="post.title" size="30rpx" color="#0f172a" bold />
            <wd-text :text="post.summary" size="24rpx" color="#334155" :lines="2" />
          </view>

          <view v-if="shouldShowStatusHint(post.status)" class="b-1rpx rd-16rpx b-solid px-16rpx py-14rpx" :class="getStatusPanelClass(post.status)">
            <wd-text :text="getStatusHint(post)" size="22rpx" color="#475569" :lines="2" />
          </view>

          <view v-if="getPostImages(post).length === 1" class="flex items-start justify-start">
            <view class="h-420rpx overflow-hidden rd-14rpx bg-white" @tap.stop="handlePreviewPostImages(post, getPostImages(post)[0])">
              <image :src="getPostImages(post)[0]" mode="heightFix" class="block h-full max-w-full w-auto" />
            </view>
          </view>

          <view v-else-if="getPostImages(post).length > 1" class="grid grid-cols-3 gap-8rpx" @tap.stop>
            <view
              v-for="(imageUrl, index) in getPostImages(post)"
              :key="`${post.id}-${index}`"
              class="aspect-square overflow-hidden rd-12rpx bg-[#f7f8fa]"
              @tap.stop="handlePreviewPostImages(post, imageUrl)"
            >
              <image :src="imageUrl" mode="aspectFill" class="h-full w-full" />
            </view>
          </view>

          <view class="mt-4rpx flex items-center justify-between px-10rpx">
            <view class="center flex gap-10rpx">
              <view class="i-majesticons-share-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.shareCount" size="24rpx" color="#475569" />
            </view>

            <view class="center flex gap-10rpx">
              <view class="i-majesticons-comment-2-text-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.commentCount" size="24rpx" color="#475569" />
            </view>

            <view class="center flex gap-10rpx" @tap.stop="togglePostLike(post)">
              <view v-if="post.isLiked" class="i-majesticons:thumb-up size-40rpx bg-[#ff3040]" />
              <view v-else class="i-majesticons-thumb-up-line size-40rpx bg-[#64748b]" />
              <wd-text :text="post.likeCount" size="24rpx" :color="post.isLiked ? '#ff3040' : '#475569'" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <wd-popup
      v-model="postActionVisible"
      position="center"
      root-portal
      :z-index="300"
      custom-style="width: 560rpx; border-radius: 28rpx; overflow: hidden; background: transparent;"
    >
      <view class="overflow-hidden rd-28rpx bg-[linear-gradient(180deg,#f8fbfd_0%,#eef4f8_100%)] shadow-[0_22rpx_44rpx_rgba(33,84,118,0.18)]">
        <view class="flex flex-col px-32rpx py-26rpx text-center">
          <wd-text text="帖子管理" size="30rpx" color="#16364d" bold />
          <wd-text text="选择你想进行的操作" size="22rpx" color="#64748b" class="mt-8rpx" />
        </view>
        <view class="px-20rpx pb-20rpx">
          <view class="flex flex-col gap-12rpx">
            <view class="h-88rpx center flex rd-22rpx bg-white shadow-[0_8rpx_18rpx_rgba(33,84,118,0.08)]" @tap="handlePostActionSelect({ item: { key: 'edit' } })">
              <wd-text text="修改帖子" size="26rpx" color="#215476" />
            </view>
            <view class="h-88rpx center flex rd-22rpx bg-[#fff1f2]" @tap="handlePostActionSelect({ item: { key: 'delete' } })">
              <wd-text text="删除帖子" size="26rpx" color="#d03050" />
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
              <wd-text text="确认删除帖子" size="30rpx" color="#881337" bold />
              <wd-text text="删除后内容、图片和互动记录都无法恢复。" size="22rpx" color="#9f1239" class="mt-6rpx" />
            </view>
          </view>
        </view>
        <view class="px-32rpx py-28rpx">
          <view class="rd-20rpx bg-[#fff5f5] px-20rpx py-18rpx">
            <wd-text text="如果只是想继续调整内容，建议先使用修改帖子；只有确定不再保留这条内容时再执行删除。" size="22rpx" color="#7f1d1d" class="leading-[1.7]" />
          </view>
          <view class="mt-28rpx flex gap-16rpx">
            <wd-button plain class="!h-80rpx !flex-1 !b-[#d7dee5] !rd-full !bg-white" @click="closeDeleteConfirm">
              <wd-text text="先不删" size="24rpx" color="#475569" />
            </wd-button>
            <wd-button type="error" :loading="deleting" class="shadow-[0_12rpx_24rpx_rgba(208,48,80,0.24)] !h-80rpx !flex-1 !rd-full !b-none !bg-[#d03050]" @click="confirmDeletePost">
              <wd-text text="确认删除" size="24rpx" color="white" />
            </wd-button>
          </view>
        </view>
      </view>
    </wd-popup>
    <view v-if="!loading && postList.length" class="pb-10rpx text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多帖子了" />
    </view>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" custom-style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)" :top="600" />
  </view>
</template>
