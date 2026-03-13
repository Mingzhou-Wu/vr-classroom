import { http } from '@/http/http'

export interface IRoomSeat {
  id: string
  row: number
  col: number
  status: 0 | 1 | 2 | 3
  version: number
  price: number
}

export interface IRoomSeatsData {
  totalRows: number
  totalCols: number
  seats: IRoomSeat[]
}

export function getRoomSeats(roomId: string) {
  return http.get<IRoomSeatsData>(`/api/rooms/${encodeURIComponent(roomId)}/seats`)
}
