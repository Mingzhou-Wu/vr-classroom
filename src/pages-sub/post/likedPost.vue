<script lang="ts" setup>
import type { IForumPost, IGetLikedPostsResponse, IUserPostRecord } from '@/api/posts'
import { getLikedPosts, likePost, unlikePost } from '@/api/posts'

definePage({
  style: {
    navigationBarTitleText: '我点赞的帖子',
  },
})

type ILikedPostCard = IForumPost

const postList = ref<ILikedPostCard[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const likingPostIds = ref<Set<string>>(new Set())
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

const totalLikeCount = computed(() => postList.value.reduce((sum, post) => sum + Number(post.likeCount || 0), 0))
const totalCommentCount = computed(() => postList.value.reduce((sum, post) => sum + Number(post.commentCount || 0), 0))

function normalizeRecord(record: IUserPostRecord): ILikedPostCard {
  const author = (record as Record<string, any>).author as Record<string, any> | undefined
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
      id: String(author?.id || ''),
      name: String(author?.name || ''),
      avatar: String(author?.avatar || ''),
      collegeId: String(author?.collegeId || ''),
      collegeName: String(author?.collegeName || ''),
      isVerified: Boolean(author?.isVerified),
    },
    isLiked: Boolean(record.isLiked),
  }
}

function normalizePostList(response: IGetLikedPostsResponse | undefined): ILikedPostCard[] {
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

function formatAuthorMeta(post: ILikedPostCard) {
  const collegeText = post.author?.collegeName || '校友动态'
  const publishText = formatPublishTime(post.date)
  return publishText ? `${collegeText} · 发布于${publishText}` : collegeText
}

function getPostImages(post: ILikedPostCard) {
  if (!Array.isArray(post.images))
    return []
  return post.images.filter(Boolean).slice(0, 9)
}

function handlePreviewPostImages(post: ILikedPostCard, currentUrl: string) {
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
    const response = await getLikedPosts(page)
    const records = normalizePostList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    postList.value = append
      ? [...postList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取我点赞的帖子失败', error)
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

async function togglePostLike(post: ILikedPostCard) {
  const targetPostId = String(post.id || '')
  if (!targetPostId || likingPostIds.value.has(targetPostId))
    return

  const likedBefore = Boolean(post.isLiked)
  const previousLikeCount = Number(post.likeCount || 0)
  post.isLiked = !likedBefore
  post.likeCount = Math.max(0, previousLikeCount + (likedBefore ? -1 : 1))
  likingPostIds.value.add(targetPostId)

  try {
    if (likedBefore) {
      await unlikePost(targetPostId)
      postList.value = postList.value.filter(item => String(item.id || '') !== targetPostId)
      return
    }

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
        :key="`liked-post-skeleton-${item}`"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center justify-between gap-12rpx">
            <view class="h-22rpx w-180rpx rd-full bg-[#dbe8f1]" />
            <view class="h-40rpx w-112rpx rd-full bg-[#e5eef5]" />
          </view>
          <view class="h-28rpx w-88% rd-full bg-[#d8e8f1]" />
          <view class="h-22rpx w-100% rd-full bg-[#e7eff5]" />
          <view class="h-22rpx w-68% rd-full bg-[#eef4f8]" />
          <view class="grid grid-cols-3 gap-8rpx">
            <view v-for="cell in 3" :key="`liked-post-skeleton-image-${item}-${cell}`" class="aspect-square rd-12rpx bg-[#e5eef5]" />
          </view>
          <view class="mt-6rpx flex items-center justify-between">
            <view class="flex gap-18rpx">
              <view v-for="metric in 3" :key="`liked-post-skeleton-metric-${item}-${metric}`" class="flex items-center gap-10rpx">
                <view class="h-36rpx w-36rpx rd-full bg-[#dbe8f1]" />
                <view class="h-22rpx w-32rpx rd-full bg-[#e7eff5]" />
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!postList.length" class="px-16rpx pt-16rpx">
      <view class="rd-24rpx bg-white px-24rpx py-64rpx text-center" style="box-shadow: 0 8rpx 18rpx rgba(33,84,118,0.08)">
        <view class="mx-auto mb-18rpx h-120rpx w-120rpx center rd-full bg-[#edf4f8]">
          <view class="i-material-symbols-thumb-up-rounded h-60rpx w-60rpx color-[#7a95ab]" />
        </view>
        <wd-text text="还没有点赞过帖子" size="30rpx" color="#1f2937" bold />
        <wd-text text="去社区逛一逛，把喜欢的内容点亮，这里就会慢慢积累成你的精选列表。" size="24rpx" color="#64748b" :lines="2" />
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
            <wd-text :text="formatPublishTime(post.date) ? `发布于 ${formatPublishTime(post.date)}` : ''" size="22rpx" color="#6b7280" />

            <view class="ml-auto flex items-center gap-8rpx">
              <view class="center flex rd-full bg-[#215476] px-16rpx py-8rpx">
                <wd-text :text="post.categoryName || '未分类'" size="20rpx" color="#ffffff" />
              </view>
            </view>
          </view>

          <view class="flex flex-col gap-8rpx">
            <wd-text :text="post.title" size="30rpx" color="#0f172a" bold />
            <wd-text :text="post.summary" size="24rpx" color="#334155" :lines="2" />
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

    <view v-if="!loading && postList.length" class="pb-10rpx text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多帖子了" />
    </view>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" custom-style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)" :top="600" />
  </view>
</template>
