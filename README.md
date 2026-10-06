# Jewelry Jam Out (PoC Web Playable)

PoC web playable hoàn chỉnh cho game mobile portrait **Jewelry Jam Out** với cơ chế Tap Out, gold bead chain withdrawal, Sparkle Hole portal routing và Luxury Handbag Reveal.

---

## 1. Cách cài đặt và chạy

### Chạy trực tiếp qua dev server:
```bash
npm install
npm run dev
```
Truy cập `http://localhost:3000`.

### Tham số URL hỗ trợ:
- `?level=3`: Mở trực tiếp Level 3 (màn showcase chính, gần reference nhất).
- `?debug=1`: Kích hoạt Debug Inspector (hiển thị grid overlay, solvability status, solver order, nút Auto-Solve giả lập từng bước gỡ piece thật và nút chạy bộ 12 unit tests).
- Ví dụ: `http://localhost:3000/?level=3&debug=1`

### Chạy kiểm tra Logic Tests:
```bash
npx tsx -e 'import { runAllLogicTests } from "./src/game/tests.ts"; const res = runAllLogicTests(); console.log(res);'
```

---

## 2. Quy tắc Core Gameplay (Tap Out & Snake Withdrawal)

1. **Cấu trúc mỗi Piece**:
   - Đúng **1 charm/gem head** (Pear, Heart, Rectangle, Oval) với golden bezel và màu đá (Sapphire, Emerald, Ruby, Citrine).
   - Đúng **1 chain body** bằng **Gold Bead Chain** (các bi tròn vàng 3D nối nhau).
   - Đúng **1 hướng thoát cố định** (`up`, `down`, `left`, `right`). Hướng nhọn của Pear/Heart và ngàm bezel của Rectangle/Oval chỉ theo hướng thoát.
2. **Simulation trước khi rút (Pre-flight Check)**:
   - Khi tap vào piece, engine giả lập từng bước di chuyển của snake trên bản sao logic occupancy.
   - Nếu gặp bất kỳ piece nào khác cản đường (kể cả ở xa trên cùng đường thoát) hoặc tự va chạm thân, piece bị coi là **BLOCKED**.
   - Nếu bị blocked: Gem & chain jiggle ngắn 2-4px, phát âm thanh metallic click, ô va chạm được viền cảnh báo trong 350ms. Không mất mạng, không nhuộm đỏ toàn màn hình.
3. **Cơ chế rút dây (Snake Withdrawal)**:
   - Không di chuyển nguyên khối rigid block.
   - Gem head tiến lên theo hướng thoát. Từng bead của chain di chuyển vào vị trí trước đó của bead đứng trước. Các góc 90° dần được kéo thẳng và biến mất theo đúng tuyến đường.
4. **Cinematic Portal Routing**:
   - Sau khi toàn bộ piece đã rời khỏi board, piece chuyển sang phase 2: bay theo đường cong cubic Bezier mượt mà vào **Sparkle Hole** (portal) ở góc trên bên phải, thu nhỏ dần và biến mất kèm hiệu ứng nổ sao (burst particles) và chime âm thanh.
5. **Full Reveal**:
   - Khi tất cả piece được giải hoàn tất, các nét đứt và chấm xám mờ dần, túi xách sapphire chần quả trám sang trọng viền kim cương (khớp chính xác tỷ lệ và vị trí của silhouette) xuất hiện với hiệu ứng shine sweep lấp lánh và nhạc chuông hoàn thành.
   - Sau 1 giây, nút **Next Level** (hoặc Play Again) xuất hiện nhẹ nhàng ở cạnh dưới.

---

## 3. Cách thêm / sửa dữ liệu Level

Dữ liệu level nằm tại `src/game/levels.ts`.

Mỗi piece có cấu trúc:
```typescript
{
  id: 'L3_top1_teal',
  gemShape: 'pear',        // 'pear' | 'heart' | 'rectangle' | 'oval'
  gemColor: 'emerald',     // 'sapphire' | 'emerald' | 'ruby' | 'citrine'
  exitDirection: 'right',  // 'up' | 'down' | 'left' | 'right'
  path: expandWaypoints([  // Tự động mở rộng các điểm gấp khúc 90 độ thành các ô kề nhau
    [9, 2], // Head cell
    [2, 2]  // Tail waypoint
  ])
}
```

Hàm `expandWaypoints` cho phép tác giả level chỉ cần nhập các tọa độ đầu, điểm bẻ góc và đuôi. Hệ thống tự động kiểm tra:
- Không chồng lấn ô giữa các piece.
- Không tự cắt thân.
- Chain đi liền kề 4 hướng (Manhattan distance = 1).
- Solver tích hợp (`solveLevel`) sẽ tự động chứng minh level có ít nhất một thứ tự giải hợp lệ.
