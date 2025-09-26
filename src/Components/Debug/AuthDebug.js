import React from 'react';
import { useSelector } from 'react-redux';

const AuthDebug = () => {
  const { user, token, loading, error } = useSelector((state) => state.auth);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">🔧 Auth Debug</h3>
      <div className="space-y-1">
        <div>User: {user ? `✅ ${user.email}` : '❌ None'}</div>
        <div>Token: {token ? `✅ ${token.substring(0, 20)}...` : '❌ None'}</div>
        <div>Loading: {loading ? '🔄 Yes' : '✅ No'}</div>
        <div>Error: {error || '✅ None'}</div>
        <div>LocalStorage: {localStorage.getItem('token') ? '✅ Has token' : '❌ No token'}</div>
      </div>
    </div>
  );
};

export default AuthDebug;