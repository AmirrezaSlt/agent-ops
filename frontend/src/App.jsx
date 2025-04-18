import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import Header from './components/Header';
import AgentList from './pages/AgentList';
import ChatView from './pages/ChatView';

function App() {
  return (
    <>
      <Header />
      <Container component="main" sx={{ mt: 4, mb: 4, height: 'calc(100vh - 160px)' }} maxWidth="xl">
        <Routes>
          <Route path="/" element={<AgentList />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/chat/agent/:agentId" element={<ChatView />} />
          <Route path="/chat/agent/:agentId/conversation/:conversationId" element={<ChatView />} />
          <Route path="/chat/:conversationId" element={<ChatView />} />
          <Route path="*" element={<AgentList />} />
        </Routes>
      </Container>
    </>
  );
}

export default App; 