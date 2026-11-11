-- Optional sample branch only; no existing records are modified.
-- Accounts are created securely with: dotnet run --project backend -- --seed
USE [NgoiNhaNho];
GO
IF NOT EXISTS (SELECT 1 FROM [Branches] WHERE [Id] = '11111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO [Branches] ([Id], [Name], [Address])
    VALUES ('11111111-1111-1111-1111-111111111111', N'Hòa Xuân', N'33–35 Nguyễn Phước Lan, Đà Nẵng');
END;
GO
