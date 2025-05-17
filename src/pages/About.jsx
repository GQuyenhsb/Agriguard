import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';
import logoMenu from '../assets/logo-menu.jpg';
import { API_BASE_URL } from '../config';

function About({ addProject, projects, setProjects }) {
  const [projectName, setProjectName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const API_BASE_URL = "https://agriguard-backend.onrender.com";

  const fetchProjectTasks = async () => {
    try {
      const currentTime = new Date();
      const currentDate = currentTime.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const currentHourMinute = currentTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const newNotifications = [];

      for (const project of projects) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/project/load`, {
            projectId: project.id,
          });

          if (response.data.success) {
            const { history = [], taskStatus = {} } = response.data.data;

            history.forEach((entry) => {
              let taskSection = '';

              if (entry.prompt.includes('cách để trồng cây')) {
                taskSection = entry.result.split('•3. Giám sát và chăm sóc')[1]?.split('•4. Cập nhật từ bạn')[0] || '';
              } else if (entry.prompt.includes('Cập nhật tiến độ')) {
                taskSection = entry.result.split('+ Kế hoạch cho những ngày sau:')[1]?.split('•Lưu ý:')[0] || '';
              }

              const tableRows = taskSection.match(/\|.*\|.*\|.*\|.*\|/g) || [];
              const tasks = tableRows
                .map((row) => {
                  const [, date, time, activity] = row.split('|').map((s) => s.trim());
                  return { date, time, activity };
                })
                .filter((task) => task.date && task.time && task.activity);

              tasks.forEach((task) => {
                if (task.date === currentDate && !taskStatus[`${task.date} - ${task.activity}`]) {
                  const [taskHour, taskMinute] = task.time.split(':').map(Number);
                  const [currentHour, currentMinute] = currentHourMinute.split(':').map(Number);
                  const taskTimeInMinutes = taskHour * 60 + taskMinute;
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  const timeDiff = Math.abs(taskTimeInMinutes - currentTimeInMinutes);

                  if (timeDiff <= 1 || taskTimeInMinutes < currentTimeInMinutes) {
                    newNotifications.push({
                      projectId: project.id,
                      projectName: project.name,
                      activity: task.activity,
                      time: task.time,
                      date: task.date,
                    });
                  }
                }
              });
            });
          }
        } catch (error) {
          console.error(`Failed to load tasks for project-${project.id}:`, error);
        }
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    }
  };

  useEffect(() => {
    fetchProjectTasks();
    const intervalId = setInterval(() => {
      fetchProjectTasks();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [projects]);

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert('Vui lòng nhập tên dự án!');
      return;
    }
    const now = new Date();
    const newProject = {
      id: Date.now().toString(), // Đảm bảo là string để route match đúng
      name: projectName,
      createdAt: {
        date: now.toLocaleDateString('vi-VN'),
        time: now.toLocaleTimeString('vi-VN'),
      },
      patientData: {},
    };

    addProject(newProject);
    setProjectName('');
  };

  const handleClearData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu?')) {
      setProjects([]);
      setNotifications([]);
    }
  };

  return (
    <div className="about-page">
      <nav className="navbar">
        <div className="logo">
          <img src={logoMenu} style={{ width: '60px' }} alt="" />
          <span className="logo-text">AgriGuard</span>
        </div>
        <ul>
          <li><Link to="/">Trang Chủ</Link></li>
          <li><Link to="/about">Dự Án</Link></li>
        </ul>
      </nav>

      <main className="main-container">
        <div className="card">
          <h2>🌱 Quản Lý Dự Án</h2>

          <form className="create-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              placeholder="Nhập tên dự án..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
            <button type="submit">Tạo Dự Án</button>
          </form>

          <div className="notifications">
            <h3>🔔 Thông Báo</h3>
            {notifications.length === 0 ? (
              <p>Không có thông báo nào.</p>
            ) : (
              <ul>
                {notifications.map((n, index) => (
                  <li key={index}>
                    <Link to={`/project/${n.projectId}`}>
                      {n.projectName}: {n.activity} lúc {n.time} ({n.date})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="project-list">
            <h3>📋 Danh Sách Dự Án</h3>
            {projects.length === 0 ? (
              <p>Chưa có dự án nào.</p>
            ) : (
              <>
                <button onClick={handleClearData} className="clear-btn">Xóa tất cả</button>

                <table className="project-table">
                  <thead>
                    <tr className='about-table-title'>
                      <th>Tên Dự Án</th>
                      <th>Ngày Tạo</th>
                      <th>Giờ Tạo</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr className='about-table' key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.createdAt.date}</td>
                        <td>{p.createdAt.time}</td>
                        <td>
                        <button
  style={{
    backgroundColor: "#388e3c",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.3s",
    
  }}
  onMouseEnter={(e) => e.target.style.backgroundColor = "#2e7031"}
  onMouseLeave={(e) => e.target.style.backgroundColor = "#388e3c"}
  onClick={() => navigate(`/project/${p.id}`)}
>
  Xem
</button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </main>
      <footer className="footer">
      <div className="footer-container">
        <p>© 2025 AgriGuard. All rights reserved.</p>
        <p>
          Made by Trương Gia Quyền - <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </div>
    </footer>
    </div>
  );
}

export default About;
