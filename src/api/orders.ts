import { http } from '@/http/http'

export interface ICreateOrderSeatItem {
  id: string
  version: number
}

export interface ICreateOrderBody {
  seatList: ICreateOrderSeatItem[]
}

export interface IOrderData {
  id: string
  campusId?: number
  buildingId?: number
  roomId?: number
  amount: number
  status: string
  expiresAt: string
  createdAt?: string
  updatedAt?: string
  seatList?: IOrderSeat[]
}

export interface IOrderSeat {
  id?: string
  row?: number
  col?: number
  lookPrice?: number
}

export interface IGetOrdersResponse {
  current?: number
  total?: number
  records?: IOrderData[]
}

interface IApiResponse<T> {
  code: number
  msg?: string
  message?: string
  data: T
}

function postWithBizCheck<T>(url: string, data: Record<string, any>) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      data,
      success(res) {
        const responseData = (res.data || {}) as IApiResponse<T>
        const message = responseData.message || responseData.msg || '请求失败'

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (responseData.code === 0 || responseData.code === 200) {
            resolve(responseData.data)
            return
          }
          reject(new Error(message))
          return
        }

        reject(new Error(message))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误，换个网络试试'))
      },
    })
  })
}

export function createOrder(data: ICreateOrderBody) {
  return postWithBizCheck<IOrderData>('/api/orders', data)
}

export function mockPayNotify(data: { orderId: string }) {
  return postWithBizCheck<Record<string, any>>('/api/mock/pay/notify', data)
}

export function getOrders(page = 1) {
  return http.get<IGetOrdersResponse>('/api/orders', { page })
}
