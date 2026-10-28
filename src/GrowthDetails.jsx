import { useState } from 'react';
import { CalendarDays, ChevronDown, Download, FileText, Info, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import './growth-details.css';

const platforms = [
  { name: '小红书', account: 'FlexibleFox 创作号', reach: '84,320', followers: '+618', engagement: '11.4%', change: '+18.6%' },
  { name: 'X', account: '@FlexibleFox', reach: '126,840', followers: '+428', engagement: '8.7%', change: '+24.8%' },
  { name: 'YouTube', account: 'FlexibleFox Studio', reach: '52,680', followers: '+386', engagement: '9.8%', change: '+20.6%' },
  { name: '微博', account: 'FlexibleFox 灵狐', reach: '38,240', followers: '+216', engagement: '7.2%', change: '+13.4%' },
];

const contributions = [
  { title: 'AI 工作流正在重塑内容生产', platform: '小红书', published: '今天 09:42', reach: '31,420', followers: '+186', share: '37.3%' },
  { title: '从素材发现到多平台发布', platform: 'X', published: '昨天 18:20', reach: '18,760', followers: '+92', share: '22.2%' },
  { title: '创作者如何节省 60% 时间', platform: '微博', published: '10 月 24 日', reach: '12,680', followers: '+54', share: '15.0%' },
  { title: '30 秒完成一条多平台内容', platform: 'YouTube', published: '10 月 23 日', reach: '9,840', followers: '+48', share: '11.7%' },
];

const changes = [
  { title: '小红书阅读量明显上升', meta: '较日均值高 42%，主要由《AI 工作流正在重塑内容生产》带动。', time: '今天 10:15', tone: 'positive' },
  { title: 'X 互动率短时回落', meta: '过去 6 小时下降 1.3%，建议检查近期内容的发布时间和链接点击表现。', time: '今天 08:40', tone: 'warning' },
];

const detailProfiles = {
  overall: { title: '增长结果', platform: '全部平台', kpis: [['阅读量增长', '+84,320', '+18.6%'], ['新增粉丝', '+1,286', '+12.4%'], ['平均互动率', '9.8%', '+1.7%'], ['产生增长的内容', '23 篇', '+4 篇']] },
  'x-growth': { title: 'X · 账号增长', platform: 'X', kpis: [['主页访问', '9,630', '+18.1%'], ['新增粉丝', '+428', '+15.4%'], ['链接点击', '2,184', '+12.7%']] },
  'x-content': { title: 'X · 内容表现', platform: 'X', kpis: [['曝光量', '126,840', '+24.8%'], ['互动率', '8.7%', '+1.2%'], ['转发量', '3,418', '+21.8%']] },
  'xhs-content': { title: '小红书 · 笔记表现', platform: '小红书', kpis: [['阅读量', '84,320', '+18.6%'], ['收藏量', '6,842', '+23.4%'], ['点赞量', '12,760', '+16.9%']] },
  'xhs-growth': { title: '小红书 · 互动增长', platform: '小红书', kpis: [['新增关注', '+618', '+14.2%'], ['互动率', '11.4%', '+2.1%'], ['评论量', '1,936', '+19.5%']] },
  'yt-video': { title: 'YouTube · 视频表现', platform: 'YouTube', kpis: [['观看次数', '52,680', '+20.6%'], ['观看时长', '4,286 小时', '+17.3%'], ['平均留存', '47.8%', '+3.6%']] },
  'yt-growth': { title: 'YouTube · 频道增长', platform: 'YouTube', kpis: [['新增订阅', '+386', '+13.8%'], ['点赞量', '5,730', '+18.9%'], ['评论量', '1,248', '+15.1%']] },
};

export default function GrowthDetails({ scope = 'overall' }) {
  const detail = detailProfiles[scope] || detailProfiles.overall;
  const [tab, setTab] = useState('内容贡献');
  const [range, setRange] = useState('近 7 天');
  const [platform, setPlatform] = useState(detail.platform);
  const [notice, setNotice] = useState(true);
  const visiblePlatforms = platform === '全部平台' ? platforms : platforms.filter(item => item.name === platform);
  const visibleContributions = detail.platform === '全部平台' ? contributions : contributions.filter(item => item.platform === detail.platform);

  return <section className="gd-page" aria-labelledby="gd-title">
    <header className="gd-page-header">
      <div className="gd-title-line"><h1 id="gd-title">{detail.title}</h1><Info size={14}/></div>
      <div className="gd-title-actions">
        <button className="gd-button"><Download size={15}/>导出报告</button>
        <label className="gd-select"><SlidersHorizontal size={15}/><select value={platform} onChange={event => setPlatform(event.target.value)} aria-label="选择平台"><option>全部平台</option>{platforms.map(item => <option key={item.name}>{item.name}</option>)}</select><ChevronDown size={13}/></label>
        <label className="gd-select"><CalendarDays size={15}/><select value={range} onChange={event => setRange(event.target.value)} aria-label="选择日期范围"><option>近 7 天</option><option>近 30 天</option><option>本月至今</option></select><ChevronDown size={13}/></label>
      </div>
    </header>

    {notice && <div className="gd-notice"><Sparkles size={17}/><p>增长数据按内容发布时间归因；不同平台可能有 5–30 分钟同步延迟。</p><button onClick={() => setNotice(false)}>知道了</button></div>}

    <div className="gd-overview-grid">
      <main className="gd-primary">
        <section className="gd-summary" aria-labelledby="gd-summary-heading">
          <h2 id="gd-summary-heading">增长汇总</h2>
          <div className="gd-summary-rule"/>
          <div className="gd-summary-head"><span>指标</span><span>数值</span></div>
          <div className="gd-summary-list">{detail.kpis.map(([label, value], index) => <div className="gd-summary-row" key={label}><span><i className={`gd-swatch swatch-${index}`}/>{label}</span><strong>{value}</strong></div>)}</div>
        </section>

        <section className="gd-activity" aria-labelledby="gd-activity-heading">
          <h2 id="gd-activity-heading">近期活动</h2>
          <div className="gd-tabs" role="tablist" aria-label="增长明细类型">{['内容贡献', '平台明细', '异常变化'].map(label => <button key={label} role="tab" aria-selected={tab === label} onClick={() => setTab(label)}>{label}</button>)}</div>
          {tab === '内容贡献' && <div className="gd-table-wrap"><table><thead><tr><th>内容</th><th>平台</th><th>发布时间</th><th>阅读 / 曝光</th><th>带来粉丝</th><th>增长贡献</th></tr></thead><tbody>{visibleContributions.map(item => <tr key={item.title}><td><button className="gd-content-link">{item.title}</button></td><td>{item.platform}</td><td>{item.published}</td><td>{item.reach}</td><td>{item.followers}</td><td>{item.share}</td></tr>)}</tbody></table></div>}
          {tab === '平台明细' && <div className="gd-table-wrap"><table><thead><tr><th>平台与账号</th><th>阅读 / 曝光</th><th>新增粉丝</th><th>互动率</th><th>周期变化</th></tr></thead><tbody>{visiblePlatforms.map(item => <tr key={item.name}><td><strong>{item.name}</strong><small>{item.account}</small></td><td>{item.reach}</td><td>{item.followers}</td><td>{item.engagement}</td><td><span className="gd-positive">{item.change}</span></td></tr>)}</tbody></table></div>}
          {tab === '异常变化' && <div className="gd-change-list">{changes.filter(item => detail.platform === '全部平台' || item.title.startsWith(detail.platform)).map(item => <article key={item.title}><span className={`gd-change-mark is-${item.tone}`}/><div><strong>{item.title}</strong><p>{item.meta}</p></div><time>{item.time}</time></article>)}</div>}
        </section>
      </main>

      <aside className="gd-side">
        <section className="gd-side-section"><div className="gd-side-title"><h2>数据同步</h2><button aria-label="立即刷新"><RefreshCw size={14}/></button></div><div className="gd-sync-row"><RefreshCw size={17}/><span><strong>每 15 分钟</strong><small>所有平台数据同步正常</small></span></div></section>
        <section className="gd-side-section gd-report"><h2>报告</h2><button><span><FileText size={17}/></span><span><strong>{detail.title}周报</strong><small>查看并导出本周增长表现</small></span></button></section>
      </aside>
    </div>
  </section>;
}
