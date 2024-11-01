'use client'
import { useUserStore } from '@/app/stores/use-user-store'
import { emitter } from '@/lib/mitt'
import ky from 'ky'
import { env } from 'next-runtime-env'
import { isEmpty } from 'radash'
import { langToCountry } from './lang-to-country'

const apiKy = ky.create({
  prefixUrl: env('NEXT_PUBLIC_API_URL'),
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const apiKey = env('NEXT_PUBLIC_API_KEY')
        if (apiKey) {
          request.headers.set('Authorization', `Bearer ${apiKey}`)
        }
        const lang = useUserStore.getState().language
        if (lang) {
          request.headers.set('Lang', langToCountry(lang))
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          const res = await response.json<{ error: { err_code: number } }>()
          if (!isEmpty(res.error?.err_code)) {
            emitter.emit('ToastError', res.error.err_code)
          }
        }
      },
    ],
  },
})


export { apiKy }