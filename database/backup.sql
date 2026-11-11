-- Run as a SQL Server Agent job at 23:30 Asia/Ho_Chi_Minh.
-- The directory must already exist on the SQL Server machine and the SQL Server
-- service account must have write permission. No backup file is overwritten.
DECLARE @directory nvarchar(1000) = N'C:\SqlBackups\';
DECLARE @filename nvarchar(2000) = @directory + N'NgoiNhaNho_' +
    CONVERT(nvarchar(8), GETDATE(), 112) + N'_' + REPLACE(CONVERT(nvarchar(8), GETDATE(), 108), N':', N'') + N'.bak';
BACKUP DATABASE [NgoiNhaNho] TO DISK = @filename WITH CHECKSUM;
