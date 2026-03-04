import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ImageModel from '@/models/Image';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const image = await ImageModel.create({
      data: buffer,
      contentType: file.type,
      name: file.name
    });

    // Return the URL that can be used to view this image
    // Assuming the app is hosted at root or we can use relative paths
    const imageUrl = `/api/images/${image._id}`;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
