# 沉默宇宙 · Next.js + Supabase

这个目录已经是新的可上线基座。

## 当前已经完成

- Next.js 项目已创建
- `@supabase/supabase-js` 已安装
- Supabase SQL 脚本已放到 `supabase/schema.sql`
- 最小在线宇宙页已接入
- 本地 `.env.example` 已准备好

## 你现在还需要手动做的事

1. 在 Supabase 创建项目
2. 到 Supabase SQL Editor 执行 `supabase/schema.sql`
3. 把 `.env.example` 复制成 `.env.local`
4. 在 `.env.local` 填入

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 Supabase publishable key
```

5. 本地运行

```bash
npm run dev
```

6. 验证本地流程

- 创建一颗星
- 刷新后仍识别自己的星
- 第二个浏览器窗口打开后在线人数增加
- 点击别人星体后能写入一次共振

7. 推到 GitHub，再导入 Vercel

## 目录

- `app/page.tsx`
  最小页面入口
- `components/universe-client.tsx`
  最小在线宇宙客户端
- `lib/silent-resonance.ts`
  Supabase 数据访问层
- `lib/supabase/client.ts`
  Supabase 客户端初始化
- `supabase/schema.sql`
  建表、RLS、RPC、Realtime 配置

## 下一步建议

先确认这版最小在线链路跑通，再把你现在 Vite 版本里的宇宙视觉、创建面板和共振动画逐步迁过来。
