import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatAPI } from '../utils/api';

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (message, { rejectWithValue }) => {
    try {
      const response = await chatAPI.sendMessage(message);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to send message');
    }
  }
);

export const getChatHistory = createAsyncThunk(
  'chat/getHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getHistory();
      return response.data;
    } catch (error) {
      console.error('Chat history error details:', error);
      return rejectWithValue(error.response?.data || 'Failed to load chat history');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    error: null,
    history: [],
    historyLoaded: false,
  },
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    setHistoryLoaded: (state, action) => {
      state.historyLoaded = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const lastMessageIndex = state.messages.length - 1;
        if (lastMessageIndex >= 0) {
          state.messages[lastMessageIndex] = {
            ...state.messages[lastMessageIndex],
            response: action.payload.response,
            _id: action.payload.chatId,
            isSending: false,
          };
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        if (state.messages.length > 0) {
          state.messages.pop();
        }
      })
      // Get History
      .addCase(getChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.chats || [];
        state.historyLoaded = true;
        state.messages = action.payload.chats || [];
      })
      .addCase(getChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.historyLoaded = true;
        console.error('Failed to load chat history:', action.payload);
      });
  },
});

export const { addMessage, clearMessages, clearError, setHistoryLoaded } = chatSlice.actions;
export default chatSlice.reducer;