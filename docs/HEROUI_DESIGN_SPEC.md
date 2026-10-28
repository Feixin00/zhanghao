# FlexibleFox × HeroUI v3 设计规范

> 版本：1.0  
> 制定日期：2026-08-20  
> 研究基线：HeroUI v3.2.4  
> 适用范围：FlexibleFox 的应用外壳、左侧导航、仪表盘、账号库，以及后续面向普通用户的功能页面

---

## 1. 文档目的

这份规范不是简单地把页面“换成 HeroUI 组件”，而是要建立一套统一、温和、灵动、适合小白用户的产品设计语言。

当前界面让人感觉“死气沉沉、干巴巴”的主要原因并不是布局完全错误，而是基础控件和视觉层级仍接近浏览器默认样式：

- 输入框、下拉框和文本域主要依赖边框勾勒，控件像一排表格单元格。
- 原生 Select 的弹出层由操作系统绘制，圆角、阴影、选中态和动画无法与页面统一。
- 容器之间主要靠灰线分隔，背景、表面、浮层三个层级不够明确。
- 所有区域都是相似的白色矩形，缺少主次、节奏与视觉焦点。
- 交互反馈较弱，悬停、按下、加载、成功、错误等状态不够“有生命力”。
- 列表强调字段和列，而不是强调账号本身，容易产生后台数据库的观感。

本规范的目标是：

1. 保留当前清晰的应用主体和导航结构。
2. 使用 HeroUI 的设计思想重做基础控件和交互反馈。
3. 让账号库更像面向普通用户的内容管理产品，而不是管理数据库。
4. 让亮色与暗色主题拥有一致的层级、手感和可访问性。
5. 给后续页面提供可复用、可验收、可持续扩展的标准。

---

## 2. 规范的解释方式

### 2.1 信息来源

本文包含两类规则：

- **HeroUI 官方基线**：来自 HeroUI v3 官方文档、默认主题变量和组件样式源码。
- **FlexibleFox 产品决策**：结合现有紫色品牌、C 端小白用户、账号库业务和当前项目结构做出的落地选择。

如果两者发生差异，以本规范标记的 FlexibleFox 产品决策为准；HeroUI 是基础设施，不是产品本身。

### 2.2 规则等级

- **必须**：新页面和新组件必须遵守，代码评审与视觉验收需要检查。
- **应该**：默认遵守；只有明确的业务原因才允许偏离。
- **可以**：提供选择空间，由具体页面决定。

### 2.3 升级原则

HeroUI 升级时，不直接覆盖本规范。应先检查：

1. 语义色变量是否变化。
2. 组件结构和状态属性是否变化。
3. 默认圆角、阴影、尺寸和动画是否变化。
4. React、Tailwind CSS 和浏览器支持范围是否变化。
5. 当前项目的品牌主题覆盖是否仍满足对比度要求。

---

## 3. 设计定位

### 3.1 产品气质

FlexibleFox 的界面应呈现以下感受：

- **友好**：文案像有人在旁边引导，不使用生硬的系统术语。
- **轻盈**：安静背景、柔和表面、低对比边界，不堆叠粗边框。
- **灵动**：悬停、按下、弹出和保存都有短促自然的反馈。
- **可信**：信息层级稳定，危险操作克制，结果可预期。
- **易懂**：一次只突出一个主要动作，复杂能力逐步展开。
- **有品牌感**：狐狸紫用于行动与焦点，而不是铺满整个页面。

### 3.2 不是这些风格

- 不是高密度数据后台。
- 不是由大量边框拼出的表单或表格。
- 不是每个区块都拥有强阴影的“卡片墙”。
- 不是用渐变、发光和大面积紫色制造虚假的高级感。
- 不是为了展示组件库而堆满组件。
- 不是只有鼠标可用、键盘和读屏器不可用的视觉样品。

---

## 4. HeroUI 核心思想及项目解释

HeroUI v3 的官方原则强调语义意图、无障碍、组合式 API、渐进呈现、可预测行为、样式与逻辑分离，以及完整可定制性。FlexibleFox 将其转化为以下规则。

### 4.1 语义优先

颜色和组件变体表达“这个元素做什么”，不表达“设计师想用什么颜色”。

- 主操作使用 Accent / Primary。
- 普通操作使用 Secondary 或 Tertiary。
- 删除等破坏性操作使用 Danger。
- 成功、警告和错误只用于对应状态。
- 平台品牌色只用于识别平台，不承担交互状态。

### 4.2 一处一个主要动作

一个可见上下文内最多有一个高强调主按钮。

在账号库页面：

- “添加账号”是新增表单的主操作。
- 单条账号中的“编辑、更多”是弱操作。
- “删除”不能与“添加账号”拥有相同的视觉权重。

### 4.3 组合优于配置

复杂控件使用 HeroUI 的组合结构，而不是用一个巨大配置对象封装所有行为。例如 Select 应由 Trigger、Value、Indicator、Popover、ListBox 和 Item 组成。

这样可以：

- 保留完整的键盘和读屏行为。
- 精确控制触发器与弹出层样式。
- 在选项中增加说明、图标或选中标记。
- 避免原生下拉框破坏整体风格。

### 4.4 渐进呈现

默认只展示完成任务所需的信息，次要信息在需要时出现。

- 列表首屏展示账号名称、平台、类型和简短详情。
- 完整链接、长详情和低频操作可以放入详情抽屉或“更多”菜单。
- 移动端不能把桌面表格硬挤到窄屏中。

### 4.5 行为可预测

- 相同样式的按钮必须有相同行为。
- 图标按钮必须拥有 Tooltip 和无障碍名称。
- 删除必须确认；保存成功必须有明确反馈。
- 表单校验应在用户完成输入后出现，不在首次聚焦前制造压力。
- 主题切换、下拉选择和弹窗关闭方式在全站一致。

### 4.6 无障碍是基础能力

不把无障碍当作最后补丁。组件必须支持：

- 清晰的可见 Label。
- 键盘导航与焦点顺序。
- Focus Visible 焦点环。
- 读屏器可理解的名称、描述和错误。
- 不只依赖颜色传递状态。
- 减少动态效果偏好。
- 足够的点击区域和文字对比度。

---

## 5. 视觉基础

### 5.1 色彩系统

#### 5.1.1 使用语义色，不直接使用色板编号

业务组件只能引用语义变量，例如：

- background：页面画布。
- foreground：主要文字。
- surface：主要表面。
- surface-secondary：次级表面。
- surface-tertiary：更弱的表面。
- field：表单控件背景。
- border：容器边界。
- separator：低对比分隔线。
- muted：辅助文字。
- accent：品牌主行动。
- success、warning、danger：状态反馈。

禁止在业务 CSS 中到处散落 #ffffff、#6d5ce7 或 rgba 阴影。具体色值只在主题层声明。

#### 5.1.2 FlexibleFox 品牌色

| 语义 | 亮色主题 | 暗色主题 | 用途 |
|---|---:|---:|---|
| Accent | #6D5CE7 | #9B8CF4 | 主按钮、选中导航、焦点、关键选中态 |
| Accent foreground | #FFFFFF | #0E0E10 | Accent 表面上的文字和图标 |
| Accent soft | 由 Accent 混合 10%–14% | 由 Accent 混合 16%–20% | 选中背景、浅色 Chip、轻提示 |
| Accent hover | 在当前 Accent 上调整约 5% 明度 | 在当前 Accent 上调整约 5% 明度 | 指针悬停 |
| Accent pressed | 在当前 Accent 上调整约 9% 明度 | 在当前 Accent 上调整约 9% 明度 | 按下状态 |

亮色 Accent #6D5CE7 与白色文字的对比度约为 4.84:1，可用于普通文字。暗色主题 Accent #9B8CF4 上必须使用深色文字，不能继续使用白色文字。

#### 5.1.3 中性色与表面

下表是项目推荐值。可在实现时转为 OKLCH，以获得更稳定的明度控制。

| 语义 | 亮色主题 | 暗色主题 |
|---|---:|---:|
| Background | #F7F7F8 | #111114 |
| Foreground | #1B1B20 | #F4F4F5 |
| Surface | #FFFFFF | #202024 |
| Surface secondary | #F2F2F4 | #29292E |
| Surface tertiary | #EBEBEE | #303036 |
| Field | #FFFFFF | #202024 |
| Muted foreground | #71717A | #A1A1AA |
| Border | #E3E3E8 | #3A3A41 |
| Separator | #E9E9ED | #323238 |
| Overlay backdrop | rgba(0,0,0,.50) | rgba(0,0,0,.60) |

使用规则：

- 页面使用 Background，不使用纯白铺满整个内容区。
- 主表单、列表容器使用 Surface。
- Surface 内部的输入控件优先使用 Secondary 变体，避免表面上再叠一层明显阴影。
- 选项悬停、弱标签和空状态图标底使用 Surface secondary。
- Separator 只帮助扫读，不应形成表格栅栏。
- 暗色模式主要靠表面明度差建立层次，不靠更黑更大的阴影。

#### 5.1.4 状态色

建议沿用 HeroUI 的语义色方向：

| 状态 | 推荐用途 | 禁止用途 |
|---|---|---|
| Success | 保存成功、连接正常、操作完成 | 普通装饰 |
| Warning | 信息不完整、需要留意、非阻断风险 | 代替错误 |
| Danger | 校验错误、删除、不可逆风险 | 普通取消按钮 |
| Default | 中性状态、次要标签 | 主要操作 |

状态色需要同时搭配图标或文字。不能只把边框变红，却不告诉用户哪里错、如何修正。

#### 5.1.5 平台识别色

X 与 Reddit 可以拥有平台识别 Chip，但必须满足：

- X：中性色 Chip，使用 X 标志或字母，不将整个账号行染黑。
- Reddit：使用柔和橙色图标或浅色 Chip，不使用大面积高饱和橙色。
- 平台色只回答“这是什么平台”，不回答“是否成功、是否选中”。
- 暗色主题需要单独调整背景与前景色，不能机械复用亮色值。

### 5.2 字体与排版

#### 5.2.1 字体栈

中文产品默认使用系统字体，避免额外字体下载影响首屏：

~~~css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "PingFang SC",
  "Hiragino Sans GB",
  "Microsoft YaHei",
  sans-serif;
~~~

数字、英文账号和链接可以继承同一字体，不为“科技感”滥用等宽字体。

#### 5.2.2 字号层级

以下层级参考 HeroUI Typography，并结合应用页面使用：

| Token | 字号 / 行高 | 字重 | 主要用途 |
|---|---|---:|---|
| Heading 1 | 36 / 40px | 600 | 极少使用的营销或空状态主标题 |
| Heading 2 | 30 / 35px | 600 | 一级页面大标题，当前应用通常不需要 |
| Heading 3 | 24 / 30px | 600 | 页面标题 |
| Heading 4 | 20 / 27px | 600 | 大区块标题、弹窗标题 |
| Heading 5 | 18 / 25px | 600 | 卡片标题 |
| Heading 6 | 16 / 24px | 600 | 小区块标题 |
| Body | 16 / 28px | 400 | 正文、重要说明 |
| Body small | 14 / 21px | 400 | 表单、列表、辅助说明 |
| Body extra small | 12 / 15px | 400–500 | Chip、时间、极次要信息 |

中文界面规则：

- 页面标题推荐 24px，而不是为了“高级感”做成超大标题。
- 表单 Label 使用 14px / 20px、字重 500 或 600。
- 输入内容在移动端至少 16px，避免 iOS 自动缩放；桌面可为 14px。
- 说明文本使用 Muted，但不得低到难以阅读。
- 不使用全大写英文作为中文界面的栏目标题。
- 一行正文理想长度不超过约 70 个中文字符。

### 5.3 间距

使用 4px 基础网格：

| Token | 数值 | 用途示例 |
|---|---:|---|
| 1 | 4px | 图标微调、紧邻元素 |
| 2 | 8px | 图标与文字、紧凑控件间距 |
| 3 | 12px | 卡片内部紧凑间距 |
| 4 | 16px | 默认内边距、字段间距 |
| 5 | 20px | 中等容器内边距 |
| 6 | 24px | 卡片内边距、区块间距 |
| 8 | 32px | 大区块间距、桌面页面边距 |
| 10 | 40px | 页面章节间距 |
| 12 | 48px | 大留白 |
| 16 | 64px | 特殊首屏区块 |

必须遵守：

- 同一级元素使用一致间距。
- 卡片内部间距小于卡片之间的间距。
- Label 与控件之间 6–8px。
- 控件与 Description / Error 之间 6px。
- 相关操作之间 8–12px。
- 不通过随意增加 margin 修补布局；优先使用父级 gap。

### 5.4 圆角

HeroUI 默认基础圆角为 8px，并衍生出 2、4、6、8、12、16、24、32px。FlexibleFox 采用：

| 元素 | 圆角 |
|---|---:|
| 小标签、微型图标底 | 8px |
| Input、TextArea、Select Trigger | 12px |
| 小 Popover、菜单项选中底 | 12–16px |
| Toast、Alert | 16px |
| Card、Surface | 20–24px |
| Modal、Select Popover | 24px |
| 普通按钮 | 999px 或 HeroUI rounded-3xl |
| 大型空状态插画底 | 24–32px |

圆角不是越大越好。容器尺寸越大，圆角可以越大；同一个小控件不能使用 24px 圆角造成胶囊化失控。

### 5.5 边框、阴影与层级

#### 5.5.1 三层模型

1. **Canvas**：Background，安静、无阴影。
2. **Surface**：Card、表单、列表容器，用轻微明度差和极浅阴影。
3. **Overlay**：Select Popover、Menu、Modal、Toast，使用最明显但仍柔和的阴影。

#### 5.5.2 推荐阴影

亮色主题：

~~~css
--shadow-surface:
  0 2px 4px rgba(0, 0, 0, .04),
  0 1px 2px rgba(0, 0, 0, .06),
  0 0 1px rgba(0, 0, 0, .06);

--shadow-overlay:
  0 2px 8px rgba(0, 0, 0, .06),
  0 -6px 12px rgba(0, 0, 0, .03),
  0 14px 28px rgba(0, 0, 0, .08);
~~~

暗色主题：

- Surface 默认不使用外部黑色阴影。
- Overlay 可使用细微亮色内描边配合背景层级。
- 不通过纯黑大阴影制造悬浮感。

边框规则：

- Input 的默认边框可以透明，以背景、阴影和 Focus Ring 说明可交互性。
- 大容器允许 1px 低对比 Border，但不能边框与重阴影同时抢眼。
- 列表行只使用横向 Separator，不使用纵向边线。
- 焦点环不是普通边框，它只在键盘焦点时出现。

### 5.6 图标

项目继续使用 Phosphor Icons，确保视觉一致。

| 场景 | 尺寸 | 推荐权重 |
|---|---:|---|
| 输入框、按钮辅助图标 | 16–18px | regular / bold |
| 导航图标 | 20–22px | regular；选中可 fill 或 duotone |
| 区块图标 | 24px | regular / duotone |
| 空状态图标 | 32–48px | duotone |

规则：

- 图标与文字间距通常为 8px。
- 陌生图标不能单独承担含义，必须有文字或 Tooltip。
- 删除图标默认保持中性，悬停后再进入 Danger；不能整行都显红。
- 装饰图标对读屏器隐藏；功能图标必须有 aria-label。
- 不混用不同图标库的线宽和风格。

### 5.7 动效

动效要让控件显得有触感，而不是吸引注意力。

#### 5.7.1 时间与缓动

| 类型 | 时长 | 用途 |
|---|---:|---|
| 即时状态 | 80–120ms | 背景色、边框色、阴影变化 |
| 常规交互 | 150ms | Hover、Focus、菜单退出 |
| 空间变化 | 180–220ms | Popover 进入、折叠展开 |
| 页面级变化 | 220–300ms | 抽屉、Modal、内容过渡 |

推荐缓动：

~~~css
--ease-out-fluid: cubic-bezier(.32, .72, 0, 1);
~~~

#### 5.7.2 组件动效

- Button 按下可缩放到 0.97，松开后自然恢复。
- Select Popover 进入时使用 opacity + scale(.95) + 轻微位移，退出更快。
- 导航选中底色淡入，不移动文字位置。
- Skeleton 使用低对比 Shimmer，不闪烁。
- 保存完成用 Toast 反馈，不让整张卡片弹跳。

#### 5.7.3 减少动态效果

必须尊重 prefers-reduced-motion。开启减少动态效果时：

- 取消缩放和大范围位移。
- 允许极短的透明度变化。
- 功能和状态信息不能依赖动画才能理解。

---

## 6. 应用布局

### 6.1 应用外壳

桌面端建议：

- 左侧导航宽度：240–256px。
- 顶部工具栏高度：56–64px。
- 内容区最大宽度：1180–1240px。
- 内容区左右内边距：32px。
- 页面顶边距：24–32px。
- 主区块之间：24–32px。

宽屏不能无限拉伸表单。内容居中或在主工作区内限制最大宽度，避免一行输入框变得过长。

### 6.2 响应式断点

| 范围 | 建议行为 |
|---|---|
| 小于 768px | 移动端；导航收起为抽屉；字段单列；列表变内容卡片 |
| 768–1023px | 平板；字段可两列；侧栏可窄化 |
| 1024–1279px | 标准桌面；完整侧栏；12 列内容网格 |
| 大于等于 1280px | 宽屏；限制内容最大宽度，不继续拉长 |

### 6.3 左侧导航

- 品牌区和导航区之间应有明确但柔和的留白。
- 每个导航项高度 44–48px，圆角 12–16px。
- 默认态文字为 Muted foreground，图标同色。
- Hover 使用 Surface secondary。
- 选中态使用 Accent soft 背景、Accent 文字和图标。
- 选中态不能只依赖一条细线。
- “仪表盘”和“账号库”显示真实名称；待开发入口统一显示“待开发”或暂不展示，避免伪功能。
- 小狐狸 Logo 保持独立识别，不把它缩成难以辨认的装饰点。
- 明暗主题切换放在导航底部或顶部工具区，位置保持稳定。

### 6.4 顶部工具栏

只放跨页面能力，例如：

- 当前页面的简短名称或面包屑。
- 主题切换。
- 账号/用户菜单。
- 全局通知。

不要同时在顶部工具栏、页面内容和卡片内部重复同一个页面标题。

---

## 7. 组件规范

### 7.1 Button

#### 7.1.1 变体

| 变体 | 使用场景 | 示例 |
|---|---|---|
| Primary / Accent | 当前上下文唯一主操作 | 添加账号、保存 |
| Secondary | 普通次要操作 | 取消、编辑资料 |
| Tertiary | 更轻的辅助操作 | 查看详情、展开 |
| Outline / Ghost | 工具栏和低强调操作 | 筛选、刷新 |
| Danger | 明确的破坏性确认 | 确认删除 |
| Danger soft | 删除入口或非最终步骤 | 行内删除按钮 |

#### 7.1.2 尺寸

HeroUI Button 的默认高度约为移动端 40px、桌面端 36px；大号约为移动端 44px、桌面端 40px。项目规则：

- 表单主按钮桌面至少 40px，移动端至少 44px。
- 图标按钮点击区域至少 40×40px；移动端推荐 44×44px。
- 普通按钮左右内边距约 16px。
- 按钮文字使用 14px、字重 600。

#### 7.1.3 状态

按钮必须覆盖：

- Default
- Hover
- Pressed
- Focus visible
- Loading
- Disabled

Loading 时：

- 保持原宽度，避免布局跳动。
- 展示 Spinner 和“正在添加…”等明确文案。
- 阻止重复提交。

Disabled 不能作为解释错误的唯一方式。如果用户不知道为什么不能点击，需要提供字段错误或说明。

### 7.2 Surface 与 Card

Surface 表达界面层级，Card 表达一个相对独立的内容单元。

使用原则：

- 页面背景上可放一个表单 Surface 和一个列表 Surface。
- 表单 Surface 内不要再为每个字段创建卡片。
- 账号列表容器是一个 Surface；账号行通常不是独立重阴影 Card。
- 只有移动端把账号行转成卡片时，才给每条账号适度表面和圆角。
- 卡片标题、描述和操作保持固定布局顺序。

HeroUI 默认 Card 使用约 16px 内边距、12px 间距和 24px 级圆角。FlexibleFox 的大型业务 Surface 推荐 20–24px 内边距。

### 7.3 TextField、Input 与 TextArea

#### 7.3.1 结构

每个字段使用完整语义结构：

~~~jsx
<TextField>
  <Label />
  <Input />
  <Description />
  <FieldError />
</TextField>
~~~

- Label 始终可见，Placeholder 不能代替 Label。
- 可选字段使用“选填”，不要只给必填字段堆星号。
- Description 用于格式帮助；FieldError 用于当前错误，两者职责不同。
- 错误出现后，输入内容和 Label 仍应容易阅读。

#### 7.3.2 样式

- Field 圆角 12px。
- 默认高度 40–44px。
- Surface 内优先使用 Secondary 变体，背景与外层形成轻微层级。
- 默认不要使用深灰 1px 边框圈住所有控件。
- Hover 提高背景或边界对比度。
- Focus visible 使用 2px Accent Ring 和 2px Offset。
- Invalid 使用 Danger Ring / Border，并在下方显示错误文字和图标。
- Disabled 降低对比度，但内容仍可辨认。

#### 7.3.3 账号库字段

| 字段 | 类型 | 必填 | 推荐提示 |
|---|---|---:|---|
| 账号名称 | text | 是 | 例如：The Verge |
| 账号链接 / 标识 | text | 是 | 网址、用户名或账号 ID 均可 |
| 账号类型 | 自定义 Select | 是 | 请选择账号类型 |
| 归属平台 | 自定义 Select | 是 | 请选择平台 |
| 详情 | TextArea | 是 | 简单写下账号定位、内容特点或备注 |

账号链接字段必须使用 text，不使用 type=url，也不做“必须是网址”的校验。允许输入完整网址、@用户名、频道名或平台账号 ID。

详情 TextArea：

- 默认 3 行，允许增长到合理高度。
- 建议上限 500 字，并显示接近上限时的字数。
- 允许换行。
- 列表中只预览两行，完整内容进入详情视图。

### 7.4 Select

#### 7.4.1 必须使用自定义组合式 Select

账号类型与归属平台禁止继续使用原生 HTML Select 作为最终视觉实现。应采用 HeroUI Select：

~~~jsx
<Select>
  <Label />
  <Select.Trigger>
    <Select.Value />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Popover>
    <ListBox>
      <ListBox.Item>
        <Label />
        <ListBox.ItemIndicator />
      </ListBox.Item>
    </ListBox>
  </Select.Popover>
</Select>
~~~

这能统一 Trigger、Popover、选项、选中标记、圆角、阴影和动效，同时保留键盘导航、类型搜索、焦点管理和读屏支持。

#### 7.4.2 视觉与交互

- Trigger 高度 40–44px，圆角 12px。
- Indicator 在打开时旋转，不能瞬间替换为另一个图标。
- Popover 使用 Overlay 层级、约 24px 圆角和柔和阴影。
- Popover 内边距约 6px。
- Item 最小高度 40px，左右内边距约 10–12px。
- Hover / Focus 项使用 Surface secondary 或 Accent soft。
- 选中项使用清晰文字权重与勾选标记，不只使用蓝色系统高亮。
- Popover 进入约 150–200ms，退出约 100–150ms。
- 长选项不能截成无法区分的片段。
- 打开后可用方向键移动、Enter 选择、Esc 关闭，输入文字进行类型搜索。

#### 7.4.3 账号类型选项

保持以下业务枚举和顺序：

1. 新闻/资讯/热点
2. 榜单/推荐
3. 知识科普
4. 创作/测评
5. 测评分享
6. 情感
7. 娱乐搞笑
8. 创作者

如果未来选项超过约 12 项，应该增加可搜索能力或分组，而不是让 Popover 无限变长。

#### 7.4.4 平台选项

当前只有：

- X
- Reddit

每项可以包含平台图标与名称。触发器选中后仍以文字为主，不能只剩图标。

### 7.5 Chip 与 Badge

适合展示平台、账号类型、状态等短信息。

- Platform Chip：平台识别，使用中性或柔和品牌色。
- Type Chip：默认中性色，不给八种类型各配一种高饱和颜色。
- Status Chip：只用于真实状态。
- 单个 Chip 高度 24–28px。
- 文字 12–13px，字重 500。
- 一行 Chip 过多时换行或收纳，不横向溢出。
- Chip 不是按钮；可点击 Chip 必须有明显 Hover、Focus 和按下反馈。

### 7.6 Avatar / 账号识别图

账号列表使用 40px Avatar 作为视觉锚点：

- 有头像时显示图片。
- 无头像时显示账号名称首字符或平台图标。
- Fallback 背景使用 Accent soft 或稳定的柔和色。
- Avatar 旁第一行是账号名称，第二行是链接或账号标识。
- 图片加载失败必须自动回退，不能显示破图图标。

### 7.7 Tooltip 与图标按钮

- 删除、复制链接、更多等纯图标按钮必须有 Tooltip。
- Tooltip 延迟出现，避免用户移动鼠标时满屏闪烁。
- Tooltip 文案使用动词，例如“复制标识”“删除账号”。
- Tooltip 不是承载关键业务说明的地方。
- 图标按钮必须拥有 aria-label。

### 7.8 账号列表

#### 7.8.1 设计方向

账号列表是内容列表，不是数据库表格。

桌面端可以借用 Table 的对齐能力，但视觉应采用 HeroUI Secondary / Flat 风格：

- 容器自身是一个 Surface。
- 表头低强调或在信息足够清楚时省略。
- 不使用纵向分隔线。
- 行高 72–84px，让账号身份成为主要信息。
- Hover 使用轻微 Surface secondary。
- 行操作默认安静，Hover 或聚焦时提高可见度。
- 账号名称是最高层级，平台与类型是辅助标签。
- 详情最多两行，超出省略。

#### 7.8.2 推荐行结构

| 区域 | 内容 | 视觉层级 |
|---|---|---|
| 账号身份 | Avatar、名称、链接或标识 | 最高 |
| 平台 | Platform Chip | 中 |
| 类型 | Type Chip | 中 |
| 详情 | 两行摘要 | 次 |
| 操作 | 查看、编辑、更多、删除 | 最低，交互时增强 |

不要再使用“黑色方块 + 数字”作为账号 Avatar，除非数字本身是账号品牌的一部分。

#### 7.8.3 移动端

小于 768px 时不保留横向表格：

- 每个账号变成紧凑内容卡片。
- 第一行：Avatar、名称、更多菜单。
- 第二行：链接或标识。
- 第三行：平台与类型 Chip。
- 第四行：详情摘要。
- 删除放入更多菜单或详情页，避免误触。

### 7.9 Empty State

空列表不能只显示一块空白表格。

推荐结构：

- 柔和圆形/圆角图标底。
- 标题：“还没有账号”
- 说明：“添加你想持续关注的账号，之后可以在这里统一查看。”
- 主操作：“添加第一个账号”

如果新增表单已经在空状态上方可见，空状态按钮可以滚动并聚焦到“账号名称”，而不是重复打开另一个表单。

### 7.10 Toast

操作结果使用 Toast，而不是浏览器 alert。

建议：

- 默认位置：右下角；移动端底部居中并避开安全区。
- 同时最多 3 条。
- 普通成功提示约 4 秒自动消失。
- 成功：“账号已添加”
- 删除成功：“账号已删除”并可在技术可行时提供“撤销”。
- 错误：“添加失败，请稍后重试”
- 不在 Toast 里放长篇错误堆栈。

### 7.11 Modal 与 AlertDialog

- 新增账号默认保持页面内紧凑表单，不强制改成 Modal。
- 账号详情或编辑可使用抽屉/Modal，避免离开列表上下文。
- 删除使用 AlertDialog，而不是原生 confirm。
- Danger 按钮只出现在确认对话框的最终动作位。
- 默认焦点不能落在危险按钮上。
- Esc、点击遮罩和关闭按钮的行为必须一致；未保存内容时应先提醒。

删除文案示例：

- 标题：“删除这个账号？”
- 说明：“删除后，账号「The Verge」及其详情会从账号库中移除。”
- 次按钮：“取消”
- Danger 按钮：“确认删除”

### 7.12 Alert、Skeleton 与加载

- 页面级阻断错误使用 Alert，并提供可执行的下一步。
- 首次加载账号列表使用 3–5 条 Skeleton Row。
- 按钮提交使用按钮内 Spinner。
- 已有列表刷新时尽量保留旧内容，不用整页 Skeleton 覆盖。
- 无结果、加载中、网络错误和空数据是四种不同状态，不能混用。

---

## 8. 账号库页面落地规范

### 8.1 页面信息结构

页面保留两部分：

1. 上方：紧凑的“新增账号”区域。
2. 下方：占主要空间的“账号列表”区域。

不再额外展示重复的“账号库”大标题、账号总数胶囊和表单说明头。页面级名称由左侧导航或顶部工具栏提供；Surface 内通过字段和内容自然表达用途。

### 8.2 新增账号区域

#### 8.2.1 桌面布局

使用 12 列网格，推荐：

- 第一行：
  - 账号名称：3 列
  - 账号链接 / 标识：3 列
  - 账号类型：3 列
  - 归属平台：3 列
- 第二行：
  - 详情：9–10 列
  - 添加账号按钮：2–3 列，底部对齐

容器：

- Surface，圆角 20–24px。
- 内边距 20–24px。
- 字段横向间距 16px。
- 行间距 16px。
- 不需要单独的“新增账号”大标题行；可以用一个很轻的区块 Label，或完全依赖表单结构。

#### 8.2.2 平板与移动端

- 平板：两列字段；详情全宽；按钮靠右或全宽。
- 移动端：单列；按钮全宽；字段高度至少 44px。
- 表单提交后，如果成功清空字段，焦点回到账号名称；如果失败，焦点移到首个错误字段。

### 8.3 账号列表区域

#### 8.3.1 列表头

只保留简洁的区域头：

- 标题：“账号列表”
- 辅助信息：“共 12 个账号”
- 可选操作：搜索、筛选

账号数量是辅助文字，不单独做成抢眼的大胶囊。

#### 8.3.2 单行示例

视觉顺序：

1. 圆形 Avatar。
2. “The Verge”。
3. 次行“@verge”或“theverge.com”。
4. X Chip。
5. 新闻/资讯/热点 Chip。
6. “科技新闻与消费电子资讯，关注新品发布……”。
7. 更多菜单。

#### 8.3.3 排序与搜索

当前数据量小可以不展示。需要时：

- 搜索框放在列表标题右侧，移动端独占一行。
- 支持按名称、链接/标识和详情搜索。
- 筛选用 Popover / Select，而不是常驻一排复杂筛选器。
- 排序默认按最近添加；切换排序后给出清晰选中状态。
- 搜索无结果时展示“没有找到相关账号”，并提供清空搜索。

### 8.4 新增流程

~~~text
填写字段
  → 前端校验
    → 校验失败：字段下方给出具体原因，聚焦首个错误
    → 校验通过：按钮进入“正在添加…”
      → 成功：插入列表顶部 + 成功 Toast + 清空表单
      → 失败：保留输入内容 + 错误 Toast / Alert
~~~

不得在请求失败后清空用户已经填写的内容。

### 8.5 删除流程

~~~text
点击更多 / 删除
  → AlertDialog 显示账号名称和后果
    → 取消：关闭并回到原触发按钮
    → 确认：按钮进入加载
      → 成功：移除列表项 + Toast
      → 失败：保留列表项 + 明确错误
~~~

---

## 9. 交互状态规范

所有可交互组件至少要设计并实现以下状态。

| 状态 | 视觉反馈 | 行为要求 |
|---|---|---|
| Default | 稳定的默认表面 | 可识别为可交互 |
| Hover | 背景或阴影轻微变化 | 不造成布局位移 |
| Pressed | 颜色加深或 scale(.97) | 松开恢复 |
| Focus visible | 2px Accent Ring | 仅键盘焦点清晰出现 |
| Selected | Accent soft + 清晰标记 | 不只依赖颜色 |
| Loading | Spinner / Skeleton | 阻止重复操作 |
| Disabled | 对比度降低 | 不可获得误导性 Hover |
| Invalid | Danger 状态 + 错误文字 | 关联到对应字段 |
| Success | Toast / 状态反馈 | 不永久占用页面空间 |

实现时优先使用 HeroUI / React Aria 暴露的 data-hovered、data-pressed、data-focus-visible、data-selected、data-invalid 等状态，而不是手工模拟鼠标事件。

---

## 10. 无障碍标准

### 10.1 键盘

- Tab 顺序与视觉顺序一致。
- Select、Menu、Modal 和 AlertDialog 采用组件自带焦点管理。
- Popover 打开后焦点进入选项，关闭后回到 Trigger。
- Esc 关闭临时浮层。
- Enter / Space 激活按钮。
- 方向键移动 Select / ListBox 选项。

### 10.2 焦点

- Focus visible 必须在亮色和暗色主题均清楚。
- 不使用 outline: none 后不提供替代。
- Modal 打开时锁定焦点；关闭后回到原触发器。
- 删除账号后，将焦点移到合理的下一项或列表标题。

### 10.3 文字与颜色

- 正文文字与背景对比度至少 4.5:1。
- 大文字至少 3:1。
- 控件边界、图标和焦点指示至少达到可辨认程度。
- 错误必须同时有文字，不只显示红色。
- Placeholder 对比度可以更低，但 Label 必须清晰。

### 10.4 点击区域

- 移动端目标至少 44×44px。
- 桌面图标按钮至少 40×40px。
- 相邻危险操作与普通操作要有足够间隔。

### 10.5 读屏器

- 每个字段都有可关联 Label。
- Description 与 FieldError 通过组件语义关联。
- 图标按钮有 aria-label。
- Toast 使用适当 live region，不打断用户正在输入的每个字符。
- 列表数量变化可在必要时礼貌播报。

---

## 11. 文案规范

### 11.1 语气

- 简洁、直接、友好。
- 告诉用户“可以做什么”，少使用技术术语。
- 错误文案包含问题和解决方法。
- 按钮使用动词。

### 11.2 推荐文案

| 场景 | 推荐 | 避免 |
|---|---|---|
| 链接字段 | 账号链接 / 标识 | URL |
| Placeholder | 网址、用户名或账号 ID 均可 | 请输入链接 |
| 详情 | 简单写下账号定位、内容特点或备注 | 详情 |
| 空列表 | 还没有账号 | No data |
| 添加成功 | 账号已添加 | 操作成功 |
| 必填错误 | 请输入账号名称 | 此字段不能为空 |
| 未选择类型 | 请选择账号类型 | Invalid value |
| 删除确认 | 删除这个账号？ | Warning |

### 11.3 必填标记

字段多数必填时，可以在表单顶部说明“所有字段均为必填”，减少每个 Label 后的星号噪音。若未来出现多个选填字段，则在选填项后标“选填”。

---

## 12. 明暗主题

### 12.1 原则

主题切换不是简单反色：

- 亮色主题依靠浅灰画布、白色 Surface 和柔和阴影。
- 暗色主题依靠不同深度的 Surface 建立层次，外阴影大幅减弱。
- Accent 在暗色主题中提高明度，并使用深色前景文字。
- 状态色需要分别验证亮暗背景上的可读性。
- 图片、Logo 和平台图标不得因反色失真。

### 12.2 实现

HeroUI v3 的主题是 CSS 驱动的，不需要额外 Provider。应用根节点使用 .light / .dark 或 data-theme。

推荐：

- 默认跟随 system。
- 用户手动切换后持久化选择。
- 全应用只创建一个主题控制器。
- 页面加载前尽早应用主题，避免白屏闪烁。
- useTheme 的有效值为 light、dark、system。

### 12.3 验收

所有页面在两种主题下分别检查：

- 文本对比度。
- Input 与 Surface 是否能区分。
- Focus Ring 是否可见。
- Overlay 是否从页面中浮起。
- Disabled 是否仍可辨认。
- Accent 按钮文字是否使用正确前景色。
- Logo 是否清晰。

---

## 13. 前端实现基线

### 13.1 技术要求

HeroUI v3 当前要求 React 19+ 与 Tailwind CSS v4。当前项目已经使用 React 19，可按 Vite 方式接入。

建议依赖：

~~~bash
npm install @heroui/react @heroui/styles
npm install -D tailwindcss @tailwindcss/vite
~~~

### 13.2 Vite 配置

~~~js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
~~~

### 13.3 全局样式导入

导入顺序必须是 Tailwind 在前、HeroUI 在后：

~~~css
@import "tailwindcss";
@import "@heroui/styles";
~~~

然后再导入 FlexibleFox 的主题覆盖和应用样式。

建议目录：

~~~text
src/
  components/
    ui/              # 项目级薄封装，不复制 HeroUI 内部逻辑
    account/         # 账号业务组件
  pages/
    Dashboard/
    AccountLibrary/
  theme/
    flexiblefox.css  # 品牌语义变量
  styles/
    app.css          # 布局与页面规则
~~~

### 13.4 主题变量示例

下面是方向示例，最终变量名以实际安装版本为准：

~~~css
:root,
.light,
[data-theme="light"] {
  --accent: #6d5ce7;
  --accent-foreground: #ffffff;
  --background: #f7f7f8;
  --foreground: #1b1b20;
  --surface: #ffffff;
  --muted: #71717a;
  --field-radius: 12px;
}

.dark,
[data-theme="dark"] {
  --accent: #9b8cf4;
  --accent-foreground: #0e0e10;
  --background: #111114;
  --foreground: #f4f4f5;
  --surface: #202024;
  --muted: #a1a1aa;
}
~~~

优先覆盖语义变量，不直接复制并修改 HeroUI 整份组件 CSS。

### 13.5 Select 实现示意

以下代码用于说明结构，不作为不经核对即可粘贴的最终 API：

~~~jsx
const accountTypes = [
  { id: "news", label: "新闻/资讯/热点" },
  { id: "ranking", label: "榜单/推荐" },
  { id: "knowledge", label: "知识科普" },
  { id: "review", label: "创作/测评" },
  { id: "sharing", label: "测评分享" },
  { id: "emotion", label: "情感" },
  { id: "fun", label: "娱乐搞笑" },
  { id: "creator", label: "创作者" },
];

<Select
  name="accountType"
  selectedKey={form.accountType}
  onSelectionChange={(key) => updateField("accountType", key)}
>
  <Label>账号类型</Label>
  <Select.Trigger>
    <Select.Value placeholder="请选择账号类型" />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Popover>
    <ListBox items={accountTypes}>
      {(item) => (
        <ListBox.Item id={item.id} textValue={item.label}>
          <Label>{item.label}</Label>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      )}
    </ListBox>
  </Select.Popover>
</Select>
~~~

### 13.6 账号链接实现示意

~~~jsx
<TextField
  name="accountLink"
  isRequired
  value={form.accountLink}
  onChange={(value) => updateField("accountLink", value)}
>
  <Label>账号链接 / 标识</Label>
  <Input
    type="text"
    placeholder="网址、用户名或账号 ID 均可"
    autoComplete="off"
  />
  <Description>不必是完整网址，也可以填写 @用户名或账号 ID。</Description>
  <FieldError />
</TextField>
~~~

不要使用 type="url"。业务校验只检查是否为空和合理长度，不限制 URL 格式。

### 13.7 样式覆盖优先级

从优到劣：

1. 覆盖主题语义变量。
2. 使用 HeroUI 官方 variant 和组合能力。
3. 使用项目组件的 className 定制实例。
4. 必要时在统一主题文件中覆盖 HeroUI BEM 类。
5. 禁止到处使用 !important 或超长选择器进行特异性对抗。

### 13.8 项目级封装

只封装会重复出现、且具有明确产品规则的组件，例如：

- AppButton：统一 Loading 文案与尺寸。
- AppTextField：统一 Label、Description、Error 间距。
- AppSelect：统一 Popover 宽度、空状态和错误显示。
- PlatformChip：统一 X / Reddit 识别。
- AccountAvatar：统一图片和 Fallback。
- ConfirmDeleteDialog：统一危险确认流程。

薄封装不能隐藏 HeroUI 的无障碍属性，也不能把所有组件做成一个拥有几十个布尔参数的万能组件。

---

## 14. 反模式

| 反模式 | 为什么不好 | 正确方向 |
|---|---|---|
| 使用原生 Select | 弹出层样式、动画和状态与应用割裂 | HeroUI Select + ListBox |
| 所有控件都有明显灰边框 | 页面像默认后台表单 | Field 背景 + 轻阴影 + Focus Ring |
| 每个区块都做白卡片和重阴影 | 层级噪音，卡片墙 | Canvas / Surface / Overlay 三层 |
| 大面积使用品牌紫 | 视觉疲劳，主操作失去焦点 | Accent 只用于行动和选中 |
| 每个账号类型使用一种高饱和色 | 像运营后台标签墙 | 默认中性 Type Chip |
| 桌面表格直接压缩到手机 | 难读、难操作 | 移动端内容卡片 |
| Placeholder 代替 Label | 输入后失去上下文，不利于无障碍 | 永久 Label |
| 删除图标常驻红色 | 页面充满危险信号 | 默认中性，Hover 后 Danger |
| 浏览器 alert / confirm | 风格割裂，无法控制焦点和文案 | Toast / AlertDialog |
| 禁用按钮但不解释 | 用户不知道下一步 | 字段错误或说明 |
| 只设计 Default 状态 | 页面交互僵硬 | 完整状态矩阵 |
| 暗色模式简单反色 | 对比度、阴影、品牌色失真 | 独立语义 Token |
| Card 套 Card 套 Card | 视觉层级混乱 | 通过间距和 Surface 变体分组 |
| 用动画掩盖层级问题 | 花哨但不清晰 | 先建立内容层级，再添加反馈 |

---

## 15. 验收清单

### 15.1 页面与布局

- [ ] 页面保留“上方紧凑新增、下方大列表”的结构。
- [ ] 没有重复的大页面标题、账号数量胶囊和冗余说明。
- [ ] 桌面内容宽度受到限制，超宽屏不无限拉长。
- [ ] 移动端字段单列，按钮全宽或易于触达。
- [ ] 移动端账号列表不出现横向滚动表格。

### 15.2 视觉

- [ ] 页面存在清楚的 Canvas / Surface / Overlay 三层。
- [ ] Card 圆角、Field 圆角、Button 圆角符合层级。
- [ ] 品牌紫没有大面积滥用。
- [ ] 大容器没有同时使用深边框与重阴影。
- [ ] 列表没有纵向栅格线。
- [ ] 账号名称是列表中的第一视觉层级。
- [ ] 暗色主题不是简单反色，Surface 仍有层级。

### 15.3 表单

- [ ] 所有字段拥有可见 Label。
- [ ] 账号链接使用 text，允许网址、用户名或账号 ID。
- [ ] 账号类型与平台使用 HeroUI 自定义 Select。
- [ ] Select Popover 的圆角、阴影、选中态和动画与页面一致。
- [ ] 详情支持多行且有合理长度上限。
- [ ] 校验错误说明问题并告诉用户如何修正。
- [ ] 提交失败不会清空输入。

### 15.4 交互

- [ ] Button、Input、Select、List Item 覆盖 Hover、Pressed、Focus、Disabled。
- [ ] 提交时阻止重复点击并保持按钮宽度。
- [ ] 添加成功有 Toast。
- [ ] 删除使用 AlertDialog，不使用原生 confirm。
- [ ] 删除失败不会先移除账号。
- [ ] Popover 和 Dialog 关闭后焦点回到合理位置。

### 15.5 无障碍

- [ ] 全流程可只使用键盘完成。
- [ ] Focus visible 在亮色与暗色主题都清楚。
- [ ] 图标按钮拥有 Tooltip 和 aria-label。
- [ ] 错误不只依赖红色。
- [ ] 移动端点击目标至少 44×44px。
- [ ] 支持 prefers-reduced-motion。
- [ ] 文字和关键控件满足对比度要求。

### 15.6 工程

- [ ] Tailwind CSS 在 HeroUI Styles 之前导入。
- [ ] 主题色通过语义变量集中声明。
- [ ] 业务 CSS 不散落大量十六进制颜色。
- [ ] 没有复制 HeroUI 内部交互逻辑。
- [ ] 没有使用大量 !important。
- [ ] 组件枚举以稳定 id 存储，以中文 label 展示。
- [ ] 亮色、暗色、桌面、移动端都完成视觉回归检查。

---

## 16. 实施优先级

### P0：解决当前“默认、干巴”的核心问题

1. 接入 Tailwind CSS v4、HeroUI Styles 和 HeroUI React。
2. 建立 FlexibleFox 亮暗主题语义变量。
3. 将 Input、TextArea、Button 替换为 HeroUI 组件。
4. 将两个原生 Select 替换为 HeroUI Select + ListBox。
5. 补齐 Focus、Hover、Pressed、Invalid、Loading 状态。

### P1：让账号库真正成为 C 端产品

1. 把账号列表改为以 Avatar + 名称为视觉核心的内容列表。
2. 增加平台与类型 Chip。
3. 增加 Empty State、Skeleton 和 Toast。
4. 删除操作改为 AlertDialog。
5. 完成移动端内容卡片布局。

### P2：建立可持续设计系统

1. 提取 AppButton、AppTextField、AppSelect 等薄封装。
2. 建立 Story / Showcase 页面展示全部状态。
3. 增加键盘流程和无障碍自动检查。
4. 为亮暗主题和关键断点建立视觉回归截图。
5. 每次 HeroUI 升级按本规范第 2.3 节复核。

---

## 17. 官方参考资料

本规范研究和核对了以下 HeroUI 官方资料：

- [HeroUI v3.2.4 发布说明](https://heroui.com/en/docs/react/releases/v3-2-4)
- [HeroUI v3 入门](https://heroui.com/en/docs/react/getting-started)
- [设计原则](https://heroui.com/en/docs/react/getting-started/design-principles)
- [颜色系统](https://heroui.com/en/docs/react/getting-started/colors)
- [主题系统](https://heroui.com/en/docs/react/getting-started/theming)
- [暗色模式](https://heroui.com/en/docs/react/getting-started/dark-mode)
- [样式与状态](https://heroui.com/en/docs/react/getting-started/styling)
- [动画](https://heroui.com/en/docs/react/getting-started/animation)
- [组合与扩展](https://heroui.com/en/docs/react/getting-started/composition)
- [快速开始](https://heroui.com/en/docs/react/getting-started/quick-start)
- [Vite 等框架接入](https://heroui.com/en/docs/react/getting-started/frameworks)
- [Button](https://heroui.com/en/docs/react/components/button)
- [Card](https://heroui.com/en/docs/react/components/card)
- [Surface](https://heroui.com/en/docs/react/components/surface)
- [TextField](https://heroui.com/en/docs/react/components/text-field)
- [Input](https://heroui.com/en/docs/react/components/input)
- [TextArea](https://heroui.com/en/docs/react/components/text-area)
- [Select](https://heroui.com/en/docs/react/components/select)
- [ListBox](https://heroui.com/en/docs/react/components/list-box)
- [Typography](https://heroui.com/en/docs/react/components/typography)
- [Chip](https://heroui.com/en/docs/react/components/chip)
- [Table](https://heroui.com/en/docs/react/components/table)
- [Toast](https://heroui.com/en/docs/react/components/toast)
- [Modal](https://heroui.com/en/docs/react/components/modal)
- [Alert](https://heroui.com/en/docs/react/components/alert)
- [Skeleton](https://heroui.com/en/docs/react/components/skeleton)
- [全部 React 组件](https://heroui.com/en/docs/react/components)
- [HeroUI 默认主题变量源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css)
- [HeroUI 共享主题源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/shared/theme.css)
- [HeroUI Button 样式源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)
- [HeroUI Input 样式源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/input.css)
- [HeroUI Select 样式源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/select.css)
- [Tailwind CSS Vite 安装说明](https://tailwindcss.com/docs/installation/using-vite)

---

## 18. 一句话设计判断

当不确定一个设计是否符合本规范时，问：

> 它是否让第一次使用产品的人，更轻松地看懂下一步、更安心地完成操作，并在每次交互中感受到自然、柔和、可预测的反馈？

如果答案是否定的，就不要用“更炫”“组件库默认如此”或“后台一般都这样”作为理由。
