#!/usr/bin/env node
/**
 * 生成根目录「项目演示图集.md」。
 *
 * 分类和名称取自 _projects_mapped.json，封面图沿用 docs/previews/groups/*.md 里
 * 已经选定的那一张，不再重新挑图；单个项目的多图详览仍在 docs/previews/projects/。
 *
 * 用法：node scripts/generate-gallery.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, '项目演示图集.md')

// 展示顺序固定，不随 JSON 里的先后变化
const CATEGORIES = [
  ['education', '🎓 教育教学与培训'],
  ['health', '🏥 医疗健康与养老'],
  ['culture-travel', '🎬 文化娱乐与文旅'],
  ['community', '🏘️ 社区治理与物业'],
  ['dev-sec-ops', '🛠️ 研发运维与安全合规'],
  ['retail', '🛒 电商零售与交易'],
  ['gov-civic', '🏛️ 政务监管与公共服务'],
  ['campus-life', '🎉 校园生活与社交'],
  ['campus-service', '🚌 校园设施与后勤'],
  ['agri-food', '🌾 农林食品与环保'],
  ['local-life', '📍 生活服务与 O2O'],
  ['mfg-supply', '🏭 生产制造与供应链'],
  ['hr-office', '💼 企业办公与人力'],
  ['charity', '❤️ 公益慈善与帮扶'],
  ['collab-tools', '🧩 通用内容与协作工具'],
]
const COLUMNS = 3
const THUMB = '100%' // 单元格宽 33%，图随容器缩放，窄屏也不会撑破版面

const projects = JSON.parse(readFileSync(join(root, '_projects_mapped.json'), 'utf8'))

// 未知分类会让整类项目凭空消失，所以直接报错而不是跳过
const known = new Set(CATEGORIES.map(([slug]) => slug))
const unknown = [...new Set(projects.map((p) => p.group).filter((g) => !known.has(g)))]
if (unknown.length) {
  throw new Error(`_projects_mapped.json 里有未登记的业务主类：${unknown.join(', ')}`)
}

// 封面图取自分组页里已有的 `![001](../assets/001/xxx.png)`
const covers = new Map()
for (const file of readdirSync(join(root, 'docs/previews/groups'))) {
  if (!file.endsWith('.md')) continue
  const text = readFileSync(join(root, 'docs/previews/groups', file), 'utf8')
  for (const m of text.matchAll(/!\[(\d{3})\]\(\.\.\/assets\/(\d{3})\/([^)]+)\)/g)) {
    covers.set(m[1], `docs/previews/assets/${m[2]}/${m[3]}`)
  }
}

const cell = (p) => {
  const label = `<b>${p.number}</b> ${p.title}`
  const cover = covers.get(p.number)
  if (!cover) return `<td align="center" width="33%">${label}<br><sub>截图待补充</sub></td>`
  return (
    `<td align="center" width="33%">` +
    `<a href="docs/previews/projects/${p.number}.md"><img src="${cover}" width="${THUMB}" alt="${p.number} ${p.title}"></a>` +
    `<br>${label}</td>`
  )
}

const grid = (list) => {
  const rows = []
  for (let i = 0; i < list.length; i += COLUMNS) {
    const slice = list.slice(i, i + COLUMNS)
    while (slice.length < COLUMNS) slice.push(null)
    rows.push(`<tr>${slice.map((p) => (p ? cell(p) : '<td></td>')).join('')}</tr>`)
  }
  return `<table>\n${rows.join('\n')}\n</table>`
}

const sections = CATEGORIES.map(([slug, label]) => {
  const list = projects.filter((p) => p.group === slug)
  return [
    '<a name="' + slug + '"></a>',
    `## ${label}`,
    '',
    `<p align="center"><sub>${list.length} 个项目 · 点击图片查看多图详览</sub></p>`,
    '',
    grid(list),
  ].join('\n')
}).join('\n\n---\n\n')

const tocRows = []
for (let i = 0; i < CATEGORIES.length; i += COLUMNS) {
  const slice = CATEGORIES.slice(i, i + COLUMNS)
  while (slice.length < COLUMNS) slice.push(null)
  tocRows.push(
    `<tr>${slice
      .map(([slug, label]) =>
        slug
          ? `<td align="center"><a href="#${slug}">${label}</a> <sub>${projects.filter((p) => p.group === slug).length}</sub></td>`
          : '<td></td>',
      )
      .join('')}</tr>`,
  )
}

const md = `# 项目演示图集

> ${projects.length} 个毕业设计项目的运行截图总览。每张图是该项目的封面截图，点击图片进入该项目的多图详览页。

<p align="center">
  <b>${projects.length}</b> 个项目 · <b>${CATEGORIES.length}</b> 个业务分类 · <b>${covers.size}</b> 张封面截图
</p>

## 分类导航

<table>
${tocRows.join('\n')}
</table>

---

${sections}

---

<p align="center">
  每个项目的完整截图、端口、数据库和启动步骤见 <a href="docs/previews/projects/">项目详览页</a> 与 <a href="docs-site/index.md">文档站</a>。
</p>

<p align="center">
  需要定制或咨询？<a href="http://36.140.150.167:3100/">进入网站咨询</a>
</p>
`

writeFileSync(OUT, md, 'utf8')

const missing = projects.filter((p) => !covers.has(p.number)).map((p) => p.number)
console.log(`已生成 ${OUT}`)
console.log(`项目 ${projects.length} 个 / 分类 ${CATEGORIES.length} 个 / 封面 ${covers.size} 张`)
if (missing.length) console.warn(`缺少封面图的项目：${missing.join(', ')}`)