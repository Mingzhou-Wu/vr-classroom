<script lang="ts" setup>
import { createPost, getPostById, updatePost } from '@/api/posts'

definePage({
  style: {
    navigationBarTitleText: '',
  },
})

const title = ref('')
const content = ref('')
const categoryIndex = ref(0)
const postId = ref('')
const pageLoading = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const imageUrls = ref<string[]>([])

const TITLE_MIN_LENGTH = 5
const TITLE_MAX_LENGTH = 30
const CONTENT_MIN_LENGTH = 10
const CONTENT_MAX_LENGTH = 2000
const POST_IMAGE_MAX_COUNT = 9
const FORUM_NEED_REFRESH_KEY = 'forum:need-refresh-once'
const USER_POST_NEED_REFRESH_KEY = 'user-post:need-refresh-once'

const categories = [
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

const selectedCategory = computed(() => categories[categoryIndex.value] || categories[0])
const isEditMode = computed(() => Boolean(postId.value))
const pageTitle = computed(() => isEditMode.value ? '修改帖子' : '发布帖子')
const submitButtonText = computed(() => isEditMode.value ? '保存修改' : '发布帖子')

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '发布失败'
}

function handleCategoryChange(event: any) {
  const index = Number(event?.detail?.value || 0)
  categoryIndex.value = Number.isNaN(index) ? 0 : index
}

function syncCategoryIndexByDetail(detail: Record<string, any>) {
  const categoryId = Number(detail?.categoryId)
  if (!Number.isNaN(categoryId) && categoryId > 0) {
    const idx = categories.findIndex(item => item.id === categoryId)
    categoryIndex.value = idx >= 0 ? idx : 0
    return
  }

  const categoryName = String(detail?.categoryName || '')
  if (categoryName) {
    const idx = categories.findIndex(item => item.name === categoryName)
    categoryIndex.value = idx >= 0 ? idx : 0
    return
  }

  categoryIndex.value = 0
}

async function fetchPostDetail() {
  if (!postId.value)
    return

  pageLoading.value = true
  try {
    const detail = await getPostById(postId.value)
    title.value = String(detail?.title || '')
    content.value = String(detail?.content || detail?.summary || '')
    imageUrls.value = Array.isArray(detail?.images) ? detail.images.filter(Boolean) : []
    syncCategoryIndexByDetail(detail as any)
  }
  catch (error) {
    console.error('获取帖子详情失败', error)
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    pageLoading.value = false
  }
}

async function handleSubmit() {
  const postTitle = title.value.trim()
  const postContent = content.value.trim()
  const category = selectedCategory.value

  if (uploading.value) {
    uni.showToast({ title: '图片上传中，请稍后发布', icon: 'none' })
    return
  }

  if (!postTitle) {
    uni.showToast({ title: '请输入帖子标题', icon: 'none' })
    return
  }

  if (postTitle.length < TITLE_MIN_LENGTH || postTitle.length > TITLE_MAX_LENGTH) {
    uni.showToast({ title: `标题需${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH}字`, icon: 'none' })
    return
  }

  if (!postContent) {
    uni.showToast({ title: '请输入帖子内容', icon: 'none' })
    return
  }

  if (postContent.length < CONTENT_MIN_LENGTH || postContent.length > CONTENT_MAX_LENGTH) {
    uni.showToast({ title: `内容需${CONTENT_MIN_LENGTH}-${CONTENT_MAX_LENGTH}字`, icon: 'none' })
    return
  }

  if (!category?.id) {
    uni.showToast({ title: '请选择帖子分类', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      title: postTitle,
      content: postContent,
      categoryId: category.id,
      images: imageUrls.value,
    }
    const response = isEditMode.value
      ? await updatePost(postId.value, payload)
      : await createPost(payload)
    console.log(`${isEditMode.value ? '更新' : '发布'}帖子返回:`, response)

    uni.showToast({
      title: isEditMode.value ? '修改成功' : '发布成功',
      icon: 'success',
    })

    setTimeout(() => {
      uni.setStorageSync(FORUM_NEED_REFRESH_KEY, Date.now())
      uni.setStorageSync(USER_POST_NEED_REFRESH_KEY, Date.now())
      if (isEditMode.value) {
        uni.navigateBack({
          delta: 1,
        })
      }
      else {
        uni.switchTab({
          url: '/pages/forum/forum',
        })
      }
    }, 400)
  }
  catch (error) {
    console.error(`${isEditMode.value ? '更新' : '发布'}帖子失败`, error)
    uni.showToast({
      title: getErrorMessage(error),
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

function handlePreviewImage(currentUrl: string) {
  if (!currentUrl)
    return

  uni.previewImage({
    current: currentUrl,
    urls: imageUrls.value,
  })
}

function handleDeleteImage(index: number) {
  if (index < 0 || index >= imageUrls.value.length)
    return

  imageUrls.value.splice(index, 1)
}

function extractUploadedImageUrl(uploadResData: string) {
  try {
    const parsed = JSON.parse(uploadResData) as Record<string, any>
    return String(parsed?.data?.url || '')
  }
  catch {
    return ''
  }
}

function extractUploadErrorMessage(uploadResData: string) {
  try {
    const parsed = JSON.parse(uploadResData) as Record<string, any>
    return String(parsed?.msg || parsed?.message || '')
  }
  catch {
    return ''
  }
}

function uploadPostImage(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    uni.uploadFile({
      url: '/api/images/post',
      filePath,
      name: 'file',
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = extractUploadErrorMessage(res.data) || String(res.data || '图片上传失败')
          reject(new Error(message))
          return
        }

        const imageUrl = extractUploadedImageUrl(res.data)
        if (!imageUrl) {
          reject(new Error('图片地址解析失败'))
          return
        }

        resolve(imageUrl)
      },
      fail: (error) => {
        reject(error)
      },
    })
  })
}

function handleChooseImages() {
  if (uploading.value)
    return

  const remainCount = POST_IMAGE_MAX_COUNT - imageUrls.value.length
  if (remainCount <= 0) {
    uni.showToast({
      title: `最多上传${POST_IMAGE_MAX_COUNT}张`,
      icon: 'none',
    })
    return
  }

  uni.chooseImage({
    count: remainCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const rawFilePaths = res.tempFilePaths
      const filePaths = (Array.isArray(rawFilePaths) ? rawFilePaths : [rawFilePaths]).filter(Boolean)
      if (!filePaths.length)
        return

      uploading.value = true
      try {
        const uploadedUrls: string[] = []
        for (const filePath of filePaths) {
          const imageUrl = await uploadPostImage(filePath)
          uploadedUrls.push(imageUrl)
        }

        imageUrls.value = [...imageUrls.value, ...uploadedUrls].slice(0, POST_IMAGE_MAX_COUNT)
        uni.showToast({
          title: '上传成功',
          icon: 'success',
        })
      }
      catch (error) {
        console.error('上传帖子图片失败', error)
        uni.showToast({
          title: '上传失败，请稍后再试',
          icon: 'none',
        })
      }
      finally {
        uploading.value = false
      }
    },
  })
}

onLoad((options) => {
  postId.value = String(options?.id || '')
  uni.setNavigationBarTitle({
    title: pageTitle.value,
  })

  if (postId.value)
    fetchPostDetail()
})
</script>

<template>
  <view class="flex flex-col gap-20rpx px-24rpx py-20rpx">
    <view v-if="pageLoading" class="center flex flex-col gap-8rpx py-40rpx text-gray-500">
      <wd-loading />
      <wd-text text="加载中..." color="black" size="24rpx" />
    </view>

    <template v-else>
      <wd-text text="离开当前页面后已编辑的内容不会保存" size="22rpx" color="red" />

      <view class="flex flex-col gap-10rpx">
        <wd-text text="帖子标题" size="24rpx" color="black" />
        <wd-input v-model="title" clearable :maxlength="TITLE_MAX_LENGTH" placeholder="请输入标题（5-30字）" />
      </view>

      <view class="flex flex-col gap-10rpx">
        <wd-text text="帖子内容" size="24rpx" color="black" />
        <textarea
          v-model="content"
          class="box-border w-full"
          style="min-height: 280rpx; border-radius: 16rpx; background: #f7f8fa; padding: 16rpx; font-size: 24rpx;"
          placeholder="请输入内容（10-2000字）"
          :maxlength="CONTENT_MAX_LENGTH"
        />
      </view>

      <view class="flex flex-col gap-12rpx">
        <wd-text text="帖子图片（最多9张）" size="24rpx" color="black" />
        <view class="flex flex-wrap gap-12rpx">
          <view
            v-for="(imageUrl, index) in imageUrls"
            :key="`${imageUrl}-${index}`"
            class="relative h-200rpx w-200rpx overflow-hidden rd-12rpx bg-#f7f8fa"
            @tap="handlePreviewImage(imageUrl)"
          >
            <image :src="imageUrl" mode="aspectFill" class="h-full w-full" />
            <view class="absolute right-8rpx top-8rpx h-40rpx w-40rpx center rd-999rpx bg-black/45 text-24rpx text-white" @tap.stop="handleDeleteImage(index)">
              ×
            </view>
          </view>

          <view
            v-if="imageUrls.length < POST_IMAGE_MAX_COUNT"
            class="h-200rpx w-200rpx center b-2rpx b-#d0d5dd rd-12rpx b-dashed bg-#fafbfc text-50rpx text-#98a2b3"
            @tap="handleChooseImages"
          >
            +
          </view>
        </view>
        <wd-text v-if="uploading" text="图片上传中，请稍候..." size="22rpx" color="#999999" />
      </view>

      <view class="flex flex-col gap-10rpx">
        <wd-text text="帖子分类" size="24rpx" color="black" />
        <picker :range="categories" range-key="name" :value="categoryIndex" @change="handleCategoryChange">
          <view class="h-84rpx flex items-center justify-between rd-16rpx bg-#f7f8fa px-16rpx text-24rpx text-black">
            <text>{{ selectedCategory.name }}</text>
            <view class="i-material-symbols-keyboard-arrow-down-rounded size-36rpx bg-#666" />
          </view>
        </picker>
      </view>

      <wd-button type="primary" :loading="submitting" class="mt-20rpx" style="background: #215476; border-color: #215476;" @click="handleSubmit">
        {{ submitButtonText }}
      </wd-button>
    </template>
  </view>
</template>
