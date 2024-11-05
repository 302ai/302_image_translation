'use client'
import ky from 'ky'
import dayjs from 'dayjs';
import Image from 'next/image';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { emitter } from '@/lib/mitt';
import Masonry from 'react-layout-masonry';
import { GoDownload } from "react-icons/go";
import { targetLang } from '@/lib/targetLang';
import logo_302 from '@/public/images/logo.png';
import { Button } from '@/components/ui/button';
import { Footer } from '@/app/components/footer';
import { IoWarningSharp } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import { useTranslation } from '@/app/i18n/client';
import { useEffect, useRef, useState } from 'react';
import { MdOutlineDriveFolderUpload } from "react-icons/md";
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { SkFadingCircle } from '../components/SkFadingCircle';
import occupationMap from '@/public/images/occupationMap.png';
import { addData, deleteData, getData, updateData } from '@/lib/api/indexedDB';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { env } from 'next-runtime-env';

interface IDataSource {
  id?: number;
  src: string;
  translateSrc?: string;
  status: number; //-1. Translation failed. 1. Completed translation. 2. Completed image upload. 3. In queue. 4. Image upload in progress
  requestId?: string;
  message?: string;
  createdAt: string;
}

export default function Home({ params: { locale } }: { params: { locale: string } }) {
  const { t } = useTranslation(locale)
  const translateIds = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragDrop, setDragDrop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshData, setRefreshData] = useState(false);
  const [dataSource, setDataSource] = useState<{ [key: number]: IDataSource }>({});
  const [selectData, setSelectData] = useState({ textDirection: 'auto', targetLang: 'zh', });

  const showBrand = process.env.NEXT_PUBLIC_SHOW_BRAND === "true";

  const TextDirection: { value: string, label: string }[] = [
    { value: 'auto', label: t('home:textDirection.auto') },
    { value: 'row', label: t('home:textDirection.row') },
    { value: 'column', label: t('home:textDirection.column') },
  ]

  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight && !isLoading) {
      onGetData()
    }
  };

  const handleChooseImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownload = (src: string) => {
    if (!src) return;
    fetch(src)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = uuidV4();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        toast(t('home:image_download_error'))
      });
  };

  const onDelete = async (src: string) => {
    const id = Object.keys(dataSource).find(key => dataSource[+key].translateSrc === src || dataSource[+key].src === src);
    console.log(id);
    if (id) {
      setDataSource((prevDataSource) => {
        // Create a new object and exclude the target ID
        const { [+id]: _, ...newDataSource } = prevDataSource;
        return newDataSource;
      });
      await deleteData(+id);
      await onGetData()
    }
  }

  const onGetData = async () => {
    setIsLoading(true)
    const page = Object.keys(dataSource).length;
    const data = await getData(page);
    if (data) {
      let newData: { [key: number]: IDataSource } = {};
      Object.keys(data).forEach(async (id: string) => {
        const tempData = data[+id];
        if (!translateIds.current.includes(+id)) {
          // Delete the image that is not being translated
          if (tempData.status === 4) {
            await deleteData(+id);
            return;
          }
        }
        newData[+id] = { ...tempData }
      })
      setDataSource(newData)
      setRefreshData(v => !v)
    }
    setIsLoading(false);
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files;
    setDragDrop(false);
    if (file) {
      onGeneratePromptImageFunc(file);
    }
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      setDragDrop(true);
    }
  };

  const onDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragDrop(false);
  };

  const onSelectBox = (type: 'textDirection' | 'targetLang') => {
    // @ts-ignore
    const targetLangList = Object.keys(targetLang).map(key => ({ value: key, label: targetLang[key][`${locale}_name`] }))
    const data = type === 'textDirection' ? TextDirection : targetLangList;
    const onValueChange = (value: string) => {
      setSelectData((v) => ({ ...v, [type]: value }))
    }
    return (
      <Select value={selectData[type]} onValueChange={onValueChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {
            data.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))
          }
        </SelectContent>
      </Select>
    )
  }

  const onGeneratePromptImageFunc = async (files: FileList | File[] | null) => {
    if (!files || !files?.length) return;
    const uploadPromises = Array.from(files).map(async (file) => {
      setIsLoading(true)
      const params: IDataSource = { src: '', status: 4, message: t('home:image_upload'), createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss') }
      const saveData = await addData({ ...params });
      if (!saveData?.id) return;
      const id = saveData.id;
      let data = { [id]: saveData }
      translateIds.current.push(id)
      setDataSource((v) => ({ [id]: { ...data[id] }, ...v, }))
      setIsLoading(false)
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadUrl = env('NEXT_PUBLIC_UPLOAD_API_URL')!
        const imageResult: any = await ky(uploadUrl, {
          method: 'POST',
          body: formData,
          timeout: false,
        }).then(res => res.json());
        if (!imageResult?.data?.url) {
          toast(t('home:upload_error'));
          translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
          await deleteData(+id);
          await onGetData();
          return;
        }
        const imgUrl = imageResult.data.url;
        data = { [id]: { ...data[id], status: 3, src: imgUrl, message: t('home:lineUp_text') } } as any
        setTimeout(() => {
          setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
        }, 1000)
        await updateData(id || 0, { ...data[id] });
        if (id) {
          ky('/api/translateImage', {
            method: 'POST',
            timeout: false,
            body: JSON.stringify({ imgUrl, targetLang: selectData.targetLang }),
          }).then(res => res.json())
            .then(async (res: any) => {
              if (!res?.body || res?.error) {
                emitter.emit('ToastError', res?.error?.err_code || '')
                data = { [id]: { ...data[id], message: t('home:translationFailed'), status: -1 } } as any
                setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
                translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
                await updateData(id, { ...data[id] });
              } else {
                data = { [id]: { ...data[id], message: t('home:translateLoad'), status: 2 } } as any
                setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
                await updateData(id, { ...data[id] });
                await onTranslateResult(data[id], res?.body, id)
              }
            }).catch(async error => {
              data = { [id]: { ...data[id], message: t('home:translationFailed'), status: -1 } } as any
              setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
              translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
              await updateData(id, { ...data[id] });
            })
        }
      } catch (error) {
        toast(t('home:upload_error'));
        translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
        await deleteData(+id);
        await onGetData()
      }
    });

    await Promise.all(uploadPromises);
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  }

  const onTranslateResult = async (params: IDataSource, resultId: string, id: number) => {
    let data = { [id]: { ...params, requestId: resultId } };
    await updateData(id, { ...data[id] });
    try {
      const response = await ky('/api/translateResult', {
        method: 'POST',
        body: JSON.stringify({ id: resultId }),
        timeout: false,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result: any = await response.json();
      if (result?.error) {
        emitter.emit('ToastError', result?.error?.err_code || '')
      }

      if (result?.imgUrl) {
        data = { [id]: { ...data[id], message: '', translateSrc: result.imgUrl, status: 1 } }
        await updateData(id, { ...data[id] });
        setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
        translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
      } else {
        data = { [id]: { ...data[id], message: t('home:translationFailed'), translateSrc: '', status: -1 } }
        await updateData(id, { ...data[id] });
        setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
        translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
      }
    } catch (error) {
      data = { [id]: { ...data[id], message: t('home:translationFailed'), translateSrc: '', status: -1 } }
      await updateData(id, { ...data[id] });
      setDataSource((v) => ({ ...v, [id]: { ...data[id] } }))
      translateIds.current.splice(translateIds.current.findIndex(f => f === id), 1)
    }
  }

  const onPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('image/png')) {
          const blob = await item.getType('image/png');
          const file = new File([blob], 'pasted_image.png', { type: 'image/png' });
          await onGeneratePromptImageFunc([file])
        } else {
          toast(t('home:paste_tips'));
        }
      }
    } catch (err) {
      toast(t('home:clipboard_access_failed'));
    }
  }

  useEffect(() => {
    const handlePaste = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['v', 'V'].indexOf(event.key) > -1) {
        event.preventDefault();
        onPaste();
      }
    };
    window.addEventListener('keydown', handlePaste);
    return () => {
      window.removeEventListener('keydown', handlePaste);
    };
  }, [selectData.targetLang]);

  useEffect(() => {
    setIsLoading(true);
    onGetData();
  }, [])

  // Monitor scrolling events
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLoading]);

  useEffect(() => {
    Object.keys(dataSource).forEach(async (id: string) => {
      const tempData = dataSource[+id];
      if (!translateIds.current.includes(+id)) {
        if (![-1, -2, 1].includes(tempData.status) && tempData.requestId) {
          onTranslateResult(tempData, tempData.requestId, +id)
        }
      }
    })
  }, [refreshData])

  return (
    <div className='bg-[--background-ash] relative' onDragOver={onDragOver} >
      <div className={`absolute left-0 w-full h-[100vh] bg-[#ffffff8a]  backdrop-blur-sm z-50 ${dragDrop ? 'top-0' : '-top-[100vh]'}`} onDrop={onDrop} onDragLeave={onDragLeave}>
        <div className='w-[80%] h-[80%] relative mx-auto my-[5%] border-dashed border-2 border-black'>
          <MdOutlineDriveFolderUpload className={'text-8xl text-[#7e7e7e] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'} />
        </div>
      </div>
      <div className='my-0 mx-auto pt-10 pb-5 w-full p-3 md:max-w-[1300px]'>
        <div className='flex items-center w-full justify-center lg:mb-16 mb-5'>
          {
            showBrand &&
            <Image alt='ai-302-logo' src={logo_302} quality={100} height={65} width={65} draggable={false} />
          }
          <div className='text-2xl ml-5 font-bold'>{t('home:title')}</div>
        </div>
        <div className='flex justify-center items-end flex-wrap'>
          <div className='p-3'>
            <p className='text-xs mb-2 text-accent-foreground'>{t('home:targetLang.title')}</p>
            {onSelectBox('targetLang')}
          </div>
          <div className='p-3'>
            <Button className="w-[180px]" onClick={handleChooseImageClick} >
              <input type="file" multiple accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => onGeneratePromptImageFunc(e.target.files)} />
              {t('home:select_file')}
            </Button>
          </div>
          <div className='p-3'>
            <Button onClick={onPaste} className='bg-[--background] text-[#7c3aed] border border-[#7c3aed] font-bold hover:bg-[--background]' >
              {t('home:paste')}
            </Button>
          </div>
        </div>
        <p className='text-xs text-slate-600 text-center pb-5 pt-2'>{t('home:upload_notice')}</p>
        <div style={{ minHeight: 'calc(100vh - 365px)' }} className=' relative' >
          <div className={`absolute w-full h-full z-10 ${!Object.keys(dataSource).length ? '' : 'hidden'}`}>
            <Image draggable={false} alt='occupationMap' src={occupationMap} quality={100} height={250} width={250} className={'text-8xl text-[#7e7e7e] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'} />
          </div>
          <PhotoProvider maskOpacity={0.8} toolbarRender={({ images, index, onIndexChange, onClose }) => {
            return (
              <div className='flex items-center gap-3'>
                <MdDeleteOutline className='text-2xl opacity-75 cursor-pointer hover:opacity-100 transition-all' onClick={() => { onDelete(images[index]?.src || '') }} />
                <GoDownload className='text-2xl opacity-75 cursor-pointer hover:opacity-100 transition-all' onClick={() => { handleDownload(images[index]?.src || '') }} />
              </div>
            );
          }}>
            <Masonry columns={{ 640: 1, 768: 2, 1024: 3, 1280: 5 }} gap={10}>
              {Object.keys(dataSource).sort((a, b) => +b - +a).map(key => {
                if (dataSource[+key].status > 1) {
                  return (
                    <div key={key} className={`relative cursor-pointer group ${dataSource[+key].status !== 1 ? 'pointer-events-none' : ''}`}>
                      {
                        !(dataSource[+key].translateSrc || dataSource[+key].src) ?
                          <div className={`cursor-pointer rounded-sm w-full h-[230px]`}>
                            <MdOutlineDriveFolderUpload className='text-8xl text-[#7e7e7e] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' />
                          </div> :
                          <img src={dataSource[+key].translateSrc || dataSource[+key].src || ''} className={`cursor-pointer rounded-sm w-full`} />
                      }
                      <div className={`${dataSource[+key].status === 1 ? 'hidden' : 'flex'} absolute left-0 top-0 w-full h-full bg-[#56565685] items-center justify-center flex-col gap-3`}>
                        <SkFadingCircle />
                        <div className='text-[#fff]'>
                          {dataSource[+key]?.message || ''}
                        </div>
                      </div>
                    </div>
                  )
                }
                if (dataSource[+key].status < 1) {
                  return (
                    <PhotoView key={key} src={dataSource[+key].translateSrc || dataSource[+key].src}>
                      <div className={`relative cursor-pointer group`}>
                        <img src={dataSource[+key].translateSrc || dataSource[+key].src} className='cursor-pointer rounded-sm w-full' />
                        <div className={`${dataSource[+key].status === 1 ? 'hidden' : 'flex'} absolute left-0 top-0 w-full h-full bg-[#56565685] items-center justify-center flex-col gap-3`}>
                          <IoWarningSharp className='text-red-700 text-6xl' />
                          <div className='text-[#fff]'>
                            {dataSource[+key]?.message || ''}
                          </div>
                        </div>
                      </div>
                    </PhotoView>
                  )
                }
                return (
                  <PhotoView key={key} src={dataSource[+key].translateSrc || dataSource[+key].src}>
                    <div className={`relative cursor-pointer group`}>
                      <img src={dataSource[+key].translateSrc || dataSource[+key].src} className='cursor-pointer rounded-sm w-full' />
                    </div>
                  </PhotoView>
                )
              })}
            </Masonry>
          </PhotoProvider>
        </div>
      </div>
      {showBrand && <Footer className='pb-3' />}
    </div >
  )
}