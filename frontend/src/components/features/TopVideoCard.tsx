import { Play, ThumbsUp, MessageSquare, Eye } from 'lucide-react';
import type { Video } from '@/types';
import { formatNumberWithCommas, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface TopVideoCardProps {
  video: Video | null;
}

export function TopVideoCard({ video }: TopVideoCardProps) {
  if (!video) {
    return (
      <Card className="flex flex-col justify-center items-center py-12 text-center text-gray-400">
        <p className="text-sm">No top video data available</p>
      </Card>
    );
  }

  const youtubeUrl = `https://youtube.com/watch?v=${video.video_id}`;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            ★
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Top Performing Video
          </span>
        </div>
        {video.published_at && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(video.published_at)}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {video.thumbnail_url ? (
          <div className="relative aspect-video w-full sm:w-44 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full sm:w-44 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-gray-700">
            <Play className="h-8 w-8 text-white/80" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 text-base font-semibold text-[#111827] hover:text-blue-600 transition-colors dark:text-white dark:hover:text-blue-400"
            >
              {video.title}
            </a>
            {video.description && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {video.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-500" />
              <span>{formatNumberWithCommas(video.view_count)} views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
              <span>{formatNumberWithCommas(video.like_count)} likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-orange-500" />
              <span>{formatNumberWithCommas(video.comment_count)} comments</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
