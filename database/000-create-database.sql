-- Run on the intended SQL Server instance with an account allowed to CREATE DATABASE.
-- This script does not drop, reset, or overwrite an existing database.
IF DB_ID(N'NgoiNhaNho') IS NULL
    CREATE DATABASE [NgoiNhaNho];
GO
