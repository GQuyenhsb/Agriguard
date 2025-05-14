import { useParams } from 'react-router-dom';
import Chatbot from './Chatbot';

function Project({ projects }) {
  const { projectId } = useParams();

  // Kiểm tra projects để tránh lỗi
  if (!projects || !Array.isArray(projects)) {
    return <div className="App"><h1>Không có dữ liệu dự án</h1></div>;
  }

  const project = projects.find((p) => p.id === parseInt(projectId));   

  if (!project) {
    return <div className="App"><h1>Dự án không tồn tại</h1></div>;
  }

  return (
    <div className="App">
      <h1>Dự án: {project.name}</h1>
      <Chatbot projectId={project.id} projectName={project.name} />
    </div>
  );
}

export default Project;