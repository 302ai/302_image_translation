import ky from "ky";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const {  imgUrl, targetLang } = await request.json();
    try {
        const result: any = await ky(`${process.env.NEXT_PUBLIC_API_URL}/302/image/translate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}` },
            body: JSON.stringify({
                srcLang: 'auto', //  自动识别源语言  Automatic recognition of source language
                synthesisOn: 1, // 是否开启图片合成  Do you want to enable image synthesis
                translateOn: 1, // 是否开启翻译      Do you want to enable translation
                downloadInfo: JSON.stringify({ url: imgUrl }),
                tgtLang: targetLang
            }),
        }).then(res => res.json())
        return NextResponse.json({ ...result }, { status: 200 });
    } catch (error: any) {
        if (error.response) {
            // 尝试从响应中解析错误信息
            try {
                const errorData = await error.response.json();
                return NextResponse.json({ ...errorData }, { status: 200 });
            } catch (parseError) {
                console.log('Error parsing JSON from response:', parseError);
                return NextResponse.json({ message: 'Failed to parse error response' }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 400 });
        }
    }
}



