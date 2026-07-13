import { NextResponse } from 'next/server';
import { processScheduledEmails, processExpiredEmails } from '../../../lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET 환경변수가 구성되어 있는 경우에만 키 일치 여부를 검사합니다.
  if (cronSecret && key !== cronSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const sentCount = await processScheduledEmails();
    const expiredCount = await processExpiredEmails();
    return NextResponse.json({
      success: true,
      message: `Processed scheduled emails.`,
      sentCount,
      expiredCount,
    });
  } catch (error: any) {
    console.error('Error during scheduled emails processing:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
