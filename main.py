import json
import os
import subprocess

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

from io import BytesIO

import uvicorn
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

app = FastAPI(debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"text": "x-srt"}


@app.post("/stt")
async def stt(file: UploadFile):
    content: bytes = await file.read()
    filename = './.cache/' + file.filename
    with open(filename, "wb") as f:
        f.write(content)

    media_data = ffprobe(filename)
    text = speech_to_text(content)

    return {"text": text, "bitrate": media_data['format']['bit_rate']}


def ffprobe(filename):
    pname = 'ffprobe.exe -v quiet -print_format json -show_format "%s"' % filename
    result = subprocess.Popen(pname, shell=False, stdout=subprocess.PIPE).stdout
    list_std = result.readlines()
    str_tmp = ''
    for item in list_std:
        str_tmp += bytes.decode(item.strip())
    json_data = json.loads(str_tmp)
    print(json_data)
    return json_data


def speech_to_text(content):
    model = WhisperModel(model_size_or_path="base", device="cpu", compute_type="int8",
                         download_root="./models/", local_files_only=True)
    segments, _ = model.transcribe(BytesIO(content), beam_size=5, language="zh", initial_prompt="简体")
    text = "".join(segment.text for segment in segments)
    print(text)
    return text


if __name__ == '__main__':
    # with open("g:\\c93d84658f52cabf0ca05209aa886c10.MP4", "rb") as f:
    #     stt(f.read())
    if not os.path.exists('./models'):
        os.makedirs('./models')
    if not os.path.exists('./.cache'):
        os.makedirs('./.cache')
    uvicorn.run(app, host='0.0.0.0', port=20000, workers=1)
