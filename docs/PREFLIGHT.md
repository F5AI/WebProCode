# PREFLIGHT — kiểm tra trước khi build một tính năng

> Giống preflight trước khi render: 5 phút hỏi trước rẻ hơn 3 vòng sửa sau.
> Claude đi qua danh sách này trước mỗi tính năng. Mục nào yêu cầu của anh đã trả lời thì ghi lại câu trả lời; mục nào chưa có thì hỏi anh, gom thành **một lần hỏi**, tối đa 5 câu, mỗi câu kèm 2–3 lựa chọn.
> Ghi câu trả lời vào spec hoặc PROGRESS trước khi viết code. Mục nào không áp dụng thì ghi "không áp dụng" kèm lý do một dòng.

| # | Câu hỏi | Vì sao phải hỏi (luật) |
|---|---|---|
| 1 | **Một câu:** tính năng này giúp anh làm được việc gì mà hôm nay chưa làm được? | Chặn build sai trục (R-12) |
| 2 | **Lối vào:** anh bấm từ đâu để tới nó? Nó đứng ở đâu trong thứ tự công việc? | R-03 |
| 3 | **Tham chiếu:** giống app nào anh đang dùng? Có ảnh mẫu không? Sáng hay tối, hai tone màu chính là gì? | R-04 (FIX-001) |
| 4 | **Thiết bị:** dùng trên PC, tablet hay điện thoại, ở cỡ nào? | R-02 |
| 5 | **Phải loại ra gì?** 3 ví dụ đúng và 3 ví dụ sai lấy từ dữ liệu thật (với lọc hoặc phân loại) | R-09 |
| 6 | **Khi hỏng:** máy tắt, mất mạng, hết đăng nhập, dịch vụ ngoài lỗi thì anh thấy gì? | R-08 |
| 7 | **Khi chạm giới hạn** (tiền, quota): ai quyết, quyết bằng nút nào? | R-05 |
| 8 | **Con số nào anh sẽ muốn chỉnh sau?** Những số đó phải nằm trong cài đặt. | R-14 |
| 9 | **Số liệu bên ngoài** (giá, quota, giới hạn API): đã tra nguồn chính thức nào, ngày nào? | R-06 |
| 10 | **Nghiệm thu:** ít nhất 3 câu dạng "Khi anh làm X thì thấy Y". Claude tự kiểm đúng 3 câu này trước khi báo xong. | R-01, R-02 |
| 11 | **Ưu tiên trên màn:** 3 thứ anh cần thấy đầu tiên, theo thứ tự? Cái gì thu gọn hay giấu đi? Một màn tối đa bao nhiêu mục trước khi phải chia nhóm hay chia trang? | R-04 (kỳ 2: GD-05, GD-08, DL-04) |

## Mẫu ghi nhanh (dán vào spec / PROGRESS)
```
### Preflight — <tên tính năng> — <ngày>
1. Việc: …
2. Lối vào: …
3. Tham chiếu: …
4. Thiết bị: …
5. Loại ra: … | Đúng: … | Sai: …
6. Khi hỏng: …
7. Giới hạn: …
8. Số để trong cài đặt: …
9. Số liệu ngoài: … (nguồn, ngày)
10. Nghiệm thu: Khi … thì … / Khi … thì … / Khi … thì …
11. Ưu tiên trên màn: 1) … 2) … 3) … | giấu: … | tối đa … mục/màn
```
