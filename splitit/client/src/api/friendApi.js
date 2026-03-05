import api from './axiosInstance.js';

export const friendApi = {
  getFriends:       ()         => api.get('/friends'),
  addFriend:        (identifier) => api.post('/friends', { identifier }),
  removeFriend:     (userId)   => api.delete(`/friends/${userId}`),
  getFriendBalances:(userId)   => api.get(`/friends/${userId}/balances`),
};
