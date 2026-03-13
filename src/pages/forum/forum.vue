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
  <view>
    <view id="forum-header" class="fixed left-0 right-0 z-100 center flex flex-col bg-white p-16rpx">
      <wd-text text="连接母校与校友的交流社区" size="16rpx" color="black" />
      <wd-search v-model="keyword" placeholder-left placeholder="搜索帖子" cancel-txt="搜索" @cancel="handleSearch" />
    </view>

    <view id="forum-tabs" class="fixed z-120 w-full b-b-1rpx b-#f0f0f0 b-b-solid bg-white" :style="{ top: `${headerHeight}px` }">
      <scroll-view scroll-x :show-scrollbar="false" class="w-full whitespace-nowrap">
        <view class="box-border min-w-full inline-flex px-16rpx">
          <view
            v-for="(item, index) in tabs"
            :key="item.id"
            class="relative px-18rpx py-20rpx"
            @click="handleTabChange(index)"
          >
            <wd-text :text="item.name" :color="tab === index ? '#215476' : '#666666'" size="26rpx" />
            <view v-if="tab === index" class="absolute bottom-6rpx left-20% right-20% h-4rpx rd-999px bg-#215476" />
          </view>
        </view>
      </scroll-view>
    </view>

    <view :style="{ height: `${topPlaceholderHeight}px` }" />

    <view v-if="loading" class="center flex flex-col gap-8rpx py-40rpx text-gray-500">
      <wd-loading />
      <wd-text text="加载中..." color="black" size="24rpx" />
    </view>

    <wd-card v-for="post in loading ? [] : postList" :key="post.id" :data="post" type="rectangle" @tap="goPostPage(post.id)">
      <view class="flex flex-col gap-16rpx">
        <view class="flex items-center gap-16rpx">
          <wd-img :src="post.author.avatar" class="h-104rpx" mode="heightFix" />

          <view class="flex flex-col justify-center gap-2rpx">
            <wd-text :text="post.author.name" size="30rpx" color="black" />
            <wd-text :text="formatAuthorMeta(post.author.collegeName, post.date)" size="22rpx" color="#999999" />
          </view>

          <view class="ml-auto h-max flex rd-xl bg-#215476 px-12rpx py-8rpx">
            <wd-text :text="post.categoryName" size="20rpx" color="white" />
          </view>
        </view>

        <view class="flex flex-col gap-8rpx">
          <wd-text :text="post.title" size="30rpx" color="black" bold />
          <wd-text :text="post.summary" size="24rpx" color="black" :lines="1" />
        </view>

        <view v-if="getPostImages(post).length === 1" class="h-360rpx overflow-hidden rd-12rpx bg-#f7f8fa" @tap.stop="handlePreviewPostImages(post, getPostImages(post)[0])">
          <image :src="getPostImages(post)[0]" mode="aspectFill" class="h-full w-full" />
        </view>

        <view v-else-if="getPostImages(post).length > 1" class="grid grid-cols-3 gap-8rpx" @tap.stop>
          <view
            v-for="(imageUrl, index) in getPostImages(post)"
            :key="`${post.id}-${index}`"
            class="aspect-square overflow-hidden rd-10rpx bg-#f7f8fa"
            @tap.stop="handlePreviewPostImages(post, imageUrl)"
          >
            <image :src="imageUrl" mode="aspectFill" class="h-full w-full" />
          </view>
        </view>

        <view class="flex justify-between px-24rpx">
          <view class="center flex gap-8rpx">
            <view class="i-majesticons-share-line size-42rpx bg-black" />
            <wd-text :text="post.shareCount" size="24rpx" color="black" />
          </view>

          <view class="center flex gap-8rpx">
            <view class="i-majesticons-comment-2-text-line size-42rpx bg-black" />
            <wd-text :text="post.commentCount" size="24rpx" color="black" />
          </view>

          <view class="center flex gap-8rpx" @tap.stop="togglePostLike(post)">
            <view v-if="post.isLiked" class="i-majesticons:thumb-up size-42rpx bg-#ff3040" />
            <view v-else class="i-majesticons-thumb-up-line size-42rpx bg-black" />
            <wd-text :text="post.likeCount" size="24rpx" color="black" />
          </view>
        </view>
      </view>
    </wd-card>

    <view v-if="!loading" class="text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多帖子了" />
    </view>

    <wd-fab :active="true" :gap="{ top: 16, left: 16, right: 16, bottom: 96 }" position="left-bottom">
      <template #trigger>
        <view class="size-96rpx center flex rd-50% bg-#215476" @tap="goCreatePostPage">
          <view class="i-material-symbols-add-rounded size-48rpx bg-white" />
        </view>
      </template>
      <view class="size-96rpx center flex rd-50% bg-#215476" @click="handleRefresh">
        <view class="i-material-symbols-refresh-rounded size-48rpx bg-white" />
      </view>
    </wd-fab>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" :top="600" />
  </view>
</template>
