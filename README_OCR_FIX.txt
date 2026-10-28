ResumeMatch OCR Fix

ไฟล์ใน ZIP นี้เป็นไฟล์ที่แก้แล้วจากโปรเจกต์ที่ส่งมา:
- server/index.js
- src/utils/pdf.ts
- src/App.tsx

วิธีใช้:
1. สำรองไฟล์เดิมทั้ง 3 ไฟล์ไว้ก่อน
2. แตก ZIP ลงในโฟลเดอร์โปรเจกต์ ResumeMatch_Enhanced โดยให้ทับไฟล์เดิมตามโครงสร้างโฟลเดอร์
3. ตรวจว่า Tesseract อยู่ที่ C:\Program Files\Tesseract-OCR\tesseract.exe และติดตั้งภาษา tha กับ eng แล้ว
4. ปิดเซิร์ฟเวอร์เก่าด้วย Ctrl+C ใน Terminal ทั้งสองหน้าต่าง
5. เปิด Terminal แรกแล้วรัน npm run server
6. เปิด Terminal ที่สองแล้วรัน npm run dev
7. เปิดเว็บจาก URL ที่ Vite แสดง แล้วลองอัปโหลด PDF สแกนอีกครั้ง

หมายเหตุ: ใช้ Tesseract ในเครื่อง ไม่ต้องตั้ง OPENAI_API_KEY เพื่อ OCR. ฟังก์ชัน AI insights ยังต้องใช้ API key แยกต่างหาก.
