import os
import json
import sqlite3
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
    
import google.generativeai as genai

# Lấy API key từ biến môi trường
API_KEY_GEMINI = os.environ.get("API_KEY_GEMINI")
API_KEY_WEATHER = os.environ.get("API_KEY_WEATHER")
API_KEY_GEOAPIFY = os.environ.get("API_KEY_GEOAPIFY")

# Kiểm tra API keys bắt buộc
if not API_KEY_GEMINI:
    raise ValueError("Missing environment variable: API_KEY_GEMINI")
if not API_KEY_WEATHER:
    raise ValueError("Missing environment variable: API_KEY_WEATHER")
if not API_KEY_GEOAPIFY:
    raise ValueError("Missing environment variable: API_KEY_GEOAPIFY")

# Cấu hình Google Gemini API
genai.configure(api_key=API_KEY_GEMINI)
model = genai.GenerativeModel('gemini-1.5-flash')

# Base URLs
WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1/geocode"

# Setup Flask
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://gquyenhsb.github.io"}})

# SQLite DB setup
DB_PATH = "projects.db"

def init_db():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )
            """)
            conn.commit()
    except Exception as e:
        print(f"Error initializing database: {str(e)}")

init_db()

# === ROUTES === #

@app.route('/')
def home():
    return "✅ Flask backend is live on Render!"

@app.route('/api/project/save', methods=['POST'])
def save_project():
    try:
        data = request.json
        project_id = data.get('projectId')
        project_data = data.get('data')

        if not project_id or not project_data:
            return jsonify({'error': 'Missing projectId or data'}), 400

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO projects (project_id, data)
                VALUES (?, ?)
            """, (project_id, json.dumps(project_data)))
            conn.commit()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/project/load', methods=['POST'])
def load_project():
    try:
        data = request.json
        project_id = data.get('projectId')

        if not project_id:
            return jsonify({'error': 'Missing projectId'}), 400

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM projects WHERE project_id = ?", (project_id,))
            result = cursor.fetchone()

        if result:
            return jsonify({'success': True, 'data': json.loads(result[0])})
        else:
            return jsonify({'success': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/project/delete', methods=['POST'])
def delete_project():
    try:
        data = request.json
        project_id = data.get('projectId')

        if not project_id:
            return jsonify({'error': 'Missing projectId'}), 400

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
            conn.commit()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate_content():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        response = model.generate_content(prompt)
        return jsonify({'result': response.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/weather', methods=['POST'])
def get_weather():
    try:
        city = request.json.get('city', '')
        if not city:
            return jsonify({'error': 'Vui lòng cung cấp tên thành phố'}), 400

        url = f"{WEATHER_BASE_URL}?q={city}&appid={API_KEY_WEATHER}&units=metric"
        response = requests.get(url, timeout=10)
        weather_data = response.json()

        if response.status_code == 200:
            return jsonify({
                'result': {
                    'city': city,
                    'temperature': weather_data['main']['temp'],
                    'description': weather_data['weather'][0]['description'],
                    'humidity': weather_data['main']['humidity'],
                    'wind_speed': weather_data['wind']['speed']
                }
            })
        else:
            return jsonify({'error': weather_data.get('message', 'Lỗi lấy dữ liệu thời tiết')}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/location', methods=['POST'])
def get_location():
    try:
        lat = request.json.get('lat')
        lon = request.json.get('lon')

        if not lat or not lon:
            return jsonify({'error': 'Vui lòng cung cấp tọa độ'}), 400

        url = f"{GEOAPIFY_BASE_URL}/reverse?lat={lat}&lon={lon}&apiKey={API_KEY_GEOAPIFY}"
        response = requests.get(url, timeout=10)
        data = response.json()

        if response.status_code == 200 and data.get('features'):
            feature = data['features'][0]['properties']
            return jsonify({
                'result': {
                    'address': feature.get('formatted', 'Không tìm thấy địa chỉ'),
                    'city': feature.get('city', ''),
                    'country': feature.get('country', ''),
                    'lat': lat,
                    'lon': lon
                }
            })
        else:
            return jsonify({'error': 'Không thể lấy thông tin vị trí'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === RUN APP === #
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
