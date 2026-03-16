<script lang="ts" setup>
import { createPost, getPostById, updatePost } from '@/api/posts'

definePage({
  style: {
    navigationBarTitleText: '',
  },
})

const title = ref('')
const content = ref('')
const categoryIndex = ref(-1)
const categoryValue = ref<number[]>([])
const postId = ref('')
const pageLoading = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const imageUrls = ref<string[]>([])
const categoryPickerVisible = ref(false)
const initialFormSnapshot = ref({
  title: '',
  content: '',
  categoryId: 0,
  images: [] as string[],
})

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

const categoryOptions = computed(() => categories.map(item => ({ label: item.name, value: item.id })))
const selectedCategory = computed(() => categories[categoryIndex.value] || null)
const isEditMode = computed(() => Boolean(postId.value))
const pageTitle = computed(() => isEditMode.value ? '修改帖子' : '发布帖子')
const submitButtonText = computed(() => isEditMode.value ? '提交修改' : '发布帖子')
const titleLength = computed(() => title.value.trim().length)
const contentLength = computed(() => content.value.trim().length)
const hasChanges = computed(() => {
  if (!isEditMode.value)
    return true

  return title.value.trim() !== initialFormSnapshot.value.title
    || content.value.trim() !== initialFormSnapshot.value.content
    || Number(selectedCategory.value?.id || 0) !== initialFormSnapshot.value.categoryId
    || JSON.stringify(imageUrls.value) !== JSON.stringify(initialFormSnapshot.value.images)
})
const canSubmit = computed(() => {
  return titleLength.value >= TITLE_MIN_LENGTH
    && titleLength.value <= TITLE_MAX_LENGTH
    && contentLength.value >= CONTENT_MIN_LENGTH
    && contentLength.value <= CONTENT_MAX_LENGTH
    && Boolean(selectedCategory.value?.id)
    && hasChanges.value
    && !submitting.value
    && !uploading.value
})

function syncCategoryValue(index: number) {
  const target = categories[index]
  categoryValue.value = target ? [target.id] : []
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message)
    return error.message
  const errorObj = error as Record<string, any>
  return errorObj?.message || errorObj?.msg || errorObj?.data?.message || errorObj?.data?.msg || '发布失败'
}

function handleCategoryChange(event: any) {
  const rawValue = event?.value
  const nextCategoryId = Array.isArray(rawValue) ? Number(rawValue[0]) : Number(rawValue)
  const idx = categories.findIndex(item => item.id === nextCategoryId)
  categoryIndex.value = idx >= 0 ? idx : -1
  syncCategoryValue(categoryIndex.value)
  categoryPickerVisible.value = false
}

function syncCategoryIndexByDetail(detail: Record<string, any>) {
  const categoryId = Number(detail?.categoryId)
  if (!Number.isNaN(categoryId) && categoryId > 0) {
    const idx = categories.findIndex(item => item.id === categoryId)
    categoryIndex.value = idx >= 0 ? idx : -1
    syncCategoryValue(categoryIndex.value)
    return
  }

  const categoryName = String(detail?.categoryName || '')
  if (categoryName) {
    const idx = categories.findIndex(item => item.name === categoryName)
    categoryIndex.value = idx >= 0 ? idx : -1
    syncCategoryValue(categoryIndex.value)
    return
  }

  categoryIndex.value = -1
  syncCategoryValue(categoryIndex.value)
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
    initialFormSnapshot.value = {
      title: title.value.trim(),
      content: content.value.trim(),
      categoryId: Number(detail?.categoryId || selectedCategory.value?.id || 0),
      images: [...imageUrls.value],
    }
  }
  catch (error) {
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

  if (isEditMode.value && !hasChanges.value) {
    uni.showToast({ title: '内容未发生变化', icon: 'none' })
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

    if (isEditMode.value)
      await updatePost(postId.value, payload)
    else
      await createPost(payload)

    uni.showToast({
      title: isEditMode.value ? '修改已提交' : '发布已提交',
      icon: 'success',
    })

    setTimeout(() => {
      uni.setStorageSync(FORUM_NEED_REFRESH_KEY, Date.now())
      uni.setStorageSync(USER_POST_NEED_REFRESH_KEY, Date.now())
      if (isEditMode.value) {
        uni.navigateBack({ delta: 1 })
      }
      else {
        uni.switchTab({ url: '/pages/forum/forum' })
      }
    }, 400)
  }
  catch (error) {
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
      catch {
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
  <view class="min-h-screen bg-[linear-gradient(180deg,#eaf2f8_0%,#f3f6f9_18%,#f3f6f9_100%)] pb-40rpx">
    <view class="px-24rpx pt-20rpx">
      <view v-if="pageLoading" class="flex flex-col gap-16rpx py-12rpx">
        <view class="rd-24rpx bg-[linear-gradient(160deg,#dbe8f1_0%,#f8fbfd_42%,#e8f0f6_100%)] p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
          <view class="h-28rpx w-180rpx rd-full bg-[#d0e0eb]" />
          <view class="mt-12rpx h-20rpx w-88% rd-full bg-[#e3edf4]" />
          <view class="mt-8rpx h-20rpx w-66% rd-full bg-[#edf3f7]" />
          <view class="grid grid-cols-3 mt-24rpx gap-12rpx">
            <view v-for="item in 3" :key="item" class="h-120rpx rd-18rpx bg-white/70" />
          </view>
        </view>
        <view class="rd-24rpx bg-white p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
          <view class="h-24rpx w-120rpx rd-full bg-[#dbe8f1]" />
          <view class="mt-16rpx h-84rpx rd-16rpx bg-[#f2f6f9]" />
          <view class="mt-16rpx h-280rpx rd-20rpx bg-[#f5f8fb]" />
        </view>
      </view>

      <template v-else>
        <view class="b-1rpx b-[#fecdd3] rd-20rpx b-solid bg-[#fff1f2] px-20rpx py-16rpx shadow-[0_6rpx_16rpx_rgba(190,24,93,0.08)]">
          <view class="flex items-center gap-10rpx">
            <view class="i-material-symbols-warning-outline-rounded size-30rpx color-[#be123c]" />
            <wd-text text="离开当前页面后，未提交的编辑内容不会自动保存" size="22rpx" color="#be123c" />
          </view>
        </view>

        <view class="mt-18rpx flex flex-col gap-18rpx">
          <view class="rd-24rpx bg-white p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
            <view class="flex flex-col">
              <wd-text text="标题与分类" size="30rpx" color="#16364d" bold />
              <wd-text text="先让大家一眼知道这条内容在说什么" size="22rpx" color="#6b7280" class="mt-6rpx" />
            </view>

            <view class="mt-18rpx flex flex-col gap-18rpx">
              <view>
                <view class="mb-10rpx flex items-center justify-between">
                  <wd-text text="帖子标题" size="22rpx" color="#4b5563" />
                  <wd-text :text="`${titleLength}/${TITLE_MAX_LENGTH}`" size="22rpx" :color="titleLength < TITLE_MIN_LENGTH ? '#d97706' : '#64748b'" />
                </view>
                <view class="h-64rpx flex items-center b-1rpx b-[#dbe7f0] rd-18rpx b-solid bg-[#f6f9fb] px-18rpx">
                  <wd-input v-model="title" clearable :maxlength="TITLE_MAX_LENGTH" placeholder="请输入标题（5-30字）" no-border custom-class="!h-full !bg-transparent flex-1 flex items-center" />
                </view>
              </view>

              <view>
                <wd-text text="帖子分类" size="22rpx" color="#4b5563" class="mb-10rpx" />
                <wd-picker
                  v-model="categoryValue"
                  v-model:visible="categoryPickerVisible"
                  :columns="categoryOptions"
                  title="选择帖子分类"
                  value-key="value"
                  label-key="label"
                  class="mt-10rpx"
                  @confirm="handleCategoryChange"
                >
                  <view class="h-64rpx flex items-center justify-between b-1rpx b-[#dbe7f0] rd-18rpx b-solid bg-[#f6f9fb] px-18rpx">
                    <view class="flex items-center gap-10rpx">
                      <view class="i-material-symbols-category-outline-rounded size-32rpx color-[#215476]" />
                      <wd-text :text="selectedCategory?.name || '请选择帖子分类'" size="26rpx" color="#16364d" />
                    </view>
                    <view class="i-material-symbols-keyboard-arrow-down-rounded size-38rpx color-[#64748b]" />
                  </view>
                </wd-picker>
              </view>
            </view>
          </view>

          <view class="rd-24rpx bg-white p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
            <view class="flex items-center justify-between gap-12rpx">
              <view class="flex flex-col">
                <wd-text text="正文内容" size="30rpx" color="#16364d" bold />
                <wd-text text="记录细节、背景和你真正想分享的重点" size="22rpx" color="#6b7280" class="mt-6rpx" />
              </view>
              <wd-text :text="`${contentLength}/${CONTENT_MAX_LENGTH}`" size="22rpx" :color="contentLength < CONTENT_MIN_LENGTH ? '#d97706' : '#64748b'" />
            </view>

            <view class="mt-18rpx b-1rpx b-[#dbe7f0] rd-20rpx b-solid bg-[linear-gradient(180deg,#f8fbfd_0%,#f4f8fb_100%)] p-16rpx">
              <textarea
                v-model="content"
                :maxlength="CONTENT_MAX_LENGTH"
                placeholder="请输入内容（10-2000字）"
                auto-height
                :show-confirm-bar="false"
                :disable-default-padding="true"
                class="content-textarea max-h-720rpx min-h-360rpx w-full overflow-y-auto bg-transparent text-26rpx color-[#1f2937] leading-[1.8]"
                placeholder-class="color-[#9ca3af]"
              />
            </view>
          </view>

          <view class="rd-24rpx bg-white p-24rpx shadow-[0_8rpx_20rpx_rgba(33,84,118,0.08)]">
            <view class="flex items-center justify-between gap-12rpx">
              <view class="flex flex-col">
                <wd-text text="配图" size="30rpx" color="#16364d" bold />
                <wd-text text="最多上传 9 张图片，让内容更有现场感" size="22rpx" color="#6b7280" class="mt-6rpx" />
              </view>
              <wd-text :text="`${imageUrls.length}/${POST_IMAGE_MAX_COUNT}`" size="20rpx" color="#215476" class="rd-full bg-[#eef4f8] px-16rpx py-8rpx" />
            </view>

            <view class="grid grid-cols-3 mt-18rpx justify-items-center gap-x-14rpx gap-y-14rpx">
              <view
                v-for="(imageUrl, index) in imageUrls"
                :key="`${imageUrl}-${index}`"
                class="group relative h-200rpx w-200rpx overflow-hidden rd-18rpx bg-[#eff4f8] shadow-[0_6rpx_16rpx_rgba(33,84,118,0.08)]"
                @tap="handlePreviewImage(imageUrl)"
              >
                <image :src="imageUrl" mode="aspectFill" class="h-full w-full" />
                <view class="absolute inset-x-0 bottom-0 h-56rpx bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.55)_100%)]" />
                <view class="absolute right-10rpx top-10rpx h-44rpx w-44rpx flex items-center justify-center rd-full bg-black/45" @tap.stop="handleDeleteImage(index)">
                  <wd-text text="×" size="28rpx" color="white" />
                </view>
              </view>

              <view
                v-if="imageUrls.length < POST_IMAGE_MAX_COUNT"
                class="h-200rpx w-200rpx flex flex-col items-center justify-center gap-10rpx b-2rpx b-[#bfd1df] rd-18rpx b-dashed bg-[linear-gradient(180deg,#f8fbfd_0%,#f0f6fa_100%)] color-[#6b7f8f]"
                @tap="handleChooseImages"
              >
                <view class="i-material-symbols-add-photo-alternate-outline-rounded size-52rpx color-[#215476]" />
                <wd-text text="添加图片" size="22rpx" color="#6b7f8f" />
              </view>
            </view>

            <wd-text v-if="uploading" text="图片上传中，请稍候..." size="22rpx" color="#6b7280" class="mt-14rpx" />
          </view>
        </view>

        <view class="mt-20rpx rd-24rpx bg-[linear-gradient(160deg,#183a53_0%,#215476_42%,#2f6c95_100%)] p-24rpx shadow-[0_14rpx_28rpx_rgba(33,84,118,0.2)]">
          <view class="flex items-center justify-between gap-16rpx">
            <view class="min-w-0 flex flex-1 flex-col">
              <wd-text text="准备好发布了吗？" size="28rpx" color="white" bold />
              <wd-text text="帖子提交后需要先经过审核，审核通过后才会展示在社区中" size="22rpx" color="rgba(255,255,255,0.72)" class="mt-8rpx leading-[1.7]" />
            </view>
            <wd-button
              type="primary"
              :disabled="!canSubmit"
              :loading="submitting"
              class="!h-84rpx !min-w-180rpx !rd-full !b-none !bg-white !px-28rpx disabled:!bg-white/55"
              @click="handleSubmit"
            >
              <wd-text :text="submitButtonText" size="24rpx" color="#215476" />
            </wd-button>
          </view>
        </view>

        <view class="h-32rpx" />
      </template>
    </view>
  </view>
</template>

<style scoped>
.content-textarea {
  scrollbar-width: none;
}

.content-textarea::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
