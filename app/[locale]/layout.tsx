import '@/lib/check-env'
import { PublicEnvScript } from 'next-runtime-env'
import '../globals.css'

import ClientOnly from '@/app/components/client-only'
import { ErrorHandler } from '@/app/components/error-handler'
import { languages } from '@/app/i18n/settings'
import { dir } from 'i18next'
import { Metadata, ResolvingMetadata } from 'next'
import { headers } from 'next/headers'
import { Toaster } from 'react-hot-toast'
import { Providers } from '../components/providers'
import { Toolbar } from '../components/toolbar'

import 'react-photo-view/dist/react-photo-view.css';

export async function generateStaticParams() {
  return languages.map((locale) => ({ locale }))
}

type Props = {
  params: { locale: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
  { params: { locale } }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const headers_ = headers()
  const hostname = headers_.get('host')

  const previousImages = (await parent).openGraph?.images || []
  const seoRes = {
    data: {
      id: 'videosum',
      supportLanguages: ['zh', 'en', 'ja'],
      fallbackLanguage: 'en',
      languages: {
        zh: {
          title: "AI 图片翻译",
          description: "快速翻译并替换图片中的文字",
          image: "/images/pt_cn_tool_logo.jpg",
          _id: '66d2de547e3b177ca1c3b493',
        },
        en: {
          title: "AI Image Translation",
          description: "Quickly translate and replace text in images",
          image: "/images/pt_en_tool_logo.jpg",
          _id: '66d2de547e3b177ca1c3b494',
        },
        ja: {
          title: "AI画像翻訳",
          description: "画像内のテキストをすばやく翻訳して置換する",
          image: "/images/pt_jp_tool_logo.jpg",
          _id: '66d2de547e3b177ca1c3b495',
        },
      },
    },
  }

  const defaultSEO = {
    title: 'Default Title',
    description: 'Default Description',
    image: '/default-image.jpg',
  }

  const info = seoRes?.data?.languages || { [locale]: defaultSEO }
  // @ts-ignore
  const images = [info[locale].image || defaultSEO.image, ...previousImages]

  return {
    // @ts-ignore
    title: info[locale].title || defaultSEO.title,
    // @ts-ignore
    description: info[locale].description || defaultSEO.description,
    metadataBase: new URL(`https://${hostname}`),
    alternates: {
      canonical: `/${locale}`,
      languages: languages
        .filter((item) => item !== locale)
        .map((item) => ({
          [item]: `/${item}`,
        }))
        .reduce((acc, curr) => Object.assign(acc, curr), {}),
    },
    openGraph: {
      url: `/${locale}`,
      images,
    },
    twitter: {
      site: `https://${hostname}/${locale}`,
      images,
    },
  }
}

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  const showBrand = process.env.NEXT_PUBLIC_SHOW_BRAND === "true";
  return (
    <html lang={locale} dir={dir(locale)}>
      <head>
        <PublicEnvScript />
      </head>
      <body className='bg-[#fafafa] dark:bg-background'>
        <ClientOnly>
          <Providers>
            <Toaster />
            <ErrorHandler />
            <Toolbar />
            {children}
            {showBrand &&
              <script
                src='https://assets.salesmartly.com/js/project_177_61_1649762323.js'
                async
              />
            }
          </Providers>
        </ClientOnly>
      </body>
    </html>
  )
}
