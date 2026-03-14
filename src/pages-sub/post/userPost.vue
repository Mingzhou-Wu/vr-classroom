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
const deleting = ref(false)
const deletingPostId = ref('')
const likingPostIds = ref<Set<string>>(new Set())
const USER_POST_NEED_REFRESH_KEY = 'user-post:need-refresh-once'
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

function openDeleteConfirm(postId: string) {
  deletingPostId.value = postId
  confirmPopupVisible.value = true
}

function closeDeleteConfirm() {
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
  <view class="pb-20rpx pt-16rpx">
    <view v-if="loading" class="center flex flex-col gap-8rpx py-40rpx text-gray-500">
      <wd-loading />
      <wd-text text="加载中..." color="black" size="24rpx" />
    </view>

    <wd-card v-for="post in loading ? [] : postList" :key="post.id" :data="post" type="rectangle" @tap="goPostPage(post.id)">
      <view class="flex flex-col gap-16rpx">
        <view class="flex items-center justify-between gap-12rpx">
          <wd-text :text="formatPublishMeta(post.date)" size="22rpx" color="#999999" />

          <view class="ml-auto flex items-center gap-8rpx">
            <view class="h-max flex rd-xl bg-#215476 px-12rpx py-8rpx">
              <wd-text :text="post.categoryName || '未分类'" size="20rpx" color="white" />
            </view>
            <view class="h-max flex rd-xl px-12rpx py-8rpx" :class="post.status === 2 ? 'bg-#d03050' : post.status === 1 ? 'bg-#2d8c4d' : post.status === -1 ? 'bg-#909399' : 'bg-#e6a23c'">
              <wd-text :text="getStatusText(post.status)" size="20rpx" color="white" />
            </view>
          </view>
        </view>

        <view class="flex flex-col gap-8rpx">
          <wd-text :text="post.title" size="30rpx" color="black" bold />
          <wd-text :text="post.summary" size="24rpx" color="black" :lines="2" />
          <wd-text
            v-if="post.status === 2 && post.rejectReason"
            :text="`驳回原因：${post.rejectReason}`"
            size="22rpx"
            color="#d03050"
            :lines="2"
          />
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

        <view class="flex items-center justify-between gap-36rpx">
          <view class="flex flex-1 justify-between">
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

          <view class="flex shrink-0 justify-end gap-12rpx">
            <view class="center flex b-2rpx b-#215476 rd-xl b-solid bg-white px-12rpx py-4rpx" @tap.stop="goEditPostPage(post.id)">
              <wd-text text="修改" size="24rpx" color="#215476" />
            </view>
            <view class="center flex b-2rpx b-#d03050 rd-xl b-solid bg-white px-12rpx py-4rpx" @tap.stop="openDeleteConfirm(post.id)">
              <wd-text text="删除" size="24rpx" color="#d03050" />
            </view>
          </view>
        </view>
      </view>
    </wd-card>

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

    <view v-if="!loading" class="text-center">
      <wd-loadmore :state="loadMoreState" finished-text="没有更多帖子了" />
    </view>

    <wd-backtop :scroll-top="pageScrollTop" :right="16" :bottom="96" custom-class="!size-96rpx !bg-#215476 !color-white" :top="600" />
  </view>
</template>
