import ky from "ky";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { id } = await request.json();
  const fetchTranslation = async (id: number) => {
    try {
      const response = await ky(`${process.env.NEXT_PUBLIC_API_URL}/302/image/translate/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}` },
        body: JSON.stringify({ id }),
      });
      const res: any = await response.json();
      if (!res?.body?.result) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await fetchTranslation(id);
      } else {
        const result = JSON.parse(res.body.result);
        return { imgUrl: result.output_url, status: 200 }
      }
    } catch (error: any) {
      if (error.response) {
        try {
          const errorData = await error.response.json();
          return { ...errorData }
        } catch (parseError) {
          return { message: 'Failed to parse error response' }
        }
      } else {
        return { error: error.message || 'Unknown error' }
      }
    }
  };
  try {
    const result = await fetchTranslation(id);
    return NextResponse.json({ ...result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}
