import pathlib
import textwrap
import sqlite3
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests
import os

app = Flask(__name__)
CORS(app)

# Cấu hình Google Gemini API
API_KEY_GEMINI = "AIzaSyCl0J29n4CN9rHoiiU4x_1feLjkWA_WH9E"
genai.configure(api_key=API_KEY_GEMINI)
model = genai.GenerativeModel('gemini-1.5-flash')

# Cấu hình OpenWeatherMap API
API_KEY_WEATHER = "bb83e900d7bea0103169bd81956dcbd9"
WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

# Cấu hình Geoapify API
API_KEY_GEOAPIFY = "81fa2a2d04434abeb9e08a71ad2434c0"
GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1/geocode"

# Initialize SQLite database
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

# Call init_db when the app starts
init_db()

# Endpoint to save project data
@app.route('/api/project/save', methods=['POST'])
def save_project():
    try:
        data = request.json
        project_id = data.get('projectId')
        project_data = data.get('data')

        if not project_id or not project_data:
            print(f"Missing projectId or data: {data}")
            return jsonify({'error': 'Missing projectId or data'}), 400

        # Convert project_data to JSON string
        data_json = json.dumps(project_data)

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO projects (project_id, data)
                VALUES (?, ?)
            """, (project_id, data_json))
            conn.commit()

        return jsonify({'success': True})
    except Exception as e:
        print(f"Error saving project: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint to load project data
@app.route('/api/project/load', methods=['POST'])
def load_project():
    try:
        data = request.json
        project_id = data.get('projectId')

        if not project_id:
            print("Missing projectId")
            return jsonify({'error': 'Missing projectId'}), 400

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM projects WHERE project_id = ?", (project_id,))
            result = cursor.fetchone()

        if result:
            project_data = json.loads(result[0])
            return jsonify({'success': True, 'data': project_data})
        else:
            print(f"No data found for projectId: {project_id}")
            return jsonify({'success': False})

    except Exception as e:
        print(f"Error loading project: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint to delete project data
@app.route('/api/project/delete', methods=['POST'])
def delete_project():
    try:
        data = request.json
        project_id = data.get('projectId')

        if not project_id:
            print("Missing projectId")
            return jsonify({'error': 'Missing projectId'}), 400

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
            conn.commit()

        print(f"Deleted project data for projectId: {project_id}")
        return jsonify({'success': True})

    except Exception as e:
        print(f"Error deleting project: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint cho Google Gemini API
@app.route('/api/generate', methods=['POST'])
def generate_content():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        response = model.generate_content(prompt)
        return jsonify({'result': response.text})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint cho OpenWeatherMap API
@app.route('/api/weather', methods=['POST'])
def get_weather():
    try:
        data = request.json
        city = data.get('city', '')
        if not city:
            return jsonify({'error': 'Vui lòng cung cấp tên thành phố'}), 400

        url = f"{WEATHER_BASE_URL}?q={city}&appid={API_KEY_WEATHER}&units=metric"
        print(f"Calling OpenWeatherMap API: {url}")
        response = requests.get(url)
        weather_data = response.json()
        if response.status_code == 200:
            result = {
                'city': city,
                'temperature': weather_data['main']['temp'],
                'description': weather_data['weather'][0]['description'],
                'humidity': weather_data['main']['humidity'],
                'wind_speed': weather_data['wind']['speed']
            }
            return jsonify({'result': result})
        else:
            return jsonify({'error': weather_data.get('message', 'Không thể lấy dữ liệu thời tiết')}), 400
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Endpoint cho Geoapify API (GPS)
@app.route('/api/location', methods=['POST'])
def get_location():
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')

        if not lat or not lon:
            return jsonify({'error': 'Vui lòng cung cấp tọa độ lat/lon'}), 400

        # Gọi Geoapify Reverse Geocoding API để lấy địa chỉ từ tọa độ
        url = f"{GEOAPIFY_BASE_URL}/reverse?lat={lat}&lon={lon}&apiKey={API_KEY_GEOAPIFY}"
        response = requests.get(url)
        location_data = response.json()

        if response.status_code == 200 and location_data.get('features'):
            feature = location_data['features'][0]['properties']
            result = {
                'address': feature.get('formatted', 'Không tìm thấy địa chỉ'),
                'city': feature.get('city', ''),
                'country': feature.get('country', ''),
                'lat': lat,
                'lon': lon
            }
            return jsonify({'result': result})
        else:
            return jsonify({'error': 'Không thể lấy thông tin vị trí'}), 400

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)