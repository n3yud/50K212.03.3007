using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace NgoiNhaNho;
public static class SqlLocks
{
    // Acquire before reading the roster. SQL Server owns this lock for the
    // transaction, so it also protects bookings across multiple API processes.
    public static async Task HoldSession(AppDb db, Guid id)
    {
        var result = new SqlParameter("@result", SqlDbType.Int) { Direction = ParameterDirection.Output };
        var resource = new SqlParameter("@resource", "NgoiNhaNho:Session:" + id.ToString("N"));
        await db.Database.ExecuteSqlRawAsync("EXEC @result = sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=1800", result, resource);
        Rules.Require((int)result.Value >= 0, "Ca học đang được cập nhật. Vui lòng thử lại sau giây lát.", 409);
    }
}
