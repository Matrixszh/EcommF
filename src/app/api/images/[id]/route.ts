import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ImageModel from '@/models/Image';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const image = await ImageModel.findById(resolvedParams.id);

    if (!image) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Return the image data with the correct content type
    return new NextResponse(image.data, {
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Image fetch error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
