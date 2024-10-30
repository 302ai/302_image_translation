'use client'
import { useTranslation } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { emitter } from '@/lib/mitt'
import { useParams, useRouter } from 'next/navigation'

export function Test() {
  const { locale } = useParams()
  const { t, i18n } = useTranslation(locale as string)
  const router = useRouter()

  const handleClick = () => {
    emitter.emit('ToastError', -10005)
  }
  const handleChangeLang = async () => {
    router.push('zh')
  }
  return (
    <>
      <Button onClick={handleClick}>错误测试</Button>
      <Button onClick={handleChangeLang}>切换语言</Button>
    </>
  )
}
