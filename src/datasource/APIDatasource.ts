// API Datasource for server communication

import { ApiResponse } from '@/types'

export class APIDatasource {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  private token: string | null = null

  setToken(token: string): void {
    this.token = token
  }

  clearToken(): void {
    this.token = null
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const result: ApiResponse<T> = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }

    return result.data!
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const result: ApiResponse<T> = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }

    return result.data!
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const result: ApiResponse<T> = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }

    return result.data!
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
  }
}

export const apiDatasource = new APIDatasource()
