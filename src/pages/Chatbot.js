import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Chatbot.css';
import dashboardImage from '../assets/tuoi-cay.png'; 
import { API_BASE_URL } from '../config';


function Chatbot({ projectId, projectName, createdAt  }) {
  const [fruitType, setFruitType] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState('');
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [projectInitialized, setProjectInitialized] = useState(false);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStatus, setTaskStatus] = useState({});

  const inputRef = useRef(null);
  const navigate = useNavigate();
  const hasFetchedLocation = useRef(false);
  const isFirstSave = useRef(true);
  const hasGeneratedPrompt = useRef(false);
  const API_BASE_URL = "https://agriguard-backend.onrender.com";



  // Load project data from database when component mounts
  const hasLoadedData = useRef(false);

  useEffect(() => {
    if (!projectId || hasLoadedData.current) return;
  
    hasLoadedData.current = true;
    const loadProjectData = async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/project/load`, { projectId });
        if (response.data.success) {
          const data = response.data.data;
          setFruitType(data.fruitType || '');
          setCity(data.city || '');
          setResult(data.result || '');
          setWeather(data.weather || null);
          setLocation(data.location || null);
          setProjectInitialized(data.projectInitialized || false);
          setHistory(data.history || []);
          setTasks(data.tasks || []);
          setTaskStatus(data.taskStatus || {});
        }
      } catch (err) {
        console.error('Load error:', err);
        setResult('Lỗi tải dữ liệu: ' + (err.response?.data?.error || err.message));
      }
    };
  
    loadProjectData();
  
    if (!projectInitialized && !hasFetchedLocation.current) {
      hasFetchedLocation.current = true;
      handleGetLocation();
    }
    if (inputRef.current && !projectInitialized) inputRef.current.focus();
  }, [projectId, projectInitialized]);
  

  const generateScheduleDates = () => {
    if (!createdAt || !createdAt.date) return [];
    const base = new Date(createdAt.date.split('/').reverse().join('/')); // "dd/mm/yyyy" -> Date
    const result = [];
    for (let i = 0; i < 4; i++) {
      const next = new Date(base);
      next.setDate(base.getDate() + i * 7);
      result.push(next.toLocaleDateString('vi-VN'));
    }
    return result;
  };
  
  const scheduleDates = generateScheduleDates();
  


  // Save project data to database whenever relevant state changes
  const isFirstRender = useRef(true);
  const isHandlingPrompt = useRef(false);
  
  useEffect(() => {
    if (!projectId || isFirstSave.current) {
      isFirstSave.current = false;
      return;
    }
  
    const saveData = async () => {
      const payload = {
        fruitType, city, result, weather, location, projectInitialized,
        history, tasks, taskStatus
      };
  
      try {
        await axios.post(`${API_BASE_URL}/api/project/save`, {
          projectId,
          data: payload
        });
      } catch (e) {
        console.error('Save error:', e);
      }
    };
  
    const stringifiedData = JSON.stringify({ fruitType, city, result, weather, location, projectInitialized, history, tasks, taskStatus });
    saveData();
  
  }, [fruitType, city, result, weather, location, projectInitialized, history, tasks, taskStatus, projectId]);
  
  // Fetch weather every 10 minutes for real-time updates when city is available
  useEffect(() => {
    if (!city) return;

    // Fetch weather immediately
    fetchWeather(city);

    const intervalId = setInterval(() => {
      console.log(`Fetching real-time weather update for ${city}`);
      fetchWeather(city);
    }, 3600000);

    // Clean up interval on unmount or when city changes
    return () => {
      console.log(`Clearing weather update interval for ${city}`);
      clearInterval(intervalId);
    };
  }, [city]);

  const fetchWeather = async (cityName) => {
    if (!cityName) return;
    setWeatherLoading(true);
    try {
      console.log(`Fetching weather for ${cityName}`);
      const response = await axios.post(`${API_BASE_URL}/api/weather`, {
        city: cityName,
      });
      const weatherData = response.data.result;
      // Add timestamp to weather data
      const lastUpdated = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      setWeather({ ...weatherData, lastUpdated });
      console.log(`Successfully fetched weather for ${cityName}:`, { ...weatherData, lastUpdated });
    } catch (error) {
      console.error(`Failed to fetch weather for ${cityName}:`, error);
      setWeather({ error: 'Đã xảy ra lỗi: ' + (error.response?.data?.error || error.message) });
    }
    setWeatherLoading(false);
  };

 const handleGetLocation = () => {
  if (!navigator.geolocation) {
    setLocation({ error: 'Trình duyệt không hỗ trợ định vị GPS' });
    return;
  }

  navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
    if (result.state === 'denied') {
      alert('Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại quyền định vị trong cài đặt trình duyệt.');
    }
  });

  setLocationLoading(true);
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/location`, {
          lat: coords.latitude,
          lon: coords.longitude,
        });
        const data = res.data.result;
        setLocation(data);
        setCity(data.city || '');
        fetchWeather(data.city || '');
      } catch (err) {
        setLocation({ error: 'Lỗi lấy vị trí: ' + (err.response?.data?.error || err.message) });
      }
      setLocationLoading(false);
    },
    (err) => {
      console.error('❌ Không thể lấy GPS:', err);
      setLocation({ error: 'Không thể lấy GPS: ' + err.message });
      setLocationLoading(false);
    }
  );
};


  const getCurrentDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const isTaskForToday = (taskDate) => {
    const currentDate = getCurrentDate();
    return taskDate === currentDate;
  };

  const generateInitialPrompt = () => {
    if (!weather || !city) {
      return 'Vui lòng lấy vị trí và thời tiết trước khi gửi!';
    }
    return `Tôi là một người không biết gì về trồng cây ăn quả. Vậy nên hãy cho tôi cách để trồng cây ${fruitType} dựa vào điều kiện và trả lời đúng khung sau mà không thay đổi:
-Điều kiện: 
+)Vị trí và thời tiết
Ngày hiện tại: ${getCurrentDate()}
Thành phố: ${city}
Nhiệt độ: ${weather.temperature}°C
Mô tả: ${weather.description}
Độ ẩm: ${weather.humidity}%
Tốc độ gió: ${weather.wind_speed} m/s

-Khung:
## Dự án Quyền (ID: ${projectId}): Trồng cây ${fruitType} tại ${city}

•1. Thông tin về giống, loại đất, phân bón, cây con:

•Giống ${fruitType} : [Trả lời]

•Loại đất phù hợp với ${fruitType}: [Trả lời]

•Phân bón phù hợp với ${fruitType}: [Trả lời]

•Cây con phù hợp với ${fruitType}: [Trả lời]

•2. Kỹ thuật và quy trình:

•Bước 1: [Trả lời]

•Bước 2: [Trả lời]
[Thêm các bước nữa nếu có]

•3. Giám sát và chăm sóc:

•(Thời gian biểu này là gợi ý, bạn cần điều chỉnh dựa trên tình hình thực tế của cây)

| Hoạt động | Số liệu/Ghi chú |
 [Trả lời] | [Trả lời] |
•Lưu ý: [Trả lời]

•4. Cập nhật từ bạn:

[Tự trả lời]`;
  };

  const generateUpdatePrompt = () => {
    const currentDate = getCurrentDate();
    const lastHistory = history.length > 0 ? history[history.length - 1] : null;
    const lastResult = lastHistory ? lastHistory.result : '';
    
    // Extract completed and pending tasks
    const completedTasks = Object.entries(taskStatus)
      .filter(([_, status]) => status)
      .map(([task]) => task);
    const pendingTasks = Object.entries(taskStatus)
      .filter(([_, status]) => !status)
      .map(([task]) => task);

    return `Hôm nay ngày ${currentDate} tôi đã làm ${completedTasks.length > 0 ? completedTasks.join(', ') : 'không có gì'} và chưa làm ${pendingTasks.length > 0 ? pendingTasks.join(', ') : 'không có gì'}. In ra kết quả theo khung kế hoạch dưới cho hôm nay và hôm sau dựa theo điều trước và những điều sau: 
- Điều một: 
${lastResult}

-Khung: 
(Thời gian biểu này là gợi ý, bạn cần điều chỉnh dựa trên tình hình thực tế của cây)
+ Những điều cần làm trong hôm nay: 
[Trả lời] 
+ Kế hoạch cho những ngày sau:
| Ngày | Giờ | Hoạt động | Số liệu/Ghi chú |
| [Trả lời] | [Trả lời] | [Trả lời] |
•Lưu ý: [Trả lời]`;
  };
  const handleSubmitPrompt = async (e) => {
    e.preventDefault();
    if (!fruitType.trim() || !weather || !city || hasGeneratedPrompt.current) return;
    const prompt = generateInitialPrompt();
    if (prompt.includes('Vui lòng lấy vị trí')) {
      setResult(prompt);
      return;
    }
  
    setLoading(true);
    isHandlingPrompt.current = true; // 🟢 bật cờ
  
    try {
      const res = await axios.post(`${API_BASE_URL}/api/generate`, {
        prompt: `Dự án ${projectName} (ID: ${projectId}): ${prompt}`
      });
      const newResult = res.data.result;
      setResult(newResult);
      setProjectInitialized(true);
      hasGeneratedPrompt.current = true;
      const date = getCurrentDate();
      setHistory([...history, { date, prompt, result: newResult }]);
      const taskSection = newResult.split('•3. Giám sát và chăm sóc')[1]?.split('•4. Cập nhật từ bạn')[0] || '';
      const tableRows = taskSection.match(/\|.*\|.*\|.*\|.*\|/g) || [];
      const extractedTasks = tableRows.map(row => {
        const [, date, time, activity] = row.split('|').map(s => s.trim());
        return { date, time, activity };
      }).filter(task => task.date && task.time && task.activity);
      setTasks(extractedTasks);
      setTaskStatus(extractedTasks.reduce((acc, task) => ({ ...acc, [`${task.date} - ${task.activity}`]: false }), {}));
    } catch (err) {
      setResult('Đã xảy ra lỗi: ' + (err.response?.data?.error || err.message));
    }
  
    isHandlingPrompt.current = false; // 🔴 tắt cờ sau khi hoàn tất
    setLoading(false);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatePrompt = generateUpdatePrompt();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate`, {
        prompt: `Dự án ${projectName} (ID: ${projectId}): ${updatePrompt}`,
      });
      const newResult = response.data.result;
      setResult(newResult);
      const date = getCurrentDate();
      setHistory([...history, { date, prompt: updatePrompt, result: newResult }]);

      // Extract new tasks from the response
      const taskSection = newResult.split('+ Kế hoạch cho những ngày sau:')[1]?.split('•Lưu ý:')[0] || '';
      const tableRows = taskSection.match(/\|.*\|.*\|.*\|.*\|/g) || [];
      const extractedTasks = tableRows
        .map(row => {
          const [, date, time, activity] = row.split('|').map(s => s.trim());
          return { date, time, activity };
        })
        .filter(task => task.date && task.time && task.activity);
      
      setTasks(extractedTasks);
      setTaskStatus(extractedTasks.reduce((acc, task) => ({
        ...acc,
        [`${task.date} - ${task.activity}`]: false
      }), {}));
    } catch (error) {
      console.error('Failed to update prompt:', error);
      setResult('Đã xảy ra lỗi: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // Function to clear project data from database
  const handleClearProject = async () => {
    if (!projectId) {
      console.warn('No projectId provided, cannot delete project data');
      return;
    }

    try {
      console.log(`Deleting data for project-${projectId}`);
      const response = await axios.post(`${API_BASE_URL}/api/project/delete`, { projectId });
      if (response.data.success) {
        console.log(`Successfully deleted data for project-${projectId}`);
        setFruitType('');
        setCity('');
        setResult('');
        setWeather(null);
        setLocation(null);
        setProjectInitialized(false);
        setHistory([]);
        setTasks([]);
        setTaskStatus({});
      } else {
        console.error(`Failed to delete data for project-${projectId}:`, response.data.error);
        setResult('Không thể xóa dữ liệu dự án: ' + response.data.error);
      }
    } catch (error) {
      console.error(`Failed to delete data for project-${projectId}:`, error);
      setResult('Không thể xóa dữ liệu dự án: ' + (error.response?.data?.error || error.message));
    }
  };

  // Function to navigate back to homepage
  const handleBackToHomepage = () => {
    console.log(`Navigating to homepage from project-${projectId}`);
    navigate('/');
  };

  return (
    <div className="container">
    <a href="/AgriGuard/" className="back-link">← Quay lại trang chủ</a>

      {/* Khối A */}
      <div className="section-a">
        {/* Ô 1: Ảnh */}
        <div className="box image-box">
          <img src={dashboardImage} alt="" />
        </div>
  
        {/* Ô 2: Chatbot */}
        <div className="box chatbot-box">
          <div className="row" style={{color:"#388e3c"}}><h3>Chatbot cho dự án {projectName || 'Dự án 1'}</h3></div>
          <div className="row" style={{color:"#388e3c"}}><h4>Hỏi về cách trồng cây ăn quả</h4></div>
          <div className="row">
            <form onSubmit={handleSubmitPrompt} className="form-inline">
              <input
                ref={inputRef}
                type="text"
                value={fruitType}
                onChange={(e) => setFruitType(e.target.value)}
                placeholder="Nhập loại quả (VD: Xoài)"
                className="fruit-input"
                disabled={projectInitialized}
              />
              <button
                type="submit"
                disabled={loading || !weather || !city || projectInitialized}
                className="submit-button"
              >
                {loading ? 'Đang xử lý...' : 'Gửi'}
              </button>
            </form>


          </div>
        </div>
  
        {/* Ô 3: Vị trí và thời tiết */}
        <div className="box weather-box">
          <div className="row row-flex">
            <h4 style={{ marginRight: '10px',color:"#388e3c" }}>Lấy vị trí của bạn</h4>
            <button
              onClick={handleGetLocation}
              disabled={locationLoading}
              className="location-button"
            >
              {locationLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí GPS'}
            </button>
          </div>
          <div className="row"><h4 style={{color:"#388e3c"}}>Thời tiết tại vị trí của bạn</h4></div>
          <div className="row">
            {weather && !weather.error ? (
              <p>
  Địa chỉ: {location?.address || 'Không xác định'}<br />
  Nhiệt độ: {weather.temperature}°C<br />
  Mô tả: {weather.description}<br />
  Độ ẩm: {weather.humidity}%<br />
  Gió: {weather.wind_speed} m/s
</p>
            ) : (
              <p>Đang tải thông tin thời tiết...</p>
            )}
          </div>
        </div>
      </div>
      {result && (
  <div className="box section-b" style={{ whiteSpace: 'pre-wrap', marginTop: '20px', backgroundColor: 'white' }}>
    <h4 style={{color:'#388e3c'}}>Kết quả hướng dẫn từ AI:</h4>
    <p style={{marginLeft:'20px'}}>{result}</p>
    <div className="section-b">
    <h3 className="section-title">Giám sát và chăm sóc (Bắt đầu từ {scheduleDates[0]})</h3>
    <table className="monitoring-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Giờ</th>
              <th>Hoạt động</th>
              <th>Số liệu/Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr>
            <td>{scheduleDates[0]}</td>
              <td>Sáng</td>
              <td>Kiểm tra độ ẩm đất, tưới nước nếu cần</td>
              <td>Ghi chú lượng nước tưới</td>
            </tr>
            <tr>
            <td>{scheduleDates[1]}</td>
              <td>Chiều</td>
              <td>Kiểm tra cây có sâu bệnh không, xử lý nếu cần</td>
              <td>Ghi chú loại sâu bệnh, phương pháp xử lý</td>
            </tr>
            <tr>
            <td>{scheduleDates[2]}</td>
              <td>Sáng</td>
              <td>Bón phân thúc (nếu cần)</td>
              <td>Ghi chú loại phân, lượng phân</td>
            </tr>
            <tr>
            <td>{scheduleDates[3]}</td>
              <td>Chiều</td>
              <td>Kiểm tra lại độ ẩm đất, tưới nước nếu cần</td>
              <td>Ghi chú lượng nước tưới</td>
            </tr>
          </tbody>
        </table>
        </div>
        <p style={{marginLeft:'20px'}}>Lưu ý : Khí hậu Hà Nội mùa hè nắng nóng, cần chú ý tưới nước thường xuyên, đặc biệt trong những ngày nắng gắt. Theo dõi cây thường xuyen để phát hiện xử lý kịp thời</p>
  </div>
)}
      {/* Khối B */}
     
    </div>
  );
}  
export default Chatbot;