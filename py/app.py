from flask import Flask
import numpy as np
import cv2
import pytesseract

app = Flask(__name__)

def is_light(a):
    colors, count = np.unique(a.flatten(), return_counts=True)
    return colors[count.argmax()]

def process_image(path):
    img = cv2.imread(path) # read in image

    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) # gray scale

    # if(is_light(img) == 1):
    #     img = cv2.threshold(img, 0, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY)[1]
    # else:
    #     img = cv2.threshold(img, 0, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY_INV)[1]
    img = cv2.threshold(img, 0, 255, cv2.THRESH_OTSU + cv2.THRESH_BINARY)[1]

    return img

def ocr(img):
    rect_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (18, 18))
    dilation = cv2.dilate(img, rect_kernel, iterations = 1)
    contours, _ = cv2.findContours(dilation, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    full_text = ""
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        cropped = img[y:y + h, x:x + w]

        text = pytesseract.image_to_string(cropped)
        full_text = full_text + text
        
@app.route('/')
def pipeline(imgpath):
	return ocr(process_image(imgpath))