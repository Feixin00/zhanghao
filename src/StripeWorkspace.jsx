import { useEffect, useRef, useState } from 'react';
import { Users, Files, FileText, Clock, ChevronDown, ChevronRight, Search, Bell, Settings, CircleHelp, Plus, LayoutGrid, Menu, X, Pin, ExternalLink } from 'lucide-react';
import { Home } from './StripeIcons';
import './stripe-workspace.css';

const pageDefinitions = [
  ['dashboard', Home], ['account-information', Users], ['account-publishing', Users], ['prompt-library', FileText],
  ['content-settings', Settings], ['content-jobs', Clock], ['content-list', Files], ['content-drafts', FileText], ['settings', Settings],
];

const shellCopy = {
  zh: {
    pageLabels: ['仪表盘', '信息账号库', '发布账号库', '提示词库', '抓取设置', '抓取记录', '内容列表', '稿件管理', '设置'],
    tagline: '你的内容工作台 · 信息收集、创作与发布', back: '返回官网', mainNav: '主导航', closeNav: '关闭导航', apps: '应用', settings: '设置', help: '帮助', workspace: 'FlexibleFox 工作空间', workspaceSubtitle: '内容创作与发布', workspaceSettings: '工作空间设置', shortcuts: '快捷方式', manageShortcuts: '管理快捷方式', accountLibrary: '账号库', contentLibrary: '内容库', collapse: '收起导航', expand: '展开导航', openNav: '打开导航', openSearch: '打开搜索', searchPage: '搜索页面', search: '搜索', results: '搜索结果', quickGo: '快速前往', noResults: '没有找到匹配的页面', searchHint: '搜索工作空间中的页面 · Enter 前往 · Esc 关闭', notifications: '通知', create: '新建', guide: '入门指南', workspaceApps: '工作空间应用', all: '全部', needsAction: '需要处理', updates: '更新', noNotifications: '暂无通知', noNotificationPrefix: '目前没有', newNotifications: '新的通知', closePanel: '关闭面板', needHelp: '需要什么帮助？', start: '开始使用 FlexibleFox', continueFlow: '从以下入口继续你的工作流程。', drawerLinks: ['连接信息源', '配置发布账号', '管理创作提示词', '查看抓取记录'], manageShortcutTitle: '管理快捷方式', close: '关闭', unpin: '取消固定',
  },
  en: {
    pageLabels: ['Dashboard', 'Source Accounts', 'Publishing Accounts', 'Prompt Library', 'Collection Settings', 'Collection Runs', 'Content', 'Drafts', 'Settings'],
    tagline: 'Your content workspace · Collect, create, and publish', back: 'Back to website', mainNav: 'Main navigation', closeNav: 'Close navigation', apps: 'Apps', settings: 'Settings', help: 'Help', workspace: 'FlexibleFox Workspace', workspaceSubtitle: 'Content creation and publishing', workspaceSettings: 'Workspace settings', shortcuts: 'Shortcuts', manageShortcuts: 'Manage shortcuts', accountLibrary: 'Account library', contentLibrary: 'Content library', collapse: 'Collapse navigation', expand: 'Expand navigation', openNav: 'Open navigation', openSearch: 'Open search', searchPage: 'Search pages', search: 'Search', results: 'Search results', quickGo: 'Quick access', noResults: 'No matching pages found', searchHint: 'Search workspace pages · Enter to open · Esc to close', notifications: 'Notifications', create: 'Create', guide: 'Get started', workspaceApps: 'Workspace apps', all: 'All', needsAction: 'Needs attention', updates: 'Updates', noNotifications: 'No notifications', noNotificationPrefix: 'There are no ', newNotifications: 'new notifications', closePanel: 'Close panel', needHelp: 'How can we help?', start: 'Get started with FlexibleFox', continueFlow: 'Continue your workflow from one of these places.', drawerLinks: ['Connect a source', 'Configure publishing accounts', 'Manage prompts', 'View collection runs'], manageShortcutTitle: 'Manage shortcuts', close: 'Close', unpin: 'Unpin ',
  },
};

export default function StripeWorkspace({ children, activePage, onNavigate, language = 'zh' }) {
  const copy = shellCopy[language] || shellCopy.zh;
  const pages = pageDefinitions.map(([id, Icon], index) => [id, copy.pageLabels[index], Icon]);
  const groups = [[copy.accountLibrary, Users, pages.slice(1, 3)], [copy.contentLibrary, Files, pages.slice(4, 8)]];
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [popup, setPopup] = useState('');
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState('');
  const [tab, setTab] = useState(copy.all);
  const [pins, setPins] = useState(['content-jobs', 'content-list', 'content-drafts']);
  const root = useRef(null);
  const search = useRef(null);
  const trigger = useRef(null);
  useEffect(() => { if (popup === 'search') search.current?.focus(); }, [popup]);
  const navigate = (id) => { onNavigate(id); setPopup(''); setMobile(false); setDrawer(''); };
  const toggle = (name, event) => { trigger.current = event?.currentTarget; setPopup(v => v === name ? '' : name); };
  useEffect(() => {
    const down = (event) => {
      if (event.key === 'Escape') { search.current?.blur(); setPopup(''); setDrawer(''); setMobile(false); trigger.current?.focus(); }
      if ((event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key === 'k')) && !/INPUT|TEXTAREA/.test(event.target.tagName)) { event.preventDefault(); setPopup('search'); search.current?.focus(); }
    };
    const outside = (event) => { if (!event.target.closest('[data-shell-popover]')) { search.current?.blur(); setPopup(''); } };
    document.addEventListener('keydown', down); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', down); document.removeEventListener('pointerdown', outside); };
  }, []);
  const item = ([id, label, Icon], shortcut = false) => {
    const isActive = activePage === id || (id === 'dashboard' && activePage === 'growth-details');
    return <div className="sw-nav-row" key={id}>
    <button title={label} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={16}/><span>{label}</span></button>
    {shortcut && <button className="sw-pin" title={`${copy.unpin}${label}`} aria-label={`${copy.unpin}${label}`} onClick={() => setPins(v => v.filter(p => p !== id))}><Pin size={12}/></button>}
  </div>;
  };
  const iconButton = (name, Icon, action) => <button className="sw-icon" aria-label={name} title={name} aria-expanded={action ? undefined : popup === name} onClick={action || (e => toggle(name, e))}><Icon size={16}/></button>;
  return <div ref={root} className={`sw-shell ${collapsed ? 'sw-collapsed' : ''} ${mobile ? 'sw-mobile-open' : ''} ${drawer ? 'sw-with-drawer' : ''}`}>
    <div className="sw-environment"><strong>FlexibleFox <CircleHelp size={13}/></strong><span>{copy.tagline}</span><a href="/">{copy.back}</a></div>
    <aside className="sw-sidebar" aria-label={copy.mainNav}>
      <div className="sw-mobile-tools">{iconButton(copy.closeNav, X, () => setMobile(false))}{iconButton(copy.apps, LayoutGrid)}{iconButton(copy.settings, Settings, () => navigate('settings'))}{iconButton(copy.help, CircleHelp, () => setDrawer(copy.help))}</div>
      <div className="sw-account-wrap" data-shell-popover>
        <button className="sw-account" aria-expanded={popup === 'account'} onClick={e => toggle('account', e)}><span className="sw-avatar">F</span><span className="sw-account-text"><strong>{copy.workspace}</strong><small>{copy.workspaceSubtitle}</small></span><ChevronDown size={12}/></button>
        {popup === 'account' && <div className="sw-popover sw-account-menu"><div className="sw-account-summary"><span className="sw-avatar">F</span><strong>{copy.workspace}</strong><span>{copy.workspaceSubtitle}</span></div><button onClick={() => navigate('settings')}>{copy.workspaceSettings} <Settings size={14}/></button><hr/><a href="/">{copy.back} <ExternalLink size={14}/></a></div>}
      </div>
      <nav>
        {item(pages[0])}{item(pages[1])}{item(pages[2])}{item(pages[3])}
        <div className="sw-nav-heading">{copy.shortcuts} <button aria-label={copy.manageShortcuts} onClick={e => toggle('shortcuts', e)}><Settings size={12}/></button></div>
        {pins.map(id => item(pages.find(p => p[0] === id), true))}
        <div className="sw-nav-heading">{copy.workspace}</div>
        {groups.map(([name, Icon, links]) => <div key={name}><button className="sw-group" title={name} aria-expanded={!!expanded[name]} onClick={() => { setCollapsed(false); setExpanded(v => ({...v, [name]: !v[name]})); }}><Icon size={16}/><span>{name}</span><ChevronDown className={expanded[name] ? 'sw-rotate' : ''} size={12}/></button>{expanded[name] && <div className="sw-subnav">{links.map(link => item(link))}</div>}</div>)}
        {item(pages[8])}
      </nav>
    </aside>
    <button className="sw-collapse" aria-label={collapsed ? copy.expand : copy.collapse} onClick={() => setCollapsed(!collapsed)}><span/></button>
    <div className="sw-column">
      <header className="sw-header"><div className="sw-toolbar">
        <button className="sw-mobile-menu" aria-label={copy.openNav} onClick={() => setMobile(true)}><Menu size={20}/><strong>FlexibleFox</strong></button>
        <div className={`sw-search ${popup === 'search' ? 'sw-search-active' : ''}`} data-shell-popover><button className="sw-search-trigger" aria-label={copy.openSearch} onClick={() => {setPopup('search');}}><Search size={15}/></button><input ref={search} aria-label={copy.searchPage} placeholder={copy.search} value={query} onFocus={() => setPopup('search')} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const match = pages.find(p => p[1].toLowerCase().includes(query.toLowerCase())); if (match) navigate(match[0]); } }}/><kbd>/</kbd>
          {popup === 'search' && <div className="sw-popover sw-search-menu"><small>{query ? copy.results : copy.quickGo}</small>{pages.filter(p => p[1].toLowerCase().includes(query.toLowerCase())).map(([id, label, Icon]) => <button key={id} onClick={() => navigate(id)}><Icon size={16}/>{label}<ChevronRight size={12}/></button>)}{!pages.some(p => p[1].toLowerCase().includes(query.toLowerCase())) && <p>{copy.noResults}</p>}<footer>{copy.searchHint}</footer></div>}
        </div>
        <div className="sw-actions" data-shell-popover>
          {iconButton(copy.apps, LayoutGrid)}{iconButton(copy.help, CircleHelp, () => {setPopup(''); setDrawer(drawer === copy.help ? '' : copy.help);})}{iconButton(copy.notifications, Bell)}{iconButton(copy.settings, Settings, () => navigate('settings'))}<button className="sw-create" aria-label={copy.create} title={copy.create} onClick={e => toggle('create', e)} aria-expanded={popup === 'create'}><Plus size={14}/></button><button className="sw-guide" onClick={() => setDrawer(drawer === copy.guide ? '' : copy.guide)}>{copy.guide} <span/></button>
          {popup === 'create' && <div className="sw-popover sw-create-menu">{pages.filter(p => ['account-information','account-publishing','prompt-library','content-drafts'].includes(p[0])).map(([id,label,Icon]) => <button key={id} onClick={() => navigate(id)}><Icon size={16}/>{label}<ChevronRight size={12}/></button>)}</div>}
          {popup === copy.apps && <div className="sw-popover sw-apps-menu"><strong>{copy.workspaceApps}</strong>{pages.slice(1,4).map(([id,label,Icon]) => <button key={id} onClick={() => navigate(id)}><Icon size={16}/>{label}</button>)}</div>}
          {popup === copy.notifications && <div className="sw-popover sw-notifications"><h3>{copy.notifications}</h3><div role="tablist">{[copy.all,copy.needsAction,copy.updates].map(label => <button key={label} role="tab" aria-selected={tab === label} onClick={() => setTab(label)}>{label} <span>0</span></button>)}</div><div className="sw-empty"><Bell size={32}/><strong>{copy.noNotifications}</strong><p>{copy.noNotificationPrefix}{tab === copy.all ? copy.newNotifications : tab}.</p></div></div>}
        </div>
      </div></header>
      <div className="sw-content">{children}</div>
    </div>
    {drawer && <aside className="sw-drawer" aria-label={drawer}><header><strong>{drawer}</strong>{iconButton(copy.closePanel, X, () => setDrawer(''))}</header><div className="sw-drawer-body"><h3>{drawer === copy.help ? copy.needHelp : copy.start}</h3><p>{copy.continueFlow}</p>{copy.drawerLinks.map((label,index) => <button key={label} onClick={() => navigate(['account-information','account-publishing','prompt-library','content-jobs'][index])}>{label}<ChevronRight size={16}/></button>)}</div></aside>}
    {popup === 'shortcuts' && <div className="sw-modal-backdrop" onClick={() => setPopup('')}><section className="sw-shortcuts" role="dialog" aria-modal="true" aria-label={copy.manageShortcutTitle} data-shell-popover onClick={e => e.stopPropagation()}><header><h3>{copy.manageShortcutTitle}</h3>{iconButton(copy.close, X, () => setPopup(''))}</header>{pages.slice(1).map(([id,label]) => <label key={id}><input type="checkbox" checked={pins.includes(id)} onChange={() => setPins(v => v.includes(id) ? v.filter(p=>p!==id) : [...v,id])}/>{label}</label>)}</section></div>}
  </div>;
}
