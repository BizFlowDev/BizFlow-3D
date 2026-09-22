-- 007_user_soft_delete.sql
-- Thêm cột xóa mềm deleted_at vào bảng users và tối ưu hóa index

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Bỏ ràng buộc unique tuyệt đối (store_id, email) để cho phép đăng ký lại sau khi nhân viên đã xóa mềm
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_store_id_email_key;

-- Tạo index unique có điều kiện chỉ áp dụng cho người dùng chưa xóa mềm
CREATE UNIQUE INDEX IF NOT EXISTS users_store_id_email_active_idx 
    ON users(store_id, email) 
    WHERE deleted_at IS NULL;

-- Index hỗ trợ truy vấn lọc theo cửa hàng và trạng thái xóa mềm
CREATE INDEX IF NOT EXISTS idx_users_store_deleted 
    ON users(store_id, deleted_at) 
    WHERE deleted_at IS NULL;
