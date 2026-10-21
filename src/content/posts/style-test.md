---
title: 排版測試：每一種 Markdown 元素
description: 開發用的樣式檢查頁，只會出現在 astro dev，不會被部署。
date: 2026-10-20
tags: [meta, typography]
draft: true
---

這是一段內文，包含**粗體**、*強調*、`inline code`、[連結](https://fearnot.tw/) 與註腳[^1]。中英混排如 TCP handshake 與 HTTP/3 之間的空白由 `text-autospace` 自動處理。按 <kbd>Ctrl</kbd> + <kbd>C</kbd> 複製。

## 第一節：清單

1. 有序清單第一項
2. 第二項，文字比較長，用來測試換行時的對齊與行距是否舒適，以及標點擠壓。
3. 第三項

- 無序清單
  - 巢狀項目
- [x] 已完成的工作
- [ ] 還沒完成的工作

### 小節標題

#### 四級標題

一般段落。

## 第二節：程式碼

```python
# 計算 flag 的 checksum
def checksum(flag: str) -> int:
    total = 0
    for i, ch in enumerate(flag):
        total ^= ord(ch) << (i % 8)
    return total & 0xFFFF

print(checksum("SCIST{h3ll0_w0rld}"))
```

```ts
interface Host { name: string; ip: `${number}.${number}.${number}.${number}`; up: boolean }
const hosts: Host[] = await fetch("/api/hosts").then((r) => r.json());
export const down = hosts.filter((h) => !h.up).map((h) => h.name);
```

```
plain text block with no language
```

## 第三節：引用與表格

> 引用的段落。好的防禦，是讓更多人不再害怕。
>
> — 第二段引用

| 埠 | 協定 | 用途 |
| --- | --- | --- |
| 22 | TCP | SSH |
| 53 | UDP | DNS |
| 443 | TCP | HTTPS |

---

## 第四節：結尾

最後一段。

[^1]: 這是一個註腳的內容。
