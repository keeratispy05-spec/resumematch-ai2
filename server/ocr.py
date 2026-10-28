
import sys
import json
import base64
import io

import pymupdf
import pytesseract
from PIL import Image


def main():
    request = json.loads(sys.stdin.read())
    pdf_base64 = request.get("pdfBase64", "")

    if not pdf_base64:
        raise ValueError("ไม่พบข้อมูล PDF")

    pdf_bytes = base64.b64decode(pdf_base64, validate=True)

    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as pdf:
        if pdf.page_count == 0:
            raise ValueError("PDF ไม่มีหน้าเอกสาร")

        if pdf.page_count > 30:
            raise ValueError("PDF มีมากเกินไป จำกัดไม่เกิน 30 หน้า")

        pages_text = []

        for page_number, page in enumerate(pdf):
            pix = page.get_pixmap(
                matrix=pymupdf.Matrix(2, 2),
                alpha=False
            )

            image = Image.open(
                io.BytesIO(pix.tobytes("png"))
            ).convert("RGB")

            text = pytesseract.image_to_string(
                image,
                lang="tha+eng",
                config="--psm 3"
            ).strip()

            pages_text.append(
                f"--- หน้า {page_number + 1} ---\n{text}"
            )

        result = "\n\n".join(pages_text).strip()

        if len(result) < 10:
            raise ValueError(
                "อ่านข้อความไม่ได้ กรุณาตรวจสอบคุณภาพ PDF และภาษา OCR"
            )

        print(json.dumps(
            {
                "text": result,
                "method": "local-tesseract-ocr"
            },
            ensure_ascii=False
        ))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps(
            {"error": str(exc)},
            ensure_ascii=False
        ))
        sys.exit(1)
