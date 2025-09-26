
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../slices/authSlice';
import { LogOut, User, Bot } from 'lucide-react';

const Header = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <header className="glass-effect rounded-2xl m-4 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-full">
            <Bot className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Voice Chatbot</h1>
            <p className="text-blue-100 text-sm">Powered by Groq & Llama</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white">
              <User className="h-4 w-4" />
              <span className="font-medium">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;