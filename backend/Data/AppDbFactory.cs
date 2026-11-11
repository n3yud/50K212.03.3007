using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace NgoiNhaNho;
// EF commands use this factory and never launch the web server or background jobs.
public class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
{
    public AppDb CreateDbContext(string[] args)
    {
        var root=Directory.GetCurrentDirectory();
        if(!File.Exists(Path.Combine(root,"appsettings.json"))&&Directory.Exists(Path.Combine(root,"backend")))root=Path.Combine(root,"backend");
        var config = new ConfigurationBuilder().SetBasePath(root)
            .AddJsonFile("appsettings.json", optional: true).AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables().Build();
        var connection = config.GetConnectionString("Default") ?? "Server=localhost;Database=NgoiNhaNho;Integrated Security=true;TrustServerCertificate=true";
        return new AppDb(new DbContextOptionsBuilder<AppDb>().UseSqlServer(connection).Options);
    }
}
