import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Info, Pencil, Plus, Search, X } from 'lucide-react';
import { Binoculars } from '@phosphor-icons/react';
import { getDashboardLayout, getDashboardOverview, saveDashboardLayout } from './api/dashboard';
import { getCrawlerPlatforms } from './api/content';
import PlatformIcon from './PlatformIcon';
import './stripe-home.css';
import './stripe-template-modal.css';
import './stripe-insight-grid.css';

const homeEnglish = {
  '今日工作台': "Today's workspace",
  '从内容采集到多平台发布，实时查看生产效率和增长结果。': 'Track production efficiency and growth from collection to multi-platform publishing.',
  '查看数据概览': 'View data overview', '昨日': 'Yesterday', '昨天': 'Yesterday', '现在': 'Now', '更新': 'updated',
  '采集帖子': 'Collected posts', '改写完成': 'Rewritten', '发布成功': 'Published', '阅读量增长': 'Reading growth',
  '待改写': 'Pending rewrite', '待发布': 'Pending publishing', '查看': 'View', '篇': 'items', '个': '', '个任务': 'tasks', '小时': 'hours',
  '待处理事项': 'Action items', '隐藏待处理事项': 'Hide action items', '立即审核': 'Review now', '重新处理': 'Retry',
  '系统状态': 'System status', '查看账号': 'View accounts', '发布账号与自动化流程的实时状态。': 'Live status for publishing accounts and automation workflows.',
  '活跃发布账号': 'Active publishing accounts', '授权需要处理': 'Authorization needs attention', '查看全部运行记录': 'View all activity',
  '数据概览': 'Data overview', '日期范围': 'Date range', '对比': 'Compare', '添加': 'Add', '编辑': 'Edit', '完成': 'Done', '放置到这里': 'Drop here',
  '内容生产仪表盘': 'Content production dashboard', '拖拽调整卡片顺序': 'Drag to reorder cards', '移除对比': 'Remove comparison',
  '今天': 'Today', '近 7 天': 'Last 7 days', '近 4 周': 'Last 4 weeks', '本月至今': 'Month to date', '本季度至今': 'Quarter to date', '全部时间': 'All time',
  '每小时': 'Hourly', '每日': 'Daily', '上一周期': 'Previous period', '上周同期': 'Same period last week', '上月同期': 'Same period last month', '去年同期': 'Same period last year', '自定义': 'Custom',
  '选择日期': 'Select date', '上个月': 'Previous month', '下个月': 'Next month', '开始': 'Start', '结束': 'End', '清除': 'Clear', '应用': 'Apply', '取消': 'Cancel',
  '今天数据': "Today's data", '昨天数据': "Yesterday's data", '查看详情': 'View details', '更多细节': 'More details', '15 秒前更新': 'Updated 15 seconds ago',
  '内容生产漏斗': 'Content production funnel', '采集内容从改写到成功发布的转化情况': 'Conversion from collected content to successful publishing',
  '流程入口': 'Pipeline entry', '端到端发布率': 'end-to-end publishing rate', '查看流程详情': 'View pipeline details',
  '增长结果': 'Growth results', '内容发布后带来的阅读与粉丝增长': 'Reading and follower growth driven by published content',
  '按阅读表现排序的内容': 'Content ranked by reading performance', '探索': 'Explore', '移除': 'Remove',
  '本期': 'Current', '上期': 'Previous', '差值': 'Difference', '当前': 'Current', '累计': 'Total', '日均': 'Daily average', '较': 'vs. ', '转化': 'conversion',
  '添加平台模板': 'Add platform templates', '选择平台模板，将对应的核心指标加入数据概览。': 'Choose platform templates to add their core metrics to the overview.',
  '关闭': 'Close', '筛选平台': 'Filter platforms', '全部平台': 'All platforms', '已接入': 'Connected', '待接入': 'Coming soon', '推荐模板': 'Recommended templates', '模板': 'templates',
  '小红书': 'Xiaohongshu', '抖音': 'Douyin', '微博': 'Weibo',
};

const metricEnglishNames = {
  collected: 'Collected posts', rewritten: 'Rewritten', published: 'Published', reads: 'Reading growth', followers: 'New followers', top: 'Top-performing content', reposts: 'Repost growth',
  'success-rate': 'Publishing success rate', 'processing-time': 'Average processing time', failed: 'Failed publishing', review: 'Content awaiting review', accounts: 'Active publishing accounts',
  'x-impressions': 'X · Impressions', 'x-engagement': 'X · Engagement rate', 'x-reposts': 'X · Reposts', 'x-profile-visits': 'X · Profile visits', 'x-followers': 'X · New followers', 'x-link-clicks': 'X · Link clicks',
  'xhs-views': 'Xiaohongshu · Views', 'xhs-saves': 'Xiaohongshu · Saves', 'xhs-likes': 'Xiaohongshu · Likes', 'xhs-follows': 'Xiaohongshu · New followers', 'xhs-interactions': 'Xiaohongshu · Engagement rate', 'xhs-comments': 'Xiaohongshu · Comments',
  'reddit-views': 'Reddit · Views', 'reddit-upvotes': 'Reddit · Upvotes', 'reddit-comments': 'Reddit · Comments', 'reddit-karma': 'Reddit · Karma growth', 'reddit-engagement': 'Reddit · Engagement rate', 'reddit-posts': 'Reddit · Posts',
  'douyin-plays': 'Douyin · Plays', 'douyin-likes': 'Douyin · Likes', 'douyin-shares': 'Douyin · Shares', 'douyin-followers': 'Douyin · New followers', 'douyin-completion': 'Douyin · Completion rate', 'douyin-comments': 'Douyin · Comments',
  'weibo-reads': 'Weibo · Views', 'weibo-reposts': 'Weibo · Reposts', 'weibo-comments': 'Weibo · Comments', 'weibo-followers': 'Weibo · New followers', 'weibo-interactions': 'Weibo · Engagement rate', 'weibo-likes': 'Weibo · Likes',
  'yt-views': 'YouTube · Views', 'yt-watch-time': 'YouTube · Watch time', 'yt-retention': 'YouTube · Average retention', 'yt-subs': 'YouTube · New subscribers', 'yt-likes': 'YouTube · Likes', 'yt-comments': 'YouTube · Comments',
};

const templateEnglish = {
  'x-content': ['Content performance', 'Track impressions, engagement rate, and reposts.', ['Impressions', 'Engagement', 'Reposts']],
  'x-growth': ['Account growth', 'Track profile visits, follower growth, and link conversion.', ['Profile visits', 'Followers', 'Clicks']],
  'xhs-content': ['Post performance', 'Track views, saves, and likes.', ['Views', 'Saves', 'Likes']],
  'xhs-growth': ['Engagement growth', 'Track new followers, engagement, and comments.', ['Followers', 'Engagement', 'Comments']],
  'reddit-content': ['Post performance', 'Track views, upvotes, and comments.', ['Views', 'Upvotes', 'Comments']],
  'reddit-growth': ['Community growth', 'Track Karma, engagement, and posting trends.', ['Karma', 'Engagement', 'Posts']],
  'douyin-video': ['Video performance', 'Track plays, likes, and shares.', ['Plays', 'Likes', 'Shares']],
  'douyin-growth': ['Account growth', 'Track follower growth, completion rate, and comments.', ['Followers', 'Completion', 'Comments']],
  'weibo-content': ['Content performance', 'Track views, reposts, and comments.', ['Views', 'Reposts', 'Comments']],
  'weibo-growth': ['Account growth', 'Track follower growth, engagement, and likes.', ['Followers', 'Engagement', 'Likes']],
  'yt-video': ['Video performance', 'Track views, watch time, and average retention.', ['Views', 'Watch time', 'Retention']],
  'yt-growth': ['Channel growth', 'Track new subscribers, likes, and comments.', ['Subscribers', 'Likes', 'Comments']],
};

const translateHome = (language, value) => language === 'en' ? (homeEnglish[value] || value) : value;
const localizeMetric = (metric, language) => {
  if (language !== 'en') return metric;
  return {
    ...metric,
    name: metricEnglishNames[metric.id] || metric.name,
    detail: metric.detail ? `${metricEnglishNames[metric.id] || metric.name} for the selected period.` : metric.detail,
    unit: translateHome(language, metric.unit),
    period: translateHome(language, metric.period),
    value: metric.id === 'processing-time' ? '3m 42s' : metric.value,
    comparison: metric.id === 'processing-time' ? '-48s' : metric.comparison,
    items: metric.id === 'top' ? [
      { title: 'AI workflows are reshaping content production', meta: 'Xiaohongshu · 31,420 views' },
      { title: 'From content discovery to multi-platform publishing', meta: 'X · 18,760 views' },
      { title: 'How creators save 60% of their time', meta: 'Weibo · 12,680 views' },
    ] : metric.items,
  };
};

const localizeTemplate = (template, language) => {
  if (language !== 'en' || !templateEnglish[template.id]) return template;
  const [title, description, labels] = templateEnglish[template.id];
  return { ...template, title, description, preview: template.preview.map(([label, value], index) => [labels[index] || label, value]) };
};

const allMetrics = [
  { id: 'collected', name: '采集帖子', value: '128', unit: '篇', comparison: '+22', detail: '来自 12 个信息账号', trend: [72, 88, 81, 96, 104, 118, 128] },
  { id: 'rewritten', name: '改写完成', value: '92', unit: '篇', comparison: '+16', detail: '72% 的采集内容已完成改写', trend: [55, 63, 70, 66, 79, 84, 92] },
  { id: 'published', name: '发布成功', value: '61', unit: '篇', comparison: '+7', detail: '覆盖 8 个发布账号', inspect: true, trend: [31, 38, 44, 41, 50, 55, 61] },
  { id: 'reads', name: '阅读量增长', value: '+84,320', unit: '', comparison: '+18.6%', detail: '由本周期发布内容带来', trend: [42, 48, 51, 63, 67, 79, 84.32] },
  { id: 'followers', name: '新增粉丝', value: '+1,286', unit: '', comparison: '+12.4%', detail: '所有发布平台合计', trend: [540, 680, 790, 870, 1010, 1150, 1286] },
  {
    id: 'top',
    name: '表现最佳内容',
    period: '近 7 天',
    kind: 'ranking',
    items: [
      { title: 'AI 工作流正在重塑内容生产', meta: '小红书 · 31,420 阅读' },
      { title: '从素材发现到多平台发布', meta: 'X · 18,760 阅读' },
      { title: '创作者如何节省 60% 时间', meta: '微博 · 12,680 阅读' },
    ],
  },
  { id: 'reposts', name: '转发量增长', value: '+3,418', unit: '', comparison: '+21.8%', detail: '所有发布平台合计', trend: [920, 1160, 1480, 1730, 2210, 2780, 3418] },
  { id: 'success-rate', name: '发布成功率', value: '96.8%', unit: '', comparison: '+1.4%', detail: '61 个任务成功，2 个任务失败', trend: [91.2, 92.8, 93.4, 92.9, 95.1, 96.2, 96.8] },
  { id: 'processing-time', name: '平均处理时间', value: '3 分 42 秒', unit: '', comparison: '-48 秒', detail: '从采集到进入待发布队列', trend: [5.2, 4.8, 4.5, 4.7, 4.2, 4.0, 3.7] },
  { id: 'failed', name: '发布失败', value: '2', unit: '个任务', comparison: '-3', detail: '需要重新检查账号状态', trend: [6, 5, 4, 7, 3, 2, 2] },
  { id: 'review', name: '待审核内容', value: '3', unit: '篇', comparison: '-5', detail: '等待人工确认后发布', trend: [12, 9, 11, 8, 6, 4, 3] },
  { id: 'accounts', name: '活跃发布账号', value: '8', unit: '个', comparison: '+2', detail: '共关联 11 个发布账号', trend: [5, 5, 6, 6, 7, 8, 8] },
  { id: 'x-impressions', name: 'X · 曝光量', value: '126,840', unit: '', comparison: '+24.8%', detail: 'X 内容获得的总曝光次数', trend: [62, 71, 68, 84, 93, 108, 126.84] },
  { id: 'x-engagement', name: 'X · 互动率', value: '8.7%', unit: '', comparison: '+1.2%', detail: '点赞、回复、转发与点击的综合互动率', trend: [5.8, 6.4, 6.1, 7.2, 7.6, 8.1, 8.7] },
  { id: 'x-reposts', name: 'X · 转发量', value: '3,418', unit: '', comparison: '+21.8%', detail: 'X 帖子的转发与引用次数', trend: [920, 1160, 1480, 1730, 2210, 2780, 3418] },
  { id: 'x-profile-visits', name: 'X · 主页访问', value: '9,630', unit: '', comparison: '+18.1%', detail: '由本周期内容带来的主页访问', trend: [4200, 5100, 5700, 6500, 7100, 8500, 9630] },
  { id: 'x-followers', name: 'X · 新增粉丝', value: '+428', unit: '', comparison: '+15.4%', detail: 'X 账号新增关注人数', trend: [182, 224, 251, 296, 335, 379, 428] },
  { id: 'x-link-clicks', name: 'X · 链接点击', value: '2,184', unit: '', comparison: '+12.7%', detail: 'X 帖子中的链接点击次数', trend: [980, 1160, 1280, 1430, 1680, 1910, 2184] },
  { id: 'xhs-views', name: '小红书 · 阅读量', value: '84,320', unit: '', comparison: '+18.6%', detail: '小红书笔记获得的阅读次数', trend: [42, 48, 51, 63, 67, 79, 84.32] },
  { id: 'xhs-saves', name: '小红书 · 收藏量', value: '6,842', unit: '', comparison: '+23.4%', detail: '小红书笔记被收藏的次数', trend: [2180, 2840, 3360, 3920, 4710, 5680, 6842] },
  { id: 'xhs-likes', name: '小红书 · 点赞量', value: '12,760', unit: '', comparison: '+16.9%', detail: '小红书笔记获得的点赞数', trend: [5840, 6720, 7480, 8310, 9620, 10940, 12760] },
  { id: 'xhs-follows', name: '小红书 · 新增关注', value: '+618', unit: '', comparison: '+14.2%', detail: '由小红书内容带来的新增关注', trend: [230, 286, 344, 392, 468, 539, 618] },
  { id: 'xhs-interactions', name: '小红书 · 互动率', value: '11.4%', unit: '', comparison: '+2.1%', detail: '点赞、收藏和评论的综合互动率', trend: [7.2, 8.1, 8.7, 9.4, 9.8, 10.6, 11.4] },
  { id: 'xhs-comments', name: '小红书 · 评论量', value: '1,936', unit: '', comparison: '+19.5%', detail: '小红书笔记收到的评论数量', trend: [680, 820, 970, 1120, 1380, 1640, 1936] },
  { id: 'reddit-views', name: 'Reddit · 浏览量', value: '68,420', unit: '', comparison: '+17.2%', detail: 'Reddit 帖子获得的总浏览次数', trend: [28, 34, 39, 46, 52, 61, 68.42] },
  { id: 'reddit-upvotes', name: 'Reddit · 赞成票', value: '8,736', unit: '', comparison: '+13.8%', detail: 'Reddit 帖子获得的赞成票数量', trend: [3210, 3970, 4680, 5290, 6410, 7540, 8736] },
  { id: 'reddit-comments', name: 'Reddit · 评论量', value: '2,148', unit: '', comparison: '+11.6%', detail: 'Reddit 帖子收到的评论数量', trend: [820, 960, 1180, 1320, 1570, 1840, 2148] },
  { id: 'reddit-karma', name: 'Reddit · Karma 增长', value: '+1,284', unit: '', comparison: '+15.1%', detail: '由本周期内容带来的 Karma 增长', trend: [430, 560, 680, 790, 930, 1080, 1284] },
  { id: 'reddit-engagement', name: 'Reddit · 互动率', value: '9.6%', unit: '', comparison: '+1.4%', detail: '赞成票和评论形成的综合互动率', trend: [6.2, 6.8, 7.1, 7.9, 8.3, 8.9, 9.6] },
  { id: 'reddit-posts', name: 'Reddit · 发帖量', value: '42', unit: '篇', comparison: '+10.5%', detail: '本周期成功发布到 Reddit 的帖子数量', trend: [18, 22, 25, 29, 34, 38, 42] },
  { id: 'douyin-plays', name: '抖音 · 播放量', value: '326,800', unit: '', comparison: '+26.4%', detail: '抖音内容获得的总播放次数', trend: [112, 138, 166, 194, 228, 276, 326.8] },
  { id: 'douyin-likes', name: '抖音 · 点赞量', value: '28,640', unit: '', comparison: '+21.7%', detail: '抖音视频获得的点赞数量', trend: [9200, 11800, 14300, 16700, 20500, 24400, 28640] },
  { id: 'douyin-shares', name: '抖音 · 分享量', value: '5,286', unit: '', comparison: '+18.9%', detail: '抖音视频被分享的次数', trend: [1680, 2140, 2570, 3090, 3720, 4460, 5286] },
  { id: 'douyin-followers', name: '抖音 · 新增粉丝', value: '+2,438', unit: '', comparison: '+23.6%', detail: '由抖音内容带来的新增粉丝', trend: [720, 910, 1160, 1390, 1680, 2010, 2438] },
  { id: 'douyin-completion', name: '抖音 · 完播率', value: '41.8%', unit: '', comparison: '+3.2%', detail: '抖音视频的平均完整播放比例', trend: [32.1, 34.8, 35.6, 37.9, 38.4, 40.2, 41.8] },
  { id: 'douyin-comments', name: '抖音 · 评论量', value: '3,762', unit: '', comparison: '+16.5%', detail: '抖音视频收到的评论数量', trend: [1280, 1510, 1830, 2180, 2660, 3190, 3762] },
  { id: 'weibo-reads', name: '微博 · 阅读量', value: '218,600', unit: '', comparison: '+19.8%', detail: '微博内容获得的总阅读次数', trend: [82, 96, 114, 132, 157, 186, 218.6] },
  { id: 'weibo-reposts', name: '微博 · 转发量', value: '12,480', unit: '', comparison: '+22.1%', detail: '微博内容被转发的次数', trend: [3980, 4760, 5840, 6910, 8260, 10120, 12480] },
  { id: 'weibo-comments', name: '微博 · 评论量', value: '6,328', unit: '', comparison: '+14.7%', detail: '微博内容收到的评论数量', trend: [2210, 2640, 3190, 3720, 4490, 5360, 6328] },
  { id: 'weibo-followers', name: '微博 · 新增粉丝', value: '+1,568', unit: '', comparison: '+17.6%', detail: '由微博内容带来的新增粉丝', trend: [520, 630, 780, 920, 1110, 1320, 1568] },
  { id: 'weibo-interactions', name: '微博 · 互动率', value: '7.9%', unit: '', comparison: '+1.1%', detail: '转发、评论和点赞形成的综合互动率', trend: [5.1, 5.6, 6.0, 6.4, 6.9, 7.3, 7.9] },
  { id: 'weibo-likes', name: '微博 · 点赞量', value: '18,920', unit: '', comparison: '+20.3%', detail: '微博内容获得的点赞数量', trend: [6320, 7480, 8890, 10340, 12680, 15320, 18920] },
  { id: 'yt-views', name: 'YouTube · 观看次数', value: '52,680', unit: '', comparison: '+20.6%', detail: 'YouTube 视频获得的总观看次数', trend: [21, 26, 31, 34, 41, 47, 52.68] },
  { id: 'yt-watch-time', name: 'YouTube · 观看时长', value: '4,286', unit: '小时', comparison: '+17.3%', detail: '观众观看 YouTube 视频的累计时长', trend: [1680, 2010, 2420, 2760, 3230, 3710, 4286] },
  { id: 'yt-retention', name: 'YouTube · 平均留存', value: '47.8%', unit: '', comparison: '+3.6%', detail: 'YouTube 视频的平均观看留存率', trend: [39.2, 41.6, 40.8, 43.1, 44.7, 46.3, 47.8] },
  { id: 'yt-subs', name: 'YouTube · 新增订阅', value: '+386', unit: '', comparison: '+13.8%', detail: '由本周期视频带来的新增订阅', trend: [142, 178, 211, 248, 296, 341, 386] },
  { id: 'yt-likes', name: 'YouTube · 点赞量', value: '5,730', unit: '', comparison: '+18.9%', detail: 'YouTube 视频获得的点赞数', trend: [2180, 2640, 3090, 3570, 4210, 4960, 5730] },
  { id: 'yt-comments', name: 'YouTube · 评论量', value: '1,248', unit: '', comparison: '+15.1%', detail: 'YouTube 视频收到的评论数', trend: [460, 530, 650, 720, 890, 1080, 1248] },
];

const platformTemplates = [
  { id: 'x-content', platform: 'X', title: '内容表现', description: '追踪曝光、互动率和转发表现。', metrics: ['x-impressions', 'x-engagement', 'x-reposts'], preview: [['曝光量', '126.8K'], ['互动率', '8.7%'], ['转发', '3.4K']], trend: [46, 52, 49, 63, 68, 81, 88] },
  { id: 'x-growth', platform: 'X', title: '账号增长', description: '观察主页访问、涨粉和链接转化。', metrics: ['x-profile-visits', 'x-followers', 'x-link-clicks'], preview: [['主页访问', '9.6K'], ['涨粉', '+428'], ['点击', '2.1K']], trend: [34, 38, 45, 49, 61, 70, 76] },
  { id: 'xhs-content', platform: '小红书', title: '笔记表现', description: '查看阅读、收藏和点赞趋势。', metrics: ['xhs-views', 'xhs-saves', 'xhs-likes'], preview: [['阅读', '84.3K'], ['收藏', '6.8K'], ['点赞', '12.7K']], trend: [42, 51, 48, 62, 69, 78, 86] },
  { id: 'xhs-growth', platform: '小红书', title: '互动增长', description: '聚合新增关注、互动率和评论。', metrics: ['xhs-follows', 'xhs-interactions', 'xhs-comments'], preview: [['关注', '+618'], ['互动率', '11.4%'], ['评论', '1.9K']], trend: [37, 44, 56, 53, 67, 72, 82] },
  { id: 'reddit-content', platform: 'Reddit', title: '帖子表现', description: '追踪浏览、赞成票和评论表现。', metrics: ['reddit-views', 'reddit-upvotes', 'reddit-comments'], preview: [['浏览', '68.4K'], ['赞成票', '8.7K'], ['评论', '2.1K']], trend: [35, 43, 49, 58, 66, 75, 84] },
  { id: 'reddit-growth', platform: 'Reddit', title: '社区增长', description: '观察 Karma、互动率和发帖趋势。', metrics: ['reddit-karma', 'reddit-engagement', 'reddit-posts'], preview: [['Karma', '+1.2K'], ['互动率', '9.6%'], ['发帖', '42']], trend: [30, 38, 46, 52, 63, 71, 81] },
  { id: 'douyin-video', platform: '抖音', title: '视频表现', description: '监控播放、点赞和分享趋势。', metrics: ['douyin-plays', 'douyin-likes', 'douyin-shares'], preview: [['播放', '326.8K'], ['点赞', '28.6K'], ['分享', '5.2K']], trend: [32, 40, 49, 58, 66, 77, 89] },
  { id: 'douyin-growth', platform: '抖音', title: '账号增长', description: '查看涨粉、完播率和评论。', metrics: ['douyin-followers', 'douyin-completion', 'douyin-comments'], preview: [['涨粉', '+2.4K'], ['完播率', '41.8%'], ['评论', '3.7K']], trend: [28, 36, 43, 55, 61, 72, 84] },
  { id: 'weibo-content', platform: '微博', title: '内容表现', description: '追踪阅读、转发和评论表现。', metrics: ['weibo-reads', 'weibo-reposts', 'weibo-comments'], preview: [['阅读', '218.6K'], ['转发', '12.4K'], ['评论', '6.3K']], trend: [34, 42, 51, 59, 68, 79, 87] },
  { id: 'weibo-growth', platform: '微博', title: '账号增长', description: '观察涨粉、互动率和点赞趋势。', metrics: ['weibo-followers', 'weibo-interactions', 'weibo-likes'], preview: [['涨粉', '+1.5K'], ['互动率', '7.9%'], ['点赞', '18.9K']], trend: [29, 37, 45, 54, 62, 73, 83] },
  { id: 'yt-video', platform: 'YouTube', title: '视频表现', description: '监控观看次数、时长和平均留存。', metrics: ['yt-views', 'yt-watch-time', 'yt-retention'], preview: [['观看', '52.6K'], ['时长', '4.2K h'], ['留存', '47.8%']], trend: [31, 39, 46, 44, 58, 67, 79] },
  { id: 'yt-growth', platform: 'YouTube', title: '频道增长', description: '查看新增订阅、点赞和评论。', metrics: ['yt-subs', 'yt-likes', 'yt-comments'], preview: [['订阅', '+386'], ['点赞', '5.7K'], ['评论', '1.2K']], trend: [29, 36, 41, 52, 57, 69, 75] },
];

const platformMetricIds = new Set(platformTemplates.flatMap(template => template.metrics));

const defaultMetricIds = ['collected', 'rewritten', 'published', 'reads', 'followers', 'top'];
const pipelineMetricIds = ['collected', 'rewritten', 'published'];
const growthMetricIds = ['reads', 'followers'];
const dashboardLayoutStorageKey = 'flexiblefox-dashboard-layout-v1';

function dashboardKeysFor(visibleIds) {
  const keys = [];
  if (pipelineMetricIds.some(id => visibleIds.includes(id))) keys.push('pipeline');
  if (growthMetricIds.some(id => visibleIds.includes(id))) keys.push('growth');
  if (visibleIds.includes('top')) keys.push('ranking');
  platformTemplates.forEach(template => {
    if (template.metrics.some(id => visibleIds.includes(id))) keys.push(`platform:${template.id}`);
  });
  visibleIds.filter(id => !new Set([...pipelineMetricIds, ...growthMetricIds, 'top', ...platformMetricIds]).has(id)).forEach(id => keys.push(`metric:${id}`));
  return keys;
}

function reconcileDashboardOrder(order, visibleIds) {
  const active = dashboardKeysFor(visibleIds);
  return [...order.filter(key => active.includes(key)), ...active.filter(key => !order.includes(key))];
}

function loadDashboardLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(dashboardLayoutStorageKey));
    if (Array.isArray(saved?.visible) && Array.isArray(saved?.order)) {
      return { visible: saved.visible, order: reconcileDashboardOrder(saved.order, saved.visible) };
    }
  } catch { /* Fall back to the product defaults. */ }
  return { visible: defaultMetricIds, order: dashboardKeysFor(defaultMetricIds) };
}

const todayMetrics = {
  '采集帖子': { value: '128', previous: '104', unit: '篇', change: '+23.1%', current: [3, 5, 4, 7, 8, 10, 9, 14, 17, 16, 20, 15], previousTrend: [2, 4, 5, 6, 7, 7, 8, 11, 13, 12, 15, 14] },
  '改写完成': { value: '92', previous: '76', unit: '篇', change: '+21.1%', current: [2, 3, 4, 5, 6, 7, 8, 11, 12, 10, 13, 11], previousTrend: [2, 2, 3, 4, 5, 5, 7, 8, 9, 8, 10, 9] },
  '发布成功': { value: '61', previous: '54', unit: '篇', change: '+13.0%', current: [1, 2, 2, 4, 4, 5, 6, 7, 8, 7, 9, 6], previousTrend: [1, 1, 2, 3, 4, 4, 5, 6, 7, 6, 8, 7] },
  '阅读量增长': { value: '84,320', previous: '67,480', unit: '', change: '+25.0%', current: [2.1, 3.8, 4.5, 5.2, 6.4, 7.1, 8.9, 10.4, 9.8, 11.7, 8.6, 5.8], previousTrend: [1.8, 2.9, 3.7, 4.2, 5.1, 5.9, 7.1, 8.3, 7.9, 9.1, 6.8, 4.6] },
};

const menuOptions = {
  metric: Object.keys(todayMetrics),
  interval: ['每小时', '每日'],
  compare: ['上一周期', '上周同期', '上月同期', '去年同期', '自定义'],
};

const rangePresets = ['今天', '近 7 天', '近 4 周', '本月至今', '本季度至今', '全部时间'];
const trendTone = value => String(value || '').trim().startsWith('-') ? 'sh-trend-negative' : String(value || '').trim().startsWith('+') ? 'sh-trend-positive' : '';

function Menu({ type, value, onSelect, onClose, t }) {
  return <div className={`sh-menu sh-menu-${type}`} role="menu">
    {menuOptions[type].map(option => <button key={option} role="menuitemradio" aria-checked={option === value} onClick={() => { onSelect(option); onClose(); }}>
      <span>{option === value && <Check size={14}/>}</span>{t(option)}
    </button>)}
  </div>;
}

function Trigger({ label, value, compact, onClick, open, removable, onRemove, t }) {
  return <div className={`sh-trigger-wrap ${compact ? 'is-compact' : ''}`}>
    <button className="sh-trigger" aria-expanded={open} onClick={onClick}>
      {label && <span className="sh-trigger-label">{label}</span>}<span className="sh-trigger-value">{value}</span><ChevronDown size={12}/>
    </button>
    {removable && <button className="sh-trigger-remove" aria-label={t('移除对比')} onClick={onRemove}><X size={12}/></button>}
  </div>;
}

function CalendarMonth({ month, year, range = false, language = 'zh' }) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const normalizedMonth = ((month % 12) + 12) % 12;
  const shownYear = month < 0 ? year - 1 : month > 11 ? year + 1 : year;
  const selected = normalizedMonth === today.getMonth() ? today.getDate() : 2;
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  return <div className="sh-calendar-month">
    <div className="sh-calendar-title">{language === 'en' ? new Date(shownYear, normalizedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${shownYear} 年 ${normalizedMonth + 1} 月`}<ChevronDown size={12}/></div>
    <div className="sh-week">{(language === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['日', '一', '二', '三', '四', '五', '六']).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="sh-days">{cells.map((day, index) => day ? <button key={day} className={`${day === selected ? 'is-selected' : ''} ${range && normalizedMonth === today.getMonth() && day >= 2 && day <= selected ? 'is-in-range' : ''}`}>{day}</button> : <span key={`blank-${index}`}/>)}</div>
  </div>;
}

function SingleDatePicker({ t, language }) {
  const today = new Date();
  return <div className="sh-date-popover" role="dialog" aria-label={t('选择日期')}>
    <div className="sh-date-input"><span>{String(today.getMonth() + 1).padStart(2, '0')}</span> / {String(today.getDate()).padStart(2, '0')} / {today.getFullYear()}</div>
    <div className="sh-calendar-nav"><span/><span><button aria-label={t('上个月')}><ChevronLeft size={16}/></button><button aria-label={t('下个月')} disabled><ChevronRight size={16}/></button></span></div>
    <CalendarMonth month={today.getMonth()} year={today.getFullYear()} language={language}/>
  </div>;
}

function RangePicker({ range, onSelect, onClose, t, language }) {
  const today = new Date();
  return <div className="sh-range-popover" role="dialog" aria-label={t('日期范围')}>
    <div className="sh-range-presets">{rangePresets.map(preset => <button key={preset} className={preset === range ? 'is-selected' : ''} onClick={() => onSelect(preset)}>{t(preset)}</button>)}</div>
    <div className="sh-range-main">
      <div className="sh-range-fields"><label>{t('开始')} <span>{String(today.getMonth() + 1).padStart(2, '0')} / 02 / {today.getFullYear()}</span></label><label>{t('结束')} <span>{String(today.getMonth() + 1).padStart(2, '0')} / {String(today.getDate()).padStart(2, '0')} / {today.getFullYear()}</span></label></div>
      <div className="sh-double-calendar"><CalendarMonth month={today.getMonth() - 1} year={today.getFullYear()} language={language}/><CalendarMonth month={today.getMonth()} year={today.getFullYear()} range language={language}/></div>
      <footer><button onClick={onClose}>{t('清除')}</button><button className="is-primary" onClick={onClose}>{t('应用')}</button></footer>
    </div>
  </div>;
}

function TrendCanvas({ series, secondary = [], compact = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !series?.length) return undefined;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      const context = canvas.getContext('2d');
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);

      const allValues = [...series, ...secondary];
      const minimum = Math.min(...allValues);
      const maximum = Math.max(...allValues);
      const spread = Math.max(maximum - minimum, 1);
      const padding = compact ? { top: 18, right: 3, bottom: 8, left: 3 } : { top: 20, right: 5, bottom: 9, left: 5 };
      const plotWidth = bounds.width - padding.left - padding.right;
      const plotHeight = bounds.height - padding.top - padding.bottom;
      const point = (value, index, values) => ({
        x: padding.left + (index / Math.max(values.length - 1, 1)) * plotWidth,
        y: padding.top + (1 - (value - minimum) / spread) * plotHeight,
      });

      const paintLine = (values, color, dashed = false, fill = false) => {
        if (!values.length) return;
        context.beginPath();
        values.forEach((value, index) => {
          const position = point(value, index, values);
          if (index === 0) context.moveTo(position.x, position.y);
          else context.lineTo(position.x, position.y);
        });
        context.strokeStyle = color;
        context.lineWidth = compact ? 1.7 : 2;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.setLineDash(dashed ? [5, 4] : []);
        context.stroke();
        context.setLineDash([]);

        if (fill) {
          const last = point(values.at(-1), values.length - 1, values);
          const first = point(values[0], 0, values);
          context.lineTo(last.x, bounds.height - padding.bottom);
          context.lineTo(first.x, bounds.height - padding.bottom);
          context.closePath();
          const gradient = context.createLinearGradient(0, padding.top, 0, bounds.height);
          gradient.addColorStop(0, 'rgba(99, 91, 255, 0.18)');
          gradient.addColorStop(1, 'rgba(99, 91, 255, 0.01)');
          context.fillStyle = gradient;
          context.fill();
        }
      };

      if (secondary.length) paintLine(secondary, '#a7b4c6', true, false);
      paintLine(series, '#635bff', false, true);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [compact, secondary, series]);

  return <canvas ref={canvasRef} className={`sh-trend-canvas${compact ? ' is-compact' : ''}`} aria-hidden="true"/>;
}

function ChartTooltip({ x = 88, compact = false, metric = '采集帖子', cardMetric, pointIndex = 0, t }) {
  const topMetric = todayMetrics[metric] || todayMetrics['采集帖子'];
  const currentValue = cardMetric ? cardMetric.value : topMetric.current?.[pointIndex] ?? topMetric.value;
  const previousValue = cardMetric ? cardMetric.comparison : topMetric.previousTrend?.[pointIndex] ?? topMetric.previous;
  const unit = cardMetric?.unit || topMetric.unit;
  const hour = String(pointIndex * 2).padStart(2, '0');
  return <div className={`sh-chart-tooltip ${compact ? 'is-compact' : ''}`} style={{ left: `${x}%` }}>
    <div><strong>{cardMetric?.name || t(metric)}</strong><span>{cardMetric?.comparison || topMetric.change}</span></div>
    <p><i/>{t('今天')} {hour}:00 <b>{currentValue}{t(unit)}</b></p>
    <p><i className="is-muted"/>{t('昨日')} {hour}:00 <b>{previousValue}{t(unit)}</b></p>
  </div>;
}

function RankingCard({ items, preview = false }) {
  return <div className="sh-ranking-list">
    {items.map((item, index) => {
      const Item = preview ? 'div' : 'button';
      return <Item key={item.title} className="sh-ranking-item">
      <span className="sh-ranking-index">{index + 1}</span>
      <span><strong>{item.title}</strong><small>{item.meta}</small></span>
      <ChevronRight size={14}/>
      </Item>;
    })}
  </div>;
}

function MetricCard({ metric, editing, compare, start, end, onRemove, preview = false, selected, onToggle, dragProps = {}, t }) {
  const [hover, setHover] = useState(false);
  const content = <>
    <div className="sh-card-heading"><h3>{metric.name} <span className="sh-info" tabIndex="0"><Info size={12}/><span>{metric.detail || metric.name}</span></span></h3>
      {editing ? <button aria-label={`${t('移除')} ${metric.name}`} onClick={() => onRemove?.(metric.id)}><X size={15}/></button> : metric.period ? <span>{metric.period}</span> : metric.inspect && !preview ? <button className="sh-button sh-inspect" aria-label={`${t('查看')} ${metric.name}`}><Search size={12}/></button> : null}
    </div>
    {metric.kind === 'ranking' ? <RankingCard items={metric.items} preview={preview}/> : <>
      <strong className="sh-card-amount">{metric.value}{metric.unit && <small>{metric.unit}</small>}</strong>
      {compare && <p className={`sh-comparison ${trendTone(metric.comparison)}`}>{metric.comparison} {t('较')}{t(compare)}</p>}
      <div className="sh-card-chart" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}><TrendCanvas series={metric.trend}/><span className="sh-currency">{metric.value}</span>{hover && !preview && <ChartTooltip x={72} compact cardMetric={metric} t={t}/>}</div>
      <div className="sh-axis"><span>{start}</span><span>{end}</span></div>
      <div className="sh-card-footer"><span>{t('15 秒前更新')}</span><button>{t('查看详情')}</button></div>
    </>}
  </>;
  if (preview) return <button className={`sh-preview-card ${selected ? 'is-selected' : ''}`} onClick={() => onToggle(metric.id)}><span className="sh-selection">{selected ? <Check size={13}/> : <Plus size={13}/>}</span>{content}</button>;
  return <article className="sh-card" {...dragProps}>{content}</article>;
}

function PlatformMark({ platform }) {
  return <PlatformIcon platform={platform}/>;
}

const platformTone = platform => ({
  X: 'x', Reddit: 'reddit', 抖音: 'douyin', 小红书: 'xhs', 微博: 'weibo', YouTube: 'youtube',
}[platform] || 'default');

function ExploreButton({ label, onClick, t }) {
  return <button className="sh-explore-button" aria-label={`${t('探索')} ${label}`} title={`${t('探索')} ${label}`} onClick={onClick}><Binoculars size={16}/></button>;
}

function InsightFooter({ onDetails, t }) {
  return <div className="sh-insight-footer"><span>{t('15 秒前更新')}</span><button onClick={onDetails}>{t('更多细节')}</button></div>;
}

const numericMetricValue = metric => Number(String(metric.value).replace(/[^\d.-]/g, '')) || 0;

function formatMetricNumber(value, metric, signed = false) {
  if (String(metric.value).includes('%')) return `${value.toFixed(1)}%`;
  const rounded = Math.round(value);
  const prefix = signed && rounded > 0 ? '+' : '';
  return `${prefix}${rounded.toLocaleString('zh-CN')}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function buildDailySeries(metric) {
  const values = metric.trend.map(Number);
  const isRate = String(metric.value).includes('%');
  const comparison = Number.parseFloat(metric.comparison) || 0;
  const factor = 1 + comparison / 100;

  if (isRate) {
    const current = values;
    const previous = values.map((value, index) => Math.max(0, value / factor * (0.96 + (index % 3) * 0.025)));
    return { current, previous, total: current.at(-1), previousTotal: previous.at(-1), isRate };
  }

  const weights = values.map((value, index) => index === 0 ? Math.max(value * 0.16, 1) : Math.max(value - values[index - 1], 0.5));
  const metricTotal = numericMetricValue(metric);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const current = weights.map(value => value / weightTotal * metricTotal);
  const previousTotal = metricTotal / Math.max(factor, 0.1);
  const previousWeights = weights.map((value, index) => value * [0.92, 1.08, 0.88, 1.04, 0.93, 1.06, 0.96][index % 7]);
  const previousWeightTotal = previousWeights.reduce((sum, value) => sum + value, 0) || 1;
  const previous = previousWeights.map(value => value / previousWeightTotal * previousTotal);
  return { current, previous, total: metricTotal, previousTotal, isRate };
}

function DailyIncrementChart({ metric, t, language }) {
  const data = useMemo(() => buildDailySeries(metric), [metric]);
  const maximum = Math.max(...data.current, ...data.previous, 1);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }), []);
  const metricName = metric.name.split(' · ')[1] || metric.name;
  const chartLabel = language === 'en' ? (data.isRate ? `Daily ${metricName} change` : `Daily new ${metricName}`) : (data.isRate ? `${metricName}每日变化` : `每日新增${metricName}`);

  return <div className="sh-increment-chart">
    <div className="sh-increment-heading"><div><span>{chartLabel}</span><small><i/> {t('本期')} <i className="is-previous"/> {t('上期')}</small></div><div><span>{t(data.isRate ? '当前' : '累计')}</span><strong>{formatMetricNumber(data.total, metric, !data.isRate)}</strong></div></div>
    <div className="sh-increment-plot" role="img" aria-label={`${chartLabel}, ${t(data.isRate ? '当前' : '累计')} ${formatMetricNumber(data.total, metric)}`}>
      <div className="sh-increment-scale" aria-hidden="true"><span>{formatMetricNumber(maximum, metric)}</span><span>{formatMetricNumber(maximum / 2, metric)}</span><span>0</span></div>
      <div className="sh-increment-bars">
        {data.current.map((value, index) => {
          const previous = data.previous[index];
          const difference = value - previous;
          return <button className="sh-increment-day" key={dates[index]} aria-label={`${dates[index]}, ${t('本期')} ${formatMetricNumber(value, metric)}, ${t('上期')} ${formatMetricNumber(previous, metric)}, ${t('差值')} ${formatMetricNumber(difference, metric, true)}`}>
            <span className="sh-increment-bar-stack"><i className="is-previous" style={{ height: `${Math.max(4, previous / maximum * 100)}%` }}/><i className="is-current" style={{ height: `${Math.max(5, value / maximum * 100)}%` }}/></span>
            <small>{index === 0 || index === 3 || index === 6 ? dates[index] : ''}</small>
            <span className="sh-increment-tooltip"><b>{dates[index]}</b><span>{t('本期')} <strong>{formatMetricNumber(value, metric)}</strong></span><span>{t('上期')} <strong>{formatMetricNumber(previous, metric)}</strong></span><span>{t('差值')} <strong className={difference >= 0 ? 'is-positive' : 'is-negative'}>{formatMetricNumber(difference, metric, true)}</strong></span></span>
          </button>;
        })}
      </div>
    </div>
    <div className="sh-increment-summary"><span>{t('日均')} <b>{formatMetricNumber(data.total / 7, metric)}</b></span><span>{t('较')}{t(metric.comparison ? '上一周期' : '上期')} <b className={trendTone(metric.comparison)}>{metric.comparison}</b></span></div>
  </div>;
}

function GroupHeader({ title, note, editing, onRemove, action, t }) {
  return <div className="sh-group-heading"><div><h3>{title}<span className="sh-info" tabIndex="0"><Info size={13}/><span>{note}</span></span></h3>{note && <p>{note}</p>}</div><div className="sh-group-actions">{!editing && action}{editing && <button aria-label={`${t('移除')} ${title}`} onClick={onRemove}><X size={15}/></button>}</div></div>;
}

function PipelineSummary({ metrics, editing, onRemove, dragProps, t }) {
  const [collected, rewritten, published] = metrics;
  const stages = [collected, rewritten, published].filter(Boolean);
  const base = Number(collected?.value || 1);
  return <article className="sh-insight-card sh-pipeline-summary" {...dragProps}>
    <GroupHeader title={t('内容生产漏斗')} note={t('采集内容从改写到成功发布的转化情况')} editing={editing} onRemove={onRemove} t={t}/>
    <div className="sh-pipeline-stages">{stages.map((stage, index) => {
      const amount = Number(stage.value.replace(/[^\d.]/g, ''));
      const previous = index === 0 ? null : Number(stages[index - 1].value.replace(/[^\d.]/g, ''));
      const conversion = previous ? Math.round((amount / previous) * 100) : 100;
      return <div className="sh-pipeline-stage" key={stage.id}>
        <div className="sh-pipeline-label"><span>{stage.name}</span><small>{index === 0 ? t('流程入口') : `${conversion}% ${t('转化')}`}</small></div>
        <strong>{stage.value}<small>{stage.unit}</small></strong>
        <div className="sh-progress-track"><span style={{ width: `${Math.max(20, (amount / base) * 100)}%` }}/></div>
        {index < stages.length - 1 && <ChevronRight className="sh-pipeline-arrow" size={18}/>} 
      </div>;
    })}</div>
    <div className="sh-pipeline-footer"><span><b>47.7%</b> {t('端到端发布率')}</span><span><b className="sh-trend-positive">+8.4%</b> {t('较')}{t('上一周期')}</span><button>{t('查看流程详情')}</button></div>
  </article>;
}

function GrowthSummary({ metrics, compare, editing, onRemove, onExplore, dragProps, t }) {
  return <article className="sh-insight-card sh-growth-summary" {...dragProps}>
    <GroupHeader title={t('增长结果')} note={t('内容发布后带来的阅读与粉丝增长')} editing={editing} onRemove={onRemove} action={<ExploreButton label={t('增长结果')} onClick={onExplore} t={t}/>} t={t}/>
    <div className="sh-growth-metrics">{metrics.filter(Boolean).map((metric, index) => <div className="sh-growth-metric" key={metric.id}>
      <div><span>{metric.name}</span><strong className={trendTone(metric.comparison)}>{metric.value}</strong><small className={trendTone(metric.comparison)}>{metric.comparison} {t('较')}{t(compare)}</small></div>
      <div className={`sh-growth-spark is-${index + 1}`}><TrendCanvas series={metric.trend} compact/></div>
    </div>)}</div>
    <InsightFooter onDetails={onExplore} t={t}/>
  </article>;
}

function RankingSummary({ metric, editing, onRemove, wide, dragProps, t }) {
  return <article className={`sh-insight-card sh-ranking-summary ${wide ? 'is-wide' : ''}`} {...dragProps}>
    <GroupHeader title={metric.name} note={t('按阅读表现排序的内容')} editing={editing} onRemove={onRemove} t={t}/>
    <span className="sh-summary-period">{metric.period}</span>
    <div className="sh-summary-ranking">{metric.items.map((item, index) => <button key={item.title}>
      <span className="sh-ranking-index">{index + 1}</span><span><strong>{item.title}</strong><small>{item.meta}</small></span><ChevronRight size={14}/>
    </button>)}</div>
  </article>;
}

function PlatformSummary({ template, metrics, compare, editing, onRemove, featured, onExplore, dragProps, t, language }) {
  const [activeMetricId, setActiveMetricId] = useState(metrics[0]?.id);
  const activeMetric = metrics.find(metric => metric.id === activeMetricId) || metrics[0];
  useEffect(() => {
    if (!metrics.some(metric => metric.id === activeMetricId)) setActiveMetricId(metrics[0]?.id);
  }, [activeMetricId, metrics]);
  return <article className={`sh-insight-card sh-platform-summary is-${platformTone(template.platform)} ${featured ? 'is-featured' : ''}`} {...dragProps}>
    <div className="sh-platform-summary-heading"><span className={`sh-platform-mark is-${platformTone(template.platform)}`}><PlatformMark platform={template.platform}/></span><div><small>{t(template.platform)}</small><h3>{template.title}</h3></div><div className="sh-group-actions">{!editing && <ExploreButton label={`${t(template.platform)} ${template.title}`} onClick={onExplore} t={t}/>} {editing && <button aria-label={`${t('移除')} ${t(template.platform)} ${template.title}`} onClick={onRemove}><X size={15}/></button>}</div></div>
    <div className="sh-platform-summary-body"><div className="sh-platform-kpis" role="tablist" aria-label={`${t(template.platform)} ${template.title}`}>{metrics.map(metric => <button type="button" role="tab" aria-selected={activeMetric?.id === metric.id} className={activeMetric?.id === metric.id ? 'is-active' : ''} key={metric.id} onClick={() => setActiveMetricId(metric.id)}><span>{metric.name.split(' · ')[1] || metric.name}</span><strong className={trendTone(metric.comparison)}>{metric.value}<small>{metric.unit}</small></strong><small className={trendTone(metric.comparison)}>{metric.comparison} {t('较')}{t(compare)}</small></button>)}</div>
      {activeMetric && <DailyIncrementChart metric={activeMetric} t={t} language={language}/>}</div>
    <InsightFooter onDetails={onExplore} t={t}/>
  </article>;
}

function AddCharts({ selected, setSelected, capabilities, onClose, onApply, t, language }) {
  const [platform, setPlatform] = useState('全部平台');
  const backendPlatforms = capabilities.length ? capabilities.map(item => item.platform) : ['X', 'Reddit', '抖音', '小红书', '微博'];
  const platforms = ['全部平台', ...backendPlatforms];
  const supportedTemplates = platformTemplates.filter(template => backendPlatforms.includes(template.platform));
  const templates = platform === '全部平台' ? supportedTemplates : supportedTemplates.filter(template => template.platform === platform);
  const toggleTemplate = id => setSelected(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id]);

  return <div className="sh-modal-backdrop"><section className="sh-add-modal sh-template-modal" role="dialog" aria-modal="true" aria-label={t('添加平台模板')}>
    <header><div><h2>{t('添加平台模板')}</h2><p>{t('选择平台模板，将对应的核心指标加入数据概览。')}</p></div><button aria-label={t('关闭')} onClick={onClose}><X size={18}/></button></header>
    <div className="sh-template-tabs" role="tablist" aria-label={t('筛选平台')}>{platforms.map(item => {
      const capability = capabilities.find(entry => entry.platform === item);
      return <button key={item} role="tab" aria-selected={platform === item} className={platform === item ? 'is-active' : ''} onClick={() => setPlatform(item)}>{t(item)}{capability && <small className={capability.available ? 'is-ready' : ''}>{t(capability.available ? '已接入' : '待接入')}</small>}</button>;
    })}</div>
    <div className="sh-add-scroll"><h3>{platform === '全部平台' ? t('推荐模板') : `${t(platform)} ${t('模板')}`}</h3><div className="sh-add-grid">{templates.map(sourceTemplate => {
      const template = localizeTemplate(sourceTemplate, language);
      const isSelected = selected.includes(template.id);
      return <button key={template.id} className={`sh-template-card ${isSelected ? 'is-selected' : ''}`} aria-pressed={isSelected} onClick={() => toggleTemplate(template.id)}>
        <span className={`sh-platform-mark is-${platformTone(template.platform)}`}><PlatformMark platform={template.platform}/></span>
        <span className="sh-template-copy"><span className="sh-template-platform">{t(template.platform)}</span><strong>{template.title}</strong><small>{template.description}</small></span>
        <span className="sh-selection">{isSelected ? <Check size={13}/> : <Plus size={13}/>}</span>
        <span className="sh-template-preview">{template.preview.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</span>
        <span className="sh-template-chart"><TrendCanvas series={template.trend} compact/></span>
      </button>;
    })}</div></div>
    <footer><span className="sh-template-count">{language === 'en' ? `${selected.length} templates selected` : `已选择 ${selected.length} 个模板`}</span><button className="sh-button" onClick={onClose}>{t('取消')}</button><button className="sh-button is-primary" onClick={onApply}>{t('应用')}</button></footer>
  </section></div>;
}

export default function StripeHome({ onOpenGrowthDetails, onNavigate, language = 'zh' }) {
  const t = value => translateHome(language, value);
  const initialLayout = useMemo(() => loadDashboardLayout(), []);
  const [recommendations, setRecommendations] = useState(true);
  const [range, setRange] = useState('近 7 天');
  const [interval, setInterval] = useState('每日');
  const [compare, setCompare] = useState('上一周期');
  const [metric, setMetric] = useState('采集帖子');
  const [visible, setVisible] = useState(initialLayout.visible);
  const [layoutOrder, setLayoutOrder] = useState(initialLayout.order);
  const [editing, setEditing] = useState(false);
  const [draggedKey, setDraggedKey] = useState('');
  const [dragOverKey, setDragOverKey] = useState('');
  const [dropSlotKey, setDropSlotKey] = useState('');
  const [popup, setPopup] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [stagedTemplates, setStagedTemplates] = useState([]);
  const [liveMetrics, setLiveMetrics] = useState({});
  const [liveOperations, setLiveOperations] = useState(null);
  const [platformCapabilities, setPlatformCapabilities] = useState([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [chartHover, setChartHover] = useState(false);
  const [hoverX, setHoverX] = useState(10);
  const root = useRef(null);
  const now = new Date();
  const todayAxisLabels = [...[0, 4, 8, 12, 16, 20]
    .filter(hour => hour < now.getHours())
    .map(hour => `${String(hour).padStart(2, '0')}:00`), t('现在')];
  const liveTodayMetrics = useMemo(() => {
    const mappings = { '采集帖子': 'collected', '改写完成': 'rewritten', '发布成功': 'published' };
    return Object.fromEntries(Object.entries(todayMetrics).map(([name, item]) => {
      const live = liveMetrics[mappings[name]];
      return [name, live ? { ...item, value: live.value, previous: live.previous, change: live.comparison, current: live.trend } : item];
    }));
  }, [liveMetrics]);
  const selectedTodayMetric = liveTodayMetrics[metric];
  const hoverIndex = Math.min(selectedTodayMetric.current.length - 1, Math.max(0, Math.round((hoverX / 100) * (selectedTodayMetric.current.length - 1))));
  const start = useMemo(() => {
    const date = new Date();
    const days = range === '今天' ? 0 : range === '近 4 周' ? 27 : 6;
    date.setDate(date.getDate() - days);
    return date;
  }, [range]);
  const format = date => date.toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric' });

  useEffect(() => {
    const key = event => { if (event.key === 'Escape') { setPopup(''); setAddOpen(false); } };
    const outside = event => { if (!event.target.closest('[data-home-popup]')) setPopup(''); };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getDashboardOverview(), getDashboardLayout(), getCrawlerPlatforms()]).then(([overviewResult, layoutResult, platformResult]) => {
      if (!active) return;
      if (overviewResult.status === 'fulfilled') {
        setLiveMetrics(overviewResult.value.metrics || {});
        setLiveOperations(overviewResult.value.operations || null);
      }
      if (layoutResult.status === 'fulfilled') {
        const saved = layoutResult.value;
        if (Array.isArray(saved?.visible) && Array.isArray(saved?.order)) {
          setVisible(saved.visible);
          setLayoutOrder(reconcileDashboardOrder(saved.order, saved.visible));
        }
      }
      if (platformResult.status === 'fulfilled' && Array.isArray(platformResult.value)) setPlatformCapabilities(platformResult.value);
      setLayoutReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editing && layoutReady) {
      const layout = { visible, order: reconcileDashboardOrder(layoutOrder, visible) };
      localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify(layout));
      saveDashboardLayout(layout).catch(() => {});
    }
  }, [editing, layoutOrder, layoutReady, visible]);

  const toggle = name => setPopup(value => value === name ? '' : name);
  const openAdd = () => {
    setStagedTemplates(platformTemplates.filter(template => template.metrics.some(id => visible.includes(id))).map(template => template.id));
    setAddOpen(true);
    setPopup('');
  };
  const applyTemplates = () => {
    const baseMetrics = visible.filter(id => !platformMetricIds.has(id));
    const selectedMetrics = platformTemplates.filter(template => stagedTemplates.includes(template.id)).flatMap(template => template.metrics);
    const nextVisible = [...baseMetrics, ...new Set(selectedMetrics)];
    setVisible(nextVisible);
    setLayoutOrder(order => reconcileDashboardOrder(order, nextVisible));
    setAddOpen(false);
  };
  const openWorkspacePage = page => {
    if (typeof onNavigate === 'function') onNavigate(page);
  };
  const metricCatalog = allMetrics.map(metricItem => localizeMetric(liveMetrics[metricItem.id] ? { ...metricItem, ...liveMetrics[metricItem.id] } : metricItem, language));
  const findMetric = id => metricCatalog.find(metricItem => metricItem.id === id);
  const pipelineMetrics = pipelineMetricIds.filter(id => visible.includes(id)).map(findMetric).filter(Boolean);
  const growthMetrics = growthMetricIds.filter(id => visible.includes(id)).map(findMetric).filter(Boolean);
  const rankingMetric = visible.includes('top') ? findMetric('top') : null;
  const selectedPlatformTemplates = platformTemplates.filter(template => template.metrics.some(id => visible.includes(id)));
  const groupedIds = new Set([...pipelineMetricIds, ...growthMetricIds, 'top', ...platformMetricIds]);
  const remainingMetrics = visible.filter(id => !groupedIds.has(id)).map(findMetric).filter(Boolean);
  const renderOrder = reconcileDashboardOrder(layoutOrder, visible);
  const removeMetrics = ids => setVisible(values => {
    const nextVisible = values.filter(value => !ids.includes(value));
    setLayoutOrder(order => reconcileDashboardOrder(order, nextVisible));
    return nextVisible;
  });
  const toggleEditing = () => {
    setEditing(value => !value);
    setDraggedKey('');
    setDragOverKey('');
    setDropSlotKey('');
  };
  const moveCard = (sourceKey, targetKey) => {
    if (!sourceKey || sourceKey === targetKey) return;
    setLayoutOrder(order => {
      const next = reconcileDashboardOrder(order, visible);
      const sourceIndex = next.indexOf(sourceKey);
      const targetIndex = targetKey ? next.indexOf(targetKey) : next.length;
      if (sourceIndex < 0 || targetIndex < 0) return next;
      const [moved] = next.splice(sourceIndex, 1);
      const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(insertionIndex, 0, moved);
      return next;
    });
  };
  const gridDropTarget = event => {
    const cards = [...event.currentTarget.querySelectorAll(':scope > [data-edit-key]')]
      .filter(card => card.dataset.editKey !== draggedKey)
      .map(card => ({ card, rect: card.getBoundingClientRect() }))
      .sort((a, b) => Math.abs(a.rect.top - b.rect.top) > 8 ? a.rect.top - b.rect.top : a.rect.left - b.rect.left);
    const rows = [];
    cards.forEach(item => {
      const row = rows.find(candidate => Math.abs(candidate.top - item.rect.top) <= 8);
      if (row) row.items.push(item);
      else rows.push({ top: item.rect.top, bottom: item.rect.bottom, items: [item] });
    });
    const rowIndex = rows.findIndex(row => event.clientY <= row.bottom);
    if (rowIndex < 0) return '';
    const row = rows[rowIndex];
    const item = row.items.find(candidate => event.clientX < candidate.rect.left + candidate.rect.width / 2);
    if (item) return item.card.dataset.editKey;
    return rows[rowIndex + 1]?.items[0]?.card.dataset.editKey || '';
  };
  const handleGridDragOver = event => {
    if (!editing || event.target.closest('[data-edit-key]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const targetKey = gridDropTarget(event);
    setDragOverKey('');
    setDropSlotKey(targetKey || '__end');
  };
  const handleGridDrop = event => {
    if (!editing || event.target.closest('[data-edit-key]')) return;
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData('text/plain') || draggedKey;
    moveCard(sourceKey, dropSlotKey === '__end' ? '' : dropSlotKey);
    setDragOverKey('');
    setDropSlotKey('');
  };
  const dragProps = key => editing ? {
    draggable: true,
    title: t('拖拽调整卡片顺序'),
    'aria-grabbed': draggedKey === key,
    'data-edit-key': key,
    'data-dragging': draggedKey === key ? 'true' : undefined,
    'data-drag-over': dragOverKey === key ? 'true' : undefined,
    onDragStart: event => {
      setDraggedKey(key);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', key);
    },
    onDragEnter: event => {
      event.preventDefault();
      if (key !== draggedKey) {
        setDropSlotKey('');
        setDragOverKey(key);
      }
    },
    onDragOver: event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; },
    onDrop: event => {
      event.preventDefault();
      moveCard(event.dataTransfer.getData('text/plain') || draggedKey, key);
      setDragOverKey('');
      setDropSlotKey('');
    },
    onDragEnd: () => { setDraggedKey(''); setDragOverKey(''); setDropSlotKey(''); },
  } : {};
  const renderDashboardCard = key => {
    if (key === 'pipeline' && pipelineMetrics.length) return <PipelineSummary key={key} metrics={pipelineMetrics} editing={editing} onRemove={() => removeMetrics(pipelineMetricIds)} dragProps={dragProps(key)} t={t}/>;
    if (key === 'growth' && growthMetrics.length) return <GrowthSummary key={key} metrics={growthMetrics} compare={compare} editing={editing} onRemove={() => removeMetrics(growthMetricIds)} onExplore={() => onOpenGrowthDetails?.('overall')} dragProps={dragProps(key)} t={t}/>;
    if (key === 'ranking' && rankingMetric) return <RankingSummary key={key} metric={rankingMetric} editing={editing} onRemove={() => removeMetrics(['top'])} wide={selectedPlatformTemplates.length === 0} dragProps={dragProps(key)} t={t}/>;
    if (key.startsWith('platform:')) {
      const template = platformTemplates.find(item => item.id === key.slice('platform:'.length));
      if (!template || !selectedPlatformTemplates.some(item => item.id === template.id)) return null;
      const templateMetrics = template.metrics.filter(id => visible.includes(id)).map(findMetric).filter(Boolean);
      return <PlatformSummary key={key} template={localizeTemplate(template, language)} metrics={templateMetrics} compare={compare} editing={editing} featured={selectedPlatformTemplates.length === 1} onRemove={() => removeMetrics(template.metrics)} onExplore={() => onOpenGrowthDetails?.(template.id)} dragProps={dragProps(key)} t={t} language={language}/>;
    }
    if (key.startsWith('metric:')) {
      const metricItem = remainingMetrics.find(item => item.id === key.slice('metric:'.length));
      if (!metricItem) return null;
      return <MetricCard key={key} metric={metricItem} editing={editing} compare={compare} start={format(start)} end={format(now)} onRemove={id => removeMetrics([id])} dragProps={dragProps(key)} t={t}/>;
    }
    return null;
  };

  return <section ref={root} className={`stripe-home ${editing ? 'is-editing' : ''}`} aria-label={t('内容生产仪表盘')}>
    <div className="sh-top-content">
      <div className="sh-title"><div><h1>{t('今日工作台')}</h1><p className="sh-title-subtitle">{t('从内容采集到多平台发布，实时查看生产效率和增长结果。')}</p></div><button className="sh-button" onClick={() => document.querySelector('.sh-overview')?.scrollIntoView({ behavior: 'smooth' })}>{t('查看数据概览')}</button></div>
      <div className={`sh-today ${recommendations ? '' : 'sh-without-recommendations'}`}>
        <div className="sh-today-main">
          <div className="sh-today-stats">
            <div className="sh-relative" data-home-popup><Trigger value={t(metric)} open={popup === 'metric'} onClick={() => toggle('metric')} t={t}/>{popup === 'metric' && <Menu type="metric" value={metric} onSelect={setMetric} onClose={() => setPopup('')} t={t}/>}<div className="sh-amount">{selectedTodayMetric.value}{selectedTodayMetric.unit && <small>{t(selectedTodayMetric.unit)}</small>}</div><small>{now.toLocaleTimeString(language === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })} {t('更新')}</small></div>
            <div className="sh-relative" data-home-popup><Trigger value={t('昨日')} open={popup === 'date'} onClick={() => toggle('date')} t={t}/>{popup === 'date' && <SingleDatePicker t={t} language={language}/>}<div className="sh-previous">{selectedTodayMetric.previous}{t(selectedTodayMetric.unit)}</div><small className={trendTone(selectedTodayMetric.change)}>{selectedTodayMetric.change}</small></div>
          </div>
          <div className="sh-today-chart" onMouseEnter={() => setChartHover(true)} onMouseLeave={() => setChartHover(false)} onMouseMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); setHoverX(Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100))); }}>
            <TrendCanvas series={selectedTodayMetric.current} secondary={selectedTodayMetric.previousTrend}/>
            {chartHover && <><div className="sh-hover-line" style={{ left: `${hoverX}%` }}/><ChartTooltip x={Math.min(76, Math.max(12, hoverX))} metric={metric} pointIndex={hoverIndex} t={t}/></>}
            <div className="sh-axis">{todayAxisLabels.map(label => <span key={label}>{label}</span>)}</div>
          </div>
          <div className="sh-balances"><div><div><span>{t('待改写')}</span><button onClick={() => openWorkspacePage('content-list')}>{t('查看')}</button></div><strong>{liveOperations?.pendingRewrite ?? 36} {t('篇')}</strong></div><div><div><span>{t('待发布')}</span><button onClick={() => openWorkspacePage('content-drafts')}>{t('查看')}</button></div><strong>{liveOperations?.pendingPublish ?? 12} {t('篇')}</strong></div></div>
        </div>
        {recommendations && <aside className="sh-recommendations"><div className="sh-recommendation-heading"><h2>{t('待处理事项')}</h2><button aria-label={t('隐藏待处理事项')} onClick={() => setRecommendations(false)}><X size={16}/></button></div>
          <div className="sh-task"><p><strong>{language === 'en' ? `${liveOperations?.pendingReview ?? 3} items awaiting review` : `${liveOperations?.pendingReview ?? 3} 条内容等待审核`}</strong><br/>{language === 'en' ? 'Confirm the content and publishing account to add it to the queue.' : '确认内容和发布账号后即可进入队列。'}</p><button className="sh-link" onClick={() => openWorkspacePage('content-drafts')}>{t('立即审核')}</button></div>
          <div className="sh-task"><p><strong>{language === 'en' ? `${liveOperations?.failed ?? 2} publishing tasks failed` : `${liveOperations?.failed ?? 2} 个发布任务失败`}</strong><br/>{language === 'en' ? 'The account login is invalid and needs attention.' : '账号登录状态异常，需要重新处理。'}</p><button className="sh-link" onClick={() => openWorkspacePage('account-publishing')}>{t('重新处理')}</button></div>
          <div className="sh-api"><div className="sh-api-heading"><h2>{t('系统状态')}</h2><button className="sh-link" onClick={() => openWorkspacePage('account-publishing')}>{t('查看账号')}</button></div><p>{t('发布账号与自动化流程的实时状态。')}</p><div className="sh-key"><span>{t('活跃发布账号')}</span><code>{liveOperations?.activePublishingAccounts ?? 8}</code></div><div className="sh-key"><span>{t('授权需要处理')}</span><code className="is-warning">{liveOperations?.authorizationAttention ?? 1}</code></div><button className="sh-link" onClick={() => openWorkspacePage('content-jobs')}>{t('查看全部运行记录')}</button></div>
        </aside>}
      </div>
    </div>
    <section className="sh-overview" aria-label={t('数据概览')}><h2>{t('数据概览')}</h2><div className="sh-overview-toolbar"><div className="sh-filters">
      <div className="sh-relative" data-home-popup><Trigger compact label={t('日期范围')} value={t(range)} open={popup === 'range'} onClick={() => toggle('range')} t={t}/>{popup === 'range' && <RangePicker range={range} onSelect={setRange} onClose={() => setPopup('')} t={t} language={language}/>}</div>
      <div className="sh-relative" data-home-popup><Trigger compact value={t(interval)} open={popup === 'interval'} onClick={() => toggle('interval')} t={t}/>{popup === 'interval' && <Menu type="interval" value={interval} onSelect={setInterval} onClose={() => setPopup('')} t={t}/>}</div>
      {compare && <div className="sh-relative" data-home-popup><Trigger compact label={t('对比')} value={t(compare)} open={popup === 'compare'} onClick={() => toggle('compare')} removable onRemove={() => setCompare('')} t={t}/>{popup === 'compare' && <Menu type="compare" value={compare} onSelect={setCompare} onClose={() => setPopup('')} t={t}/>}</div>}
    </div><div className="sh-edit-buttons"><button className="sh-button" onClick={openAdd}><Plus size={14}/>{t('添加')}</button><button className={`sh-button ${editing ? 'is-primary' : ''}`} aria-pressed={editing} onClick={toggleEditing}>{!editing && <Pencil size={13}/>} {t(editing ? '完成' : '编辑')}</button></div></div>
      <div className="sh-insight-grid" onDragOver={handleGridDragOver} onDrop={handleGridDrop}>
        {renderOrder.flatMap(key => [
          dropSlotKey === key && <div key={`drop-slot-${key}`} className={`sh-drop-slot ${draggedKey === 'pipeline' || (draggedKey.startsWith('platform:') && selectedPlatformTemplates.length === 1) ? 'is-span-2' : draggedKey === 'ranking' && selectedPlatformTemplates.length === 0 ? 'is-span-3' : ''}`} aria-hidden="true"><span>{t('放置到这里')}</span></div>,
          renderDashboardCard(key),
        ])}
        {dropSlotKey === '__end' && <div className="sh-drop-slot" aria-hidden="true"><span>{t('放置到这里')}</span></div>}
      </div>
    </section>
    {addOpen && <AddCharts selected={stagedTemplates} setSelected={setStagedTemplates} capabilities={platformCapabilities} onClose={() => setAddOpen(false)} onApply={applyTemplates} t={t} language={language}/>} 
  </section>;
}
