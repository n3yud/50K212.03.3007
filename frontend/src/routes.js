// Trang chủ theo vai trò
export const homeFor = (role) => ({ assistant: '/tro-ly/tong-quan', manager: '/quan-ly/tong-quan', supervisor: '/giam-sat/tong-quan', teacher: '/giao-vien/trang-chu', parent: '/phu-huynh/trang-chu' }[role] || '/login');
export const welcomeFor = (role) => ({ parent: '/phu-huynh/welcome', teacher: '/giao-vien/welcome' }[role] || '/login');
export const useBaseFrom = () => '/tro-ly';
