'use client';

import { Eye, ThumbsUp, MessageSquare, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Video } from '@/types';
import { formatNumberWithCommas, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

interface VideoTableProps {
  videos: Video[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function VideoTable({
  videos,
  page,
  pageSize,
  total,
  onPageChange,
}: VideoTableProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <Card className="flex flex-col gap-4 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[#dfe3e8] px-6 py-4 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            Videos Catalogue
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {videos.length} of {total} total uploaded videos
          </p>
        </div>

        {/* Pagination controls top */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#dfe3e8] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#dfe3e8] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f3f4f6] text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
            <tr>
              <th className="py-3 px-6">Video</th>
              <th className="py-3 px-4">Views</th>
              <th className="py-3 px-4">Likes</th>
              <th className="py-3 px-4">Comments</th>
              <th className="py-3 px-6">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfe3e8] dark:divide-gray-700">
            {videos.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  No videos found for this channel.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr
                  key={video.video_id}
                  className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                >
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="h-10 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-16 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
                      )}
                      <div className="max-w-md">
                        <a
                          href={`https://youtube.com/watch?v=${video.video_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-1 font-medium text-[#111827] hover:text-blue-600 transition-colors dark:text-gray-200 dark:hover:text-blue-400"
                        >
                          {video.title}
                        </a>
                        <span className="text-xs text-gray-400">ID: {video.video_id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                    {formatNumberWithCommas(video.view_count)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                    {formatNumberWithCommas(video.like_count)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                    {formatNumberWithCommas(video.comment_count)}
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {video.published_at ? formatDate(video.published_at) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="flex items-center justify-between border-t border-[#dfe3e8] px-6 py-3.5 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-[#dfe3e8] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-[#dfe3e8] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}
