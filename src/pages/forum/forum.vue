<script lang="ts" setup>
import type { IForumPost, IGetPostsResponse } from '@/api/posts'
import { getPosts, likePost, unlikePost } from '@/api/posts'
import { debounce } from '@/utils/debounce'

definePage({
  style: {
    navigationBarTitleText: '校友社区',
  },
})

const keyword = ref('')
const tab = ref(0)
const headerHeight = ref(0)
const tabsHeight = ref(0)
const pageScrollTop = ref(0)
const PAGE_SCROLL_SYNC_INTERVAL_MS = 100
const lastPageScrollSyncAt = ref(0)
const topPlaceholderHeight = computed(() => headerHeight.value + tabsHeight.value)

onPageScroll((e) => {
  const now = Date.now()
  if (e.scrollTop > 0 && now - lastPageScrollSyncAt.value < PAGE_SCROLL_SYNC_INTERVAL_MS)
    return

  pageScrollTop.value = e.scrollTop
  lastPageScrollSyncAt.value = now
})

function updateHeaderHeight() {
  uni.createSelectorQuery()
    .select('#forum-header')
    .boundingClientRect((rect) => {
      if (rect && !Array.isArray(rect)) {
        headerHeight.value = rect.height
      }
    })
    .select('#forum-tabs')
    .boundingClientRect((rect) => {
      if (rect && !Array.isArray(rect)) {
        tabsHeight.value = rect.height
      }
    })
    .exec()
}

onReady(() => {
  nextTick(() => {
    updateHeaderHeight()
  })
})

const tabs = [
  { id: 0, name: '推荐' },
  { id: 1, name: '校园生活' },
  { id: 2, name: '求职招聘' },
  { id: 3, name: '学术交流' },
  { id: 4, name: '创业分享' },
  { id: 5, name: '二手交易' },
  { id: 6, name: '失物招领' },
  { id: 7, name: '活动组织' },
  { id: 8, name: '情感交流' },
  { id: 9, name: '考研留学' },
  { id: 10, name: '行业资讯' },
]
const skeletonPostList = Array.from({ length: 3 }, (_, index) => index)

const postList = ref<IForumPost[]>([])
const likingPostIds = ref<Set<string>>(new Set())
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPage = ref(1)
const REFRESH_COOLDOWN_MS = 10000
const lastRefreshAt = ref(0)
const FORUM_NEED_REFRESH_KEY = 'forum:need-refresh-once'

function normalizePostList(response: IGetPostsResponse | undefined): IForumPost[] {
  return response?.records || []
}

function getCurrentTabId() {
  return tabs[tab.value]?.id ?? 0
}

function getSearchKeyword() {
  const value = keyword.value.trim()
  return value || undefined
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

function getPostImages(post: IForumPost) {
  if (!Array.isArray(post.images))
    return []
  return post.images.filter(Boolean).slice(0, 9)
}

function handlePreviewPostImages(post: IForumPost, currentUrl: string) {
  const urls = getPostImages(post)
  if (!urls.length || !currentUrl)
    return

  uni.previewImage({
    current: currentUrl,
    urls,
  })
}

function handleTabChange(index: number) {
  if (index === tab.value)
    return
  tab.value = index
}

function handleSearch() {
  currentPage.value = 1
  totalPage.value = 1
  postList.value = []
  fetchPostList()
}

function handleRefresh() {
  if (loading.value || loadingMore.value)
    return

  const now = Date.now()
  const waitMs = REFRESH_COOLDOWN_MS - (now - lastRefreshAt.value)
  if (waitMs > 0) {
    uni.showToast({
      title: `请${Math.ceil(waitMs / 1000)}秒后再试`,
      icon: 'none',
    })
    return
  }

  lastRefreshAt.value = now
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 0,
  })
  keyword.value = ''
  currentPage.value = 1
  totalPage.value = 1
  postList.value = []
  fetchPostList()
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
    const categoryId = getCurrentTabId()
    const response = await getPosts(page, categoryId, getSearchKeyword())
    const records = normalizePostList(response)

    currentPage.value = Number(response?.current || page)
    totalPage.value = Number(response?.total || currentPage.value)

    postList.value = append
      ? [...postList.value, ...records]
      : records
  }
  catch (error) {
    console.error('获取帖子列表失败', error)
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

const debouncedFetchPostList = debounce(() => {
  fetchPostList()
}, 300)

onLoad(() => {
  fetchPostList()
})

onShow(() => {
  const needRefresh = uni.getStorageSync(FORUM_NEED_REFRESH_KEY)
  if (!needRefresh)
    return

  uni.removeStorageSync(FORUM_NEED_REFRESH_KEY)
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 0,
  })
  currentPage.value = 1
  totalPage.value = 1
  postList.value = []
  fetchPostList()
})

watch(tab, () => {
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 0,
  })

  keyword.value = ''
  currentPage.value = 1
  totalPage.value = 1
  postList.value = []
  loading.value = true
  debouncedFetchPostList()
})

onReachBottom(() => {
  if (loading.value || loadingMore.value)
    return
  if (currentPage.value >= totalPage.value)
    return

  fetchPostListByPage(currentPage.value + 1, true)
})

onUnload(() => {
  debouncedFetchPostList.cancel()
})

function goPostPage(postId: string) {
  uni.navigateTo({
    url: `/pages-sub/post/post?id=${postId}`,
  })
}

function goCreatePostPage() {
  uni.navigateTo({
    url: '/pages-sub/post/editPost',
  })
}

async function togglePostLike(post: IForumPost) {
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
  <view class="min-h-screen overflow-x-hidden bg-[#f3f6f9]">
    <view id="forum-header" class="fixed left-0 right-0 z-100 flex flex-col gap-10rpx bg-[linear-gradient(180deg,#eaf2f8_0%,#f3f6f9_100%)] px-16rpx pb-12rpx pt-16rpx">
      <view class="flex items-center justify-center gap-8rpx">
        <view class="i-material-symbols-forum-rounded h-28rpx w-28rpx color-[#215476]" />
        <wd-text text="连接母校与校友的交流社区" size="22rpx" color="#215476" />
      </view>
      <view class="rd-14rpx bg-white px-8rpx py-6rpx" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.08)">
        <wd-search v-model="keyword" placeholder-left placeholder="搜索帖子" cancel-txt="搜索" @cancel="handleSearch" />
      </view>
    </view>

    <view
      id="forum-tabs"
      class="fixed z-120 w-full bg-[#f3f6f9]/95 px-8rpx pb-10rpx"
      :style="{ top: `${headerHeight}px`, backdropFilter: 'blur(6rpx)', WebkitBackdropFilter: 'blur(6rpx)' }"
    >
      <scroll-view scroll-x :show-scrollbar="false" class="w-full whitespace-nowrap">
        <view class="box-border w-max inline-flex gap-8rpx px-8rpx">
          <view
            v-for="(item, index) in tabs"
            :key="item.id"
            class="rd-full px-20rpx py-12rpx"
            :class="tab === index ? 'bg-[#215476]' : 'bg-white b-1rpx b-solid b-[#dbe7f0]'"
            :style="tab === index ? 'box-shadow: 0 4rpx 10rpx rgba(33,84,118,0.2)' : ''"
            @click="handleTabChange(index)"
          >
            <wd-text :text="item.name" :color="tab === index ? '#ffffff' : '#4b5563'" size="24rpx" />
          </view>
        </view>
      </scroll-view>
    </view>

    <view :style="{ height: `${topPlaceholderHeight}px` }" />

    <view v-if="loading" class="px-16rpx pb-14rpx pt-8rpx">
      <view
        v-for="item in skeletonPostList"
        :key="`skeleton-post-${item}`"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center gap-14rpx">
            <view class="h-92rpx w-92rpx rd-full bg-[#dbe8f1]" />

            <view class="min-w-0 flex flex-1 flex-col gap-8rpx">
              <view class="h-24rpx w-120rpx rd-full bg-[#d8e8f1]" />
              <view class="h-18rpx w-180rpx rd-full bg-[#e7eff5]" />
            </view>

            <view class="h-40rpx w-96rpx rd-full bg-[#dbe8f1]" />
          </view>

          <view class="flex flex-col gap-10rpx">
            <view class="h-28rpx w-92% rd-full bg-[#d8e8f1]" />
            <view class="h-22rpx w-100% rd-full bg-[#e7eff5]" />
            <view class="h-22rpx w-66% rd-full bg-[#eef4f8]" />
          </view>

          <view class="grid grid-cols-3 gap-8rpx">
            <view v-for="cell in 3" :key="`skeleton-post-image-${item}-${cell}`" class="aspect-square rd-12rpx bg-[#e5eef5]" />
          </view>

          <view class="mt-4rpx flex items-center justify-between px-20rpx">
            <view v-for="metric in 3" :key="`skeleton-post-metric-${item}-${metric}`" class="flex items-center gap-10rpx">
              <view class="h-40rpx w-40rpx rd-full bg-[#dbe8f1]" />
              <view class="h-22rpx w-32rpx rd-full bg-[#e7eff5]" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!postList.length" class="center flex flex-col gap-10rpx py-96rpx">
      <view class="i-mdi-file-document-outline h-56rpx w-56rpx color-[#94a3b8]" />
      <wd-text text="暂无帖子，去发布第一条吧" color="#64748b" size="24rpx" />
    </view>

    <view v-else class="px-16rpx pb-14rpx pt-8rpx">
      <view
        v-for="post in postList"
        :key="post.id"
        class="mb-16rpx rd-20rpx bg-white p-20rpx"
        style="box-shadow: 0 6rpx 14rpx rgba(33,84,118,0.08)"
        @tap="goPostPage(post.id)"
      >
        <view class="flex flex-col gap-14rpx">
          <view class="flex items-center gap-14rpx">
            <wd-img :src="post.author.avatar" class="h-92rpx w-92rpx rd-full bg-[#f1f5f9]" mode="aspectFill" />

            <view class="min-w-0 flex flex-col justify-center gap-4rpx">
              <wd-text :text="post.author.name" size="30rpx" color="#1f2937" />
              <wd-text :text="formatAuthorMeta(post.author.collegeName, post.date)" size="21rpx" color="#6b7280" />
            </view>

            <view class="ml-auto h-max flex rd-full bg-[#215476] px-16rpx py-8rpx">
              <wd-text :text="post.categoryName || '推荐'" size="20rpx" color="white" />
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

          <view class="mt-4rpx flex items-center justify-between px-20rpx">
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

    <view v-if="!loading" class="text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多帖子了" />
    </view>

    <wd-fab :active="true" :gap="{ top: 16, left: 16, right: 16, bottom: 96 }" position="left-bottom">
      <template #trigger>
        <view class="size-96rpx center flex rd-50% bg-#215476" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)" @tap="goCreatePostPage">
          <view class="i-material-symbols-add-rounded size-48rpx bg-white" />
        </view>
      </template>
      <view class="size-96rpx center flex rd-50% bg-#215476" style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)" @click="handleRefresh">
        <view class="i-material-symbols-refresh-rounded size-48rpx bg-white" />
      </view>
    </wd-fab>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" custom-style="box-shadow: 0 4rpx 12rpx rgba(33,84,118,0.16)" :top="600" />
  </view>
</template>
